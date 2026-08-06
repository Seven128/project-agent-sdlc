import type {
  DesignResourceDelta,
  DesignResourceReconciliationAudit,
  DesignResourceReconciliationResult,
  DesignResourceRecoveryCheckpoint,
} from "./design-resource-recovery-types.js";
import {
  activeAcceptedDesignResourceDeltas,
  validateDesignResourceRecoverySemantics,
} from "./design-resource-recovery-replay.js";
import { canonicalValueJson } from "./strict-codec.js";

export function reconcileDesignResourceWriteback(
  checkpoint: DesignResourceRecoveryCheckpoint,
  audit: DesignResourceReconciliationAudit,
): DesignResourceReconciliationResult {
  validateDesignResourceRecoverySemantics(checkpoint);
  if (!checkpoint.writeback)
    throw new Error(
      "design_resource_recovery_invalid:writeback_not_configured",
    );
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
  compareValue(
    findings,
    "writeback_target_identity",
    audit.writeback_target_raw_byte_digest,
    checkpoint.writeback.expected_post_write_raw_byte_digest,
  );
  compareIdentitySet(
    findings,
    "resource_identity",
    audit.resource_identities,
    checkpoint.writeback.resource_identities,
  );

  const activeAccepted = activeAcceptedDesignResourceDeltas(checkpoint.deltas);
  const changed = new Set(
    activeAccepted.flatMap((delta) =>
      delta.operation === "preserve" ? [] : delta.target_keys,
    ),
  );
  compareSet(
    findings,
    "accepted_delta_ids",
    audit.accepted_delta_ids,
    activeAccepted.map((delta) => delta.delta_id),
  );
  compareSet(
    findings,
    "rejected_delta_ids",
    audit.rejected_delta_ids,
    checkpoint.decision_sets.rejected_delta_ids,
  );
  compareSet(
    findings,
    "unresolved_delta_ids",
    audit.unresolved_delta_ids,
    checkpoint.decision_sets.unresolved_delta_ids,
  );
  compareSet(findings, "changed_keys", audit.changed_keys, [...changed]);
  validateUnchanged(checkpoint, audit, findings);
  validateRequirements(checkpoint, audit, activeAccepted, changed, findings);
  validateResourceDecisions(
    checkpoint,
    audit,
    activeAccepted,
    changed,
    findings,
  );
  validateBlastAndLeakage(checkpoint, audit, findings);
  const unique = [...new Set(findings)].sort(compareText);
  return {
    status: unique.length ? "blocked" : "balanced",
    findings: unique,
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
  compareSet(
    findings,
    "explicitly_unchanged_keys",
    audit.explicitly_unchanged.map((row) => row.key),
    checkpoint.explicitly_unchanged_keys,
  );
  for (const row of audit.explicitly_unchanged)
    validateUnchangedRow(checkpoint, row, findings);
}

function validateUnchangedRow(
  checkpoint: DesignResourceRecoveryCheckpoint,
  row: DesignResourceReconciliationAudit["explicitly_unchanged"][number],
  findings: string[],
): void {
  if (row.verdict !== "preserved")
    findings.push(`unchanged_${row.verdict}:${row.key}`);
  const selected = new Set(checkpoint.selected_resource_keys);
  for (const resource of row.resource_refs)
    if (!selected.has(resource))
      findings.push(`unchanged_resource_unselected:${row.key}:${resource}`);
  const sources = new Set(
    checkpoint.authority_sources.map((source) => source.source_ref),
  );
  for (const source of row.basis_source_refs)
    if (!sources.has(source))
      findings.push(`unchanged_basis_source_unresolved:${row.key}:${source}`);
}

function validateRequirements(
  checkpoint: DesignResourceRecoveryCheckpoint,
  audit: DesignResourceReconciliationAudit,
  activeAccepted: DesignResourceDelta[],
  changed: Set<string>,
  findings: string[],
): void {
  uniqueRows(
    audit.requirements_to_resource.map((row) => row.key),
    "requirements_to_resource",
  );
  compareSet(
    findings,
    "requirements_to_resource_keys",
    audit.requirements_to_resource.map((row) => row.key),
    [...changed],
  );
  const selected = new Set(checkpoint.selected_resource_keys);
  for (const row of audit.requirements_to_resource) {
    if (row.verdict !== "covered")
      findings.push(`requirement_${row.verdict}:${row.key}`);
    const expectedDeltas = activeAccepted
      .filter(
        (delta) =>
          delta.operation !== "preserve" && delta.target_keys.includes(row.key),
      )
      .map((delta) => delta.delta_id);
    compareSet(
      findings,
      `requirement_delta_ids:${row.key}`,
      row.delta_ids,
      expectedDeltas,
    );
    if (!row.resource_refs.length)
      findings.push(`requirement_resource_missing:${row.key}`);
    for (const resource of row.resource_refs)
      if (!selected.has(resource))
        findings.push(`requirement_resource_unselected:${row.key}:${resource}`);
  }
}

function validateResourceDecisions(
  checkpoint: DesignResourceRecoveryCheckpoint,
  audit: DesignResourceReconciliationAudit,
  activeAccepted: DesignResourceDelta[],
  changed: Set<string>,
  findings: string[],
): void {
  uniqueRows(
    audit.resource_to_requirements.map((row) => row.key),
    "resource_to_requirements",
  );
  compareSet(
    findings,
    "resource_decision_keys",
    audit.resource_to_requirements.map((row) => row.key),
    checkpoint.resource_decision_keys,
  );
  const selected = new Set(checkpoint.selected_resource_keys);
  const declaredResources = new Set(
    checkpoint.provider.resources.map((resource) => resource.key),
  );
  const activeAcceptedById = new Map(
    activeAccepted.map((delta) => [delta.delta_id, delta]),
  );
  const allDeltasById = new Map(
    checkpoint.deltas.map((delta) => [delta.delta_id, delta]),
  );
  const acceptedResources = new Set<string>();
  const acceptedBindings = new Set<string>();
  const expectedRequirementBindings = new Set<string>();
  for (const requirement of audit.requirements_to_resource)
    for (const resourceRef of requirement.resource_refs)
      for (const deltaId of requirement.delta_ids)
        expectedRequirementBindings.add(
          requirementBindingIdentity(resourceRef, requirement.key, deltaId),
        );
  compareSet(
    findings,
    "resource_to_requirements_selected_resources",
    audit.resource_to_requirements
      .filter((row) => row.status === "accepted")
      .map((row) => row.resource_ref),
    [...selected],
  );
  for (const row of audit.resource_to_requirements) {
    if (!declaredResources.has(row.resource_ref))
      findings.push(
        `resource_decision_undeclared:${row.key}:${row.resource_ref}`,
      );
    if (row.status === "accepted") {
      acceptedResources.add(row.resource_ref);
      if (!selected.has(row.resource_ref))
        findings.push(
          `resource_decision_accepted_unselected:${row.key}:${row.resource_ref}`,
        );
    }
    const bindingIdentities = row.requirement_bindings.map((binding) =>
      requirementBindingIdentity(
        row.resource_ref,
        binding.requirement_key,
        binding.delta_id,
      ),
    );
    uniqueRows(bindingIdentities, `resource_requirement_bindings:${row.key}`);
    compareSet(
      findings,
      `resource_decision_delta_ids:${row.key}`,
      row.delta_ids,
      row.requirement_bindings.map((binding) => binding.delta_id),
    );
    for (const binding of row.requirement_bindings) {
      validateResourceRequirementBinding(
        row,
        binding,
        activeAcceptedById,
        allDeltasById,
        changed,
        findings,
      );
      if (row.status === "accepted")
        acceptedBindings.add(
          requirementBindingIdentity(
            row.resource_ref,
            binding.requirement_key,
            binding.delta_id,
          ),
        );
    }
    validateFinalDisposition(row, selected, findings);
  }
  compareSet(
    findings,
    "accepted_resource_requirement_bindings",
    [...acceptedBindings],
    [...expectedRequirementBindings],
  );
  compareSet(
    findings,
    "accepted_resource_coverage",
    [...acceptedResources],
    [...selected],
  );
}

function validateResourceRequirementBinding(
  row: DesignResourceReconciliationAudit["resource_to_requirements"][number],
  binding: DesignResourceReconciliationAudit["resource_to_requirements"][number]["requirement_bindings"][number],
  activeAcceptedById: Map<string, DesignResourceDelta>,
  allDeltasById: Map<string, DesignResourceDelta>,
  changed: Set<string>,
  findings: string[],
): void {
  const delta = allDeltasById.get(binding.delta_id);
  if (!delta) {
    findings.push(
      `resource_decision_delta_unknown:${row.key}:${binding.delta_id}`,
    );
    return;
  }
  if (delta.status !== row.status)
    findings.push(
      `resource_decision_status_mismatch:${row.key}:${binding.delta_id}`,
    );
  if (row.status === "accepted" && !activeAcceptedById.has(binding.delta_id))
    findings.push(
      `resource_decision_accepted_delta_inactive:${row.key}:${binding.delta_id}`,
    );
  if (!delta.target_keys.includes(binding.requirement_key))
    findings.push(
      `resource_decision_target_mismatch:${row.key}:${binding.requirement_key}:${binding.delta_id}`,
    );
  if (row.status === "accepted" && !changed.has(binding.requirement_key))
    findings.push(
      `resource_decision_requirement_unknown:${row.key}:${binding.requirement_key}`,
    );
  compareValue(
    findings,
    `resource_decision_semantic_kind:${row.key}:${binding.requirement_key}:${binding.delta_id}`,
    row.semantic_kind,
    delta.semantic_kind,
  );
  compareValue(
    findings,
    `resource_decision_origin:${row.key}:${binding.requirement_key}:${binding.delta_id}`,
    binding.origin,
    delta.origin,
  );
  compareValue(
    findings,
    `resource_decision_authority:${row.key}:${binding.requirement_key}:${binding.delta_id}`,
    binding.decision_authority,
    delta.decision_authority,
  );
  compareSet(
    findings,
    `resource_decision_sources:${row.key}:${binding.requirement_key}:${binding.delta_id}`,
    binding.source_refs,
    delta.source_refs,
  );
}

function validateFinalDisposition(
  row: DesignResourceReconciliationAudit["resource_to_requirements"][number],
  selected: Set<string>,
  findings: string[],
): void {
  const disposition = row.final_disposition;
  if (row.status === "rejected") {
    if (disposition.kind !== "not-adopted")
      findings.push(`resource_decision_rejected_owner:${row.key}`);
    return;
  }
  if (row.status === "unresolved") {
    findings.push(`resource_decision_unresolved:${row.key}`);
    if (disposition.kind !== "unresolved")
      findings.push(`resource_decision_unresolved_owner:${row.key}`);
    return;
  }
  if (
    disposition.kind !== "proposal-written" &&
    disposition.kind !== "resource-owned-exact-visual"
  ) {
    findings.push(`resource_decision_accepted_owner_missing:${row.key}`);
    return;
  }
  if (disposition.kind === "proposal-written") return;
  if (row.semantic_kind !== "exact-visual")
    findings.push(`resource_owner_nonvisual_meaning:${row.key}`);
  if (disposition.resource_ref !== row.resource_ref)
    findings.push(`resource_owner_identity_mismatch:${row.key}`);
  if (!selected.has(disposition.resource_ref))
    findings.push(`resource_owner_unselected:${row.key}`);
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
  compareSet(
    findings,
    "unexpected_blast_radius_keys",
    audit.unexpected_blast_radius.map((row) => row.key),
    checkpoint.blast_radius_keys,
  );
  for (const row of audit.unexpected_blast_radius)
    if (row.verdict !== "expected")
      findings.push(`${row.verdict}_blast_radius:${row.key}`);
  uniqueRows(
    audit.rejected_or_unresolved_leakage.map((row) => row.delta_id),
    "rejected_or_unresolved_leakage",
  );
  const expected = [
    ...checkpoint.decision_sets.rejected_delta_ids,
    ...checkpoint.decision_sets.unresolved_delta_ids,
  ];
  compareSet(
    findings,
    "rejected_or_unresolved_leakage_ids",
    audit.rejected_or_unresolved_leakage.map((row) => row.delta_id),
    expected,
  );
  for (const row of audit.rejected_or_unresolved_leakage)
    if (row.leaked) findings.push(`decision_leaked:${row.delta_id}`);
}

function compareIdentitySet(
  findings: string[],
  label: string,
  actual: Array<{ key: string; raw_byte_digest: string }>,
  expected: Array<{ key: string; raw_byte_digest: string }>,
): void {
  compareSet(
    findings,
    `${label}_keys`,
    actual.map((row) => row.key),
    expected.map((row) => row.key),
  );
  const expectedMap = new Map(
    expected.map((row) => [row.key, row.raw_byte_digest]),
  );
  for (const row of actual)
    compareValue(
      findings,
      `${label}:${row.key}`,
      row.raw_byte_digest,
      expectedMap.get(row.key) ?? "missing",
    );
}

function compareSet(
  findings: string[],
  label: string,
  actual: string[],
  expected: string[],
): void {
  const left = [...new Set(actual)].sort(compareText);
  const right = [...new Set(expected)].sort(compareText);
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

function requirementBindingIdentity(
  resourceRef: string,
  requirementKey: string,
  deltaId: string,
): string {
  return `${resourceRef}\u0000${requirementKey}\u0000${deltaId}`;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
