import {
  digestCanonical,
} from "./long-task-semantic-refresh-fixture.mjs";

export function fixtureSemanticFactRecords({
  outcomeKeys,
  manifestKey,
  inputs,
  externalConfirmation,
}) {
  const trueDigest = digestCanonical(true);
  const facts = outcomeKeys.map((outcome, index) => ({
    key: `fact.${outcome}.observable`,
    cell_ref: `cell.${outcome}.observable`,
    outcome_ref: outcome,
    unit_ref: `subject.${outcome}.outcome`,
    family_ref: "family.goal-scope-glossary",
    condition_ref: `condition.${outcome}.baseline`,
    property_ref: "property.observable-outcome",
    owner_ref: "owner.fixture",
    value_kind: "boolean",
    observation_scope: "product_boundary",
    observation_sensitivity: "plain",
    quantifier: {
      kind: "one",
      minimum: null,
      maximum: null,
      population_ref: null,
    },
    expected: {
      representation: "inline",
      locator: {
        material_ref: manifestKey,
        kind: "manifest_pointer",
        value: `/facts/${index}/expected/value`,
      },
      sha256: trueDigest,
      value: true,
    },
    provenance: {
      kind: "direct",
      authority_ref: `${outcome}-observable`,
      basis_refs: [
        `${outcome}-observable`,
        "fixture-architecture",
        ...(externalConfirmation ? ["fixture-external"] : []),
        ...inputs
          .filter(
            (input) =>
              input.kind !== "source_item" &&
              input.fact_refs.includes(`fact.${outcome}.observable`),
          )
          .map((input) => input.key),
      ],
      derivation: null,
    },
    source_item_refs: [
      `${outcome}-observable`,
      "fixture-architecture",
      ...(externalConfirmation ? ["fixture-external"] : []),
    ],
  }));
  const comparisonParameters = {
    representation: "inline",
    locator: {
      material_ref: manifestKey,
      kind: "manifest_pointer",
      value: "/proof_obligations/0/comparison/parameters/value",
    },
    sha256: digestCanonical({ comparator: "exact_value" }),
    value: { comparator: "exact_value" },
  };
  const proofObligations = outcomeKeys.map((outcome, index) => ({
    key: `proof.${outcome}.observable.exact`,
    fact_ref: `fact.${outcome}.observable`,
    method: "exact_value",
    authority: "machine",
    proof_surface: "runtime_behavior",
    evidence_capabilities: ["semantic_fact"],
    comparison: {
      comparator: "exact_value",
      mode: "exact",
      parameters: {
        ...structuredClone(comparisonParameters),
        locator: {
          ...comparisonParameters.locator,
          value: `/proof_obligations/${index}/comparison/parameters/value`,
        },
      },
      tolerance: null,
      mask: null,
    },
    oracle_ref: "oracle.fixture-semantic",
    environment_ref: "environment.fixture",
    observer_refs: [],
    counterfactual: {
      disposition: "required",
      refs: [`remove-${outcome}-state`],
      basis_refs: ["fixture-architecture"],
      rationale:
        "Replacing the owning state must fail the exact Fact assertion.",
    },
  }));
  return {
    facts,
    proofObligations,
    environments: [
      {
        key: "environment.fixture",
        identity: "fixture-process-v1",
        definition: {
          representation: "inline",
          locator: {
            material_ref: manifestKey,
            kind: "manifest_pointer",
            value: "/environments/0/definition/value",
          },
          sha256: digestCanonical({ runtime: "fixture-process" }),
          value: { runtime: "fixture-process" },
        },
      },
    ],
    oracles: [
      {
        key: "oracle.fixture-semantic",
        trust: "named_external_tcb",
        identity: "fixture-semantic-oracle",
        version: "1.0.0",
        sha256: null,
        capabilities: ["exact_value"],
      },
    ],
  };
}
