import assert from "node:assert/strict";
import { digestValue } from "./long-task-semantic-fact-test-support.mjs";

export function addFeasibilityDecisionFactInventory(
  manifest,
  outcome,
  identity,
  expectedValue,
) {
  const fragmentBasisRefs = bindSourceInputToFact(manifest, identity);
  const familyKey = `family.custom.feasibility-${identity.slug}`;
  const subjectKey = `subject.feasibility.${identity.slug}`;
  const propertyKey = `property.feasibility.${identity.slug}`;
  const cellKey = `cell.feasibility.${identity.slug}`;
  const condition = manifest.conditions.find(
    (candidate) => candidate.outcome_ref === outcome.key,
  );
  assert.ok(condition);
  const factIndex = manifest.facts.length;
  const proofIndex = manifest.proof_obligations.length;
  manifest.family_dispositions.push({
    key: familyKey,
    family: `custom.feasibility_${identity.slug.replaceAll("-", "_")}`,
    standard: false,
    disposition: "applicable",
    outcome_refs: [outcome.key],
    source_item_refs: [identity.sourceItemRef],
    basis_refs: [identity.sourceItemRef],
    rationale:
      "The exact feasibility decision is an independently decidable delivery semantic.",
  });
  manifest.subjects.push({
    key: subjectKey,
    family_ref: familyKey,
    outcome_ref: outcome.key,
    kind: "feasibility_decision",
    parent_ref: null,
    owner_ref: null,
    source_item_refs: [identity.sourceItemRef],
    basis_refs: [identity.sourceItemRef],
  });
  manifest.property_dispositions.push({
    key: propertyKey,
    family_ref: familyKey,
    property: `custom.feasibility_${identity.slug.replaceAll("-", "_")}`,
    standard: false,
    value_kind: "string",
    required_methods: [identity.method],
    required_evidence_capabilities: [...identity.evidenceCapabilities],
    applicable_unit_refs: [subjectKey],
    not_applicable_unit_refs: [],
    decision_required_unit_refs: [],
    unavailable_unit_refs: [],
    condition_refs: [condition.key],
    source_item_refs: [identity.sourceItemRef],
    basis_refs: [identity.sourceItemRef],
    rationale:
      "The current production feasibility decision must be confirmed at its exact Source granularity.",
  });
  manifest.fact_cells.push({
    key: cellKey,
    outcome_ref: outcome.key,
    unit_ref: subjectKey,
    condition_ref: condition.key,
    property_ref: propertyKey,
    disposition: "specified",
    fact_ref: identity.factKey,
    source_item_refs: [identity.sourceItemRef],
    basis_refs: [identity.sourceItemRef],
    rationale:
      "The feasibility decision is exactly specified by its marked Source item.",
  });
  manifest.facts.push({
    key: identity.factKey,
    cell_ref: cellKey,
    outcome_ref: outcome.key,
    unit_ref: subjectKey,
    family_ref: familyKey,
    condition_ref: condition.key,
    property_ref: propertyKey,
    owner_ref: "owner.fixture",
    value_kind: "string",
    observation_scope: "external_boundary",
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
        material_ref: manifest.key,
        kind: "manifest_pointer",
        value: `/facts/${factIndex}/expected/value`,
      },
      sha256: digestValue(expectedValue),
      value: expectedValue,
    },
    provenance: {
      kind: "direct",
      authority_ref: identity.sourceItemRef,
      basis_refs: [identity.sourceItemRef, ...fragmentBasisRefs],
      derivation: null,
    },
    source_item_refs: [identity.sourceItemRef],
  });
  manifest.proof_obligations.push({
    key: identity.proofKey,
    fact_ref: identity.factKey,
    method: identity.method,
    authority: "external_confirmation",
    proof_surface: identity.proofSurface,
    evidence_capabilities: [...identity.evidenceCapabilities],
    comparison: {
      comparator: "exact_value",
      mode: "exact",
      parameters: {
        representation: "inline",
        locator: {
          material_ref: manifest.key,
          kind: "manifest_pointer",
          value: `/proof_obligations/${proofIndex}/comparison/parameters/value`,
        },
        sha256: digestValue({ comparator: "exact_value" }),
        value: { comparator: "exact_value" },
      },
      tolerance: null,
      mask: null,
    },
    oracle_ref: manifest.oracles[0].key,
    environment_ref: manifest.environments[0].key,
    observer_refs: [],
    counterfactual: {
      disposition: "external",
      refs: [],
      basis_refs: [identity.sourceItemRef],
      rationale:
        "The declared expert supplies the exact feasibility judgment outside package machine authority.",
    },
  });
}

function bindSourceInputToFact(manifest, identity) {
  const sourceInputs = manifest.inputs.filter(
    (input) =>
      (input.kind === "source_item" &&
        input.source_ref === identity.sourceItemRef) ||
      ((input.kind === "source_fragment" || input.kind === "semantic_anchor") &&
        input.basis_refs.includes(identity.sourceItemRef)),
  );
  assert.ok(
    sourceInputs.some((input) => input.kind === "source_item"),
    `feasibility Source input missing: ${identity.sourceItemRef}`,
  );
  assert.ok(
    sourceInputs.some((input) => input.kind === "source_fragment"),
    `feasibility Source Fragment missing: ${identity.sourceItemRef}`,
  );
  for (const sourceInput of sourceInputs) {
    sourceInput.disposition = "fact_bearing";
    sourceInput.fact_refs = [identity.factKey];
    sourceInput.rationale =
      "The exact feasibility decision Source and its fragments own one independent delivery-semantic Fact.";
  }
  for (const fact of manifest.facts) {
    fact.source_item_refs = fact.source_item_refs.filter(
      (sourceRef) => sourceRef !== identity.sourceItemRef,
    );
    fact.provenance.basis_refs = fact.provenance.basis_refs.filter(
      (basisRef) => basisRef !== identity.sourceItemRef,
    );
  }
  return sourceInputs
    .filter((input) => input.kind !== "source_item")
    .map((input) => input.key);
}
