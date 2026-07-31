import type {
  SymbolicDenotationAxisDomain,
  SymbolicDenotationCanonicalEdgeV1,
  SymbolicDenotationScalar,
} from "./symbolic-denotation-types.js";
import { compareText, invalid } from "./symbolic-denotation-support.js";

interface EnumSegment {
  kind: "enum";
  values: string[];
}

interface NumberSegment {
  kind: "number";
  minimum: number;
  maximum: number;
}

export type SymbolicAxisSegment = EnumSegment | NumberSegment;

export interface SymbolicRuntimeAxis {
  domain: SymbolicDenotationAxisDomain;
  segments: SymbolicAxisSegment[];
}

export function buildSymbolicRuntimeAxes(
  domains: SymbolicDenotationAxisDomain[],
  numberCuts: ReadonlyMap<string, Set<number>>,
): SymbolicRuntimeAxis[] {
  return domains.map((domain) => {
    if (domain.kind === "enum")
      return {
        domain,
        segments: domain.values.map((value) => ({
          kind: "enum" as const,
          values: [value],
        })),
      };
    return { domain, segments: buildNumberSegments(domain, numberCuts) };
  });
}

function buildNumberSegments(
  domain: Extract<SymbolicDenotationAxisDomain, { kind: "bounded_number" }>,
  numberCuts: ReadonlyMap<string, Set<number>>,
): NumberSegment[] {
  const cuts = new Set<number>([
    domain.minimum,
    domain.maximum + 1,
    ...(numberCuts.get(domain.key) ?? []),
  ]);
  const sorted = [...cuts]
    .filter((value) => value >= domain.minimum && value <= domain.maximum + 1)
    .sort((left, right) => left - right);
  const segments: NumberSegment[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const minimum = sorted[index];
    const maximum = sorted[index + 1] - 1;
    if (minimum <= maximum) segments.push({ kind: "number", minimum, maximum });
  }
  return segments;
}

export function canonicalSymbolicEdges(
  axis: SymbolicRuntimeAxis,
  childRefs: string[],
): SymbolicDenotationCanonicalEdgeV1[] {
  return axis.domain.kind === "enum"
    ? canonicalEnumEdges(axis, childRefs)
    : canonicalNumberEdges(axis, childRefs);
}

function canonicalEnumEdges(
  axis: SymbolicRuntimeAxis,
  childRefs: string[],
): SymbolicDenotationCanonicalEdgeV1[] {
  const groups = new Map<string, string[]>();
  axis.segments.forEach((segment, index) => {
    const values = groups.get(childRefs[index]) ?? [];
    values.push(...(segment as EnumSegment).values);
    groups.set(childRefs[index], values);
  });
  return [...groups.entries()]
    .map(([child_ref, values]) => ({
      region: { kind: "enum_set" as const, values },
      child_ref,
    }))
    .sort((left, right) =>
      compareText(left.region.values[0], right.region.values[0]),
    );
}

function canonicalNumberEdges(
  axis: SymbolicRuntimeAxis,
  childRefs: string[],
): SymbolicDenotationCanonicalEdgeV1[] {
  const edges: SymbolicDenotationCanonicalEdgeV1[] = [];
  axis.segments.forEach((segment, index) => {
    const numeric = segment as NumberSegment;
    const previous = edges.at(-1);
    if (
      previous?.region.kind === "integer_range" &&
      previous.child_ref === childRefs[index] &&
      previous.region.maximum + 1 === numeric.minimum
    ) {
      previous.region.maximum = numeric.maximum;
      return;
    }
    edges.push({
      region: {
        kind: "integer_range",
        minimum: numeric.minimum,
        maximum: numeric.maximum,
      },
      child_ref: childRefs[index],
    });
  });
  return edges;
}

export function symbolicEdgeMatches(
  edge: SymbolicDenotationCanonicalEdgeV1,
  value: SymbolicDenotationScalar,
): boolean {
  if (edge.region.kind === "enum_set")
    return typeof value === "string" && edge.region.values.includes(value);
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= edge.region.minimum &&
    value <= edge.region.maximum
  );
}

export function symbolicSegmentMatches(
  segment: SymbolicAxisSegment,
  matches: (value: SymbolicDenotationScalar) => boolean,
): boolean {
  if (segment.kind === "enum") return matches(segment.values[0]);
  const atMinimum = matches(segment.minimum);
  const atMaximum = matches(segment.maximum);
  if (atMinimum !== atMaximum)
    invalid(
      "numeric_partition_not_theory_complete",
      `${segment.minimum}:${segment.maximum}`,
    );
  return atMinimum;
}
