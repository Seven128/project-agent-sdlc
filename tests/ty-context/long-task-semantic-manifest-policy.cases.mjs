import assert from "node:assert/strict";
import test from "node:test";
import { parseSemanticFactManifestShape } from "../../packages/ty-context/dist/lib/semantic-fact-manifest-shape.js";
import {
  semanticFactCollectionIdentity,
  validateSemanticFactManifestPolicy,
} from "../../packages/ty-context/dist/lib/semantic-fact-policy.js";
import { fixtureSemanticManifest } from "./long-task-delivery-fixtures.mjs";
import { refreshFixtureSemanticManifest } from "./long-task-semantic-refresh-fixture.mjs";

test("[critical:non-ui-semantic-fact-closure] semantic Fact manifest closes every standard identity and rejects omission or aggregation", () => {
  assert.doesNotThrow(() =>
    validateSemanticFactManifestPolicy(fixtureSemanticManifest()),
  );

  const cases = [
    [
      "standard family",
      (manifest) => manifest.family_dispositions.pop(),
      /standard_family_universe_mismatch/u,
    ],
    [
      "applicable subject",
      (manifest) => manifest.subjects.pop(),
      /applicable_family_unit_required/u,
    ],
    [
      "standard property",
      (manifest) => manifest.property_dispositions.pop(),
      /standard_property_universe/u,
    ],
    [
      "condition",
      (manifest) => manifest.conditions.pop(),
      /condition_required/u,
    ],
    [
      "Fact Cell",
      (manifest) => manifest.fact_cells.pop(),
      /fact_cell_universe_mismatch/u,
    ],
    [
      "Fact",
      (manifest) => manifest.facts.pop(),
      /fact_cell_fact_unknown|specified_fact_set_mismatch/u,
    ],
    [
      "proof obligation",
      (manifest) => manifest.proof_obligations.pop(),
      /fact_proof_method_universe/u,
    ],
    [
      "Source lineage",
      (manifest) => {
        manifest.subjects[0].source_item_refs = ["missing-source"];
      },
      /subject_source_item_unknown/u,
    ],
    [
      "Inspector capability",
      (manifest) => manifest.inspector.capabilities.pop(),
      /inspector_capability_missing/u,
    ],
    [
      "Oracle capability",
      (manifest) => {
        manifest.oracles[0].capabilities = ["custom.unrelated"];
      },
      /proof_oracle_capability_missing/u,
    ],
    [
      "unresolved property",
      (manifest) => {
        const property = manifest.property_dispositions.find(
          (item) => item.property === "observable_outcome",
        );
        property.decision_required_unit_refs = [
          ...property.applicable_unit_refs,
        ];
        property.applicable_unit_refs = [];
        property.required_methods = [];
        property.required_evidence_capabilities = [];
        property.condition_refs = [];
      },
      /property_unresolved/u,
    ],
    [
      "aggregate state catalogue",
      (manifest) => {
        const axis = manifest.axis_dispositions[0];
        axis.disposition = "applicable";
        axis.values = [
          {
            key: "all-21-state-catalog",
            source_item_refs: ["fixture-architecture"],
            basis_refs: ["fixture-architecture"],
          },
        ];
      },
      /axis_value_not_atomic/u,
    ],
    [
      "blocking unresolved meaning",
      (manifest) => {
        manifest.blockers.push({
          key: "blocker.missing-authority",
          kind: "decision_required",
          affected_refs: ["fact.first.observable"],
          source_item_refs: ["fixture-architecture"],
          owner: "product-owner",
          resolution: "Supply the missing authoritative decision.",
        });
      },
      /blockers_present/u,
    ],
    [
      "duplicate physical input identity",
      (manifest) => {
        const input = structuredClone(manifest.inputs[0]);
        input.key = `${input.key}.duplicate`;
        manifest.inputs.push(input);
      },
      /input_resource_duplicate/u,
    ],
  ];

  for (const [label, mutate, expected] of cases) {
    const manifest = fixtureSemanticManifest();
    mutate(manifest);
    refreshFixtureSemanticManifest(manifest);
    assert.throws(
      () => validateSemanticFactManifestPolicy(manifest),
      expected,
      label,
    );
  }

  const missingCensus = fixtureSemanticManifest();
  missingCensus.inspector.census.pop();
  const censusDeclaration = missingCensus.generation.collections.find(
    (item) => item.name === "inspector_census",
  );
  censusDeclaration.expected_count = missingCensus.inspector.census.length;
  censusDeclaration.identity_sha256 = semanticFactCollectionIdentity(
    missingCensus.inspector.census,
  );
  assert.throws(
    () => validateSemanticFactManifestPolicy(missingCensus),
    /inspector_census_universe_mismatch/u,
  );

  const sampled = fixtureSemanticManifest();
  sampled.generation.sampling = "representative";
  assert.throws(
    () => parseSemanticFactManifestShape(sampled),
    /generation.sampling/u,
  );
});
