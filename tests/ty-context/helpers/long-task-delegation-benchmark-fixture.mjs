import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

export function assertFrozenDelegationCandidate(candidate) {
  assert.deepEqual(candidate.manifest.delegation_policy.solo_reason_ids, [
    "insufficient_qualifying_packets",
    "exact_profile_unavailable",
    "insufficient_host_capacity",
    "owner_or_path_conflict",
    "coordination_cost_exceeds_benefit",
  ]);
  assert.deepEqual(candidate.manifest.delegation_policy.parent_owned, [
    "source",
    "contract",
    "authority",
    "architecture",
    "context",
    "packet_selection",
    "integration",
    "current_candidate_checks",
    "formal_verification",
    "final_gate",
    "close",
    "completion",
  ]);
  assert.equal(candidate.manifest.delegation_policy.fixed_worker_count, null);
  assert.equal(Object.hasOwn(candidate.manifest, "profile_expectation"), false);
  assert.deepEqual(candidate.profileExpectation, {
    agent_type: "long_task_implementation",
    model: "gpt-5.6-luna",
    model_reasoning_effort: "max",
    child_agents_enabled: false,
    service_tier_override: false,
    unobservable_tier_status: "service_tier_inheritance_unverified",
  });
  assert.deepEqual(candidate.manifest.pair_policy, {
    minimum_eligible_pairs: 3,
    minimum_required_pairwise_wins: 2,
    expanded_eligible_pairs: 5,
    expanded_required_pairwise_wins: 3,
    expand_when_sample_cv_exceeds: 0.2,
    expand_on_inconsistent_direction: true,
    expand_when_primary_metric_within_threshold: 0.05,
    expand_on_host_provider_or_provenance_instability: true,
  });
  assert.deepEqual(candidate.manifest.decision_thresholds, {
    hidden_quality_pass_rate: 1,
    context_update_correctness: 1,
    final_gate_acceptance_rate: 1,
    must_allow_rate: 1,
    critical_or_major_regression_rate: 0,
    median_primary_improvement: 0.2,
  });
}

export function delegationScore(role, costs) {
  const validatedCosts = {
    ...costs,
    total_tokens: costs.parent_tokens + costs.child_tokens,
  };
  return {
    run: {
      benchmark_inputs: [{ role: "fixture", sha256: "0".repeat(64) }],
      harness_runtime_identity: { identity_sha256: "5".repeat(64) },
      run_input_identity: { sha256: `${role === "candidate" ? "6" : "7"}`.repeat(64) },
      workflow_guidance_source: {
        candidate_promotion_content_bundle_sha256: "1".repeat(64),
        guidance_provenance_sha256: "2".repeat(64),
        profile_content_sha256: "3".repeat(64),
        profile_expectation: {
          agent_type: "long_task_implementation",
          model: "gpt-5.6-luna",
          model_reasoning_effort: "max",
          child_agents_enabled: false,
          service_tier_override: false,
          unobservable_tier_status:
            "service_tier_inheritance_unverified",
        },
        hook_content_sha256: "4".repeat(64),
      },
    },
    metrics: {
      hard_gate_passed: true,
      hidden_quality: { decision: "PASS", passed: 7, total: 7 },
      delegation_quality: {
        classification_complete: true,
        critical_defect_count: 0,
        major_defect_count: 0,
        must_allow_failure_count: 0,
        must_allow_passed: true,
      },
      delegation_guidance: { correct: true },
      delegation_inputs: { correct: true },
      delegation_harness_identity: { correct: true },
      delegation_run_inputs: { correct: true },
      context_update: { correct: true },
      delegation: {
        available: true,
        provenance: { verified: true },
        candidate_binding: { bound: true },
        pair_eligible: true,
        lifecycle: { final_gate_status: "machine_accepted" },
        observed_worker_count: role === "candidate" ? 2 : 0,
        policy_conformant: true,
        run_identity_bound: true,
        effective_parent_claim_matched: true,
        host_environment: {
          claim_matched: true,
          provider_id: "openai",
          host_version: "codex-test-v1",
          platform: "win32",
          arch: "x64",
          parent_effective_model: "gpt-5.6-sol",
          parent_effective_reasoning_effort: "high",
          parent_effective_service_tier: "priority",
          available_slots: 4,
        },
        service_tier: { status: "verified" },
        host_instability: false,
        costs: validatedCosts,
      },
    },
  };
}

export function delegationComparison(index, metrics) {
  return {
    track: "long-task-delegation",
    task_id: "long-task-disjoint-money-health",
    baseline_variant: "long-task-delegation-conditional",
    candidate_variant: "long-task-delegation-positive-default",
    pair_id: `pair-${index}`,
    replicate: 1,
    decision_eligible: true,
    metrics: structuredClone(metrics),
  };
}

export function gitFile(repoRoot, commit, relative) {
  return execFileSync("git", ["show", `${commit}:${relative}`], { cwd: repoRoot });
}

export function gitText(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}
