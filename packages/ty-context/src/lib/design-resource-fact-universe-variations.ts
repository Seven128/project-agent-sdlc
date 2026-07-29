import {
  DESIGN_RESOURCE_VARIATION_AXES,
  type DesignResourceObservableFactManifestV1,
} from "./design-resource-fact-manifest-types.js";
import {
  axisFingerprint,
  cartesian,
  exactAxisPairs,
  groupBy,
  invalid,
  nonempty,
  refsKnown,
  sameSet,
  unique,
  validateBasis,
  variationValues,
} from "./design-resource-fact-universe-helpers.js";

export function validateManifestVariationUniverse(
  manifest: DesignResourceObservableFactManifestV1,
  census: Map<
    string,
    DesignResourceObservableFactManifestV1["inspector"]["census"][number]
  >,
  sourceItems: Map<string, string>,
): void {
  const subjects = new Set(manifest.subjects.map((item) => item.key));
  const variationsBySubject = groupBy(
    manifest.variations,
    (item) => item.subject_ref,
  );
  const axesBySubject = groupBy(
    manifest.variation_axis_dispositions,
    (item) => item.subject_ref,
  );
  const exclusionsBySubject = groupBy(
    manifest.variation_exclusions,
    (item) => item.subject_ref,
  );
  for (const subjectRef of subjects) {
    validateSubjectVariations(
      subjectRef,
      variationsBySubject.get(subjectRef) ?? [],
      axesBySubject.get(subjectRef) ?? [],
      exclusionsBySubject.get(subjectRef) ?? [],
      census,
      sourceItems,
    );
  }
  for (const ref of [
    ...variationsBySubject.keys(),
    ...axesBySubject.keys(),
    ...exclusionsBySubject.keys(),
  ])
    if (!subjects.has(ref)) invalid("manifest_variation_subject_unknown", ref);
}

function validateSubjectVariations(
  subjectRef: string,
  variations: DesignResourceObservableFactManifestV1["variations"],
  axes: DesignResourceObservableFactManifestV1["variation_axis_dispositions"],
  exclusions: DesignResourceObservableFactManifestV1["variation_exclusions"],
  census: Map<string, unknown>,
  sourceItems: Map<string, string>,
): void {
  unique(
    axes.map((axis) => axis.axis),
    `manifest_variation_axis_duplicate:${subjectRef}`,
  );
  for (const axis of DESIGN_RESOURCE_VARIATION_AXES)
    if (!axes.some((item) => item.axis === axis))
      invalid(
        "manifest_variation_standard_axis_missing",
        `${subjectRef}:${axis}`,
      );
  for (const axis of axes) validateVariationAxis(axis, census, sourceItems);
  const byAxis = new Map(axes.map((axis) => [axis.axis, axis]));
  const actual = validateVariations(variations, byAxis);
  const excluded = validateVariationExclusions(
    exclusions,
    census,
    sourceItems,
    actual,
  );
  const expected = cartesian(
    axes.map((axis) =>
      axis.values.map((value) => [axis.axis, value.key] as const),
    ),
  ).map(axisFingerprint);
  sameSet(
    [...actual.keys(), ...excluded.keys()],
    expected,
    "manifest_variation_universe_mismatch",
    subjectRef,
  );
  if (!actual.size) invalid("manifest_subject_variation_required", subjectRef);
}

function validateVariationAxis(
  axis: DesignResourceObservableFactManifestV1["variation_axis_dispositions"][number],
  census: Map<string, unknown>,
  sourceItems: Map<string, string>,
): void {
  validateBasis(
    axis,
    sourceItems,
    census,
    `manifest_variation_axis:${axis.key}`,
  );
  nonempty(axis.values, `manifest_variation_axis_values_required:${axis.key}`);
  unique(
    axis.values.map((value) => value.key),
    `manifest_variation_axis_value_duplicate:${axis.key}`,
  );
  if (
    axis.disposition === "not_applicable" &&
    (axis.values.length !== 1 || axis.values[0].key !== "not-applicable")
  )
    invalid("manifest_variation_axis_not_applicable_invalid", axis.key);
  for (const value of axis.values) {
    if (axis.disposition === "applicable")
      nonempty(
        value.census_refs,
        `manifest_variation_value_census_required:${axis.key}:${value.key}`,
      );
    refsKnown(
      value.census_refs,
      census,
      "manifest_variation_value_census_unknown",
      `${axis.key}:${value.key}`,
    );
  }
}

function validateVariations(
  variations: DesignResourceObservableFactManifestV1["variations"],
  byAxis: Map<
    string,
    DesignResourceObservableFactManifestV1["variation_axis_dispositions"][number]
  >,
): Map<string, string> {
  const actual = new Map<string, string>();
  for (const variation of variations) {
    const values = variationValues(variation);
    for (const [axis, value] of values)
      if (
        !byAxis.get(axis)!.values.some((candidate) => candidate.key === value)
      )
        invalid(
          "manifest_variation_axis_value_unknown",
          `${variation.key}:${axis}:${value}`,
        );
    const fingerprint = axisFingerprint(values);
    if (actual.has(fingerprint))
      invalid(
        "manifest_variation_combination_duplicate",
        `${actual.get(fingerprint)}:${variation.key}`,
      );
    actual.set(fingerprint, variation.key);
  }
  return actual;
}

function validateVariationExclusions(
  exclusions: DesignResourceObservableFactManifestV1["variation_exclusions"],
  census: Map<string, unknown>,
  sourceItems: Map<string, string>,
  actual: Map<string, string>,
): Map<string, string> {
  const excluded = new Map<string, string>();
  for (const row of exclusions) {
    validateBasis(
      row,
      sourceItems,
      census,
      `manifest_variation_exclusion:${row.key}`,
    );
    if (
      row.disposition === "decision_required" ||
      row.disposition === "unavailable"
    )
      invalid("manifest_variation_exclusion_unresolved", row.key);
    const values = exactAxisPairs(
      row.axis_values,
      [...DESIGN_RESOURCE_VARIATION_AXES],
      `manifest_variation_exclusion:${row.key}`,
    );
    const fingerprint = axisFingerprint(values);
    if (actual.has(fingerprint) || excluded.has(fingerprint))
      invalid("manifest_variation_exclusion_duplicate", row.key);
    excluded.set(fingerprint, row.key);
  }
  return excluded;
}
