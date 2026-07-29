import {
  isAtomicSemanticFactAtom,
  isCustomSemanticFactName,
  SEMANTIC_FACT_STANDARD_CONDITION_AXES,
} from "./semantic-fact-catalog.js";
import {
  validateSemanticFactAxisValueCoverage,
  validateSemanticFactConditionRuleReferences,
} from "./semantic-fact-policy-condition-references.js";
import {
  assertSameSemanticFactSet,
  canonicalSemanticFactCondition,
  requireSemanticFactBasis,
  requireSemanticFactSubset,
  semanticFactInvalid,
  uniqueNonemptySemanticFacts,
  uniqueSemanticFacts,
  validateSemanticFactCrossProduct,
} from "./semantic-fact-policy-primitives.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

type Axis = SemanticFactManifestV1["axis_dispositions"][number];
type Condition = SemanticFactManifestV1["conditions"][number];
type Exclusion = SemanticFactManifestV1["condition_exclusions"][number];

export function validateSemanticFactAxisAndConditionClosure(
  manifest: SemanticFactManifestV1,
): void {
  validateAxisCatalog(manifest);
  const conditionByRef = new Map(
    manifest.conditions.map((item) => [item.key, item]),
  );
  const exclusionByRef = new Map(
    manifest.condition_exclusions.map((item) => [item.key, item]),
  );
  for (const exclusion of manifest.condition_exclusions)
    if (
      exclusion.disposition === "decision_required" ||
      exclusion.disposition === "unavailable"
    )
      semanticFactInvalid(
        "condition_exclusion_unresolved",
        `${exclusion.key}:${exclusion.disposition}`,
      );
  for (const outcomeRef of manifest.scope.outcome_refs)
    validateOutcomeConditions(
      manifest,
      outcomeRef,
      conditionByRef,
      exclusionByRef,
    );
}

function validateAxisCatalog(manifest: SemanticFactManifestV1): void {
  const standardRows = manifest.axis_dispositions.filter(
    (item) => item.standard,
  );
  uniqueSemanticFacts(
    manifest.axis_dispositions.flatMap((item) =>
      item.outcome_refs.map((outcomeRef) => `${outcomeRef}\0${item.axis}`),
    ),
    "axis_outcome_identity",
  );
  for (const axis of manifest.axis_dispositions) validateAxis(manifest, axis);
  for (const outcomeRef of manifest.scope.outcome_refs)
    for (const axis of SEMANTIC_FACT_STANDARD_CONDITION_AXES) {
      const rows = standardRows.filter(
        (item) => item.axis === axis && item.outcome_refs.includes(outcomeRef),
      );
      if (rows.length !== 1)
        semanticFactInvalid(
          "standard_axis_outcome_disposition_required",
          `${outcomeRef}:${axis}:${rows.length}`,
        );
    }
}

function validateAxis(manifest: SemanticFactManifestV1, axis: Axis): void {
  const isStandard = SEMANTIC_FACT_STANDARD_CONDITION_AXES.includes(
    axis.axis as (typeof SEMANTIC_FACT_STANDARD_CONDITION_AXES)[number],
  );
  if (axis.standard !== isStandard)
    semanticFactInvalid("axis_standard_flag_mismatch", axis.axis);
  if (!axis.standard && !isCustomSemanticFactName(axis.axis))
    semanticFactInvalid("custom_axis_name_required", axis.axis);
  uniqueNonemptySemanticFacts(axis.outcome_refs, `axis_outcomes:${axis.key}`);
  requireSemanticFactSubset(
    axis.outcome_refs,
    manifest.scope.outcome_refs,
    "axis_outcome_unknown",
    axis.key,
  );
  uniqueSemanticFacts(
    axis.values.map((item) => item.key),
    `axis_values:${axis.key}`,
  );
  for (const value of axis.values) {
    if (!isAtomicSemanticFactAtom(value.key))
      semanticFactInvalid("axis_value_not_atomic", `${axis.key}:${value.key}`);
    requireSemanticFactBasis(value, `axis_value:${axis.key}:${value.key}`);
  }
  if (axis.disposition === "applicable" && !axis.values.length)
    semanticFactInvalid("applicable_axis_values_required", axis.key);
  if (axis.disposition !== "applicable" && axis.values.length)
    semanticFactInvalid(
      "inapplicable_axis_values_forbidden",
      `${axis.key}:${axis.disposition}`,
    );
  if (
    axis.disposition === "decision_required" ||
    axis.disposition === "unavailable"
  )
    semanticFactInvalid("axis_unresolved", `${axis.key}:${axis.disposition}`);
  requireSemanticFactBasis(axis, `axis:${axis.key}`);
}

function validateOutcomeConditions(
  manifest: SemanticFactManifestV1,
  outcomeRef: string,
  conditionByRef: Map<string, Condition>,
  exclusionByRef: Map<string, Exclusion>,
): void {
  const applicableAxes = manifest.axis_dispositions.filter(
    (item) =>
      item.disposition === "applicable" &&
      item.outcome_refs.includes(outcomeRef),
  );
  const axisByRef = new Map(applicableAxes.map((item) => [item.key, item]));
  const expectedAxes = [...axisByRef.keys()].sort();
  const conditions = manifest.conditions.filter(
    (item) => item.outcome_ref === outcomeRef,
  );
  const exclusions = manifest.condition_exclusions.filter(
    (item) => item.outcome_ref === outcomeRef,
  );
  if (!conditions.length) semanticFactInvalid("condition_required", outcomeRef);
  validateConditionRows(
    [...conditions, ...exclusions],
    axisByRef,
    expectedAxes,
  );
  uniqueSemanticFacts(
    [...conditions, ...exclusions].map((item) =>
      canonicalSemanticFactCondition(item.axis_values),
    ),
    `condition_combination:${outcomeRef}`,
  );
  const rules = manifest.condition_rules.filter(
    (item) => item.outcome_ref === outcomeRef,
  );
  if (!applicableAxes.length) {
    if (rules.length)
      semanticFactInvalid("condition_rules_without_axes", outcomeRef);
    if (
      conditions.length !== 1 ||
      conditions[0].axis_values.length ||
      exclusions.length
    )
      semanticFactInvalid("baseline_condition_required", outcomeRef);
    return;
  }
  if (rules.length !== 1)
    semanticFactInvalid(
      "condition_rule_complete_expansion_required",
      `${outcomeRef}:${rules.length}`,
    );
  validateOutcomeConditionRule(
    rules[0],
    outcomeRef,
    axisByRef,
    expectedAxes,
    conditions,
    exclusions,
    conditionByRef,
    exclusionByRef,
  );
}

function validateConditionRows(
  rows: Array<Condition | Exclusion>,
  axisByRef: Map<string, Axis>,
  expectedAxes: string[],
): void {
  for (const row of rows) {
    uniqueSemanticFacts(
      row.axis_values.map((item) => item.axis_ref),
      `condition_axis:${row.key}`,
    );
    assertSameSemanticFactSet(
      row.axis_values.map((item) => item.axis_ref),
      expectedAxes,
      `condition_axis_set:${row.key}`,
    );
    for (const axisValue of row.axis_values) {
      const axis = axisByRef.get(axisValue.axis_ref);
      if (!axis)
        semanticFactInvalid(
          "condition_axis_unknown",
          `${row.key}:${axisValue.axis_ref}`,
        );
      if (!axis.values.some((item) => item.key === axisValue.value_ref))
        semanticFactInvalid(
          "condition_axis_value_unknown",
          `${row.key}:${axisValue.axis_ref}:${axisValue.value_ref}`,
        );
    }
    requireSemanticFactBasis(row, `condition:${row.key}`);
  }
}

function validateOutcomeConditionRule(
  rule: SemanticFactManifestV1["condition_rules"][number],
  outcomeRef: string,
  axisByRef: Map<string, Axis>,
  expectedAxes: string[],
  conditions: Condition[],
  exclusions: Exclusion[],
  conditionByRef: Map<string, Condition>,
  exclusionByRef: Map<string, Exclusion>,
): void {
  assertSameSemanticFactSet(
    rule.axis_refs,
    expectedAxes,
    `condition_rule_axis_universe:${outcomeRef}`,
  );
  uniqueNonemptySemanticFacts(
    rule.axis_refs,
    `condition_rule_axes:${rule.key}`,
  );
  uniqueSemanticFacts(
    rule.condition_refs,
    `condition_rule_conditions:${rule.key}`,
  );
  uniqueSemanticFacts(
    rule.exclusion_refs,
    `condition_rule_exclusions:${rule.key}`,
  );
  requireSemanticFactBasis(rule, `condition_rule:${rule.key}`);
  validateSemanticFactConditionRuleReferences(
    rule,
    outcomeRef,
    conditionByRef,
    exclusionByRef,
  );
  if (!rule.condition_refs.length && !rule.exclusion_refs.length)
    semanticFactInvalid("condition_rule_cells_required", rule.key);
  validateSemanticFactCrossProduct(
    rule,
    axisByRef,
    conditionByRef,
    exclusionByRef,
  );
  assertSameSemanticFactSet(
    rule.condition_refs,
    conditions.map((item) => item.key),
    `condition_rule_condition_closure:${outcomeRef}`,
  );
  assertSameSemanticFactSet(
    rule.exclusion_refs,
    exclusions.map((item) => item.key),
    `condition_rule_exclusion_closure:${outcomeRef}`,
  );
  validateSemanticFactAxisValueCoverage(outcomeRef, axisByRef, [
    ...conditions,
    ...exclusions,
  ]);
}
