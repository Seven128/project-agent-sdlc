import assert from "node:assert/strict";
import test from "node:test";
import { compileAcceptanceReachability } from "../../packages/ty-context/dist/lib/long-task-acceptance-reachability.js";
import { compileProductClaimCoverage } from "../../packages/ty-context/dist/lib/long-task-claims.js";
import { deriveRelevantExternalInputIdentity } from "../../packages/ty-context/dist/lib/long-task-external-confirmation-plan.js";
import { validateLongTaskProofAdequacy } from "../../packages/ty-context/dist/lib/long-task-proof-adequacy.js";
import { validateSourceSemanticConservation } from "../../packages/ty-context/dist/lib/long-task-source-conservation.js";
import { designOwnedSemanticFactProjectionKey } from "../../packages/ty-context/dist/lib/long-task-semantic-fact-input-closure.js";
import { validateSemanticFactManifestPolicy } from "../../packages/ty-context/dist/lib/semantic-fact-policy.js";
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
import { FIXTURE_ARCHITECTURE_CELL_KEY } from "./long-task-semantic-manifest-fixture.mjs";
import {
  digestCanonical,
  digestText,
  refreshFixtureSemanticManifest,
} from "./long-task-semantic-refresh-fixture.mjs";
import {
  addSourceBasis,
  assertion,
  replaceFragmentProjection,
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
  const successorFragmentInput = manifest.inputs.find((input) =>
    input.source_ref.startsWith("replacement-product-requirement#fragment:"),
  );
  replaceFragmentProjection(manifest, items[0], {
    disposition: "superseded",
    factRefs: ["fact.first.observable"],
    basisRefs: [successorFragmentInput.key],
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
  const unsupportedSuccessorInput = unsupported.manifest.inputs.find((input) =>
    input.source_ref.startsWith("empty-product-note#fragment:"),
  );
  replaceFragmentProjection(unsupported.manifest, unsupported.items[0], {
    disposition: "superseded",
    factRefs: ["fact.first.observable"],
    basisRefs: [unsupportedSuccessorInput.key],
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
  replaceFragmentProjection(missing.manifest, missing.items[0], {
    disposition: "supporting_basis",
    factRefs: [],
    basisRefs: [missing.items[0].key],
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
    "Background rationale explaining the selected behavior.",
  );
  valid.manifest.inputs.find(
    (input) =>
      input.kind === "source_item" && input.source_ref === "first-observable",
  ).disposition = "supporting_only";
  replaceFragmentProjection(valid.manifest, valid.items[0], {
    disposition: "supporting_basis",
    factRefs: ["fact.first.observable"],
    basisRefs: [valid.items[0].key],
    rationale: "This fragment explicitly supports the named delivery Fact.",
    supportingRelation: {
      kind: "same_semantic_cell_non_normative",
      fact_ref: "fact.first.observable",
      fact_cell_ref: "cell.first.observable",
    },
  });
  assert.doesNotThrow(() =>
    validateSourceSemanticConservation(valid.items, valid.manifest, new Set()),
  );
});

test("supporting basis cannot use a shared ordinary noun as semantic authority", () => {
  const unrelated = sourceClosureFixture();
  setSourceText(
    unrelated.manifest,
    unrelated.items,
    "first-observable",
    "Users can export their account records.",
  );
  unrelated.manifest.facts[0].expected.value =
    "Users can switch the night display theme.";
  unrelated.manifest.facts[0].expected.sha256 = digestCanonical(
    unrelated.manifest.facts[0].expected.value,
  );
  unrelated.manifest.inputs.find(
    (input) =>
      input.kind === "source_item" && input.source_ref === "first-observable",
  ).disposition = "supporting_only";
  replaceFragmentProjection(unrelated.manifest, unrelated.items[0], {
    disposition: "supporting_basis",
    factRefs: ["fact.first.observable"],
    basisRefs: [unrelated.items[0].key],
    rationale:
      "A shared ordinary noun cannot prove that this independent feature is background.",
  });
  assert.throws(
    () =>
      validateSourceSemanticConservation(
        unrelated.items,
        unrelated.manifest,
        new Set(),
      ),
    /source_supporting_basis_typed_relation_required/u,
  );
});

test("supporting relation must bind its exact Fact cell", () => {
  const mismatched = sourceClosureFixture();
  setSourceText(
    mismatched.manifest,
    mismatched.items,
    "first-observable",
    "Background rationale explaining the selected behavior.",
  );
  mismatched.manifest.inputs.find(
    (input) =>
      input.kind === "source_item" && input.source_ref === "first-observable",
  ).disposition = "supporting_only";
  replaceFragmentProjection(mismatched.manifest, mismatched.items[0], {
    disposition: "supporting_basis",
    factRefs: ["fact.first.observable"],
    basisRefs: [mismatched.items[0].key],
    rationale:
      "The typed relation cannot point at a different or missing cell.",
    supportingRelation: {
      kind: "same_semantic_cell_non_normative",
      fact_ref: "fact.first.observable",
      fact_cell_ref: "cell.unrelated",
    },
  });
  assert.throws(
    () =>
      validateSourceSemanticConservation(
        mismatched.items,
        mismatched.manifest,
        new Set(),
      ),
    /source_supporting_basis_relation_cell_unknown/u,
  );
});

test("scope exclusion requires an independent exact scope-decision Source", () => {
  for (const sourceKey of ["first-observable", "fixture-architecture"]) {
    const { manifest, items } = sourceClosureFixture();
    const material = items.find((item) => item.key === sourceKey);
    const exclusionKey = `exclude-self-${sourceKey}`;
    replaceFragmentProjection(manifest, material, {
      disposition: "scope_excluded",
      factRefs: [],
      basisRefs: [exclusionKey],
      rationale: "A requirement cannot authorize deletion of itself.",
    });
    const fragmentInput = manifest.inputs.find((input) =>
      input.source_ref.startsWith(`${sourceKey}#fragment:`),
    );
    manifest.scope.exclusions.push({
      key: exclusionKey,
      statement: "The Source declares itself excluded.",
      affected_refs: [
        fragmentInput.key,
        sourceKey === "fixture-architecture"
          ? FIXTURE_ARCHITECTURE_CELL_KEY
          : "cell.first.observable",
      ],
      source_item_refs: [sourceKey],
      basis_refs: [sourceKey],
      rationale: "Negative self-authorization control.",
    });
    assert.throws(
      () => validateSourceSemanticConservation(items, manifest, new Set()),
      /source_scope_exclusion_owner_not_independent/u,
    );
  }

  const allowed = sourceClosureFixture();
  addSourceBasis(allowed.manifest, allowed.items, {
    key: "independent-product-scope-decision",
    kind: "decision",
    text: "This exact product option is outside the selected delivery scope.",
    disposition: "non_ui_material",
    factRefs: ["fact.first.observable"],
    fragmentDisposition: "fact_bearing",
  });
  allowed.manifest.facts[0].source_item_refs.push(
    "independent-product-scope-decision",
  );
  const exclusionKey = "exclude-first-by-independent-product-decision";
  replaceFragmentProjection(allowed.manifest, allowed.items[0], {
    disposition: "scope_excluded",
    factRefs: [],
    basisRefs: [exclusionKey],
    rationale: "An independent product decision owns this exact exclusion.",
  });
  const fragmentInput = allowed.manifest.inputs.find((input) =>
    input.source_ref.startsWith("first-observable#fragment:"),
  );
  allowed.manifest.scope.exclusions.push({
    key: exclusionKey,
    statement: "Exclude only the named product Fact cell.",
    affected_refs: [fragmentInput.key, "cell.first.observable"],
    source_item_refs: ["independent-product-scope-decision"],
    basis_refs: ["independent-product-scope-decision"],
    rationale: "Positive independent exact-scope control.",
  });
  assert.doesNotThrow(() =>
    validateSourceSemanticConservation(
      allowed.items,
      allowed.manifest,
      new Set(),
    ),
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
    fragmentDisposition: "supporting_basis",
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
    fragmentDisposition: "supporting_basis",
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
  const designFactRef = designOwnedSemanticFactProjectionKey(
    "fact",
    "design/handoff.md",
    "fact.surface.font-size",
  );
  replaceFragmentProjection(manifest, items[0], {
    disposition: "fact_bearing",
    factRefs: [designFactRef],
    basisRefs: ["first-observable"],
    rationale: "The formal design Fact carries this selected design Fragment.",
  });
  const designFragmentInput = manifest.inputs.find((input) =>
    input.source_ref.startsWith("first-observable#fragment:"),
  );
  const designProjection = {
    source_items: new Set(["first-observable"]),
    facts: [
      {
        key: designFactRef,
        source_item_refs: ["first-observable"],
        basis_refs: [designFragmentInput.key],
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
    /source_projection_fact_unknown/u,
  );
});

test("Semantic census admits only current formal Design projection identities", () => {
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
  const designFactRef = designOwnedSemanticFactProjectionKey(
    "fact",
    "design/handoff.md",
    "fact.surface.font-size",
  );
  replaceFragmentProjection(manifest, items[0], {
    disposition: "fact_bearing",
    factRefs: [designFactRef],
    basisRefs: ["first-observable"],
    rationale: "The formal design Fact carries this selected design Fragment.",
  });
  refreshFixtureSemanticManifest(manifest);

  assert.doesNotThrow(() =>
    validateSemanticFactManifestPolicy(manifest, new Set([designFactRef])),
  );
  assert.throws(
    () => validateSemanticFactManifestPolicy(manifest, new Set()),
    /census_fact_unknown/u,
  );
});
