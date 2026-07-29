import {
  DESIGN_RESOURCE_STANDARD_CONDITION_AXES,
  type DesignResourceObservableFactManifestV1,
} from "./design-resource-fact-manifest-types.js";
import {
  axisFingerprint,
  cartesian,
  conditionAxisValue,
  exactAxisPairs,
  invalid,
  nonempty,
  refsKnown,
  sameSet,
  unique,
  validateBasis,
} from "./design-resource-fact-universe-helpers.js";

export function validateManifestConditionUniverse(
  manifest: DesignResourceObservableFactManifestV1,
  census: Map<
    string,
    DesignResourceObservableFactManifestV1["inspector"]["census"][number]
  >,
  sourceItems: Map<string, string>,
): void {
  const axes = manifest.axis_dispositions;
  const byAxis = new Map(axes.map((axis) => [axis.axis, axis]));
  for (const axis of DESIGN_RESOURCE_STANDARD_CONDITION_AXES)
    if (!byAxis.has(axis)) invalid("manifest_standard_axis_missing", axis);
  unique(
    axes.map((axis) => axis.axis),
    "manifest_axis_duplicate",
  );
  for (const axis of axes) validateAxis(axis, manifest, census, sourceItems);
  const fingerprints = validateConditions(manifest, axes, byAxis);
  const excluded = validateConditionExclusions(
    manifest,
    axes,
    byAxis,
    fingerprints,
    census,
    sourceItems,
  );
  const expected = cartesian(
    axes.map((axis) =>
      axis.values.map((value) => [axis.axis, value.key] as const),
    ),
  ).map(axisFingerprint);
  sameSet(
    [...fingerprints.keys(), ...excluded.keys()],
    expected,
    "manifest_condition_universe_mismatch",
    manifest.target_key,
  );
}

function validateAxis(
  axis: DesignResourceObservableFactManifestV1["axis_dispositions"][number],
  manifest: DesignResourceObservableFactManifestV1,
  census: Map<string, unknown>,
  sourceItems: Map<string, string>,
): void {
  if (axis.target_ref !== manifest.target_key)
    invalid(
      "manifest_axis_target_mismatch",
      `${axis.key}:${axis.target_ref}:${manifest.target_key}`,
    );
  validateBasis(axis, sourceItems, census, `manifest_axis:${axis.key}`);
  nonempty(axis.values, `manifest_axis_values_required:${axis.key}`);
  unique(
    axis.values.map((value) => value.key),
    `manifest_axis_value_duplicate:${axis.key}`,
  );
  if (
    axis.disposition === "not_applicable" &&
    (axis.values.length !== 1 || axis.values[0].key !== "not-applicable")
  )
    invalid("manifest_axis_not_applicable_value_invalid", axis.key);
  if (
    axis.disposition === "applicable" &&
    axis.values.some((value) => value.key === "not-applicable")
  )
    invalid("manifest_axis_applicable_value_invalid", axis.key);
  for (const value of axis.values) {
    if (axis.disposition === "applicable")
      nonempty(
        value.census_refs,
        `manifest_axis_value_census_required:${axis.key}:${value.key}`,
      );
    refsKnown(
      value.census_refs,
      census,
      "manifest_axis_value_census_unknown",
      `${axis.key}:${value.key}`,
    );
  }
}

function validateConditions(
  manifest: DesignResourceObservableFactManifestV1,
  axes: DesignResourceObservableFactManifestV1["axis_dispositions"],
  byAxis: Map<
    string,
    DesignResourceObservableFactManifestV1["axis_dispositions"][number]
  >,
): Map<string, string> {
  const fingerprints = new Map<string, string>();
  const profileByAxisValue = new Map<string, string>();
  for (const condition of manifest.conditions) {
    const values = axes.map(
      (axis) => [axis.axis, conditionAxisValue(condition, axis.axis)] as const,
    );
    for (const [axis, value] of values)
      if (
        !byAxis.get(axis)!.values.some((candidate) => candidate.key === value)
      )
        invalid(
          "manifest_condition_axis_value_unknown",
          `${condition.key}:${axis}:${value}`,
        );
    const fingerprint = axisFingerprint(values);
    if (fingerprints.has(fingerprint))
      invalid(
        "manifest_condition_combination_duplicate",
        `${fingerprints.get(fingerprint)}:${condition.key}`,
      );
    fingerprints.set(fingerprint, condition.key);
    validateConditionProfiles(condition, profileByAxisValue);
  }
  return fingerprints;
}

function validateConditionProfiles(
  condition: DesignResourceObservableFactManifestV1["conditions"][number],
  profileByAxisValue: Map<string, string>,
): void {
  for (const [key, profile] of [
    [
      `viewport:${condition.viewport.key}`,
      `${condition.viewport.width}:${condition.viewport.height}:${condition.viewport.unit}`,
    ],
    [`density:${condition.density.key}`, String(condition.density.pixel_ratio)],
    [
      `safe_area:${condition.safe_area.key}`,
      `${condition.safe_area.top}:${condition.safe_area.right}:${condition.safe_area.bottom}:${condition.safe_area.left}:${condition.safe_area.unit}`,
    ],
    [
      `text_scale:${condition.text_scale.key}`,
      String(condition.text_scale.multiplier),
    ],
  ] as const) {
    const previous = profileByAxisValue.get(key);
    if (previous !== undefined && previous !== profile)
      invalid(
        "manifest_condition_profile_ambiguous",
        `${key}:${previous}:${profile}`,
      );
    profileByAxisValue.set(key, profile);
  }
}

function validateConditionExclusions(
  manifest: DesignResourceObservableFactManifestV1,
  axes: DesignResourceObservableFactManifestV1["axis_dispositions"],
  byAxis: Map<
    string,
    DesignResourceObservableFactManifestV1["axis_dispositions"][number]
  >,
  fingerprints: Map<string, string>,
  census: Map<string, unknown>,
  sourceItems: Map<string, string>,
): Map<string, string> {
  const excluded = new Map<string, string>();
  for (const row of manifest.condition_exclusions) {
    if (row.target_ref !== manifest.target_key)
      invalid("manifest_condition_exclusion_target_mismatch", row.key);
    validateBasis(
      row,
      sourceItems,
      census,
      `manifest_condition_exclusion:${row.key}`,
    );
    if (
      row.disposition === "decision_required" ||
      row.disposition === "unavailable"
    )
      invalid("manifest_condition_exclusion_unresolved", row.key);
    const values = exactAxisPairs(
      row.axis_values,
      axes.map((axis) => axis.axis),
      `manifest_condition_exclusion:${row.key}`,
    );
    for (const [axis, value] of values)
      if (
        !byAxis.get(axis)!.values.some((candidate) => candidate.key === value)
      )
        invalid(
          "manifest_condition_exclusion_value_unknown",
          `${row.key}:${axis}:${value}`,
        );
    const fingerprint = axisFingerprint(values);
    if (fingerprints.has(fingerprint) || excluded.has(fingerprint))
      invalid("manifest_condition_exclusion_duplicate", row.key);
    excluded.set(fingerprint, row.key);
  }
  return excluded;
}
