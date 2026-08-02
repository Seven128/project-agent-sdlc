import {
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import type { DesignResourceSymbolicNoninterferenceProofV2 } from "./design-resource-symbolic-fact-types.js";
import { parseSymbolicPredicate } from "./design-resource-symbolic-predicate-shape.js";
import {
  array,
  literal,
  nullable,
  object,
  string,
} from "./long-task-shape-primitives.js";

export function parseSymbolicNoninterferenceProof(
  value: unknown,
  label: string,
): DesignResourceSymbolicNoninterferenceProofV2 {
  const row = object(value, label, [
    "side",
    "method",
    "input_resource_refs",
    "oracle_ref",
    "environment_ref",
    "static_dependency_nodes",
    "static_rule_roots",
    "equivalence_cases",
    "dynamic_dependency_kinds",
    "external_device_refs",
    "complete_domain_cardinality",
  ]);
  return {
    side: literal(row.side, ["source", "production"] as const, `${label}.side`),
    method: literal(
      row.method,
      [
        "closed_world_static_dependency_closure",
        "restricted_ir_symbolic_equivalence",
        "finite_complete_domain_exhaustive_equivalence",
      ] as const,
      `${label}.method`,
    ),
    input_resource_refs: stableKeys(
      row.input_resource_refs,
      `${label}.input_resource_refs`,
    ),
    oracle_ref: stableKey(row.oracle_ref, `${label}.oracle_ref`),
    environment_ref: stableKey(row.environment_ref, `${label}.environment_ref`),
    static_dependency_nodes: array(
      row.static_dependency_nodes,
      `${label}.static_dependency_nodes`,
    ).map((item, index) =>
      parseStaticDependencyNode(
        item,
        `${label}.static_dependency_nodes[${index}]`,
      ),
    ),
    static_rule_roots: array(
      row.static_rule_roots,
      `${label}.static_rule_roots`,
    ).map((item, index) =>
      parseStaticDependencyRoot(item, `${label}.static_rule_roots[${index}]`),
    ),
    equivalence_cases: array(
      row.equivalence_cases,
      `${label}.equivalence_cases`,
    ).map((item, index) => {
      const itemLabel = `${label}.equivalence_cases[${index}]`;
      const entry = object(item, itemLabel, [
        "fact_rule_refs",
        "side_predicate",
        "axis_erased_predicate",
      ]);
      return {
        fact_rule_refs: stableKeys(
          entry.fact_rule_refs,
          `${itemLabel}.fact_rule_refs`,
        ),
        side_predicate: parseSymbolicPredicate(
          entry.side_predicate,
          `${itemLabel}.side_predicate`,
        ),
        axis_erased_predicate: parseSymbolicPredicate(
          entry.axis_erased_predicate,
          `${itemLabel}.axis_erased_predicate`,
        ),
      };
    }),
    dynamic_dependency_kinds: stableKeys(
      row.dynamic_dependency_kinds,
      `${label}.dynamic_dependency_kinds`,
    ),
    external_device_refs: stableKeys(
      row.external_device_refs,
      `${label}.external_device_refs`,
    ),
    complete_domain_cardinality: nullable(
      row.complete_domain_cardinality,
      (entry) =>
        decimalCardinality(entry, `${label}.complete_domain_cardinality`),
    ),
  };
}

function parseStaticDependencyNode(value: unknown, label: string) {
  const row = object(value, label, [
    "key",
    "axis_refs",
    "dependency_refs",
    "input_resource_refs",
  ]);
  return {
    key: stableKey(row.key, `${label}.key`),
    axis_refs: stableKeys(row.axis_refs, `${label}.axis_refs`),
    dependency_refs: stableKeys(
      row.dependency_refs,
      `${label}.dependency_refs`,
    ),
    input_resource_refs: stableKeys(
      row.input_resource_refs,
      `${label}.input_resource_refs`,
    ),
  };
}

function parseStaticDependencyRoot(value: unknown, label: string) {
  const row = object(value, label, ["fact_rule_refs", "node_ref"]);
  return {
    fact_rule_refs: nullable(row.fact_rule_refs, (entry) =>
      stableKeys(entry, `${label}.fact_rule_refs`),
    ),
    node_ref: stableKey(row.node_ref, `${label}.node_ref`),
  };
}

function decimalCardinality(value: unknown, label: string): string {
  const parsed = string(value, label);
  if (!/^(?:0|[1-9][0-9]*)$/u.test(parsed))
    throw new Error(`${label}: must be a canonical nonnegative decimal`);
  return parsed;
}
