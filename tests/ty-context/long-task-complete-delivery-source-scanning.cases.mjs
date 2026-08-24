import assert from "node:assert/strict";
import test from "node:test";
import { compileAcceptanceReachability } from "../../packages/ty-context/dist/lib/long-task-acceptance-reachability.js";
import { compileProductClaimCoverage } from "../../packages/ty-context/dist/lib/long-task-claims.js";
import { deriveRelevantExternalInputIdentity } from "../../packages/ty-context/dist/lib/long-task-external-confirmation-plan.js";
import { validateLongTaskProofAdequacy } from "../../packages/ty-context/dist/lib/long-task-proof-adequacy.js";
import { validateSourceSemanticConservation } from "../../packages/ty-context/dist/lib/long-task-source-conservation.js";
import {
  deriveMaterialSourceFragments,
  deriveSemanticSourceAnchors,
} from "../../packages/ty-context/dist/lib/long-task-source-fragments.js";
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

test("Source conservation blocks missing fragments, anchor loss, and cross-domain override", () => {
  {
    const { manifest, items } = sourceClosureFixture();
    setSourceText(
      manifest,
      items,
      "first-observable",
      "The first outcome must be observable.\n\nThe Finder result must persist.",
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
    const fragment = deriveMaterialSourceFragments(items[0])[0];
    manifest.inputs.push({
      key: "input.cross-domain-supersession",
      kind: "source_fragment",
      source_ref: fragment.key,
      sha256: fragment.text_sha256,
      disposition: "superseded",
      fact_refs: [],
      basis_refs: ["design-demo-note"],
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
    const fragment = deriveMaterialSourceFragments(items[0])[0];
    manifest.inputs.push({
      key: "input.cross-domain-exclusion",
      kind: "source_fragment",
      source_ref: fragment.key,
      sha256: fragment.text_sha256,
      disposition: "scope_excluded",
      fact_refs: [],
      basis_refs: ["design-scope-note"],
      rationale:
        "Historical bad candidate tried to exclude product behavior from a design limitation.",
    });
    manifest.scope.exclusions.push({
      key: "exclude-product-from-design",
      statement:
        "Treat the product requirement as excluded because the mockup is a demo.",
      affected_refs: ["input.cross-domain-exclusion"],
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
      /source_scope_exclusion_same_domain_basis_required/u,
    );
  }
});
