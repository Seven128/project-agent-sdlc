import { SEMANTIC_FACT_DISPOSITIONS } from "./semantic-fact-shape-constants.js";
import {
  semanticArray,
  semanticLiteral,
  semanticObject,
  semanticStableRef,
  semanticStableRefs,
  semanticString,
} from "./semantic-fact-shape-primitives.js";
import {
  parseSemanticFactAxisValues,
  parseSemanticFactBoolean,
} from "./semantic-fact-value-shape.js";

export function parseSemanticFactAxisDispositions(
  value: unknown,
  label: string,
) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "axis",
      "standard",
      "disposition",
      "outcome_refs",
      "values",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      axis: semanticStableRef(row.axis, `${itemLabel}.axis`),
      standard: parseSemanticFactBoolean(row.standard, `${itemLabel}.standard`),
      disposition: semanticLiteral(
        row.disposition,
        SEMANTIC_FACT_DISPOSITIONS,
        `${itemLabel}.disposition`,
      ),
      outcome_refs: semanticStableRefs(
        row.outcome_refs,
        `${itemLabel}.outcome_refs`,
      ),
      values: semanticArray(row.values, `${itemLabel}.values`).map(
        (axisValue, axisIndex) => {
          const axisLabel = `${itemLabel}.values[${axisIndex}]`;
          const entry = semanticObject(axisValue, axisLabel, [
            "key",
            "source_item_refs",
            "basis_refs",
          ]);
          return {
            key: semanticStableRef(entry.key, `${axisLabel}.key`),
            source_item_refs: semanticStableRefs(
              entry.source_item_refs,
              `${axisLabel}.source_item_refs`,
            ),
            basis_refs: semanticStableRefs(
              entry.basis_refs,
              `${axisLabel}.basis_refs`,
            ),
          };
        },
      ),
      source_item_refs: semanticStableRefs(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: semanticStableRefs(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: semanticString(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

export function parseSemanticFactConditionRules(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "outcome_ref",
      "axis_refs",
      "mode",
      "condition_refs",
      "exclusion_refs",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      outcome_ref: semanticStableRef(
        row.outcome_ref,
        `${itemLabel}.outcome_ref`,
      ),
      axis_refs: semanticStableRefs(row.axis_refs, `${itemLabel}.axis_refs`),
      mode: semanticLiteral(
        row.mode,
        ["independent", "cross_product", "explicit_meaningful"] as const,
        `${itemLabel}.mode`,
      ),
      condition_refs: semanticStableRefs(
        row.condition_refs,
        `${itemLabel}.condition_refs`,
      ),
      exclusion_refs: semanticStableRefs(
        row.exclusion_refs,
        `${itemLabel}.exclusion_refs`,
      ),
      source_item_refs: semanticStableRefs(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: semanticStableRefs(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: semanticString(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

export function parseSemanticFactConditions(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "outcome_ref",
      "axis_values",
      "source_item_refs",
      "basis_refs",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      outcome_ref: semanticStableRef(
        row.outcome_ref,
        `${itemLabel}.outcome_ref`,
      ),
      axis_values: parseSemanticFactAxisValues(
        row.axis_values,
        `${itemLabel}.axis_values`,
      ),
      source_item_refs: semanticStableRefs(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: semanticStableRefs(row.basis_refs, `${itemLabel}.basis_refs`),
    };
  });
}

export function parseSemanticFactConditionExclusions(
  value: unknown,
  label: string,
) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "outcome_ref",
      "axis_values",
      "disposition",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      outcome_ref: semanticStableRef(
        row.outcome_ref,
        `${itemLabel}.outcome_ref`,
      ),
      axis_values: parseSemanticFactAxisValues(
        row.axis_values,
        `${itemLabel}.axis_values`,
      ),
      disposition: semanticLiteral(
        row.disposition,
        ["not_applicable", "decision_required", "unavailable"] as const,
        `${itemLabel}.disposition`,
      ),
      source_item_refs: semanticStableRefs(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: semanticStableRefs(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: semanticString(row.rationale, `${itemLabel}.rationale`),
    };
  });
}
