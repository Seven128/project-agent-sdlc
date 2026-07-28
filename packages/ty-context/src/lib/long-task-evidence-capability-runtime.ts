import type {
  CompiledCheckV2,
  EvidenceCapabilityRecordV2,
} from "./long-task-delivery-types.js";

export function validateRuntimeEvidenceRecord(
  check: CompiledCheckV2,
  record: EvidenceCapabilityRecordV2,
  artifactHashes: Record<string, string>,
): string | null {
  switch (record.capability) {
    case "interaction_trace":
      return validateInteractionTrace(check, record);
    case "state_delta":
      if (record.before_sha256 === record.after_sha256)
        return "state_unchanged";
      if (!record.changed_fields.length) return "changed_fields_empty";
      return null;
    case "cross_surface_consistency":
      return validateCrossSurfaceConsistency(check, record);
    case "durable_readback":
      if (record.write_session_id === record.read_session_id)
        return "independent_session_required";
      if (record.written_sha256 !== record.read_sha256)
        return "readback_mismatch";
      return null;
    case "boundary_invocation":
    case "external_side_effect":
      return validateObserverEvidence(check, record.observer_target_ref);
    case "failure_injection":
      return record.failure_observed ? null : "failure_not_observed";
    case "visual_render":
      return artifactHashes[record.artifact_path] === record.artifact_sha256
        ? null
        : "artifact_hash_mismatch";
    case "design_conformance":
      return validateDesignConformance(check, record, artifactHashes);
    case "design_method":
      return validateDesignMethod(check, record, artifactHashes);
    case "target_runtime":
      return validateTargetRuntime(check, record);
    case "input_variation":
      return validateInputVariation(record);
  }
}

function validateDesignMethod(
  check: CompiledCheckV2,
  record: Extract<EvidenceCapabilityRecordV2, { capability: "design_method" }>,
  artifactHashes: Record<string, string>,
): string | null {
  const target = (check.design_conformance_targets ?? []).find(
    (item) =>
      item.key === record.design_target_ref &&
      item.verification_method_bindings.some(
        (binding) =>
          binding.assertion_ref === record.assertion_key &&
          binding.method === record.method,
      ),
  );
  if (!target) return "design_method_binding_unknown";
  if (
    target.target_ref !== record.target_ref ||
    target.target_ref !== check.execution_target.target_ref
  )
    return "target_mismatch";
  const binding = target.verification_method_bindings.find(
    (item) =>
      item.assertion_ref === record.assertion_key &&
      item.method === record.method,
  )!;
  if (
    !same(
      [...record.cells.map((item) => item.condition_key)].sort(),
      [...target.condition_keys].sort(),
    )
  )
    return "design_method_conditions_mismatch";
  const expected = new Map(
    binding.evidence_artifacts.map((item) => [
      item.condition_key,
      {
        artifact_path: item.path,
        observation_artifact_path: item.observation_path,
        fact_refs: item.fact_refs,
      },
    ]),
  );
  if (record.cells.length !== expected.size)
    return "design_method_cell_count_mismatch";
  for (const cell of record.cells) {
    const expectedCell = expected.get(cell.condition_key);
    if (
      expectedCell?.artifact_path !== cell.artifact_path ||
      expectedCell?.observation_artifact_path !== cell.observation_artifact_path
    )
      return "design_method_artifact_path_mismatch";
    if (
      !same(
        [...cell.fact_refs].sort(),
        [...(expectedCell?.fact_refs ?? [])].sort(),
      )
    )
      return "design_method_fact_refs_mismatch";
    if (!artifactHashes[cell.artifact_path])
      return "design_method_artifact_missing";
    if (!artifactHashes[cell.observation_artifact_path])
      return "design_method_observation_artifact_missing";
  }
  return null;
}

function validateDesignConformance(
  check: CompiledCheckV2,
  record: Extract<
    EvidenceCapabilityRecordV2,
    { capability: "design_conformance" }
  >,
  artifactHashes: Record<string, string>,
): string | null {
  const target = (check.design_conformance_targets ?? []).find(
    (item) =>
      item.key === record.design_target_ref &&
      designTargetUsesAssertion(item, record.assertion_key),
  );
  if (!target) return "design_target_unknown";
  if (
    target.target_ref !== record.target_ref ||
    target.target_ref !== check.execution_target.target_ref
  )
    return "target_mismatch";
  if (
    !same([...target.condition_keys].sort(), [...record.condition_keys].sort())
  )
    return "design_conditions_mismatch";
  if (
    target.actual_artifact_path !== record.actual_artifact_path ||
    target.comparison_artifact_path !== record.comparison_artifact_path
  )
    return "design_artifact_path_mismatch";
  if (!artifactHashes[record.actual_artifact_path])
    return "actual_artifact_missing";
  if (!artifactHashes[record.comparison_artifact_path])
    return "comparison_artifact_missing";
  return null;
}

function designTargetUsesAssertion(
  target: CompiledCheckV2["design_conformance_targets"][number],
  assertionKey: string,
): boolean {
  return (
    target.conformance_assertion_ref === assertionKey ||
    target.verification_method_bindings.some(
      (item) => item.assertion_ref === assertionKey,
    )
  );
}

function validateInteractionTrace(
  check: CompiledCheckV2,
  record: Extract<
    EvidenceCapabilityRecordV2,
    { capability: "interaction_trace" }
  >,
): string | null {
  if (record.target_ref !== check.execution_target.target_ref)
    return "target_mismatch";
  if (
    !same(
      record.given_keys,
      check.scenario.given.map((step) => step.key),
    )
  )
    return "given_trace_mismatch";
  if (
    !same(
      record.action_keys,
      check.scenario.when.map((step) => step.key),
    )
  )
    return "action_trace_mismatch";
  return null;
}

function validateCrossSurfaceConsistency(
  check: CompiledCheckV2,
  record: Extract<
    EvidenceCapabilityRecordV2,
    { capability: "cross_surface_consistency" }
  >,
): string | null {
  const surfaces = new Set(
    record.surfaces.map((surface) => surface.surface_ref),
  );
  const targets = new Set(record.surfaces.map((surface) => surface.target_ref));
  const states = new Set(
    record.surfaces.map((surface) => surface.state_sha256),
  );
  if (surfaces.size < 2) return "two_surfaces_required";
  if (states.size !== 1) return "state_hash_mismatch";
  if (
    [...targets].some(
      (target) =>
        !check.known_execution_targets.some((item) => item.key === target),
    )
  )
    return "target_unknown";
  return null;
}

function validateObserverEvidence(
  check: CompiledCheckV2,
  observerTargetRef: string,
): string | null {
  const observer = check.known_execution_targets.find(
    (target) => target.key === observerTargetRef,
  );
  if (!observer || observer.role !== "observer")
    return "observer_target_invalid";
  if (observer.key !== check.execution_target.target_ref)
    return "check_must_execute_on_observer";
  return null;
}

function validateTargetRuntime(
  check: CompiledCheckV2,
  record: Extract<EvidenceCapabilityRecordV2, { capability: "target_runtime" }>,
): string | null {
  if (record.target_ref !== check.execution_target.target_ref)
    return "target_mismatch";
  if (
    record.root_entrypoint !== check.execution_target_definition.root_entrypoint
  )
    return "root_entrypoint_mismatch";
  if (check.execution_target.entrypoint === "root" && !record.cold_start)
    return "cold_start_required";
  return null;
}

function validateInputVariation(
  record: Extract<
    EvidenceCapabilityRecordV2,
    { capability: "input_variation" }
  >,
): string | null {
  const inputs = new Set(record.cases.map((item) => item.input_sha256));
  const outputs = new Set(record.cases.map((item) => item.output_sha256));
  if (inputs.size < 2) return "distinct_inputs_required";
  if (outputs.size < 2) return "input_must_reach_output";
  if (!record.failure_case_observed) return "failure_case_required";
  return null;
}

function same(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
