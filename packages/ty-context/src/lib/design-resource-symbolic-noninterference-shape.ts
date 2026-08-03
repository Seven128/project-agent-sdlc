import {
  nonnegativeInteger,
  sha256,
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
    "oracle_version",
    "oracle_implementation_sha256",
    "oracle_capability",
    "environment_sha256",
    "input_snapshot_sha256",
    "source_manifest_snapshot_sha256",
    "target_snapshot_sha256",
    "certificate_scope_sha256",
    "rule_scope_sha256",
    "omitted_axis_refs",
    "method_result_sha256",
    "artifact_resource_ref",
    "artifact_path",
    "artifact_sha256",
    "failure_witness",
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
    oracle_version: string(row.oracle_version, `${label}.oracle_version`),
    oracle_implementation_sha256: sha256(
      row.oracle_implementation_sha256,
      `${label}.oracle_implementation_sha256`,
    ),
    oracle_capability: string(
      row.oracle_capability,
      `${label}.oracle_capability`,
    ),
    environment_sha256: sha256(
      row.environment_sha256,
      `${label}.environment_sha256`,
    ),
    input_snapshot_sha256: sha256(
      row.input_snapshot_sha256,
      `${label}.input_snapshot_sha256`,
    ),
    source_manifest_snapshot_sha256: nullable(
      row.source_manifest_snapshot_sha256,
      (entry) => sha256(entry, `${label}.source_manifest_snapshot_sha256`),
    ),
    target_snapshot_sha256: sha256(
      row.target_snapshot_sha256,
      `${label}.target_snapshot_sha256`,
    ),
    certificate_scope_sha256: sha256(
      row.certificate_scope_sha256,
      `${label}.certificate_scope_sha256`,
    ),
    rule_scope_sha256: sha256(
      row.rule_scope_sha256,
      `${label}.rule_scope_sha256`,
    ),
    omitted_axis_refs: stableKeys(
      row.omitted_axis_refs,
      `${label}.omitted_axis_refs`,
    ),
    method_result_sha256: sha256(
      row.method_result_sha256,
      `${label}.method_result_sha256`,
    ),
    artifact_resource_ref: stableKey(
      row.artifact_resource_ref,
      `${label}.artifact_resource_ref`,
    ),
    artifact_path: string(row.artifact_path, `${label}.artifact_path`),
    artifact_sha256: sha256(row.artifact_sha256, `${label}.artifact_sha256`),
    failure_witness: nullable(row.failure_witness, (entry) =>
      parseFailureWitness(entry, `${label}.failure_witness`),
    ),
  };
}

function parseFailureWitness(value: unknown, label: string) {
  const row = object(value, label, [
    "kind",
    "side",
    "certificate_scope_sha256",
    "axis_ref",
    "fact_rule_ref",
    "resource_ref",
    "path",
    "locator",
    "node_ref",
    "byte_offset",
    "assignment",
    "detail",
  ]);
  return {
    kind: literal(
      row.kind,
      [
        "omitted_axis_dependency",
        "unsupported_dependency",
        "source_rule_denotation_mismatch",
        "complete_domain_counterexample",
      ] as const,
      `${label}.kind`,
    ),
    side: literal(row.side, ["source", "production"] as const, `${label}.side`),
    certificate_scope_sha256: sha256(
      row.certificate_scope_sha256,
      `${label}.certificate_scope_sha256`,
    ),
    axis_ref: nullable(row.axis_ref, (entry) =>
      stableKey(entry, `${label}.axis_ref`),
    ),
    fact_rule_ref: nullable(row.fact_rule_ref, (entry) =>
      stableKey(entry, `${label}.fact_rule_ref`),
    ),
    resource_ref: nullable(row.resource_ref, (entry) =>
      stableKey(entry, `${label}.resource_ref`),
    ),
    path: nullable(row.path, (entry) => string(entry, `${label}.path`)),
    locator: nullable(row.locator, (entry) =>
      string(entry, `${label}.locator`),
    ),
    node_ref: nullable(row.node_ref, (entry) =>
      stableKey(entry, `${label}.node_ref`),
    ),
    byte_offset: nullable(row.byte_offset, (entry) =>
      nonnegativeInteger(entry, `${label}.byte_offset`),
    ),
    assignment: nullable(row.assignment, (entry) =>
      parseAssignment(entry, `${label}.assignment`),
    ),
    detail: string(row.detail, `${label}.detail`),
  };
}

function parseAssignment(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label}: must be an object`);
  const result: Record<string, string | number> = {};
  for (const [key, entry] of Object.entries(value)) {
    stableKey(key, `${label}.key`);
    if (
      (typeof entry !== "string" && typeof entry !== "number") ||
      (typeof entry === "number" && !Number.isFinite(entry))
    )
      throw new Error(`${label}.${key}: must be a finite scalar`);
    result[key] = entry;
  }
  return result;
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
