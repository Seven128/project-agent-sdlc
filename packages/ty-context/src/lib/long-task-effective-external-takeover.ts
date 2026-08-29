import type {
  ClaimApplicabilityV2,
  CompiledOutcomeV2,
  DeliveryContractV2,
  DeliveryOutcomeV2,
} from "./long-task-delivery-types.js";
import type { AcceptanceReachabilityV1 } from "./long-task-acceptance-reachability-types.js";
import {
  claimObligationRef,
  sameSet,
} from "./long-task-acceptance-reachability-helpers.js";

export function effectiveBlockingExternalRows(
  reachability: AcceptanceReachabilityV1 | null | undefined,
): AcceptanceReachabilityV1["effective_external_routes"] {
  return (reachability?.effective_external_routes ?? []).filter(
    (row) =>
      row.authority === "external_confirmation" &&
      row.status === "external_fulfillable" &&
      row.completion_role === "blocking" &&
      row.acceptance_effect === "required",
  );
}

type EffectiveExternalRouteV1 =
  AcceptanceReachabilityV1["effective_external_routes"][number];
type SemanticFactBindingV2 =
  DeliveryOutcomeV2["semantic_fact_bindings"]["facts"][number];
type SemanticProofBindingV2 =
  DeliveryOutcomeV2["semantic_fact_bindings"]["proofs"][number];

interface PopulationProofRequirementV1 {
  factBinding: SemanticFactBindingV2;
  proofBinding: SemanticProofBindingV2;
  confirmationRef: string | null;
}

function effectivePopulationRows(
  outcomeKey: string,
  reachability: AcceptanceReachabilityV1 | null | undefined,
): EffectiveExternalRouteV1[] {
  return effectiveBlockingExternalRows(reachability).filter(
    (row) =>
      row.outcome_key === outcomeKey &&
      row.proof_surface === "population_coverage" &&
      row.method === "population_set_equality" &&
      row.fact_ref !== null &&
      row.proof_ref !== null &&
      row.source_obligation_ref === row.proof_ref &&
      row.required_evidence_capabilities.includes("semantic_fact") &&
      row.required_evidence_capabilities.includes("population_coverage"),
  );
}

function requiredExternalPopulationProofs(
  outcome: DeliveryOutcomeV2,
  localClaimRef: string,
): PopulationProofRequirementV1[] {
  return outcome.semantic_fact_bindings.facts
    .filter((binding) => binding.claim_ref === localClaimRef)
    .flatMap((factBinding) =>
      outcome.semantic_fact_bindings.proofs
        .filter(
          (proofBinding) =>
            proofBinding.fact_ref === factBinding.fact_ref &&
            proofBinding.authority === "external_confirmation" &&
            proofBinding.method === "population_set_equality" &&
            proofBinding.proof_surface === "population_coverage",
        )
        .map((proofBinding) => ({
          factBinding,
          proofBinding,
          confirmationRef:
            proofBinding.authority === "external_confirmation"
              ? proofBinding.confirmation_ref
              : null,
        })),
    );
}

function populationProofRequirementEffectivelyBlocked(
  outcome: DeliveryOutcomeV2,
  requirement: PopulationProofRequirementV1,
  rows: readonly EffectiveExternalRouteV1[],
): boolean {
  const { factBinding, proofBinding, confirmationRef } = requirement;
  const profile = outcome.applicability.find(
    (candidate) => candidate.key === factBinding.applicability_ref,
  );
  if (!profile) return false;
  return (
    rows.filter(
      (row) =>
        row.claim_ref === `${outcome.key}.${factBinding.claim_ref}` &&
        row.local_claim_ref === factBinding.claim_ref &&
        row.applicability_ref === factBinding.applicability_ref &&
        row.target_ref === profile.target_ref &&
        row.fact_ref === factBinding.fact_ref &&
        row.proof_ref === proofBinding.proof_ref &&
        row.source_obligation_ref === proofBinding.proof_ref &&
        row.method === proofBinding.method &&
        row.proof_surface === proofBinding.proof_surface &&
        row.confirmation_ref === confirmationRef &&
        sameSet(
          row.required_evidence_capabilities,
          proofBinding.evidence_capabilities,
        ),
    ).length === 1
  );
}

function populationClaimFullyEffectivelyExternallyBlocked(
  outcome: DeliveryOutcomeV2,
  localClaimRef: string,
  rows: readonly EffectiveExternalRouteV1[],
): boolean {
  const requirements = requiredExternalPopulationProofs(outcome, localClaimRef);
  return (
    requirements.length > 0 &&
    requirements.every((requirement) =>
      populationProofRequirementEffectivelyBlocked(outcome, requirement, rows),
    )
  );
}

export function outcomePopulationSemanticProofFullyEffectivelyExternallyBlocked(
  outcome: DeliveryOutcomeV2,
  reachability: AcceptanceReachabilityV1 | null | undefined,
): boolean {
  const population = outcome.acceptance.population;
  if (!population?.claims.length) return false;
  const rows = effectivePopulationRows(outcome.key, reachability);
  return population.claims.every((localClaimRef) =>
    populationClaimFullyEffectivelyExternallyBlocked(
      outcome,
      localClaimRef,
      rows,
    ),
  );
}

function effectiveBlockingResultRows(
  reachability: AcceptanceReachabilityV1 | null | undefined,
  outcomeKey: string,
): AcceptanceReachabilityV1["effective_external_routes"] {
  const claimRef = `${outcomeKey}.result`;
  return effectiveBlockingExternalRows(reachability).filter((row) => {
    const ordinaryObligationRef = claimObligationRef(
      claimRef,
      row.applicability_ref,
      row.proof_surface,
    );
    return (
      row.outcome_key === outcomeKey &&
      row.claim_ref === claimRef &&
      row.local_claim_ref === "result" &&
      row.fact_ref === null &&
      row.proof_ref === null &&
      row.source_obligation_ref === ordinaryObligationRef
    );
  });
}

export function resultApplicabilityEffectivelyExternallyBlocked(
  reachability: AcceptanceReachabilityV1 | null | undefined,
  outcomeKey: string,
  applicabilityRef: string,
  targetRef: string,
): boolean {
  const rows = effectiveBlockingResultRows(reachability, outcomeKey).filter(
    (row) =>
      row.applicability_ref === applicabilityRef &&
      row.target_ref === targetRef,
  );
  return rows.length === 1;
}

export function resultApplicabilityProfiles(
  outcome: Pick<CompiledOutcomeV2, "applicability" | "product">,
  options: {
    target_ref?: string;
    journey_role?: ClaimApplicabilityV2["journey_role"];
  } = {},
): ClaimApplicabilityV2[] {
  const profiles = new Map(
    outcome.applicability.map((profile) => [profile.key, profile]),
  );
  return outcome.product.result_applicability_refs
    .map((ref) => profiles.get(ref))
    .filter((profile): profile is ClaimApplicabilityV2 => Boolean(profile))
    .filter(
      (profile) =>
        (options.target_ref === undefined ||
          profile.target_ref === options.target_ref) &&
        (options.journey_role === undefined ||
          profile.journey_role === options.journey_role),
    );
}

export function outcomeResultScopeFullyEffectivelyExternallyBlocked(
  outcome: Pick<CompiledOutcomeV2, "key" | "applicability" | "product">,
  reachability: AcceptanceReachabilityV1 | null | undefined,
  options: {
    target_ref?: string;
    journey_role?: ClaimApplicabilityV2["journey_role"];
  } = {},
): boolean {
  const profiles = resultApplicabilityProfiles(outcome, options);
  if (!profiles.length) return false;
  const requiredRefs = new Set(profiles.map((profile) => profile.key));
  const rows = effectiveBlockingResultRows(reachability, outcome.key).filter(
    (row) => requiredRefs.has(row.applicability_ref),
  );
  return (
    rows.length === profiles.length &&
    profiles.every(
      (profile) =>
        rows.filter(
          (row) =>
            row.applicability_ref === profile.key &&
            row.target_ref === profile.target_ref,
        ).length === 1,
    )
  );
}

export function outcomeResultFullyEffectivelyExternallyBlocked(
  outcome: Pick<CompiledOutcomeV2, "key" | "applicability" | "product">,
  reachability: AcceptanceReachabilityV1 | null | undefined,
): boolean {
  if (
    resultApplicabilityProfiles(outcome).length !==
    outcome.product.result_applicability_refs.length
  )
    return false;
  return outcomeResultScopeFullyEffectivelyExternallyBlocked(
    outcome,
    reachability,
  );
}

export function allOutcomeResultsFullyEffectivelyExternallyBlocked(
  contract: Pick<DeliveryContractV2, "outcomes">,
  reachability: AcceptanceReachabilityV1 | null | undefined,
): boolean {
  return (
    contract.outcomes.length > 0 &&
    contract.outcomes.every((outcome) =>
      outcomeResultFullyEffectivelyExternallyBlocked(outcome, reachability),
    )
  );
}
