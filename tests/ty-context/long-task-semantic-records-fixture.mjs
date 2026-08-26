import { digestCanonical } from "./long-task-semantic-refresh-fixture.mjs";

export function fixtureSemanticFactRecords({
  outcomeKeys,
  manifestKey,
  inputs,
  architectureFacts,
  externalFacts = [],
}) {
  const trueDigest = digestCanonical(true);
  const outcomeFacts = outcomeKeys.map((outcome, index) => {
    const sourceItemRefs = inputs
      .filter(
        (input) =>
          input.kind === "source_item" &&
          input.fact_refs.includes(`fact.${outcome}.observable`),
      )
      .map((input) => input.source_ref);
    return {
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
          ...sourceItemRefs,
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
      source_item_refs: [...sourceItemRefs],
    };
  });
  const architectureFactIndex = outcomeFacts.length;
  const externalFactIndex = architectureFactIndex + architectureFacts.length;
  const facts = [
    ...outcomeFacts,
    ...architectureFacts.map((architectureFact, index) => {
      const architectureSourceRefs = inputs
        .filter(
          (input) =>
            input.kind === "source_item" &&
            input.fact_refs.includes(architectureFact.factKey),
        )
        .map((input) => input.source_ref);
      return {
        key: architectureFact.factKey,
        cell_ref: architectureFact.cellKey,
        outcome_ref: architectureFact.outcomeKey,
        unit_ref: architectureFact.subjectKey,
        family_ref: architectureFact.familyKey,
        condition_ref: architectureFact.conditionKey,
        property_ref: architectureFact.propertyKey,
        owner_ref: "owner.fixture",
        value_kind: "boolean",
        observation_scope: "service_boundary",
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
            value: `/facts/${architectureFactIndex + index}/expected/value`,
          },
          sha256: trueDigest,
          value: true,
        },
        provenance: {
          kind: "direct",
          authority_ref: "fixture-architecture",
          basis_refs: [
            ...architectureSourceRefs,
            ...inputs
              .filter(
                (input) =>
                  input.kind !== "source_item" &&
                  input.fact_refs.includes(architectureFact.factKey),
              )
              .map((input) => input.key),
          ],
          derivation: null,
        },
        source_item_refs: [...architectureSourceRefs],
      };
    }),
    ...externalFacts.map((externalFact, index) => {
      const externalSourceRefs = inputs
        .filter(
          (input) =>
            input.kind === "source_item" &&
            input.fact_refs.includes(externalFact.factKey),
        )
        .map((input) => input.source_ref);
      return {
        key: externalFact.factKey,
        cell_ref: externalFact.cellKey,
        outcome_ref: externalFact.outcomeKey,
        unit_ref: externalFact.subjectKey,
        family_ref: externalFact.familyKey,
        condition_ref: externalFact.conditionKey,
        property_ref: externalFact.propertyKey,
        owner_ref: `owner.${externalFact.sourceKey}`,
        value_kind: "boolean",
        observation_scope: "operational_boundary",
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
            value: `/facts/${externalFactIndex + index}/expected/value`,
          },
          sha256: trueDigest,
          value: true,
        },
        provenance: {
          kind: "direct",
          authority_ref: externalFact.sourceKey,
          basis_refs: [
            ...externalSourceRefs,
            ...inputs
              .filter(
                (input) =>
                  input.kind !== "source_item" &&
                  input.fact_refs.includes(externalFact.factKey),
              )
              .map((input) => input.key),
          ],
          derivation: null,
        },
        source_item_refs: [...externalSourceRefs],
      };
    }),
  ];
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
  const proofObligations = [
    ...outcomeKeys.map((outcome, index) => ({
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
    })),
    ...architectureFacts.map((architectureFact, index) => ({
      key: architectureFact.proofKey,
      fact_ref: architectureFact.factKey,
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
            value: `/proof_obligations/${outcomeKeys.length + index}/comparison/parameters/value`,
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
        refs: [`remove-${architectureFact.outcomeKey}-state`],
        basis_refs: ["fixture-architecture"],
        rationale:
          "Replacing the fixture state must fail the architecture boundary Fact.",
      },
    })),
    ...externalFacts.map((externalFact, index) => ({
      key: externalFact.proofKey,
      fact_ref: externalFact.factKey,
      method: "exact_value",
      authority: "external_confirmation",
      proof_surface: "runtime_behavior",
      evidence_capabilities: ["semantic_fact"],
      comparison: {
        comparator: "exact_value",
        mode: "exact",
        parameters: {
          ...structuredClone(comparisonParameters),
          locator: {
            ...comparisonParameters.locator,
            value: `/proof_obligations/${outcomeKeys.length + architectureFacts.length + index}/comparison/parameters/value`,
          },
        },
        tolerance: null,
        mask: null,
      },
      oracle_ref: "oracle.fixture-semantic",
      environment_ref: "environment.fixture",
      observer_refs: [],
      counterfactual: {
        disposition: "external",
        refs: [],
        basis_refs: [externalFact.sourceKey],
        rationale:
          "The authorized human supplies this subjective acceptance decision outside machine authority.",
      },
    })),
  ];
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
