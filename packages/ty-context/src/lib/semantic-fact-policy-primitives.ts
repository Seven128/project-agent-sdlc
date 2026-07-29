import type {
  SemanticFactManifestCollectionName,
  SemanticFactManifestV1,
} from "./semantic-fact-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export function validateSemanticFactLocatedValue(
  manifest: SemanticFactManifestV1,
  located: SemanticFactManifestV1["facts"][number]["expected"],
  label: string,
): void {
  validateSemanticFactLocator(manifest, located.locator, label);
  if (located.representation === "inline") {
    const digest = sha256Hex(canonicalValueJson(located.value));
    if (digest !== located.sha256)
      semanticFactInvalid(
        "inline_value_digest_mismatch",
        `${label}:${located.sha256}:${digest}`,
      );
  }
}

export function validateSemanticFactLocator(
  manifest: SemanticFactManifestV1,
  locator: { material_ref: string; kind: string; value: string },
  label: string,
): void {
  const inputRefs = new Set(manifest.inputs.map((item) => item.key));
  if (
    locator.kind === "manifest_pointer"
      ? locator.material_ref !== manifest.key
      : !inputRefs.has(locator.material_ref)
  )
    semanticFactInvalid(
      "locator_material_unknown",
      `${label}:${locator.material_ref}`,
    );
}

export function validateSemanticFactQuantifier(
  manifest: SemanticFactManifestV1,
  fact: SemanticFactManifestV1["facts"][number],
): void {
  const quantifier = fact.quantifier;
  const population = quantifier.population_ref
    ? (manifest.populations.find(
        (item) => item.key === quantifier.population_ref,
      ) ?? null)
    : null;
  validateSemanticFactQuantifierPopulation(fact, population);
  validateSemanticFactQuantifierNonnegativeBounds(fact);
  validateSemanticFactQuantifierKindBounds(fact);
}

function validateSemanticFactQuantifierPopulation(
  fact: SemanticFactManifestV1["facts"][number],
  population: SemanticFactManifestV1["populations"][number] | null,
): void {
  const quantifier = fact.quantifier;
  if (quantifier.population_ref && !population)
    semanticFactInvalid(
      "quantifier_population_unknown",
      `${fact.key}:${quantifier.population_ref}`,
    );
  const populationKinds = new Set([
    "all",
    "any",
    "none",
    "exactly",
    "at_least",
    "at_most",
    "range",
  ]);
  if (populationKinds.has(quantifier.kind) && !quantifier.population_ref)
    semanticFactInvalid("quantifier_population_required", fact.key);
  if (population && population.outcome_ref !== fact.outcome_ref)
    semanticFactInvalid(
      "quantifier_population_outcome_mismatch",
      `${fact.key}:${population.key}`,
    );
  if (quantifier.kind === "one" && quantifier.population_ref)
    semanticFactInvalid("quantifier_population_forbidden", fact.key);
}

function validateSemanticFactQuantifierNonnegativeBounds(
  fact: SemanticFactManifestV1["facts"][number],
): void {
  for (const [label, value] of [
    ["minimum", fact.quantifier.minimum],
    ["maximum", fact.quantifier.maximum],
  ] as const)
    if (value !== null && (!Number.isInteger(value) || value < 0))
      semanticFactInvalid(`quantifier_${label}_invalid`, fact.key);
}

function validateSemanticFactQuantifierKindBounds(
  fact: SemanticFactManifestV1["facts"][number],
): void {
  const quantifier = fact.quantifier;
  if (
    quantifier.kind === "exactly" &&
    (quantifier.minimum === null ||
      quantifier.maximum === null ||
      quantifier.minimum !== quantifier.maximum)
  )
    semanticFactInvalid("quantifier_exactly_bounds_invalid", fact.key);
  if (quantifier.kind === "at_least" && quantifier.minimum === null)
    semanticFactInvalid("quantifier_minimum_required", fact.key);
  if (quantifier.kind === "at_most" && quantifier.maximum === null)
    semanticFactInvalid("quantifier_maximum_required", fact.key);
  if (
    quantifier.kind === "range" &&
    (quantifier.minimum === null ||
      quantifier.maximum === null ||
      quantifier.minimum > quantifier.maximum)
  )
    semanticFactInvalid("quantifier_range_invalid", fact.key);
  if (
    ["one", "all", "any", "none"].includes(quantifier.kind) &&
    (quantifier.minimum !== null || quantifier.maximum !== null)
  )
    semanticFactInvalid("quantifier_bounds_forbidden", fact.key);
  if (quantifier.kind === "at_least" && quantifier.maximum !== null)
    semanticFactInvalid("quantifier_maximum_forbidden", fact.key);
  if (quantifier.kind === "at_most" && quantifier.minimum !== null)
    semanticFactInvalid("quantifier_minimum_forbidden", fact.key);
}

export function validateSemanticFactCrossProduct(
  rule: SemanticFactManifestV1["condition_rules"][number],
  axes: Map<string, SemanticFactManifestV1["axis_dispositions"][number]>,
  conditions: Map<string, SemanticFactManifestV1["conditions"][number]>,
  exclusions: Map<
    string,
    SemanticFactManifestV1["condition_exclusions"][number]
  >,
): void {
  const values = rule.axis_refs.map((axisRef) => {
    const axis = axes.get(axisRef);
    if (!axis)
      semanticFactInvalid(
        "condition_rule_axis_unknown",
        `${rule.key}:${axisRef}`,
      );
    return axis.values.map((item) => `${axisRef}=${item.key}`);
  });
  const expected = semanticFactCartesian(values).map((row) =>
    row.sort().join("|"),
  );
  const actual = [...rule.condition_refs, ...rule.exclusion_refs].map((ref) => {
    const row = conditions.get(ref) ?? exclusions.get(ref);
    if (!row)
      semanticFactInvalid("condition_rule_cell_unknown", `${rule.key}:${ref}`);
    return row.axis_values
      .filter((item) => rule.axis_refs.includes(item.axis_ref))
      .map((item) => `${item.axis_ref}=${item.value_ref}`)
      .sort()
      .join("|");
  });
  assertSameSemanticFactSet(
    actual,
    expected,
    `condition_rule_cross_product:${rule.key}`,
  );
}

export function semanticFactCollections(
  manifest: SemanticFactManifestV1,
): Record<SemanticFactManifestCollectionName, Array<{ key: string }>> {
  return {
    inputs: manifest.inputs,
    inspector_census: manifest.inspector.census,
    family_dispositions: manifest.family_dispositions,
    subjects: manifest.subjects,
    relations: manifest.relations,
    populations: manifest.populations,
    axis_dispositions: manifest.axis_dispositions,
    condition_rules: manifest.condition_rules,
    conditions: manifest.conditions,
    condition_exclusions: manifest.condition_exclusions,
    property_dispositions: manifest.property_dispositions,
    fact_cells: manifest.fact_cells,
    facts: manifest.facts,
    proof_obligations: manifest.proof_obligations,
    oracles: manifest.oracles,
    environments: manifest.environments,
    blockers: manifest.blockers,
  };
}

export function semanticFactCellIdentity(
  unitRef: string,
  conditionRef: string,
  propertyRef: string,
): string {
  return `${unitRef}\0${conditionRef}\0${propertyRef}`;
}

export function canonicalSemanticFactCondition(
  values: Array<{ axis_ref: string; value_ref: string }>,
): string {
  return values
    .map((item) => `${item.axis_ref}=${item.value_ref}`)
    .sort()
    .join("|");
}

function semanticFactCartesian(values: string[][]): string[][] {
  return values.reduce<string[][]>(
    (rows, current) =>
      rows.flatMap((row) => current.map((value) => [...row, value])),
    [[]],
  );
}

export function assertNoSemanticFactParentCycle(
  key: string,
  subjects: SemanticFactManifestV1["subjects"],
): void {
  const byKey = new Map(subjects.map((item) => [item.key, item]));
  const seen = new Set<string>();
  let current: string | null = key;
  while (current) {
    if (seen.has(current)) semanticFactInvalid("subject_parent_cycle", key);
    seen.add(current);
    current = byKey.get(current)?.parent_ref ?? null;
  }
}

export function requireSemanticFactBasis(
  value: { basis_refs: string[] },
  label: string,
): void {
  uniqueNonemptySemanticFacts(value.basis_refs, `${label}:basis_refs`);
}

export function requireSemanticFactSubset(
  actual: string[],
  allowed: string[],
  code: string,
  label: string,
): void {
  const unknown = actual.filter((item) => !allowed.includes(item));
  if (unknown.length)
    semanticFactInvalid(code, `${label}:${unknown.join(",")}`);
}

export function uniqueNonemptySemanticFacts(
  values: Array<string | number>,
  label: string,
): void {
  if (!values.length) semanticFactInvalid(`${label}_required`, "");
  uniqueSemanticFacts(values, label);
}

export function uniqueSemanticFacts(
  values: Array<string | number>,
  label: string,
): void {
  if (new Set(values).size !== values.length)
    semanticFactInvalid(`${label}_duplicate`, values.join(","));
}

export function assertSameSemanticFactSet(
  actual: Array<string | number>,
  expected: Array<string | number>,
  label: string,
): void {
  if (
    actual.length !== expected.length ||
    new Set(actual).size !== actual.length ||
    actual.some((item) => !expected.includes(item))
  )
    semanticFactInvalid(
      `${label}_mismatch`,
      `expected=${[...expected].sort().join(",")};actual=${[...actual]
        .sort()
        .join(",")}`,
    );
}

export function semanticFactInvalid(code: string, detail: string): never {
  throw new Error(
    `semantic_fact_manifest_invalid:${code}${detail ? `:${detail}` : ""}`,
  );
}
