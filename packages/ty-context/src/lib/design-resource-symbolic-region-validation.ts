import type {
  DesignResourceHandoffPreflightV2,
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicFactRuleV2,
  ParsedDesignResourceHandoffV2,
} from "./design-resource-symbolic-fact-types.js";
import { DEFAULT_SYMBOLIC_DENOTATION_COMPLEXITY_LIMITS } from "./symbolic-denotation-engine.js";
import type {
  CompiledSymbolicDenotationV1,
  SymbolicDenotationPredicate,
} from "./symbolic-denotation-types.js";
import {
  assertSameSet,
  compareText,
  invalid,
  requireKnownRefs,
  stableJson,
} from "./design-resource-symbolic-validation-support.js";
import type { SymbolicApplicabilityIndex } from "./design-resource-symbolic-applicability-validation.js";
import type { DesignResourceSymbolicCompilationSession } from "./design-resource-symbolic-compilation.js";
import {
  symbolicSubjectPropertyKey,
  type SymbolicManifestIndexes,
} from "./design-resource-symbolic-indexes.js";

export function validateSymbolicApplicabilityClosure(
  manifest: DesignResourceObservableRuleManifestV2,
  reachable: CompiledSymbolicDenotationV1,
  indexes: SymbolicManifestIndexes,
  applicability: SymbolicApplicabilityIndex,
  compilation: DesignResourceSymbolicCompilationSession,
): void {
  for (const subject of manifest.subjects)
    for (const property of manifest.properties)
      validateSubjectPropertyPartition(
        reachable,
        subject.key,
        property.key,
        indexes,
        applicability,
        compilation,
      );
}

function validateSubjectPropertyPartition(
  reachable: CompiledSymbolicDenotationV1,
  subjectRef: string,
  propertyRef: string,
  indexes: SymbolicManifestIndexes,
  applicability: SymbolicApplicabilityIndex,
  compilation: DesignResourceSymbolicCompilationSession,
): void {
  const tupleKey = symbolicSubjectPropertyKey(subjectRef, propertyRef);
  const regions: Array<{ key: string; region: SymbolicDenotationPredicate }> = [
    ...(indexes.rulesBySubjectProperty.get(tupleKey) ?? []),
    ...(indexes.dispositionsBySubjectProperty.get(tupleKey) ?? []),
  ];
  const label = `${subjectRef}:${propertyRef}`;
  if (!applicability.isApplicable(subjectRef, propertyRef)) {
    if (regions.length)
      invalid("v2_structural_not_applicable_materialized", label);
    return;
  }
  if (!regions.length) invalid("v2_applicability_remainder_uncovered", label);
  assertRegionsMutuallyExclusive(regions, compilation);
  const union = compilation.compile({
    op: "any",
    predicates: regions.map((region) => region.region),
  });
  if (union.canonical_sha256 !== reachable.canonical_sha256)
    invalid("v2_effective_region_coverage_gap", label);
}

function assertRegionsMutuallyExclusive(
  regions: Array<{ key: string; region: SymbolicDenotationPredicate }>,
  compilation: DesignResourceSymbolicCompilationSession,
): void {
  for (let left = 0; left < regions.length; left += 1)
    for (let right = left + 1; right < regions.length; right += 1) {
      const overlap = compilation.compile({
        op: "all",
        predicates: [regions[left].region, regions[right].region],
      });
      if (overlap.canonical_dag.root_ref !== "terminal.false")
        invalid(
          "v2_effective_region_overlap",
          `${regions[left].key}:${regions[right].key}`,
        );
    }
}

export function validateSymbolicCoverage(
  parsed: ParsedDesignResourceHandoffV2,
  manifest: DesignResourceObservableRuleManifestV2,
): void {
  const rows = parsed.handoff.coverage.filter(
    (row) => row.target_ref === manifest.target_key,
  );
  if (!rows.length) invalid("v2_coverage_required", manifest.target_key);
  for (const [code, actual, expected] of coverageSets(rows, manifest))
    assertSameSet(actual, expected, code, manifest.target_key);
  requireKnownRefs(
    rows.flatMap((row) => row.source_item_refs),
    new Set(parsed.source_item_keys),
    "v2_coverage_source_item_unknown",
  );
}

function coverageSets(
  rows: ParsedDesignResourceHandoffV2["handoff"]["coverage"],
  manifest: DesignResourceObservableRuleManifestV2,
): Array<[string, string[], string[]]> {
  return [
    [
      "v2_coverage_subject_set_mismatch",
      rows.flatMap((row) => row.subject_or_relation_refs),
      manifest.subjects.map((item) => item.key),
    ],
    [
      "v2_coverage_property_set_mismatch",
      rows.flatMap((row) => row.property_refs),
      manifest.properties.map((item) => item.key),
    ],
    [
      "v2_coverage_rule_set_mismatch",
      rows.flatMap((row) => row.fact_rule_refs),
      manifest.fact_rules.map((item) => item.key),
    ],
    [
      "v2_coverage_obligation_set_mismatch",
      rows.flatMap((row) => row.semantic_obligation_refs),
      manifest.semantic_proof_obligations.map((item) => item.key),
    ],
    [
      "v2_coverage_certificate_set_mismatch",
      rows.flatMap((row) => row.certificate_refs),
      manifest.noninterference_certificates.map((item) => item.key),
    ],
  ];
}

export function validateSymbolicRegionWithinReachable(
  region: SymbolicDenotationPredicate,
  reachable: SymbolicDenotationPredicate,
  label: string,
  compilation: DesignResourceSymbolicCompilationSession,
): void {
  const outside = compilation.compile({
    op: "all",
    predicates: [region, { op: "not", predicate: reachable }],
  });
  if (outside.canonical_dag.root_ref !== "terminal.false")
    invalid("v2_region_claims_unreachable", label);
}

export function validateSymbolicPopulationAndQuantifier(
  item: {
    key: string;
    population_ref: string | null;
    quantifier: DesignResourceSymbolicFactRuleV2["quantifier"];
  },
  subjectPopulationRef: string | null,
  populations: Map<
    string,
    DesignResourceObservableRuleManifestV2["populations"][number]
  >,
): void {
  if (item.population_ref !== subjectPopulationRef)
    invalid("v2_population_binding_mismatch", item.key);
  const expected = item.population_ref
    ? populations.get(item.population_ref)?.quantifier
    : { kind: "one" as const, minimum: 1, maximum: 1 };
  if (!expected || stableJson(item.quantifier) !== stableJson(expected))
    invalid("v2_quantifier_mismatch", item.key);
  validateSymbolicQuantifier(item.quantifier, item.key);
}

export function validateSymbolicQuantifier(
  quantifier: DesignResourceSymbolicFactRuleV2["quantifier"],
  label: string,
): void {
  const { kind, minimum, maximum } = quantifier;
  const invalidParameters =
    kind === "one"
      ? minimum !== 1 || maximum !== 1
      : kind === "exactly"
        ? minimum === null || maximum !== minimum
        : kind === "at_least"
          ? minimum === null || maximum !== null
          : kind === "at_most"
            ? minimum !== null || maximum === null
            : kind === "range"
              ? minimum === null || maximum === null || minimum > maximum
              : minimum !== null || maximum !== null;
  if (invalidParameters) invalid("v2_quantifier_parameters_invalid", label);
}

export function aggregateSymbolicCanonicalMetrics(
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
): { nodes: number; edges: number; bytes: number } {
  const nodes = collectCanonicalNodes(projections);
  const roots = projections
    .map((projection) => ({
      rule_ref: projection.rule.key,
      root_ref: projection.compiled_region.canonical_dag.root_ref,
    }))
    .sort((left, right) => compareText(left.rule_ref, right.rule_ref));
  const canonicalNodes = [...nodes.values()].sort((left, right) =>
    compareText((left as { key: string }).key, (right as { key: string }).key),
  );
  const bytes = Buffer.byteLength(
    stableJson({
      schema_version: "design-resource-symbolic-rule-dag-set-v2",
      roots,
      nodes: canonicalNodes,
    }),
    "utf8",
  );
  const limit =
    DEFAULT_SYMBOLIC_DENOTATION_COMPLEXITY_LIMITS.max_canonical_bytes;
  if (bytes > limit)
    invalid(
      "v2_shared_canonical_byte_limit_exceeded",
      `actual=${bytes}:limit=${limit}`,
    );
  return {
    nodes: canonicalNodes.length,
    edges: canonicalNodes.reduce<number>(
      (total, node) => total + (node as { edges: unknown[] }).edges.length,
      0,
    ),
    bytes,
  };
}

function collectCanonicalNodes(
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
): Map<string, unknown> {
  const nodes = new Map<string, unknown>();
  for (const projection of projections)
    for (const node of projection.compiled_region.canonical_dag.nodes) {
      const previous = nodes.get(node.key);
      if (previous && stableJson(previous) !== stableJson(node))
        invalid("v2_shared_dag_node_collision", node.key);
      nodes.set(node.key, node);
    }
  return nodes;
}
