export function* expandFiniteDomains(domains, index = 0, assignment = {}) {
  if (index === domains.length) {
    yield { ...assignment };
    return;
  }
  const domain = domains[index];
  const values =
    domain.kind === "enum"
      ? domain.values
      : Array.from(
          { length: domain.maximum - domain.minimum + 1 },
          (_, offset) => domain.minimum + offset,
        );
  for (const value of values) {
    assignment[domain.key] = value;
    yield* expandFiniteDomains(domains, index + 1, assignment);
  }
  delete assignment[domain.key];
}

export function independentPredicateEvaluation(predicate, assignment) {
  switch (predicate.op) {
    case "eq":
      return assignment[predicate.axis_ref] === predicate.value;
    case "in":
      return predicate.values.includes(assignment[predicate.axis_ref]);
    case "range": {
      const value = assignment[predicate.axis_ref];
      return (
        (predicate.minimum_inclusive
          ? value >= predicate.minimum
          : value > predicate.minimum) &&
        (predicate.maximum_inclusive
          ? value <= predicate.maximum
          : value < predicate.maximum)
      );
    }
    case "all":
      return predicate.predicates.every((child) =>
        independentPredicateEvaluation(child, assignment),
      );
    case "any":
      return predicate.predicates.some((child) =>
        independentPredicateEvaluation(child, assignment),
      );
    case "not":
      return !independentPredicateEvaluation(predicate.predicate, assignment);
    default:
      throw new Error(`independent_oracle_unknown_operator:${predicate.op}`);
  }
}

export function nestedNot(depth) {
  let predicate = {
    op: "eq",
    axis_ref: "condition.color",
    value: "dark",
  };
  for (let index = 0; index < depth; index += 1)
    predicate = { op: "not", predicate };
  return predicate;
}

export function complexityLimits(override) {
  return {
    max_predicate_depth: 32,
    max_input_predicate_nodes: 4_096,
    max_canonical_dag_nodes: 8_192,
    max_partition_edges: 65_536,
    max_canonical_bytes: 4_194_304,
    ...override,
  };
}
