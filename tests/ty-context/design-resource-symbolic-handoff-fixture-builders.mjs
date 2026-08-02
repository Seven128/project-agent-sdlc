import { designResourceSymbolicObligationKey } from "../../packages/ty-context/dist/lib/design-resource-symbolic-fact-validation.js";
import {
  SYMBOLIC_SOURCE_ITEM_KEY,
  SYMBOLIC_TARGET_KEY,
} from "./design-resource-symbolic-handoff-fixture-constants.mjs";

export function buildFixtureObligations(rules, properties, parameters) {
  const obligations = [];
  for (const projection of rules) {
    const property = properties.find(
      (item) => item.key === projection.rule.property_ref,
    );
    for (const method of property.required_methods) {
      const input = {
        fact_rule_ref: projection.rule.key,
        method,
        region_sha256: projection.compiled.canonical_sha256,
        proof_surface: "ui_browser",
        observation_boundary: `symbolic-rule-region:${method}`,
        comparison: {
          comparator: method === "visual_pixel" ? "pixel_diff" : "exact_value",
          mode: "exact",
          parameters,
          tolerance: null,
          mask: null,
        },
        oracle_ref: "oracle.fixture",
        environment_ref: "environment.fixture",
        protected_value_policy: "plain_exact_observation",
        completion_effect: "required_for_rule_method_region",
      };
      const obligation = {
        key: designResourceSymbolicObligationKey(input),
        ...input,
      };
      obligations.push(obligation);
      projection.rule.semantic_obligation_refs.push(obligation.key);
    }
  }
  return obligations;
}

export function fixtureRuleInput(
  propertyRef,
  valueKind,
  expected,
  censusRefs,
  region,
  subjectRef = "surface.root",
) {
  return {
    subject_or_relation_ref: subjectRef,
    target_ref: SYMBOLIC_TARGET_KEY,
    property_ref: propertyRef,
    population_ref: null,
    quantifier: fixtureOneQuantifier(),
    region,
    expected,
    value_kind: valueKind,
    provenance_ref: "resource.values",
    observation_scope: "full_target",
    observation_sensitivity: "plain",
    lineage: {
      design_system_ref: null,
      token_chain_refs: [],
      override_chain_refs: [],
      resolved_value: structuredClone(expected),
      conflict_status: "none",
      conflict_resolution: "not_applicable",
    },
    evidence_refs: [],
    census_refs: censusRefs,
    source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
  };
}

export function fixtureOneQuantifier() {
  return { kind: "one", minimum: 1, maximum: 1 };
}

export function fixtureCensusRow(
  key,
  kind,
  resourceRef,
  locatorKind,
  value,
  factRefs,
) {
  return {
    key,
    kind,
    resource_ref: resourceRef,
    locator: { kind: locatorKind, value },
    disposition: "covered",
    fact_refs: factRefs,
    fact_cell_refs: [],
    source_item_refs: [SYMBOLIC_SOURCE_ITEM_KEY],
    basis_refs: ["fixture-inspector-census"],
    rationale:
      "Frozen Inspector Census entry supporting exact Rule applicability.",
  };
}
