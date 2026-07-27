import type {
  ClaimProofV2,
  DeliveryContractV2,
  DeliveryOutcomeV2,
  GlobalClaimV2,
  ProductClaimV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import { controlFieldFacts } from "./long-task-control-fields.js";
import { fail } from "./long-task-delivery-shape.js";

export function generateClaims(outcome: DeliveryOutcomeV2): ProductClaimV2[] {
  const claims: ProductClaimV2[] = [
    claim(
      outcome.key,
      "result",
      "result",
      [],
      outcome.product.result_applicability_refs,
    ),
  ];
  for (const requirement of outcome.product.requirements)
    claims.push(
      claim(
        outcome.key,
        `requirement.${requirement.key}`,
        "requirement",
        requirement.required_proof_surfaces,
        requirement.applicability_refs,
      ),
    );
  for (const control of outcome.product.controls) {
    for (const field of controlFieldFacts(control))
      claims.push(
        claim(
          outcome.key,
          `control.${control.key}.${field.claim_field}`,
          "control",
          [],
          field.applicability_refs,
          field.state === "not_applicable" ? "negative" : "positive",
        ),
      );
  }
  for (const relation of outcome.product.control_relations)
    claims.push(
      claim(
        outcome.key,
        `control_relation.${relation.key}`,
        "control_relation",
        relation.required_proof_surfaces,
        relation.applicability_refs,
      ),
    );
  for (const item of outcome.product.non_completing_outcomes)
    claims.push(
      claim(
        outcome.key,
        `non_completing.${item.key}`,
        "non_completing",
        [],
        item.applicability_refs,
        "negative",
      ),
    );
  for (const item of outcome.technical.obligations)
    claims.push(
      claim(
        outcome.key,
        `obligation.${item.key}`,
        "obligation",
        item.required_proof_surfaces,
        item.applicability_refs,
      ),
    );
  for (const item of outcome.technical.forbidden_shortcuts)
    claims.push(
      claim(
        outcome.key,
        `forbidden_shortcut.${item.key}`,
        "forbidden_shortcut",
        [],
        item.applicability_refs,
        "negative",
      ),
    );
  return claims;
}

export function generateGlobalClaims(
  global: DeliveryContractV2["global"],
): GlobalClaimV2[] {
  return [
    ...global.product.non_goals.map((item) =>
      globalClaim(
        `non_goal.${item.key}`,
        "global_non_goal",
        "negative",
        item.applicability_refs,
      ),
    ),
    ...global.technical.constraints.map((item) =>
      globalClaim(
        `constraint.${item.key}`,
        "global_constraint",
        "positive",
        item.applicability_refs,
      ),
    ),
    ...global.technical.forbidden_shortcuts.map((item) =>
      globalClaim(
        `forbidden_shortcut.${item.key}`,
        "global_forbidden_shortcut",
        "negative",
        item.applicability_refs,
      ),
    ),
  ].sort((left, right) => left.id.localeCompare(right.id));
}

export function validateGlobalProofPolarity(
  claim: GlobalClaimV2,
  proof: ClaimProofV2,
): void {
  if (proof.polarity !== claim.required_polarity)
    fail(
      "global_negative_claim_proof_required",
      `${claim.local_key}:${proof.check_key}`,
    );
}

export function validateProofSurface(
  claim: ProductClaimV2,
  proof: ClaimProofV2,
  outcomeKey: string,
): void {
  if (proof.polarity !== claim.required_polarity)
    fail(
      "claim_proof_polarity_mismatch",
      `${outcomeKey}:${claim.local_key}:${proof.polarity}:${claim.required_polarity}`,
    );
  if (
    (claim.kind === "requirement" || claim.kind === "obligation") &&
    claim.required_proof_surfaces.length > 0 &&
    !claim.required_proof_surfaces.includes(proof.proof_surface)
  )
    fail(
      `${claim.kind}_proof_surface_mismatch`,
      `${outcomeKey}:${claim.local_key}:${proof.proof_surface}`,
    );
}

export function assertAllClaimsCovered(uncovered: string[]): void {
  if (uncovered.length)
    fail("product_claim_uncovered", uncovered.sort().join(","));
}

export function assertAllGlobalClaimsCovered(uncovered: string[]): void {
  if (uncovered.length)
    fail("global_claim_uncovered", uncovered.sort().join(","));
}

function claim(
  outcomeKey: string,
  localKey: string,
  kind: ProductClaimV2["kind"],
  requiredProofSurfaces: ProofSurface[] = [],
  applicabilityRefs: string[] = [],
  requiredPolarity: ProductClaimV2["required_polarity"] = "positive",
): ProductClaimV2 {
  return {
    id: `${outcomeKey}.${localKey}`,
    outcome_key: outcomeKey,
    local_key: localKey,
    kind,
    required_proof_surfaces: requiredProofSurfaces,
    required_polarity: requiredPolarity,
    applicability_refs: applicabilityRefs,
  };
}

function globalClaim(
  localKey: string,
  kind: GlobalClaimV2["kind"],
  requiredPolarity: GlobalClaimV2["required_polarity"],
  applicabilityRefs: string[],
): GlobalClaimV2 {
  return {
    id: `GLOBAL.${localKey}`,
    local_key: localKey,
    kind,
    required_polarity: requiredPolarity,
    applicability_refs: applicabilityRefs,
  };
}
