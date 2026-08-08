import { fixtureSha } from "./symbolic-denotation-long-task-v2-support.mjs";
import {
  fixtureExactComparisonInput,
  fixtureExactComparisonResultIdentity,
} from "./long-task-exact-comparison-fixture.mjs";

export function groundMethodRecord(assertionKey, target, binding, hashes) {
  return {
    assertion_key: assertionKey,
    capability: "design_method",
    design_target_ref: target.key,
    target_ref: "fixture-app",
    method: binding.method,
    cells: binding.evidence_artifacts.map((artifact) => ({
      condition_key: artifact.condition_key,
      artifact_path: artifact.path,
      observation_artifact_path: artifact.observation_path,
      fact_refs: [...artifact.fact_refs],
      fact_results: artifact.fact_expectations.map((expectation) => ({
        fact_ref: expectation.fact_ref,
        subject_ref: expectation.subject_ref,
        variation_ref: expectation.variation_ref,
        property_ref: expectation.property_ref,
        actual_observation: actualObservation(
          artifact.observation_path,
          hashes,
          expectation.fact_ref,
          expectation.observation_sensitivity,
          expectation.expected.sha256,
        ),
        actual_environment: actualEnvironment(
          artifact.observation_path,
          hashes,
          expectation.fact_ref,
          expectation.environment.definition.sha256,
        ),
        expected: structuredClone(expectation.expected),
        comparison: comparisonResult(
          artifact.path,
          hashes,
          expectation.fact_ref,
          expectation.comparison,
          {
            kind: "selected_design_ground_v1",
            fact_ref: expectation.fact_ref,
            subject_ref: expectation.subject_ref,
            variation_ref: expectation.variation_ref,
            property_ref: expectation.property_ref,
          },
          expectation.expected.sha256,
        ),
        verdict: "passed",
        oracle: structuredClone(expectation.oracle),
        environment: structuredClone(expectation.environment),
      })),
    })),
  };
}

export function symbolicMethodRecord(assertionKey, target, binding, hashes) {
  return {
    assertion_key: assertionKey,
    capability: "design_method",
    fact_model: "symbolic_rules_v2",
    design_target_ref: target.key,
    target_ref: "fixture-app",
    method: binding.method,
    artifact_path: binding.artifact_path,
    observation_artifact_path: binding.observation_path,
    rule_results: binding.rule_expectations.map((expectation) => ({
      obligation_ref: expectation.obligation_ref,
      fact_rule_ref: expectation.fact_rule_ref,
      region_sha256: expectation.region_sha256,
      subject_or_relation_ref: expectation.subject_or_relation_ref,
      property_ref: expectation.property_ref,
      population_ref: expectation.population_ref,
      quantifier: structuredClone(expectation.quantifier),
      actual_observation: actualObservation(
        binding.observation_path,
        hashes,
        expectation.obligation_ref,
        expectation.observation_sensitivity,
        expectation.expected.sha256,
      ),
      actual_environment: actualEnvironment(
        binding.observation_path,
        hashes,
        expectation.obligation_ref,
        expectation.environment.definition.sha256,
      ),
      observation_sensitivity: expectation.observation_sensitivity,
      expected: structuredClone(expectation.expected),
      proof_surface: expectation.proof_surface,
      observation_boundary: expectation.observation_boundary,
      comparison: comparisonResult(
        binding.artifact_path,
        hashes,
        expectation.obligation_ref,
        expectation.comparison,
        {
          kind: "selected_design_symbolic_v2",
          obligation_ref: expectation.obligation_ref,
          fact_rule_ref: expectation.fact_rule_ref,
          region_sha256: expectation.region_sha256,
          subject_or_relation_ref: expectation.subject_or_relation_ref,
          property_ref: expectation.property_ref,
          population_ref: expectation.population_ref,
          quantifier: expectation.quantifier,
        },
        expectation.expected.sha256,
      ),
      verdict: "passed",
      oracle: structuredClone(expectation.oracle),
      environment: structuredClone(expectation.environment),
      protected_value_policy: expectation.protected_value_policy,
      completion_effect: expectation.completion_effect,
    })),
  };
}

export function symbolicCertificateRecord(
  assertionKey,
  target,
  binding,
  hashes,
) {
  return {
    assertion_key: assertionKey,
    capability: "design_symbolic_certificate",
    design_target_ref: target.key,
    target_ref: "fixture-app",
    artifact_path: binding.artifact_path,
    artifact_sha256: hashes[binding.artifact_path],
    metrics: structuredClone(binding.metrics),
    certificate_results: binding.expectations.map((expectation) => ({
      ...structuredClone(expectation),
      recomputed: true,
      verdict: "passed",
    })),
  };
}

function actualObservation(
  artifactPath,
  hashes,
  identity,
  sensitivity,
  valueSha256,
) {
  return {
    artifact_path: artifactPath,
    artifact_sha256: hashes[artifactPath],
    locator: { kind: "json_pointer", value: `/observations/${identity}` },
    value_sha256: valueSha256,
    sensitivity,
    redaction:
      sensitivity === "protected"
        ? {
            policy_ref: "policy.fixture-redaction",
            representation: "digest_only",
            raw_persisted: false,
          }
        : null,
  };
}

function actualEnvironment(artifactPath, hashes, identity, valueSha256) {
  return {
    artifact_path: artifactPath,
    artifact_sha256: hashes[artifactPath],
    locator: { kind: "json_pointer", value: `/environments/${identity}` },
    value_sha256: valueSha256,
  };
}

function comparisonResult(
  artifactPath,
  hashes,
  identity,
  comparison,
  comparisonIdentity,
  expectedValueSha256,
) {
  const result = {
    artifact_path: artifactPath,
    artifact_sha256: hashes[artifactPath],
    locator: { kind: "json_pointer", value: `/comparisons/${identity}` },
    result_sha256: "0".repeat(64),
    comparator: comparison.comparator,
    mode: comparison.mode,
    parameters: structuredClone(comparison.parameters),
    tolerance: structuredClone(comparison.tolerance),
    mask: structuredClone(comparison.mask),
    passed: true,
  };
  const identityInput = fixtureExactComparisonInput({
    identity: comparisonIdentity,
    actualValueSha256: expectedValueSha256,
    expectedValueSha256,
    comparison,
  });
  result.result_sha256 = fixtureExactComparisonResultIdentity({
    ...identityInput,
    passed: true,
  });
  return result;
}
