import type {
  ClaimApplicabilityV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export function claimApplicabilityProfile(
  contract: Pick<DeliveryContractV2, "global" | "outcomes">,
  outcomeKey: string | null,
  applicabilityRef: string,
): ClaimApplicabilityV2 | null {
  const profiles = outcomeKey
    ? contract.outcomes.find((outcome) => outcome.key === outcomeKey)
        ?.applicability
    : contract.global.applicability;
  return profiles?.find((profile) => profile.key === applicabilityRef) ?? null;
}

export function canonicalApplicabilityProfile(profile: ClaimApplicabilityV2): {
  target_ref: string;
  journey_role: ClaimApplicabilityV2["journey_role"];
  dimensions: Array<{ key: string; value: string }>;
  given_refs: string[];
  when_refs: string[];
} {
  return {
    target_ref: profile.target_ref,
    journey_role: profile.journey_role,
    dimensions: [...profile.dimensions]
      .sort(
        (left, right) =>
          left.key.localeCompare(right.key) ||
          left.value.localeCompare(right.value),
      )
      .map((dimension) => ({
        key: dimension.key,
        value: dimension.value,
      })),
    given_refs: [...profile.given_refs].sort(),
    when_refs: [...profile.when_refs],
  };
}

export function canonicalApplicabilityIdentity(
  profile: ClaimApplicabilityV2,
): string {
  return sha256Hex(canonicalValueJson(canonicalApplicabilityProfile(profile)));
}

export function sameApplicabilityProfile(
  left: ClaimApplicabilityV2,
  right: ClaimApplicabilityV2,
): boolean {
  return (
    canonicalApplicabilityIdentity(left) ===
    canonicalApplicabilityIdentity(right)
  );
}

export interface OutcomeApplicabilityPairV1 {
  outcome_ref: string;
  applicability_ref: string;
}

export function globalCompatibleOutcomeApplicabilityCoverage(
  contract: Pick<DeliveryContractV2, "outcomes">,
  globalProfile: ClaimApplicabilityV2,
): {
  target_outcome_refs: string[];
  required_pairs: OutcomeApplicabilityPairV1[];
  missing_outcome_refs: string[];
} {
  const targetOutcomes = contract.outcomes.filter((outcome) =>
    outcome.applicability.some(
      (profile) => profile.target_ref === globalProfile.target_ref,
    ),
  );
  const missing: string[] = [];
  const required = targetOutcomes.flatMap((outcome) => {
    const compatible = outcome.applicability.filter((profile) =>
      sameApplicabilityProfile(globalProfile, profile),
    );
    if (!compatible.length) missing.push(outcome.key);
    return compatible.map((profile) => ({
      outcome_ref: outcome.key,
      applicability_ref: profile.key,
    }));
  });
  return {
    target_outcome_refs: targetOutcomes.map((outcome) => outcome.key).sort(),
    required_pairs: sortOutcomeApplicabilityPairs(required),
    missing_outcome_refs: missing.sort(),
  };
}

export function sameOutcomeApplicabilityCoverage(
  required: readonly OutcomeApplicabilityPairV1[],
  actual: readonly OutcomeApplicabilityPairV1[],
): boolean {
  const left = sortOutcomeApplicabilityPairs(required).map(
    outcomeApplicabilityPairIdentity,
  );
  const right = sortOutcomeApplicabilityPairs(actual).map(
    outcomeApplicabilityPairIdentity,
  );
  return (
    left.length === right.length &&
    left.every((identity, index) => identity === right[index])
  );
}

export function outcomeApplicabilityPairIdentity(
  pair: OutcomeApplicabilityPairV1,
): string {
  return `${pair.outcome_ref}\0${pair.applicability_ref}`;
}

function sortOutcomeApplicabilityPairs(
  pairs: readonly OutcomeApplicabilityPairV1[],
): OutcomeApplicabilityPairV1[] {
  return [...pairs].sort((left, right) =>
    outcomeApplicabilityPairIdentity(left).localeCompare(
      outcomeApplicabilityPairIdentity(right),
    ),
  );
}
