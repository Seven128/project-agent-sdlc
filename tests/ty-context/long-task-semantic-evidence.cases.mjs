import assert from "node:assert/strict";
import test from "node:test";
import { decodeEvidenceCapabilityRecords } from "../../packages/ty-context/dist/lib/long-task-evidence-capability-codec.js";
import {
  validateDistinctSemanticFactEvidence,
  validateSemanticFactEvidence,
} from "../../packages/ty-context/dist/lib/long-task-semantic-fact-evidence.js";
import {
  fixtureSemanticManifest,
  semanticManifestIdentity,
} from "./long-task-delivery-fixtures.mjs";
import {
  refreshComparisonIdentity,
} from "./long-task-semantic-fact-test-support.mjs";

test("runtime evidence is attributable per Fact and cannot reuse or rewrite frozen authority", () => {
  const manifest = fixtureSemanticManifest();
  const fact = manifest.facts[0];
  const proof = manifest.proof_obligations[0];
  const expectation = {
    manifest_ref: manifest.key,
    manifest_sha256: semanticManifestIdentity(manifest),
    fact_ref: fact.key,
    proof_ref: proof.key,
    method: proof.method,
    check_ref: "first-check",
    assertion_ref: "first-semantic-fact",
    outcome_ref: "first",
    claim_ref: "semantic_fact.fact.first.observable",
    applicability_ref: "first-root-success",
    subject_ref: fact.unit_ref,
    condition_ref: fact.condition_ref,
    property_ref: fact.property_ref,
    observation_sensitivity: fact.observation_sensitivity,
    expected: fact.expected,
    comparison: proof.comparison,
    oracle: manifest.oracles[0],
    environment: manifest.environments[0],
    observer_refs: [],
  };
  const artifactSha = "a".repeat(64);
  const record = {
    assertion_key: expectation.assertion_ref,
    capability: "semantic_fact",
    manifest_ref: expectation.manifest_ref,
    manifest_sha256: expectation.manifest_sha256,
    outcome_ref: expectation.outcome_ref,
    target_ref: "fixture-app",
    fact_ref: expectation.fact_ref,
    proof_ref: expectation.proof_ref,
    method: expectation.method,
    subject_ref: expectation.subject_ref,
    condition_ref: expectation.condition_ref,
    property_ref: expectation.property_ref,
    actual_observation: {
      artifact_path: "artifacts/semantic.json",
      artifact_sha256: artifactSha,
      locator: { kind: "json_pointer", value: "/actual" },
      value_sha256: expectation.expected.sha256,
      sensitivity: "plain",
      redaction: null,
    },
    actual_environment: {
      artifact_path: "artifacts/semantic.json",
      artifact_sha256: artifactSha,
      locator: { kind: "json_pointer", value: "/environment" },
      value_sha256: expectation.environment.definition.sha256,
    },
    expected: structuredClone(expectation.expected),
    comparison: {
      artifact_path: "artifacts/semantic.json",
      artifact_sha256: artifactSha,
      locator: { kind: "json_pointer", value: "/comparison" },
      result_sha256: "b".repeat(64),
      comparator: expectation.comparison.comparator,
      mode: expectation.comparison.mode,
      parameters: structuredClone(expectation.comparison.parameters),
      tolerance: structuredClone(expectation.comparison.tolerance),
      mask: structuredClone(expectation.comparison.mask),
      passed: true,
    },
    verdict: "passed",
    oracle: structuredClone(expectation.oracle),
    environment: structuredClone(expectation.environment),
    observer_results: [],
  };
  record.comparison.result_sha256 = refreshComparisonIdentity(
    record,
    expectation,
    record.target_ref,
  );
  const check = {
    key: "first-check",
    execution_target: { target_ref: "fixture-app" },
    semantic_fact_expectations: [expectation],
  };
  const hashes = { "artifacts/semantic.json": artifactSha };
  assert.equal(validateSemanticFactEvidence(check, record, hashes), null);
  const colonIdentityRecord = structuredClone(record);
  colonIdentityRecord.fact_ref = "fact:first.observable";
  assert.equal(
    decodeEvidenceCapabilityRecords([colonIdentityRecord])[0].fact_ref,
    "fact:first.observable",
  );

  for (const [label, mutate, expected] of [
    [
      "Fact identity",
      (candidate) => {
        candidate.fact_ref = "fact.rewritten";
      },
      "semantic_fact_identity_mismatch",
    ],
    [
      "expected authority",
      (candidate) => {
        candidate.expected.sha256 = "c".repeat(64);
      },
      "semantic_fact_expected_value_mismatch",
    ],
    [
      "comparison mask",
      (candidate) => {
        candidate.comparison.mask = {
          representation: "digest_only",
          locator: {
            material_ref: manifest.key,
            kind: "manifest_pointer",
            value: "/mask",
          },
          sha256: "c".repeat(64),
        };
      },
      "semantic_fact_comparison_authority_mismatch",
    ],
    [
      "exact actual value",
      (candidate) => {
        candidate.actual_observation.value_sha256 = "c".repeat(64);
        candidate.comparison.result_sha256 = refreshComparisonIdentity(
          candidate,
          expectation,
          candidate.target_ref,
        );
      },
      "semantic_fact_exact_value_mismatch",
    ],
    [
      "Oracle",
      (candidate) => {
        candidate.oracle.version = "rewritten";
      },
      "semantic_fact_oracle_environment_mismatch",
    ],
    [
      "verdict",
      (candidate) => {
        candidate.verdict = "failed";
      },
      "semantic_fact_failed",
    ],
  ]) {
    const candidate = structuredClone(record);
    mutate(candidate);
    assert.equal(
      validateSemanticFactEvidence(check, candidate, hashes),
      expected,
      label,
    );
  }

  assert.equal(
    validateDistinctSemanticFactEvidence([record, structuredClone(record)]),
    "semantic_fact_result_duplicate",
  );
  const reused = structuredClone(record);
  reused.fact_ref = "fact.second";
  reused.proof_ref = "proof.second";
  assert.equal(
    validateDistinctSemanticFactEvidence([record, reused]),
    "semantic_fact_observation_reused",
  );

  const observedExpectation = structuredClone(expectation);
  observedExpectation.observer_refs = ["fixture-observer"];
  const observedRecord = structuredClone(record);
  observedRecord.observer_results = [
    {
      target_ref: "fixture-observer",
      artifact_path: "artifacts/observer.json",
      artifact_sha256: "c".repeat(64),
      locator: { kind: "json_pointer", value: "/observed" },
      value_sha256: expectation.expected.sha256,
      comparison_result_sha256: "d".repeat(64),
      passed: true,
    },
  ];
  observedRecord.observer_results[0].comparison_result_sha256 =
    refreshComparisonIdentity(
      observedRecord,
      observedExpectation,
      "fixture-observer",
    );
  const observedCheck = {
    ...check,
    semantic_fact_expectations: [observedExpectation],
  };
  const observedHashes = {
    ...hashes,
    "artifacts/observer.json": "c".repeat(64),
  };
  assert.equal(
    validateSemanticFactEvidence(
      observedCheck,
      observedRecord,
      observedHashes,
    ),
    null,
  );
  observedRecord.observer_results[0].passed = false;
  assert.equal(
    validateSemanticFactEvidence(
      observedCheck,
      observedRecord,
      observedHashes,
    ),
    "semantic_fact_observer_failed",
  );
  observedRecord.observer_results[0].passed = true;
  observedRecord.observer_results[0].artifact_path =
    record.actual_observation.artifact_path;
  observedRecord.observer_results[0].artifact_sha256 =
    record.actual_observation.artifact_sha256;
  observedRecord.observer_results[0].locator =
    structuredClone(record.actual_observation.locator);
  assert.equal(
    validateSemanticFactEvidence(
      observedCheck,
      observedRecord,
      observedHashes,
    ),
    "semantic_fact_observer_observation_reused",
  );

  const protectedExpectation = structuredClone(expectation);
  protectedExpectation.observation_sensitivity = "protected";
  protectedExpectation.expected.representation = "digest_only";
  delete protectedExpectation.expected.value;
  const protectedRecord = structuredClone(record);
  protectedRecord.actual_observation.sensitivity = "protected";
  protectedRecord.actual_observation.redaction = {
    policy_ref: "policy.semantic-protected",
    representation: "digest_only",
    raw_persisted: false,
  };
  protectedRecord.expected = structuredClone(protectedExpectation.expected);
  const protectedCheck = {
    ...check,
    semantic_fact_expectations: [protectedExpectation],
  };
  assert.equal(
    validateSemanticFactEvidence(protectedCheck, protectedRecord, hashes),
    null,
  );
  const unsafeProtectedRecord = structuredClone(protectedRecord);
  unsafeProtectedRecord.actual_observation.redaction.raw_persisted = true;
  assert.throws(
    () => decodeEvidenceCapabilityRecords([unsafeProtectedRecord]),
    /actual_observation\.redaction\.raw_persisted/u,
  );
});
