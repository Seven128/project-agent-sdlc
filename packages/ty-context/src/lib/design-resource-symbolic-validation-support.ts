import { createHash } from "node:crypto";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";
import type {
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicDependencyEdgeV2,
  DesignResourceSymbolicFactRuleV2,
  DesignResourceSymbolicNoninterferenceCertificateV2,
} from "./design-resource-symbolic-fact-types.js";

const ALL_EFFECTS = [
  "disposition",
  "expected_semantics",
  "proof_denotation",
] as const;

export function designResourceSymbolicRuleKey(
  rule: Omit<
    DesignResourceSymbolicFactRuleV2,
    "key" | "semantic_obligation_refs"
  >,
  regionSha256: string,
): string {
  return `rule.${sha256(
    stableJson({
      subject_or_relation_ref: rule.subject_or_relation_ref,
      target_ref: rule.target_ref,
      property_ref: rule.property_ref,
      population_ref: rule.population_ref,
      quantifier: rule.quantifier,
      region_sha256: regionSha256,
      expected: rule.expected,
      value_kind: rule.value_kind,
      provenance_ref: rule.provenance_ref,
      observation_scope: rule.observation_scope,
      observation_sensitivity: rule.observation_sensitivity,
      lineage: rule.lineage,
      evidence_refs: [...rule.evidence_refs].sort(compareText),
      census_refs: [...rule.census_refs].sort(compareText),
      source_item_refs: [...rule.source_item_refs].sort(compareText),
    }),
  )}`;
}

export function designResourceSymbolicObligationKey(
  obligation: Omit<
    DesignResourceObservableRuleManifestV2["semantic_proof_obligations"][number],
    "key"
  >,
): string {
  return `obligation.${sha256(stableJson(obligation))}`;
}

export function designResourceSymbolicDependencyEdge(
  axisRef: string,
  factRuleRef: string,
): DesignResourceSymbolicDependencyEdgeV2 {
  const body = {
    axis_ref: axisRef,
    fact_rule_ref: factRuleRef,
    effects: [...ALL_EFFECTS],
  };
  return { key: `edge.${sha256(stableJson(body))}`, ...body };
}

export function designResourceSymbolicCertificateKey(
  certificate: Omit<DesignResourceSymbolicNoninterferenceCertificateV2, "key">,
): string {
  return `certificate.${sha256(
    stableJson({
      ...certificate,
      fact_rule_refs: [...certificate.fact_rule_refs].sort(compareText),
      omitted_axis_refs: [...certificate.omitted_axis_refs].sort(compareText),
      dependency_edge_refs: [...certificate.dependency_edge_refs].sort(
        compareText,
      ),
    }),
  )}`;
}

export function designResourceSymbolicCombinedRuleDigest(
  ruleProjections: Array<{
    rule: { key: string };
    compiled_region: { canonical_sha256: string };
  }>,
): string {
  return sha256(
    stableJson(
      ruleProjections
        .map((projection) => ({
          rule_ref: projection.rule.key,
          region_sha256: projection.compiled_region.canonical_sha256,
        }))
        .sort((left, right) => compareText(left.rule_ref, right.rule_ref)),
    ),
  );
}

export function omitRuleIdentityFields(
  rule: DesignResourceSymbolicFactRuleV2,
): Omit<DesignResourceSymbolicFactRuleV2, "key" | "semantic_obligation_refs"> {
  const { key: _key, semantic_obligation_refs: _refs, ...value } = rule;
  return value;
}

export function omitKey<T extends { key: string }>(value: T): Omit<T, "key"> {
  const { key: _key, ...rest } = value;
  return rest;
}

export function requireExactRefs<T>(
  refs: string[],
  values: Map<string, T>,
  code: string,
): void {
  unique(refs, `${code}_duplicate`);
  requireKnownRefs(refs, values, `${code}_unknown`);
}

export function requireKnownRefs(
  refs: string[],
  values: ReadonlyMap<string, unknown> | ReadonlySet<string>,
  code: string,
): void {
  for (const ref of refs) if (!values.has(ref)) invalid(code, ref);
}

export function unique(values: string[], code: string): void {
  if (new Set(values).size !== values.length) invalid(code, "");
}

export function assertSameSet(
  actual: string[],
  expected: string[],
  code: string,
  detail: string,
): void {
  const left = [...new Set(actual)].sort(compareText);
  const right = [...new Set(expected)].sort(compareText);
  if (
    left.length !== right.length ||
    left.some((item, index) => item !== right[index])
  )
    invalid(code, `${detail}:${left.join(",")}:${right.join(",")}`);
}

export function assertCanonicalSet<T extends { key: string }>(
  actual: T[],
  expected: T[],
  code: string,
): void {
  const left = new Map(actual.map((item) => [item.key, stableJson(item)]));
  const right = new Map(expected.map((item) => [item.key, stableJson(item)]));
  assertSameSet([...left.keys()], [...right.keys()], code, "keys");
  for (const [key, value] of right)
    if (left.get(key) !== value) invalid(code, key);
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareText(left, right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function invalid(code: string, detail: string): never {
  invalidDesignResourceHandoff(code, detail);
}
