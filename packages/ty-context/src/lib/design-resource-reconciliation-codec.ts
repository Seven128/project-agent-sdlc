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
): DesignResourceReconciliationAudit["explicitly_unchanged"][number] {
  const row = object(value, label, [
    "key",
    "verdict",
    "resource_refs",
    "condition_refs",
    "basis_source_refs",
  ]);
  return {
    key: text(row.key, `${label}.key`),
    verdict: oneOf(
      row.verdict,
      ["preserved", "changed", "unresolved"] as const,
      `${label}.verdict`,
    ),
    resource_refs: stringSet(row.resource_refs, `${label}.resource_refs`),
    condition_refs: stringSet(row.condition_refs, `${label}.condition_refs`),
    basis_source_refs: stringSet(
      row.basis_source_refs,
      `${label}.basis_source_refs`,
    ),
  };
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
    "condition_refs",
  ]);
  return {
    key: text(row.key, `${label}.key`),
    verdict: oneOf(
      row.verdict,
      ["covered", "missing", "distorted", "unsupported", "unresolved"] as const,
      `${label}.verdict`,
    ),
    delta_ids: stringSet(row.delta_ids, `${label}.delta_ids`),
    resource_refs: stringSet(row.resource_refs, `${label}.resource_refs`),
    condition_refs: stringSet(row.condition_refs, `${label}.condition_refs`),
  };
}

function parseResourceFinding(
  value: unknown,
  label: string,
): DesignResourceReconciliationAudit["resource_to_requirements"][number] {
  const row = object(value, label, [
    "key",
    "resource_ref",
    "status",
    "semantic_kind",
    "delta_ids",
    "requirement_bindings",
    "final_disposition",
  ]);
  return {
    key: text(row.key, `${label}.key`),
    resource_ref: text(row.resource_ref, `${label}.resource_ref`),
    status: oneOf(row.status, STATUSES, `${label}.status`),
    semantic_kind: oneOf(
      row.semantic_kind,
      SEMANTIC_KINDS,
      `${label}.semantic_kind`,
    ),
    delta_ids: stringSet(row.delta_ids, `${label}.delta_ids`),
    requirement_bindings: arrayOf(
      row.requirement_bindings,
      `${label}.requirement_bindings`,
      parseRequirementBinding,
    ),
    final_disposition: parseFinalDisposition(
      row.final_disposition,
      `${label}.final_disposition`,
    ),
  };
}

function parseRequirementBinding(
  value: unknown,
  label: string,
): DesignResourceReconciliationAudit["resource_to_requirements"][number]["requirement_bindings"][number] {
  const row = object(value, label, [
    "requirement_key",
    "delta_id",
    "origin",
    "decision_authority",
    "source_refs",
  ]);
  return {
    requirement_key: text(row.requirement_key, `${label}.requirement_key`),
    delta_id: text(row.delta_id, `${label}.delta_id`),
    origin: oneOf(
      row.origin,
      ORIGINS,
      `${label}.origin`,
    ) as DesignResourceDecisionOrigin,
    decision_authority: parseDecisionAuthority(
      row.decision_authority,
      `${label}.decision_authority`,
    ),
    source_refs: stringSet(row.source_refs, `${label}.source_refs`, {
      allowEmpty: true,
    }),
  };
}

function parseFinalDisposition(
  value: unknown,
  label: string,
): DesignResourceReconciliationAudit["resource_to_requirements"][number]["final_disposition"] {
  const first = object(
    value,
    label,
    ["kind"],
    ["resource_ref", "condition_refs", "downstream_owner"],
  );
  const kind = oneOf(
    first.kind,
    [
      "proposal-written",
      "resource-owned-exact-visual",
      "not-adopted",
      "unresolved",
    ] as const,
    `${label}.kind`,
  );
  if (kind === "resource-owned-exact-visual") {
    const row = object(value, label, [
      "kind",
      "resource_ref",
      "condition_refs",
      "downstream_owner",
    ]);
    return {
      kind,
      resource_ref: text(row.resource_ref, `${label}.resource_ref`),
      condition_refs: stringSet(row.condition_refs, `${label}.condition_refs`),
      downstream_owner: text(row.downstream_owner, `${label}.downstream_owner`),
    };
  }
  object(value, label, ["kind"]);
  return { kind };
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
      ["expected", "unexpected", "unresolved"] as const,
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
