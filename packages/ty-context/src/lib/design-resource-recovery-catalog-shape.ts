import type {
  DesignResourceAuditExpectations,
  DesignResourceSelectedResourceBinding,
} from "./design-resource-recovery-types.js";
import {
  arrayOf,
  digest,
  object,
  oneOf,
  optionalArrayOf,
  stringSet,
  text,
} from "./design-resource-recovery-codec-primitives.js";
import { DESIGN_RESOURCE_SEMANTIC_KINDS } from "./design-resource-recovery-shape.js";
import { parseDesignResourceFinalDisposition } from "./design-resource-recovery-final-disposition-shape.js";

export function parseAuditExpectations(
  value: unknown,
  label: string,
): DesignResourceAuditExpectations {
  const row = object(value, label, [
    "changed",
    "unchanged",
    "resource_decisions",
    "blast_radius",
    "inactive_delta_leakage",
  ]);
  return {
    changed: optionalArrayOf(row.changed, `${label}.changed`, parseChanged),
    unchanged: optionalArrayOf(
      row.unchanged,
      `${label}.unchanged`,
      parseUnchanged,
    ),
    resource_decisions: optionalArrayOf(
      row.resource_decisions,
      `${label}.resource_decisions`,
      parseResourceDecision,
    ),
    blast_radius: optionalArrayOf(
      row.blast_radius,
      `${label}.blast_radius`,
      parseKeyRow,
    ),
    inactive_delta_leakage: optionalArrayOf(
      row.inactive_delta_leakage,
      `${label}.inactive_delta_leakage`,
      parseInactiveDelta,
    ),
  };
}

export function parseSelectedResourceBinding(
  value: unknown,
  label: string,
): DesignResourceSelectedResourceBinding {
  const row = object(value, label, [
    "key",
    "identity_kind",
    "locator",
    "raw_byte_digest",
    "condition_refs",
  ]);
  return {
    key: text(row.key, `${label}.key`),
    identity_kind: oneOf(
      row.identity_kind,
      ["repository-snapshot", "external-immutable"] as const,
      `${label}.identity_kind`,
    ),
    locator: text(row.locator, `${label}.locator`),
    raw_byte_digest: digest(row.raw_byte_digest, `${label}.raw_byte_digest`),
    condition_refs: stringSet(row.condition_refs, `${label}.condition_refs`),
  };
}

function parseChanged(
  value: unknown,
  label: string,
): DesignResourceAuditExpectations["changed"][number] {
  const row = object(value, label, [
    "key",
    "delta_ids",
    "resource_refs",
    "condition_refs",
  ]);
  return {
    key: text(row.key, `${label}.key`),
    delta_ids: stringSet(row.delta_ids, `${label}.delta_ids`),
    resource_refs: stringSet(row.resource_refs, `${label}.resource_refs`),
    condition_refs: stringSet(row.condition_refs, `${label}.condition_refs`),
  };
}

function parseUnchanged(
  value: unknown,
  label: string,
): DesignResourceAuditExpectations["unchanged"][number] {
  const row = object(value, label, [
    "key",
    "resource_refs",
    "condition_refs",
    "basis_source_refs",
  ]);
  return {
    key: text(row.key, `${label}.key`),
    resource_refs: stringSet(row.resource_refs, `${label}.resource_refs`),
    condition_refs: stringSet(row.condition_refs, `${label}.condition_refs`),
    basis_source_refs: stringSet(
      row.basis_source_refs,
      `${label}.basis_source_refs`,
    ),
  };
}

function parseResourceDecision(
  value: unknown,
  label: string,
): DesignResourceAuditExpectations["resource_decisions"][number] {
  const row = object(value, label, [
    "key",
    "resource_ref",
    "semantic_kind",
    "bindings",
    "condition_refs",
  ]);
  return {
    key: text(row.key, `${label}.key`),
    resource_ref: text(row.resource_ref, `${label}.resource_ref`),
    semantic_kind: oneOf(
      row.semantic_kind,
      DESIGN_RESOURCE_SEMANTIC_KINDS,
      `${label}.semantic_kind`,
    ),
    bindings: arrayOf(row.bindings, `${label}.bindings`, parseBinding),
    condition_refs: stringSet(row.condition_refs, `${label}.condition_refs`),
  };
}

function parseBinding(
  value: unknown,
  label: string,
): DesignResourceAuditExpectations["resource_decisions"][number]["bindings"][number] {
  const row = object(value, label, [
    "binding_id",
    "delta_id",
    "target_key",
    "final_disposition",
  ]);
  return {
    binding_id: text(row.binding_id, `${label}.binding_id`),
    delta_id: text(row.delta_id, `${label}.delta_id`),
    target_key: text(row.target_key, `${label}.target_key`),
    final_disposition: parseDesignResourceFinalDisposition(
      row.final_disposition,
      `${label}.final_disposition`,
    ),
  };
}

function parseKeyRow(value: unknown, label: string): { key: string } {
  const row = object(value, label, ["key"]);
  return { key: text(row.key, `${label}.key`) };
}

function parseInactiveDelta(
  value: unknown,
  label: string,
): DesignResourceAuditExpectations["inactive_delta_leakage"][number] {
  const row = object(value, label, ["delta_id", "reason"]);
  return {
    delta_id: text(row.delta_id, `${label}.delta_id`),
    reason: oneOf(
      row.reason,
      ["rejected", "unresolved", "superseded"] as const,
      `${label}.reason`,
    ),
  };
}
