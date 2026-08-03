import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { decodeEvidenceCapabilityRecords } from "../../packages/ty-context/dist/lib/long-task-evidence-capability-codec.js";
import {
  validateDistinctSemanticFactEvidence,
  validateSemanticFactEvidence,
} from "../../packages/ty-context/dist/lib/long-task-semantic-fact-evidence.js";
import { parseSemanticFactCompactCarrierShape } from "../../packages/ty-context/dist/lib/semantic-fact-compact-carrier.js";
import { validateSemanticFactManifestPolicy } from "../../packages/ty-context/dist/lib/semantic-fact-policy.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
import { materializeSemanticFactEvidence } from "../../tools/semantic_fact_delivery_evidence.mjs";
import { writeSyntheticCompactFixture } from "./long-task-compact-semantic-fixture.mjs";
import { createDeliveryFixture } from "./long-task-delivery-fixtures.mjs";
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
  return rows.map((row) => `${row[keyField]}\0${row[digestField]}`).sort();
}

export async function assertSyntheticCompactFixtureCompiles() {
  const fixture = await createDeliveryFixture();
  try {
    const synthetic = await writeSyntheticCompactFixture(fixture, 64);
    assert.equal(synthetic.compactSource.proof_templates.length, 2);
    assert.equal(
      synthetic.compactContract.compact_semantic_carrier.proof_templates
        .length,
      2,
    );
    validateSemanticFactManifestPolicy(synthetic.manifest);
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    const check = compiled.outcomes[0].acceptance.checks[0];
    const expectations = check.semantic_fact_expectations;
    assert.equal(synthetic.manifest.facts.length, 64);
    assert.equal(synthetic.manifest.proof_obligations.length, 128);
    assert.equal(expectations.length, 128);
    assert.equal(
      expectations.filter(
        (item) => item.fact_key === synthetic.manifest.facts[0].key,
      ).length,
      2,
    );
    assert.ok(expectations.every((item) => item.revision_identity_required));
    assert.equal(
      new Set(expectations.map((item) => item.obligation_key)).size,
      128,
    );
    const compactIdentity = parseSemanticFactCompactCarrierShape(
      synthetic.compactSource,
    );
    const evidenceRecords = await materializeSemanticFactEvidence({
      repositoryRoot: fixture.root,
      targetRef: check.execution_target.target_ref,
      rootEntrypoint: "tools/verify-synthetic-compact.mjs",
      manifest: synthetic.manifest,
      manifestSha256: sha256Hex(canonicalValueJson(synthetic.compactSource)),
      passedByFact: new Map(
        synthetic.manifest.facts.map((fact) => [fact.key, true]),
      ),
      factRevisions: new Map(
        compactIdentity.fact_revisions.map((item) => [
          item.key,
          item.revision_digest,
        ]),
      ),
      obligationRevisions: new Map(
        compactIdentity.obligation_revisions.map((item) => [
          item.key,
          item.revision_digest,
        ]),
      ),
      assertionByObligation: new Map(
        expectations.map((item) => [item.obligation_key, item.assertion_ref]),
      ),
      sessionId: "synthetic-compact",
    });
    const semanticEvidence = decodeEvidenceCapabilityRecords(
      evidenceRecords,
    ).filter((item) => item.capability === "semantic_fact");
    assert.equal(semanticEvidence.length, 128);
    assert.equal(validateDistinctSemanticFactEvidence(semanticEvidence), null);
    const artifactHashes = Object.fromEntries(
      semanticEvidence.map((record) => [
        record.actual_observation.artifact_path,
        record.actual_observation.artifact_sha256,
      ]),
    );
    for (const record of semanticEvidence)
      assert.equal(
        validateSemanticFactEvidence(check, record, artifactHashes),
        null,
        record.obligation_key,
      );
    assertCompactEvidenceIdentity(check, expectations[0]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

export async function assertContractRevisionMismatchRejected() {
  const fixture = await createDeliveryFixture();
  try {
    const { compactContract } = await writeSyntheticCompactFixture(fixture, 8);
    const changed = structuredClone(compactContract);
    const table = changed.compact_semantic_carrier.fact_sets[0];
    const digestColumn = table.columns.indexOf("fact_revision_digest");
    table.rows[0][digestColumn] = "f".repeat(64);
    await writeFile(
      path.join(fixture.workdir, "delivery-contract.yaml"),
      JSON.stringify(changed),
      "utf8",
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /contract_fact_revision_set|contract_fact_revision_mismatch/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}
