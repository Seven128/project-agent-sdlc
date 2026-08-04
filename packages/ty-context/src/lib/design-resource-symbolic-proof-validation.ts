import type { DesignResourcePropertyDefinitionV1 } from "./design-resource-fact-types.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import {
  validateSymbolicObligationPolicy,
  validateSymbolicProofAuthorities,
} from "./design-resource-symbolic-proof-authority-validation.js";
import type { DesignResourceSymbolicCompilationSession } from "./design-resource-symbolic-compilation.js";
import type {
  DesignResourceHandoffPreflightV2,
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicHandoffTargetV2,
} from "./design-resource-symbolic-fact-types.js";
import type { SymbolicManifestIndexes } from "./design-resource-symbolic-indexes.js";
import { validateTrustedSymbolicNoninterference } from "./design-resource-symbolic-noninterference-validation.js";
import {
  assertCanonicalSet,
  assertSameSet,
  compareText,
  designResourceSymbolicCertificateKey,
  designResourceSymbolicCombinedRuleDigest,
  designResourceSymbolicObligationKey,
  invalid,
  omitKey,
  unique,
} from "./design-resource-symbolic-validation-support.js";

export function validateSymbolicObligations(
  manifest: DesignResourceObservableRuleManifestV2,
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
  properties: Map<string, DesignResourcePropertyDefinitionV1>,
  oracles: Map<
    string,
    DesignResourceObservableRuleManifestV2["oracles"][number]
  >,
  environments: Map<
    string,
    DesignResourceObservableRuleManifestV2["environments"][number]
  >,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  validateSymbolicProofAuthorities(manifest, target, resources, contents);
  const obligations = new Map(
    manifest.semantic_proof_obligations.map((item) => [item.key, item]),
  );
  for (const projection of projections)
    validateRuleObligations(
      projection,
      obligations,
      properties,
      oracles,
      environments,
      target,
      resources,
      contents,
    );
  assertSameSet(
    [...obligations.keys()],
    projections.flatMap(
      (projection) => projection.rule.semantic_obligation_refs,
    ),
    "v2_semantic_obligation_set_mismatch",
    manifest.target_key,
  );
}

function validateRuleObligations(
  projection: DesignResourceHandoffPreflightV2["rule_projections"][number],
  obligations: Map<
    string,
    DesignResourceObservableRuleManifestV2["semantic_proof_obligations"][number]
  >,
  properties: Map<string, DesignResourcePropertyDefinitionV1>,
  oracles: Map<
    string,
    DesignResourceObservableRuleManifestV2["oracles"][number]
  >,
  environments: Map<
    string,
    DesignResourceObservableRuleManifestV2["environments"][number]
  >,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  const { rule } = projection;
  const property = properties.get(rule.property_ref)!;
  const local = rule.semantic_obligation_refs.map((ref) => {
    const obligation = obligations.get(ref);
    if (!obligation)
      invalid("v2_rule_obligation_unknown", `${rule.key}:${ref}`);
    return obligation;
  });
  assertSameSet(
    local.map((item) => item.method),
    property.required_methods,
    "v2_rule_required_methods_mismatch",
    rule.key,
  );
  for (const obligation of local)
    validateObligation(
      obligation,
      projection,
      property,
      oracles,
      environments,
      target,
      resources,
      contents,
    );
}

function validateObligation(
  obligation: DesignResourceObservableRuleManifestV2["semantic_proof_obligations"][number],
  projection: DesignResourceHandoffPreflightV2["rule_projections"][number],
  property: DesignResourcePropertyDefinitionV1,
  oracles: Map<
    string,
    DesignResourceObservableRuleManifestV2["oracles"][number]
  >,
  environments: Map<
    string,
    DesignResourceObservableRuleManifestV2["environments"][number]
  >,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  if (
    obligation.fact_rule_ref !== projection.rule.key ||
    obligation.region_sha256 !== projection.compiled_region.canonical_sha256
  )
    invalid("v2_obligation_rule_region_mismatch", obligation.key);
  const expectedKey = designResourceSymbolicObligationKey(omitKey(obligation));
  if (obligation.key !== expectedKey)
    invalid(
      "v2_obligation_identity_mismatch",
      `${obligation.key}:${expectedKey}`,
    );
  const oracle = oracles.get(obligation.oracle_ref);
  if (!oracle) invalid("v2_obligation_oracle_unknown", obligation.key);
  const environment = environments.get(obligation.environment_ref);
  if (!environment)
    invalid("v2_obligation_environment_unknown", obligation.key);
  validateSymbolicObligationPolicy(
    obligation,
    projection.rule,
    property,
    oracle,
    environment,
    target,
    resources,
    contents,
  );
}

export function validateSymbolicCertificates(
  manifest: DesignResourceObservableRuleManifestV2,
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
  indexes: SymbolicManifestIndexes,
  compilation: DesignResourceSymbolicCompilationSession,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): { coveredOmittedAxes: number; coveredDependencyEdges: number } {
  const byRule = new Map(projections.map((item) => [item.rule.key, item]));
  assertCanonicalSet(
    manifest.dependency_edges,
    [],
    "v2_dependency_edge_set_mismatch",
  );
  const coveredRules: string[] = [];
  const coveredAxes = new Set<string>();
  const coveredEdges = new Set<string>();
  for (const certificate of manifest.noninterference_certificates) {
    if (!certificate.fact_rule_refs.length)
      invalid("v2_certificate_rule_refs_required", certificate.key);
    const local = certificate.fact_rule_refs.map((ref) => {
      const projection = byRule.get(ref);
      if (!projection)
        invalid("v2_certificate_rule_unknown", `${certificate.key}:${ref}`);
      return projection;
    });
    validateCertificate(
      manifest,
      certificate,
      local,
      indexes,
      compilation,
      target,
      resources,
      contents,
    );
    coveredRules.push(...certificate.fact_rule_refs);
    certificate.omitted_axis_refs.forEach((ref) => coveredAxes.add(ref));
    certificate.dependency_edge_refs.forEach((ref) => coveredEdges.add(ref));
  }
  assertCertificateCoverage(manifest, projections, coveredRules, coveredEdges);
  return {
    coveredOmittedAxes: coveredAxes.size,
    coveredDependencyEdges: coveredEdges.size,
  };
}

function validateCertificate(
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceObservableRuleManifestV2["noninterference_certificates"][number],
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
  indexes: SymbolicManifestIndexes,
  compilation: DesignResourceSymbolicCompilationSession,
  target: DesignResourceSymbolicHandoffTargetV2,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  unique(
    certificate.fact_rule_refs,
    `v2_certificate_rule_ref_duplicate:${certificate.key}`,
  );
  unique(
    certificate.omitted_axis_refs,
    `v2_certificate_omitted_axis_duplicate:${certificate.key}`,
  );
  unique(
    certificate.dependency_edge_refs,
    `v2_certificate_dependency_edge_duplicate:${certificate.key}`,
  );
  const expectedAxes = [
    ...new Set(
      projections.flatMap((item) => item.compiled_region.omitted_axis_refs),
    ),
  ].sort(compareText);
  if (
    expectedAxes.length &&
    (!certificate.source_noninterference_proof ||
      !certificate.production_noninterference_proof)
  )
    invalid(
      "v2_noninterference_proof_unavailable",
      `${certificate.key}:${expectedAxes.join(",")}`,
    );
  assertSameSet(
    certificate.omitted_axis_refs,
    expectedAxes,
    "v2_certificate_omitted_axes_mismatch",
    certificate.key,
  );
  assertSameSet(
    certificate.dependency_edge_refs,
    [],
    "v2_certificate_dependency_edges_mismatch",
    certificate.key,
  );
  if (
    certificate.canonical_rule_dag_sha256 !==
    designResourceSymbolicCombinedRuleDigest(projections)
  )
    invalid("v2_certificate_rule_digest_mismatch", certificate.key);
  const expectedKey = designResourceSymbolicCertificateKey(
    omitKey(certificate),
  );
  if (certificate.key !== expectedKey)
    invalid(
      "v2_certificate_identity_mismatch",
      `${certificate.key}:${expectedKey}`,
    );
  validateTrustedSymbolicNoninterference(
    manifest,
    certificate,
    projections,
    indexes,
    compilation,
    target,
    resources,
    contents,
  );
}

function assertCertificateCoverage(
  manifest: DesignResourceObservableRuleManifestV2,
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
  coveredRules: string[],
  coveredEdges: Set<string>,
): void {
  assertSameSet(
    coveredRules,
    projections.map((item) => item.rule.key),
    "v2_certificate_rule_coverage_mismatch",
    manifest.target_key,
  );
  assertSameSet(
    [...coveredEdges],
    [],
    "v2_certificate_edge_coverage_mismatch",
    manifest.target_key,
  );
}
