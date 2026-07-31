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
  const limitsChecked = validateSymbolicLimits(limits);
  const domains = validateSymbolicDomains(domainsInput);
  const domainIndex = new Map(
    domains.map((domain, index) => [domain.key, index]),
  );
  const inspection: SymbolicPredicateInspection = {
    input_nodes: 0,
    number_cuts: new Map(),
  };
  const predicate = validateSymbolicPredicate(
    predicateInput,
    domains,
    domainIndex,
    inspection,
    1,
    limitsChecked,
  );
  const axes = buildSymbolicRuntimeAxes(domains, inspection.number_cuts);
  const builder = new SymbolicDecisionDagBuilder(axes, limitsChecked);
  const rootId = builder.predicate(predicate, domainIndex);
  const canonicalDag = builder.canonicalize(rootId);
  const canonicalJson = stableJson(canonicalDag);
  const canonicalBytes = Buffer.byteLength(canonicalJson, "utf8");
  checkCanonicalBytes(canonicalBytes, limitsChecked.max_canonical_bytes);
  const partitionEdges = canonicalDag.nodes.reduce(
    (total, node) => total + node.edges.length,
    0,
  );
  const referencedAxisRefs = [
    ...new Set(canonicalDag.nodes.map((node) => node.axis_ref)),
  ].sort(compareText);
  const referenced = new Set(referencedAxisRefs);
  const theoreticalGroundCardinality = domains.reduce(
    (total, domain) => total * domainCardinality(domain),
    1n,
  );
  return {
    canonical_dag: canonicalDag,
    canonical_sha256: sha256(canonicalJson),
    canonical_bytes: canonicalBytes,
    referenced_axis_refs: referencedAxisRefs,
    omitted_axis_refs: domains
      .map((domain) => domain.key)
      .filter((axisRef) => !referenced.has(axisRef)),
    theoretical_ground_cardinality: theoreticalGroundCardinality.toString(),
    metrics: {
      input_predicate_nodes: inspection.input_nodes,
      canonical_dag_nodes: canonicalDag.nodes.length,
      partition_edges: partitionEdges,
      canonical_bytes: canonicalBytes,
    },
  };
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
