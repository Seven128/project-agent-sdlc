import { digest } from "./delegation-guidance-io.mjs";

const PAIR_POLICY_KEYS = [
  "minimum_eligible_pairs",
  "minimum_required_pairwise_wins",
  "expanded_eligible_pairs",
  "expanded_required_pairwise_wins",
  "expand_when_sample_cv_exceeds",
  "expand_on_inconsistent_direction",
  "expand_when_primary_metric_within_threshold",
  "expand_on_host_provider_or_provenance_instability",
];
const DECISION_THRESHOLD_KEYS = [
  "hidden_quality_pass_rate",
  "context_update_correctness",
  "final_gate_acceptance_rate",
  "must_allow_rate",
  "critical_or_major_regression_rate",
  "median_primary_improvement",
];

export function validateDelegationAdmissionPolicy(manifest) {
  exactKeys(manifest.pair_policy, PAIR_POLICY_KEYS, "pair_policy_fields");
  exactKeys(
    manifest.decision_thresholds,
    DECISION_THRESHOLD_KEYS,
    "decision_threshold_fields",
  );
  const pairs = manifest.pair_policy;
  if (
    !Number.isSafeInteger(pairs.minimum_eligible_pairs) ||
    pairs.minimum_eligible_pairs < 1 ||
    !Number.isSafeInteger(pairs.expanded_eligible_pairs) ||
    pairs.expanded_eligible_pairs <= pairs.minimum_eligible_pairs ||
    !requiredWinsValid(
      pairs.minimum_required_pairwise_wins,
      pairs.minimum_eligible_pairs,
    ) ||
    !requiredWinsValid(
      pairs.expanded_required_pairwise_wins,
      pairs.expanded_eligible_pairs,
    ) ||
    !unitInterval(pairs.expand_when_sample_cv_exceeds, false) ||
    typeof pairs.expand_on_inconsistent_direction !== "boolean" ||
    !unitInterval(pairs.expand_when_primary_metric_within_threshold, false) ||
    typeof pairs.expand_on_host_provider_or_provenance_instability !== "boolean"
  )
    fail("pair_policy_shape");
  if (
    !Object.values(manifest.decision_thresholds).every((value) =>
      unitInterval(value, true),
    )
  )
    fail("decision_threshold_shape");
  if (
    delegationAdmissionPolicyDigest(manifest) !==
    manifest.admission_policy_sha256
  )
    fail("admission_policy_digest");
}

export function delegationAdmissionPolicy(manifest) {
  return {
    baseline_commit: manifest.baseline_commit,
    pair_policy: {
      minimum_pairs: manifest.pair_policy.minimum_eligible_pairs,
      minimum_required_pairwise_wins:
        manifest.pair_policy.minimum_required_pairwise_wins,
      high_variance_or_near_threshold_pairs:
        manifest.pair_policy.expanded_eligible_pairs,
      expanded_required_pairwise_wins:
        manifest.pair_policy.expanded_required_pairwise_wins,
      coefficient_of_variation_limit:
        manifest.pair_policy.expand_when_sample_cv_exceeds,
      near_threshold_margin:
        manifest.pair_policy.expand_when_primary_metric_within_threshold,
      expand_on_inconsistent_direction:
        manifest.pair_policy.expand_on_inconsistent_direction,
      expand_on_host_provider_or_provenance_instability:
        manifest.pair_policy.expand_on_host_provider_or_provenance_instability,
    },
    decision_thresholds: { ...manifest.decision_thresholds },
  };
}

export function delegationAdmissionPolicyDigest(manifest) {
  return digest(JSON.stringify(delegationAdmissionPolicy(manifest)));
}

export function validateDelegationTrackPolicySource(
  track,
  manifest,
  bundleRelative,
) {
  exact(
    track?.admission_policy_source,
    {
      kind: "delegation_guidance_manifest_v1",
      manifest: `${bundleRelative}/manifest.json`,
      policy_sha256: manifest.admission_policy_sha256,
    },
    "track_admission_policy_source",
  );
  if (
    Object.hasOwn(track ?? {}, "pair_policy") ||
    Object.hasOwn(track ?? {}, "decision_thresholds")
  )
    fail("track_duplicate_admission_policy");
  return delegationAdmissionPolicy(manifest);
}

function exactKeys(actual, expected, label) {
  if (
    !actual ||
    JSON.stringify(Object.keys(actual).sort()) !==
      JSON.stringify([...expected].sort())
  )
    fail(label);
}

function exact(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(label);
}

function unitInterval(value, includeZero) {
  return (
    Number.isFinite(value) &&
    value <= 1 &&
    (includeZero ? value >= 0 : value > 0)
  );
}

function requiredWinsValid(wins, pairs) {
  return Number.isSafeInteger(wins) && wins > pairs / 2 && wins <= pairs;
}

function fail(label) {
  throw new Error(`delegation_manifest_${label}_invalid`);
}
