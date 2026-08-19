import { sha256 } from "./shared.mjs";

export function buildDelegationRunInputIdentity(value) {
  const guidance = value.workflow_guidance_source ?? {};
  const harness = value.harness_runtime_identity ?? {};
  return {
    schema_version: "tiny-context-delegation-run-input-v1",
    task_id: value.task_id,
    variant_id: value.variant_id,
    variant_role: value.variant_role,
    track: value.track,
    pair_id: value.pair_id,
    replicate: value.replicate,
    requested_parent: {
      model: value.model,
      reasoning: value.reasoning,
      provider: value.provider,
    },
    baseline_commit: value.baseline_commit,
    fixture_sha256: value.fixture_sha256,
    experiment_set_sha256: value.experiment_set_sha256,
    benchmark_inputs_sha256: value.benchmark_inputs_sha256,
    guidance_content_bundle_sha256: guidance.content_bundle_sha256,
    guidance_provenance_sha256: guidance.guidance_provenance_sha256,
    profile_content_sha256: guidance.profile_content_sha256,
    profile_expectation: guidance.profile_expectation,
    hook_content_sha256: guidance.hook_content_sha256,
    delegation_admission_policy_sha256:
      value.delegation_admission_policy_sha256,
    harness_runtime_identity_sha256: harness.identity_sha256,
    source_checkout_candidate: value.source_checkout_candidate,
    initial_commit: value.initial_commit,
    initial_tree: value.initial_tree,
  };
}

export function delegationRunInputDigest(value) {
  return sha256(buildDelegationRunInputIdentity(value));
}

export function delegationRunInputMetrics(expected, currentBasis) {
  const current = buildDelegationRunInputIdentity(currentBasis);
  const currentDigest = sha256(current);
  return {
    correct:
      JSON.stringify(expected?.identity) === JSON.stringify(current) &&
      expected?.sha256 === currentDigest,
    expected,
    current: { identity: current, sha256: currentDigest },
  };
}
