import { DESIGN_RESOURCE_RECOVERY_AUDIT_SCHEMA } from "./design-resource-recovery-schema.js";
import {
  type DesignResourceDecisionOrigin,
  type DesignResourceProviderIdentity,
  type DesignResourceReconciliationAudit,
} from "./design-resource-recovery-types.js";
import {
  arrayOf,
  digest,
  literal,
  object,
  oneOf,
  optionalArrayOf,
  parseStrictJsonObject,
  stringSet,
  text,
} from "./design-resource-recovery-codec-primitives.js";
import {
  parseAuthorityIdentity,
  parseDecisionAuthority,
} from "./design-resource-recovery-shape.js";

const ORIGINS = [
  "user-direct",
  "necessary-derived",
  "repository-evidence-backed",
  "provider-suggested",
] as const;
const STATUSES = ["accepted", "rejected", "unresolved"] as const;

export function parseDesignResourceReconciliationAudit(
  content: string,
): DesignResourceReconciliationAudit {
  const row = object(
    parseStrictJsonObject(content, "reconciliation_audit"),
    "reconciliation_audit",
    [
      "schema_version",
      "session_id",
      "base_raw_byte_digest",
      "design_authority",
      "provider_run",
      "resource_identities",
      "writeback_target_raw_byte_digest",
      "accepted_delta_ids",
      "rejected_delta_ids",
      "unresolved_delta_ids",
      "changed_keys",
      "explicitly_unchanged",
      "requirements_to_resource",
      "resource_to_requirements",
      "unexpected_blast_radius",
      "rejected_or_unresolved_leakage",
    ],
  );
  literal(
    row.schema_version,
    DESIGN_RESOURCE_RECOVERY_AUDIT_SCHEMA,
    "reconciliation_audit.schema_version",
  );
  return {
    schema_version: DESIGN_RESOURCE_RECOVERY_AUDIT_SCHEMA,
    session_id: text(row.session_id, "reconciliation_audit.session_id"),
    base_raw_byte_digest: digest(
      row.base_raw_byte_digest,
      "reconciliation_audit.base_raw_byte_digest",
    ),
    design_authority: parseAuthorityIdentity(
      row.design_authority,
      "reconciliation_audit.design_authority",
    ),
    provider_run: parseProviderRun(row.provider_run),
    resource_identities: optionalArrayOf(
      row.resource_identities,
      "reconciliation_audit.resource_identities",
      parseResourceIdentity,
    ),
    writeback_target_raw_byte_digest: digest(
      row.writeback_target_raw_byte_digest,
      "reconciliation_audit.writeback_target_raw_byte_digest",
    ),
    accepted_delta_ids: stringSet(
      row.accepted_delta_ids,
      "reconciliation_audit.accepted_delta_ids",
      { allowEmpty: true },
    ),
    rejected_delta_ids: stringSet(
      row.rejected_delta_ids,
      "reconciliation_audit.rejected_delta_ids",
      { allowEmpty: true },
    ),
    unresolved_delta_ids: stringSet(
      row.unresolved_delta_ids,
      "reconciliation_audit.unresolved_delta_ids",
      { allowEmpty: true },
    ),
    changed_keys: stringSet(
      row.changed_keys,
      "reconciliation_audit.changed_keys",
      { allowEmpty: true },
    ),
    explicitly_unchanged: optionalArrayOf(
      row.explicitly_unchanged,
      "reconciliation_audit.explicitly_unchanged",
      parseUnchanged,
    ),
    requirements_to_resource: optionalArrayOf(
      row.requirements_to_resource,
      "reconciliation_audit.requirements_to_resource",
      parseRequirementFinding,
    ),
    resource_to_requirements: optionalArrayOf(
      row.resource_to_requirements,
      "reconciliation_audit.resource_to_requirements",
      parseResourceFinding,
    ),
    unexpected_blast_radius: optionalArrayOf(
      row.unexpected_blast_radius,
      "reconciliation_audit.unexpected_blast_radius",
      parseBlastFinding,
    ),
    rejected_or_unresolved_leakage: optionalArrayOf(
      row.rejected_or_unresolved_leakage,
      "reconciliation_audit.rejected_or_unresolved_leakage",
      parseLeakage,
    ),
  };
}

function parseProviderRun(value: unknown): DesignResourceProviderIdentity {
  const row = object(value, "reconciliation_audit.provider_run", [
    "key",
    "locator",
    "immutable_identity",
  ]);
  return {
    key: text(row.key, "provider_run.key"),
    locator: text(row.locator, "provider_run.locator"),
    immutable_identity: text(
      row.immutable_identity,
      "provider_run.immutable_identity",
    ),
  };
}

function parseResourceIdentity(
  value: unknown,
  label: string,
): { key: string; raw_byte_digest: string } {
  const row = object(value, label, ["key", "raw_byte_digest"]);
  return {
    key: text(row.key, `${label}.key`),
    raw_byte_digest: digest(row.raw_byte_digest, `${label}.raw_byte_digest`),
  };
}

function parseUnchanged(
  value: unknown,
  label: string,
): { key: string; preserved: boolean } {
  const row = object(value, label, ["key", "preserved"]);
  if (typeof row.preserved !== "boolean")
    throw new Error(
      `design_resource_recovery_invalid:${label}.preserved:boolean_required`,
    );
  return { key: text(row.key, `${label}.key`), preserved: row.preserved };
}

function parseRequirementFinding(
  value: unknown,
  label: string,
): DesignResourceReconciliationAudit["requirements_to_resource"][number] {
  const row = object(value, label, [
    "key",
    "verdict",
    "delta_ids",
    "resource_refs",
  ]);
  return {
    key: text(row.key, `${label}.key`),
    verdict: oneOf(
      row.verdict,
      ["covered", "missing", "distorted", "unsupported"] as const,
      `${label}.verdict`,
    ),
    delta_ids: stringSet(row.delta_ids, `${label}.delta_ids`),
    resource_refs: stringSet(row.resource_refs, `${label}.resource_refs`),
  };
}

function parseResourceFinding(
  value: unknown,
  label: string,
): DesignResourceReconciliationAudit["resource_to_requirements"][number] {
  const row = object(value, label, [
    "key",
    "resource_ref",
    "origin",
    "decision_authority",
    "status",
    "written",
    "requirement_keys",
  ]);
  if (typeof row.written !== "boolean")
    throw new Error(
      `design_resource_recovery_invalid:${label}.written:boolean_required`,
    );
  return {
    key: text(row.key, `${label}.key`),
    resource_ref: text(row.resource_ref, `${label}.resource_ref`),
    origin: oneOf(
      row.origin,
      ORIGINS,
      `${label}.origin`,
    ) as DesignResourceDecisionOrigin,
    decision_authority: parseDecisionAuthority(
      row.decision_authority,
      `${label}.decision_authority`,
    ),
    status: oneOf(row.status, STATUSES, `${label}.status`),
    written: row.written,
    requirement_keys: stringSet(
      row.requirement_keys,
      `${label}.requirement_keys`,
      { allowEmpty: true },
    ),
  };
}

function parseBlastFinding(
  value: unknown,
  label: string,
): DesignResourceReconciliationAudit["unexpected_blast_radius"][number] {
  const row = object(value, label, ["key", "verdict"]);
  return {
    key: text(row.key, `${label}.key`),
    verdict: oneOf(
      row.verdict,
      ["expected", "unexpected"] as const,
      `${label}.verdict`,
    ),
  };
}

function parseLeakage(
  value: unknown,
  label: string,
): DesignResourceReconciliationAudit["rejected_or_unresolved_leakage"][number] {
  const row = object(value, label, ["delta_id", "leaked"]);
  if (typeof row.leaked !== "boolean")
    throw new Error(
      `design_resource_recovery_invalid:${label}.leaked:boolean_required`,
    );
  return {
    delta_id: text(row.delta_id, `${label}.delta_id`),
    leaked: row.leaked,
  };
}
