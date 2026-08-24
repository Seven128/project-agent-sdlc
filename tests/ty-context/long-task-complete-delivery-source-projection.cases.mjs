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

test("same-domain supersession requires and accepts a fact-bearing successor Source", () => {
  const { manifest, items } = sourceClosureFixture();
  addSourceBasis(manifest, items, {
    key: "replacement-product-requirement",
    kind: "requirement",
    text: "Replacement outcome.",
    disposition: "non_ui_material",
    factRefs: ["fact.first.observable"],
  });
  manifest.facts[0].source_item_refs.push("replacement-product-requirement");
  const fragment = deriveMaterialSourceFragments(items[0])[0];
  manifest.inputs.push({
    key: "input.same-domain-supersession",
    kind: "source_fragment",
    source_ref: fragment.key,
    sha256: fragment.text_sha256,
    disposition: "superseded",
    fact_refs: [],
    basis_refs: ["replacement-product-requirement"],
    rationale:
      "A newer product Source explicitly replaces the prior product wording.",
  });
  assert.doesNotThrow(() =>
    validateSourceSemanticConservation(items, manifest, new Set()),
  );

  const unsupported = sourceClosureFixture();
  addSourceBasis(unsupported.manifest, unsupported.items, {
    key: "empty-product-note",
    kind: "requirement",
    text: "Replacement note.",
    disposition: "supporting_only",
    factRefs: ["fact.first.observable"],
  });
  const unsupportedFragment = deriveMaterialSourceFragments(
    unsupported.items[0],
  )[0];
  unsupported.manifest.inputs.push({
    key: "input.unsupported-supersession",
    kind: "source_fragment",
    source_ref: unsupportedFragment.key,
    sha256: unsupportedFragment.text_sha256,
    disposition: "superseded",
    fact_refs: [],
    basis_refs: ["empty-product-note"],
    rationale:
      "A same-domain label without projected replacement meaning is insufficient.",
  });
  assert.throws(
    () =>
      validateSourceSemanticConservation(
        unsupported.items,
        unsupported.manifest,
        new Set(),
      ),
    /source_supersession_basis_not_fact_bearing/u,
  );
});

test("explicit supporting Source fragments must name delivery-semantic Facts", () => {
  const missing = sourceClosureFixture();
  setSourceText(
    missing.manifest,
    missing.items,
    "first-observable",
    "Background context for the observable outcome.",
  );
  const missingFragment = deriveMaterialSourceFragments(missing.items[0])[0];
  missing.manifest.inputs.push({
    key: "input.explicit-supporting-missing-fact",
    kind: "source_fragment",
    source_ref: missingFragment.key,
    sha256: missingFragment.text_sha256,
    disposition: "supporting_basis",
    fact_refs: [],
    basis_refs: [missingFragment.source_item_ref],
    rationale:
      "A supporting basis cannot become a hidden requirement container.",
  });
  assert.throws(
    () =>
      validateSourceSemanticConservation(
        missing.items,
        missing.manifest,
        new Set(),
      ),
    /source_supporting_basis_fact_required/u,
  );

  const valid = sourceClosureFixture();
  setSourceText(
    valid.manifest,
    valid.items,
    "first-observable",
    "Background context for the observable outcome.",
  );
  const validFragment = deriveMaterialSourceFragments(valid.items[0])[0];
  valid.manifest.inputs.push({
    key: "input.explicit-supporting-known-fact",
    kind: "source_fragment",
    source_ref: validFragment.key,
    sha256: validFragment.text_sha256,
    disposition: "supporting_basis",
    fact_refs: ["fact.first.observable"],
    basis_refs: [validFragment.source_item_ref],
    rationale: "This fragment explicitly supports the named delivery Fact.",
  });
  assert.doesNotThrow(() =>
    validateSourceSemanticConservation(valid.items, valid.manifest, new Set()),
  );
});

test("canonical execution-target Source remains bounded supporting integrity", () => {
  const valid = sourceClosureFixture();
  const executionTarget = fixtureExecutionTargetSourceRecord();
  addSourceBasis(valid.manifest, valid.items, {
    key: executionTarget.key,
    kind: executionTarget.kind,
    text: executionTarget.statement,
    disposition: "non_ui_material",
    factRefs: ["fact.first.observable"],
  });
  assert.doesNotThrow(() =>
    validateSourceSemanticConservation(valid.items, valid.manifest, new Set()),
  );

  const lookalike = sourceClosureFixture();
  addSourceBasis(lookalike.manifest, lookalike.items, {
    key: "lookalike-execution-target",
    kind: executionTarget.kind,
    text: executionTarget.statement.replace(
      /\}\.$/u,
      ',"hidden_product_rule":"QWeather"}.',
    ),
    disposition: "non_ui_material",
    factRefs: ["fact.first.observable"],
  });
  assert.throws(() =>
    validateSourceSemanticConservation(
      lookalike.items,
      lookalike.manifest,
      new Set(),
    ),
  );
});

test("formal Design Resource Facts project as design-domain delivery semantics", () => {
  const { manifest, items } = sourceClosureFixture();
  setSourceText(
    manifest,
    items,
    "first-observable",
    "The surface must render the declared `16px` design value.",
  );
  const sourceInput = manifest.inputs.find(
    (input) =>
      input.kind === "source_item" && input.source_ref === "first-observable",
  );
  sourceInput.disposition = "ui_design";
  sourceInput.fact_refs = [];
  sourceInput.rationale =
    "The selected-design closure owns this Source item's formal design Facts.";
  const designFactRef =
    "design-resource-fact:design/handoff.md#fact.surface.font-size";
  const designProjection = {
    source_items: new Set(["first-observable"]),
    facts: [
      {
        key: designFactRef,
        source_item_refs: ["first-observable"],
        expected_search_text:
          "fact.surface.font-size\nproperty.font-size\n16px",
      },
    ],
  };

  const result = validateSourceSemanticConservation(
    items,
    manifest,
    designProjection,
  );
  assert.equal(result.fact_classes[designFactRef], "delivery_semantic");
  assert.equal(result.fact_domains[designFactRef], "design");

  assert.throws(
    () =>
      validateSourceSemanticConservation(items, manifest, {
        source_items: new Set(["first-observable"]),
        facts: [],
      }),
    /source_projection_fact_required/u,
  );
});
