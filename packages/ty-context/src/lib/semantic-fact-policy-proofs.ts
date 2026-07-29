import {
  isCustomSemanticFactName,
  SEMANTIC_FACT_COMPARATORS,
} from "./semantic-fact-catalog.js";
import {
  assertSameSemanticFactSet,
  semanticFactInvalid,
  uniqueNonemptySemanticFacts,
  uniqueSemanticFacts,
  validateSemanticFactLocatedValue,
} from "./semantic-fact-policy-primitives.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export function validateSemanticFactProofClosure(
  manifest: SemanticFactManifestV1,
): void {
  const propertyByRef = new Map(
    manifest.property_dispositions.map((item) => [item.key, item]),
  );
  const factByRef = new Map(manifest.facts.map((item) => [item.key, item]));
  const oracleByRef = new Map(manifest.oracles.map((item) => [item.key, item]));
  const environmentByRef = new Map(
    manifest.environments.map((item) => [item.key, item]),
  );
  for (const fact of manifest.facts) {
    const property = propertyByRef.get(fact.property_ref)!;
    const proofs = manifest.proof_obligations.filter(
      (item) => item.fact_ref === fact.key,
    );
    assertSameSemanticFactSet(
      proofs.map((item) => item.method),
      property.required_methods,
      `fact_proof_method_universe:${fact.key}`,
    );
    if (
      fact.quantifier.kind !== "one" &&
      !proofs.some((proof) => proof.method === "population_set_equality")
    )
      semanticFactInvalid(
        "quantified_fact_population_proof_required",
        fact.key,
      );
  }
  for (const proof of manifest.proof_obligations)
    validateProof(
      manifest,
      proof,
      propertyByRef,
      factByRef,
      oracleByRef,
      environmentByRef,
    );
  for (const oracle of manifest.oracles) {
    uniqueNonemptySemanticFacts(
      oracle.capabilities,
      `oracle_capabilities:${oracle.key}`,
    );
    if (oracle.trust === "frozen_executable" && !oracle.sha256)
      semanticFactInvalid("frozen_oracle_sha256_required", oracle.key);
    if (oracle.trust === "named_external_tcb" && oracle.sha256)
      semanticFactInvalid("external_oracle_sha256_forbidden", oracle.key);
  }
  for (const environment of manifest.environments)
    validateSemanticFactLocatedValue(
      manifest,
      environment.definition,
      `environment:${environment.key}`,
    );
}

function validateProof(
  manifest: SemanticFactManifestV1,
  proof: SemanticFactManifestV1["proof_obligations"][number],
  propertyByRef: Map<
    string,
    SemanticFactManifestV1["property_dispositions"][number]
  >,
  factByRef: Map<string, SemanticFactManifestV1["facts"][number]>,
  oracleByRef: Map<string, SemanticFactManifestV1["oracles"][number]>,
  environmentByRef: Map<string, SemanticFactManifestV1["environments"][number]>,
): void {
  const fact = factByRef.get(proof.fact_ref);
  if (!fact)
    semanticFactInvalid("proof_fact_unknown", `${proof.key}:${proof.fact_ref}`);
  const property = propertyByRef.get(fact.property_ref)!;
  assertSameSemanticFactSet(
    proof.evidence_capabilities,
    property.required_evidence_capabilities,
    `proof_capability_mismatch:${proof.key}`,
  );
  if (!proof.evidence_capabilities.includes("semantic_fact"))
    semanticFactInvalid("proof_semantic_fact_capability_required", proof.key);
  if (
    !SEMANTIC_FACT_COMPARATORS.includes(
      proof.comparison.comparator as (typeof SEMANTIC_FACT_COMPARATORS)[number],
    ) &&
    !isCustomSemanticFactName(proof.comparison.comparator)
  )
    semanticFactInvalid(
      "proof_comparator_unknown",
      `${proof.key}:${proof.comparison.comparator}`,
    );
  if (
    (proof.comparison.mode === "exact" &&
      proof.comparison.tolerance !== null) ||
    (proof.comparison.mode === "tolerance" &&
      proof.comparison.tolerance === null)
  )
    semanticFactInvalid("proof_tolerance_mode_mismatch", proof.key);
  validateSemanticFactLocatedValue(
    manifest,
    proof.comparison.parameters,
    `proof:${proof.key}:parameters`,
  );
  if (proof.comparison.tolerance)
    validateSemanticFactLocatedValue(
      manifest,
      proof.comparison.tolerance,
      `proof:${proof.key}:tolerance`,
    );
  if (proof.comparison.mask)
    validateSemanticFactLocatedValue(
      manifest,
      proof.comparison.mask,
      `proof:${proof.key}:mask`,
    );
  const oracle = oracleByRef.get(proof.oracle_ref);
  if (!oracle)
    semanticFactInvalid(
      "proof_oracle_unknown",
      `${proof.key}:${proof.oracle_ref}`,
    );
  for (const capability of [proof.method, proof.comparison.comparator])
    if (!oracle.capabilities.includes(capability))
      semanticFactInvalid(
        "proof_oracle_capability_missing",
        `${proof.key}:${proof.oracle_ref}:${capability}`,
      );
  if (!environmentByRef.has(proof.environment_ref))
    semanticFactInvalid(
      "proof_environment_unknown",
      `${proof.key}:${proof.environment_ref}`,
    );
  uniqueSemanticFacts(proof.observer_refs, `proof_observer_refs:${proof.key}`);
  uniqueSemanticFacts(
    proof.counterfactual.refs,
    `proof_counterfactual_refs:${proof.key}`,
  );
  validateProofCounterfactual(proof);
}

function validateProofCounterfactual(
  proof: SemanticFactManifestV1["proof_obligations"][number],
): void {
  if (
    proof.counterfactual.disposition === "required" &&
    !proof.counterfactual.refs.length
  )
    semanticFactInvalid("proof_counterfactual_required", proof.key);
  if (
    proof.counterfactual.disposition === "not_applicable" &&
    (!proof.counterfactual.basis_refs.length ||
      proof.counterfactual.refs.length)
  )
    semanticFactInvalid("proof_counterfactual_na_basis_required", proof.key);
  if (
    proof.counterfactual.disposition === "external" &&
    proof.authority !== "external_confirmation"
  )
    semanticFactInvalid(
      "proof_counterfactual_external_authority_required",
      proof.key,
    );
  if (
    proof.authority === "external_confirmation" &&
    proof.counterfactual.disposition !== "external"
  )
    semanticFactInvalid(
      "external_proof_counterfactual_external_required",
      proof.key,
    );
}
