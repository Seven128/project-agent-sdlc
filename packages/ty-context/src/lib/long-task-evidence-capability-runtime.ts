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
        fact_expectations: item.fact_expectations,
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
    if (
      !same(
        [...cell.fact_results.map((item) => item.fact_ref)].sort(),
        [...(expectedCell?.fact_refs ?? [])].sort(),
      )
    )
      return "design_method_fact_results_mismatch";
    if (!artifactHashes[cell.artifact_path])
      return "design_method_artifact_missing";
    if (!artifactHashes[cell.observation_artifact_path])
      return "design_method_observation_artifact_missing";
    const expectations = new Map(
      (expectedCell?.fact_expectations ?? []).map((item) => [
        item.fact_ref,
        item,
      ]),
    );
    const actualIdentities = new Set<string>();
    const comparisonIdentities = new Set<string>();
    for (const result of cell.fact_results) {
      const expectation = expectations.get(result.fact_ref);
      if (!expectation) return "design_method_fact_expectation_missing";
      if (
        result.subject_ref !== expectation.subject_ref ||
        result.variation_ref !== expectation.variation_ref ||
        result.property_ref !== expectation.property_ref ||
        result.actual_observation.sensitivity !==
          expectation.observation_sensitivity
      )
        return "design_method_fact_identity_mismatch";
      if (
        (result.actual_observation.sensitivity === "plain" &&
          result.actual_observation.redaction !== null) ||
        (result.actual_observation.sensitivity === "protected" &&
          result.actual_observation.redaction === null)
      )
        return "design_method_observation_protection_mismatch";
      if (
        canonicalJson(result.expected) !== canonicalJson(expectation.expected)
      )
        return "design_method_expected_value_mismatch";
      if (
        result.comparison.comparator !== expectation.comparison.comparator ||
        result.comparison.mode !== expectation.comparison.mode ||
        canonicalJson(result.comparison.parameters) !==
          canonicalJson(expectation.comparison.parameters) ||
        canonicalJson(result.comparison.tolerance) !==
          canonicalJson(expectation.comparison.tolerance) ||
        canonicalJson(result.comparison.mask) !==
          canonicalJson(expectation.comparison.mask)
      )
        return "design_method_comparison_authority_mismatch";
      if (
        canonicalJson(result.oracle) !== canonicalJson(expectation.oracle) ||
        canonicalJson(result.environment) !==
          canonicalJson(expectation.environment)
      )
        return "design_method_oracle_environment_mismatch";
      if (
        result.actual_observation.artifact_path !==
          cell.observation_artifact_path ||
        result.actual_observation.artifact_sha256 !==
          artifactHashes[cell.observation_artifact_path]
      )
        return "design_method_actual_observation_mismatch";
      if (
        result.actual_environment.artifact_path !==
          cell.observation_artifact_path ||
        result.actual_environment.artifact_sha256 !==
          artifactHashes[cell.observation_artifact_path] ||
        result.actual_environment.value_sha256 !==
          expectation.environment.definition.sha256
      )
        return "design_method_actual_environment_mismatch";
      if (
        result.comparison.artifact_path !== cell.artifact_path ||
        result.comparison.artifact_sha256 !== artifactHashes[cell.artifact_path]
      )
        return "design_method_comparison_artifact_mismatch";
      const actualIdentity = `${result.actual_observation.artifact_path}\0${canonicalJson(result.actual_observation.locator)}`;
      if (actualIdentities.has(actualIdentity))
        return "design_method_actual_observation_reused";
      actualIdentities.add(actualIdentity);
      const comparisonIdentity = `${result.comparison.artifact_path}\0${canonicalJson(result.comparison.locator)}`;
      if (comparisonIdentities.has(comparisonIdentity))
        return "design_method_comparison_result_reused";
      comparisonIdentities.add(comparisonIdentity);
      if (result.verdict !== "passed" || result.comparison.passed !== true)
        return "design_method_fact_failed";
    }
  }
  return null;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
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
