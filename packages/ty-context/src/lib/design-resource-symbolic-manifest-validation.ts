import { validateDesignResourceLocatedDigest } from "./design-resource-fact-locator-validation.js";
import type { DesignResourcePropertyDefinitionV1 } from "./design-resource-fact-types.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import { buildSymbolicApplicabilityIndex } from "./design-resource-symbolic-applicability-validation.js";
import { createDesignResourceSymbolicCompilationSession } from "./design-resource-symbolic-compilation.js";
import { validateSymbolicDispositions } from "./design-resource-symbolic-disposition-validation.js";
import {
  validateSymbolicCertificates,
  validateSymbolicObligations,
} from "./design-resource-symbolic-proof-validation.js";
import {
  aggregateSymbolicCanonicalMetrics,
  validateSymbolicApplicabilityClosure,
  validateSymbolicPopulationAndQuantifier,
  validateSymbolicRegionWithinReachable,
} from "./design-resource-symbolic-region-validation.js";
import {
  validateSymbolicInspectorAndResources,
  validateSymbolicPropertyCatalog,
} from "./design-resource-symbolic-resource-validation.js";
import {
  validateSymbolicExactTargetCoverage,
  validateSymbolicReadinessClosure,
} from "./design-resource-symbolic-safety-validation.js";
import {
  validateSymbolicCensusClosure,
  validateSymbolicSubjectPopulationClosure,
} from "./design-resource-symbolic-structural-closure-validation.js";
import type {
  DesignResourceHandoffPreflightV2,
  DesignResourceObservableRuleManifestV2,
  ParsedDesignResourceHandoffV2,
} from "./design-resource-symbolic-fact-types.js";
import {
  buildSymbolicManifestIndexes,
  type SymbolicManifestIndexes,
} from "./design-resource-symbolic-indexes.js";
import {
  designResourceSymbolicRuleKey,
  invalid,
  omitRuleIdentityFields,
  requireKnownRefs,
  stableJson,
  unique,
} from "./design-resource-symbolic-validation-support.js";

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
  validateSymbolicReadinessClosure(manifest);
  const target = parsed.handoff.targets[0];
  if (!manifest.subjects.length || !manifest.properties.length)
    invalid("v2_subject_property_universe_required", target.key);
  const compilation = createDesignResourceSymbolicCompilationSession(manifest);
  const reachable = compilation.compile(manifest.reachable_region);
  if (reachable.canonical_dag.root_ref === "terminal.false")
    invalid("v2_reachable_region_empty", target.key);
  validateSymbolicInspectorAndResources(manifest, target, resources, contents);
  validateSymbolicPropertyCatalog(manifest.properties);
  const indexes = buildSymbolicManifestIndexes(manifest, parsed);
  validateSymbolicSubjectPopulationClosure(
    manifest,
    target,
    indexes,
    resources,
    contents,
    compilation,
  );
  const applicability = buildSymbolicApplicabilityIndex(manifest, indexes);
  const ruleProjections = validateRules(
    manifest,
    target,
    indexes,
    resources,
    contents,
    compilation,
  );
  validateSymbolicCensusClosure(manifest, indexes);
  validateSymbolicDispositions(manifest, target.key, indexes, compilation);
  const certificateMetrics = validateSymbolicCertificates(
    manifest,
    ruleProjections,
    indexes,
    compilation,
  );
  validateSymbolicApplicabilityClosure(
    manifest,
    reachable,
    indexes,
    applicability,
    compilation,
  );
  validateSymbolicObligations(
    manifest,
    ruleProjections,
    indexes.properties,
    indexes.oracles,
    indexes.environments,
    target,
    resources,
    contents,
  );
  validateSymbolicExactTargetCoverage(
    target.interpretation,
    manifest,
    ruleProjections,
    reachable,
    compilation,
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
    [
      "acceptance_blocker",
      manifest.acceptance_blockers.map((item) => item.key),
    ],
  ] as const)
    unique(keys, `v2_${label}_key_duplicate`);
}

function validateRules(
  manifest: DesignResourceObservableRuleManifestV2,
  target: ParsedDesignResourceHandoffV2["handoff"]["targets"][number],
  indexes: SymbolicManifestIndexes,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
  compilation: ReturnType<
    typeof createDesignResourceSymbolicCompilationSession
  >,
): DesignResourceHandoffPreflightV2["rule_projections"] {
  const reachableRegionDigests = new Set<string>();
  return manifest.fact_rules.map((rule) => {
    const compiled = compilation.compile(rule.region);
    if (!reachableRegionDigests.has(compiled.canonical_sha256)) {
      validateSymbolicRegionWithinReachable(
        rule.region,
        manifest.reachable_region,
        rule.key,
        compilation,
      );
      reachableRegionDigests.add(compiled.canonical_sha256);
    }
    const subject = indexes.subjects.get(rule.subject_or_relation_ref);
    const property = indexes.properties.get(rule.property_ref);
    if (!subject) invalid("v2_rule_subject_unknown", rule.key);
    if (!property) invalid("v2_rule_property_unknown", rule.key);
    if (rule.target_ref !== target.key)
      invalid("v2_rule_target_mismatch", rule.key);
    validateRuleAuthority(rule, subject.population_ref, property, indexes);
    validateRuleValues(
      rule,
      compiled.canonical_sha256,
      new Set(target.resource_refs),
      resources,
      contents,
    );
    return { rule, compiled_region: compiled };
  });
}

function validateRuleAuthority(
  rule: DesignResourceObservableRuleManifestV2["fact_rules"][number],
  subjectPopulationRef: string | null,
  property: DesignResourcePropertyDefinitionV1,
  indexes: SymbolicManifestIndexes,
): void {
  unique(rule.census_refs, `v2_rule_census_ref_duplicate:${rule.key}`);
  unique(
    rule.source_item_refs,
    `v2_rule_source_item_ref_duplicate:${rule.key}`,
  );
  unique(
    rule.semantic_obligation_refs,
    `v2_rule_obligation_ref_duplicate:${rule.key}`,
  );
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
  const subject = indexes.subjects.get(rule.subject_or_relation_ref)!;
  for (const ref of [...subject.census_refs, ...property.census_refs])
    if (!rule.census_refs.includes(ref))
      invalid("v2_rule_required_census_ref_missing", `${rule.key}:${ref}`);
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
  targetResources: Set<string>,
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
  for (const located of [rule.expected, rule.lineage.resolved_value])
    if (
      targetResources.size &&
      !targetResources.has(located.locator.resource_ref)
    )
      invalid(
        "v2_rule_resource_outside_target",
        `${rule.key}:${located.locator.resource_ref}`,
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
