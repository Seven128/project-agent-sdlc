import assert from "node:assert/strict";
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
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
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { runLongTaskCompactAuthoring } from "../../packages/ty-context/dist/lib/long-task-compact-authoring-service.js";
import { commitActiveAuthority } from "../../packages/ty-context/dist/lib/long-task-state.js";
import { createSemanticFactCompactCarrier } from "../../packages/ty-context/dist/lib/semantic-fact-compact-authoring.js";
import { parseSemanticFactCompactCarrierShape } from "../../packages/ty-context/dist/lib/semantic-fact-compact-carrier.js";
import { semanticCompactSharedStructureTargets } from "../../packages/ty-context/dist/lib/semantic-fact-compact-support.js";
import { validateSemanticFactManifestPolicy } from "../../packages/ty-context/dist/lib/semantic-fact-policy.js";
import {
  locateSemanticFactManifestBlockSpans,
  parseSemanticFactManifestBlocks,
} from "../../packages/ty-context/dist/lib/semantic-fact-source-parser.js";
import {
  canonicalValueJson,
  parseStrictYaml,
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

test("[critical:compact-authoring-command] check/apply is equivalent, byte-preserving outside the block, and idempotent", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const sourceFile = path.join(fixture.root, "source.md");
    const contractFile = path.join(
      fixture.workdir,
      "delivery-contract.yaml",
    );
    const initialSource = `${(
      await readFile(sourceFile, "utf8")
    ).replace(/\r?\n/gu, "\r\n")}<!-- retained-after-formal-block -->\r\n`;
    await writeFile(sourceFile, initialSource, "utf8");
    const [initialSpan] = locateSemanticFactManifestBlockSpans(
      "source.md",
      initialSource,
    );
    const retained = outsideFormalBlock(initialSource, initialSpan);

    const preview = await runLongTaskCompactAuthoring(
      fixture.root,
      fixture.workdir,
    );
    assert.equal(preview.status, "equivalent_projection_available");
    assert.equal(preview.apply_allowed, true);
    assert.ok(preview.canonical_bytes.combined.reduction_ratio >= 0.1);
    assert.ok(Object.values(preview.equivalence).every(Boolean));
    assert.deepEqual(
      [
        preview.counts.facts_before,
        preview.counts.obligations_before,
        preview.counts.assertions_before,
      ],
      [
        preview.counts.facts_after,
        preview.counts.obligations_after,
        preview.counts.assertions_after,
      ],
    );
    assert.match(preview.repair_command, /compact-authoring .* --apply$/u);

    const applied = await runLongTaskCompactAuthoring(
      fixture.root,
      fixture.workdir,
      { apply: true },
    );
    assert.equal(applied.status, "already_compact");
    assert.equal(applied.applied, true);
    const sourceAfter = await readFile(sourceFile, "utf8");
    const [afterSpan] = locateSemanticFactManifestBlockSpans(
      "source.md",
      sourceAfter,
    );
    assert.equal(afterSpan.kind, "semantic-fact-compact-carrier-v1");
    assert.equal(afterSpan.line_ending, "\r\n");
    assert.equal(outsideFormalBlock(sourceAfter, afterSpan), retained);
    assert.equal(
      parseSemanticFactManifestBlocks("source.md", sourceAfter)[0].carrier,
      "compact_v1",
    );
    const contractAfter = await readFile(contractFile, "utf8");
    assert.equal(
      Object.hasOwn(parseStrictYaml(contractAfter), "compact_semantic_carrier"),
      true,
    );

    const idempotent = await runLongTaskCompactAuthoring(
      fixture.root,
      fixture.workdir,
      { apply: true },
    );
    assert.equal(idempotent.status, "already_compact");
    assert.equal(idempotent.applied, false);
    assert.equal(await readFile(sourceFile, "utf8"), sourceAfter);
    assert.equal(await readFile(contractFile, "utf8"), contractAfter);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("compact authoring CAS and mid-publication failures cannot partially publish carriers", async () => {
  const casFixture = await createDeliveryFixture();
  try {
    const sourceFile = path.join(casFixture.root, "source.md");
    const contractFile = path.join(
      casFixture.workdir,
      "delivery-contract.yaml",
    );
    const sourceBefore = await readFile(sourceFile, "utf8");
    const contractBefore = await readFile(contractFile, "utf8");
    const concurrentSource = `${sourceBefore}\n<!-- concurrent-owner-change -->\n`;
    const result = await runLongTaskCompactAuthoring(
      casFixture.root,
      casFixture.workdir,
      {
        apply: true,
        async before_second_cas() {
          await writeFile(sourceFile, concurrentSource, "utf8");
        },
      },
    );
    assert.equal(result.status, "blocked");
    assert.equal(result.diagnostic_code, "compact_authoring_cas_conflict");
    assert.equal(await readFile(sourceFile, "utf8"), concurrentSource);
    assert.equal(await readFile(contractFile, "utf8"), contractBefore);
    await assertNoCompactTransactionRemainders(
      casFixture.root,
      casFixture.workdir,
    );
  } finally {
    await rm(casFixture.root, { recursive: true, force: true });
  }

  const rollbackFixture = await createDeliveryFixture();
  try {
    const sourceFile = path.join(rollbackFixture.root, "source.md");
    const contractFile = path.join(
      rollbackFixture.workdir,
      "delivery-contract.yaml",
    );
    const sourceBefore = await readFile(sourceFile);
    const contractBefore = await readFile(contractFile);
    const result = await runLongTaskCompactAuthoring(
      rollbackFixture.root,
      rollbackFixture.workdir,
      {
        apply: true,
        async before_publish(index) {
          if (index === 1) throw new Error("synthetic_second_publish_failure");
        },
      },
    );
    assert.equal(result.status, "blocked");
    assert.equal(result.diagnostic_code, "synthetic_second_publish_failure");
    assert.deepEqual(await readFile(sourceFile), sourceBefore);
    assert.deepEqual(await readFile(contractFile), contractBefore);
    await assertNoCompactTransactionRemainders(
      rollbackFixture.root,
      rollbackFixture.workdir,
    );
  } finally {
    await rm(rollbackFixture.root, { recursive: true, force: true });
  }
});

test("compact post-commit cleanup failure preserves both committed carriers and reports retained backup", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const sourceFile = path.join(fixture.root, "source.md");
    const contractFile = path.join(fixture.workdir, "delivery-contract.yaml");
    const contractBefore = await readFile(contractFile);
    const result = await runLongTaskCompactAuthoring(fixture.root, fixture.workdir, {
      apply: true,
      async before_backup_cleanup(index) {
        if (index === 1) throw new Error("synthetic_second_cleanup_failure");
      },
    });
    const sourceAfter = await readFile(sourceFile, "utf8");
    const contractAfter = await readFile(contractFile, "utf8");
    assert.equal(result.status, "blocked");
    assert.equal(result.applied, true);
    assert.equal(result.diagnostic_code, "compact_authoring_cleanup_failed");
    assert.match(result.reason, /synthetic_second_cleanup_failure/u);
    assert.equal(parseSemanticFactManifestBlocks("source.md", sourceAfter)[0].carrier, "compact_v1");
    assert.equal(Object.hasOwn(parseStrictYaml(contractAfter), "compact_semantic_carrier"), true);
    const leftovers = (await readdir(fixture.workdir)).filter((name) => name.includes(".ty-context-compact-") && name.endsWith(".bak"));
    assert.equal(leftovers.length, 1);
    assert.deepEqual(await readFile(path.join(fixture.workdir, leftovers[0])), contractBefore);
    assert.ok(result.reason.includes(leftovers[0]));
    const retry = await runLongTaskCompactAuthoring(fixture.root, fixture.workdir, { apply: true });
    assert.equal(retry.status, "already_compact");
    assert.equal(retry.applied, false);
    assert.equal(await readFile(sourceFile, "utf8"), sourceAfter);
    assert.equal(await readFile(contractFile, "utf8"), contractAfter);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("compact advice is non-blocking in Preflight and application is impossible after Authority Lock", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "ready");
    const diagnostic = preflight.diagnostics.find(
      (item) => item.code === "equivalent_compact_representation_available",
    );
    assert.equal(diagnostic.level, "warning");
    assert.match(diagnostic.repair_hint, /compact-authoring .* --apply$/u);

    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    await commitActiveAuthority({
      candidate: compiled,
      expected_previous_identity: null,
    });
    const sourceFile = path.join(fixture.root, "source.md");
    const contractFile = path.join(
      fixture.workdir,
      "delivery-contract.yaml",
    );
    const sourceBefore = await readFile(sourceFile);
    const contractBefore = await readFile(contractFile);
    const result = await runLongTaskCompactAuthoring(
      fixture.root,
      fixture.workdir,
      { apply: true },
    );
    assert.equal(result.status, "blocked");
    assert.equal(result.authority_lock_present, true);
    assert.equal(
      result.diagnostic_code,
      "compact_authoring_authority_lock_present",
    );
    assert.deepEqual(await readFile(sourceFile), sourceBefore);
    assert.deepEqual(await readFile(contractFile), contractBefore);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function outsideFormalBlock(content, span) {
  return `${content.slice(0, span.start_offset)}${content.slice(span.end_offset)}`;
}

async function assertNoCompactTransactionRemainders(...directories) {
  for (const directory of directories)
    assert.deepEqual(
      (await readdir(directory)).filter((entry) =>
        entry.includes(".ty-context-compact-"),
      ),
      [],
    );
}
