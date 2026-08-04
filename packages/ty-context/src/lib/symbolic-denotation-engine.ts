import { DESIGN_RESOURCE_SYMBOLIC_FACT_POLICY } from "./design-resource-symbolic-fact-policy.js";
import { SymbolicDecisionDagBuilder } from "./symbolic-denotation-dag-builder.js";
import {
  validateSymbolicDomains,
  validateSymbolicLimits,
} from "./symbolic-denotation-domain-validation.js";
import {
  buildSymbolicRuntimeAxes,
  symbolicEdgeMatches,
} from "./symbolic-denotation-runtime.js";
import {
  compareText,
  domainCardinality,
  invalid,
  sha256,
  stableJson,
} from "./symbolic-denotation-support.js";
import type {
  CompiledSymbolicDenotationV1,
  SymbolicDenotationAxisDomain,
  SymbolicDenotationCanonicalDagV1,
  SymbolicDenotationComplexityLimits,
  SymbolicDenotationPredicate,
  SymbolicDenotationScalar,
} from "./symbolic-denotation-types.js";
import {
  type SymbolicPredicateInspection,
  validateSymbolicPredicate,
} from "./symbolic-denotation-validation.js";

export const DEFAULT_SYMBOLIC_DENOTATION_COMPLEXITY_LIMITS = {
  max_predicate_depth: 32,
  max_input_predicate_nodes: 4_096,
  max_canonical_dag_nodes: 8_192,
  max_partition_edges: 65_536,
  max_canonical_bytes: 4_194_304,
} as const satisfies SymbolicDenotationComplexityLimits;

export function compileSymbolicDenotation(
  domainsInput: SymbolicDenotationAxisDomain[],
  predicateInput: SymbolicDenotationPredicate,
  limits: SymbolicDenotationComplexityLimits = DEFAULT_SYMBOLIC_DENOTATION_COMPLEXITY_LIMITS,
): CompiledSymbolicDenotationV1 {
  return createSymbolicDenotationCompilationSession(
    domainsInput,
    [predicateInput],
    limits,
  ).compile(predicateInput);
}

export interface SymbolicDenotationCompilationStatisticsV1 {
  axis_partition_builds: 1;
  compile_requests: number;
  compile_cache_hits: number;
  unique_compiled_predicates: number;
}

export class SymbolicDenotationCompilationSession {
  private readonly limits: SymbolicDenotationComplexityLimits;
  private readonly domains: SymbolicDenotationAxisDomain[];
  private readonly domainIndex: ReadonlyMap<string, number>;
  private readonly numberCuts = new Map<string, Set<number>>();
  private readonly builder: SymbolicDecisionDagBuilder;
  private readonly compiled = new Map<string, CompiledSymbolicDenotationV1>();
  private readonly theoreticalGroundCardinality: string;
  private compileRequests = 0;
  private compileCacheHits = 0;

  constructor(
    domainsInput: SymbolicDenotationAxisDomain[],
    seedPredicates: readonly SymbolicDenotationPredicate[],
    limits: SymbolicDenotationComplexityLimits = DEFAULT_SYMBOLIC_DENOTATION_COMPLEXITY_LIMITS,
  ) {
    if (!seedPredicates.length)
      invalid("compilation_session_seeds_required", "");
    this.limits = validateSymbolicLimits(limits);
    this.domains = validateSymbolicDomains(domainsInput);
    this.domainIndex = new Map(
      this.domains.map((domain, index) => [domain.key, index]),
    );
    const uniqueSeeds = new Map(
      seedPredicates.map((predicate) => [stableJson(predicate), predicate]),
    );
    for (const predicate of uniqueSeeds.values())
      mergeNumberCuts(this.numberCuts, this.inspect(predicate).number_cuts);
    const axes = buildSymbolicRuntimeAxes(this.domains, this.numberCuts);
    this.builder = new SymbolicDecisionDagBuilder(axes, this.limits);
    this.theoreticalGroundCardinality = this.domains
      .reduce((total, domain) => total * domainCardinality(domain), 1n)
      .toString();
  }

  compile(
    predicateInput: SymbolicDenotationPredicate,
  ): CompiledSymbolicDenotationV1 {
    this.compileRequests += 1;
    const inspection = this.inspect(predicateInput);
    assertKnownNumberCuts(this.numberCuts, inspection.number_cuts);
    const predicate = validateSymbolicPredicate(
      predicateInput,
      this.domains,
      this.domainIndex,
      { input_nodes: 0, number_cuts: new Map() },
      1,
      this.limits,
    );
    const memoKey = stableJson(predicate);
    const cached = this.compiled.get(memoKey);
    if (cached) {
      this.compileCacheHits += 1;
      return cached;
    }
    const rootId = this.builder.predicate(predicate, this.domainIndex);
    const canonicalDag = this.builder.canonicalize(rootId);
    const canonicalJson = stableJson(canonicalDag);
    const canonicalBytes = Buffer.byteLength(canonicalJson, "utf8");
    checkCanonicalBytes(canonicalBytes, this.limits.max_canonical_bytes);
    const partitionEdges = canonicalDag.nodes.reduce(
      (total, node) => total + node.edges.length,
      0,
    );
    const referencedAxisRefs = [
      ...new Set(canonicalDag.nodes.map((node) => node.axis_ref)),
    ].sort(compareText);
    const referenced = new Set(referencedAxisRefs);
    const result: CompiledSymbolicDenotationV1 = {
      canonical_dag: canonicalDag,
      canonical_sha256: sha256(canonicalJson),
      canonical_bytes: canonicalBytes,
      referenced_axis_refs: referencedAxisRefs,
      omitted_axis_refs: this.domains
        .map((domain) => domain.key)
        .filter((axisRef) => !referenced.has(axisRef)),
      theoretical_ground_cardinality: this.theoreticalGroundCardinality,
      metrics: {
        input_predicate_nodes: inspection.input_nodes,
        canonical_dag_nodes: canonicalDag.nodes.length,
        partition_edges: partitionEdges,
        canonical_bytes: canonicalBytes,
      },
    };
    this.compiled.set(memoKey, result);
    return result;
  }

  statistics(): SymbolicDenotationCompilationStatisticsV1 {
    return {
      axis_partition_builds: 1,
      compile_requests: this.compileRequests,
      compile_cache_hits: this.compileCacheHits,
      unique_compiled_predicates: this.compiled.size,
    };
  }

  private inspect(
    predicate: SymbolicDenotationPredicate,
  ): SymbolicPredicateInspection {
    const inspection: SymbolicPredicateInspection = {
      input_nodes: 0,
      number_cuts: new Map(),
    };
    validateSymbolicPredicate(
      predicate,
      this.domains,
      this.domainIndex,
      inspection,
      1,
      this.limits,
    );
    return inspection;
  }
}

export function createSymbolicDenotationCompilationSession(
  domains: SymbolicDenotationAxisDomain[],
  seedPredicates: readonly SymbolicDenotationPredicate[],
  limits: SymbolicDenotationComplexityLimits = DEFAULT_SYMBOLIC_DENOTATION_COMPLEXITY_LIMITS,
): SymbolicDenotationCompilationSession {
  return new SymbolicDenotationCompilationSession(
    domains,
    seedPredicates,
    limits,
  );
}

function mergeNumberCuts(
  target: Map<string, Set<number>>,
  source: ReadonlyMap<string, Set<number>>,
): void {
  for (const [axisRef, cuts] of source) {
    const values = target.get(axisRef) ?? new Set<number>();
    cuts.forEach((cut) => values.add(cut));
    target.set(axisRef, values);
  }
}

function assertKnownNumberCuts(
  known: ReadonlyMap<string, Set<number>>,
  actual: ReadonlyMap<string, Set<number>>,
): void {
  for (const [axisRef, cuts] of actual)
    for (const cut of cuts)
      if (!known.get(axisRef)?.has(cut))
        invalid(
          "compilation_session_axis_partition_stale",
          `${axisRef}:${cut}`,
        );
}

function checkCanonicalBytes(actual: number, limit: number): void {
  if (actual > limit)
    invalid("canonical_byte_limit_exceeded", `actual=${actual}:limit=${limit}`);
}

export function evaluateCanonicalSymbolicDenotation(
  dag: SymbolicDenotationCanonicalDagV1,
  assignment: Record<string, SymbolicDenotationScalar>,
): boolean {
  const nodes = new Map(dag.nodes.map((node) => [node.key, node]));
  let current = dag.root_ref;
  const visited = new Set<string>();
  while (current !== "terminal.true" && current !== "terminal.false") {
    if (visited.has(current)) invalid("canonical_dag_cycle", current);
    visited.add(current);
    const node = nodes.get(current);
    if (!node) invalid("canonical_dag_node_unknown", current);
    const value = assignment[node.axis_ref];
    if (value === undefined)
      invalid("canonical_dag_assignment_missing", node.axis_ref);
    const matches = node.edges.filter((edge) =>
      symbolicEdgeMatches(edge, value),
    );
    if (matches.length !== 1)
      invalid(
        "canonical_dag_assignment_partition_invalid",
        `${node.axis_ref}:matches=${matches.length}`,
      );
    current = matches[0].child_ref;
  }
  return current === "terminal.true";
}

void DESIGN_RESOURCE_SYMBOLIC_FACT_POLICY.symbolic_denotation_efficiency_delivery;
