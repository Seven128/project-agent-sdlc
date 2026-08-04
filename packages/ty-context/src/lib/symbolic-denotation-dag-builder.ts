import type {
  SymbolicDenotationCanonicalDagV1,
  SymbolicDenotationCanonicalNodeV1,
  SymbolicDenotationComplexityLimits,
  SymbolicDenotationPredicate,
  SymbolicDenotationScalar,
} from "./symbolic-denotation-types.js";
import type { SymbolicRuntimeAxis } from "./symbolic-denotation-runtime.js";
import {
  canonicalSymbolicEdges,
  symbolicSegmentMatches,
} from "./symbolic-denotation-runtime.js";
import {
  compareText,
  invalid,
  neverValue,
  scalarEqual,
  sha256,
  stableJson,
} from "./symbolic-denotation-support.js";

interface InternalNode {
  axis_index: number;
  child_ids: number[];
}

export class SymbolicDecisionDagBuilder {
  private readonly nodes: InternalNode[] = [
    { axis_index: -1, child_ids: [] },
    { axis_index: -1, child_ids: [] },
  ];
  private readonly unique = new Map<string, number>();
  private readonly predicateMemo = new Map<string, number>();
  private readonly applyMemo = new Map<string, number>();
  private readonly notMemo = new Map<number, number>();
  private constructedEdges = 0;

  constructor(
    private readonly axes: SymbolicRuntimeAxis[],
    private readonly limits: SymbolicDenotationComplexityLimits,
  ) {}

  predicate(
    predicate: SymbolicDenotationPredicate,
    domainIndex: ReadonlyMap<string, number>,
  ): number {
    const memoKey = stableJson(predicate);
    const cached = this.predicateMemo.get(memoKey);
    if (cached !== undefined) return cached;
    const result = this.compilePredicate(predicate, domainIndex);
    this.predicateMemo.set(memoKey, result);
    return result;
  }

  private compilePredicate(
    predicate: SymbolicDenotationPredicate,
    domainIndex: ReadonlyMap<string, number>,
  ): number {
    switch (predicate.op) {
      case "eq":
        return this.atom(predicate.axis_ref, domainIndex, (value) =>
          scalarEqual(value, predicate.value),
        );
      case "in":
        return this.inPredicate(predicate, domainIndex);
      case "range":
        return this.rangePredicate(predicate, domainIndex);
      case "not":
        return this.negate(this.predicate(predicate.predicate, domainIndex));
      case "all":
        return this.groupPredicate("and", predicate.predicates, domainIndex);
      case "any":
        return this.groupPredicate("or", predicate.predicates, domainIndex);
      default:
        return invalid("predicate_operator_unknown", neverValue(predicate));
    }
  }

  private inPredicate(
    predicate: Extract<SymbolicDenotationPredicate, { op: "in" }>,
    domainIndex: ReadonlyMap<string, number>,
  ): number {
    return this.atom(predicate.axis_ref, domainIndex, (value) =>
      predicate.values.some((candidate) => scalarEqual(value, candidate)),
    );
  }

  private rangePredicate(
    predicate: Extract<SymbolicDenotationPredicate, { op: "range" }>,
    domainIndex: ReadonlyMap<string, number>,
  ): number {
    const minimum = predicate.minimum + (predicate.minimum_inclusive ? 0 : 1);
    const maximum = predicate.maximum - (predicate.maximum_inclusive ? 0 : 1);
    return this.atom(
      predicate.axis_ref,
      domainIndex,
      (value) =>
        typeof value === "number" && value >= minimum && value <= maximum,
    );
  }

  private groupPredicate(
    operation: "and" | "or",
    predicates: SymbolicDenotationPredicate[],
    domainIndex: ReadonlyMap<string, number>,
  ): number {
    let result = operation === "and" ? 1 : 0;
    for (const child of predicates)
      result = this.apply(
        operation,
        result,
        this.predicate(child, domainIndex),
      );
    return result;
  }

  canonicalize(rootId: number): SymbolicDenotationCanonicalDagV1 {
    const output = new Map<string, SymbolicDenotationCanonicalNodeV1>();
    const memo = new Map<number, string>([
      [0, "terminal.false"],
      [1, "terminal.true"],
    ]);
    const visit = (id: number): string => {
      const cached = memo.get(id);
      if (cached) return cached;
      const node = this.nodes[id];
      const axis = this.axes[node.axis_index];
      const childRefs = node.child_ids.map(visit);
      const edges = canonicalSymbolicEdges(axis, childRefs);
      const body = { axis_ref: axis.domain.key, edges };
      const key = `node.${sha256(stableJson(body))}`;
      const existing = output.get(key);
      if (existing && stableJson(existing.edges) !== stableJson(edges))
        invalid("canonical_node_hash_collision", key);
      output.set(key, { key, ...body });
      memo.set(id, key);
      return key;
    };
    const rootRef = visit(rootId);
    const nodes = [...output.values()].sort((left, right) =>
      compareText(left.key, right.key),
    );
    this.checkCanonicalLimits(nodes);
    return {
      schema_version: "symbolic-denotation-canonical-dag-v1",
      root_ref: rootRef,
      nodes,
    };
  }

  private checkCanonicalLimits(
    nodes: SymbolicDenotationCanonicalNodeV1[],
  ): void {
    const partitionEdges = nodes.reduce(
      (total, node) => total + node.edges.length,
      0,
    );
    if (nodes.length > this.limits.max_canonical_dag_nodes)
      invalid(
        "canonical_dag_node_limit_exceeded",
        `actual=${nodes.length}:limit=${this.limits.max_canonical_dag_nodes}`,
      );
    if (partitionEdges > this.limits.max_partition_edges)
      invalid(
        "canonical_partition_edge_limit_exceeded",
        `actual=${partitionEdges}:limit=${this.limits.max_partition_edges}`,
      );
  }

  private atom(
    axisRef: string,
    domainIndex: ReadonlyMap<string, number>,
    matches: (value: SymbolicDenotationScalar) => boolean,
  ): number {
    const axisIndex = domainIndex.get(axisRef);
    if (axisIndex === undefined) invalid("predicate_axis_unknown", axisRef);
    const axis = this.axes[axisIndex];
    return this.node(
      axisIndex,
      axis.segments.map((segment) =>
        symbolicSegmentMatches(segment, matches) ? 1 : 0,
      ),
    );
  }

  private negate(id: number): number {
    if (id === 0) return 1;
    if (id === 1) return 0;
    const cached = this.notMemo.get(id);
    if (cached !== undefined) return cached;
    const node = this.nodes[id];
    const result = this.node(
      node.axis_index,
      node.child_ids.map((child) => this.negate(child)),
    );
    this.notMemo.set(id, result);
    return result;
  }

  private apply(operation: "and" | "or", left: number, right: number): number {
    const reduced = this.reduceApply(operation, left, right);
    if (reduced !== null) return reduced;
    const first = Math.min(left, right);
    const second = Math.max(left, right);
    const memoKey = `${operation}:${first}:${second}`;
    const cached = this.applyMemo.get(memoKey);
    if (cached !== undefined) return cached;
    const leftNode = this.nodes[left];
    const rightNode = this.nodes[right];
    const axisIndex = Math.min(leftNode.axis_index, rightNode.axis_index);
    const segmentCount = this.axes[axisIndex].segments.length;
    const children = Array.from({ length: segmentCount }, (_, index) =>
      this.apply(
        operation,
        leftNode.axis_index === axisIndex ? leftNode.child_ids[index] : left,
        rightNode.axis_index === axisIndex ? rightNode.child_ids[index] : right,
      ),
    );
    const result = this.node(axisIndex, children);
    this.applyMemo.set(memoKey, result);
    return result;
  }

  private reduceApply(
    operation: "and" | "or",
    left: number,
    right: number,
  ): number | null {
    if (left === right) return left;
    if (operation === "and") {
      if (left === 0 || right === 0) return 0;
      if (left === 1) return right;
      if (right === 1) return left;
      return null;
    }
    if (left === 1 || right === 1) return 1;
    if (left === 0) return right;
    if (right === 0) return left;
    return null;
  }

  private node(axisIndex: number, childIds: number[]): number {
    if (childIds.every((child) => child === childIds[0])) return childIds[0];
    const key = `${axisIndex}:${childIds.join(",")}`;
    const cached = this.unique.get(key);
    if (cached !== undefined) return cached;
    const nextNodeCount = this.nodes.length - 1;
    if (nextNodeCount > this.limits.max_canonical_dag_nodes)
      invalid(
        "constructed_dag_node_limit_exceeded",
        `actual=${nextNodeCount}:limit=${this.limits.max_canonical_dag_nodes}`,
      );
    this.constructedEdges += childIds.length;
    if (this.constructedEdges > this.limits.max_partition_edges)
      invalid(
        "constructed_partition_edge_limit_exceeded",
        `actual=${this.constructedEdges}:limit=${this.limits.max_partition_edges}`,
      );
    const id = this.nodes.length;
    this.nodes.push({ axis_index: axisIndex, child_ids: childIds });
    this.unique.set(key, id);
    return id;
  }
}
