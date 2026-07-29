import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  groupFiles,
  semanticAssertionKeys,
  semanticFactObservationRefs,
  semanticRows,
} from "../../tools/semantic_fact_delivery_catalog.mjs";
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
