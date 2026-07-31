import type {
  DesignResourceHandoffPreflightV2,
  DesignResourceSymbolicDispositionRegionV2,
  DesignResourceSymbolicFactRuleV2,
} from "./design-resource-symbolic-fact-types.js";
import {
  compileSymbolicDenotation,
  evaluateCanonicalSymbolicDenotation,
} from "./symbolic-denotation-engine.js";
import type {
  SymbolicDenotationScalar,
  SymbolicExtensionalPointV1,
  SymbolicPointDenotationV1,
} from "./symbolic-denotation-types.js";

export function denoteDesignResourceSymbolicPoint(
  preflight: DesignResourceHandoffPreflightV2,
  point: SymbolicExtensionalPointV1,
): SymbolicPointDenotationV1 {
  const manifest = preflight.manifest;
  const assignment = {
    ...point.condition_assignment,
    ...point.variation_assignment,
  };
  validateCompleteAssignment(manifest.axis_domains, assignment);
  const reachable = compileSymbolicDenotation(
    manifest.axis_domains,
    manifest.reachable_region,
  );
  if (!evaluateCanonicalSymbolicDenotation(reachable.canonical_dag, assignment))
    invalid("extensional_point_unreachable", pointIdentity(point));
  const ruleProjections = new Map(
    preflight.rule_projections.map((projection) => [
      projection.rule.key,
      projection,
    ]),
  );
  const rules = manifest.fact_rules.filter(
    (rule) =>
      sameSemanticTuple(rule, point) &&
      evaluateCanonicalSymbolicDenotation(
        ruleProjections.get(rule.key)!.compiled_region.canonical_dag,
        assignment,
      ),
  );
  const dispositions = manifest.disposition_regions.filter(
    (region) =>
      sameSemanticTuple(region, point) &&
      evaluateCanonicalSymbolicDenotation(
        compileSymbolicDenotation(manifest.axis_domains, region.region)
          .canonical_dag,
        assignment,
      ),
  );
  if (rules.length + dispositions.length !== 1)
    invalid(
      "extensional_point_effective_region_invalid",
      `${pointIdentity(point)}:rules=${rules.length}:dispositions=${dispositions.length}`,
    );
  if (dispositions.length)
    return {
      disposition: dispositions[0].disposition,
      expected_semantics: null,
      proof_obligations: [],
    };
  const rule = rules[0];
  const obligations = rule.semantic_obligation_refs
    .map((ref) =>
      manifest.semantic_proof_obligations.find((item) => item.key === ref),
    )
    .map((obligation) => {
      if (!obligation) invalid("semantic_obligation_unknown", rule.key);
      const oracle = manifest.oracles.find(
        (item) => item.key === obligation.oracle_ref,
      );
      const environment = manifest.environments.find(
        (item) => item.key === obligation.environment_ref,
      );
      if (!oracle || !environment)
        invalid("semantic_obligation_authority_unknown", obligation.key);
      return {
        method: obligation.method,
        proof_surface: obligation.proof_surface,
        observation_boundary: obligation.observation_boundary,
        comparison: structuredClone(obligation.comparison),
        oracle: structuredClone(oracle),
        environment: structuredClone(environment),
        protected_value_policy: obligation.protected_value_policy,
        completion_effect: obligation.completion_effect,
      };
    })
    .sort((left, right) => compareText(left.method, right.method));
  return {
    disposition: "specified",
    expected_semantics: {
      value_type: rule.value_kind,
      expected: structuredClone(rule.expected),
      provenance_ref: rule.provenance_ref,
      sensitivity: rule.observation_sensitivity,
      population_ref: rule.population_ref,
      quantifier: structuredClone(rule.quantifier),
      lineage: structuredClone(rule.lineage),
    },
    proof_obligations: obligations,
  };
}

function sameSemanticTuple(
  row:
    | DesignResourceSymbolicFactRuleV2
    | DesignResourceSymbolicDispositionRegionV2,
  point: SymbolicExtensionalPointV1,
): boolean {
  return (
    row.subject_or_relation_ref === point.subject_or_relation_ref &&
    row.target_ref === point.target_ref &&
    row.property_ref === point.property_ref &&
    row.population_ref === point.population_ref &&
    canonicalJson(row.quantifier) === canonicalJson(point.quantifier)
  );
}

function validateCompleteAssignment(
  domains: DesignResourceHandoffPreflightV2["manifest"]["axis_domains"],
  assignment: Record<string, SymbolicDenotationScalar>,
): void {
  const actual = Object.keys(assignment).sort(compareText);
  const expected = domains.map((domain) => domain.key).sort(compareText);
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  )
    invalid(
      "extensional_assignment_axis_set_mismatch",
      `${actual.join(",")}:${expected.join(",")}`,
    );
  for (const domain of domains) {
    const value = assignment[domain.key];
    if (
      domain.kind === "enum"
        ? typeof value !== "string" || !domain.values.includes(value)
        : typeof value !== "number" ||
          !Number.isSafeInteger(value) ||
          value < domain.minimum ||
          value > domain.maximum
    )
      invalid(
        "extensional_assignment_value_outside_domain",
        `${domain.key}:${String(value)}`,
      );
  }
}

function pointIdentity(point: SymbolicExtensionalPointV1): string {
  return [
    point.subject_or_relation_ref,
    point.target_ref,
    point.property_ref,
    point.population_ref ?? "none",
    canonicalJson(point.quantifier),
    canonicalJson(point.condition_assignment),
    canonicalJson(point.variation_assignment),
  ].join(":");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareText(left, right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function invalid(code: string, detail: string): never {
  throw new Error(
    `design_resource_symbolic_denotation_invalid:${code}:${detail}`,
  );
}
