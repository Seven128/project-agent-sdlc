import type {
  DeliveryDesignAcceptanceBlockerV2,
  DeliveryDesignTargetV2,
  DeliverySurfaceBindingV2,
} from "./long-task-ui-surface-types.js";
import { DESIGN_RESOURCE_VERIFICATION_METHODS } from "./design-resource-handoff-types.js";
import { DESIGN_RESOURCE_COMPARATORS } from "./design-resource-fact-manifest-types.js";
import { parseDesignResourceLocatedDigest } from "./design-resource-fact-shape-primitives.js";
import { nonnegativeInteger } from "./design-resource-handoff-shape-primitives.js";
import { EXECUTION_TARGET_CAPABILITIES } from "./execution-target-capabilities.js";
import {
  array,
  fail,
  key,
  literal,
  nullable,
  object,
  repositoryFile,
  repositoryFiles,
  string,
  strings,
} from "./long-task-shape-primitives.js";

export function parseSurfaceBindings(
  value: unknown,
  label: string,
): DeliverySurfaceBindingV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "surface_ref",
      "target_ref",
      "control_refs",
      "route_binding_ref",
      "component_binding_refs",
      "root_journey_check_ref",
      "entry_action_ref",
      "design_targets",
      "acceptance_blockers",
    ]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      surface_ref: string(row.surface_ref, `${itemLabel}.surface_ref`),
      target_ref: key(row.target_ref, `${itemLabel}.target_ref`),
      control_refs: keys(row.control_refs, `${itemLabel}.control_refs`),
      route_binding_ref: key(
        row.route_binding_ref,
        `${itemLabel}.route_binding_ref`,
      ),
      component_binding_refs: keys(
        row.component_binding_refs,
        `${itemLabel}.component_binding_refs`,
      ),
      root_journey_check_ref: key(
        row.root_journey_check_ref,
        `${itemLabel}.root_journey_check_ref`,
      ),
      entry_action_ref: key(
        row.entry_action_ref,
        `${itemLabel}.entry_action_ref`,
      ),
      design_targets: parseDesignTargets(
        row.design_targets,
        `${itemLabel}.design_targets`,
      ),
      acceptance_blockers: parseAcceptanceBlockers(
        row.acceptance_blockers,
        `${itemLabel}.acceptance_blockers`,
      ),
    };
  });
}

function parseDesignTargets(
  value: unknown,
  label: string,
): DeliveryDesignTargetV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(
      item,
      itemLabel,
      [
        "key",
        "interpretation",
        "source_paths",
        "condition_keys",
        "claim_refs",
        "conformance_check_ref",
        "conformance_assertion_ref",
        "verification_method_bindings",
        "actual_artifact_path",
        "comparison_artifact_path",
      ],
      [
        "fact_model",
        "symbolic_method_bindings",
        "symbolic_certificate_binding",
      ],
    );
    const factModel =
      row.fact_model === undefined
        ? undefined
        : literal(
            row.fact_model,
            ["symbolic_rules_v2"] as const,
            `${itemLabel}.fact_model`,
          );
    return {
      key: key(row.key, `${itemLabel}.key`),
      ...(factModel ? { fact_model: factModel } : {}),
      interpretation: literal(
        row.interpretation,
        ["exact_target", "constraint"] as const,
        `${itemLabel}.interpretation`,
      ),
      source_paths: repositoryFiles(
        row.source_paths,
        `${itemLabel}.source_paths`,
      ),
      condition_keys: keys(row.condition_keys, `${itemLabel}.condition_keys`),
      claim_refs: strings(row.claim_refs, `${itemLabel}.claim_refs`),
      conformance_check_ref: key(
        row.conformance_check_ref,
        `${itemLabel}.conformance_check_ref`,
      ),
      conformance_assertion_ref: key(
        row.conformance_assertion_ref,
        `${itemLabel}.conformance_assertion_ref`,
      ),
      verification_method_bindings: parseVerificationMethodBindings(
        row.verification_method_bindings,
        `${itemLabel}.verification_method_bindings`,
      ),
      ...(row.symbolic_method_bindings === undefined
        ? {}
        : {
            symbolic_method_bindings: parseSymbolicMethodBindings(
              row.symbolic_method_bindings,
              `${itemLabel}.symbolic_method_bindings`,
            ),
          }),
      ...(row.symbolic_certificate_binding === undefined
        ? {}
        : {
            symbolic_certificate_binding: parseSymbolicCertificateBinding(
              row.symbolic_certificate_binding,
              `${itemLabel}.symbolic_certificate_binding`,
            ),
          }),
      actual_artifact_path: repositoryFile(
        row.actual_artifact_path,
        `${itemLabel}.actual_artifact_path`,
      ),
      comparison_artifact_path: repositoryFile(
        row.comparison_artifact_path,
        `${itemLabel}.comparison_artifact_path`,
      ),
    };
  });
}

function parseSymbolicMethodBindings(value: unknown, label: string) {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "method",
      "assertion_ref",
      "artifact_path",
      "observation_path",
      "rule_expectations",
    ]);
    return {
      method: literal(
        row.method,
        DESIGN_RESOURCE_VERIFICATION_METHODS,
        `${itemLabel}.method`,
      ),
      assertion_ref: key(row.assertion_ref, `${itemLabel}.assertion_ref`),
      artifact_path: repositoryFile(
        row.artifact_path,
        `${itemLabel}.artifact_path`,
      ),
      observation_path: repositoryFile(
        row.observation_path,
        `${itemLabel}.observation_path`,
      ),
      rule_expectations: array(
        row.rule_expectations,
        `${itemLabel}.rule_expectations`,
      ).map((expectation, expectationIndex) =>
        parseSymbolicRuleExpectation(
          expectation,
          `${itemLabel}.rule_expectations[${expectationIndex}]`,
        ),
      ),
    };
  });
}

function parseSymbolicRuleExpectation(value: unknown, label: string) {
  const row = object(value, label, [
    "obligation_ref",
    "fact_rule_ref",
    "region_sha256",
    "subject_or_relation_ref",
    "property_ref",
    "population_ref",
    "quantifier",
    "observation_sensitivity",
    "expected",
    "proof_surface",
    "observation_boundary",
    "comparison",
    "oracle",
    "environment",
    "protected_value_policy",
    "completion_effect",
  ]);
  const comparison = object(row.comparison, `${label}.comparison`, [
    "comparator",
    "mode",
    "parameters",
    "tolerance",
    "mask",
  ]);
  const comparator = string(
    comparison.comparator,
    `${label}.comparison.comparator`,
  );
  if (
    !DESIGN_RESOURCE_COMPARATORS.includes(
      comparator as (typeof DESIGN_RESOURCE_COMPARATORS)[number],
    ) &&
    !/^custom\.[a-z0-9][a-z0-9._-]*$/u.test(comparator)
  )
    fail(
      `${label}.comparison.comparator`,
      "must be a standard comparator or custom.*",
    );
  const oracle = object(row.oracle, `${label}.oracle`, [
    "key",
    "trust",
    "identity",
    "version",
    "sha256",
  ]);
  const environment = object(row.environment, `${label}.environment`, [
    "key",
    "identity",
    "definition",
  ]);
  const quantifier = object(row.quantifier, `${label}.quantifier`, [
    "kind",
    "minimum",
    "maximum",
  ]);
  return {
    obligation_ref: designFactRef(
      row.obligation_ref,
      `${label}.obligation_ref`,
    ),
    fact_rule_ref: designFactRef(row.fact_rule_ref, `${label}.fact_rule_ref`),
    region_sha256: digest(row.region_sha256, `${label}.region_sha256`),
    subject_or_relation_ref: designFactRef(
      row.subject_or_relation_ref,
      `${label}.subject_or_relation_ref`,
    ),
    property_ref: designFactRef(row.property_ref, `${label}.property_ref`),
    population_ref: nullable(row.population_ref, (entry) =>
      designFactRef(entry, `${label}.population_ref`),
    ),
    quantifier: {
      kind: literal(
        quantifier.kind,
        [
          "one",
          "all",
          "any",
          "none",
          "exactly",
          "at_least",
          "at_most",
          "range",
        ] as const,
        `${label}.quantifier.kind`,
      ),
      minimum: nullable(quantifier.minimum, (entry) =>
        nonnegativeInteger(entry, `${label}.quantifier.minimum`),
      ),
      maximum: nullable(quantifier.maximum, (entry) =>
        nonnegativeInteger(entry, `${label}.quantifier.maximum`),
      ),
    },
    observation_sensitivity: literal(
      row.observation_sensitivity,
      ["plain", "protected"] as const,
      `${label}.observation_sensitivity`,
    ),
    expected: parseDesignResourceLocatedDigest(
      row.expected,
      `${label}.expected`,
    ),
    proof_surface: string(row.proof_surface, `${label}.proof_surface`),
    observation_boundary: string(
      row.observation_boundary,
      `${label}.observation_boundary`,
    ),
    comparison: {
      comparator,
      mode: literal(
        comparison.mode,
        ["exact", "tolerance"] as const,
        `${label}.comparison.mode`,
      ),
      parameters: parseDesignResourceLocatedDigest(
        comparison.parameters,
        `${label}.comparison.parameters`,
      ),
      tolerance: nullable(comparison.tolerance, (entry) =>
        parseDesignResourceLocatedDigest(
          entry,
          `${label}.comparison.tolerance`,
        ),
      ),
      mask: nullable(comparison.mask, (entry) =>
        parseDesignResourceLocatedDigest(entry, `${label}.comparison.mask`),
      ),
    },
    oracle: {
      key: designFactRef(oracle.key, `${label}.oracle.key`),
      trust: literal(
        oracle.trust,
        ["frozen_executable", "named_external_tcb"] as const,
        `${label}.oracle.trust`,
      ),
      identity: string(oracle.identity, `${label}.oracle.identity`),
      version: string(oracle.version, `${label}.oracle.version`),
      sha256: nullable(oracle.sha256, (entry) =>
        digest(entry, `${label}.oracle.sha256`),
      ),
    },
    environment: {
      key: designFactRef(environment.key, `${label}.environment.key`),
      identity: string(environment.identity, `${label}.environment.identity`),
      definition: parseDesignResourceLocatedDigest(
        environment.definition,
        `${label}.environment.definition`,
      ),
    },
    protected_value_policy: string(
      row.protected_value_policy,
      `${label}.protected_value_policy`,
    ),
    completion_effect: string(
      row.completion_effect,
      `${label}.completion_effect`,
    ),
  };
}

function parseSymbolicCertificateBinding(value: unknown, label: string) {
  const row = object(value, label, [
    "assertion_ref",
    "artifact_path",
    "expectations",
    "metrics",
  ]);
  const metrics = object(row.metrics, `${label}.metrics`, [
    "semantic_obligations",
    "certificate_obligations",
    "certificate_covered_omitted_axes",
    "certificate_covered_dependency_edges",
    "canonical_dag_nodes",
    "canonical_partition_edges",
    "canonical_bytes",
    "theoretical_ground_cardinality",
  ]);
  return {
    assertion_ref: key(row.assertion_ref, `${label}.assertion_ref`),
    artifact_path: repositoryFile(row.artifact_path, `${label}.artifact_path`),
    expectations: array(row.expectations, `${label}.expectations`).map(
      (item, index) => {
        const itemLabel = `${label}.expectations[${index}]`;
        const expectation = object(item, itemLabel, [
          "certificate_ref",
          "fact_rule_refs",
          "omitted_axis_refs",
          "dependency_edge_refs",
          "canonical_rule_dag_sha256",
        ]);
        return {
          certificate_ref: designFactRef(
            expectation.certificate_ref,
            `${itemLabel}.certificate_ref`,
          ),
          fact_rule_refs: designFactRefs(
            expectation.fact_rule_refs,
            `${itemLabel}.fact_rule_refs`,
          ),
          omitted_axis_refs: designFactRefs(
            expectation.omitted_axis_refs,
            `${itemLabel}.omitted_axis_refs`,
          ),
          dependency_edge_refs: designFactRefs(
            expectation.dependency_edge_refs,
            `${itemLabel}.dependency_edge_refs`,
          ),
          canonical_rule_dag_sha256: digest(
            expectation.canonical_rule_dag_sha256,
            `${itemLabel}.canonical_rule_dag_sha256`,
          ),
        };
      },
    ),
    metrics: {
      semantic_obligations: nonnegativeInteger(
        metrics.semantic_obligations,
        `${label}.metrics.semantic_obligations`,
      ),
      certificate_obligations: nonnegativeInteger(
        metrics.certificate_obligations,
        `${label}.metrics.certificate_obligations`,
      ),
      certificate_covered_omitted_axes: nonnegativeInteger(
        metrics.certificate_covered_omitted_axes,
        `${label}.metrics.certificate_covered_omitted_axes`,
      ),
      certificate_covered_dependency_edges: nonnegativeInteger(
        metrics.certificate_covered_dependency_edges,
        `${label}.metrics.certificate_covered_dependency_edges`,
      ),
      canonical_dag_nodes: nonnegativeInteger(
        metrics.canonical_dag_nodes,
        `${label}.metrics.canonical_dag_nodes`,
      ),
      canonical_partition_edges: nonnegativeInteger(
        metrics.canonical_partition_edges,
        `${label}.metrics.canonical_partition_edges`,
      ),
      canonical_bytes: nonnegativeInteger(
        metrics.canonical_bytes,
        `${label}.metrics.canonical_bytes`,
      ),
      theoretical_ground_cardinality: string(
        metrics.theoretical_ground_cardinality,
        `${label}.metrics.theoretical_ground_cardinality`,
      ),
    },
  };
}

function parseAcceptanceBlockers(
  value: unknown,
  label: string,
): DeliveryDesignAcceptanceBlockerV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "status",
      "refs",
      "source_item_refs",
      "verification_methods",
      "required_capabilities",
      "rationale",
    ]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      status: literal(
        row.status,
        ["machine_claim", "external_confirmation"] as const,
        `${itemLabel}.status`,
      ),
      refs: strings(row.refs, `${itemLabel}.refs`),
      source_item_refs: strings(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      verification_methods: array(
        row.verification_methods,
        `${itemLabel}.verification_methods`,
      ).map((method, methodIndex) =>
        literal(
          method,
          DESIGN_RESOURCE_VERIFICATION_METHODS,
          `${itemLabel}.verification_methods[${methodIndex}]`,
        ),
      ),
      required_capabilities: array(
        row.required_capabilities,
        `${itemLabel}.required_capabilities`,
      ).map((capability, capabilityIndex) =>
        literal(
          capability,
          EXECUTION_TARGET_CAPABILITIES,
          `${itemLabel}.required_capabilities[${capabilityIndex}]`,
        ),
      ),
      rationale: string(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

function parseVerificationMethodBindings(value: unknown, label: string) {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "method",
      "assertion_ref",
      "evidence_artifacts",
    ]);
    return {
      method: literal(
        row.method,
        DESIGN_RESOURCE_VERIFICATION_METHODS,
        `${itemLabel}.method`,
      ),
      assertion_ref: key(row.assertion_ref, `${itemLabel}.assertion_ref`),
      evidence_artifacts: array(
        row.evidence_artifacts,
        `${itemLabel}.evidence_artifacts`,
      ).map((artifact, artifactIndex) => {
        const artifactLabel = `${itemLabel}.evidence_artifacts[${artifactIndex}]`;
        const entry = object(artifact, artifactLabel, [
          "condition_key",
          "path",
          "observation_path",
          "fact_refs",
          "fact_expectations",
        ]);
        return {
          condition_key: key(
            entry.condition_key,
            `${artifactLabel}.condition_key`,
          ),
          path: repositoryFile(entry.path, `${artifactLabel}.path`),
          observation_path: repositoryFile(
            entry.observation_path,
            `${artifactLabel}.observation_path`,
          ),
          fact_refs: designFactRefs(
            entry.fact_refs,
            `${artifactLabel}.fact_refs`,
          ),
          fact_expectations: parseDesignFactExpectations(
            entry.fact_expectations,
            `${artifactLabel}.fact_expectations`,
          ),
        };
      }),
    };
  });
}

function parseDesignFactExpectations(value: unknown, label: string) {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "fact_ref",
      "subject_ref",
      "variation_ref",
      "property_ref",
      "observation_sensitivity",
      "expected",
      "comparison",
      "oracle",
      "environment",
    ]);
    const comparison = object(row.comparison, `${itemLabel}.comparison`, [
      "comparator",
      "mode",
      "parameters",
      "tolerance",
      "mask",
    ]);
    const comparator = string(
      comparison.comparator,
      `${itemLabel}.comparison.comparator`,
    );
    if (
      !DESIGN_RESOURCE_COMPARATORS.includes(
        comparator as (typeof DESIGN_RESOURCE_COMPARATORS)[number],
      ) &&
      !/^custom\.[a-z0-9][a-z0-9._-]*$/u.test(comparator)
    )
      fail(
        `${itemLabel}.comparison.comparator`,
        "must be a standard comparator or custom.*",
      );
    const oracle = object(row.oracle, `${itemLabel}.oracle`, [
      "key",
      "trust",
      "identity",
      "version",
      "sha256",
    ]);
    const environment = object(row.environment, `${itemLabel}.environment`, [
      "key",
      "identity",
      "definition",
    ]);
    return {
      fact_ref: designFactRef(row.fact_ref, `${itemLabel}.fact_ref`),
      subject_ref: designFactRef(row.subject_ref, `${itemLabel}.subject_ref`),
      variation_ref: designFactRef(
        row.variation_ref,
        `${itemLabel}.variation_ref`,
      ),
      property_ref: designFactRef(
        row.property_ref,
        `${itemLabel}.property_ref`,
      ),
      observation_sensitivity: literal(
        row.observation_sensitivity,
        ["plain", "protected"] as const,
        `${itemLabel}.observation_sensitivity`,
      ),
      expected: parseDesignResourceLocatedDigest(
        row.expected,
        `${itemLabel}.expected`,
      ),
      comparison: {
        comparator,
        mode: literal(
          comparison.mode,
          ["exact", "tolerance"] as const,
          `${itemLabel}.comparison.mode`,
        ),
        parameters: parseDesignResourceLocatedDigest(
          comparison.parameters,
          `${itemLabel}.comparison.parameters`,
        ),
        tolerance: nullable(comparison.tolerance, (entry) =>
          parseDesignResourceLocatedDigest(
            entry,
            `${itemLabel}.comparison.tolerance`,
          ),
        ),
        mask: nullable(comparison.mask, (entry) =>
          parseDesignResourceLocatedDigest(
            entry,
            `${itemLabel}.comparison.mask`,
          ),
        ),
      },
      oracle: {
        key: designFactRef(oracle.key, `${itemLabel}.oracle.key`),
        trust: literal(
          oracle.trust,
          ["frozen_executable", "named_external_tcb"] as const,
          `${itemLabel}.oracle.trust`,
        ),
        identity: string(oracle.identity, `${itemLabel}.oracle.identity`),
        version: string(oracle.version, `${itemLabel}.oracle.version`),
        sha256: nullable(oracle.sha256, (entry) =>
          digest(entry, `${itemLabel}.oracle.sha256`),
        ),
      },
      environment: {
        key: designFactRef(environment.key, `${itemLabel}.environment.key`),
        identity: string(
          environment.identity,
          `${itemLabel}.environment.identity`,
        ),
        definition: parseDesignResourceLocatedDigest(
          environment.definition,
          `${itemLabel}.environment.definition`,
        ),
      },
    };
  });
}

function keys(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    key(item, `${label}[${index}]`),
  );
}

function designFactRefs(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const result = string(item, itemLabel);
    if (!/^[a-z0-9][a-z0-9._-]*$/u.test(result))
      fail(itemLabel, "must match ^[a-z0-9][a-z0-9._-]*$");
    return result;
  });
}

function designFactRef(value: unknown, label: string): string {
  const result = string(value, label);
  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(result))
    fail(label, "must match ^[a-z0-9][a-z0-9._-]*$");
  return result;
}

function digest(value: unknown, label: string): string {
  const result = string(value, label);
  if (!/^[a-f0-9]{64}$/u.test(result))
    fail(label, "must be a lowercase SHA-256");
  return result;
}
