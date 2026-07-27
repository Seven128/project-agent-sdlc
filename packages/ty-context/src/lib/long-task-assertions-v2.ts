import type {
  DeliveryAssertionV2,
  PopulationRequirementV2,
} from "./long-task-delivery-types.js";
import { canonicalValueJson } from "./strict-codec.js";

export interface AssertionComparison {
  comparable: boolean;
  passed: boolean;
}

export interface DeliveryAssertionEvaluation {
  passed: boolean;
  status:
    | "passed"
    | "observation_missing"
    | "observation_type_mismatch"
    | "assertion_value_mismatch";
  expected?: unknown;
  actual?: unknown;
}

export function evaluateDeliveryAssertion(
  assertion: DeliveryAssertionV2,
  observations: Record<string, unknown>,
): boolean {
  return evaluateDeliveryAssertionDetailed(assertion, observations).passed;
}

export function evaluateDeliveryAssertionDetailed(
  assertion: DeliveryAssertionV2,
  observations: Record<string, unknown>,
): DeliveryAssertionEvaluation {
  const { found, value } = observationValue(
    observations,
    assertion.observation,
  );
  if (!found)
    return {
      passed: false,
      status: "observation_missing",
      expected: assertion.expected,
    };
  if (assertion.operator === "exists")
    return { passed: true, status: "passed", actual: value };
  const expected = assertion.expected;
  let comparison: AssertionComparison;
  switch (assertion.operator) {
    case "truthy":
      return result(Boolean(value), true, value);
    case "falsy":
      return result(!value, false, value);
    case "equals":
      comparison = comparableEquals(value, expected, false);
      break;
    case "not_equals":
      comparison = comparableEquals(value, expected, true);
      break;
    case "contains":
      comparison = contains(value, expected);
      break;
    case "not_contains":
      comparison = contains(value, expected);
      comparison = {
        comparable: comparison.comparable,
        passed: comparison.comparable && !comparison.passed,
      };
      break;
    case "matches":
      comparison = matches(value, expected);
      break;
    case "not_matches":
      comparison = matches(value, expected);
      comparison = {
        comparable: comparison.comparable,
        passed: comparison.comparable && !comparison.passed,
      };
      break;
    case "greater_than":
      comparison = numbers(value, expected, (a, b) => a > b);
      break;
    case "greater_or_equal":
      comparison = numbers(value, expected, (a, b) => a >= b);
      break;
    case "less_than":
      comparison = numbers(value, expected, (a, b) => a < b);
      break;
    case "less_or_equal":
      comparison = numbers(value, expected, (a, b) => a <= b);
      break;
    case "set_equals":
      comparison = sets(
        value,
        expected,
        (a, b) => a.size === b.size && [...a].every((item) => b.has(item)),
      );
      break;
    case "subset_of":
      comparison = sets(value, expected, (a, b) =>
        [...a].every((item) => b.has(item)),
      );
      break;
    case "superset_of":
      comparison = sets(value, expected, (a, b) =>
        [...b].every((item) => a.has(item)),
      );
      break;
  }
  if (!comparison.comparable)
    return {
      passed: false,
      status: "observation_type_mismatch",
      expected,
      actual: value,
    };
  return result(comparison.passed, expected, value);
}

export function evaluatePopulation(
  requirement: PopulationRequirementV2,
  observations: Record<string, unknown>,
): { passed: boolean; actual: unknown; reason: string | null } {
  const universe = observationValue(
    observations,
    requirement.observations.universe_ids,
  ).value;
  const eligible = observationValue(
    observations,
    requirement.observations.eligible_ids,
  ).value;
  const observed = observationValue(
    observations,
    requirement.observations.observed_ids,
  ).value;
  const excluded = observationValue(
    observations,
    requirement.observations.excluded_items,
  ).value;
  const actual = {
    universe_ids: universe,
    eligible_ids: eligible,
    observed_ids: observed,
    excluded_items: excluded,
  };
  if (!validIds(universe)) return failure(actual, "universe_ids_invalid");
  if (!validIds(eligible)) return failure(actual, "eligible_ids_invalid");
  if (!validIds(observed)) return failure(actual, "observed_ids_invalid");
  if (!Array.isArray(excluded))
    return failure(actual, "excluded_items_invalid");
  const eligibleSet = new Set(eligible);
  const universeSet = new Set(universe);
  if (
    universeSet.size !== eligibleSet.size ||
    [...universeSet].some((id) => !eligibleSet.has(id))
  )
    return failure(actual, "eligible_universe_mismatch");
  const observedSet = new Set(observed);
  const excludedIds: string[] = [];
  const rules = new Set(requirement.exclusion_rules.map((item) => item.key));
  for (const item of excluded) {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      typeof (item as Record<string, unknown>).id !== "string" ||
      !(item as Record<string, unknown>).id ||
      typeof (item as Record<string, unknown>).rule !== "string"
    )
      return failure(actual, "excluded_item_invalid");
    const id = (item as { id: string }).id;
    const rule = (item as { rule: string }).rule;
    if (!rules.has(rule))
      return failure(actual, `exclusion_rule_unknown:${rule}`);
    excludedIds.push(id);
  }
  if (new Set(excludedIds).size !== excludedIds.length)
    return failure(actual, "excluded_ids_duplicate");
  const excludedSet = new Set(excludedIds);
  if (![...observedSet].every((id) => eligibleSet.has(id)))
    return failure(actual, "observed_not_eligible_subset");
  if (![...excludedSet].every((id) => eligibleSet.has(id)))
    return failure(actual, "excluded_not_eligible_subset");
  if ([...observedSet].some((id) => excludedSet.has(id)))
    return failure(actual, "observed_excluded_overlap");
  const covered = new Set([...observedSet, ...excludedSet]);
  if (
    covered.size !== eligibleSet.size ||
    [...eligibleSet].some((id) => !covered.has(id))
  )
    return failure(actual, "eligible_population_incomplete");
  return {
    passed: true,
    actual: { ...actual, coverage_percent: 100 },
    reason: null,
  };
}

export function observationValue(
  observations: Record<string, unknown>,
  name: string,
): { found: boolean; value: unknown } {
  if (Object.hasOwn(observations, name))
    return { found: true, value: observations[name] };
  let current: unknown = observations;
  for (const part of name.split(".")) {
    if (
      !current ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      !Object.hasOwn(current, part)
    )
      return { found: false, value: undefined };
    current = (current as Record<string, unknown>)[part];
  }
  return { found: true, value: current };
}

function validIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length > 0) &&
    new Set(value).size === value.length
  );
}

function failure(actual: unknown, reason: string) {
  return { passed: false, actual, reason };
}

function contains(value: unknown, expected: unknown): AssertionComparison {
  if (typeof value === "string" && typeof expected === "string")
    return { comparable: true, passed: value.includes(expected) };
  if (Array.isArray(value))
    return {
      comparable: true,
      passed: value.some(
        (item) => canonicalValueJson(item) === canonicalValueJson(expected),
      ),
    };
  return { comparable: false, passed: false };
}

function comparableEquals(
  value: unknown,
  expected: unknown,
  negate: boolean,
): AssertionComparison {
  if (valueKind(value) !== valueKind(expected))
    return { comparable: false, passed: false };
  const equal = canonicalValueJson(value) === canonicalValueJson(expected);
  return { comparable: true, passed: negate ? !equal : equal };
}

function matches(value: unknown, expected: unknown): AssertionComparison {
  if (typeof value !== "string" || typeof expected !== "string")
    return { comparable: false, passed: false };
  try {
    return {
      comparable: true,
      passed: new RegExp(expected, "u").test(value),
    };
  } catch {
    return { comparable: false, passed: false };
  }
}

function numbers(
  left: unknown,
  right: unknown,
  compare: (left: number, right: number) => boolean,
): AssertionComparison {
  if (
    typeof left !== "number" ||
    typeof right !== "number" ||
    !Number.isFinite(left) ||
    !Number.isFinite(right)
  )
    return { comparable: false, passed: false };
  return { comparable: true, passed: compare(left, right) };
}

function sets(
  left: unknown,
  right: unknown,
  compare: (left: Set<string>, right: Set<string>) => boolean,
): AssertionComparison {
  if (!Array.isArray(left) || !Array.isArray(right))
    return { comparable: false, passed: false };
  return {
    comparable: true,
    passed: compare(
      new Set(left.map(canonicalValueJson)),
      new Set(right.map(canonicalValueJson)),
    ),
  };
}

function result(
  passed: boolean,
  expected: unknown,
  actual: unknown,
): DeliveryAssertionEvaluation {
  return {
    passed,
    status: passed ? "passed" : "assertion_value_mismatch",
    expected,
    actual,
  };
}

function valueKind(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
