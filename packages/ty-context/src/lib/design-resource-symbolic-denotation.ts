import type { DesignResourceHandoffPreflightV2 } from "./design-resource-symbolic-fact-types.js";
import { buildSymbolicApplicabilityIndex } from "./design-resource-symbolic-applicability-validation.js";
import { createDesignResourceSymbolicCompilationSession } from "./design-resource-symbolic-compilation.js";
import {
  buildSymbolicManifestIndexes,
  symbolicSemanticTupleKey,
  type SymbolicManifestIndexes,
} from "./design-resource-symbolic-indexes.js";
import { evaluateCanonicalSymbolicDenotation } from "./symbolic-denotation-engine.js";
import type {
  SymbolicDenotationScalar,
  SymbolicExtensionalPointV1,
  SymbolicPointDenotationV1,
} from "./symbolic-denotation-types.js";

const queryIndexCache = new WeakMap<
  DesignResourceHandoffPreflightV2,
  ReturnType<typeof buildQueryIndex>
>();

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
  const query = queryIndex(preflight);
  validatePointTupleAuthority(preflight, query.indexes, point);
  const reachable = query.reachable;
  if (!evaluateCanonicalSymbolicDenotation(reachable.canonical_dag, assignment))
    invalid("extensional_point_unreachable", pointIdentity(point));
  if (
    !query.applicability.isApplicable(
      point.subject_or_relation_ref,
      point.property_ref,
    )
  )
    return {
      disposition: "not_applicable",
      expected_semantics: null,
      proof_obligations: [],
    };
  const tupleKey = symbolicSemanticTupleKey(point);
  const rules = (query.rulesByTuple.get(tupleKey) ?? []).filter((projection) =>
    evaluateCanonicalSymbolicDenotation(
      projection.compiled_region.canonical_dag,
      assignment,
    ),
  );
  const dispositions = (query.dispositionsByTuple.get(tupleKey) ?? []).filter(
    (projection) =>
      evaluateCanonicalSymbolicDenotation(
        projection.compiled.canonical_dag,
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
      disposition: dispositions[0].row.disposition,
      expected_semantics: null,
      proof_obligations: [],
    };
  const rule = rules[0].rule;
  const obligations = rule.semantic_obligation_refs
    .map((ref) => query.indexes.obligations.get(ref))
    .map((obligation) => {
      if (!obligation) invalid("semantic_obligation_unknown", rule.key);
      const oracle = query.indexes.oracles.get(obligation.oracle_ref);
      const environment = query.indexes.environments.get(
        obligation.environment_ref,
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

function validatePointTupleAuthority(
  preflight: DesignResourceHandoffPreflightV2,
  indexes: SymbolicManifestIndexes,
  point: SymbolicExtensionalPointV1,
): void {
  const manifest = preflight.manifest;
  const subject = indexes.subjects.get(point.subject_or_relation_ref);
  if (!subject || point.target_ref !== manifest.target_key)
    invalid("extensional_point_subject_target_unknown", pointIdentity(point));
  if (!indexes.properties.has(point.property_ref))
    invalid("extensional_point_property_unknown", point.property_ref);
  const expectedQuantifier = subject.population_ref
    ? indexes.populations.get(subject.population_ref)?.quantifier
    : { kind: "one" as const, minimum: 1, maximum: 1 };
  if (
    point.population_ref !== subject.population_ref ||
    canonicalJson(point.quantifier) !== canonicalJson(expectedQuantifier)
  )
    invalid(
      "extensional_point_population_quantifier_mismatch",
      pointIdentity(point),
    );
}

function queryIndex(preflight: DesignResourceHandoffPreflightV2) {
  const cached = queryIndexCache.get(preflight);
  if (cached) return cached;
  const built = buildQueryIndex(preflight);
  queryIndexCache.set(preflight, built);
  return built;
}

function buildQueryIndex(preflight: DesignResourceHandoffPreflightV2) {
  const indexes = buildSymbolicManifestIndexes(preflight.manifest, preflight);
  const applicability = buildSymbolicApplicabilityIndex(
    preflight.manifest,
    indexes,
  );
  const compilation = createDesignResourceSymbolicCompilationSession(
    preflight.manifest,
  );
  const rulesByTuple = new Map<
    string,
    DesignResourceHandoffPreflightV2["rule_projections"]
  >();
  for (const projection of preflight.rule_projections) {
    const key = symbolicSemanticTupleKey(projection.rule);
    const values = rulesByTuple.get(key);
    if (values) values.push(projection);
    else rulesByTuple.set(key, [projection]);
  }
  const dispositionsByTuple = new Map<
    string,
    Array<{
      row: DesignResourceHandoffPreflightV2["manifest"]["disposition_regions"][number];
      compiled: ReturnType<typeof compilation.compile>;
    }>
  >();
  for (const row of preflight.manifest.disposition_regions) {
    const key = symbolicSemanticTupleKey(row);
    const projection = { row, compiled: compilation.compile(row.region) };
    const values = dispositionsByTuple.get(key);
    if (values) values.push(projection);
    else dispositionsByTuple.set(key, [projection]);
  }
  return {
    indexes,
    applicability,
    rulesByTuple,
    dispositionsByTuple,
    reachable: compilation.compile(preflight.manifest.reachable_region),
  };
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
