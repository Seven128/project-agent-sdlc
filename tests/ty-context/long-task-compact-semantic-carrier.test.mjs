import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createLongTaskCompactContract } from "../../packages/ty-context/dist/lib/long-task-compact-authoring.js";
import { materializeCanonicalCompactSharedStructures } from "../../packages/ty-context/dist/lib/compact-shared-structure-validation.js";
import {
  applyCompactAuthoringSelectors,
  compactAuthoringTable,
} from "../../packages/ty-context/dist/lib/compact-authoring-support.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { createSemanticFactCompactCarrier } from "../../packages/ty-context/dist/lib/semantic-fact-compact-authoring.js";
import { parseSemanticFactCompactCarrierShape } from "../../packages/ty-context/dist/lib/semantic-fact-compact-carrier.js";
import { semanticCompactSharedStructureTargets } from "../../packages/ty-context/dist/lib/semantic-fact-compact-support.js";
import { validateSemanticFactManifestPolicy } from "../../packages/ty-context/dist/lib/semantic-fact-policy.js";
import { parseSemanticFactManifestBlocks } from "../../packages/ty-context/dist/lib/semantic-fact-source-parser.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
import {
  deriveSemanticSourceAnchors,
  scanMaterialTextInput,
} from "../../packages/ty-context/dist/lib/long-task-source-fragments.js";
import { synchronizeMaterialFragmentProjections } from "../../tools/migrate_long_task_compact_carrier_authority.mjs";
import {
  assertContractRevisionMismatchRejected,
  assertSyntheticCompactFixtureCompiles,
  compactRevisionPairSet,
} from "./long-task-compact-semantic-test-support.mjs";
import { projectSyntheticCompactContract } from "./long-task-compact-semantic-fixture.mjs";
import { createDeliveryFixture } from "./long-task-delivery-fixtures.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const sourceRelative = "docs/symbolic-denotation-efficiency.md";

test("[critical:compact-carrier-exact-closure] current compact Source and package Contract projection preserve all 113 Facts and obligations without expanded shadows", async () => {
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
  assert.ok(Buffer.byteLength(source) < 500_000);
  assert.ok(source.split(/\r?\n/u).length < 12_000);
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

  const compactSource = createSemanticFactCompactCarrier(parsedSource.manifest);
  const regeneratedSource = parseSemanticFactCompactCarrierShape(compactSource);
  assert.equal(
    canonicalValueJson(regeneratedSource.manifest),
    canonicalValueJson(parsedSource.manifest),
  );
  const fixture = await createDeliveryFixture();
  try {
    const counterfactualRef =
      parsedSource.manifest.proof_obligations[0]?.counterfactual.refs[0];
    const [counterfactual] =
      fixture.contract.outcomes[0].acceptance.counterfactual_controls;
    assert.ok(counterfactualRef);
    assert.ok(counterfactual);
    counterfactual.key = counterfactualRef;
    const projection = projectSyntheticCompactContract(
      structuredClone(fixture.contract),
      parsedSource.manifest,
    );
    projection.semantic_fact_manifest = {
      ...projection.semantic_fact_manifest,
      key: parsedSource.manifest.key,
      source_path: sourceRelative,
      sha256: sha256Hex(canonicalValueJson(compactSource)),
    };
    const outcome = projection.outcomes[0];
    outcome.product.requirements[0].required_proof_surfaces = [
      "runtime_behavior",
      "api_contract",
    ];
    const apiCheck = structuredClone(outcome.acceptance.checks[0]);
    apiCheck.key = "first-api-check";
    apiCheck.proof_surface = "api_contract";
    apiCheck.positive_assertions = [
      {
        key: "first-api-requirement",
        criterion: "first satisfies its observable API requirement.",
        claims: ["requirement.observe-first"],
        applicability_ref: "first-root-success",
        observation: "api_requirement_result",
        evidence_capabilities: ["target_runtime", "state_delta"],
        operator: "equals",
        expected: true,
      },
    ];
    apiCheck.negative_assertions = [];
    outcome.acceptance.checks.push(apiCheck);

    const compactContract = createLongTaskCompactContract(
      projection,
      parsedSource.fact_revisions,
      parsedSource.obligation_revisions,
    );
    assert.equal(Object.hasOwn(compactContract, "source_claims"), false);
    assert.ok(Buffer.byteLength(JSON.stringify(compactContract)) < 210_000);
    const parsedContract = parseDeliveryContractText(
      JSON.stringify(compactContract),
    );
    const facts = parsedContract.outcomes.flatMap(
      (item) => item.semantic_fact_bindings.facts,
    );
    const obligations = parsedContract.outcomes.flatMap(
      (item) => item.semantic_fact_bindings.proofs,
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
    const regeneratedContract = createLongTaskCompactContract(
      parsedContract,
      parsedSource.fact_revisions,
      parsedSource.obligation_revisions,
    );
    assert.deepEqual(
      parseDeliveryContractText(JSON.stringify(regeneratedContract)),
      parsedContract,
    );
    assert.ok(
      regeneratedContract.compact_semantic_carrier.exceptions.length > 0,
    );
    const missingException = structuredClone(regeneratedContract);
    missingException.compact_semantic_carrier.exceptions.pop();
    assert.throws(
      () => parseDeliveryContractText(JSON.stringify(missingException)),
      /projection target set mismatch/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
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

test("compact migration regenerates changed Fragment identities only as decision_required", () => {
  const original = materialInput(
    "source.first",
    "Must preserve `API.v1` exactly.",
  );
  const [originalFragment] = scanMaterialTextInput(original).fragments;
  const originalAnchor = deriveSemanticSourceAnchors(originalFragment)[0];
  assert.ok(originalAnchor);
  const manifest = {
    inputs: [
      {
        key: "input.source.first",
        kind: "source_item",
        source_ref: "source.first",
        sha256: original.sha256,
        disposition: "non_ui_material",
        fact_refs: ["fact.first"],
        basis_refs: ["source.first"],
        rationale: "",
      },
      {
        key: "input.fragment.source.first.1",
        kind: "source_fragment",
        source_ref: originalFragment.key,
        sha256: originalFragment.text_sha256,
        disposition: "fact_bearing",
        fact_refs: ["fact.first"],
        basis_refs: ["source.first"],
        rationale: "",
      },
      {
        key: "input.anchor.source.first.1",
        kind: "semantic_anchor",
        source_ref: originalAnchor.key,
        sha256: originalAnchor.value_sha256,
        disposition: "fact_bearing",
        fact_refs: ["fact.first"],
        basis_refs: ["source.first"],
        rationale: "",
      },
    ],
    facts: [
      {
        key: "fact.first",
        provenance: {
          basis_refs: [
            "input.fragment.source.first.1",
            "input.anchor.source.first.1",
          ],
        },
      },
    ],
  };

  const unchanged = structuredClone(manifest);
  const unchangedResult = synchronizeMaterialFragmentProjections(unchanged, [
    original,
  ]);
  assert.equal(unchangedResult.source_fragments_preserved, 1);
  assert.equal(unchangedResult.source_fragments_decision_required, 0);
  assert.equal(unchangedResult.stale_semantic_anchors_removed, 0);
  assert.equal(
    unchanged.inputs.find((input) => input.kind === "source_fragment")
      .disposition,
    "fact_bearing",
  );

  const changed = materialInput(
    "source.first",
    "Must preserve `API.v2` exactly.\n\nA second requirement must remain observable.",
  );
  const result = synchronizeMaterialFragmentProjections(manifest, [changed]);
  const fragments = manifest.inputs.filter(
    (input) => input.kind === "source_fragment",
  );
  assert.equal(result.source_fragments_regenerated, 2);
  assert.equal(result.source_fragments_decision_required, 2);
  assert.equal(result.stale_semantic_anchors_removed, 1);
  assert.ok(result.invalidated_basis_refs_removed >= 2);
  assert.equal(fragments.length, 2);
  assert.ok(
    fragments.every(
      (input) =>
        input.disposition === "decision_required" &&
        input.fact_refs.length === 0 &&
        input.rationale.includes("cannot infer"),
    ),
  );
  assert.deepEqual(manifest.facts[0].provenance.basis_refs, []);
  assert.equal(
    manifest.inputs.some((input) => input.kind === "semantic_anchor"),
    false,
  );
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
  const noncanonical = structuredClone(compact);
  const statistics = materializeCanonicalCompactSharedStructures(
    semanticCompactSharedStructureTargets(noncanonical),
    noncanonical.shared_structures,
    "test-source",
  );
  assert.equal(statistics.remaining_beneficial_candidates, 0);
  assert.ok(statistics.parameterized_family_count > 0);
  assert.ok(
    statistics.families.some(
      (item) => item.boundary === "source.obligation.overrides",
    ),
  );
  assert.ok(
    statistics.families.some(
      (item) => item.boundary === "source.fact.expected",
    ),
  );
  assert.throws(
    () => parseSemanticFactCompactCarrierShape(noncanonical),
    /shared structure catalog is not canonical/u,
  );
  const invalidCatalogDigest = structuredClone(compact);
  invalidCatalogDigest.shared_structures[0].digest = "0".repeat(64);
  assert.throws(
    () => parseSemanticFactCompactCarrierShape(invalidCatalogDigest),
    /digest mismatch/u,
  );
  const unsortedCatalog = structuredClone(compact);
  unsortedCatalog.shared_structures.reverse();
  assert.throws(
    () => parseSemanticFactCompactCarrierShape(unsortedCatalog),
    /shared structure catalog is not canonical/u,
  );
});

function materialInput(inputKey, normalizedText) {
  return {
    input_key: inputKey,
    input_kind: "source_item",
    source_ref: "source.md",
    sha256: sha256Hex(normalizedText),
    authority_source_item_refs: [inputKey],
    authority_domain: "product",
    normalized_text: normalizedText,
  };
}

test("deterministic compact fixture compiles 64 Facts into 128 distinct obligations", async () => {
  await assertSyntheticCompactFixtureCompiles();
});

test("Contract revision mismatch is rejected before first Authority Lock", async () => {
  await assertContractRevisionMismatchRejected();
});
