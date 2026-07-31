import type {
  SymbolicDenotationAxisDomain,
  SymbolicDenotationComplexityLimits,
  SymbolicDenotationPredicate,
  SymbolicDenotationScalar,
} from "./symbolic-denotation-types.js";
import {
  compareScalar,
  exactKeys,
  invalid,
} from "./symbolic-denotation-support.js";

export interface SymbolicPredicateInspection {
  input_nodes: number;
  number_cuts: Map<string, Set<number>>;
}

export function validateSymbolicPredicate(
  input: SymbolicDenotationPredicate,
  domains: SymbolicDenotationAxisDomain[],
  domainIndex: ReadonlyMap<string, number>,
  inspection: SymbolicPredicateInspection,
  depth: number,
  limits: SymbolicDenotationComplexityLimits,
): SymbolicDenotationPredicate {
  inspectPredicateNode(input, depth, inspection, limits);
  switch (input.op) {
    case "eq":
      return validateEq(input, domains, domainIndex, inspection);
    case "in":
      return validateIn(input, domains, domainIndex, inspection);
    case "range":
      return validateRange(input, domains, domainIndex, inspection);
    case "all":
    case "any":
      return validateGroup(
        input,
        domains,
        domainIndex,
        inspection,
        depth,
        limits,
      );
    case "not":
      return validateNot(
        input,
        domains,
        domainIndex,
        inspection,
        depth,
        limits,
      );
    default:
      return invalid(
        "predicate_operator_unknown",
        String((input as { op?: unknown }).op),
      );
  }
}

function inspectPredicateNode(
  input: SymbolicDenotationPredicate,
  depth: number,
  inspection: SymbolicPredicateInspection,
  limits: SymbolicDenotationComplexityLimits,
): void {
  if (!input || typeof input !== "object" || Array.isArray(input))
    invalid("predicate_invalid", "not_object");
  if (depth > limits.max_predicate_depth)
    invalid(
      "predicate_depth_limit_exceeded",
      `actual=${depth}:limit=${limits.max_predicate_depth}`,
    );
  inspection.input_nodes += 1;
  if (inspection.input_nodes > limits.max_input_predicate_nodes)
    invalid(
      "predicate_node_limit_exceeded",
      `actual=${inspection.input_nodes}:limit=${limits.max_input_predicate_nodes}`,
    );
}

function validateEq(
  input: Extract<SymbolicDenotationPredicate, { op: "eq" }>,
  domains: SymbolicDenotationAxisDomain[],
  domainIndex: ReadonlyMap<string, number>,
  inspection: SymbolicPredicateInspection,
): SymbolicDenotationPredicate {
  exactKeys(input, ["op", "axis_ref", "value"], "predicate:eq");
  const domain = predicateDomain(input.axis_ref, domains, domainIndex);
  validateScalar(domain, input.value);
  addNumberCuts(domain, [input.value], inspection);
  return { ...input };
}

function validateIn(
  input: Extract<SymbolicDenotationPredicate, { op: "in" }>,
  domains: SymbolicDenotationAxisDomain[],
  domainIndex: ReadonlyMap<string, number>,
  inspection: SymbolicPredicateInspection,
): SymbolicDenotationPredicate {
  exactKeys(input, ["op", "axis_ref", "values"], "predicate:in");
  const domain = predicateDomain(input.axis_ref, domains, domainIndex);
  if (!Array.isArray(input.values) || !input.values.length)
    invalid("predicate_in_values_required", input.axis_ref);
  const values = input.values.map((value) => {
    validateScalar(domain, value);
    return value;
  });
  if (
    new Set(values.map((value) => `${typeof value}:${value}`)).size !==
    values.length
  )
    invalid("predicate_in_value_duplicate", input.axis_ref);
  addNumberCuts(domain, values, inspection);
  return { ...input, values: [...values].sort(compareScalar) };
}

function validateRange(
  input: Extract<SymbolicDenotationPredicate, { op: "range" }>,
  domains: SymbolicDenotationAxisDomain[],
  domainIndex: ReadonlyMap<string, number>,
  inspection: SymbolicPredicateInspection,
): SymbolicDenotationPredicate {
  exactKeys(
    input,
    [
      "op",
      "axis_ref",
      "minimum",
      "maximum",
      "minimum_inclusive",
      "maximum_inclusive",
    ],
    "predicate:range",
  );
  const domain = predicateDomain(input.axis_ref, domains, domainIndex);
  validateRangeBounds(input, domain);
  const effectiveMinimum = input.minimum + (input.minimum_inclusive ? 0 : 1);
  const effectiveMaximum = input.maximum - (input.maximum_inclusive ? 0 : 1);
  if (effectiveMinimum > effectiveMaximum)
    invalid("predicate_range_empty", input.axis_ref);
  addCuts(inspection, domain.key, effectiveMinimum, effectiveMaximum + 1);
  return { ...input };
}

function validateRangeBounds(
  input: Extract<SymbolicDenotationPredicate, { op: "range" }>,
  domain: SymbolicDenotationAxisDomain,
): asserts domain is Extract<
  SymbolicDenotationAxisDomain,
  { kind: "bounded_number" }
> {
  if (
    domain.kind !== "bounded_number" ||
    !Number.isSafeInteger(input.minimum) ||
    !Number.isSafeInteger(input.maximum) ||
    typeof input.minimum_inclusive !== "boolean" ||
    typeof input.maximum_inclusive !== "boolean" ||
    input.minimum < domain.minimum ||
    input.maximum > domain.maximum ||
    input.minimum > input.maximum
  )
    invalid("predicate_range_invalid", input.axis_ref);
}

function validateGroup(
  input: Extract<SymbolicDenotationPredicate, { op: "all" | "any" }>,
  domains: SymbolicDenotationAxisDomain[],
  domainIndex: ReadonlyMap<string, number>,
  inspection: SymbolicPredicateInspection,
  depth: number,
  limits: SymbolicDenotationComplexityLimits,
): SymbolicDenotationPredicate {
  exactKeys(input, ["op", "predicates"], `predicate:${input.op}`);
  if (!Array.isArray(input.predicates) || !input.predicates.length)
    invalid("predicate_children_required", input.op);
  return {
    op: input.op,
    predicates: input.predicates.map((predicate) =>
      validateSymbolicPredicate(
        predicate,
        domains,
        domainIndex,
        inspection,
        depth + 1,
        limits,
      ),
    ),
  };
}

function validateNot(
  input: Extract<SymbolicDenotationPredicate, { op: "not" }>,
  domains: SymbolicDenotationAxisDomain[],
  domainIndex: ReadonlyMap<string, number>,
  inspection: SymbolicPredicateInspection,
  depth: number,
  limits: SymbolicDenotationComplexityLimits,
): SymbolicDenotationPredicate {
  exactKeys(input, ["op", "predicate"], "predicate:not");
  return {
    op: "not",
    predicate: validateSymbolicPredicate(
      input.predicate,
      domains,
      domainIndex,
      inspection,
      depth + 1,
      limits,
    ),
  };
}

function predicateDomain(
  axisRef: string,
  domains: SymbolicDenotationAxisDomain[],
  domainIndex: ReadonlyMap<string, number>,
): SymbolicDenotationAxisDomain {
  if (typeof axisRef !== "string") invalid("predicate_axis_invalid", "");
  const index = domainIndex.get(axisRef);
  if (index === undefined) invalid("predicate_axis_unknown", axisRef);
  return domains[index];
}

function validateScalar(
  domain: SymbolicDenotationAxisDomain,
  value: SymbolicDenotationScalar,
): void {
  if (domain.kind === "enum") {
    if (typeof value !== "string" || !domain.values.includes(value))
      invalid(
        "predicate_value_outside_domain",
        `${domain.key}:${String(value)}`,
      );
    return;
  }
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < domain.minimum ||
    value > domain.maximum
  )
    invalid("predicate_value_outside_domain", `${domain.key}:${String(value)}`);
}

function addNumberCuts(
  domain: SymbolicDenotationAxisDomain,
  values: SymbolicDenotationScalar[],
  inspection: SymbolicPredicateInspection,
): void {
  if (domain.kind !== "bounded_number") return;
  for (const value of values)
    addCuts(inspection, domain.key, value as number, (value as number) + 1);
}

function addCuts(
  inspection: SymbolicPredicateInspection,
  axisRef: string,
  ...cuts: number[]
): void {
  const values = inspection.number_cuts.get(axisRef) ?? new Set<number>();
  cuts.forEach((cut) => values.add(cut));
  inspection.number_cuts.set(axisRef, values);
}
