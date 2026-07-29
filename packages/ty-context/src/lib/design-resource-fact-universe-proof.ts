import type { DesignResourceObservableFactManifestV1 } from "./design-resource-fact-manifest-types.js";
import {
  designFactComparatorSupportsMethod,
  designFactMethodIsCompatible,
  designFactOracleSupportsMethod,
  EXACT_TARGET_FULL_TARGET_METHODS,
} from "./design-resource-fact-policy.js";
import {
  resolveDesignResourceLocatorValue,
  validateDesignResourceLocatedDigest,
} from "./design-resource-fact-locator-validation.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type { DesignResourceHandoffTargetV1 } from "./design-resource-handoff-types.js";
import {
  invalid,
  nonempty,
  unique,
} from "./design-resource-fact-universe-helpers.js";

export function validateManifestProofAndEvidence(
  manifest: DesignResourceObservableFactManifestV1,
  target: DesignResourceHandoffTargetV1,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  validateOraclesAndEnvironments(manifest, resources, contents);
  validateProofObligations(manifest, resources, contents);
  validateExactTargetFullTargetProof(manifest, target);
  validateEvidence(manifest, resources, contents);
}

function validateOraclesAndEnvironments(
  manifest: DesignResourceObservableFactManifestV1,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  for (const oracle of manifest.oracles) {
    nonempty(
      oracle.capability_refs,
      `manifest_oracle_capabilities_required:${oracle.key}`,
    );
    unique(
      oracle.capability_refs,
      `manifest_oracle_capability_duplicate:${oracle.key}`,
    );
    if (oracle.trust === "frozen_executable" && oracle.sha256 === null)
      invalid("manifest_oracle_digest_required", oracle.key);
    if (oracle.trust === "named_external_tcb" && oracle.sha256 !== null)
      invalid("manifest_external_oracle_digest_forbidden", oracle.key);
  }
  for (const environment of manifest.environments)
    validateDesignResourceLocatedDigest(
      environment.definition,
      resources,
      contents,
      `manifest.environment.${environment.key}`,
    );
}

function validateProofObligations(
  manifest: DesignResourceObservableFactManifestV1,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  const properties = new Map(
    manifest.properties.map((property) => [property.key, property]),
  );
  const oracles = new Map(manifest.oracles.map((item) => [item.key, item]));
  const environments = new Map(
    manifest.environments.map((item) => [item.key, item]),
  );
  const proofMethodsByFact = new Map<string, Set<string>>();
  const factMethodIdentities: string[] = [];
  for (const proof of manifest.proof_obligations) {
    validateProof(proof, manifest, oracles, environments, resources, contents);
    const identity = `${proof.fact_ref}\0${proof.method}`;
    factMethodIdentities.push(identity);
    const methods = proofMethodsByFact.get(proof.fact_ref) ?? new Set<string>();
    methods.add(proof.method);
    proofMethodsByFact.set(proof.fact_ref, methods);
  }
  unique(factMethodIdentities, "manifest_fact_method_obligation_duplicate");
  for (const fact of manifest.facts) {
    const actualMethods = proofMethodsByFact.get(fact.key);
    if (!actualMethods)
      invalid("manifest_fact_proof_obligation_required", fact.key);
    const requiredMethods = new Set(
      properties.get(fact.property_ref)!.required_methods,
    );
    if (
      fact.lineage.design_system_ref !== null &&
      (fact.lineage.token_chain_refs.length > 0 ||
        fact.lineage.override_chain_refs.length > 0)
    )
      requiredMethods.add("design_token");
    for (const method of requiredMethods)
      if (!actualMethods.has(method))
        invalid(
          "manifest_fact_required_proof_method_missing",
          `${fact.key}:${method}`,
        );
  }
}

function validateProof(
  proof: DesignResourceObservableFactManifestV1["proof_obligations"][number],
  manifest: DesignResourceObservableFactManifestV1,
  oracles: Map<
    string,
    DesignResourceObservableFactManifestV1["oracles"][number]
  >,
  environments: Map<
    string,
    DesignResourceObservableFactManifestV1["environments"][number]
  >,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  const fact = manifest.facts.find((item) => item.key === proof.fact_ref);
  if (!fact) invalid("manifest_proof_fact_unknown", proof.key);
  if (!designFactMethodIsCompatible(fact.dimension, proof.method))
    invalid(
      "manifest_proof_method_incompatible",
      `${proof.key}:${fact.dimension}:${proof.method}`,
    );
  if (
    !designFactComparatorSupportsMethod(
      proof.method,
      proof.comparison.comparator,
    )
  )
    invalid(
      "manifest_proof_comparator_method_incompatible",
      `${proof.key}:${proof.method}:${proof.comparison.comparator}`,
    );
  const oracle = oracles.get(proof.oracle_ref);
  if (!oracle) invalid("manifest_proof_oracle_unknown", proof.key);
  if (!designFactOracleSupportsMethod(proof.method, oracle.capability_refs))
    invalid(
      "manifest_proof_oracle_capability_missing",
      `${proof.key}:${proof.oracle_ref}:${proof.method}`,
    );
  if (!environments.has(proof.environment_ref))
    invalid("manifest_proof_environment_unknown", proof.key);
  validateComparison(proof, resources, contents);
}

function validateComparison(
  proof: DesignResourceObservableFactManifestV1["proof_obligations"][number],
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  validateDesignResourceLocatedDigest(
    proof.comparison.parameters,
    resources,
    contents,
    `manifest.proof.${proof.key}.parameters`,
  );
  if (proof.comparison.mode === "exact") {
    if (proof.comparison.tolerance !== null || proof.comparison.mask !== null)
      invalid("manifest_exact_proof_tolerance_forbidden", proof.key);
  } else if (proof.comparison.tolerance === null)
    invalid("manifest_tolerance_proof_tolerance_required", proof.key);
  if (proof.comparison.tolerance)
    validateDesignResourceLocatedDigest(
      proof.comparison.tolerance,
      resources,
      contents,
      `manifest.proof.${proof.key}.tolerance`,
    );
  if (proof.comparison.mask)
    validateDesignResourceLocatedDigest(
      proof.comparison.mask,
      resources,
      contents,
      `manifest.proof.${proof.key}.mask`,
    );
  if (
    proof.comparison.mask !== null &&
    proof.comparison.comparator !== "pixel_diff" &&
    !proof.comparison.comparator.startsWith("custom.")
  )
    invalid(
      "manifest_proof_mask_comparator_incompatible",
      `${proof.key}:${proof.comparison.comparator}`,
    );
}

function validateExactTargetFullTargetProof(
  manifest: DesignResourceObservableFactManifestV1,
  target: DesignResourceHandoffTargetV1,
): void {
  if (target.interpretation !== "exact_target") return;
  for (const condition of manifest.conditions)
    for (const method of EXACT_TARGET_FULL_TARGET_METHODS)
      if (!hasFullTargetProof(manifest, condition.key, method))
        invalid(
          "manifest_exact_target_full_target_proof_missing",
          `${target.key}:${condition.key}:${method}`,
        );
}

function hasFullTargetProof(
  manifest: DesignResourceObservableFactManifestV1,
  conditionRef: string,
  method: string,
): boolean {
  return manifest.proof_obligations.some((proof) => {
    const fact = manifest.facts.find((item) => item.key === proof.fact_ref);
    return (
      fact?.condition_ref === conditionRef &&
      fact.observation_scope === "full_target" &&
      proof.method === method
    );
  });
}

function validateEvidence(
  manifest: DesignResourceObservableFactManifestV1,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  const conditions = new Set(manifest.conditions.map((item) => item.key));
  for (const evidenceItem of manifest.evidence) {
    const resource = resources.get(evidenceItem.resource_ref);
    const bytes = contents.get(evidenceItem.resource_ref);
    if (!resource || !bytes)
      invalid("manifest_evidence_resource_unknown", evidenceItem.key);
    for (const conditionRef of evidenceItem.condition_refs)
      if (!conditions.has(conditionRef))
        invalid(
          "manifest_evidence_condition_unknown",
          `${evidenceItem.key}:${conditionRef}`,
        );
    resolveDesignResourceLocatorValue(
      { resource_ref: evidenceItem.resource_ref, ...evidenceItem.locator },
      resource,
      bytes,
      `manifest.evidence.${evidenceItem.key}`,
    );
  }
}
