import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { compileAcceptanceReachability } from "../../packages/ty-context/dist/lib/long-task-acceptance-reachability.js";
import { compileProductClaimCoverage } from "../../packages/ty-context/dist/lib/long-task-claims.js";
import { deriveRelevantExternalInputIdentity } from "../../packages/ty-context/dist/lib/long-task-external-confirmation-plan.js";
import { validateLongTaskProofAdequacy } from "../../packages/ty-context/dist/lib/long-task-proof-adequacy.js";
import { deriveMaterialTextInputs } from "../../packages/ty-context/dist/lib/long-task-material-input-closure.js";
import { validateSourceSemanticConservation } from "../../packages/ty-context/dist/lib/long-task-source-conservation.js";
import {
  deriveMaterialSourceFragments,
  deriveSemanticSourceAnchors,
} from "../../packages/ty-context/dist/lib/long-task-source-fragments.js";
import * as sourceFragmentScanner from "../../packages/ty-context/dist/lib/long-task-source-fragments.js";
import {
  completeControl,
  deliveryContract,
  fixtureExecutionTargetSourceRecord,
  fixtureSemanticManifest,
} from "./long-task-delivery-fixtures.mjs";
import { fixtureSourceStatements } from "./long-task-semantic-manifest-fixture.mjs";
import {
  digestCanonical,
  digestText,
} from "./long-task-semantic-refresh-fixture.mjs";
import {
  addSourceBasis,
  assertion,
  replaceFragmentProjection,
  setSourceText,
  sourceClosureFixture,
  sourceItem,
} from "./long-task-complete-delivery-closure-fixture.mjs";

test("material Source scanning conserves bounded fragment classes and frozen identifiers", () => {
  const item = sourceItem(
    "scanner-source",
    "requirement",
    `A material paragraph.

- A list item.
| Column |
| --- |
| Value |
Given the target is ready
当 目标准备完成
key: value

\`\`\`text
plain code body
\`\`\``,
  );
  const fragments = deriveMaterialSourceFragments(item);
  assert.deepEqual(
    fragments
      .filter((fragment) => fragment.kind === "given_when_then")
      .map((fragment) => fragment.normalized_text),
    ["Given the target is ready", "当 目标准备完成"],
  );
  assert.deepEqual(
    [...new Set(fragments.map((fragment) => fragment.kind))].sort(),
    [
      "fenced_code",
      "given_when_then",
      "list_item",
      "paragraph",
      "structured_config_line",
      "table_row",
    ],
  );

  const anchorFragment = deriveMaterialSourceFragments(
    sourceItem(
      "starward-provider-source",
      "requirement",
      "Provider QWeather must call /v2 using protocol JSON-RPC version 2.1 in config.yaml with timeout_ms=500 ms and `Finder`.",
    ),
  )[0];
  const anchors = deriveSemanticSourceAnchors(anchorFragment);
  const values = new Set(
    anchors.map((anchor) => `${anchor.kind}:${anchor.value}`),
  );
  for (const expected of [
    "frozen_identifier:QWeather",
    "frozen_identifier:JSON-RPC",
    "api_path:/v2",
    "version:2.1",
    "file_or_schema_key:config.yaml",
    "file_or_schema_key:timeout_ms",
    "number_or_unit:500 ms",
    "code_mark:Finder",
    "modal_term:must",
  ])
    assert.ok(values.has(expected), `missing semantic anchor ${expected}`);

  const sentencePath = deriveSemanticSourceAnchors(
    deriveMaterialSourceFragments(
      sourceItem("sentence-path", "requirement", "Use /v2."),
    )[0],
  );
  assert.ok(
    sentencePath.some(
      (anchor) => anchor.kind === "api_path" && anchor.value === "/v2",
    ),
  );
});

test("material scanning proves exact nonblank-line coverage including headings, quotes, nested lists, and textual HTML", () => {
  assert.equal(typeof sourceFragmentScanner.scanMaterialTextInput, "function");
  const material = {
    input_key: "input.canonical-spec",
    input_kind: "canonical_spec",
    source_ref: "specs/canonical.md",
    sha256: "a".repeat(64),
    authority_source_item_refs: ["canonical-spec-authority"],
    authority_domain: "technical",
    normalized_text: `# Required behavior

> The provider must use /v2.

- Parent requirement
  - Nested requirement

---

<section data-mode="strict">Textual HTML requirement</section>`,
  };
  const scanned = sourceFragmentScanner.scanMaterialTextInput(material);
  assert.deepEqual(
    scanned.coverage.material_nonblank_lines,
    [1, 3, 5, 6, 8, 10],
  );
  assert.deepEqual(scanned.coverage.excluded_separator_lines, [8]);
  assert.deepEqual(scanned.coverage.covered_lines, [1, 3, 5, 6, 10]);
  assert.deepEqual(
    [...new Set(scanned.fragments.map((fragment) => fragment.kind))].sort(),
    ["blockquote", "heading", "list_item", "textual_html"],
  );
});

test("all strict-UTF-8 material inputs enter fragment closure while unreadable non-design bytes block", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ty-context-material-input-"));
  try {
    const { manifest, items } = sourceClosureFixture();
    const specText =
      "The result must remain observable.\n\nThe result must persist after restart.\n";
    await writeFile(path.join(root, "canonical.md"), specText, "utf8");
    manifest.inputs.push({
      key: "input.canonical-material",
      kind: "canonical_spec",
      source_ref: "canonical.md",
      sha256: digestText(specText),
      disposition: "non_ui_material",
      fact_refs: ["fact.first.observable"],
      basis_refs: ["first-observable"],
      rationale: "Both canonical requirements are material.",
    });
    const material = await deriveMaterialTextInputs(
      root,
      items,
      manifest,
      new Set(),
    );
    const canonical = material.find(
      (input) => input.input_key === "input.canonical-material",
    );
    assert.ok(canonical);
    const fragments =
      sourceFragmentScanner.scanMaterialTextInput(canonical).fragments;
    assert.equal(fragments.length, 2);
    const firstProjection = {
      key: "input.canonical-fragment-1",
      kind: "source_fragment",
      source_ref: fragments[0].key,
      sha256: fragments[0].text_sha256,
      disposition: "fact_bearing",
      fact_refs: ["fact.first.observable"],
      basis_refs: ["input.canonical-material"],
      rationale: "Only the first requirement is intentionally projected here.",
    };
    manifest.inputs.push(firstProjection);
    manifest.facts[0].provenance.basis_refs.push(firstProjection.key);
    assert.throws(
      () =>
        validateSourceSemanticConservation(
          items,
          manifest,
          new Set(),
          material,
        ),
      /source_fragment_disposition_missing/u,
    );

    const invalidBytes = Buffer.from([0xff, 0xfe, 0x00, 0x41]);
    await writeFile(path.join(root, "attachment.bin"), invalidBytes);
    manifest.inputs.push({
      key: "input.invalid-attachment",
      kind: "attachment",
      source_ref: "attachment.bin",
      sha256: createHash("sha256").update(invalidBytes).digest("hex"),
      disposition: "non_ui_material",
      fact_refs: ["fact.first.observable"],
      basis_refs: ["first-observable"],
      rationale: "Unreadable material must fail closed.",
    });
    await assert.rejects(
      deriveMaterialTextInputs(root, items, manifest, new Set()),
      /material_text_input_invalid_utf8/u,
    );

    const binaryDesignManifest = structuredClone(manifest);
    binaryDesignManifest.inputs = binaryDesignManifest.inputs.filter(
      (input) => input.key !== "input.invalid-attachment",
    );
    binaryDesignManifest.inputs.push({
      key: "input.binary-design-resource",
      kind: "design_resource",
      source_ref: "attachment.bin",
      sha256: createHash("sha256").update(invalidBytes).digest("hex"),
      disposition: "ui_design",
      fact_refs: [],
      basis_refs: ["first-observable"],
      rationale: "Formal binary design resources remain design-owned.",
    });
    const withBinaryDesign = await deriveMaterialTextInputs(
      root,
      items,
      binaryDesignManifest,
      new Set(),
    );
    assert.equal(
      withBinaryDesign.some(
        (input) => input.input_key === "input.binary-design-resource",
      ),
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a single broad Source input cannot implicitly disposition its only Fragment", () => {
  const { manifest, items } = sourceClosureFixture({
    explicitFragments: false,
  });
  assert.throws(
    () => validateSourceSemanticConservation(items, manifest, new Set()),
    /source_fragment_disposition_missing/u,
  );
});

test("modal polarity and independent modal requirements remain explicit completion semantics", () => {
  {
    const { manifest, items } = sourceClosureFixture();
    setSourceText(
      manifest,
      items,
      "first-observable",
      "The implementation must not use `DEMO`.",
    );
    manifest.facts[0].expected.value = "DEMO";
    manifest.facts[0].expected.sha256 = digestCanonical("DEMO");
    assert.throws(
      () => validateSourceSemanticConservation(items, manifest, new Set()),
      /semantic_modal_claim_polarity_mismatch/u,
    );
    assert.doesNotThrow(() =>
      validateSourceSemanticConservation(
        items,
        manifest,
        new Set(),
        undefined,
        new Map([["fact.first.observable", new Set(["negative"])]]),
      ),
    );
  }

  {
    const { manifest, items } = sourceClosureFixture();
    setSourceText(
      manifest,
      items,
      "first-observable",
      "The result must remain observable and shall persist.",
    );
    assert.throws(
      () => validateSourceSemanticConservation(items, manifest, new Set()),
      /source_fragment_modal_fact_split_required/u,
    );
  }
});

test("anchor-free but semantically unrelated text cannot masquerade as supporting basis", () => {
  const { manifest, items } = sourceClosureFixture();
  setSourceText(
    manifest,
    items,
    "first-observable",
    "Tenant identity isolation across accounts.",
  );
  replaceFragmentProjection(manifest, items[0], {
    disposition: "supporting_basis",
    factRefs: ["fact.first.observable"],
    basisRefs: ["first-observable"],
    rationale: "Negative control for an unrelated supporting projection.",
  });
  assert.throws(
    () => validateSourceSemanticConservation(items, manifest, new Set()),
    /source_supporting_basis_typed_relation_required/u,
  );
});

test("Source conservation blocks missing fragments, anchor loss, and cross-domain override", () => {
  {
    const { manifest, items } = sourceClosureFixture();
    setSourceText(
      manifest,
      items,
      "first-observable",
      "The first outcome must be observable.\n\nThe Finder result must persist.",
      { explicitFragments: false },
    );
    assert.throws(
      () => validateSourceSemanticConservation(items, manifest, new Set()),
      /source_fragment_disposition_missing/u,
    );
  }

  {
    const { manifest, items } = sourceClosureFixture();
    setSourceText(manifest, items, "first-observable", "Use /v2.");
    const fragment = deriveMaterialSourceFragments(items[0])[0];
    const anchor = deriveSemanticSourceAnchors(fragment).find(
      (candidate) => candidate.kind === "api_path" && candidate.value === "/v2",
    );
    assert.ok(anchor);
    manifest.inputs.push({
      key: "input.explicit-anchor-unrelated-fact",
      kind: "semantic_anchor",
      source_ref: anchor.key,
      sha256: anchor.value_sha256,
      disposition: "fact_bearing",
      fact_refs: ["fact.first.observable"],
      basis_refs: [anchor.source_item_ref],
      rationale:
        "Naming an unrelated delivery Fact must not silently discard the frozen API path.",
    });
    assert.throws(
      () => validateSourceSemanticConservation(items, manifest, new Set()),
      /semantic_anchor_expected_projection_missing/u,
    );

    manifest.facts[0].expected.value = "/v2";
    manifest.facts[0].expected.sha256 = digestCanonical("/v2");
    assert.doesNotThrow(() =>
      validateSourceSemanticConservation(items, manifest, new Set()),
    );
  }

  {
    const { manifest, items } = sourceClosureFixture();
    setSourceText(
      manifest,
      items,
      "first-observable",
      "DATA-005 must use Provider QWeather at /v2 and persist the Finder result.",
    );
    assert.throws(
      () => validateSourceSemanticConservation(items, manifest, new Set()),
      /semantic_anchor_expected_projection_missing/u,
    );
  }

  {
    const { manifest, items } = sourceClosureFixture();
    addSourceBasis(manifest, items, {
      key: "design-demo-note",
      kind: "requirement",
      text: "Use a local demo fixture for visual presentation.",
      disposition: "supporting_only",
      factRefs: ["fact.first.observable"],
    });
    const successorInput = manifest.inputs.find((input) =>
      input.source_ref.startsWith("design-demo-note#fragment:"),
    );
    replaceFragmentProjection(manifest, items[0], {
      disposition: "superseded",
      factRefs: ["fact.first.observable"],
      basisRefs: [successorInput.key],
      rationale:
        "Historical bad candidate tried to let a design demo replace product data semantics.",
    });
    assert.throws(
      () =>
        validateSourceSemanticConservation(
          items,
          manifest,
          new Set(["design-demo-note"]),
        ),
      /source_supersession_domain_mismatch/u,
    );
  }

  {
    const { manifest, items } = sourceClosureFixture();
    addSourceBasis(manifest, items, {
      key: "design-scope-note",
      kind: "requirement",
      text: "The mockup contains demo data only.",
      disposition: "supporting_only",
      factRefs: ["fact.first.observable"],
    });
    const exclusionKey = "exclude-product-from-design";
    replaceFragmentProjection(manifest, items[0], {
      disposition: "scope_excluded",
      factRefs: [],
      basisRefs: [exclusionKey],
      rationale:
        "Historical bad candidate tried to exclude product behavior from a design limitation.",
    });
    const exclusionInput = manifest.inputs.find((input) =>
      input.source_ref.startsWith("first-observable#fragment:"),
    );
    manifest.scope.exclusions.push({
      key: exclusionKey,
      statement:
        "Treat the product requirement as excluded because the mockup is a demo.",
      affected_refs: [exclusionInput.key, "cell.first.observable"],
      source_item_refs: ["design-scope-note"],
      basis_refs: ["design-scope-note"],
      rationale: "Negative regression fixture.",
    });
    assert.throws(
      () =>
        validateSourceSemanticConservation(
          items,
          manifest,
          new Set(["design-scope-note"]),
        ),
      /source_scope_exclusion_same_domain_owner_required/u,
    );
  }
});
