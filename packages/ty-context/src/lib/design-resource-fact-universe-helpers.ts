import { createHash } from "node:crypto";
import {
  DESIGN_RESOURCE_STANDARD_CONDITION_AXES,
  type DesignResourceObservableFactManifestV1,
  type DesignResourceStandardConditionAxis,
  type DesignResourceSubjectVariationV1,
  type DesignResourceVariationAxis,
} from "./design-resource-fact-manifest-types.js";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";

export function manifestIdentityDigest(rows: ReadonlyArray<unknown>): string {
  const hash = createHash("sha256");
  const identities = rows.map((row) => stableJson(row)).sort();
  for (let index = 0; index < identities.length; index += 1) {
    if (index > 0) hash.update("\n");
    hash.update(identities[index]);
  }
  return hash.digest("hex");
}

export function manifestCollectionRows(
  manifest: DesignResourceObservableFactManifestV1,
): Map<string, ReadonlyArray<unknown>> {
  return new Map<string, ReadonlyArray<unknown>>([
    ["inspector_inputs", manifest.inspector.input_resources],
    ["inspector_census", manifest.inspector.census],
    ["axis_dispositions", manifest.axis_dispositions],
    ["condition_exclusions", manifest.condition_exclusions],
    ["conditions", manifest.conditions],
    ["subjects", manifest.subjects],
    ["variation_axis_dispositions", manifest.variation_axis_dispositions],
    ["variation_exclusions", manifest.variation_exclusions],
    ["variations", manifest.variations],
    ["properties", manifest.properties],
    ["lineage_nodes", manifest.lineage_nodes],
    ["fact_cells", manifest.fact_cells],
    ["facts", manifest.facts],
    ["evidence", manifest.evidence],
    ["proof_obligations", manifest.proof_obligations],
    ["oracles", manifest.oracles],
    ["environments", manifest.environments],
    ["asset_bindings", manifest.asset_bindings],
    ["acceptance_blockers", manifest.acceptance_blockers],
  ]);
}

export function conditionAxisValue(
  condition: DesignResourceObservableFactManifestV1["conditions"][number],
  axis: string,
): string {
  const standard: Record<DesignResourceStandardConditionAxis, string> = {
    platform: condition.platform,
    os_version: condition.os_version,
    device_profile: condition.device_profile,
    form_factor: condition.form_factor,
    viewport: condition.viewport.key,
    orientation: condition.orientation,
    density: condition.density.key,
    safe_area: condition.safe_area.key,
    window_state: condition.window_state,
    fold_state: condition.fold_state,
    display_mode: condition.display_mode,
    color_scheme: condition.color_scheme,
    locale: condition.locale,
    language: condition.language,
    script: condition.script,
    direction: condition.direction,
    pseudo_localization: condition.pseudo_localization,
    content_case: condition.content_case,
    data_case: condition.data_case,
    text_scale: condition.text_scale.key,
    input_method: condition.input_method,
    assistive_technology: condition.assistive_technology,
    motion: condition.motion,
    transparency: condition.transparency,
    contrast: condition.contrast,
    bold_text: condition.bold_text,
    button_shapes: condition.button_shapes,
    system_ui: condition.system_ui,
    ime: condition.ime,
    permission: condition.permission,
    capability: condition.capability,
    connectivity: condition.connectivity,
    lifecycle: condition.lifecycle,
  };
  if (
    DESIGN_RESOURCE_STANDARD_CONDITION_AXES.includes(
      axis as DesignResourceStandardConditionAxis,
    )
  )
    return standard[axis as DesignResourceStandardConditionAxis];
  const custom = condition.custom_axes.filter((item) => item.axis_ref === axis);
  if (custom.length !== 1)
    invalid(
      "manifest_condition_custom_axis_missing_or_duplicate",
      `${condition.key}:${axis}`,
    );
  return custom[0].value_ref;
}

export function variationValues(
  variation: DesignResourceSubjectVariationV1,
): Array<readonly [DesignResourceVariationAxis, string]> {
  return [
    ["variant", variation.variant],
    ["state", variation.state],
    ["interaction_phase", variation.interaction_phase],
    ["presence_phase", variation.presence_phase],
    ["instance_case", variation.instance_case],
  ];
}

export function factCellFingerprint(cell: {
  subject_ref: string;
  target_ref: string;
  condition_ref: string;
  variation_ref: string;
  property_ref: string;
}): string {
  return [
    cell.subject_ref,
    cell.target_ref,
    cell.condition_ref,
    cell.variation_ref,
    cell.property_ref,
  ].join("\0");
}

export function validateBasis(
  row: {
    source_item_refs: string[];
    basis_refs: string[];
  },
  sourceItems: Map<string, string>,
  census: Map<string, unknown>,
  label: string,
): void {
  nonempty(row.source_item_refs, `${label}:source_item_refs_required`);
  nonempty(row.basis_refs, `${label}:basis_refs_required`);
  unique(row.source_item_refs, `${label}:source_item_ref_duplicate`);
  unique(row.basis_refs, `${label}:basis_ref_duplicate`);
  refsKnown(
    row.source_item_refs,
    sourceItems,
    "manifest_source_item_unknown",
    label,
  );
  for (const ref of row.basis_refs)
    if (!sourceItems.has(ref) && !census.has(ref))
      invalid("manifest_basis_ref_unknown", `${label}:${ref}`);
}

export function exactAxisPairs<T extends string>(
  pairs: Array<{ axis_ref: T | string; value_ref: string }>,
  expectedAxes: readonly T[] | string[],
  detail: string,
): Array<readonly [string, string]> {
  unique(
    pairs.map((pair) => pair.axis_ref),
    `${detail}:axis_duplicate`,
  );
  sameSet(
    pairs.map((pair) => pair.axis_ref),
    [...expectedAxes],
    "manifest_combination_axes_mismatch",
    detail,
  );
  const byAxis = new Map(
    pairs.map((pair) => [String(pair.axis_ref), pair.value_ref]),
  );
  return [...expectedAxes].map(
    (axis) => [String(axis), byAxis.get(String(axis))!] as const,
  );
}

export function axisFingerprint(
  values: Array<readonly [string, string]>,
): string {
  return values
    .map(([axis, value]) => `${axis}=${value}`)
    .sort()
    .join("\0");
}

export function cartesian<T>(groups: T[][]): T[][] {
  let result: T[][] = [[]];
  for (const group of groups)
    result = result.flatMap((prefix) => group.map((item) => [...prefix, item]));
  return result;
}

export function groupBy<T>(
  rows: T[],
  key: (row: T) => string,
): Map<string, T[]> {
  const result = new Map<string, T[]>();
  for (const row of rows) {
    const value = key(row);
    const group = result.get(value) ?? [];
    group.push(row);
    result.set(value, group);
  }
  return result;
}

export function refsKnown<T>(
  refs: string[],
  known: Map<string, T>,
  code: string,
  detail: string,
): void {
  for (const ref of refs)
    if (!known.has(ref)) invalid(code, `${detail}:${ref}`);
}

export function nonempty(values: unknown[], code: string): void {
  if (!values.length) invalid(code, "");
}

export function unique(values: string[], code: string): void {
  if (new Set(values).size !== values.length) invalid(code, values.join(","));
}

export function sameSet(
  actual: string[],
  expected: string[],
  code: string,
  detail: string,
): void {
  if (!sameSetValue(actual, expected))
    invalid(
      code,
      `${detail}:${[...new Set(actual)].sort().join(",")}:${[...new Set(expected)].sort().join(",")}`,
    );
}

export function sameSetValue(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const actual = [...new Set(left)].sort();
  const expected = [...new Set(right)].sort();
  return (
    actual.length === expected.length &&
    actual.every((item, index) => item === expected[index])
  );
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function invalid(code: string, detail: string): never {
  invalidDesignResourceHandoff(code, detail);
}
