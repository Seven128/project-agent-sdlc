import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { delegationAdmissionPolicy } from "../../../examples/delivery-benchmark/mechanism/runner/delegation-admission-policy.mjs";
import {
  aggregateDelegationComparisons,
  compareDelegationScores,
} from "../../../examples/delivery-benchmark/mechanism/runner/delegation-compare.mjs";
import {
  buildDelegationRunInputIdentity,
  delegationRunInputDigest,
  delegationRunInputMetrics,
} from "../../../examples/delivery-benchmark/mechanism/runner/delegation-run-inputs.mjs";
import {
  delegationComparison,
  delegationScore,
} from "./long-task-delegation-benchmark-fixture.mjs";

export async function verifyDelegationComparisonBoundary(bundleRoot) {
  const baseline = delegationScore("baseline", {
    wall_time_ms: 1000,
    parent_tokens: 1000,
    child_tokens: 0,
    tool_turns: 20,
    check_turns: 10,
    compactions: 1,
    integration_rework: 2,
  });
  const candidate = delegationScore("candidate", {
    wall_time_ms: 600,
    parent_tokens: 500,
    child_tokens: 400,
    tool_turns: 18,
    check_turns: 9,
    compactions: 0,
    integration_rework: 1,
  });
  const metrics = compareDelegationScores(baseline, candidate);
  assert.equal(metrics.hard_gates_passed, true);
  assert.equal(metrics.evidence_sufficient, false);
  assert.equal(
    metrics.admission_boundary.status,
    "trusted_host_integration_unavailable",
  );
  assert.equal(metrics.total_cost.status, "candidate_no_worse");
  const tokenCostly = compareDelegationScores(
    baseline,
    delegationScore("candidate", {
      ...candidate.metrics.delegation.costs,
      parent_tokens: 700,
    }),
  );
  assert.notEqual(tokenCostly.total_cost.status, "candidate_no_worse");
  const wallCatastrophe = compareDelegationScores(
    baseline,
    delegationScore("candidate", {
      ...candidate.metrics.delegation.costs,
      wall_time_ms: 100_000,
    }),
  );
  assert.notEqual(wallCatastrophe.total_cost.status, "candidate_no_worse");
  const precisionBaseline = delegationScore("baseline", {
    ...baseline.metrics.delegation.costs,
    wall_time_ms: 100_000,
  });
  const precisionCandidate = delegationScore("candidate", {
    ...baseline.metrics.delegation.costs,
    wall_time_ms: 80_004,
  });
  const precisionMetrics = compareDelegationScores(
    precisionBaseline,
    precisionCandidate,
  );
  assert.equal(precisionMetrics.wall_time_reduction, 0.19996);
  assert.equal(precisionMetrics.primary_improvement, 0.19996);
  const tierMismatch = structuredClone(candidate);
  tierMismatch.metrics.delegation.host_environment.parent_effective_service_tier =
    "standard";
  const tierMetrics = compareDelegationScores(baseline, tierMismatch);
  assert.equal(tierMetrics.host_environment_compatible, false);
  assert.equal(tierMetrics.host_instability, true);
  const capacityMismatch = structuredClone(candidate);
  capacityMismatch.metrics.delegation.host_environment.available_slots = 3;
  const capacityMetrics = compareDelegationScores(baseline, capacityMismatch);
  assert.equal(capacityMetrics.host_environment_compatible, false);
  assert.equal(capacityMetrics.host_instability, true);
  const platformMismatch = structuredClone(candidate);
  platformMismatch.metrics.delegation.host_environment.platform = "linux";
  const platformMetrics = compareDelegationScores(baseline, platformMismatch);
  assert.equal(platformMetrics.host_environment_compatible, false);
  assert.equal(platformMetrics.host_instability, true);
  const formalFailureCandidate = structuredClone(candidate);
  formalFailureCandidate.metrics.delegation.formal_failure_observed = true;
  formalFailureCandidate.metrics.delegation.formal_failure_reasons = [
    "effective_agent_type_unverified_or_mismatch:agent-a",
  ];
  const formalFailureMetrics = compareDelegationScores(
    baseline,
    formalFailureCandidate,
  );
  assert.equal(formalFailureMetrics.supplied_formal_failure, true);
  assert.equal(formalFailureMetrics.observed_formal_failure, false);

  const manifest = JSON.parse(
    await readFile(path.join(bundleRoot, "manifest.json"), "utf8"),
  );
  const policy = delegationAdmissionPolicy(manifest);
  const comparisons = [1, 2, 3].map((index) =>
    delegationComparison(index, metrics),
  );
  const admitted = await aggregateDelegationComparisons(comparisons, policy, {});
  assert.equal(admitted.minimum_recommended_pairs, 3);
  assert.equal(admitted.decision_eligible, false);
  assert.equal(
    admitted.decision,
    "DELEGATION_PROMOTION_BLOCKED_TRUSTED_HOST_AND_ATTEMPT_SET_UNAVAILABLE",
  );
  assert.equal(
    admitted.diagnostic_threshold_decision,
    "DIAGNOSTIC_THRESHOLDS_MET_UNATTESTED",
  );
  await verifyPairwiseWinPolicy(metrics, policy);
  const precisionReport = await aggregateDelegationComparisons(
    [1, 2, 3, 4, 5].map((index) =>
      delegationComparison(index + 40, precisionMetrics),
    ),
    policy,
    {},
  );
  assert.match(
    precisionReport.diagnostic_threshold_decision,
    /median_primary_improvement/u,
  );

  comparisons[0].metrics.host_instability = true;
  comparisons[0].decision_eligible = false;
  const expanded = await aggregateDelegationComparisons(comparisons, policy, {});
  assert.equal(expanded.minimum_recommended_pairs, 5);
  assert.equal(
    expanded.diagnostic_threshold_decision,
    "DIAGNOSTIC_INSUFFICIENT_PAIRED_RUNS",
  );

  const failed = delegationComparison(4, metrics);
  failed.decision_eligible = false;
  failed.metrics.hard_gates_passed = false;
  failed.metrics.observed_formal_failure = true;
  const blocked = await aggregateDelegationComparisons(
    [...comparisons, failed],
    policy,
    {},
  );
  assert.equal(blocked.observed_formal_failure_count, 1);
  assert.equal(blocked.decision_eligible, false);
  assert.equal(
    blocked.diagnostic_threshold_decision,
    "DIAGNOSTIC_FORMAL_FAILURES_PRESENT",
  );
  assert.equal(
    blocked.decision,
    "DELEGATION_PROMOTION_BLOCKED_TRUSTED_HOST_AND_ATTEMPT_SET_UNAVAILABLE",
  );

  const alternating = [
    [0.21, 0.19],
    [0.21, 0.19],
    [0.19, 0.21],
    [0.19, 0.21],
    [0.19, 0.19],
  ].map(([wall, parent], index) =>
    comparisonWithReductions(index + 10, metrics, wall, parent),
  );
  const alternatingReport = await aggregateDelegationComparisons(
    alternating,
    policy,
    {},
  );
  assert.equal(alternatingReport.summary.median_wall_time_reduction, 0.19);
  assert.equal(alternatingReport.summary.median_parent_token_reduction, 0.19);
  assert.equal(alternatingReport.summary.median_primary_improvement, 0.19);
  assert.match(
    alternatingReport.diagnostic_threshold_decision,
    /median_primary_improvement/u,
  );

  const highVariance = [0.01, 0.01, 0.5, 0.5, 0.5].map((wall, index) =>
    comparisonWithReductions(index + 20, metrics, wall, 0),
  );
  const unstableReport = await aggregateDelegationComparisons(
    highVariance,
    policy,
    {},
  );
  assert.equal(unstableReport.minimum_recommended_pairs, 5);
  assert.match(
    unstableReport.diagnostic_threshold_decision,
    /primary_metric_unstable:cv:wall_time_reduction/u,
  );

  const driftingHost = [1, 2, 3, 4, 5].map((index) => {
    const comparison = comparisonWithReductions(index + 30, metrics, 0.4, 0.3);
    comparison.metrics.host_environment = {
      ...comparison.metrics.host_environment,
      candidate: {
        ...comparison.metrics.host_environment.candidate,
        host_version: `codex-test-v${index}`,
      },
    };
    return comparison;
  });
  const driftingHostReport = await aggregateDelegationComparisons(
    driftingHost,
    policy,
    {},
  );
  assert.match(
    driftingHostReport.diagnostic_threshold_decision,
    /primary_metric_unstable:host_environment_changed_across_pairs/u,
  );
}

async function verifyPairwiseWinPolicy(metrics, policy) {
  for (const [reductions, costWins, wins, required, passes] of [
    [[0.26, 0.26, 0.19], 3, 2, 2, true],
    [[0.2, 0.149, 0.149], 3, 1, 2, false],
    [[0.3, 0.3, 0.3, 0.3], 4, 4, 3, false],
    [[0.24, 0.24, 0.24, 0.19, 0.19], 5, 3, 3, true],
    [[0.24, 0.24, 0.3, 0.3, 0.3], 2, 2, 3, false],
    [[0.3, 0.3, 0.3, 0.3, 0.3, 0.3], 6, 6, 3, false],
  ]) {
    const items = reductions.map((wall, index) =>
      comparisonWithReductions(index + 50, metrics, wall, 0),
    );
    for (const item of items.slice(costWins))
      item.metrics.total_cost.status = "candidate_worse";
    const report = await aggregateDelegationComparisons(items, policy, {});
    assert.equal(report.summary.pairwise_wins, wins);
    assert.equal(report.summary.required_pairwise_wins, required);
    if (reductions.length === 4) {
      assert.equal(report.minimum_recommended_pairs, 5);
      assert.equal(report.pair_requirement_reason, "expanded:attempt_population_expanded");
      assert.equal(report.diagnostic_threshold_decision, "DIAGNOSTIC_INSUFFICIENT_PAIRED_RUNS");
    }
    assert.equal(
      report.diagnostic_threshold_decision ===
        "DIAGNOSTIC_THRESHOLDS_MET_UNATTESTED",
      passes,
    );
  }
}

function comparisonWithReductions(index, metrics, wall, parent) {
  const comparison = delegationComparison(index, metrics);
  comparison.metrics.wall_time_reduction = wall;
  comparison.metrics.parent_token_reduction = parent;
  comparison.metrics.primary_improvement = Math.max(wall, parent);
  comparison.metrics.total_cost = { status: "candidate_no_worse" };
  return comparison;
}

export function verifyDelegationRunInputFreshness() {
  const basis = {
    task_id: "task",
    variant_id: "variant",
    variant_role: "candidate",
    track: "long-task-delegation",
    pair_id: "pair",
    replicate: 1,
    model: "gpt-5.6-sol",
    reasoning: "high",
    provider: "openai",
    baseline_commit: "1".repeat(40),
    fixture_sha256: "2".repeat(64),
    experiment_set_sha256: "3".repeat(64),
    benchmark_inputs_sha256: "4".repeat(64),
    workflow_guidance_source: {
      content_bundle_sha256: "5".repeat(64),
      guidance_provenance_sha256: "6".repeat(64),
      profile_content_sha256: "7".repeat(64),
      hook_content_sha256: "8".repeat(64),
    },
    delegation_admission_policy_sha256: "9".repeat(64),
    harness_runtime_identity: { identity_sha256: "a".repeat(64) },
    source_checkout_candidate: {
      head_commit: "b".repeat(40),
      head_tree: "c".repeat(40),
      working_tree: { clean: true, digest: "d".repeat(64) },
    },
    initial_commit: "e".repeat(40),
    initial_tree: "f".repeat(40),
  };
  const expected = {
    identity: buildDelegationRunInputIdentity(basis),
    sha256: delegationRunInputDigest(basis),
  };
  assert.equal(delegationRunInputMetrics(expected, basis).correct, true);
  assert.equal(delegationRunInputMetrics(expected, { ...basis, provider: "changed" }).correct, false);
}
