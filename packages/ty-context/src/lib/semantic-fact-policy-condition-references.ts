import { semanticFactInvalid } from "./semantic-fact-policy-primitives.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

type Axis = SemanticFactManifestV1["axis_dispositions"][number];
type Condition = SemanticFactManifestV1["conditions"][number];
type Exclusion = SemanticFactManifestV1["condition_exclusions"][number];

export function validateSemanticFactConditionRuleReferences(
  rule: SemanticFactManifestV1["condition_rules"][number],
  outcomeRef: string,
  conditionByRef: Map<string, Condition>,
  exclusionByRef: Map<string, Exclusion>,
): void {
  for (const ref of rule.condition_refs) {
    const row = conditionByRef.get(ref);
    if (!row || row.outcome_ref !== outcomeRef)
      semanticFactInvalid(
        "condition_rule_condition_unknown",
        `${rule.key}:${ref}`,
      );
  }
  for (const ref of rule.exclusion_refs) {
    const row = exclusionByRef.get(ref);
    if (!row || row.outcome_ref !== outcomeRef)
      semanticFactInvalid(
        "condition_rule_exclusion_unknown",
        `${rule.key}:${ref}`,
      );
  }
}

export function validateSemanticFactAxisValueCoverage(
  outcomeRef: string,
  axes: Map<string, Axis>,
  rows: Array<Condition | Exclusion>,
): void {
  for (const axis of axes.values())
    for (const value of axis.values)
      if (
        !rows.some((item) =>
          item.axis_values.some(
            (entry) =>
              entry.axis_ref === axis.key && entry.value_ref === value.key,
          ),
        )
      )
        semanticFactInvalid(
          "axis_value_uncovered",
          `${outcomeRef}:${axis.key}:${value.key}`,
        );
}
