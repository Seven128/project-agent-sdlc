import type {
  CompiledObservationAuthorityV2,
  DeliveryContractV2,
  EvidenceCapabilityV2,
} from "./long-task-delivery-types.js";
import { findDesignFactObligation } from "./long-task-design-obligation.js";
import {
  canonicalApplicabilityIdentity,
  claimApplicabilityProfile,
} from "./long-task-applicability-identity.js";
import type {
  AcceptanceReachabilityInputV1,
  ExpectedExternalObligation,
} from "./long-task-acceptance-reachability-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export interface ObjectiveClaimSemanticIdentityInputV1 {
  contract: Pick<DeliveryContractV2, "global" | "outcomes">;
  outcome_key: string | null;
  claim_ref: string;
  local_claim_ref: string;
  applicability_ref: string;
  required_polarity: "positive" | "negative";
  expected_authority_ref: string;
  method: string;
  required_evidence_capabilities: readonly EvidenceCapabilityV2[];
  observation_authority: CompiledObservationAuthorityV2;
}

export function objectiveClaimSemanticIdentity(
  input: ObjectiveClaimSemanticIdentityInputV1,
): string | null {
  const authority = input.observation_authority;
  const applicability = claimApplicabilityProfile(
    input.contract,
    input.outcome_key,
    input.applicability_ref,
  );
  const requiredCapabilities = [
    ...new Set(input.required_evidence_capabilities),
  ].sort();
  if (
    !applicability ||
    authority.fact_ref !== null ||
    authority.claim_refs.length !== 1 ||
    authority.claim_refs[0] !== input.local_claim_ref ||
    authority.target_ref !== applicability.target_ref ||
    authority.method !== input.method ||
    !requiredCapabilities.every((capability) =>
      authority.evidence_capabilities.includes(capability),
    ) ||
    !exactObservationAuthorityShape(authority)
  )
    return null;
  return sha256Hex(
    canonicalValueJson({
      claim_ref: input.claim_ref,
      local_claim_ref: input.local_claim_ref,
      applicability_identity: canonicalApplicabilityIdentity(applicability),
      target_ref: applicability.target_ref,
      required_polarity: input.required_polarity,
      expected_authority_ref: input.expected_authority_ref,
      expected_value_sha256: authority.expected_value_sha256,
      actual_projection: authority.actual_projection,
      method: input.method,
      required_evidence_capabilities: requiredCapabilities,
      comparison: authority.comparison,
    }),
  );
}

export function effectiveExternalObligationSemanticIdentity(
  input: AcceptanceReachabilityInputV1,
  expected: ExpectedExternalObligation,
): string | null {
  if (expected.semantic_identity) return expected.semantic_identity;
  const applicability = claimApplicabilityProfile(
    input.contract,
    expected.outcome_key,
    expected.applicability_ref,
  );
  if (!applicability) return null;
  const common = {
    source_obligation_ref: expected.source_obligation_ref,
    claim_ref: expected.claim_ref,
    local_claim_ref: expected.local_claim_ref,
    applicability_identity: canonicalApplicabilityIdentity(applicability),
    target_ref: applicability.target_ref,
    required_polarity: expected.required_polarity,
    expected_authority_ref: expected.expected_authority_ref,
    method: expected.method,
    required_evidence_capabilities: [
      ...new Set(expected.evidence_capabilities),
    ].sort(),
  };
  if (expected.fact_ref && expected.proof_ref) {
    const design = findDesignFactObligation(input.contract, expected);
    if (design)
      return sha256Hex(
        canonicalValueJson({
          kind: "design_fact",
          ...common,
          design_obligation_ref: design.source_obligation_ref,
          design_target_ref: design.target_key,
          fact_ref: design.fact_ref,
          proof_ref: design.source_obligation_ref,
          expected_design_sha256: design.expected.sha256,
          actual_projection: "raw_exact",
          comparison: {
            comparator: design.comparison.comparator,
            mode: design.comparison.mode,
            parameters_sha256: design.comparison.parameters.sha256,
            tolerance_sha256: design.comparison.tolerance?.sha256 ?? null,
            mask_sha256: design.comparison.mask?.sha256 ?? null,
          },
        }),
      );
    const fact = input.manifest.facts.find(
      (candidate) => candidate.key === expected.fact_ref,
    );
    const proof = input.manifest.proof_obligations.find(
      (candidate) =>
        candidate.key === expected.proof_ref &&
        candidate.fact_ref === expected.fact_ref,
    );
    if (fact && proof)
      return sha256Hex(
        canonicalValueJson({
          kind: "semantic_fact",
          ...common,
          fact_ref: fact.key,
          proof_ref: proof.key,
          expected_value_sha256: fact.expected.sha256,
          actual_projection: "raw_exact",
          comparison: {
            comparator: proof.comparison.comparator,
            mode: proof.comparison.mode,
            parameters_sha256: proof.comparison.parameters.sha256,
            tolerance_sha256: proof.comparison.tolerance?.sha256 ?? null,
            mask_sha256: proof.comparison.mask?.sha256 ?? null,
          },
        }),
      );
    return null;
  }
  if (expected.fact_ref || expected.proof_ref) return null;
  return sha256Hex(
    canonicalValueJson({
      kind: "source_delegated_judgment",
      ...common,
      expected_value_sha256: null,
      actual_projection: null,
      comparison: null,
    }),
  );
}

function exactObservationAuthorityShape(
  authority: CompiledObservationAuthorityV2,
): boolean {
  return Boolean(
    typeof authority.expected_value_sha256 === "string" &&
    /^[a-f0-9]{64}$/u.test(authority.expected_value_sha256) &&
    typeof authority.actual_projection === "string" &&
    authority.comparison &&
    typeof authority.comparison.comparator === "string" &&
    typeof authority.comparison.mode === "string" &&
    sha256OrNull(authority.comparison.parameters_sha256) &&
    sha256OrNull(authority.comparison.tolerance_sha256) &&
    sha256OrNull(authority.comparison.mask_sha256),
  );
}

function sha256OrNull(value: string | null): boolean {
  return value === null || /^[a-f0-9]{64}$/u.test(value);
}
