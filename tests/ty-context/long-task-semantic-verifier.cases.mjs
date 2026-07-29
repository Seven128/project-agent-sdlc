import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  groupFiles,
  semanticAssertionKeys,
  semanticFactObservationRefs,
  semanticRows,
} from "../../tools/semantic_fact_delivery_catalog.mjs";
import { collectSemanticObservations } from "../../tools/semantic_fact_delivery_observations.mjs";
import { resolveSemanticFactResults } from "../../tools/semantic_fact_delivery_verifier_support.mjs";

const manifest = {
  facts: [
    {
      key: "fact.alpha",
      provenance: { authority_ref: "alpha" },
    },
    {
      key: "fact.beta",
      provenance: { authority_ref: "beta" },
    },
  ],
};

test("self-host semantic evidence preserves independent per-Fact outcomes", () => {
  const results = resolveSemanticFactResults(
    manifest,
    {
      alpha: "alpha_result",
      beta: "beta_result",
    },
    {
      alpha_result: true,
      beta_result: false,
    },
  );
  assert.deepEqual(
    [...results],
    [
      ["fact.alpha", true],
      ["fact.beta", false],
    ],
  );
});

test("semantic observations separate infrastructure failure from localized policy sensitivity", () => {
  const requiredFiles = [
    "docs/non-ui-semantic-fact-completeness.md",
    "domain.txt",
  ];
  const files = new Map([
    [
      requiredFiles[0],
      [
        "<!-- ty-source-item:start key=alpha kind=requirement -->",
        "<!-- ty-source-item:start key=no-semantic-fact-shortcuts kind=forbidden_shortcut -->",
        "<!-- ty-source-item:start key=semantic-inventory-is-not-completion kind=non_completing -->",
      ].join("\n"),
    ],
    ["domain.txt", "domain evidence"],
  ]);
  const options = {
    files,
    requiredFiles,
    semanticRows: [["alpha_result", "domain", "alpha"]],
    groupFiles: { domain: ["domain.txt"] },
    buildCode: 0,
    focusedCode: 0,
  };
  const ready = collectSemanticObservations({
    ...options,
    policy:
      "complete_non_ui_semantic_fact_delivery NO_SEMANTIC_FACT_SHORTCUTS SEMANTIC_INVENTORY_IS_NOT_COMPLETION",
  });
  assert.equal(ready.alpha_result, true);
  assert.equal(ready.no_semantic_fact_shortcuts, true);
  assert.equal(ready.semantic_inventory_is_not_completion, true);

  const disabled = collectSemanticObservations({
    ...options,
    policy: "NO_SEMANTIC_FACT_SHORTCUTS SEMANTIC_INVENTORY_IS_NOT_COMPLETION",
  });
  assert.equal(disabled.alpha_result, false);
  assert.equal(disabled.no_semantic_fact_shortcuts, false);
  assert.equal(disabled.semantic_inventory_is_not_completion, false);

  const shortcut = collectSemanticObservations({
    ...options,
    policy:
      "complete_non_ui_semantic_fact_delivery SEMANTIC_FACT_SHORTCUT_USED SEMANTIC_INVENTORY_IS_NOT_COMPLETION",
  });
  assert.equal(shortcut.alpha_result, true);
  assert.equal(shortcut.no_semantic_fact_shortcuts, false);
  assert.equal(shortcut.semantic_inventory_is_not_completion, true);

  assert.throws(
    () =>
      collectSemanticObservations({
        ...options,
        buildCode: 1,
        policy: "complete_non_ui_semantic_fact_delivery",
      }),
    /semantic_delivery_build_failed:1/u,
  );
  assert.throws(
    () =>
      collectSemanticObservations({
        ...options,
        files: new Map([[requiredFiles[0], "source"]]),
        policy: "complete_non_ui_semantic_fact_delivery",
      }),
    /semantic_delivery_input_missing:domain\.txt/u,
  );
});

test("self-host catalog exactly covers the canonical semantic Fact universe", async () => {
  const source = await readFile(
    new URL("../../docs/non-ui-semantic-fact-completeness.md", import.meta.url),
    "utf8",
  );
  const match = source.match(
    /```yaml semantic-fact-manifest-v1\r?\n([\s\S]*?)\r?\n```/u,
  );
  assert.ok(match);
  const canonicalManifest = JSON.parse(match[1]);
  const expectedAuthorityRefs = canonicalManifest.facts
    .map((fact) => fact.provenance.authority_ref)
    .sort();
  assert.equal(expectedAuthorityRefs.length, 79);
  assert.deepEqual(
    Object.keys(semanticFactObservationRefs).sort(),
    expectedAuthorityRefs,
  );
  assert.equal(
    new Set(Object.values(semanticFactObservationRefs)).size,
    expectedAuthorityRefs.length,
  );
  assert.ok(
    semanticRows.every(([, group]) => Object.hasOwn(groupFiles, group)),
  );
  assert.equal(
    new Set(semanticAssertionKeys).size,
    semanticAssertionKeys.length,
  );
});

test("self-host semantic evidence rejects aggregate, incomplete, excess, reused and untyped observations", () => {
  assert.throws(
    () => resolveSemanticFactResults(manifest, "all-facts-pass", {}),
    /semantic_fact_observation_refs_record_required/u,
  );
  assert.throws(
    () =>
      resolveSemanticFactResults(
        manifest,
        { alpha: "alpha_result" },
        { alpha_result: true },
      ),
    /semantic_fact_observation_ref_missing:beta/u,
  );
  assert.throws(
    () =>
      resolveSemanticFactResults(
        manifest,
        {
          alpha: "alpha_result",
          beta: "beta_result",
          gamma: "gamma_result",
        },
        {
          alpha_result: true,
          beta_result: true,
          gamma_result: true,
        },
      ),
    /semantic_fact_observation_ref_unexpected:gamma/u,
  );
  assert.throws(
    () =>
      resolveSemanticFactResults(
        manifest,
        {
          alpha: "all_facts_pass",
          beta: "all_facts_pass",
        },
        { all_facts_pass: true },
      ),
    /semantic_fact_observation_ref_reused:all_facts_pass/u,
  );
  assert.throws(
    () =>
      resolveSemanticFactResults(
        manifest,
        {
          alpha: "alpha_result",
          beta: "beta_result",
        },
        {
          alpha_result: true,
          beta_result: "passed",
        },
      ),
    /semantic_fact_observation_not_boolean:beta:beta_result/u,
  );
});
