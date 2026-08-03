import type { EvidenceCapabilityRecordV2 } from "./long-task-delivery-types.js";
import { DESIGN_RESOURCE_VERIFICATION_METHODS } from "./design-resource-handoff-types.js";
import { DESIGN_RESOURCE_COMPARATORS } from "./design-resource-fact-manifest-types.js";
import { DESIGN_RESOURCE_LOCATOR_KINDS } from "./design-resource-handoff-types.js";

export function decodeEvidenceCapabilityRecords(
  value: unknown,
): EvidenceCapabilityRecordV2[] {
  if (!Array.isArray(value)) throw invalidRecord("must_be_array");
  return value.map((item, index) => decodeRecord(item, index));
}

function decodeRecord(
  value: unknown,
  index: number,
): EvidenceCapabilityRecordV2 {
  const label = `evidence_records[${index}]`;
  const row = record(value, label);
  const assertionKey = key(row.assertion_key, `${label}.assertion_key`);
  const capability = nonEmpty(row.capability, `${label}.capability`);
  const base = { assertion_key: assertionKey };
  switch (capability) {
    case "interaction_trace":
      exact(row, label, [
        "assertion_key",
        "capability",
        "target_ref",
        "given_keys",
        "action_keys",
      ]);
      return {
        ...base,
        capability,
        target_ref: key(row.target_ref, `${label}.target_ref`),
        given_keys: keys(row.given_keys, `${label}.given_keys`),
        action_keys: keys(row.action_keys, `${label}.action_keys`),
      };
    case "state_delta":
      exact(row, label, [
        "assertion_key",
        "capability",
        "before_sha256",
        "after_sha256",
        "changed_fields",
      ]);
      return {
        ...base,
        capability,
        before_sha256: sha(row.before_sha256, `${label}.before_sha256`),
        after_sha256: sha(row.after_sha256, `${label}.after_sha256`),
        changed_fields: strings(row.changed_fields, `${label}.changed_fields`),
      };
    case "cross_surface_consistency":
      exact(row, label, ["assertion_key", "capability", "surfaces"]);
      return {
        ...base,
        capability,
        surfaces: array(row.surfaces, `${label}.surfaces`).map(
          (item, surfaceIndex) => {
            const surfaceLabel = `${label}.surfaces[${surfaceIndex}]`;
            const surface = record(item, surfaceLabel);
            exact(surface, surfaceLabel, [
              "surface_ref",
              "target_ref",
              "state_sha256",
            ]);
            return {
              surface_ref: key(
                surface.surface_ref,
                `${surfaceLabel}.surface_ref`,
              ),
              target_ref: key(surface.target_ref, `${surfaceLabel}.target_ref`),
              state_sha256: sha(
                surface.state_sha256,
                `${surfaceLabel}.state_sha256`,
              ),
            };
          },
        ),
      };
    case "durable_readback":
      exact(row, label, [
        "assertion_key",
        "capability",
        "write_session_id",
        "read_session_id",
        "written_sha256",
        "read_sha256",
      ]);
      return {
        ...base,
        capability,
        write_session_id: nonEmpty(
          row.write_session_id,
          `${label}.write_session_id`,
        ),
        read_session_id: nonEmpty(
          row.read_session_id,
          `${label}.read_session_id`,
        ),
        written_sha256: sha(row.written_sha256, `${label}.written_sha256`),
        read_sha256: sha(row.read_sha256, `${label}.read_sha256`),
      };
    case "boundary_invocation":
      exact(row, label, [
        "assertion_key",
        "capability",
        "boundary",
        "invocation_id",
        "request_sha256",
        "observer_target_ref",
      ]);
      return {
        ...base,
        capability,
        boundary: nonEmpty(row.boundary, `${label}.boundary`),
        invocation_id: nonEmpty(row.invocation_id, `${label}.invocation_id`),
        request_sha256: sha(row.request_sha256, `${label}.request_sha256`),
        observer_target_ref: key(
          row.observer_target_ref,
          `${label}.observer_target_ref`,
        ),
      };
    case "external_side_effect":
      exact(row, label, [
        "assertion_key",
        "capability",
        "boundary",
        "effect_id",
        "effect_sha256",
        "observer_target_ref",
      ]);
      return {
        ...base,
        capability,
        boundary: nonEmpty(row.boundary, `${label}.boundary`),
        effect_id: nonEmpty(row.effect_id, `${label}.effect_id`),
        effect_sha256: sha(row.effect_sha256, `${label}.effect_sha256`),
        observer_target_ref: key(
          row.observer_target_ref,
          `${label}.observer_target_ref`,
        ),
      };
    case "failure_injection":
      exact(row, label, [
        "assertion_key",
        "capability",
        "fault",
        "failure_observed",
        "recovery_state_sha256",
      ]);
      if (row.failure_observed !== true)
        throw invalidRecord(`${label}.failure_observed`);
      return {
        ...base,
        capability,
        fault: nonEmpty(row.fault, `${label}.fault`),
        failure_observed: true,
        recovery_state_sha256: sha(
          row.recovery_state_sha256,
          `${label}.recovery_state_sha256`,
        ),
      };
    case "visual_render":
      exact(row, label, [
        "assertion_key",
        "capability",
        "artifact_path",
        "artifact_sha256",
      ]);
      return {
        ...base,
        capability,
        artifact_path: nonEmpty(row.artifact_path, `${label}.artifact_path`),
        artifact_sha256: sha(row.artifact_sha256, `${label}.artifact_sha256`),
      };
    case "design_conformance":
      exact(row, label, [
        "assertion_key",
        "capability",
        "design_target_ref",
        "target_ref",
        "condition_keys",
        "actual_artifact_path",
        "comparison_artifact_path",
      ]);
      return {
        ...base,
        capability,
        design_target_ref: key(
          row.design_target_ref,
          `${label}.design_target_ref`,
        ),
        target_ref: key(row.target_ref, `${label}.target_ref`),
        condition_keys: keys(row.condition_keys, `${label}.condition_keys`),
        actual_artifact_path: nonEmpty(
          row.actual_artifact_path,
          `${label}.actual_artifact_path`,
        ),
        comparison_artifact_path: nonEmpty(
          row.comparison_artifact_path,
          `${label}.comparison_artifact_path`,
        ),
      };
    case "target_runtime":
      exact(row, label, [
        "assertion_key",
        "capability",
        "target_ref",
        "root_entrypoint",
        "session_id",
        "cold_start",
      ]);
      if (typeof row.cold_start !== "boolean")
        throw invalidRecord(`${label}.cold_start`);
      return {
        ...base,
        capability,
        target_ref: key(row.target_ref, `${label}.target_ref`),
        root_entrypoint: nonEmpty(
          row.root_entrypoint,
          `${label}.root_entrypoint`,
        ),
        session_id: nonEmpty(row.session_id, `${label}.session_id`),
        cold_start: row.cold_start,
      };
    case "design_method":
      return Object.hasOwn(row, "fact_model")
        ? decodeSymbolicDesignMethodEvidence(row, label, base)
        : decodeGroundDesignMethodEvidence(row, label, base);
    case "design_symbolic_certificate":
      return decodeDesignSymbolicCertificateEvidence(row, label, base);
    case "semantic_fact":
      return decodeSemanticFactEvidence(row, label, base);
    case "input_variation":
      return decodeInputVariationEvidence(row, label, base);
    default:
      throw invalidRecord(`${label}.capability_unsupported:${capability}`);
  }
}

function decodeGroundDesignMethodEvidence(
  row: Record<string, unknown>,
  label: string,
  base: { assertion_key: string },
): Extract<EvidenceCapabilityRecordV2, { capability: "design_method" }> & {
  cells: unknown[];
} {
  exact(row, label, [
    "assertion_key",
    "capability",
    "design_target_ref",
    "target_ref",
    "method",
    "cells",
  ]);
  return {
    ...base,
    capability: "design_method",
    design_target_ref: key(row.design_target_ref, `${label}.design_target_ref`),
    target_ref: key(row.target_ref, `${label}.target_ref`),
    method: literal(
      row.method,
      DESIGN_RESOURCE_VERIFICATION_METHODS,
      `${label}.method`,
    ),
    cells: array(row.cells, `${label}.cells`).map((item, cellIndex) => {
      const cellLabel = `${label}.cells[${cellIndex}]`;
      const cell = record(item, cellLabel);
      exact(cell, cellLabel, [
        "condition_key",
        "artifact_path",
        "observation_artifact_path",
        "fact_refs",
        "fact_results",
      ]);
      return {
        condition_key: key(cell.condition_key, `${cellLabel}.condition_key`),
        artifact_path: nonEmpty(
          cell.artifact_path,
          `${cellLabel}.artifact_path`,
        ),
        observation_artifact_path: nonEmpty(
          cell.observation_artifact_path,
          `${cellLabel}.observation_artifact_path`,
        ),
        fact_refs: designFactRefs(cell.fact_refs, `${cellLabel}.fact_refs`),
        fact_results: array(cell.fact_results, `${cellLabel}.fact_results`).map(
          (result, resultIndex) =>
            decodeDesignFactResult(
              result,
              `${cellLabel}.fact_results[${resultIndex}]`,
            ),
        ),
      };
    }),
  };
}

function decodeSymbolicDesignMethodEvidence(
  row: Record<string, unknown>,
  label: string,
  base: { assertion_key: string },
): Extract<EvidenceCapabilityRecordV2, { capability: "design_method" }> & {
  fact_model: "symbolic_rules_v2";
} {
  exact(row, label, [
    "assertion_key",
    "capability",
    "fact_model",
    "design_target_ref",
    "target_ref",
    "method",
    "artifact_path",
    "observation_artifact_path",
    "rule_results",
  ]);
  return {
    ...base,
    capability: "design_method",
    fact_model: literal(
      row.fact_model,
      ["symbolic_rules_v2"] as const,
      `${label}.fact_model`,
    ),
    design_target_ref: key(row.design_target_ref, `${label}.design_target_ref`),
    target_ref: key(row.target_ref, `${label}.target_ref`),
    method: literal(
      row.method,
      DESIGN_RESOURCE_VERIFICATION_METHODS,
      `${label}.method`,
    ),
    artifact_path: nonEmpty(row.artifact_path, `${label}.artifact_path`),
    observation_artifact_path: nonEmpty(
      row.observation_artifact_path,
      `${label}.observation_artifact_path`,
    ),
    rule_results: array(row.rule_results, `${label}.rule_results`).map(
      (item, index) =>
        decodeDesignSymbolicRuleResult(item, `${label}.rule_results[${index}]`),
    ),
  };
}

function decodeDesignSymbolicRuleResult(value: unknown, label: string) {
  const row = record(value, label);
  exact(row, label, [
    "obligation_ref",
    "fact_rule_ref",
    "region_sha256",
    "subject_or_relation_ref",
    "property_ref",
    "population_ref",
    "quantifier",
    "actual_observation",
    "actual_environment",
    "observation_sensitivity",
    "expected",
    "proof_surface",
    "observation_boundary",
    "comparison",
    "verdict",
    "oracle",
    "environment",
    "protected_value_policy",
    "completion_effect",
  ]);
  const decoded = decodeDesignFactResult(
    {
      fact_ref: row.fact_rule_ref,
      subject_ref: row.subject_or_relation_ref,
      variation_ref: "symbolic",
      property_ref: row.property_ref,
      actual_observation: row.actual_observation,
      actual_environment: row.actual_environment,
      expected: row.expected,
      comparison: row.comparison,
      verdict: row.verdict,
      oracle: row.oracle,
      environment: row.environment,
    },
    label,
  );
  const quantifier = record(row.quantifier, `${label}.quantifier`);
  exact(quantifier, `${label}.quantifier`, ["kind", "minimum", "maximum"]);
  return {
    obligation_ref: designFactRef(
      row.obligation_ref,
      `${label}.obligation_ref`,
    ),
    fact_rule_ref: decoded.fact_ref,
    region_sha256: sha(row.region_sha256, `${label}.region_sha256`),
    subject_or_relation_ref: decoded.subject_ref,
    property_ref: decoded.property_ref,
    population_ref: nullable(row.population_ref, (item) =>
      designFactRef(item, `${label}.population_ref`),
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
      minimum: nullable(quantifier.minimum, (item) =>
        nonnegativeInteger(item, `${label}.quantifier.minimum`),
      ),
      maximum: nullable(quantifier.maximum, (item) =>
        nonnegativeInteger(item, `${label}.quantifier.maximum`),
      ),
    },
    actual_observation: decoded.actual_observation,
    actual_environment: decoded.actual_environment,
    observation_sensitivity: literal(
      row.observation_sensitivity,
      ["plain", "protected"] as const,
      `${label}.observation_sensitivity`,
    ),
    expected: decoded.expected,
    proof_surface: nonEmpty(row.proof_surface, `${label}.proof_surface`),
    observation_boundary: nonEmpty(
      row.observation_boundary,
      `${label}.observation_boundary`,
    ),
    comparison: decoded.comparison,
    verdict: decoded.verdict,
    oracle: decoded.oracle,
    environment: decoded.environment,
    protected_value_policy: nonEmpty(
      row.protected_value_policy,
      `${label}.protected_value_policy`,
    ),
    completion_effect: nonEmpty(
      row.completion_effect,
      `${label}.completion_effect`,
    ),
  };
}

function decodeDesignSymbolicCertificateEvidence(
  row: Record<string, unknown>,
  label: string,
  base: { assertion_key: string },
): Extract<
  EvidenceCapabilityRecordV2,
  { capability: "design_symbolic_certificate" }
> {
  exact(row, label, [
    "assertion_key",
    "capability",
    "design_target_ref",
    "target_ref",
    "artifact_path",
    "artifact_sha256",
    "metrics",
    "certificate_results",
  ]);
  const metrics = record(row.metrics, `${label}.metrics`);
  exact(metrics, `${label}.metrics`, [
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
    ...base,
    capability: "design_symbolic_certificate",
    design_target_ref: key(row.design_target_ref, `${label}.design_target_ref`),
    target_ref: key(row.target_ref, `${label}.target_ref`),
    artifact_path: nonEmpty(row.artifact_path, `${label}.artifact_path`),
    artifact_sha256: sha(row.artifact_sha256, `${label}.artifact_sha256`),
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
      theoretical_ground_cardinality: decimalCardinality(
        metrics.theoretical_ground_cardinality,
        `${label}.metrics.theoretical_ground_cardinality`,
      ),
    },
    certificate_results: array(
      row.certificate_results,
      `${label}.certificate_results`,
    ).map((item, index) => {
      const itemLabel = `${label}.certificate_results[${index}]`;
      const result = record(item, itemLabel);
      exact(result, itemLabel, [
        "certificate_ref",
        "fact_rule_refs",
        "omitted_axis_refs",
        "dependency_edge_refs",
        "canonical_rule_dag_sha256",
        "recomputed",
        "verdict",
        ...[
          "source_noninterference_proof_sha256",
          "production_noninterference_proof_sha256",
        ].filter((field) => Object.hasOwn(result, field)),
      ]);
      if (result.recomputed !== true)
        throw invalidRecord(`${itemLabel}.recomputed`);
      return {
        certificate_ref: designFactRef(
          result.certificate_ref,
          `${itemLabel}.certificate_ref`,
        ),
        fact_rule_refs: designFactRefs(
          result.fact_rule_refs,
          `${itemLabel}.fact_rule_refs`,
        ),
        omitted_axis_refs: designFactRefs(
          result.omitted_axis_refs,
          `${itemLabel}.omitted_axis_refs`,
        ),
        dependency_edge_refs: designFactRefs(
          result.dependency_edge_refs,
          `${itemLabel}.dependency_edge_refs`,
        ),
        canonical_rule_dag_sha256: sha(
          result.canonical_rule_dag_sha256,
          `${itemLabel}.canonical_rule_dag_sha256`,
        ),
        ...(result.source_noninterference_proof_sha256 === undefined
          ? {}
          : {
              source_noninterference_proof_sha256: sha(
                result.source_noninterference_proof_sha256,
                `${itemLabel}.source_noninterference_proof_sha256`,
              ),
            }),
        ...(result.production_noninterference_proof_sha256 === undefined
          ? {}
          : {
              production_noninterference_proof_sha256: sha(
                result.production_noninterference_proof_sha256,
                `${itemLabel}.production_noninterference_proof_sha256`,
              ),
            }),
        recomputed: true,
        verdict: literal(
          result.verdict,
          ["passed", "failed"] as const,
          `${itemLabel}.verdict`,
        ),
      };
    }),
  };
}

function decodeInputVariationEvidence(
  row: Record<string, unknown>,
  label: string,
  base: { assertion_key: string },
): Extract<EvidenceCapabilityRecordV2, { capability: "input_variation" }> {
  exact(row, label, [
    "assertion_key",
    "capability",
    "cases",
    "failure_case_observed",
  ]);
  if (typeof row.failure_case_observed !== "boolean")
    throw invalidRecord(`${label}.failure_case_observed`);
  return {
    ...base,
    capability: "input_variation",
    cases: array(row.cases, `${label}.cases`).map((item, caseIndex) => {
      const caseLabel = `${label}.cases[${caseIndex}]`;
      const entry = record(item, caseLabel);
      exact(entry, caseLabel, ["input_sha256", "output_sha256"]);
      return {
        input_sha256: sha(entry.input_sha256, `${caseLabel}.input_sha256`),
        output_sha256: sha(entry.output_sha256, `${caseLabel}.output_sha256`),
      };
    }),
    failure_case_observed: row.failure_case_observed,
  };
}

function decodeSemanticFactEvidence(
  row: Record<string, unknown>,
  label: string,
  base: { assertion_key: string },
): Extract<EvidenceCapabilityRecordV2, { capability: "semantic_fact" }> {
  exactOptional(row, label, [
    "assertion_key",
    "capability",
    "manifest_ref",
    "manifest_sha256",
    "outcome_ref",
    "target_ref",
    "fact_ref",
    "proof_ref",
    "method",
    "subject_ref",
    "condition_ref",
    "property_ref",
    "actual_observation",
    "actual_environment",
    "expected",
    "comparison",
    "verdict",
    "oracle",
    "environment",
    "observer_results",
    ],
    [
      "fact_key",
      "fact_revision_digest",
      "obligation_key",
      "obligation_revision_digest",
    ],
  );
  const revisionFields = [
    "fact_key",
    "fact_revision_digest",
    "obligation_key",
    "obligation_revision_digest",
  ];
  const revisionFieldCount = revisionFields.filter((field) =>
    Object.hasOwn(row, field),
  ).length;
  if (revisionFieldCount !== 0 && revisionFieldCount !== revisionFields.length)
    throw invalidRecord(`${label}.revision_identity.shape`);
  const actual = record(row.actual_observation, `${label}.actual_observation`);
  exact(actual, `${label}.actual_observation`, [
    "artifact_path",
    "artifact_sha256",
    "locator",
    "value_sha256",
    "sensitivity",
    "redaction",
  ]);
  const actualEnvironment = record(
    row.actual_environment,
    `${label}.actual_environment`,
  );
  exact(actualEnvironment, `${label}.actual_environment`, [
    "artifact_path",
    "artifact_sha256",
    "locator",
    "value_sha256",
  ]);
  const comparison = record(row.comparison, `${label}.comparison`);
  exact(comparison, `${label}.comparison`, [
    "artifact_path",
    "artifact_sha256",
    "locator",
    "result_sha256",
    "comparator",
    "mode",
    "parameters",
    "tolerance",
    "mask",
    "passed",
  ]);
  if (typeof comparison.passed !== "boolean")
    throw invalidRecord(`${label}.comparison.passed`);
  const oracle = record(row.oracle, `${label}.oracle`);
  exact(oracle, `${label}.oracle`, [
    "key",
    "trust",
    "identity",
    "version",
    "sha256",
    "capabilities",
  ]);
  const environment = record(row.environment, `${label}.environment`);
  exact(environment, `${label}.environment`, ["key", "identity", "definition"]);
  return {
    ...base,
    capability: "semantic_fact",
    manifest_ref: semanticFactRef(row.manifest_ref, `${label}.manifest_ref`),
    manifest_sha256: sha(row.manifest_sha256, `${label}.manifest_sha256`),
    outcome_ref: semanticFactRef(row.outcome_ref, `${label}.outcome_ref`),
    target_ref: key(row.target_ref, `${label}.target_ref`),
    ...(revisionFieldCount
      ? {
          fact_key: semanticFactRef(row.fact_key, `${label}.fact_key`),
          fact_revision_digest: sha(
            row.fact_revision_digest,
            `${label}.fact_revision_digest`,
          ),
          obligation_key: semanticFactRef(
            row.obligation_key,
            `${label}.obligation_key`,
          ),
          obligation_revision_digest: sha(
            row.obligation_revision_digest,
            `${label}.obligation_revision_digest`,
          ),
        }
      : {}),
    fact_ref: semanticFactRef(row.fact_ref, `${label}.fact_ref`),
    proof_ref: semanticFactRef(row.proof_ref, `${label}.proof_ref`),
    method: semanticFactRef(row.method, `${label}.method`),
    subject_ref: semanticFactRef(row.subject_ref, `${label}.subject_ref`),
    condition_ref: semanticFactRef(row.condition_ref, `${label}.condition_ref`),
    property_ref: semanticFactRef(row.property_ref, `${label}.property_ref`),
    actual_observation: {
      artifact_path: nonEmpty(
        actual.artifact_path,
        `${label}.actual_observation.artifact_path`,
      ),
      artifact_sha256: sha(
        actual.artifact_sha256,
        `${label}.actual_observation.artifact_sha256`,
      ),
      locator: decodeEvidenceLocator(
        actual.locator,
        `${label}.actual_observation.locator`,
      ),
      value_sha256: sha(
        actual.value_sha256,
        `${label}.actual_observation.value_sha256`,
      ),
      sensitivity: literal(
        actual.sensitivity,
        ["plain", "protected"] as const,
        `${label}.actual_observation.sensitivity`,
      ),
      redaction: nullable(actual.redaction, (value) => {
        const entry = record(value, `${label}.actual_observation.redaction`);
        exact(entry, `${label}.actual_observation.redaction`, [
          "policy_ref",
          "representation",
          "raw_persisted",
        ]);
        if (entry.raw_persisted !== false)
          throw invalidRecord(
            `${label}.actual_observation.redaction.raw_persisted`,
          );
        return {
          policy_ref: semanticFactRef(
            entry.policy_ref,
            `${label}.actual_observation.redaction.policy_ref`,
          ),
          representation: literal(
            entry.representation,
            ["digest_only", "redacted_structured"] as const,
            `${label}.actual_observation.redaction.representation`,
          ),
          raw_persisted: false as const,
        };
      }),
    },
    actual_environment: {
      artifact_path: nonEmpty(
        actualEnvironment.artifact_path,
        `${label}.actual_environment.artifact_path`,
      ),
      artifact_sha256: sha(
        actualEnvironment.artifact_sha256,
        `${label}.actual_environment.artifact_sha256`,
      ),
      locator: decodeEvidenceLocator(
        actualEnvironment.locator,
        `${label}.actual_environment.locator`,
      ),
      value_sha256: sha(
        actualEnvironment.value_sha256,
        `${label}.actual_environment.value_sha256`,
      ),
    },
    expected: decodeSemanticLocatedValue(row.expected, `${label}.expected`),
    comparison: {
      artifact_path: nonEmpty(
        comparison.artifact_path,
        `${label}.comparison.artifact_path`,
      ),
      artifact_sha256: sha(
        comparison.artifact_sha256,
        `${label}.comparison.artifact_sha256`,
      ),
      locator: decodeEvidenceLocator(
        comparison.locator,
        `${label}.comparison.locator`,
      ),
      result_sha256: sha(
        comparison.result_sha256,
        `${label}.comparison.result_sha256`,
      ),
      comparator: semanticFactRef(
        comparison.comparator,
        `${label}.comparison.comparator`,
      ),
      mode: literal(
        comparison.mode,
        ["exact", "tolerance"] as const,
        `${label}.comparison.mode`,
      ),
      parameters: decodeSemanticLocatedValue(
        comparison.parameters,
        `${label}.comparison.parameters`,
      ),
      tolerance: nullable(comparison.tolerance, (value) =>
        decodeSemanticLocatedValue(value, `${label}.comparison.tolerance`),
      ),
      mask: nullable(comparison.mask, (value) =>
        decodeSemanticLocatedValue(value, `${label}.comparison.mask`),
      ),
      passed: comparison.passed,
    },
    verdict: literal(
      row.verdict,
      ["passed", "failed"] as const,
      `${label}.verdict`,
    ),
    oracle: {
      key: semanticFactRef(oracle.key, `${label}.oracle.key`),
      trust: literal(
        oracle.trust,
        ["frozen_executable", "named_external_tcb"] as const,
        `${label}.oracle.trust`,
      ),
      identity: nonEmpty(oracle.identity, `${label}.oracle.identity`),
      version: nonEmpty(oracle.version, `${label}.oracle.version`),
      sha256: nullableSha(oracle.sha256, `${label}.oracle.sha256`),
      capabilities: semanticFactRefs(
        oracle.capabilities,
        `${label}.oracle.capabilities`,
      ),
    },
    environment: {
      key: semanticFactRef(environment.key, `${label}.environment.key`),
      identity: nonEmpty(environment.identity, `${label}.environment.identity`),
      definition: decodeSemanticLocatedValue(
        environment.definition,
        `${label}.environment.definition`,
      ),
    },
    observer_results: array(
      row.observer_results,
      `${label}.observer_results`,
    ).map((item, index) => {
      const itemLabel = `${label}.observer_results[${index}]`;
      const entry = record(item, itemLabel);
      exact(entry, itemLabel, [
        "target_ref",
        "artifact_path",
        "artifact_sha256",
        "locator",
        "value_sha256",
        "comparison_result_sha256",
        "passed",
      ]);
      if (typeof entry.passed !== "boolean")
        throw invalidRecord(`${itemLabel}.passed`);
      return {
        target_ref: key(entry.target_ref, `${itemLabel}.target_ref`),
        artifact_path: nonEmpty(
          entry.artifact_path,
          `${itemLabel}.artifact_path`,
        ),
        artifact_sha256: sha(
          entry.artifact_sha256,
          `${itemLabel}.artifact_sha256`,
        ),
        locator: decodeEvidenceLocator(entry.locator, `${itemLabel}.locator`),
        value_sha256: sha(entry.value_sha256, `${itemLabel}.value_sha256`),
        comparison_result_sha256: sha(
          entry.comparison_result_sha256,
          `${itemLabel}.comparison_result_sha256`,
        ),
        passed: entry.passed,
      };
    }),
  };
}

function decodeSemanticLocatedValue(value: unknown, label: string) {
  const row = record(value, label);
  const representation = literal(
    row.representation,
    ["inline", "located", "digest_only"] as const,
    `${label}.representation`,
  );
  exact(
    row,
    label,
    representation === "inline"
      ? ["representation", "locator", "sha256", "value"]
      : ["representation", "locator", "sha256"],
  );
  const locator = record(row.locator, `${label}.locator`);
  exact(locator, `${label}.locator`, ["material_ref", "kind", "value"]);
  return {
    representation,
    locator: {
      material_ref: semanticFactRef(
        locator.material_ref,
        `${label}.locator.material_ref`,
      ),
      kind: literal(
        locator.kind,
        [
          "source_item",
          "manifest_pointer",
          "json_pointer",
          "yaml_pointer",
          "whole_resource",
          "schema_pointer",
          "api_operation",
          "code_symbol",
          "custom",
        ] as const,
        `${label}.locator.kind`,
      ),
      value: nonEmpty(locator.value, `${label}.locator.value`),
    },
    sha256: sha(row.sha256, `${label}.sha256`),
    ...(representation === "inline" ? { value: row.value } : {}),
  };
}

function decodeDesignFactResult(value: unknown, label: string) {
  const row = record(value, label);
  exact(row, label, [
    "fact_ref",
    "subject_ref",
    "variation_ref",
    "property_ref",
    "actual_observation",
    "actual_environment",
    "expected",
    "comparison",
    "verdict",
    "oracle",
    "environment",
  ]);
  const actual = record(row.actual_observation, `${label}.actual_observation`);
  exact(actual, `${label}.actual_observation`, [
    "artifact_path",
    "artifact_sha256",
    "locator",
    "value_sha256",
    "sensitivity",
    "redaction",
  ]);
  const expected = decodeLocatedDigest(row.expected, `${label}.expected`);
  const actualEnvironment = record(
    row.actual_environment,
    `${label}.actual_environment`,
  );
  exact(actualEnvironment, `${label}.actual_environment`, [
    "artifact_path",
    "artifact_sha256",
    "locator",
    "value_sha256",
  ]);
  const comparison = record(row.comparison, `${label}.comparison`);
  exact(comparison, `${label}.comparison`, [
    "artifact_path",
    "artifact_sha256",
    "locator",
    "result_sha256",
    "comparator",
    "mode",
    "parameters",
    "tolerance",
    "mask",
    "passed",
  ]);
  const comparator = nonEmpty(
    comparison.comparator,
    `${label}.comparison.comparator`,
  );
  if (
    !DESIGN_RESOURCE_COMPARATORS.includes(
      comparator as (typeof DESIGN_RESOURCE_COMPARATORS)[number],
    ) &&
    !/^custom\.[a-z0-9][a-z0-9._-]*$/u.test(comparator)
  )
    throw invalidRecord(`${label}.comparison.comparator`);
  if (typeof comparison.passed !== "boolean")
    throw invalidRecord(`${label}.comparison.passed`);
  const oracle = record(row.oracle, `${label}.oracle`);
  exact(oracle, `${label}.oracle`, [
    "key",
    "trust",
    "identity",
    "version",
    "sha256",
  ]);
  const environment = record(row.environment, `${label}.environment`);
  exact(environment, `${label}.environment`, ["key", "identity", "definition"]);
  return {
    fact_ref: designFactRef(row.fact_ref, `${label}.fact_ref`),
    subject_ref: designFactRef(row.subject_ref, `${label}.subject_ref`),
    variation_ref: designFactRef(row.variation_ref, `${label}.variation_ref`),
    property_ref: designFactRef(row.property_ref, `${label}.property_ref`),
    actual_observation: {
      artifact_path: nonEmpty(
        actual.artifact_path,
        `${label}.actual_observation.artifact_path`,
      ),
      artifact_sha256: sha(
        actual.artifact_sha256,
        `${label}.actual_observation.artifact_sha256`,
      ),
      locator: decodeEvidenceLocator(
        actual.locator,
        `${label}.actual_observation.locator`,
      ),
      value_sha256: sha(
        actual.value_sha256,
        `${label}.actual_observation.value_sha256`,
      ),
      sensitivity: literal(
        actual.sensitivity,
        ["plain", "protected"] as const,
        `${label}.actual_observation.sensitivity`,
      ),
      redaction: nullable(actual.redaction, (value) => {
        const redaction = record(
          value,
          `${label}.actual_observation.redaction`,
        );
        exact(redaction, `${label}.actual_observation.redaction`, [
          "policy_ref",
          "representation",
          "raw_persisted",
        ]);
        if (redaction.raw_persisted !== false)
          throw invalidRecord(
            `${label}.actual_observation.redaction.raw_persisted`,
          );
        return {
          policy_ref: designFactRef(
            redaction.policy_ref,
            `${label}.actual_observation.redaction.policy_ref`,
          ),
          representation: literal(
            redaction.representation,
            ["digest_only", "redacted_structured"] as const,
            `${label}.actual_observation.redaction.representation`,
          ),
          raw_persisted: false as const,
        };
      }),
    },
    actual_environment: {
      artifact_path: nonEmpty(
        actualEnvironment.artifact_path,
        `${label}.actual_environment.artifact_path`,
      ),
      artifact_sha256: sha(
        actualEnvironment.artifact_sha256,
        `${label}.actual_environment.artifact_sha256`,
      ),
      locator: decodeEvidenceLocator(
        actualEnvironment.locator,
        `${label}.actual_environment.locator`,
      ),
      value_sha256: sha(
        actualEnvironment.value_sha256,
        `${label}.actual_environment.value_sha256`,
      ),
    },
    expected,
    comparison: {
      artifact_path: nonEmpty(
        comparison.artifact_path,
        `${label}.comparison.artifact_path`,
      ),
      artifact_sha256: sha(
        comparison.artifact_sha256,
        `${label}.comparison.artifact_sha256`,
      ),
      locator: decodeEvidenceLocator(
        comparison.locator,
        `${label}.comparison.locator`,
      ),
      result_sha256: sha(
        comparison.result_sha256,
        `${label}.comparison.result_sha256`,
      ),
      comparator,
      mode: literal(
        comparison.mode,
        ["exact", "tolerance"] as const,
        `${label}.comparison.mode`,
      ),
      parameters: decodeLocatedDigest(
        comparison.parameters,
        `${label}.comparison.parameters`,
      ),
      tolerance: nullable(comparison.tolerance, (value) =>
        decodeLocatedDigest(value, `${label}.comparison.tolerance`),
      ),
      mask: nullable(comparison.mask, (value) =>
        decodeLocatedDigest(value, `${label}.comparison.mask`),
      ),
      passed: comparison.passed,
    },
    verdict: literal(
      row.verdict,
      ["passed", "failed"] as const,
      `${label}.verdict`,
    ),
    oracle: {
      key: designFactRef(oracle.key, `${label}.oracle.key`),
      trust: literal(
        oracle.trust,
        ["frozen_executable", "named_external_tcb"] as const,
        `${label}.oracle.trust`,
      ),
      identity: nonEmpty(oracle.identity, `${label}.oracle.identity`),
      version: nonEmpty(oracle.version, `${label}.oracle.version`),
      sha256: nullableSha(oracle.sha256, `${label}.oracle.sha256`),
    },
    environment: {
      key: designFactRef(environment.key, `${label}.environment.key`),
      identity: nonEmpty(environment.identity, `${label}.environment.identity`),
      definition: decodeLocatedDigest(
        environment.definition,
        `${label}.environment.definition`,
      ),
    },
  };
}

export function decodeDesignFactResults(value: unknown, label: string) {
  return array(value, label).map((item, index) =>
    decodeDesignFactResult(item, `${label}[${index}]`),
  );
}

function decodeLocatedDigest(value: unknown, label: string) {
  const row = record(value, label);
  exact(row, label, ["locator", "sha256"]);
  const locator = record(row.locator, `${label}.locator`);
  exact(locator, `${label}.locator`, ["resource_ref", "kind", "value"]);
  return {
    locator: {
      resource_ref: designFactRef(
        locator.resource_ref,
        `${label}.locator.resource_ref`,
      ),
      kind: literal(
        locator.kind,
        DESIGN_RESOURCE_LOCATOR_KINDS,
        `${label}.locator.kind`,
      ),
      value: nonEmpty(locator.value, `${label}.locator.value`),
    },
    sha256: sha(row.sha256, `${label}.sha256`),
  };
}

function decodeEvidenceLocator(value: unknown, label: string) {
  const row = record(value, label);
  exact(row, label, ["kind", "value"]);
  return {
    kind: literal(
      row.kind,
      [
        "json_pointer",
        "image_region",
        "semantic_node",
        "trace_event",
        "timeline_sample",
        "asset_ref",
        "custom",
      ] as const,
      `${label}.kind`,
    ),
    value: nonEmpty(row.value, `${label}.value`),
  };
}

function nullableSha(value: unknown, label: string): string | null {
  return value === null ? null : sha(value, label);
}

function nullable<T>(value: unknown, decode: (value: unknown) => T): T | null {
  return value === null ? null : decode(value);
}

function invalidRecord(detail: string): Error {
  return new Error(`check_evidence_records_invalid:${detail}`);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalidRecord(label);
  return value as Record<string, unknown>;
}

function exact(
  row: Record<string, unknown>,
  label: string,
  fields: string[],
): void {
  const allowed = new Set(fields);
  if (
    fields.some((field) => !Object.hasOwn(row, field)) ||
    Object.keys(row).some((field) => !allowed.has(field))
  )
    throw invalidRecord(`${label}.shape`);
}

function exactOptional(
  row: Record<string, unknown>,
  label: string,
  required: string[],
  optional: string[],
): void {
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((field) => !Object.hasOwn(row, field)) ||
    Object.keys(row).some((field) => !allowed.has(field))
  )
    throw invalidRecord(`${label}.shape`);
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw invalidRecord(label);
  return value;
}

function nonEmpty(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw invalidRecord(label);
  return value;
}

function nonnegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    throw invalidRecord(label);
  return value as number;
}

function decimalCardinality(value: unknown, label: string): string {
  const result = nonEmpty(value, label);
  if (!/^(0|[1-9][0-9]*)$/u.test(result)) throw invalidRecord(label);
  return result;
}

function key(value: unknown, label: string): string {
  const result = nonEmpty(value, label);
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(result)) throw invalidRecord(label);
  return result;
}

function strings(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    nonEmpty(item, `${label}[${index}]`),
  );
}

function keys(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    key(item, `${label}[${index}]`),
  );
}

function designFactRefs(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) => {
    const result = nonEmpty(item, `${label}[${index}]`);
    if (!/^[a-z0-9][a-z0-9._-]*$/u.test(result))
      throw invalidRecord(`${label}[${index}]`);
    return result;
  });
}

function designFactRef(value: unknown, label: string): string {
  const result = nonEmpty(value, label);
  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(result)) throw invalidRecord(label);
  return result;
}

function semanticFactRefs(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    semanticFactRef(item, `${label}[${index}]`),
  );
}

function semanticFactRef(value: unknown, label: string): string {
  const result = nonEmpty(value, label);
  if (!/^[a-z0-9][a-z0-9._:-]*$/u.test(result)) throw invalidRecord(label);
  return result;
}

function sha(value: unknown, label: string): string {
  const result = nonEmpty(value, label);
  if (!/^[a-f0-9]{64}$/u.test(result)) throw invalidRecord(label);
  return result;
}

function literal<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
): T[number] {
  const result = nonEmpty(value, label);
  if (!allowed.includes(result)) throw invalidRecord(label);
  return result as T[number];
}
