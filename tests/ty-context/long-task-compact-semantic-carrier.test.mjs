import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createLongTaskCompactContract } from "../../packages/ty-context/dist/lib/long-task-compact-authoring.js";
import {
  applyCompactAuthoringSelectors,
  compactAuthoringTable,
} from "../../packages/ty-context/dist/lib/compact-authoring-support.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  parseDeliveryContractBundle,
  parseDeliveryContractText,
} from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { decodeEvidenceCapabilityRecords } from "../../packages/ty-context/dist/lib/long-task-evidence-capability-codec.js";
import {
  validateDistinctSemanticFactEvidence,
  validateSemanticFactEvidence,
} from "../../packages/ty-context/dist/lib/long-task-semantic-fact-evidence.js";
import { createSemanticFactCompactCarrier } from "../../packages/ty-context/dist/lib/semantic-fact-compact-authoring.js";
import { parseSemanticFactCompactCarrierShape } from "../../packages/ty-context/dist/lib/semantic-fact-compact-carrier.js";
import { validateSemanticFactManifestPolicy } from "../../packages/ty-context/dist/lib/semantic-fact-policy.js";
import { parseSemanticFactManifestBlocks } from "../../packages/ty-context/dist/lib/semantic-fact-source-parser.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
import { materializeSemanticFactEvidence } from "../../tools/semantic_fact_delivery_evidence.mjs";
import {
  createDeliveryFixture,
} from "./long-task-delivery-fixtures.mjs";
import {
  writeSyntheticCompactFixture,
} from "./long-task-compact-semantic-fixture.mjs";
import {
  assertCompactEvidenceIdentity,
  compactRevisionPairSet,
} from "./long-task-compact-semantic-test-support.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const sourceRelative = "docs/symbolic-denotation-efficiency.md";
const contractRelative =
  ".work_products/symbolic-denotation-efficiency/delivery-contract.yaml";

test("[critical:compact-carrier-exact-closure] migrated compact Authorities preserve all 113 Facts and obligations without expanded shadows", async () => {
  const source = await readFile(path.join(repository, sourceRelative), "utf8");
  const [parsedSource] = parseSemanticFactManifestBlocks(sourceRelative, source);
  assert.equal(parsedSource.carrier, "compact_v1");
  assert.equal(parsedSource.manifest.facts.length, 113);
  assert.equal(parsedSource.manifest.proof_obligations.length, 113);
  assert.equal(parsedSource.manifest.inputs.length, 132);
  assert.equal(source.includes("```yaml semantic-fact-manifest-v1"), false);
  assert.ok(Buffer.byteLength(source) < 600_000);
  assert.ok(source.split(/\r?\n/u).length < 15_000);
  validateSemanticFactManifestPolicy(parsedSource.manifest);
  for (const input of parsedSource.manifest.inputs)
    if (
      ["context", "canonical_spec", "repository_preservation"].includes(
        input.kind,
      )
    )
      assert.equal(
        input.sha256,
        sha256Hex(await readFile(path.join(repository, input.source_ref))),
        input.key,
      );

  const parsedContract = await parseDeliveryContractBundle(
    path.join(repository, ".work_products", "symbolic-denotation-efficiency"),
    repository,
  );
  const facts = parsedContract.contract.outcomes.flatMap(
    (outcome) => outcome.semantic_fact_bindings.facts,
  );
  const obligations = parsedContract.contract.outcomes.flatMap(
    (outcome) => outcome.semantic_fact_bindings.proofs,
  );
  assert.equal(facts.length, 113);
  assert.equal(obligations.length, 113);
  assert.deepEqual(
    compactRevisionPairSet(facts, "fact_ref", "fact_revision_digest"),
    compactRevisionPairSet(
      parsedSource.fact_revisions,
      "key",
      "revision_digest",
    ),
  );
  assert.deepEqual(
    compactRevisionPairSet(
      obligations,
      "proof_ref",
      "obligation_revision_digest",
    ),
    compactRevisionPairSet(
      parsedSource.obligation_revisions,
      "key",
      "revision_digest",
    ),
  );
  const contractText = await readFile(
    path.join(repository, contractRelative),
    "utf8",
  );
  assert.equal(/^source_claims:/mu.test(contractText), false);
  assert.ok(Buffer.byteLength(contractText) < 230_000);

  const regeneratedSource = parseSemanticFactCompactCarrierShape(
    createSemanticFactCompactCarrier(parsedSource.manifest),
  );
  assert.equal(
    canonicalValueJson(regeneratedSource.manifest),
    canonicalValueJson(parsedSource.manifest),
  );
  const regeneratedContract = createLongTaskCompactContract(
    parsedContract.contract,
    parsedSource.fact_revisions,
    parsedSource.obligation_revisions,
  );
  assert.deepEqual(
    parseDeliveryContractText(JSON.stringify(regeneratedContract)),
    parsedContract.contract,
  );
  assert.ok(regeneratedContract.compact_semantic_carrier.exceptions.length > 0);
  const missingException = structuredClone(regeneratedContract);
  missingException.compact_semantic_carrier.exceptions.pop();
  assert.throws(
    () => parseDeliveryContractText(JSON.stringify(missingException)),
    /projection target set mismatch/u,
  );
});

test("compact tables fail closed on sparse cells and selectors preserve row structure", () => {
  assert.throws(
    () => compactAuthoringTable([{ key: "row.first", value: true }, { key: "row.second" }]),
    /compact_authoring_sparse_cell:1:value/u,
  );
  const members = Array.from(
    { length: 8 },
    (_, index) => `member.${String(index).padStart(2, "0")}.${"x".repeat(32)}`,
  );
  const table = compactAuthoringTable([
    { key: "row.first", members },
    { key: "row.second", members },
    { key: "row.third", members: ["member.distinct"] },
  ]);
  const compact = applyCompactAuthoringSelectors({ table });
  assert.ok(Array.isArray(compact.value.table.rows));
  assert.ok(compact.value.table.rows.every((row) => Array.isArray(row)));
  assert.equal(compact.selectors.length, 1);
});

test("compact Source fails closed on revision and capacity drift", async () => {
  const source = await readFile(path.join(repository, sourceRelative), "utf8");
  const [parsed] = parseSemanticFactManifestBlocks(sourceRelative, source);
  const compact = createSemanticFactCompactCarrier(parsed.manifest);
  const digestColumn = compact.fact_sets[0].columns.indexOf(
    "fact_revision_digest",
  );
  assert.notEqual(digestColumn, -1);
  const changedDigest = structuredClone(compact);
  changedDigest.fact_sets[0].rows[0][digestColumn] = "0".repeat(64);
  assert.throws(
    () => parseSemanticFactCompactCarrierShape(changedDigest),
    /revision digest mismatch/u,
  );
  const lineageManifest = structuredClone(parsed.manifest);
  const lineageInput = lineageManifest.inputs.find(
    (item) => item.fact_refs.length > 0,
  );
  assert.ok(lineageInput);
  const factRef = lineageInput.fact_refs[0];
  const proofRef = lineageManifest.proof_obligations.find(
    (item) => item.fact_ref === factRef,
  )?.key;
  assert.ok(proofRef);
  lineageInput.sha256 =
    lineageInput.sha256 === "f".repeat(64)
      ? "e".repeat(64)
      : "f".repeat(64);
  const lineageChanged = parseSemanticFactCompactCarrierShape(
    createSemanticFactCompactCarrier(lineageManifest),
  );
  assert.notEqual(
    lineageChanged.fact_revisions.find((item) => item.key === factRef)
      ?.revision_digest,
    parsed.fact_revisions.find((item) => item.key === factRef)
      ?.revision_digest,
  );
  assert.notEqual(
    lineageChanged.obligation_revisions.find((item) => item.key === proofRef)
      ?.revision_digest,
    parsed.obligation_revisions.find((item) => item.key === proofRef)
      ?.revision_digest,
  );
  const exceeded = structuredClone(compact);
  exceeded.capacity.maximum.facts = 1;
  assert.throws(
    () => parseSemanticFactCompactCarrierShape(exceeded),
    /capacity exceeded/u,
  );
});

test("deterministic compact fixture compiles 64 Facts into 128 distinct obligations", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const synthetic = await writeSyntheticCompactFixture(fixture, 64);
    validateSemanticFactManifestPolicy(synthetic.manifest);
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    const expectations = compiled.outcomes[0].acceptance.checks[0]
      .semantic_fact_expectations;
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
      targetRef: compiled.outcomes[0].acceptance.checks[0].execution_target
        .target_ref,
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
    const decodedEvidence = decodeEvidenceCapabilityRecords(evidenceRecords);
    const semanticEvidence = decodedEvidence.filter(
      (item) => item.capability === "semantic_fact",
    );
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
        validateSemanticFactEvidence(
          compiled.outcomes[0].acceptance.checks[0],
          record,
          artifactHashes,
        ),
        null,
        record.obligation_key,
      );
    assertCompactEvidenceIdentity(
      compiled.outcomes[0].acceptance.checks[0],
      expectations[0],
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Contract revision mismatch is rejected before first Authority Lock", async () => {
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
});
