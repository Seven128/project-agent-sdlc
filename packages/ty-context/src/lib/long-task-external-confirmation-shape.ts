import {
  array,
  key,
  literal,
  nullable,
  object,
  repositoryFile,
  semanticRef,
  string,
  text,
} from "./long-task-shape-primitives.js";
import type {
  ExternalConfirmationRecordV1,
  ExternalConfirmationResultV1,
} from "./long-task-external-confirmation-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

const HASH = /^[a-f0-9]{64}$/u;
const GIT_OBJECT = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const RELEVANT_INPUT = /^(?:bounded|whole):[a-f0-9]{64}$/u;

export function parseExternalConfirmationRecordV1(
  value: unknown,
): ExternalConfirmationRecordV1 {
  const label = "external_confirmation_record";
  const root = object(value, label, [
    "schema_version",
    "confirmation_ref",
    "compiled_identity",
    "authority_revision",
    "candidate",
    "actor",
    "session",
    "results",
    "artifact_hashes",
    "relevant_input_identity",
    "record_sha256",
  ]);
  const schemaVersion = literal(
    root.schema_version,
    ["long-task-external-confirmation-record-v1"] as const,
    `${label}.schema_version`,
  );
  const candidate = object(root.candidate, `${label}.candidate`, [
    "git_head",
    "git_tree",
    "snapshot_sha256",
  ]);
  const actor = object(root.actor, `${label}.actor`, [
    "id",
    "role",
    "authority_kind",
  ]);
  const session = object(root.session, `${label}.session`, [
    "id",
    "target_ref",
    "environment_identity",
    "started_at",
    "completed_at",
  ]);
  const startedAt = timestamp(
    session.started_at,
    `${label}.session.started_at`,
  );
  const completedAt = timestamp(
    session.completed_at,
    `${label}.session.completed_at`,
  );
  if (Date.parse(completedAt) < Date.parse(startedAt))
    invalid(`${label}.session`, "completed_at precedes started_at");
  const results = array(root.results, `${label}.results`).map((item, index) =>
    parseResult(item, `${label}.results[${index}]`),
  );
  if (!results.length) invalid(`${label}.results`, "must not be empty");
  unique(
    results.map((result) => result.obligation_ref),
    `${label}.results.obligation_ref`,
  );
  const artifactHashes = hashMap(
    root.artifact_hashes,
    `${label}.artifact_hashes`,
  );
  const record: ExternalConfirmationRecordV1 = {
    schema_version: schemaVersion,
    confirmation_ref: key(root.confirmation_ref, `${label}.confirmation_ref`),
    compiled_identity: hash(
      root.compiled_identity,
      `${label}.compiled_identity`,
    ),
    authority_revision: nonnegativeInteger(
      root.authority_revision,
      `${label}.authority_revision`,
    ),
    candidate: {
      git_head: gitObject(candidate.git_head, `${label}.candidate.git_head`),
      git_tree: gitObject(candidate.git_tree, `${label}.candidate.git_tree`),
      snapshot_sha256: hash(
        candidate.snapshot_sha256,
        `${label}.candidate.snapshot_sha256`,
      ),
    },
    actor: {
      id: string(actor.id, `${label}.actor.id`),
      role: string(actor.role, `${label}.actor.role`),
      authority_kind: literal(
        actor.authority_kind,
        ["human", "expert", "external_system"] as const,
        `${label}.actor.authority_kind`,
      ),
    },
    session: {
      id: string(session.id, `${label}.session.id`),
      target_ref: semanticRef(
        session.target_ref,
        `${label}.session.target_ref`,
      ),
      environment_identity: string(
        session.environment_identity,
        `${label}.session.environment_identity`,
      ),
      started_at: startedAt,
      completed_at: completedAt,
    },
    results,
    artifact_hashes: artifactHashes,
    relevant_input_identity: relevantInputIdentity(
      root.relevant_input_identity,
      `${label}.relevant_input_identity`,
    ),
    record_sha256: hash(root.record_sha256, `${label}.record_sha256`),
  };
  assertJsonValue(record, label, 0);
  const expectedHash = externalConfirmationRecordHash(record);
  if (record.record_sha256 !== expectedHash)
    invalid(`${label}.record_sha256`, "integrity mismatch");
  return record;
}

export function externalConfirmationRecordHash(
  record:
    | Omit<ExternalConfirmationRecordV1, "record_sha256">
    | ExternalConfirmationRecordV1,
): string {
  const { record_sha256: _recordHash, ...unsigned } =
    record as ExternalConfirmationRecordV1;
  return sha256Hex(canonicalValueJson(unsigned));
}

export function signExternalConfirmationRecordV1(
  unsigned: Omit<ExternalConfirmationRecordV1, "record_sha256">,
): ExternalConfirmationRecordV1 {
  const record: ExternalConfirmationRecordV1 = {
    ...unsigned,
    record_sha256: externalConfirmationRecordHash(unsigned),
  };
  return parseExternalConfirmationRecordV1(record);
}

function parseResult(
  value: unknown,
  label: string,
): ExternalConfirmationResultV1 {
  const row = object(
    value,
    label,
    [
      "obligation_ref",
      "fact_ref",
      "claim_ref",
      "applicability_ref",
      "verdict",
      "evidence_refs",
    ],
    ["actual", "rationale"],
  );
  const evidenceRefs = array(row.evidence_refs, `${label}.evidence_refs`).map(
    (item, index) => repositoryFile(item, `${label}.evidence_refs[${index}]`),
  );
  unique(evidenceRefs, `${label}.evidence_refs`);
  if (!evidenceRefs.length)
    invalid(`${label}.evidence_refs`, "must not be empty");
  const result: ExternalConfirmationResultV1 = {
    obligation_ref: semanticRef(row.obligation_ref, `${label}.obligation_ref`),
    fact_ref: nullable(row.fact_ref, (item) =>
      semanticRef(item, `${label}.fact_ref`),
    ),
    claim_ref: semanticRef(row.claim_ref, `${label}.claim_ref`),
    applicability_ref: semanticRef(
      row.applicability_ref,
      `${label}.applicability_ref`,
    ),
    ...(Object.hasOwn(row, "actual") ? { actual: row.actual } : {}),
    verdict: literal(
      row.verdict,
      ["passed", "failed", "unable"] as const,
      `${label}.verdict`,
    ),
    evidence_refs: evidenceRefs,
    ...(Object.hasOwn(row, "rationale")
      ? { rationale: text(row.rationale, `${label}.rationale`) }
      : {}),
  };
  if (Object.hasOwn(result, "actual"))
    assertJsonValue(result.actual, `${label}.actual`, 0);
  return result;
}

function hashMap(value: unknown, label: string): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid(label, "must be an object");
  const rows: Array<[string, string]> = [];
  for (const [rawPath, rawHash] of Object.entries(value))
    rows.push([
      repositoryFile(rawPath, `${label}.${rawPath}`),
      hash(rawHash, `${label}.${rawPath}`),
    ]);
  if (!rows.length) invalid(label, "must not be empty");
  unique(
    rows.map(([file]) => file),
    label,
  );
  return Object.fromEntries(
    rows.sort(([left], [right]) => left.localeCompare(right)),
  );
}

function hash(value: unknown, label: string): string {
  const result = string(value, label);
  if (!HASH.test(result)) invalid(label, "must be a lowercase SHA-256 digest");
  return result;
}

function gitObject(value: unknown, label: string): string {
  const result = string(value, label);
  if (!GIT_OBJECT.test(result)) invalid(label, "must be a Git object id");
  return result;
}

function relevantInputIdentity(value: unknown, label: string): string {
  const result = string(value, label);
  if (!RELEVANT_INPUT.test(result))
    invalid(label, "must be bounded:<sha256> or whole:<sha256>");
  return result;
}

function timestamp(value: unknown, label: string): string {
  const result = string(value, label);
  const epoch = Date.parse(result);
  if (!Number.isFinite(epoch) || new Date(epoch).toISOString() !== result)
    invalid(label, "must be a canonical ISO-8601 timestamp");
  return result;
}

function nonnegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    invalid(label, "must be a non-negative safe integer");
  return value as number;
}

function unique(values: string[], label: string): void {
  if (new Set(values).size !== values.length)
    invalid(label, "must not contain duplicates");
}

function assertJsonValue(value: unknown, label: string, depth: number): void {
  if (depth > 64) invalid(label, "JSON nesting exceeds 64 levels");
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalid(label, "number must be finite");
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertJsonValue(item, `${label}[${index}]`, depth + 1),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [name, item] of Object.entries(value))
      assertJsonValue(item, `${label}.${name}`, depth + 1);
    return;
  }
  invalid(label, "must be JSON-serializable");
}

function invalid(label: string, message: string): never {
  throw new Error(`external_confirmation_record_invalid:${label}:${message}`);
}
