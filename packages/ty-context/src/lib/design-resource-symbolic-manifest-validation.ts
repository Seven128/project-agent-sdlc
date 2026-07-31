import { validateDesignResourceLocatedDigest } from "./design-resource-fact-locator-validation.js";
import type { DesignResourcePropertyDefinitionV1 } from "./design-resource-fact-types.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import { validateSymbolicDispositions } from "./design-resource-symbolic-disposition-validation.js";
import {
  validateSymbolicCertificates,
  validateSymbolicExactTargetMethods,
  validateSymbolicObligations,
} from "./design-resource-symbolic-proof-validation.js";
import {
  aggregateSymbolicCanonicalMetrics,
  validateSymbolicApplicabilityClosure,
  validateSymbolicPopulationAndQuantifier,
  validateSymbolicQuantifier,
  validateSymbolicRegionWithinReachable,
} from "./design-resource-symbolic-region-validation.js";
import {
  validateSymbolicInspectorAndResources,
  validateSymbolicPropertyCatalog,
} from "./design-resource-symbolic-resource-validation.js";
import type {
  DesignResourceHandoffPreflightV2,
  DesignResourceObservableRuleManifestV2,
  ParsedDesignResourceHandoffV2,
} from "./design-resource-symbolic-fact-types.js";
import {
  designResourceSymbolicRuleKey,
  invalid,
  omitRuleIdentityFields,
  requireKnownRefs,
  stableJson,
  unique,
} from "./design-resource-symbolic-validation-support.js";
import { compileSymbolicDenotation } from "./symbolic-denotation-engine.js";

export function validateDesignResourceSymbolicManifest(
  manifest: DesignResourceObservableRuleManifestV2,
  parsed: ParsedDesignResourceHandoffV2,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): {
  ruleProjections: DesignResourceHandoffPreflightV2["rule_projections"];
  metrics: DesignResourceHandoffPreflightV2["metrics"];
} {
  validateManifestIdentities(manifest);
  const target = parsed.handoff.targets[0];
  if (!manifest.subjects.length || !manifest.properties.length)
    invalid("v2_subject_property_universe_required", target.key);
  const reachable = compileSymbolicDenotation(
    manifest.axis_domains,
    manifest.reachable_region,
  );
  if (reachable.canonical_dag.root_ref === "terminal.false")
    invalid("v2_reachable_region_empty", target.key);
  validateSymbolicInspectorAndResources(manifest, target, resources, contents);
  validateSymbolicPropertyCatalog(manifest.properties);
  const indexes = buildManifestIndexes(manifest, parsed);
  validateSubjects(manifest, target.key, indexes);
  validatePopulations(manifest, indexes, resources, contents);
  const ruleProjections = validateRules(
    manifest,
    target.key,
    indexes,
    resources,
    contents,
  );
  validateSymbolicDispositions(manifest, target.key, indexes);
  validateSymbolicApplicabilityClosure(manifest, reachable);
  validateSymbolicObligations(
    manifest,
    ruleProjections,
    indexes.properties,
    indexes.oracles,
    indexes.environments,
    resources,
    contents,
  );
  const certificateMetrics = validateSymbolicCertificates(
    manifest,
    ruleProjections,
  );
  validateSymbolicExactTargetMethods(
    target.interpretation,
    manifest,
    indexes.properties,
  );
  const dagMetrics = aggregateSymbolicCanonicalMetrics(ruleProjections);
  return {
    ruleProjections,
    metrics: {
      semantic_obligations: manifest.semantic_proof_obligations.length,
      certificate_obligations: manifest.noninterference_certificates.length,
      certificate_covered_omitted_axes: certificateMetrics.coveredOmittedAxes,
      certificate_covered_dependency_edges:
        certificateMetrics.coveredDependencyEdges,
      canonical_dag_nodes: dagMetrics.nodes,
      canonical_partition_edges: dagMetrics.edges,
      canonical_bytes: dagMetrics.bytes,
      theoretical_ground_cardinality: reachable.theoretical_ground_cardinality,
    },
  };
}

function validateManifestIdentities(
  manifest: DesignResourceObservableRuleManifestV2,
): void {
  for (const [label, keys] of [
    ["inspector_census", manifest.inspector.census.map((item) => item.key)],
    ["axis_domain", manifest.axis_domains.map((item) => item.key)],
    ["subject", manifest.subjects.map((item) => item.key)],
    ["population", manifest.populations.map((item) => item.key)],
    ["property", manifest.properties.map((item) => item.key)],
    ["fact_rule", manifest.fact_rules.map((item) => item.key)],
    [
      "disposition_region",
      manifest.disposition_regions.map((item) => item.key),
    ],
    [
      "semantic_obligation",
      manifest.semantic_proof_obligations.map((item) => item.key),
    ],
    ["dependency_edge", manifest.dependency_edges.map((item) => item.key)],
    [
      "certificate",
      manifest.noninterference_certificates.map((item) => item.key),
    ],
    ["oracle", manifest.oracles.map((item) => item.key)],
    ["environment", manifest.environments.map((item) => item.key)],
  ] as const)
    unique(keys, `v2_${label}_key_duplicate`);
}

function buildManifestIndexes(
  manifest: DesignResourceObservableRuleManifestV2,
  parsed: ParsedDesignResourceHandoffV2,
) {
  return {
    sourceItems: new Set(parsed.source_item_keys),
    census: new Set(manifest.inspector.census.map((item) => item.key)),
    subjects: new Map(manifest.subjects.map((item) => [item.key, item])),
    populations: new Map(manifest.populations.map((item) => [item.key, item])),
    properties: new Map(manifest.properties.map((item) => [item.key, item])),
    oracles: new Map(manifest.oracles.map((item) => [item.key, item])),
    environments: new Map(
      manifest.environments.map((item) => [item.key, item]),
    ),
    inspectorCapabilities: new Set(manifest.inspector.capability_refs),
  };
}

export type SymbolicManifestIndexes = ReturnType<typeof buildManifestIndexes>;

function validateSubjects(
  manifest: DesignResourceObservableRuleManifestV2,
  targetKey: string,
  indexes: SymbolicManifestIndexes,
): void {
  for (const subject of manifest.subjects) {
    if (!subject.target_refs.includes(targetKey))
      invalid("v2_subject_target_mismatch", subject.key);
    requireKnownRefs(
      subject.census_refs,
      indexes.census,
      "v2_subject_census_unknown",
    );
    if (
      subject.population_ref &&
      !indexes.populations.has(subject.population_ref)
    )
      invalid("v2_subject_population_unknown", subject.key);
    for (const endpoint of subject.relation_endpoints)
      if (!indexes.subjects.has(endpoint.subject_ref))
        invalid(
          "v2_relation_endpoint_subject_unknown",
          `${subject.key}:${endpoint.subject_ref}`,
        );
    if (subject.kind === "relation" && subject.relation_endpoints.length < 2)
      invalid("v2_relation_endpoints_incomplete", subject.key);
  }
}

function validatePopulations(
  manifest: DesignResourceObservableRuleManifestV2,
  indexes: SymbolicManifestIndexes,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  for (const population of manifest.populations) {
    requireKnownRefs(
      population.member_subject_refs,
      indexes.subjects,
      "v2_population_subject_unknown",
    );
    validateDesignResourceLocatedDigest(
      population.universe,
      resources,
      contents,
      `population.${population.key}.universe`,
    );
    validateSymbolicQuantifier(population.quantifier, population.key);
    for (const exclusion of population.exclusions) {
      if (!exclusion.basis_refs.length)
        invalid("v2_population_exclusion_basis_required", exclusion.key);
      compileSymbolicDenotation(manifest.axis_domains, exclusion.region);
    }
  }
}

function validateRules(
  manifest: DesignResourceObservableRuleManifestV2,
  targetKey: string,
  indexes: SymbolicManifestIndexes,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): DesignResourceHandoffPreflightV2["rule_projections"] {
  return manifest.fact_rules.map((rule) => {
    const compiled = compileSymbolicDenotation(
      manifest.axis_domains,
      rule.region,
    );
    validateSymbolicRegionWithinReachable(
      manifest.axis_domains,
      rule.region,
      manifest.reachable_region,
      rule.key,
    );
    const subject = indexes.subjects.get(rule.subject_or_relation_ref);
    const property = indexes.properties.get(rule.property_ref);
    if (!subject) invalid("v2_rule_subject_unknown", rule.key);
    if (!property) invalid("v2_rule_property_unknown", rule.key);
    if (rule.target_ref !== targetKey)
      invalid("v2_rule_target_mismatch", rule.key);
    validateRuleAuthority(rule, subject.population_ref, property, indexes);
    validateRuleValues(rule, compiled.canonical_sha256, resources, contents);
    return { rule, compiled_region: compiled };
  });
}

function validateRuleAuthority(
  rule: DesignResourceObservableRuleManifestV2["fact_rules"][number],
  subjectPopulationRef: string | null,
  property: DesignResourcePropertyDefinitionV1,
  indexes: SymbolicManifestIndexes,
): void {
  validateSymbolicPopulationAndQuantifier(
    rule,
    subjectPopulationRef,
    indexes.populations,
  );
  requireKnownRefs(rule.census_refs, indexes.census, "v2_rule_census_unknown");
  requireKnownRefs(
    rule.source_item_refs,
    indexes.sourceItems,
    "v2_rule_source_item_unknown",
  );
  requireKnownRefs(
    property.census_refs,
    indexes.census,
    "v2_property_census_unknown",
  );
  if (!property.census_refs.length)
    invalid("v2_rule_property_census_required", rule.key);
  for (const capability of property.inspector_capability_refs)
    if (!indexes.inspectorCapabilities.has(capability))
      invalid(
        "v2_rule_inspector_capability_missing",
        `${rule.key}:${capability}`,
      );
  if (rule.value_kind !== property.value_kind)
    invalid("v2_rule_value_kind_mismatch", rule.key);
}

function validateRuleValues(
  rule: DesignResourceObservableRuleManifestV2["fact_rules"][number],
  regionSha256: string,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  validateDesignResourceLocatedDigest(
    rule.expected,
    resources,
    contents,
    `rule.${rule.key}.expected`,
  );
  validateDesignResourceLocatedDigest(
    rule.lineage.resolved_value,
    resources,
    contents,
    `rule.${rule.key}.lineage.resolved_value`,
  );
  if (stableJson(rule.expected) !== stableJson(rule.lineage.resolved_value))
    invalid("v2_rule_expected_lineage_mismatch", rule.key);
  const expectedKey = designResourceSymbolicRuleKey(
    omitRuleIdentityFields(rule),
    regionSha256,
  );
  if (rule.key !== expectedKey)
    invalid("v2_rule_identity_mismatch", `${rule.key}:${expectedKey}`);
}
