import {
  DESIGN_RESOURCE_VARIATION_AXES,
  type DesignResourceAxisDispositionV1,
  type DesignResourceConditionCombinationDispositionV1,
  type DesignResourceSubjectVariationV1,
  type DesignResourceVariationAxisDispositionV1,
  type DesignResourceVariationCombinationDispositionV1,
} from "./design-resource-fact-manifest-types.js";
import {
  atomicAxisValue,
  contractKey,
  sourceItemKeys,
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import {
  array,
  literal,
  object,
  string,
} from "./long-task-shape-primitives.js";

export function parseDesignResourceAxisDispositions(
  value: unknown,
  label = "design_resource_handoff.axis_dispositions",
): DesignResourceAxisDispositionV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "target_ref",
      "axis",
      "disposition",
      "values",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      target_ref: contractKey(row.target_ref, `${itemLabel}.target_ref`),
      axis: stableKey(row.axis, `${itemLabel}.axis`),
      disposition: literal(
        row.disposition,
        ["applicable", "not_applicable"] as const,
        `${itemLabel}.disposition`,
      ),
      values: parseAxisValues(row.values, `${itemLabel}.values`),
      source_item_refs: sourceItemKeys(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: stableKeys(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: string(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

function parseAxisValues(value: unknown, label: string) {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, ["key", "census_refs"]);
    return {
      key: atomicAxisValue(row.key, `${itemLabel}.key`),
      census_refs: stableKeys(row.census_refs, `${itemLabel}.census_refs`),
    };
  });
}

export function parseDesignResourceConditionExclusions(
  value: unknown,
  label = "design_resource_handoff.condition_exclusions",
): DesignResourceConditionCombinationDispositionV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "target_ref",
      "axis_values",
      "disposition",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      target_ref: contractKey(row.target_ref, `${itemLabel}.target_ref`),
      axis_values: parseAxisPairs(row.axis_values, `${itemLabel}.axis_values`),
      disposition: literal(
        row.disposition,
        [
          "not_applicable",
          "excluded_by_scope",
          "decision_required",
          "unavailable",
        ] as const,
        `${itemLabel}.disposition`,
      ),
      source_item_refs: sourceItemKeys(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: stableKeys(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: string(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

function parseAxisPairs(value: unknown, label: string) {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, ["axis_ref", "value_ref"]);
    return {
      axis_ref: stableKey(row.axis_ref, `${itemLabel}.axis_ref`),
      value_ref: atomicAxisValue(row.value_ref, `${itemLabel}.value_ref`),
    };
  });
}

export function parseDesignResourceVariationAxisDispositions(
  value: unknown,
  label = "design_resource_handoff.variation_axis_dispositions",
): DesignResourceVariationAxisDispositionV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "subject_ref",
      "axis",
      "disposition",
      "values",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      subject_ref: stableKey(row.subject_ref, `${itemLabel}.subject_ref`),
      axis: literal(
        row.axis,
        DESIGN_RESOURCE_VARIATION_AXES,
        `${itemLabel}.axis`,
      ),
      disposition: literal(
        row.disposition,
        ["applicable", "not_applicable"] as const,
        `${itemLabel}.disposition`,
      ),
      values: parseAxisValues(row.values, `${itemLabel}.values`),
      source_item_refs: sourceItemKeys(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: stableKeys(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: string(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

export function parseDesignResourceVariationExclusions(
  value: unknown,
  label = "design_resource_handoff.variation_exclusions",
): DesignResourceVariationCombinationDispositionV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "subject_ref",
      "axis_values",
      "disposition",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      subject_ref: stableKey(row.subject_ref, `${itemLabel}.subject_ref`),
      axis_values: array(row.axis_values, `${itemLabel}.axis_values`).map(
        (pair, pairIndex) => {
          const pairLabel = `${itemLabel}.axis_values[${pairIndex}]`;
          const parsed = object(pair, pairLabel, ["axis_ref", "value_ref"]);
          return {
            axis_ref: literal(
              parsed.axis_ref,
              DESIGN_RESOURCE_VARIATION_AXES,
              `${pairLabel}.axis_ref`,
            ),
            value_ref: atomicAxisValue(
              parsed.value_ref,
              `${pairLabel}.value_ref`,
            ),
          };
        },
      ),
      disposition: literal(
        row.disposition,
        [
          "not_applicable",
          "excluded_by_scope",
          "decision_required",
          "unavailable",
        ] as const,
        `${itemLabel}.disposition`,
      ),
      source_item_refs: sourceItemKeys(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: stableKeys(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: string(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

export function parseDesignResourceVariations(
  value: unknown,
  label = "design_resource_handoff.variations",
): DesignResourceSubjectVariationV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "subject_ref",
      "variant",
      "state",
      "interaction_phase",
      "presence_phase",
      "instance_case",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      subject_ref: stableKey(row.subject_ref, `${itemLabel}.subject_ref`),
      variant: atomicAxisValue(row.variant, `${itemLabel}.variant`),
      state: atomicAxisValue(row.state, `${itemLabel}.state`),
      interaction_phase: atomicAxisValue(
        row.interaction_phase,
        `${itemLabel}.interaction_phase`,
      ),
      presence_phase: atomicAxisValue(
        row.presence_phase,
        `${itemLabel}.presence_phase`,
      ),
      instance_case: atomicAxisValue(
        row.instance_case,
        `${itemLabel}.instance_case`,
      ),
    };
  });
}
