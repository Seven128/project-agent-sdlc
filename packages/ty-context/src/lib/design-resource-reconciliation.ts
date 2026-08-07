import type {
  DesignResourceDelta,
  DesignResourceRecoveryCheckpoint,
} from "./design-resource-recovery-types.js";
import type {
  DesignResourceReconciliationAudit,
  DesignResourceReconciliationResult,
} from "./design-resource-reconciliation-types.js";
import {
  acceptedSupersededDeltaIds,
  activeAcceptedDesignResourceDeltas,
  validateDesignResourceRecoverySemantics,
} from "./design-resource-recovery-replay.js";
import { canonicalValueJson } from "./strict-codec.js";

export function reconcileDesignResourceWriteback(
  checkpoint: DesignResourceRecoveryCheckpoint,
  audit: DesignResourceReconciliationAudit,
): DesignResourceReconciliationResult {
  validateDesignResourceRecoverySemantics(checkpoint);
  const findings: string[] = [];
  compareValue(
    findings,
    "session_identity",
    audit.session_id,
    checkpoint.session_id,
  );
  compareValue(
    findings,
    "base_identity",
    audit.base_raw_byte_digest,
    checkpoint.base.raw_byte_digest,
  );
  compareValue(
    findings,
    "design_authority_identity",
    canonicalValueJson(audit.design_authority),
    canonicalValueJson(checkpoint.design_authority),
  );
  compareValue(
    findings,
    "provider_run_identity",
    canonicalValueJson(audit.provider_run),
    canonicalValueJson(checkpoint.provider.run),
  );
  if (checkpoint.writeback) {
    if (!audit.writeback_target_raw_byte_digest)
      findings.push("missing:writeback_target_identity");
    else
      compareValue(
        findings,
        "writeback_target_identity",
        audit.writeback_target_raw_byte_digest,
        checkpoint.writeback.expected_post_write_raw_byte_digest,
      );
  } else if (audit.writeback_target_raw_byte_digest)
    findings.push("unexpected:writeback_target_identity");
  compareIdentityRows(
    findings,
    "resource_identity",
    audit.resource_identities,
    checkpoint.selected_resource_bindings.map((row) => ({
      key: row.key,
      raw_byte_digest: row.raw_byte_digest,
    })),
  );

  const superseded = acceptedSupersededDeltaIds(checkpoint.deltas);
  const activeAccepted = activeAcceptedDesignResourceDeltas(
    checkpoint.deltas,
    superseded,
  );
  const changed = checkpoint.audit_expectations.changed.map((row) => row.key);
  compareExactSet(
    findings,
    "accepted_delta_ids",
    audit.accepted_delta_ids,
    activeAccepted.map((delta) => delta.delta_id),
  );
  compareExactSet(
    findings,
    "rejected_delta_ids",
    audit.rejected_delta_ids,
    checkpoint.decision_sets.rejected_delta_ids,
  );
  compareExactSet(
    findings,
    "unresolved_delta_ids",
    audit.unresolved_delta_ids,
    checkpoint.decision_sets.unresolved_delta_ids,
  );
  compareExactSet(findings, "changed_keys", audit.changed_keys, changed);
  validateUnchanged(checkpoint, audit, findings);
  validateRequirements(checkpoint, audit, findings);
  validateResourceDecisions(
    checkpoint,
    audit,
    activeAccepted,
    superseded,
    findings,
  );
  validateBlastAndLeakage(checkpoint, audit, findings);
  findings.sort(compareText);
  return {
    status: findings.length ? "blocked" : "reconciliation-balanced",
    findings,
  };
}

function validateUnchanged(
  checkpoint: DesignResourceRecoveryCheckpoint,
  audit: DesignResourceReconciliationAudit,
  findings: string[],
): void {
  uniqueRows(
    audit.explicitly_unchanged.map((row) => row.key),
    "unchanged",
  );
  const expected = checkpoint.audit_expectations.unchanged;
  compareExactSet(
    findings,
    "explicitly_unchanged_keys",
    audit.explicitly_unchanged.map((row) => row.key),
    expected.map((row) => row.key),
  );
  const expectedByKey = new Map(expected.map((row) => [row.key, row]));
  for (const row of audit.explicitly_unchanged) {
    if (row.verdict !== "preserved")
      findings.push(`unchanged_${row.verdict}:${row.key}`);
    const frozen = expectedByKey.get(row.key);
    if (!frozen) continue;
    compareExactSet(
      findings,
      `unchanged_resources:${row.key}`,
      row.resource_refs,
      frozen.resource_refs,
    );
    compareExactSet(
      findings,
      `unchanged_conditions:${row.key}`,
      row.condition_refs,
      frozen.condition_refs,
    );
    compareExactSet(
      findings,
      `unchanged_basis_sources:${row.key}`,
      row.basis_source_refs,
      frozen.basis_source_refs,
    );
  }
}

function validateRequirements(
  checkpoint: DesignResourceRecoveryCheckpoint,
  audit: DesignResourceReconciliationAudit,
  findings: string[],
): void {
  uniqueRows(
    audit.requirements_to_resource.map((row) => row.key),
    "requirements_to_resource",
  );
  const expected = checkpoint.audit_expectations.changed;
  compareExactSet(
    findings,
    "requirements_to_resource_keys",
    audit.requirements_to_resource.map((row) => row.key),
    expected.map((row) => row.key),
  );
  const expectedByKey = new Map(expected.map((row) => [row.key, row]));
  for (const row of audit.requirements_to_resource) {
    if (row.verdict !== "covered")
      findings.push(`requirement_${row.verdict}:${row.key}`);
    const frozen = expectedByKey.get(row.key);
    if (!frozen) continue;
    compareExactSet(
      findings,
      `requirement_delta_ids:${row.key}`,
      row.delta_ids,
      frozen.delta_ids,
    );
    compareExactSet(
      findings,
      `requirement_resources:${row.key}`,
      row.resource_refs,
      frozen.resource_refs,
    );
    compareExactSet(
      findings,
      `requirement_conditions:${row.key}`,
      row.condition_refs,
      frozen.condition_refs,
    );
  }
}

function validateResourceDecisions(
  checkpoint: DesignResourceRecoveryCheckpoint,
  audit: DesignResourceReconciliationAudit,
  activeAccepted: DesignResourceDelta[],
  superseded: Set<string>,
  findings: string[],
): void {
  uniqueRows(
    audit.resource_to_requirements.map((row) => row.key),
    "resource_to_requirements",
  );
  const expected = checkpoint.audit_expectations.resource_decisions;
  compareExactSet(
    findings,
    "resource_decision_keys",
    audit.resource_to_requirements.map((row) => row.key),
    expected.map((row) => row.key),
  );
  const expectedByKey = new Map(expected.map((row) => [row.key, row]));
  const allDeltas = new Map(
    checkpoint.deltas.map((delta) => [delta.delta_id, delta]),
  );
  const activeIds = new Set(activeAccepted.map((delta) => delta.delta_id));
  const globalBindingIds: string[] = [];
  const globalBindingTuples: string[] = [];
  const finalOwnerTuples: string[] = [];
  for (const row of audit.resource_to_requirements) {
    for (const binding of row.requirement_bindings) {
      globalBindingIds.push(binding.binding_id);
      globalBindingTuples.push(
        resourceBindingIdentity(
          row.resource_ref,
          binding.requirement_key,
          binding.delta_id,
        ),
      );
    }
    const frozen = expectedByKey.get(row.key);
    if (!frozen) continue;
    compareValue(
      findings,
      `resource_decision_resource:${row.key}`,
      row.resource_ref,
      frozen.resource_ref,
    );
    compareValue(
      findings,
      `resource_decision_semantic_kind:${row.key}`,
      row.semantic_kind,
      frozen.semantic_kind,
    );
    compareExactSet(
      findings,
      `resource_decision_conditions:${row.key}`,
      row.condition_refs,
      frozen.condition_refs,
    );
    compareExactSet(
      findings,
      `resource_decision_delta_ids:${row.key}`,
      row.delta_ids,
      frozen.bindings.map((binding) => binding.delta_id),
    );
    uniqueRows(
      row.requirement_bindings.map((binding) => binding.binding_id),
      `resource_requirement_binding_ids:${row.key}`,
    );
    compareExactSet(
      findings,
      `resource_decision_binding_ids:${row.key}`,
      row.requirement_bindings.map((binding) => binding.binding_id),
      frozen.bindings.map((binding) => binding.binding_id),
    );
    const frozenBindings = new Map(
      frozen.bindings.map((binding) => [binding.binding_id, binding]),
    );
    for (const binding of row.requirement_bindings) {
      const expectedBinding = frozenBindings.get(binding.binding_id);
      if (!expectedBinding) continue;
      compareValue(
        findings,
        `resource_binding_target:${binding.binding_id}`,
        binding.requirement_key,
        expectedBinding.target_key,
      );
      compareValue(
        findings,
        `resource_binding_delta:${binding.binding_id}`,
        binding.delta_id,
        expectedBinding.delta_id,
      );
      const delta = allDeltas.get(binding.delta_id);
      if (!delta) {
        findings.push(`resource_decision_delta_unknown:${binding.binding_id}`);
        continue;
      }
      compareValue(
        findings,
        `resource_decision_status:${binding.binding_id}`,
        row.status,
        delta.status,
      );
      if (!delta.target_keys.includes(binding.requirement_key))
        findings.push(
          `resource_decision_target_mismatch:${binding.binding_id}`,
        );
      compareValue(
        findings,
        `resource_binding_semantic_kind:${binding.binding_id}`,
        row.semantic_kind,
        delta.semantic_kind,
      );
      compareValue(
        findings,
        `resource_decision_origin:${binding.binding_id}`,
        binding.origin,
        delta.origin,
      );
      compareValue(
        findings,
        `resource_decision_authority:${binding.binding_id}`,
        binding.decision_authority,
        delta.decision_authority,
      );
      compareExactSet(
        findings,
        `resource_decision_sources:${binding.binding_id}`,
        binding.source_refs,
        delta.source_refs,
      );
      validateFinalDisposition(
        checkpoint,
        row,
        binding,
        delta,
        expectedBinding.final_disposition,
        activeIds,
        superseded,
        findings,
      );
      if (
        delta.status === "accepted" &&
        activeIds.has(delta.delta_id) &&
        delta.operation !== "preserve"
      )
        finalOwnerTuples.push(
          deltaTarget(delta.delta_id, binding.requirement_key),
        );
    }
  }
  uniqueRows(globalBindingIds, "resource_binding_id_global");
  uniqueRows(globalBindingTuples, "resource_binding_tuple_global");
  uniqueRows(finalOwnerTuples, "final_owner_tuple_global");
  const expectedOwners = activeAccepted.flatMap((delta) =>
    delta.operation === "preserve"
      ? []
      : delta.target_keys.map((target) => deltaTarget(delta.delta_id, target)),
  );
  compareExactSet(
    findings,
    "active_delta_final_owners",
    finalOwnerTuples,
    expectedOwners,
  );
}

function validateFinalDisposition(
  checkpoint: DesignResourceRecoveryCheckpoint,
  row: DesignResourceReconciliationAudit["resource_to_requirements"][number],
  binding: DesignResourceReconciliationAudit["resource_to_requirements"][number]["requirement_bindings"][number],
  delta: DesignResourceDelta,
  frozen: DesignResourceReconciliationAudit["resource_to_requirements"][number]["requirement_bindings"][number]["final_disposition"],
  activeIds: Set<string>,
  superseded: Set<string>,
  findings: string[],
): void {
  const disposition = binding.final_disposition;
  compareValue(
    findings,
    `resource_decision_frozen_disposition:${binding.binding_id}`,
    canonicalValueJson(disposition),
    canonicalValueJson(frozen),
  );
  const active =
    activeIds.has(delta.delta_id) && !superseded.has(delta.delta_id);
  if (delta.status === "rejected" || (delta.status === "accepted" && !active)) {
    if (disposition.kind !== "not-adopted")
      findings.push(`resource_decision_inactive_owner:${binding.binding_id}`);
    return;
  }
  if (delta.status === "unresolved") {
    findings.push(`resource_decision_unresolved:${row.key}`);
    if (disposition.kind !== "unresolved")
      findings.push(`resource_decision_unresolved_owner:${binding.binding_id}`);
    return;
  }
  if (delta.operation === "preserve") {
    findings.push(
      `resource_decision_preserve_owner_forbidden:${binding.binding_id}`,
    );
    return;
  }
  if (disposition.kind === "proposal-written") {
    const operation = checkpoint.writeback?.patch.operations.find(
      (candidate) => candidate.operation_id === disposition.operation_id,
    );
    if (!operation)
      findings.push(`proposal_owner_operation_missing:${binding.binding_id}`);
    else if (
      operation.semantic_binding.delta_id !== delta.delta_id ||
      operation.semantic_binding.target_key !== binding.requirement_key
    )
      findings.push(
        `proposal_owner_operation_binding_mismatch:${binding.binding_id}`,
      );
    return;
  }
  if (disposition.kind !== "resource-owned-exact-visual") {
    findings.push(
      `resource_decision_accepted_owner_missing:${binding.binding_id}`,
    );
    return;
  }
  if (delta.semantic_kind !== "exact-visual")
    findings.push(`resource_owner_nonvisual_meaning:${binding.binding_id}`);
  if (disposition.resource_ref !== row.resource_ref)
    findings.push(`resource_owner_identity_mismatch:${binding.binding_id}`);
  compareExactSet(
    findings,
    `resource_owner_conditions:${binding.binding_id}`,
    disposition.condition_refs,
    row.condition_refs,
  );
  const owner = disposition.downstream_owner;
  if (owner.resource_key !== disposition.resource_ref)
    findings.push(`resource_owner_record_mismatch:${binding.binding_id}`);
}

function validateBlastAndLeakage(
  checkpoint: DesignResourceRecoveryCheckpoint,
  audit: DesignResourceReconciliationAudit,
  findings: string[],
): void {
  uniqueRows(
    audit.unexpected_blast_radius.map((row) => row.key),
    "unexpected_blast_radius",
  );
  compareExactSet(
    findings,
    "unexpected_blast_radius_keys",
    audit.unexpected_blast_radius.map((row) => row.key),
    checkpoint.audit_expectations.blast_radius.map((row) => row.key),
  );
  for (const row of audit.unexpected_blast_radius)
    if (row.verdict !== "expected")
      findings.push(`${row.verdict}_blast_radius:${row.key}`);
  uniqueRows(
    audit.inactive_delta_leakage.map((row) => row.delta_id),
    "inactive_delta_leakage",
  );
  const expected = checkpoint.audit_expectations.inactive_delta_leakage;
  compareExactSet(
    findings,
    "inactive_delta_leakage_ids",
    audit.inactive_delta_leakage.map((row) => row.delta_id),
    expected.map((row) => row.delta_id),
  );
  const expectedById = new Map(expected.map((row) => [row.delta_id, row]));
  const active = new Set(
    activeAcceptedDesignResourceDeltas(checkpoint.deltas).map(
      (delta) => delta.delta_id,
    ),
  );
  for (const row of audit.inactive_delta_leakage) {
    const frozen = expectedById.get(row.delta_id);
    if (frozen)
      compareValue(
        findings,
        `inactive_delta_reason:${row.delta_id}`,
        row.inactive_reason,
        frozen.reason,
      );
    if (active.has(row.delta_id))
      findings.push(`active_delta_in_inactive_universe:${row.delta_id}`);
    if (row.leaked) findings.push(`decision_leaked:${row.delta_id}`);
  }
}

function compareIdentityRows(
  findings: string[],
  label: string,
  actual: Array<{ key: string; raw_byte_digest: string }>,
  expected: Array<{ key: string; raw_byte_digest: string }>,
): void {
  uniqueRows(
    actual.map((row) => row.key),
    `${label}:actual`,
  );
  uniqueRows(
    expected.map((row) => row.key),
    `${label}:expected`,
  );
  compareExactSet(
    findings,
    `${label}_keys`,
    actual.map((row) => row.key),
    expected.map((row) => row.key),
  );
  const expectedByKey = new Map(expected.map((row) => [row.key, row]));
  for (const row of actual)
    compareValue(
      findings,
      `${label}:${row.key}`,
      row.raw_byte_digest,
      expectedByKey.get(row.key)?.raw_byte_digest ?? "missing",
    );
}

function compareExactSet(
  findings: string[],
  label: string,
  actual: string[],
  expected: string[],
): void {
  uniqueRows(actual, `${label}:actual`);
  uniqueRows(expected, `${label}:expected`);
  const left = [...actual].sort(compareText);
  const right = [...expected].sort(compareText);
  if (
    left.length !== right.length ||
    left.some((value, index) => value !== right[index])
  )
    findings.push(`set_mismatch:${label}`);
}

function compareValue(
  findings: string[],
  label: string,
  actual: string,
  expected: string,
): void {
  if (actual !== expected) findings.push(`identity_mismatch:${label}`);
}

function uniqueRows(values: string[], label: string): void {
  if (new Set(values).size !== values.length)
    throw new Error(
      `design_resource_recovery_invalid:audit_duplicate:${label}`,
    );
}

function resourceBindingIdentity(
  resourceRef: string,
  requirementKey: string,
  deltaId: string,
): string {
  return `${resourceRef}\u0000${requirementKey}\u0000${deltaId}`;
}

function deltaTarget(deltaId: string, targetKey: string): string {
  return `${deltaId}\u0000${targetKey}`;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
