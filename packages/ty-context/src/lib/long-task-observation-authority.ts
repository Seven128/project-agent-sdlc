import type {
  CompiledDesignTargetV2,
  CompiledObservationAuthorityKindV2,
  CompiledObservationAuthorityV2,
  DeliveryAssertionV2,
  DeliveryCheckV2,
  EvidenceCapabilityV2,
  ExecutionTargetV2,
  FrozenRunnerV2,
  SemanticFactExpectationV2,
  SourceBackedExecutionTargetV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import {
  JSON_POINTER_EXACT_METHODS,
  isJsonPointerExactOracle,
} from "./long-task-json-pointer-observation.js";
import { classifyMachineObservationCarrierRoleConflict } from "./long-task-admitted-observation.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import type { ScopedDeliveryBindingV2 } from "./long-task-scoped-binding.js";
import {
  classifyRepositoryPatternOverlap,
  normalizeRepositoryFile,
} from "./long-task-paths.js";

interface CompileObservationAuthorityPlanInput {
  check: DeliveryCheckV2;
  outcome_key: string | null;
  runner: FrozenRunnerV2;
  execution_target: ExecutionTargetV2;
  design_targets: CompiledDesignTargetV2[];
  semantic_fact_expectations: SemanticFactExpectationV2[];
  production_bindings: ScopedDeliveryBindingV2[];
  production_owner_paths: string[];
  source_backed_execution_target: SourceBackedExecutionTargetV2 | null;
  workspace_manifest: WorkspaceManifestV2;
  protected_authority_paths?: readonly string[];
}

interface ExactCandidate {
  obligation_ref: string;
  observation_identity: string;
  fact_ref: string | null;
  assertion: DeliveryAssertionV2;
  target_ref: string;
  method: string;
  expected_value_sha256: string;
  actual_projection: CompiledObservationAuthorityV2["actual_projection"];
  comparison: CompiledObservationAuthorityV2["comparison"];
  sensitivity: "plain" | "protected";
  oracle?: {
    trust?: string;
    identity?: string;
    version?: string;
    sha256?: string | null;
  };
  diagnostic_scope: "semantic_fact" | "design_fact" | "assertion";
}

const PROCESS_DERIVED_CAPABILITIES = new Set<EvidenceCapabilityV2>([
  "presence",
  "target_runtime",
]);

const PROCESS_CAPABILITIES_REQUIRING_A_SEPARATE_PACKAGE_DERIVATION =
  new Set<EvidenceCapabilityV2>([
    "interaction_trace",
    "state_delta",
    "design_conformance",
  ]);

const STATIC_DERIVED_CAPABILITIES = new Set<EvidenceCapabilityV2>(["presence"]);

export function compileObservationAuthorityPlan(
  input: CompileObservationAuthorityPlanInput,
): CompiledObservationAuthorityV2[] {
  const assertions = new Map(
    [
      ...input.check.positive_assertions,
      ...input.check.negative_assertions,
    ].map((assertion) => [assertion.key, assertion]),
  );
  const candidates: ExactCandidate[] = [];
  const factBoundAssertions = new Set<string>();

  for (const expectation of input.semantic_fact_expectations) {
    if (expectation.observer_refs.length)
      fail(
        "semantic_fact_machine_observer_not_admitted",
        `${expectation.proof_ref}:observer_results_package_channel_unavailable:${expectation.observer_refs.join(",")}`,
      );
    const assertion = requiredAssertion(
      assertions,
      expectation.assertion_ref,
      `semantic_fact_machine_observer_not_admitted:${expectation.proof_ref}`,
    );
    factBoundAssertions.add(assertion.key);
    candidates.push({
      obligation_ref: expectation.proof_ref,
      observation_identity: expectation.fact_ref,
      fact_ref: expectation.fact_ref,
      assertion,
      target_ref: input.check.execution_target.target_ref,
      method: expectation.method,
      expected_value_sha256: expectation.expected.sha256,
      actual_projection: "raw_exact",
      comparison: {
        comparator: expectation.comparison.comparator,
        mode: expectation.comparison.mode,
        parameters_sha256: expectation.comparison.parameters.sha256,
        tolerance_sha256: expectation.comparison.tolerance?.sha256 ?? null,
        mask_sha256: expectation.comparison.mask?.sha256 ?? null,
      },
      sensitivity: expectation.observation_sensitivity,
      oracle: expectation.oracle,
      diagnostic_scope: "semantic_fact",
    });
  }

  for (const target of input.design_targets) {
    if (target.target_ref !== input.check.execution_target.target_ref)
      fail(
        "machine_observer_not_admitted",
        `${target.key}:target_mismatch:${target.target_ref}:${input.check.execution_target.target_ref}`,
      );
    for (const binding of target.verification_method_bindings)
      for (const artifact of binding.evidence_artifacts)
        for (const expectation of artifact.fact_expectations) {
          const assertion = requiredAssertion(
            assertions,
            binding.assertion_ref,
            `machine_observer_not_admitted:${target.key}:${binding.method}`,
          );
          factBoundAssertions.add(assertion.key);
          candidates.push({
            obligation_ref: designGroundObligationRef(
              target.key,
              binding.method,
              artifact.condition_key,
              expectation.fact_ref,
            ),
            observation_identity: expectation.fact_ref,
            fact_ref: expectation.fact_ref,
            assertion,
            target_ref: target.target_ref,
            method: binding.method,
            expected_value_sha256: expectation.expected.sha256,
            actual_projection: "raw_exact",
            comparison: {
              comparator: expectation.comparison.comparator,
              mode: expectation.comparison.mode,
              parameters_sha256: expectation.comparison.parameters.sha256,
              tolerance_sha256:
                expectation.comparison.tolerance?.sha256 ?? null,
              mask_sha256: expectation.comparison.mask?.sha256 ?? null,
            },
            sensitivity: expectation.observation_sensitivity,
            oracle: expectation.oracle,
            diagnostic_scope: "design_fact",
          });
        }
    for (const binding of target.symbolic_method_bindings ?? [])
      for (const expectation of binding.rule_expectations) {
        const assertion = requiredAssertion(
          assertions,
          binding.assertion_ref,
          `machine_observer_not_admitted:${target.key}:${binding.method}`,
        );
        factBoundAssertions.add(assertion.key);
        if (expectation.proof_surface !== input.check.proof_surface)
          fail(
            "unsupported_observer_requires_external_confirmation",
            `${target.key}:${expectation.obligation_ref}:proof_surface_mismatch`,
          );
        candidates.push({
          obligation_ref: expectation.obligation_ref,
          observation_identity: expectation.obligation_ref,
          fact_ref: expectation.fact_rule_ref,
          assertion,
          target_ref: target.target_ref,
          method: binding.method,
          expected_value_sha256: expectation.expected.sha256,
          actual_projection: "raw_exact",
          comparison: {
            comparator: expectation.comparison.comparator,
            mode: expectation.comparison.mode,
            parameters_sha256: expectation.comparison.parameters.sha256,
            tolerance_sha256: expectation.comparison.tolerance?.sha256 ?? null,
            mask_sha256: expectation.comparison.mask?.sha256 ?? null,
          },
          sensitivity: expectation.observation_sensitivity,
          oracle: expectation.oracle,
          diagnostic_scope: "design_fact",
        });
      }
  }

  for (const assertion of assertions.values()) {
    if (factBoundAssertions.has(assertion.key)) continue;
    const expected = exactAssertionExpected(assertion);
    const obligationRef = assertionObligationRef(
      input.outcome_key,
      input.check.key,
      assertion.key,
    );
    candidates.push({
      obligation_ref: obligationRef,
      observation_identity: obligationRef,
      fact_ref: null,
      assertion,
      target_ref: input.check.execution_target.target_ref,
      method: "exact_value",
      expected_value_sha256: sha256Hex(canonicalValueJson(expected)),
      actual_projection: assertionActualProjection(assertion),
      comparison: {
        comparator: "exact_value",
        mode: "exact",
        parameters_sha256: sha256Hex(
          canonicalValueJson({ comparator: "exact_value" }),
        ),
        tolerance_sha256: null,
        mask_sha256: null,
      },
      sensitivity: "plain",
      diagnostic_scope: "assertion",
    });
  }

  const rows = candidates.map((candidate) =>
    compileCandidate(input, candidate),
  );
  assertUniqueRows(rows);
  return rows.sort((left, right) =>
    canonicalValueJson(left).localeCompare(canonicalValueJson(right)),
  );
}

function compileCandidate(
  input: CompileObservationAuthorityPlanInput,
  candidate: ExactCandidate,
): CompiledObservationAuthorityV2 {
  const unimplementedDerivedCapability =
    candidate.assertion.evidence_capabilities.find((capability) =>
      PROCESS_CAPABILITIES_REQUIRING_A_SEPARATE_PACKAGE_DERIVATION.has(
        capability,
      ),
    );
  if (unimplementedDerivedCapability)
    fail(
      "unsupported_observer_requires_external_confirmation",
      `${candidate.obligation_ref}:${unimplementedDerivedCapability}:package_derivation_required`,
    );
  if (candidate.oracle && !isJsonPointerExactOracle(candidate.oracle))
    fail(
      "custom_oracle_machine_completion_forbidden",
      `${candidate.diagnostic_scope}:${candidate.obligation_ref}:${candidate.oracle.identity ?? "unknown"}`,
    );
  if (
    !JSON_POINTER_EXACT_METHODS.includes(
      candidate.method as (typeof JSON_POINTER_EXACT_METHODS)[number],
    ) ||
    candidate.comparison.comparator !== "exact_value" ||
    candidate.comparison.mode !== "exact" ||
    candidate.comparison.tolerance_sha256 !== null ||
    candidate.comparison.mask_sha256 !== null ||
    candidate.sensitivity !== "plain"
  )
    fail(
      candidate.diagnostic_scope === "semantic_fact"
        ? "semantic_fact_machine_observer_not_admitted"
        : "unsupported_observer_requires_external_confirmation",
      `${candidate.diagnostic_scope}:${candidate.obligation_ref}:plain_exact_json_required`,
    );

  const authority = selectAuthority(input, candidate);
  const carrierRefs = productionCarrierRefs(input);
  if (authority === "package_static_json_exact") {
    if (!carrierRefs.length)
      fail(
        "machine_observer_not_admitted",
        `${candidate.obligation_ref}:production_binding_carrier_required`,
      );
    if (carrierRefs.length !== 1)
      fail(
        "machine_observer_not_admitted",
        `${candidate.obligation_ref}:static_production_binding_ambiguous`,
      );
    const staticPaths = carrierRefs[0].carrier_paths;
    if (staticPaths.length !== 1 || !isExactRepositoryFile(staticPaths[0]))
      fail(
        "machine_observer_not_admitted",
        `${candidate.obligation_ref}:static_production_carrier_exact_path_required`,
      );
  }
  if (authority === "package_static_json_exact")
    for (const carrierPath of carrierRefs.flatMap(
      (carrier) => carrier.carrier_paths,
    )) {
      const carrierRoleIssue = staticObservationCarrierRoleConflict(
        input,
        carrierPath,
      );
      if (carrierRoleIssue)
        fail(
          "machine_observer_not_admitted",
          `${candidate.obligation_ref}:${carrierRoleIssue}`,
        );
    }
  const comparison = candidate.comparison;
  const expectedIdentity = sha256Hex(
    canonicalValueJson({
      obligation_ref: candidate.obligation_ref,
      fact_ref: candidate.fact_ref,
      method: candidate.method,
      expected_value_sha256: candidate.expected_value_sha256,
      comparison,
      actual_projection: candidate.actual_projection,
      carrier_refs: carrierRefs,
    }),
  );
  return {
    obligation_ref: candidate.obligation_ref,
    fact_ref: candidate.fact_ref,
    assertion_ref: candidate.assertion.key,
    claim_refs: [...candidate.assertion.claims].sort(),
    target_ref: candidate.target_ref,
    proof_surface: input.check.proof_surface,
    method: candidate.method,
    evidence_capabilities: [
      ...candidate.assertion.evidence_capabilities,
    ].sort(),
    authority,
    expected_identity: expectedIdentity,
    expected_value_sha256: candidate.expected_value_sha256,
    actual_projection: candidate.actual_projection,
    observation_identity: candidate.observation_identity,
    comparison,
    locator_policy: {
      kind: "fixed_json_pointer",
      value: observationPointer(candidate.observation_identity),
    },
    carrier_refs: carrierRefs,
    runtime_requirements: runtimeRequirements(input),
  };
}

function selectAuthority(
  input: CompileObservationAuthorityPlanInput,
  candidate: ExactCandidate,
): CompiledObservationAuthorityKindV2 {
  const target = input.execution_target;
  if (target.role !== "product")
    fail(
      "unsupported_observer_requires_external_confirmation",
      `${candidate.obligation_ref}:product_target_required`,
    );

  if (input.check.proof_surface === "implementation_structure") {
    if (!input.check.input_paths.length)
      fail(
        "machine_observer_not_admitted",
        `${candidate.obligation_ref}:static_carrier_required`,
      );
    if (
      !capabilitiesAdmitted(
        candidate.assertion.evidence_capabilities,
        admittedCapabilities(candidate, STATIC_DERIVED_CAPABILITIES),
      )
    )
      fail(
        "unsupported_observer_requires_external_confirmation",
        `${candidate.obligation_ref}:static_capability_not_admitted`,
      );
    return "package_static_json_exact";
  }

  if (
    target.runtime_family !== "process" ||
    input.check.proof_surface === "ui_browser" ||
    input.check.proof_surface === "population_coverage"
  )
    fail(
      "unsupported_observer_requires_external_confirmation",
      `${candidate.obligation_ref}:${target.runtime_family}:${input.check.proof_surface}`,
    );

  if (
    input.check.runner.type !== "project_binary" ||
    input.check.execution_target.entrypoint !== "root" ||
    input.runner.resolved_target !== target.root_entrypoint
  )
    fail(
      "process_observer_direct_root_required",
      `${candidate.obligation_ref}:${input.runner.resolved_target}:${target.root_entrypoint}`,
    );
  if (!target.root_argv)
    fail("process_observer_root_invocation_required", candidate.obligation_ref);
  if (!sameStringArray(input.check.runner.argv, target.root_argv))
    fail(
      "process_observer_root_argv_mismatch",
      `${candidate.obligation_ref}:${canonicalValueJson(input.check.runner.argv)}:${canonicalValueJson(target.root_argv)}`,
    );
  if (
    !capabilitiesAdmitted(
      candidate.assertion.evidence_capabilities,
      admittedCapabilities(candidate, PROCESS_DERIVED_CAPABILITIES),
    )
  )
    fail(
      "unsupported_observer_requires_external_confirmation",
      `${candidate.obligation_ref}:process_capability_not_admitted`,
    );
  return "package_process_json_exact";
}

function runtimeRequirements(
  input: CompileObservationAuthorityPlanInput,
): CompiledObservationAuthorityV2["runtime_requirements"] {
  return {
    runtime_family: input.execution_target.runtime_family,
    target_role: input.execution_target.role,
    entrypoint: input.check.execution_target.entrypoint,
    runner_type: input.check.runner.type,
    resolved_runner_target: input.runner.resolved_target,
    declared_root_entrypoint: input.execution_target.root_entrypoint,
    resolved_runner_argv: [...input.runner.argv],
    declared_root_argv: input.execution_target.root_argv
      ? [...input.execution_target.root_argv]
      : null,
    effect: input.check.runner.effect,
    direct_root_match:
      input.check.runner.type === "project_binary" &&
      input.check.execution_target.entrypoint === "root" &&
      input.runner.resolved_target === input.execution_target.root_entrypoint &&
      input.execution_target.root_argv !== undefined &&
      sameStringArray(
        input.check.runner.argv,
        input.execution_target.root_argv,
      ),
  };
}

function assertionActualProjection(
  assertion: DeliveryAssertionV2,
): CompiledObservationAuthorityV2["actual_projection"] {
  if (assertion.operator === "equals") return "raw_exact";
  if (assertion.operator === "exists") return "presence_boolean";
  if (assertion.operator === "truthy") return "truthy_boolean";
  if (assertion.operator === "falsy") return "falsy_boolean";
  fail(
    "machine_observer_not_admitted",
    `${assertion.key}:exact_equals_or_host_boolean_required`,
  );
}

function staticObservationCarrierRoleConflict(
  input: CompileObservationAuthorityPlanInput,
  carrierPath: string,
): string | null {
  const expectedAuthorityPatterns = [
    ...Object.keys(input.runner.frozen_files),
    ...(input.protected_authority_paths ?? []),
  ];
  const evidencePatterns = [
    ...input.check.expected_output_paths,
    ...input.check.artifact_globs,
  ];
  const conflict = classifyMachineObservationCarrierRoleConflict({
    carrier_pattern: carrierPath,
    expected_authority_patterns: expectedAuthorityPatterns,
    evidence_role_patterns: evidencePatterns,
  });
  if (!conflict) return null;
  return `static_carrier_${conflict}_forbidden`;
}

function sameStringArray(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function capabilitiesAdmitted(
  capabilities: readonly EvidenceCapabilityV2[],
  admitted: ReadonlySet<EvidenceCapabilityV2>,
): boolean {
  return capabilities.every((capability) => admitted.has(capability));
}

function admittedCapabilities(
  candidate: ExactCandidate,
  derived: ReadonlySet<EvidenceCapabilityV2>,
): ReadonlySet<EvidenceCapabilityV2> {
  const admitted = new Set(derived);
  if (candidate.diagnostic_scope === "semantic_fact")
    admitted.add("semantic_fact");
  else if (candidate.diagnostic_scope === "design_fact")
    admitted.add("design_method");
  return admitted;
}

function productionCarrierRefs(
  input: CompileObservationAuthorityPlanInput,
): CompiledObservationAuthorityV2["carrier_refs"] {
  return input.production_bindings
    .map((scoped) => ({
      binding_ref: scoped.binding_ref,
      carrier_paths: scoped.binding.carrier_paths
        .filter((carrier) =>
          input.check.input_paths.some(
            (inputPath) =>
              classifyRepositoryPatternOverlap(carrier, inputPath).status ===
              "proven_overlap",
          ),
        )
        .sort(),
    }))
    .filter((binding) => binding.carrier_paths.length)
    .sort((left, right) => left.binding_ref.localeCompare(right.binding_ref));
}

function isExactRepositoryFile(value: string): boolean {
  try {
    normalizeRepositoryFile(value, "static_observation_carrier");
    return true;
  } catch {
    return false;
  }
}

function exactAssertionExpected(assertion: DeliveryAssertionV2): unknown {
  if (assertion.operator === "equals") return assertion.expected;
  if (assertion.operator === "truthy" || assertion.operator === "exists")
    return true;
  if (assertion.operator === "falsy") return false;
  fail(
    "machine_observer_not_admitted",
    `${assertion.key}:exact_equals_or_host_boolean_required`,
  );
}

function requiredAssertion(
  assertions: ReadonlyMap<string, DeliveryAssertionV2>,
  assertionRef: string,
  diagnostic: string,
): DeliveryAssertionV2 {
  const assertion = assertions.get(assertionRef);
  if (!assertion) throw new Error(diagnostic);
  return assertion;
}

function assertionObligationRef(
  outcomeKey: string | null,
  checkKey: string,
  assertionKey: string,
): string {
  return `assertion.${outcomeKey ?? "GLOBAL"}.${checkKey}.${assertionKey}`;
}

function designGroundObligationRef(
  targetKey: string,
  method: string,
  conditionKey: string,
  factRef: string,
): string {
  return `design.${targetKey}.${method}.${conditionKey}.${factRef}`;
}

function observationPointer(identity: string): string {
  return `/observations/${identity.replace(/~/gu, "~0").replace(/\//gu, "~1")}`;
}

function assertUniqueRows(rows: CompiledObservationAuthorityV2[]): void {
  const identities = new Set<string>();
  for (const row of rows) {
    const identity = `${row.assertion_ref}\0${row.obligation_ref}\0${row.method}`;
    if (identities.has(identity))
      fail("machine_observer_not_admitted", `duplicate:${identity}`);
    identities.add(identity);
  }
}

function fail(code: string, detail: string): never {
  throw new Error(`${code}:${detail}`);
}
