import {
  semanticFactClosureInvalid,
  uniqueSemanticFactClosureValues,
} from "./long-task-semantic-fact-closure-primitives.js";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import type { SemanticFactManifestIndexV1 } from "./semantic-fact-policy.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export function validateSemanticFactOutcomeBindings(
  outcome: DeliveryContractV2["outcomes"][number],
  manifest: SemanticFactManifestV1,
  index: SemanticFactManifestIndexV1,
  allFactBindings: string[],
): void {
  uniqueSemanticFactClosureValues(
    outcome.semantic_fact_bindings.facts.map((item) => item.claim_ref),
    `contract_fact_claim:${outcome.key}`,
  );
  const applicabilityRefs = new Set(
    outcome.applicability.map((item) => item.key),
  );
  for (const binding of outcome.semantic_fact_bindings.facts) {
    const fact = index.fact_by_ref.get(binding.fact_ref)!;
    const expectedClaim = `semantic_fact.${binding.fact_ref}`;
    if (binding.claim_ref !== expectedClaim)
      semanticFactClosureInvalid(
        "contract_fact_claim_identity_mismatch",
        `${outcome.key}:${binding.fact_ref}:${binding.claim_ref}:${expectedClaim}`,
      );
    if (!applicabilityRefs.has(binding.applicability_ref))
      semanticFactClosureInvalid(
        "contract_fact_applicability_unknown",
        `${outcome.key}:${binding.fact_ref}:${binding.applicability_ref}`,
      );
    validateSemanticFactApplicabilityProjection(
      manifest,
      fact,
      outcome.applicability.find(
        (item) => item.key === binding.applicability_ref,
      )!,
    );
    if (fact.outcome_ref !== outcome.key)
      semanticFactClosureInvalid(
        "contract_fact_outcome_mismatch",
        `${outcome.key}:${binding.fact_ref}`,
      );
    allFactBindings.push(binding.fact_ref);
  }
}

function validateSemanticFactApplicabilityProjection(
  manifest: SemanticFactManifestV1,
  fact: SemanticFactManifestV1["facts"][number],
  applicability: DeliveryContractV2["outcomes"][number]["applicability"][number],
): void {
  const condition = manifest.conditions.find(
    (item) => item.key === fact.condition_ref,
  );
  if (!condition)
    semanticFactClosureInvalid(
      "contract_fact_condition_unknown",
      `${fact.key}:${fact.condition_ref}`,
    );
  for (const assignment of condition.axis_values) {
    const axis = manifest.axis_dispositions.find(
      (item) => item.key === assignment.axis_ref,
    );
    if (!axis)
      semanticFactClosureInvalid(
        "contract_fact_condition_axis_unknown",
        `${fact.key}:${assignment.axis_ref}`,
      );
    if (
      !applicability.dimensions.some(
        (dimension) =>
          dimension.key === axis.axis &&
          dimension.value === assignment.value_ref,
      )
    )
      semanticFactClosureInvalid(
        "contract_fact_applicability_condition_mismatch",
        `${fact.key}:${applicability.key}:${axis.axis}:${assignment.value_ref}`,
      );
  }
}
