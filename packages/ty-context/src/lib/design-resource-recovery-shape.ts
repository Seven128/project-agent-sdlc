import {
  type DesignResourceAuthorityIdentity,
  type DesignResourceAuthoritySourceItem,
  type DesignResourceDecisionAuthority,
  type DesignResourceDecisionOrigin,
  type DesignResourceDelegation,
  type DesignResourceDelta,
  type DesignResourceRecoveryBase,
  type DesignResourceRecoveryBaseInput,
  type DesignResourceTextEncoding,
} from "./design-resource-recovery-types.js";
import {
  arrayOf,
  digest,
  integer,
  object,
  oneOf,
  stringSet,
  text,
  unknownSemantics,
} from "./design-resource-recovery-codec-primitives.js";

const ORIGINS = [
  "user-direct",
  "necessary-derived",
  "repository-evidence-backed",
  "provider-suggested",
] as const;
const STATUSES = ["accepted", "rejected", "unresolved"] as const;
const OPERATIONS = ["add", "replace", "remove", "preserve"] as const;
const ENCODINGS = ["utf8", "utf8-bom", "utf16le", "utf16be"] as const;
const EOLS = ["none", "lf", "crlf", "cr", "mixed"] as const;
const SEMANTIC_KINDS = [
  "exact-visual",
  "product",
  "business",
  "permission",
  "data",
  "algorithm",
  "commercial",
  "safety-security",
  "technical",
] as const;
const SOURCE_ITEM_KINDS = [
  "outcome_result",
  "requirement",
  "control",
  "acceptance",
  "technical_obligation",
  "non_completing",
  "non_goal",
  "forbidden_shortcut",
  "risk_fact",
  "external_confirmation",
  "decision",
] as const;

export function parseRecoveryBaseInput(
  value: unknown,
  label: string,
): DesignResourceRecoveryBaseInput {
  const row = object(value, label, [
    "locator",
    "raw_byte_digest",
    "materialization",
    "scope_ceiling",
    "in_scope_keys",
    "explicitly_excluded_keys",
  ]);
  const materialization = object(
    row.materialization,
    `${label}.materialization`,
    ["kind"],
    ["authorization_ref"],
  );
  const kind = oneOf(
    materialization.kind,
    ["repository-source", "authorized-recovery-snapshot"] as const,
    `${label}.materialization.kind`,
  );
  const normalizedMaterialization =
    kind === "repository-source"
      ? ({ kind } as const)
      : ({
          kind,
          authorization_ref: text(
            materialization.authorization_ref,
            `${label}.materialization.authorization_ref`,
          ),
        } as const);
  if (kind === "repository-source" && "authorization_ref" in materialization)
    throw new Error(
      `design_resource_recovery_invalid:${label}.materialization:unexpected_authorization_ref`,
    );
  return {
    locator: text(row.locator, `${label}.locator`),
    raw_byte_digest: digest(row.raw_byte_digest, `${label}.raw_byte_digest`),
    materialization: normalizedMaterialization,
    scope_ceiling: text(row.scope_ceiling, `${label}.scope_ceiling`),
    in_scope_keys: stringSet(row.in_scope_keys, `${label}.in_scope_keys`),
    explicitly_excluded_keys: stringSet(
      row.explicitly_excluded_keys,
      `${label}.explicitly_excluded_keys`,
      { allowEmpty: true },
    ),
  };
}

export function parseRecoveryBase(
  value: unknown,
  label: string,
): DesignResourceRecoveryBase {
  const row = object(value, label, [
    "locator",
    "raw_byte_digest",
    "materialization",
    "scope_ceiling",
    "in_scope_keys",
    "explicitly_excluded_keys",
    "encoding",
    "eol_policy",
  ]);
  const base = parseRecoveryBaseInput(
    Object.fromEntries(
      Object.entries(row).filter(
        ([key]) => key !== "encoding" && key !== "eol_policy",
      ),
    ),
    label,
  );
  return {
    ...base,
    encoding: oneOf(
      row.encoding,
      ENCODINGS,
      `${label}.encoding`,
    ) as DesignResourceTextEncoding,
    eol_policy: oneOf(row.eol_policy, EOLS, `${label}.eol_policy`),
  };
}

export function parseDelegation(
  value: unknown,
  label: string,
): DesignResourceDelegation {
  const row = object(value, label, [
    "key",
    "source_ref",
    "allowed_origins",
    "allowed_target_keys",
  ]);
  return {
    key: text(row.key, `${label}.key`),
    source_ref: text(row.source_ref, `${label}.source_ref`),
    allowed_origins: arrayOf(
      row.allowed_origins,
      `${label}.allowed_origins`,
      (item, itemLabel) => oneOf(item, ORIGINS, itemLabel),
    ) as DesignResourceDecisionOrigin[],
    allowed_target_keys: stringSet(
      row.allowed_target_keys,
      `${label}.allowed_target_keys`,
    ),
  };
}

export function parseAuthoritySourceItem(
  value: unknown,
  label: string,
): DesignResourceAuthoritySourceItem {
  const row = object(value, label, [
    "source_ref",
    "locator",
    "raw_byte_digest",
    "source_item_key",
    "source_item_kind",
    "source_item_text_sha256",
  ]);
  return {
    source_ref: text(row.source_ref, `${label}.source_ref`),
    locator: text(row.locator, `${label}.locator`),
    raw_byte_digest: digest(row.raw_byte_digest, `${label}.raw_byte_digest`),
    source_item_key: text(row.source_item_key, `${label}.source_item_key`),
    source_item_kind: oneOf(
      row.source_item_kind,
      SOURCE_ITEM_KINDS,
      `${label}.source_item_kind`,
    ),
    source_item_text_sha256: digest(
      row.source_item_text_sha256,
      `${label}.source_item_text_sha256`,
    ),
  };
}

export function parseDelta(value: unknown, label: string): DesignResourceDelta {
  const row = object(value, label, [
    "delta_id",
    "sequence",
    "supersedes",
    "proposes_replacement_of",
    "operation",
    "semantic_kind",
    "target_keys",
    "before_semantics",
    "after_semantics",
    "origin",
    "decision_authority",
    "evidence_refs",
    "source_refs",
    "explicitly_unchanged_keys",
    "status",
  ]);
  return {
    delta_id: text(row.delta_id, `${label}.delta_id`),
    sequence: integer(row.sequence, `${label}.sequence`, 1),
    supersedes: stringSet(row.supersedes, `${label}.supersedes`, {
      allowEmpty: true,
    }),
    proposes_replacement_of: stringSet(
      row.proposes_replacement_of,
      `${label}.proposes_replacement_of`,
      { allowEmpty: true },
    ),
    operation: oneOf(row.operation, OPERATIONS, `${label}.operation`),
    semantic_kind: oneOf(
      row.semantic_kind,
      SEMANTIC_KINDS,
      `${label}.semantic_kind`,
    ),
    target_keys: stringSet(row.target_keys, `${label}.target_keys`),
    before_semantics: unknownSemantics(row, "before_semantics", label),
    after_semantics: unknownSemantics(row, "after_semantics", label),
    origin: oneOf(row.origin, ORIGINS, `${label}.origin`),
    decision_authority: parseDecisionAuthority(
      row.decision_authority,
      `${label}.decision_authority`,
    ),
    evidence_refs: stringSet(row.evidence_refs, `${label}.evidence_refs`, {
      allowEmpty: true,
    }),
    source_refs: stringSet(row.source_refs, `${label}.source_refs`, {
      allowEmpty: true,
    }),
    explicitly_unchanged_keys: stringSet(
      row.explicitly_unchanged_keys,
      `${label}.explicitly_unchanged_keys`,
      { allowEmpty: true },
    ),
    status: oneOf(row.status, STATUSES, `${label}.status`),
  };
}

export function parseAuthorityIdentity(
  value: unknown,
  label: string,
): DesignResourceAuthorityIdentity {
  const first = object(
    value,
    label,
    ["kind"],
    ["locator", "raw_byte_digest", "rationale"],
  );
  const kind = oneOf(
    first.kind,
    ["repository-file", "external-immutable", "not-applicable"] as const,
    `${label}.kind`,
  );
  if (kind === "not-applicable") {
    if ("locator" in first || "raw_byte_digest" in first)
      throw new Error(
        `design_resource_recovery_invalid:${label}:not_applicable_identity_fields`,
      );
    return {
      kind,
      rationale: text(first.rationale, `${label}.rationale`),
    };
  }
  if ("rationale" in first)
    throw new Error(
      `design_resource_recovery_invalid:${label}:unexpected_rationale`,
    );
  return {
    kind,
    locator: text(first.locator, `${label}.locator`),
    raw_byte_digest: digest(first.raw_byte_digest, `${label}.raw_byte_digest`),
  };
}

export function parseDecisionAuthority(
  value: unknown,
  label: string,
): DesignResourceDecisionAuthority {
  const result = text(value, label);
  if (result === "explicit-user" || result === "none") return result;
  if (/^delegated:[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(result))
    return result as `delegated:${string}`;
  throw new Error(
    `design_resource_recovery_invalid:${label}:invalid_authority`,
  );
}
