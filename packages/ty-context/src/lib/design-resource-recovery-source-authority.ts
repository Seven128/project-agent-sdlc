import { decodeDesignResourceText } from "./design-resource-recovery-text.js";
import type {
  DesignResourceAuthorityProjection,
  DesignResourceRecoveryCheckpoint,
  DesignResourceRecoveryCreateInput,
} from "./design-resource-recovery-types.js";
import { readRecoveryRepositoryFile } from "./design-resource-recovery-files.js";
import { parseSourceDocument } from "./long-task-source-item-parser.js";
import {
  arrayOf,
  digest,
  literal,
  object,
  oneOf,
  parseStrictJsonObject,
  stringSet,
  text,
} from "./design-resource-recovery-codec-primitives.js";
import { DESIGN_RESOURCE_AUTHORITY_PROJECTION_SCHEMA } from "./design-resource-recovery-schema.js";
import {
  DESIGN_RESOURCE_ORIGINS,
  DESIGN_RESOURCE_SEMANTIC_KINDS,
} from "./design-resource-recovery-shape.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

type RecoveryState =
  DesignResourceRecoveryCreateInput | DesignResourceRecoveryCheckpoint;

interface LoadedAuthorityItem {
  kind: string;
  text_sha256: string;
  projections: DesignResourceAuthorityProjection[];
}

export async function validateDesignResourceAuthoritySourceItems(
  repository: string,
  state: RecoveryState,
): Promise<void> {
  const byLocator = new Map<
    string,
    Awaited<ReturnType<typeof loadAuthoritySourceDocument>>
  >();
  const bySourceRef = new Map<
    string,
    { kind: string; projections: DesignResourceAuthorityProjection[] }
  >();
  for (const declared of state.authority_sources) {
    let loaded = byLocator.get(declared.locator);
    if (!loaded) {
      loaded = await loadAuthoritySourceDocument(repository, declared.locator);
      byLocator.set(declared.locator, loaded);
    }
    if (loaded.rawByteDigest !== declared.raw_byte_digest)
      invalid(
        `authority_source_raw_digest_mismatch:${declared.source_ref}:${declared.raw_byte_digest}:${loaded.rawByteDigest}`,
      );
    const item = loaded.items.get(declared.source_item_key);
    if (!item)
      invalid(
        `authority_source_item_missing:${declared.source_ref}:${declared.source_item_key}`,
      );
    if (item.kind !== declared.source_item_kind)
      invalid(
        `authority_source_item_kind_mismatch:${declared.source_ref}:${declared.source_item_kind}:${item.kind}`,
      );
    if (item.text_sha256 !== declared.source_item_text_sha256)
      invalid(
        `authority_source_item_digest_mismatch:${declared.source_ref}:${declared.source_item_text_sha256}:${item.text_sha256}`,
      );
    bySourceRef.set(declared.source_ref, {
      kind: item.kind,
      projections: item.projections,
    });
  }
  validateDelegationProjections(state, bySourceRef);
  validateAcceptedDeltaProjections(state, bySourceRef);
}

function validateDelegationProjections(
  state: RecoveryState,
  sources: Map<
    string,
    { kind: string; projections: DesignResourceAuthorityProjection[] }
  >,
): void {
  for (const delegation of state.delegations) {
    const source = sources.get(delegation.source_ref);
    if (!source) invalid(`delegation_source_ref_unresolved:${delegation.key}`);
    if (source.kind !== "decision")
      invalid(`delegation_source_not_decision:${delegation.key}`);
    const matching = source.projections.filter(
      (projection) =>
        projection.mode === "delegation" &&
        projection.delegation_key === delegation.key,
    );
    if (matching.length !== 1)
      invalid(
        `delegation_projection_count:${delegation.key}:${matching.length}`,
      );
    const projection = matching[0];
    if (projection.mode !== "delegation") throw new Error("unreachable");
    assertExactSet(
      projection.allowed_target_keys,
      delegation.allowed_target_keys,
      `delegation_projection_targets:${delegation.key}`,
    );
    assertExactSet(
      projection.allowed_semantic_kinds,
      delegation.allowed_semantic_kinds,
      `delegation_projection_semantic_kinds:${delegation.key}`,
    );
    assertExactSet(
      projection.allowed_origins,
      delegation.allowed_origins,
      `delegation_projection_origins:${delegation.key}`,
    );
  }
}

function validateAcceptedDeltaProjections(
  state: RecoveryState,
  sources: Map<
    string,
    { kind: string; projections: DesignResourceAuthorityProjection[] }
  >,
): void {
  const delegations = new Map(
    state.delegations.map((item) => [item.key, item]),
  );
  for (const delta of state.deltas) {
    if (delta.status !== "accepted") continue;
    const sourceRows = delta.source_refs.map((sourceRef) => {
      const source = sources.get(sourceRef);
      if (!source)
        invalid(`delta_source_ref_unresolved:${delta.delta_id}:${sourceRef}`);
      return { sourceRef, ...source };
    });
    const meaningDigest = sha256Hex(canonicalValueJson(delta.after_semantics));
    const matchingMeaning = sourceRows.filter(({ projections }) =>
      projections.some(
        (projection) =>
          projection.mode === "explicit-user" &&
          projection.meaning_sha256 === meaningDigest &&
          projection.semantic_kinds.includes(delta.semantic_kind) &&
          projection.allowed_origins.includes(delta.origin) &&
          delta.target_keys.every((key) =>
            projection.target_keys.includes(key),
          ),
      ),
    );
    if (delta.decision_authority === "explicit-user") {
      const decisions = matchingMeaning.filter(
        ({ kind }) => kind === "decision",
      );
      if (!decisions.length)
        invalid(`explicit_user_projection_required:${delta.delta_id}`);
    }
    if (delta.decision_authority.startsWith("delegated:")) {
      const key = delta.decision_authority.slice("delegated:".length);
      const delegation = delegations.get(key);
      if (!delegation) invalid(`delegation_not_found:${delta.delta_id}:${key}`);
      const source = sourceRows.find(
        (item) => item.sourceRef === delegation.source_ref,
      );
      if (
        !source?.projections.some(
          (projection) =>
            projection.mode === "delegation" &&
            projection.delegation_key === key &&
            projection.allowed_origins.includes(delta.origin) &&
            projection.allowed_semantic_kinds.includes(delta.semantic_kind) &&
            delta.target_keys.every((target) =>
              projection.allowed_target_keys.includes(target),
            ),
        )
      )
        invalid(`delegation_projection_mismatch:${delta.delta_id}:${key}`);
    }
    const delegatedExactVisual =
      delta.semantic_kind === "exact-visual" &&
      delta.decision_authority.startsWith("delegated:");
    if (!delegatedExactVisual && !matchingMeaning.length)
      invalid(`accepted_meaning_projection_required:${delta.delta_id}`);
  }
}

async function loadAuthoritySourceDocument(
  repository: string,
  locator: string,
): Promise<{
  rawByteDigest: string;
  items: Map<string, LoadedAuthorityItem>;
}> {
  const snapshot = await readRecoveryRepositoryFile(
    repository,
    locator,
    "design_resource_recovery_authority_source",
  );
  const decoded = decodeDesignResourceText(snapshot.bytes);
  try {
    const parsed = parseSourceDocument(snapshot.relative, decoded.text);
    return {
      rawByteDigest: snapshot.raw_byte_digest,
      items: new Map(
        parsed.items.map((item) => [
          item.key,
          {
            kind: item.kind,
            text_sha256: item.text_sha256,
            projections: parseAuthorityProjections(
              snapshot.relative,
              item.key,
              item.normalized_text,
            ),
          },
        ]),
      ),
    };
  } catch (error) {
    invalid(
      `authority_source_parse_failed:${snapshot.relative}:${(error as Error).message}`,
    );
  }
}

export function parseAuthorityProjections(
  sourcePath: string,
  itemKey: string,
  normalizedText: string,
): DesignResourceAuthorityProjection[] {
  const projections: DesignResourceAuthorityProjection[] = [];
  for (const [index, line] of normalizedText.split("\n").entries()) {
    if (!line.includes(DESIGN_RESOURCE_AUTHORITY_PROJECTION_SCHEMA)) continue;
    const match = /^<!-- ty-dra-authority-v1 (\{.*\}) -->$/u.exec(line);
    if (!match)
      invalid(
        `authority_projection_marker_invalid:${sourcePath}:${itemKey}:${index + 1}`,
      );
    projections.push(
      parseAuthorityProjection(
        match[1],
        `${sourcePath}:${itemKey}:${index + 1}`,
      ),
    );
  }
  const identities = projections.map(projectionIdentity);
  if (new Set(identities).size !== identities.length)
    invalid(`authority_projection_duplicate:${sourcePath}:${itemKey}`);
  return projections;
}

function parseAuthorityProjection(
  content: string,
  label: string,
): DesignResourceAuthorityProjection {
  const parsed = parseStrictJsonObject(
    content,
    `authority_projection:${label}`,
  );
  const header = object(
    parsed,
    `authority_projection:${label}`,
    ["schema_version", "mode"],
    [
      "target_keys",
      "semantic_kinds",
      "allowed_origins",
      "meaning_sha256",
      "delegation_key",
      "allowed_target_keys",
      "allowed_semantic_kinds",
    ],
  );
  literal(
    header.schema_version,
    DESIGN_RESOURCE_AUTHORITY_PROJECTION_SCHEMA,
    `authority_projection:${label}.schema_version`,
  );
  const mode = oneOf(
    header.mode,
    ["explicit-user", "delegation"] as const,
    `authority_projection:${label}.mode`,
  );
  if (mode === "explicit-user") {
    const row = object(parsed, `authority_projection:${label}`, [
      "schema_version",
      "mode",
      "target_keys",
      "semantic_kinds",
      "allowed_origins",
      "meaning_sha256",
    ]);
    return {
      schema_version: DESIGN_RESOURCE_AUTHORITY_PROJECTION_SCHEMA,
      mode,
      target_keys: stringSet(
        row.target_keys,
        `authority_projection:${label}.target_keys`,
      ),
      semantic_kinds: enumSet(
        row.semantic_kinds,
        DESIGN_RESOURCE_SEMANTIC_KINDS,
        `authority_projection:${label}.semantic_kinds`,
      ),
      allowed_origins: enumSet(
        row.allowed_origins,
        DESIGN_RESOURCE_ORIGINS,
        `authority_projection:${label}.allowed_origins`,
      ),
      meaning_sha256: digest(
        row.meaning_sha256,
        `authority_projection:${label}.meaning_sha256`,
      ),
    };
  }
  const row = object(parsed, `authority_projection:${label}`, [
    "schema_version",
    "mode",
    "delegation_key",
    "allowed_target_keys",
    "allowed_semantic_kinds",
    "allowed_origins",
  ]);
  const delegationKey = text(
    row.delegation_key,
    `authority_projection:${label}.delegation_key`,
  );
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(delegationKey))
    invalid(`authority_projection_delegation_key_invalid:${label}`);
  return {
    schema_version: DESIGN_RESOURCE_AUTHORITY_PROJECTION_SCHEMA,
    mode,
    delegation_key: delegationKey,
    allowed_target_keys: stringSet(
      row.allowed_target_keys,
      `authority_projection:${label}.allowed_target_keys`,
    ),
    allowed_semantic_kinds: enumSet(
      row.allowed_semantic_kinds,
      DESIGN_RESOURCE_SEMANTIC_KINDS,
      `authority_projection:${label}.allowed_semantic_kinds`,
    ),
    allowed_origins: enumSet(
      row.allowed_origins,
      DESIGN_RESOURCE_ORIGINS,
      `authority_projection:${label}.allowed_origins`,
    ),
  };
}

function enumSet<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
): T[number][] {
  const result = arrayOf(value, label, (item, itemLabel) =>
    oneOf(item, allowed, itemLabel),
  );
  if (new Set(result).size !== result.length)
    invalid(`authority_projection_duplicate_value:${label}`);
  return result.sort(compareText);
}

function projectionIdentity(projection: DesignResourceAuthorityProjection) {
  return canonicalValueJson(projection);
}

function assertExactSet(
  actual: string[],
  expected: string[],
  label: string,
): void {
  const left = [...actual].sort(compareText);
  const right = [...expected].sort(compareText);
  if (
    left.length !== right.length ||
    left.some((value, index) => value !== right[index])
  )
    invalid(label);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function invalid(reason: string): never {
  throw new Error(`design_resource_recovery_invalid:${reason}`);
}
