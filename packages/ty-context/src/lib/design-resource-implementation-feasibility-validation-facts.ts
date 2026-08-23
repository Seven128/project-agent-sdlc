import type {
  DesignResourceImplementationFeasibilityCellV1,
  DesignResourceImplementationFeasibilityV1,
} from "./design-resource-implementation-feasibility-types.js";
import type { DesignResourceImplementationFeasibilityTargetModel } from "./design-resource-implementation-feasibility-model.js";
import {
  assertSameSet,
  invalidFeasibility,
} from "./design-resource-implementation-feasibility-validation-support.js";
import { createSymbolicDenotationCompilationSession } from "./symbolic-denotation-engine.js";

export function validateDesignFactRefs(
  cell: DesignResourceImplementationFeasibilityCellV1,
  model: DesignResourceImplementationFeasibilityTargetModel,
  document: DesignResourceImplementationFeasibilityV1,
): void {
  if (model.representation === "fact_cells_v1") {
    validateV1FactRefs(cell, model, document);
    return;
  }
  validateV2RuleRefs(cell, model, document);
}

function validateV1FactRefs(
  cell: DesignResourceImplementationFeasibilityCellV1,
  model: Extract<
    DesignResourceImplementationFeasibilityTargetModel,
    { representation: "fact_cells_v1" }
  >,
  document: DesignResourceImplementationFeasibilityV1,
): void {
  if (document.condition_model.kind !== "explicit_conditions_v1")
    invalidFeasibility("v1_explicit_condition_model_required", cell.key);
  const profile = document.condition_model.profiles.find(
    (item) => item.key === cell.condition_profile_ref,
  )!;
  for (const ref of cell.design_fact_refs) {
    const fact = model.facts.get(ref);
    if (!fact)
      invalidFeasibility("cell_design_fact_unknown", `${cell.key}:${ref}`);
    if (
      fact.target_ref !== cell.target_ref ||
      !model.component_family_subject_refs
        .get(cell.component_family_ref)!
        .has(fact.subject_ref) ||
      !profile.condition_refs.includes(fact.condition_ref)
    )
      invalidFeasibility(
        "cell_design_fact_scope_mismatch",
        `${cell.key}:${ref}`,
      );
  }
  const expectedRefs = [...model.facts.entries()]
    .filter(
      ([, fact]) =>
        fact.target_ref === cell.target_ref &&
        model.component_family_subject_refs
          .get(cell.component_family_ref)!
          .has(fact.subject_ref) &&
        profile.condition_refs.includes(fact.condition_ref),
    )
    .map(([ref]) => ref);
  assertSameSet(
    cell.design_fact_refs,
    expectedRefs,
    "cell_design_fact_set_mismatch",
  );
}

function validateV2RuleRefs(
  cell: DesignResourceImplementationFeasibilityCellV1,
  model: Extract<
    DesignResourceImplementationFeasibilityTargetModel,
    { representation: "symbolic_rules_v2" }
  >,
  document: DesignResourceImplementationFeasibilityV1,
): void {
  if (document.condition_model.kind !== "symbolic_regions_v2")
    invalidFeasibility("v2_symbolic_condition_model_required", cell.key);
  const profile = document.condition_model.profiles.find(
    (item) => item.key === cell.condition_profile_ref,
  )!;
  const referencedRules = cell.design_fact_refs.map((ref) => {
    const rule = model.fact_rules.get(ref);
    if (!rule)
      invalidFeasibility("cell_design_rule_unknown", `${cell.key}:${ref}`);
    return rule;
  });
  const familyRules = [...model.fact_rules.values()].filter(
    (rule) =>
      rule.target_ref === cell.target_ref &&
      model.component_family_subject_refs
        .get(cell.component_family_ref)!
        .has(rule.subject_or_relation_ref),
  );
  const compilation = createSymbolicDenotationCompilationSession(
    model.axis_domains,
    [
      model.reachable_region,
      profile.region,
      ...familyRules.map((rule) => rule.region),
    ],
  );
  for (const rule of referencedRules) {
    if (
      rule.target_ref !== cell.target_ref ||
      !model.component_family_subject_refs
        .get(cell.component_family_ref)!
        .has(rule.subject_or_relation_ref)
    )
      invalidFeasibility(
        "cell_design_rule_scope_mismatch",
        `${cell.key}:${rule.key}`,
      );
    const intersection = compilation.compile({
      op: "all",
      predicates: [profile.region, rule.region],
    });
    if (intersection.canonical_dag.root_ref === "terminal.false")
      invalidFeasibility(
        "cell_design_rule_condition_mismatch",
        `${cell.key}:${rule.key}`,
      );
  }
  const expectedRefs = familyRules
    .filter((rule) => {
      const intersection = compilation.compile({
        op: "all",
        predicates: [profile.region, rule.region],
      });
      return intersection.canonical_dag.root_ref !== "terminal.false";
    })
    .map((rule) => rule.key);
  assertSameSet(
    cell.design_fact_refs,
    expectedRefs,
    "cell_design_rule_set_mismatch",
  );
}
