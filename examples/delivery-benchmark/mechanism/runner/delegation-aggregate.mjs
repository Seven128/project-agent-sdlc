import path from "node:path";
import { delegationAdmissionBoundary } from "./delegation-evidence-host.mjs";
import { median, writeJson } from "./shared.mjs";

export async function aggregateDelegationComparisons(comparisons, policy, options) {
  const admissionBoundary = delegationAdmissionBoundary();
  const eligible = comparisons.filter((item) => item.decision_eligible);
  const observedFailures = comparisons.filter(
    (item) => item.metrics.observed_formal_failure === true,
  );
  const medianWallTimeReduction = median(
    eligible.map((item) => item.metrics.wall_time_reduction),
  );
  const medianParentTokenReduction = median(
    eligible.map((item) => item.metrics.parent_token_reduction),
  );
  const primary = selectPrimaryMetric(
    medianWallTimeReduction,
    medianParentTokenReduction,
  );
  const summary = {
    hidden_quality_pass_rate: passRate(
      eligible,
      (item) => item.metrics.hidden_quality_equal,
    ),
    context_update_correctness: passRate(
      eligible,
      (item) => item.metrics.context_update_equal,
    ),
    final_gate_acceptance_rate: passRate(
      eligible,
      (item) => item.metrics.final_gate_accepted,
    ),
    must_allow_rate: passRate(
      eligible,
      (item) => item.metrics.must_allow_preserved,
    ),
    critical_or_major_regression_rate: passRate(
      eligible,
      (item) => item.metrics.critical_or_major_regression,
    ),
    median_wall_time_reduction: medianWallTimeReduction,
    median_parent_token_reduction: medianParentTokenReduction,
    median_total_token_reduction: median(
      eligible.map((item) => item.metrics.total_token_reduction),
    ),
    primary_metric: primary.key,
    median_primary_improvement: primary.value,
  };
  summary.pairwise_wins = eligible.filter((item) =>
    pairwiseWin(item, primary.key, policy.decision_thresholds),
  ).length;
  const requirement = requiredPairs(comparisons, eligible, summary, policy);
  summary.required_pairwise_wins = requirement.required_wins;
  const thresholdFailures = [
    ...evaluate(summary, policy.decision_thresholds),
    ...(summary.pairwise_wins < requirement.required_wins
      ? ["pairwise_wins"]
      : []),
    ...requirement.terminal_stability_failures,
  ];
  const diagnosticDecision =
    observedFailures.length > 0
      ? "DIAGNOSTIC_FORMAL_FAILURES_PRESENT"
      : eligible.length < requirement.minimum
        ? "DIAGNOSTIC_INSUFFICIENT_PAIRED_RUNS"
        : thresholdFailures.length
          ? `DIAGNOSTIC_THRESHOLDS_NOT_MET:${thresholdFailures.join(",")}`
          : "DIAGNOSTIC_THRESHOLDS_MET_UNATTESTED";
  const report = {
    schema_version: "tiny-context-mechanism-aggregate-v1",
    aggregated_at: new Date().toISOString(),
    track: comparisons[0].track,
    task_id: comparisons[0].task_id,
    baseline_variant: comparisons[0].baseline_variant,
    candidate_variant: comparisons[0].candidate_variant,
    pair_count: comparisons.length,
    eligible_pair_count: eligible.length,
    observed_formal_failure_count: observedFailures.length,
    minimum_recommended_pairs: requirement.minimum,
    pair_requirement_reason: requirement.reason,
    terminal_stability_failures: requirement.terminal_stability_failures,
    thresholds: policy.decision_thresholds,
    summary,
    decision_eligible: false,
    decision:
      "DELEGATION_PROMOTION_BLOCKED_TRUSTED_HOST_AND_ATTEMPT_SET_UNAVAILABLE",
    diagnostic_threshold_decision: diagnosticDecision,
    admission_boundary: admissionBoundary,
    comparison_input_status: "unattested_derived_json_diagnostic_only",
    promotion_effect: "none_report_only",
    comparisons,
  };
  if (options.out) await writeJson(path.resolve(options.out), report);
  return report;
}

function requiredPairs(allItems, items, summary, admissionPolicy) {
  const policy = admissionPolicy.pair_policy;
  const reasons = [];
  if (allItems.length > policy.minimum_pairs)
    reasons.push("attempt_population_expanded");
  if (
    policy.expand_on_host_provider_or_provenance_instability &&
    allItems.some((item) => item.metrics.host_instability)
  )
    reasons.push("host_provider_or_provenance_instability");
  if (
    new Set(
      allItems.map((item) =>
        JSON.stringify(item.metrics.host_environment ?? null),
      ),
    ).size > 1
  )
    reasons.push("host_environment_changed_across_pairs");
  if (items.length >= policy.minimum_pairs && summary.primary_metric) {
    const key = summary.primary_metric;
    const values = items
      .map((item) => item.metrics[key])
      .filter(Number.isFinite);
    if (
      policy.expand_on_inconsistent_direction &&
      values.some((value) => value > 0) &&
      values.some((value) => value < 0)
    )
      reasons.push(`inconsistent_direction:${key}`);
    if (coefficientOfVariation(values) > policy.coefficient_of_variation_limit)
      reasons.push(`cv:${key}`);
  }
  if (
    Number.isFinite(summary.median_primary_improvement) &&
    Math.abs(
      summary.median_primary_improvement -
        admissionPolicy.decision_thresholds.median_primary_improvement,
    ) <= policy.near_threshold_margin
  )
    reasons.push(`near_threshold:${summary.primary_metric}`);
  const minimum = reasons.length
    ? policy.high_variance_or_near_threshold_pairs
    : policy.minimum_pairs;
  const terminalStabilityFailures = [
    ...(items.length >= policy.high_variance_or_near_threshold_pairs
      ? reasons
          .filter(
            (reason) =>
              reason.startsWith("cv:") ||
              reason.startsWith("inconsistent_direction:") ||
              reason === "host_environment_changed_across_pairs",
          )
          .map((reason) => `primary_metric_unstable:${reason}`)
      : []),
    ...(allItems.length > policy.high_variance_or_near_threshold_pairs
      ? ["attempt_population_invalid:exceeds_frozen_expanded_pairs"]
      : []),
  ];
  return {
    minimum,
    required_wins: reasons.length
      ? policy.expanded_required_pairwise_wins
      : policy.minimum_required_pairwise_wins,
    reason: reasons.length
      ? `expanded:${reasons.join(",")}`
      : items.length < policy.minimum_pairs
        ? "base_minimum"
        : "base_sufficient",
    terminal_stability_failures: terminalStabilityFailures,
  };
}

function pairwiseWin(item, primaryKey, thresholds) {
  return (
    primaryKey !== null &&
    Number.isFinite(item.metrics[primaryKey]) &&
    item.metrics[primaryKey] >= thresholds.median_primary_improvement &&
    item.metrics.total_cost?.status === "candidate_no_worse"
  );
}

function selectPrimaryMetric(wallTime, parentTokens) {
  const values = [
    { key: "wall_time_reduction", value: wallTime },
    { key: "parent_token_reduction", value: parentTokens },
  ].filter((item) => Number.isFinite(item.value));
  if (!values.length) return { key: null, value: null };
  return values.reduce((selected, item) =>
    item.value > selected.value ? item : selected,
  );
}

function evaluate(summary, thresholds) {
  return Object.entries(thresholds)
    .filter(([key, expected]) => {
      const actual = summary[key];
      if (!Number.isFinite(actual)) return true;
      return key === "critical_or_major_regression_rate"
        ? actual > expected
        : actual < expected;
    })
    .map(([key]) => key);
}

function coefficientOfVariation(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return Number.POSITIVE_INFINITY;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance) / Math.abs(mean);
}

function passRate(items, predicate) {
  return items.length ? items.filter(predicate).length / items.length : null;
}
