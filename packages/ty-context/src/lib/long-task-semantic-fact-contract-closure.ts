import { validateSemanticFactOutcomeBindings } from "./long-task-semantic-fact-contract-facts.js";
import { validateSemanticFactProofBindings } from "./long-task-semantic-fact-contract-proofs.js";
import {
  assertSameSemanticFactClosureSet,
  semanticFactClosureInvalid,
  uniqueSemanticFactClosureValues,
} from "./long-task-semantic-fact-closure-primitives.js";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import type { SemanticFactManifestIndexV1 } from "./semantic-fact-policy.js";
import type {
  SemanticFactExpectationV2,
  SemanticFactManifestV1,
} from "./semantic-fact-types.js";

export function validateSemanticFactContractProjection(
  contract: DeliveryContractV2,
  manifest: SemanticFactManifestV1,
  index: SemanticFactManifestIndexV1,
  factRevisions: Map<string, string>,
  obligationRevisions: Map<string, string>,
  sourceRequiresRevisions: boolean,
): Map<string, SemanticFactExpectationV2[]> {
  const expectations = new Map<string, SemanticFactExpectationV2[]>();
  const allFactBindings: string[] = [];
  const allProofBindings: string[] = [];
  const targetByRef = new Map(
    contract.task.execution_targets.map((item) => [item.key, item]),
  );
  for (const outcome of contract.outcomes) {
    const facts = manifest.facts.filter(
      (item) => item.outcome_ref === outcome.key,
    );
    const proofs = manifest.proof_obligations.filter((proof) =>
      facts.some((fact) => fact.key === proof.fact_ref),
    );
    const bindings = outcome.semantic_fact_bindings;
    const revisionsRequired =
      sourceRequiresRevisions ||
      bindings.facts.some((item) => item.fact_revision_digest !== undefined) ||
      bindings.proofs.some(
        (item) => item.obligation_revision_digest !== undefined,
      );
    assertSameSemanticFactClosureSet(
      bindings.facts.map((item) => item.fact_ref),
      facts.map((item) => item.key),
      `contract_fact_set:${outcome.key}`,
    );
    if (revisionsRequired) {
      assertSameSemanticFactClosureSet(
        bindings.facts.map((item) =>
          revisionPair(
            item.fact_ref,
            item.fact_revision_digest,
            `contract_fact_revision:${outcome.key}`,
          ),
        ),
        facts.map((item) =>
          revisionPair(
            item.key,
            factRevisions.get(item.key),
            `source_fact_revision:${outcome.key}`,
          ),
        ),
        `contract_fact_revision_set:${outcome.key}`,
      );
      assertSameSemanticFactClosureSet(
        bindings.proofs.map((item) =>
          revisionPair(
            item.proof_ref,
            item.obligation_revision_digest,
            `contract_obligation_revision:${outcome.key}`,
          ),
        ),
        proofs.map((item) =>
          revisionPair(
            item.key,
            obligationRevisions.get(item.key),
            `source_obligation_revision:${outcome.key}`,
          ),
        ),
        `contract_obligation_revision_set:${outcome.key}`,
      );
    }
    assertSameSemanticFactClosureSet(
      bindings.proofs.map((item) => item.proof_ref),
      proofs.map((item) => item.key),
      `contract_proof_set:${outcome.key}`,
    );
    uniqueSemanticFactClosureValues(
      bindings.proofs
        .filter((item) => item.authority === "machine")
        .map((item) => `${item.check_ref}\0${item.assertion_ref}`),
      `contract_proof_target:${outcome.key}`,
    );
    validateSemanticFactOutcomeBindings(
      outcome,
      manifest,
      index,
      allFactBindings,
      factRevisions,
      revisionsRequired,
    );
    validateSemanticFactProofBindings(
      contract,
      outcome,
      manifest,
      index,
      targetByRef,
      expectations,
      allProofBindings,
      factRevisions,
      obligationRevisions,
      revisionsRequired,
    );
  }
  validateSemanticFactGlobalBindings(contract, manifest, index);
  assertSameSemanticFactClosureSet(
    allFactBindings,
    manifest.facts.map((item) => item.key),
    "contract_all_fact_set",
  );
  assertSameSemanticFactClosureSet(
    allProofBindings,
    manifest.proof_obligations.map((item) => item.key),
    "contract_all_proof_set",
  );
  return expectations;
}

interface GlobalMaterialClaimProjection {
  claim_ref: string;
  applicability_refs: string[];
  required_polarity: "positive" | "negative";
}

function validateSemanticFactGlobalBindings(
  contract: DeliveryContractV2,
  manifest: SemanticFactManifestV1,
  index: SemanticFactManifestIndexV1,
): void {
  const claims = globalMaterialClaims(contract);
  const bindings = contract.global.semantic_fact_bindings;
  if (!claims.length) {
    if (bindings?.obligations.length)
      semanticFactClosureInvalid(
        "global_semantic_fact_claim_unknown",
        bindings.obligations[0].claim_ref,
      );
    return;
  }
  if (!bindings)
    semanticFactClosureInvalid(
      "global_semantic_fact_bindings_required",
      claims
        .map((claim) => claim.claim_ref)
        .sort()
        .join(","),
    );
  if (bindings.manifest_ref !== contract.semantic_fact_manifest.key)
    semanticFactClosureInvalid(
      "global_semantic_fact_manifest_ref_mismatch",
      `${bindings.manifest_ref}:${contract.semantic_fact_manifest.key}`,
    );

  const claimsByRef = new Map(claims.map((claim) => [claim.claim_ref, claim]));
  const applicabilityByRef = new Map(
    contract.global.applicability.map((item) => [item.key, item]),
  );
  const tupleKeys = new Set<string>();
  for (const binding of bindings.obligations) {
    const tupleKey = [
      binding.claim_ref,
      binding.applicability_ref,
      binding.target_ref,
      binding.outcome_ref,
      binding.fact_ref,
      binding.proof_ref,
      binding.method,
    ].join("\0");
    if (tupleKeys.has(tupleKey))
      semanticFactClosureInvalid(
        "global_semantic_fact_obligation_duplicate",
        tupleKey.replaceAll("\0", ":"),
      );
    tupleKeys.add(tupleKey);

    const claim = claimsByRef.get(binding.claim_ref);
    if (!claim)
      semanticFactClosureInvalid(
        "global_semantic_fact_claim_unknown",
        binding.claim_ref,
      );
    if (!claim.applicability_refs.includes(binding.applicability_ref))
      semanticFactClosureInvalid(
        "global_semantic_fact_applicability_not_owned",
        `${binding.claim_ref}:${binding.applicability_ref}`,
      );
    if (binding.required_polarity !== claim.required_polarity)
      semanticFactClosureInvalid(
        "global_semantic_fact_polarity_mismatch",
        `${binding.claim_ref}:${binding.required_polarity}:${claim.required_polarity}`,
      );
    const applicability = applicabilityByRef.get(binding.applicability_ref);
    if (!applicability)
      semanticFactClosureInvalid(
        "global_semantic_fact_applicability_unknown",
        `${binding.claim_ref}:${binding.applicability_ref}`,
      );
    if (binding.target_ref !== applicability.target_ref)
      semanticFactClosureInvalid(
        "global_semantic_fact_target_mismatch",
        `${binding.claim_ref}:${binding.applicability_ref}:${binding.target_ref}:${applicability.target_ref}`,
      );

    const outcome = contract.outcomes.find(
      (item) => item.key === binding.outcome_ref,
    );
    if (!outcome)
      semanticFactClosureInvalid(
        "global_semantic_fact_outcome_unknown",
        `${binding.claim_ref}:${binding.outcome_ref}`,
      );
    const fact = index.fact_by_ref.get(binding.fact_ref);
    if (!fact)
      semanticFactClosureInvalid(
        "global_semantic_fact_unknown",
        `${binding.claim_ref}:${binding.fact_ref}`,
      );
    if (fact.outcome_ref !== binding.outcome_ref)
      semanticFactClosureInvalid(
        "global_semantic_fact_outcome_mismatch",
        `${binding.fact_ref}:${binding.outcome_ref}:${fact.outcome_ref}`,
      );
    const factBinding = outcome.semantic_fact_bindings.facts.find(
      (item) => item.fact_ref === binding.fact_ref,
    );
    if (!factBinding)
      semanticFactClosureInvalid(
        "global_semantic_fact_outcome_binding_missing",
        `${binding.claim_ref}:${binding.outcome_ref}:${binding.fact_ref}`,
      );
    const factApplicability = outcome.applicability.find(
      (item) => item.key === factBinding.applicability_ref,
    );
    if (
      !factApplicability ||
      factApplicability.target_ref !== binding.target_ref
    )
      semanticFactClosureInvalid(
        "global_semantic_fact_outcome_target_mismatch",
        `${binding.claim_ref}:${binding.outcome_ref}:${binding.fact_ref}:${binding.target_ref}`,
      );
    const proof = index.proof_by_ref.get(binding.proof_ref);
    if (!proof)
      semanticFactClosureInvalid(
        "global_semantic_fact_proof_unknown",
        `${binding.claim_ref}:${binding.proof_ref}`,
      );
    if (
      proof.fact_ref !== binding.fact_ref ||
      proof.method !== binding.method ||
      !outcome.semantic_fact_bindings.proofs.some(
        (item) =>
          item.proof_ref === binding.proof_ref &&
          item.fact_ref === binding.fact_ref &&
          item.method === binding.method,
      )
    )
      semanticFactClosureInvalid(
        "global_semantic_fact_proof_identity_mismatch",
        `${binding.claim_ref}:${binding.fact_ref}:${binding.proof_ref}:${binding.method}`,
      );
    if (
      !globalClaimSourceOwners(contract, binding.claim_ref).some((sourceRef) =>
        fact.source_item_refs.includes(sourceRef),
      )
    )
      semanticFactClosureInvalid(
        "global_semantic_fact_source_lineage_missing",
        `${binding.claim_ref}:${binding.fact_ref}`,
      );
  }

  for (const claim of claims)
    for (const applicabilityRef of claim.applicability_refs) {
      const applicability = applicabilityByRef.get(applicabilityRef);
      if (!applicability)
        semanticFactClosureInvalid(
          "global_semantic_fact_applicability_unknown",
          `${claim.claim_ref}:${applicabilityRef}`,
        );
      const selected = bindings.obligations.filter(
        (item) =>
          item.claim_ref === claim.claim_ref &&
          item.applicability_ref === applicabilityRef &&
          item.target_ref === applicability.target_ref,
      );
      if (!selected.length)
        semanticFactClosureInvalid(
          "broad_claim_semantic_fact_required",
          `GLOBAL:${claim.claim_ref}:${applicabilityRef}`,
        );
      const requiredOutcomes = contract.outcomes
        .filter((outcome) =>
          outcome.applicability.some(
            (item) => item.target_ref === applicability.target_ref,
          ),
        )
        .map((outcome) => outcome.key)
        .sort();
      if (!requiredOutcomes.length)
        semanticFactClosureInvalid(
          "global_semantic_fact_target_unowned",
          `${claim.claim_ref}:${applicabilityRef}:${applicability.target_ref}`,
        );
      const coveredOutcomes = [
        ...new Set(selected.map((item) => item.outcome_ref)),
      ].sort();
      if (
        requiredOutcomes.length !== coveredOutcomes.length ||
        requiredOutcomes.some(
          (outcomeRef, index) => outcomeRef !== coveredOutcomes[index],
        )
      )
        semanticFactClosureInvalid(
          "global_semantic_fact_target_coverage_incomplete",
          `${claim.claim_ref}:${applicabilityRef}:required=${requiredOutcomes.join(",")}:actual=${coveredOutcomes.join(",")}`,
        );

      for (const factRef of new Set(selected.map((item) => item.fact_ref))) {
        const requiredProofs = manifest.proof_obligations
          .filter((proof) => proof.fact_ref === factRef)
          .map((proof) => `${proof.key}\0${proof.method}`)
          .sort();
        const boundProofs = selected
          .filter((item) => item.fact_ref === factRef)
          .map((item) => `${item.proof_ref}\0${item.method}`)
          .sort();
        if (
          requiredProofs.length !== boundProofs.length ||
          requiredProofs.some(
            (proofIdentity, index) => proofIdentity !== boundProofs[index],
          )
        )
          semanticFactClosureInvalid(
            "global_semantic_fact_method_coverage_incomplete",
            `${claim.claim_ref}:${applicabilityRef}:${factRef}`,
          );
      }
    }
}

function globalMaterialClaims(
  contract: DeliveryContractV2,
): GlobalMaterialClaimProjection[] {
  return [
    ...contract.global.product.non_goals.map((item) => ({
      claim_ref: `non_goal.${item.key}`,
      applicability_refs: item.applicability_refs,
      required_polarity: "negative" as const,
    })),
    ...contract.global.technical.constraints.map((item) => ({
      claim_ref: `constraint.${item.key}`,
      applicability_refs: item.applicability_refs,
      required_polarity: "positive" as const,
    })),
    ...contract.global.technical.forbidden_shortcuts.map((item) => ({
      claim_ref: `forbidden_shortcut.${item.key}`,
      applicability_refs: item.applicability_refs,
      required_polarity: "negative" as const,
    })),
  ];
}

function globalClaimSourceOwners(
  contract: DeliveryContractV2,
  claimRef: string,
): string[] {
  return contract.source_claims
    .filter(
      (source) =>
        source.disposition.type === "global_constraint" &&
        source.disposition.refs.includes(claimRef),
    )
    .map((source) => source.key);
}

function revisionPair(
  key: string,
  digest: string | undefined,
  label: string,
): string {
  if (!digest)
    throw new Error(`semantic_fact_closure_invalid:${label}:${key}:missing`);
  return `${key}\0${digest}`;
}
