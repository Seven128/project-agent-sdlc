import assert from "node:assert/strict";
import { decodeEvidenceCapabilityRecords } from "../../packages/ty-context/dist/lib/long-task-evidence-capability-codec.js";
import { validateSemanticFactEvidence } from "../../packages/ty-context/dist/lib/long-task-semantic-fact-evidence.js";
import { refreshComparisonIdentity } from "./long-task-semantic-fact-test-support.mjs";

export function assertCompactEvidenceIdentity(check, expectation) {
  const artifactSha256 = "a".repeat(64);
  const record = {
    assertion_key: expectation.assertion_ref,
    capability: "semantic_fact",
    manifest_ref: expectation.manifest_ref,
    manifest_sha256: expectation.manifest_sha256,
    outcome_ref: expectation.outcome_ref,
    target_ref: check.execution_target.target_ref,
    fact_key: expectation.fact_key,
    fact_revision_digest: expectation.fact_revision_digest,
    obligation_key: expectation.obligation_key,
    obligation_revision_digest: expectation.obligation_revision_digest,
    fact_ref: expectation.fact_ref,
    proof_ref: expectation.proof_ref,
    method: expectation.method,
    subject_ref: expectation.subject_ref,
    condition_ref: expectation.condition_ref,
    property_ref: expectation.property_ref,
    actual_observation: {
      artifact_path: "artifacts/compact-semantic.json",
      artifact_sha256: artifactSha256,
      locator: { kind: "json_pointer", value: "/actual" },
      value_sha256: expectation.expected.sha256,
      sensitivity: expectation.observation_sensitivity,
      redaction: null,
    },
    actual_environment: {
      artifact_path: "artifacts/compact-semantic.json",
      artifact_sha256: artifactSha256,
      locator: { kind: "json_pointer", value: "/environment" },
      value_sha256: expectation.environment.definition.sha256,
    },
    expected: structuredClone(expectation.expected),
    comparison: {
      artifact_path: "artifacts/compact-semantic.json",
      artifact_sha256: artifactSha256,
      locator: { kind: "json_pointer", value: "/comparison" },
      result_sha256: "0".repeat(64),
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
  const decoded = decodeEvidenceCapabilityRecords([record])[0];
  const hashes = { [record.actual_observation.artifact_path]: artifactSha256 };
  assert.equal(validateSemanticFactEvidence(check, decoded, hashes), null);
  const wrongRevision = structuredClone(decoded);
  wrongRevision.obligation_revision_digest = "f".repeat(64);
  assert.equal(
    validateSemanticFactEvidence(check, wrongRevision, hashes),
    "semantic_fact_identity_mismatch",
  );
  const legacyIdentity = structuredClone(decoded);
  delete legacyIdentity.fact_key;
  delete legacyIdentity.fact_revision_digest;
  delete legacyIdentity.obligation_key;
  delete legacyIdentity.obligation_revision_digest;
  assert.equal(
    validateSemanticFactEvidence(check, legacyIdentity, hashes),
    "semantic_fact_identity_mismatch",
  );
}

export function compactRevisionPairSet(rows, keyField, digestField) {
  return rows
    .map((row) => `${row[keyField]}\0${row[digestField]}`)
    .sort();
}
