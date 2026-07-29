import {
  sameSemanticFactClosureSet,
  semanticFactClosureInvalid,
} from "./long-task-semantic-fact-closure-primitives.js";
import type {
  DeliveryContractV2,
  ExecutionTargetV2,
} from "./long-task-delivery-types.js";
import type { SemanticFactManifestIndexV1 } from "./semantic-fact-policy.js";
import type {
  SemanticFactBindingV2,
  SemanticFactExpectationV2,
  SemanticFactManifestV1,
  SemanticFactProofBindingV2,
} from "./semantic-fact-types.js";

export function validateSemanticFactProofBindings(
  contract: DeliveryContractV2,
  outcome: DeliveryContractV2["outcomes"][number],
  manifest: SemanticFactManifestV1,
  index: SemanticFactManifestIndexV1,
  targetByRef: Map<string, ExecutionTargetV2>,
  expectations: Map<string, SemanticFactExpectationV2[]>,
  allProofBindings: string[],
): void {
  for (const binding of outcome.semantic_fact_bindings.proofs) {
    const proof = index.proof_by_ref.get(binding.proof_ref)!;
    const factBinding = outcome.semantic_fact_bindings.facts.find(
      (item) => item.fact_ref === binding.fact_ref,
    );
    if (!factBinding)
      semanticFactClosureInvalid(
        "contract_proof_fact_binding_missing",
        `${outcome.key}:${binding.proof_ref}:${binding.fact_ref}`,
      );
    validateProofIdentity(outcome, proof, binding);
    validateObserverTargets(proof, binding, targetByRef);
    if (binding.authority === "external_confirmation")
      validateExternalProofProjection(
        contract,
        outcome,
        binding,
        factBinding.claim_ref,
      );
    else
      validateMachineProofProjection(
        contract,
        outcome,
        manifest,
        index,
        binding,
        proof,
        factBinding,
        expectations,
      );
    allProofBindings.push(binding.proof_ref);
  }
}

function validateProofIdentity(
  outcome: DeliveryContractV2["outcomes"][number],
  proof: SemanticFactManifestV1["proof_obligations"][number],
  binding: SemanticFactProofBindingV2,
): void {
  if (
    proof.fact_ref !== binding.fact_ref ||
    proof.method !== binding.method ||
    proof.proof_surface !== binding.proof_surface ||
    proof.authority !== binding.authority ||
    !sameSemanticFactClosureSet(
      proof.evidence_capabilities,
      binding.evidence_capabilities,
    )
  )
    semanticFactClosureInvalid(
      "contract_proof_identity_mismatch",
      `${outcome.key}:${binding.proof_ref}`,
    );
}

function validateObserverTargets(
  proof: SemanticFactManifestV1["proof_obligations"][number],
  binding: SemanticFactProofBindingV2,
  targetByRef: Map<string, ExecutionTargetV2>,
): void {
  for (const observerRef of proof.observer_refs)
    if (!targetByRef.has(observerRef))
      semanticFactClosureInvalid(
        "proof_observer_target_unknown",
        `${binding.proof_ref}:${observerRef}`,
      );
    else if (targetByRef.get(observerRef)!.role !== "observer")
      semanticFactClosureInvalid(
        "proof_observer_target_role_mismatch",
        `${binding.proof_ref}:${observerRef}:${targetByRef.get(observerRef)!.role}`,
      );
}

function validateExternalProofProjection(
  contract: DeliveryContractV2,
  outcome: DeliveryContractV2["outcomes"][number],
  binding: Extract<
    SemanticFactProofBindingV2,
    { authority: "external_confirmation" }
  >,
  claimRef: string,
): void {
  const confirmation = contract.global.acceptance.external_confirmations.find(
    (item) => item.key === binding.confirmation_ref,
  );
  const fullClaim = `${outcome.key}.${claimRef}`;
  if (!confirmation)
    semanticFactClosureInvalid(
      "semantic_fact_confirmation_unknown",
      `${binding.proof_ref}:${binding.confirmation_ref}`,
    );
  if (!confirmation.impact_claims.includes(fullClaim))
    semanticFactClosureInvalid(
      "semantic_fact_confirmation_lineage_missing",
      `${binding.confirmation_ref}:${fullClaim}`,
    );
}

function validateMachineProofProjection(
  contract: DeliveryContractV2,
  outcome: DeliveryContractV2["outcomes"][number],
  manifest: SemanticFactManifestV1,
  index: SemanticFactManifestIndexV1,
  binding: Extract<SemanticFactProofBindingV2, { authority: "machine" }>,
  proof: SemanticFactManifestV1["proof_obligations"][number],
  factBinding: SemanticFactBindingV2,
  expectations: Map<string, SemanticFactExpectationV2[]>,
): void {
  const check = outcome.acceptance.checks.find(
    (item) => item.key === binding.check_ref,
  );
  if (!check)
    semanticFactClosureInvalid(
      "semantic_fact_check_unknown",
      `${outcome.key}:${binding.check_ref}`,
    );
  for (const observerRef of proof.observer_refs)
    if (observerRef === check.execution_target.target_ref)
      semanticFactClosureInvalid(
        "proof_observer_not_independent",
        `${binding.proof_ref}:${observerRef}`,
      );
  if (check.proof_surface !== binding.proof_surface)
    semanticFactClosureInvalid(
      "semantic_fact_check_surface_mismatch",
      `${binding.proof_ref}:${check.proof_surface}:${binding.proof_surface}`,
    );
  const assertion = check.positive_assertions.find(
    (item) => item.key === binding.assertion_ref,
  );
  if (!assertion)
    semanticFactClosureInvalid(
      "semantic_fact_assertion_unknown",
      `${binding.check_ref}:${binding.assertion_ref}`,
    );
  if (
    assertion.claims.length !== 1 ||
    assertion.claims[0] !== factBinding.claim_ref ||
    assertion.applicability_ref !== factBinding.applicability_ref ||
    assertion.operator !== "equals" ||
    assertion.expected !== true ||
    !sameSemanticFactClosureSet(
      assertion.evidence_capabilities,
      binding.evidence_capabilities,
    )
  )
    semanticFactClosureInvalid(
      "semantic_fact_assertion_binding_mismatch",
      `${binding.check_ref}:${binding.assertion_ref}`,
    );
  validateSemanticFactCounterfactualProjection(
    outcome,
    proof,
    factBinding.claim_ref,
    binding.check_ref,
    binding.assertion_ref,
  );
  const fact = index.fact_by_ref.get(binding.fact_ref)!;
  const rows = expectations.get(binding.check_ref) ?? [];
  rows.push({
    manifest_ref: manifest.key,
    manifest_sha256: contract.semantic_fact_manifest.sha256,
    fact_ref: fact.key,
    proof_ref: proof.key,
    method: proof.method,
    check_ref: binding.check_ref,
    assertion_ref: binding.assertion_ref,
    outcome_ref: outcome.key,
    claim_ref: factBinding.claim_ref,
    applicability_ref: factBinding.applicability_ref,
    subject_ref: fact.unit_ref,
    condition_ref: fact.condition_ref,
    property_ref: fact.property_ref,
    observation_sensitivity: fact.observation_sensitivity,
    expected: fact.expected,
    comparison: proof.comparison,
    oracle: index.oracle_by_ref.get(proof.oracle_ref)!,
    environment: index.environment_by_ref.get(proof.environment_ref)!,
    observer_refs: proof.observer_refs,
  });
  expectations.set(binding.check_ref, rows);
}

function validateSemanticFactCounterfactualProjection(
  outcome: DeliveryContractV2["outcomes"][number],
  proof: SemanticFactManifestV1["proof_obligations"][number],
  claimRef: string,
  checkRef: string,
  assertionRef: string,
): void {
  if (proof.counterfactual.disposition !== "required") return;
  for (const counterfactualRef of proof.counterfactual.refs) {
    const counterfactual = outcome.acceptance.counterfactual_controls.find(
      (item) => item.key === counterfactualRef,
    );
    if (!counterfactual)
      semanticFactClosureInvalid(
        "semantic_fact_counterfactual_unknown",
        `${proof.key}:${counterfactualRef}`,
      );
    if (
      counterfactual.check_key !== checkRef ||
      !counterfactual.claims.includes(claimRef) ||
      !counterfactual.expected_assertion_failures.includes(assertionRef)
    )
      semanticFactClosureInvalid(
        "semantic_fact_counterfactual_binding_mismatch",
        `${proof.key}:${counterfactualRef}`,
      );
  }
}
