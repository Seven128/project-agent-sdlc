import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { materializeCanonicalCompactSharedStructures } from "../../packages/ty-context/dist/lib/compact-shared-structure-validation.js";
import { createLongTaskCompactContract } from "../../packages/ty-context/dist/lib/long-task-compact-authoring.js";
import { longTaskCompactSharedStructureTargets } from "../../packages/ty-context/dist/lib/long-task-compact-primitives.js";
import { createSemanticFactCompactCarrier } from "../../packages/ty-context/dist/lib/semantic-fact-compact-authoring.js";
import { parseSemanticFactCompactCarrierShape } from "../../packages/ty-context/dist/lib/semantic-fact-compact-carrier.js";
import { semanticCompactSharedStructureTargets } from "../../packages/ty-context/dist/lib/semantic-fact-compact-support.js";
import { parseSemanticFactManifestBlocks } from "../../packages/ty-context/dist/lib/semantic-fact-source-parser.js";
import { evaluateStructuralClosureCost } from "../../packages/ty-context/dist/lib/structural-closure-cost.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
import { structuralContractFixture } from "./long-task-structural-closure-cost-fixture.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const sourceRelative = "docs/symbolic-denotation-efficiency.md";

test("fixed structural baseline cannot rise from the measured candidate", async () => {
  const baseline = JSON.parse(
    await readFile(
      path.join(
        repository,
        "tests/ty-context/fixtures/structural-closure-cost-baseline.json",
      ),
      "utf8",
    ),
  );
  assert.equal(baseline.exact.K_fact, 113);
  assert.equal(baseline.exact.K_rule, 2_556);
  assert.equal(baseline.maximum.source_bytes, 500_000);
  assert.equal(baseline.maximum.contract_bytes, 225_000);
  assert.equal(Object.hasOwn(baseline, "measured"), false);
  const observation = passingObservation(baseline);
  assert.deepEqual(
    evaluateStructuralClosureCost(observation, baseline, "default-v1"),
    [],
  );
  observation.bytes.source = baseline.maximum.source_bytes + 1;
  assert.match(
    evaluateStructuralClosureCost(observation, baseline, "default-v1").join(
      "\n",
    ),
    /maximum_exceeded:source_bytes/u,
  );
});

test("one real Fact revision changes only that Fact, its obligations and summaries", async () => {
  const { source, contract } = await currentAuthority();
  const beforeSource = createSemanticFactCompactCarrier(source.manifest);
  const beforeIdentity = parseSemanticFactCompactCarrierShape(beforeSource);
  const changedManifest = structuredClone(source.manifest);
  const changedFact = changedManifest.facts.find(
    (fact) => typeof fact.expected.value === "boolean",
  );
  assert.ok(changedFact);
  changedFact.expected.value = !changedFact.expected.value;
  changedFact.expected.sha256 = sha256Hex(
    canonicalValueJson(changedFact.expected.value),
  );
  const afterSource = createSemanticFactCompactCarrier(changedManifest);
  const afterIdentity = parseSemanticFactCompactCarrierShape(afterSource);
  const expectedObligations = source.manifest.proof_obligations
    .filter((proof) => proof.fact_ref === changedFact.key)
    .map((proof) => proof.key)
    .sort();
  assert.deepEqual(
    changedRevisionKeys(
      beforeIdentity.fact_revisions,
      afterIdentity.fact_revisions,
    ),
    [changedFact.key],
  );
  assert.deepEqual(
    changedRevisionKeys(
      beforeIdentity.obligation_revisions,
      afterIdentity.obligation_revisions,
    ),
    expectedObligations,
  );
  assert.equal(
    canonicalValueJson(beforeSource.shared_structures),
    canonicalValueJson(afterSource.shared_structures),
  );
  assertOnlyRowsChanged(
    beforeSource.fact_sets[0],
    afterSource.fact_sets[0],
    "key",
    new Set([changedFact.key]),
  );
  assertOnlyRowsChanged(
    beforeSource.obligations,
    afterSource.obligations,
    "obligation_key",
    new Set(expectedObligations),
  );

  const beforeContract = createLongTaskCompactContract(
    contract,
    beforeIdentity.fact_revisions,
    beforeIdentity.obligation_revisions,
  );
  const changedContract = structuredClone(contract);
  changedContract.semantic_fact_manifest.sha256 = sha256Hex(
    canonicalValueJson(afterSource),
  );
  const afterContract = createLongTaskCompactContract(
    changedContract,
    afterIdentity.fact_revisions,
    afterIdentity.obligation_revisions,
  );
  assertOnlyRowsChanged(
    beforeContract.compact_semantic_carrier.fact_sets[0],
    afterContract.compact_semantic_carrier.fact_sets[0],
    "fact_key",
    new Set([changedFact.key]),
  );
  assertOnlyRowsChanged(
    beforeContract.compact_semantic_carrier.obligations,
    afterContract.compact_semantic_carrier.obligations,
    "obligation_key",
    new Set(expectedObligations),
  );
});

test("unrelated axis leaves K_fact, M_value and persisted shared metadata unchanged", async () => {
  const { source } = await currentAuthority();
  const before = createSemanticFactCompactCarrier(source.manifest);
  const changed = structuredClone(source.manifest);
  const axis = structuredClone(changed.axis_dispositions[0]);
  axis.key = "axis.custom-unrelated-structural-test";
  axis.axis = "custom-unrelated-structural-test";
  axis.standard = false;
  changed.axis_dispositions.push(axis);
  const after = createSemanticFactCompactCarrier(changed);
  const parsed = parseSemanticFactCompactCarrierShape(after);
  assert.equal(parsed.manifest.facts.length, source.manifest.facts.length);
  assert.equal(
    parsed.manifest.proof_obligations.length,
    source.manifest.proof_obligations.length,
  );
  assert.equal(sharedMetadata(after), sharedMetadata(before));
});

test("canonical duplicate audit reports no known cheaper same-boundary block", async () => {
  const { source, contract } = await currentAuthority();
  const compactSource = createSemanticFactCompactCarrier(source.manifest);
  const sourceClone = structuredClone(compactSource);
  const sourceStatistics = materializeCanonicalCompactSharedStructures(
    semanticCompactSharedStructureTargets(sourceClone),
    sourceClone.shared_structures,
    "source-test",
  );
  const compactContract = createLongTaskCompactContract(
    contract,
    source.fact_revisions,
    source.obligation_revisions,
  );
  const contractClone = structuredClone(compactContract);
  const contractStatistics = materializeCanonicalCompactSharedStructures(
    longTaskCompactSharedStructureTargets(
      contractClone,
      contractClone.compact_semantic_carrier,
    ),
    contractClone.compact_semantic_carrier.shared_structures,
    "contract-test",
  );
  assert.equal(sourceStatistics.remaining_beneficial_candidates, 0);
  assert.equal(contractStatistics.remaining_beneficial_candidates, 0);
  assert.ok(sourceStatistics.saved_bytes >= 80_000);
  assert.ok(contractStatistics.saved_bytes >= 6_000);
});

async function currentAuthority() {
  const sourceText = await readFile(
    path.join(repository, sourceRelative),
    "utf8",
  );
  const [source] = parseSemanticFactManifestBlocks(sourceRelative, sourceText);
  const contract = structuralContractFixture(source.manifest);
  return { source, contract };
}

function changedRevisionKeys(before, after) {
  const afterByKey = new Map(after.map((item) => [item.key, item]));
  assert.deepEqual(
    before.map((item) => item.key).sort(),
    after.map((item) => item.key).sort(),
  );
  return before
    .filter(
      (item) =>
        afterByKey.get(item.key).revision_digest !== item.revision_digest,
    )
    .map((item) => item.key)
    .sort();
}

function assertOnlyRowsChanged(before, after, keyColumn, expectedChanged) {
  const beforeRows = rowsByKey(before, keyColumn);
  const afterRows = rowsByKey(after, keyColumn);
  assert.deepEqual([...beforeRows.keys()].sort(), [...afterRows.keys()].sort());
  const changed = [...beforeRows.keys()]
    .filter(
      (key) =>
        canonicalValueJson(beforeRows.get(key)) !==
        canonicalValueJson(afterRows.get(key)),
    )
    .sort();
  assert.deepEqual(changed, [...expectedChanged].sort());
}

function rowsByKey(table, keyColumn) {
  const index = table.columns.indexOf(keyColumn);
  assert.notEqual(index, -1);
  return new Map(table.rows.map((row) => [row[index], row]));
}

function sharedMetadata(carrier) {
  return canonicalValueJson({
    selectors: carrier.selectors,
    shared_structures: carrier.shared_structures,
    proof_templates: carrier.proof_templates,
  });
}

function passingObservation(baseline) {
  return {
    cardinality: { ...baseline.exact, N_dag: baseline.maximum.N_dag },
    bytes: {
      source: baseline.maximum.source_bytes,
      contract: baseline.maximum.contract_bytes,
      evidence: baseline.maximum.evidence_bytes,
      default_context: baseline.maximum.default_context_bytes,
    },
    phases_ms: {
      compile: baseline.profiles["default-v1"].compile_ms,
      preflight: baseline.profiles["default-v1"].preflight_ms,
      final_gate: baseline.profiles["default-v1"].final_gate_ms,
    },
    peak_rss_bytes: baseline.profiles["default-v1"].peak_rss_bytes,
    duplicate_blocks: {
      source: {
        saved_bytes: baseline.minimum.source_duplicate_saved_bytes,
        remaining_beneficial_candidates: 0,
      },
      contract: {
        saved_bytes: baseline.minimum.contract_duplicate_saved_bytes,
        remaining_beneficial_candidates: 0,
      },
    },
    revision_blast_radius: {
      changed_files: baseline.maximum.revision_changed_files,
      changed_lines: baseline.maximum.revision_changed_lines,
      changed_bytes: baseline.maximum.revision_changed_bytes,
      changed_fact_revision_keys: ["fact.test"],
      expected_changed_fact_revision_keys: ["fact.test"],
      changed_obligation_revision_keys: ["proof.test"],
      expected_changed_obligation_revision_keys: ["proof.test"],
      unrelated_fact_revision_identities_unchanged: true,
      unrelated_obligation_revision_identities_unchanged: true,
      shared_structure_catalog_unchanged: true,
    },
    unrelated_axis: {
      K_fact_growth: 0,
      M_value_growth: 0,
      persisted_shared_metadata_growth_bytes: 0,
    },
  };
}
