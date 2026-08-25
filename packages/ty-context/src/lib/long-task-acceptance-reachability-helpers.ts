import type {
  ClaimApplicabilityV2,
  CompiledCheckV2,
  DeliveryContractV2,
  EvidenceCapabilityV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import type {
  AcceptanceObligationReachabilityV1,
  ExpectedExternalObligation,
} from "./long-task-acceptance-reachability-types.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export function claimProofMethod(
  capabilities: readonly EvidenceCapabilityV2[],
): string {
  return capabilities.includes("population_coverage")
    ? "population_set_equality"
    : "exact_value";
}

export function claimObligationRef(
  fullClaim: string,
  applicabilityRef: string,
  surface: ProofSurface,
): string {
  return `claim:${fullClaim}:${applicabilityRef}:${surface}`;
}

export function machineProofAdmitted(
  checks: CompiledCheckV2[],
  outcomeKey: string | null,
  checkKey: string,
  assertionKey: string,
  localClaim: string,
): boolean {
  const check = checks.find(
    (item) => item.outcome_key === outcomeKey && item.key === checkKey,
  );
  return Boolean(
    check?.completion_role === "semantic" &&
    check.observation_authorities.some(
      (authority) =>
        authority.assertion_ref === assertionKey &&
        authority.claim_refs.includes(localClaim) &&
        authority.authority !== "external_confirmation",
    ),
  );
}

export function pendingExternalRow(
  sourceObligationRef: string,
  outcomeKey: string | null,
  claimRef: string,
  applicabilityRef: string,
  factRef: string | null,
  proofRef: string | null,
  method: string,
  proofSurface: ProofSurface,
  capabilities: EvidenceCapabilityV2[],
  confirmationRef: string | null,
): AcceptanceObligationReachabilityV1 {
  return {
    obligation_ref: sourceObligationRef,
    source_obligation_ref: sourceObligationRef,
    outcome_key: outcomeKey,
    claim_ref: claimRef,
    applicability_ref: applicabilityRef,
    fact_ref: factRef,
    proof_ref: proofRef,
    method,
    proof_surface: proofSurface,
    required_evidence_capabilities: [...capabilities].sort(),
    authority: "external_confirmation",
    confirmation_ref: confirmationRef,
    status: "unreachable",
    reason: "external_confirmation_not_fulfillable",
    session_group: null,
  };
}

export function selectOptionalSurface(
  proofs: Array<{ proof_surface: ProofSurface; check_key: string }>,
): ProofSurface {
  return (
    [...proofs].sort((left, right) => {
      const authority =
        Number(left.check_key.startsWith("EXTERNAL.")) -
        Number(right.check_key.startsWith("EXTERNAL."));
      return authority || left.proof_surface.localeCompare(right.proof_surface);
    })[0]?.proof_surface ?? "runtime_behavior"
  );
}

export function applicabilityProfile(
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  applicabilityRef: string,
): ClaimApplicabilityV2 | null {
  const profiles = outcomeKey
    ? contract.outcomes.find((item) => item.key === outcomeKey)?.applicability
    : contract.global.applicability;
  return profiles?.find((item) => item.key === applicabilityRef) ?? null;
}

export function objectiveExternalActualAdmitted(
  manifest: SemanticFactManifestV1,
  expected: ExpectedExternalObligation,
): boolean {
  if (!expected.fact_ref || !expected.proof_ref) return false;
  const proof = manifest.proof_obligations.find(
    (candidate) => candidate.key === expected.proof_ref,
  );
  return Boolean(
    proof &&
    proof.fact_ref === expected.fact_ref &&
    proof.comparison.comparator === "exact_value" &&
    proof.comparison.mode === "exact" &&
    proof.comparison.tolerance === null &&
    proof.comparison.mask === null,
  );
}

const JUDGMENT_STANDARD_PROPERTIES = new Set([
  "goal_scope_glossary.acceptance_meaning",
  "goal_scope_glossary.decision_owner",
  "architecture_ownership.selected_design",
  "safety_compliance.expert_authority",
  "safety_compliance.human_approval",
  "privacy.preference",
  "ai_ml.human_review",
  "external_integration.external_confirmation",
]);

export function sourceBackedExternalJudgmentAdmitted(
  manifest: SemanticFactManifestV1,
  expected: Pick<
    ExpectedExternalObligation,
    "fact_ref" | "proof_ref" | "method"
  >,
): boolean {
  if (!expected.fact_ref && !expected.proof_ref) return true;
  if (
    !expected.fact_ref ||
    !expected.proof_ref ||
    expected.method !== "exact_value"
  )
    return false;
  const fact = manifest.facts.find((row) => row.key === expected.fact_ref);
  const proof = manifest.proof_obligations.find(
    (row) => row.key === expected.proof_ref,
  );
  const property = fact
    ? manifest.property_dispositions.find(
        (row) => row.key === fact.property_ref,
      )
    : null;
  const family = fact
    ? manifest.family_dispositions.find((row) => row.key === fact.family_ref)
    : null;
  if (!fact || !proof || proof.fact_ref !== fact.key || !property || !family)
    return false;
  return (
    !property.standard ||
    JUDGMENT_STANDARD_PROPERTIES.has(`${family.family}.${property.property}`)
  );
}

export function sameSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((item) => right.includes(item))
  );
}
