import {
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import {
  array,
  boolean,
  literal,
  object,
} from "./long-task-shape-primitives.js";
import type {
  SymbolicDenotationAxisDomain,
  SymbolicDenotationPredicate,
} from "./symbolic-denotation-types.js";

export function parseSymbolicAxisDomains(
  value: unknown,
  label: string,
): SymbolicDenotationAxisDomain[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const kindValue = object(
      item,
      itemLabel,
      ["key", "kind"],
      ["values", "minimum", "maximum", "integer"],
    ).kind;
    if (kindValue === "enum") {
      const row = object(item, itemLabel, ["key", "kind", "values"]);
      return {
        key: stableKey(row.key, `${itemLabel}.key`),
        kind: literal(row.kind, ["enum"] as const, `${itemLabel}.kind`),
        values: stableKeys(row.values, `${itemLabel}.values`),
      };
    }
    const row = object(item, itemLabel, [
      "key",
      "kind",
      "minimum",
      "maximum",
      "integer",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      kind: literal(row.kind, ["bounded_number"] as const, `${itemLabel}.kind`),
      minimum: parseSymbolicSafeInteger(row.minimum, `${itemLabel}.minimum`),
      maximum: parseSymbolicSafeInteger(row.maximum, `${itemLabel}.maximum`),
      integer: parseLiteralBooleanTrue(row.integer, `${itemLabel}.integer`),
    };
  });
}

export function parseSymbolicPredicate(
  value: unknown,
  label: string,
): SymbolicDenotationPredicate {
  const operator = object(
    value,
    label,
    ["op"],
    [
      "axis_ref",
      "value",
      "values",
      "minimum",
      "maximum",
      "minimum_inclusive",
      "maximum_inclusive",
      "predicates",
      "predicate",
    ],
  ).op;
  if (operator === "eq") return parseEquality(value, label);
  if (operator === "in") return parseMembership(value, label);
  if (operator === "range") return parseRange(value, label);
  if (operator === "all" || operator === "any") return parseGroup(value, label);
  if (operator === "not") return parseNegation(value, label);
  throw new Error(
    `design_resource_symbolic_manifest_invalid:${label}.op:unknown:${String(operator)}`,
  );
}

function parseEquality(
  value: unknown,
  label: string,
): SymbolicDenotationPredicate {
  const row = object(value, label, ["op", "axis_ref", "value"]);
  return {
    op: "eq",
    axis_ref: stableKey(row.axis_ref, `${label}.axis_ref`),
    value: parseSymbolicScalar(row.value, `${label}.value`),
  };
}

function parseMembership(
  value: unknown,
  label: string,
): SymbolicDenotationPredicate {
  const row = object(value, label, ["op", "axis_ref", "values"]);
  return {
    op: "in",
    axis_ref: stableKey(row.axis_ref, `${label}.axis_ref`),
    values: array(row.values, `${label}.values`).map((entry, index) =>
      parseSymbolicScalar(entry, `${label}.values[${index}]`),
    ),
  };
}

function parseRange(
  value: unknown,
  label: string,
): SymbolicDenotationPredicate {
  const row = object(value, label, [
    "op",
    "axis_ref",
    "minimum",
    "maximum",
    "minimum_inclusive",
    "maximum_inclusive",
  ]);
  return {
    op: "range",
    axis_ref: stableKey(row.axis_ref, `${label}.axis_ref`),
    minimum: parseSymbolicSafeInteger(row.minimum, `${label}.minimum`),
    maximum: parseSymbolicSafeInteger(row.maximum, `${label}.maximum`),
    minimum_inclusive: boolean(
      row.minimum_inclusive,
      `${label}.minimum_inclusive`,
    ),
    maximum_inclusive: boolean(
      row.maximum_inclusive,
      `${label}.maximum_inclusive`,
    ),
  };
}

function parseGroup(
  value: unknown,
  label: string,
): SymbolicDenotationPredicate {
  const row = object(value, label, ["op", "predicates"]);
  return {
    op: literal(row.op, ["all", "any"] as const, `${label}.op`),
    predicates: array(row.predicates, `${label}.predicates`).map(
      (entry, index) =>
        parseSymbolicPredicate(entry, `${label}.predicates[${index}]`),
    ),
  };
}

function parseNegation(
  value: unknown,
  label: string,
): SymbolicDenotationPredicate {
  const row = object(value, label, ["op", "predicate"]);
  return {
    op: "not",
    predicate: parseSymbolicPredicate(row.predicate, `${label}.predicate`),
  };
}

export function parseSymbolicScalar(
  value: unknown,
  label: string,
): string | number {
  if (typeof value === "string") return stableKey(value, label);
  return parseSymbolicSafeInteger(value, label);
}

export function parseSymbolicSafeInteger(
  value: unknown,
  label: string,
): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value))
    throw new Error(
      `design_resource_symbolic_manifest_invalid:${label}:safe_integer_required`,
    );
  return value;
}

export function parseSymbolicNonnegativeInteger(
  value: unknown,
  label: string,
): number {
  const parsed = parseSymbolicSafeInteger(value, label);
  if (parsed < 0)
    throw new Error(
      `design_resource_symbolic_manifest_invalid:${label}:nonnegative_required`,
    );
  return parsed;
}

function parseLiteralBooleanTrue(value: unknown, label: string): true {
  if (boolean(value, label) !== true)
    throw new Error(
      `design_resource_symbolic_manifest_invalid:${label}:must_be_true`,
    );
  return true;
}
