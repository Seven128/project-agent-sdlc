import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createLongTaskCompactContract } from "../../packages/ty-context/dist/lib/long-task-compact-authoring.js";
import {
  applyCompactAuthoringSelectors,
  compactAuthoringTable,
} from "../../packages/ty-context/dist/lib/compact-authoring-support.js";
import {
  parseDeliveryContractBundle,
  parseDeliveryContractText,
} from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { createSemanticFactCompactCarrier } from "../../packages/ty-context/dist/lib/semantic-fact-compact-authoring.js";
import { parseSemanticFactCompactCarrierShape } from "../../packages/ty-context/dist/lib/semantic-fact-compact-carrier.js";
import { validateSemanticFactManifestPolicy } from "../../packages/ty-context/dist/lib/semantic-fact-policy.js";
import { parseSemanticFactManifestBlocks } from "../../packages/ty-context/dist/lib/semantic-fact-source-parser.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
import {
  assertContractRevisionMismatchRejected,
  assertSyntheticCompactFixtureCompiles,
  compactRevisionPairSet,
} from "./long-task-compact-semantic-test-support.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const sourceRelative = "docs/symbolic-denotation-efficiency.md";
const contractRelative =
  ".work_products/symbolic-denotation-efficiency/delivery-contract.yaml";

test("[critical:compact-carrier-exact-closure] migrated compact Authorities preserve all 113 Facts and obligations without expanded shadows", async () => {
  const attributes = await readFile(
    path.join(repository, ".gitattributes"),
    "utf8",
  );
  assert.match(attributes, /^\* text=auto eol=lf$/mu);
  const source = await readFile(path.join(repository, sourceRelative), "utf8");
  const [parsedSource] = parseSemanticFactManifestBlocks(
    sourceRelative,
    source,
  );
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
    () =>
      compactAuthoringTable([
        { key: "row.first", value: true },
        { key: "row.second" },
      ]),
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
    lineageInput.sha256 === "f".repeat(64) ? "e".repeat(64) : "f".repeat(64);
  const lineageChanged = parseSemanticFactCompactCarrierShape(
    createSemanticFactCompactCarrier(lineageManifest),
  );
  assert.notEqual(
    lineageChanged.fact_revisions.find((item) => item.key === factRef)
      ?.revision_digest,
    parsed.fact_revisions.find((item) => item.key === factRef)?.revision_digest,
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
  await assertSyntheticCompactFixtureCompiles();
});

test("Contract revision mismatch is rejected before first Authority Lock", async () => {
  await assertContractRevisionMismatchRejected();
});
