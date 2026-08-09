import { createHash } from "node:crypto";
import {
  ADMISSION_THRESHOLDS,
  CASE_IDS,
  COUNTERFACTUAL_IDS,
  KNOWN_B_FALSE_ACCEPT_CASE_IDS,
  NULLABLE_UNVERIFIED_METRICS,
  PHASE_COST_METRICS,
  REAL_PROCESS_RUN_SCHEMA,
  REPEAT_ORDERS,
  REQUIRED_METRICS,
  REQUIRED_VERIFIED_METRICS,
  SIGNED_METRICS,
  VARIANT_IDS,
  repeatOrder,
  requiredWins,
} from "./long_task_real_process_roi_policy.mjs";

const shaPattern = /^[a-f0-9]{64}$/u;
const fullGitShaPattern = /^[a-f0-9]{40}$/u;

export function validateRunRecord(run, frozenConfig) {
  assert(run?.schema_version === REAL_PROCESS_RUN_SCHEMA, "run_schema");
  assert(VARIANT_IDS.includes(run.variant_id), "run_variant");
  assert(
    Number.isInteger(run.repeat) &&
      run.repeat >= 1 &&
      run.repeat <= REPEAT_ORDERS.length,
    "run_repeat",
  );
  const order = repeatOrder(run.repeat);
  assert(
    run.invocation_position === order.indexOf(run.variant_id) + 1,
    "run_invocation_position",
  );
  const variant = frozenConfig.variants?.[run.variant_id];
  assert(variant, "run_variant_config");
  assert(run.safety_eligible === variant.safety_eligible, "run_safety_role");
  assert(
    run.comparison_role === variant.comparison_role,
    "run_comparison_role",
  );
  assert(
    run.candidate_identity?.commit === variant.commit &&
      fullGitShaPattern.test(run.candidate_identity.commit),
    "run_candidate_commit",
  );
  assert(
    fullGitShaPattern.test(run.candidate_identity?.tree ?? ""),
    "run_candidate_tree",
  );
  assert(run.candidate_identity?.clean === true, "run_candidate_clean");
  for (const name of ["package_sha256", "workload_sha256"])
    assert(
      shaPattern.test(run.candidate_identity?.[name] ?? ""),
      `run_candidate_${name}`,
    );
  assert(
    run.candidate_identity.workload_sha256 === frozenConfig.workload_sha256,
    "run_workload_identity",
  );
  assert(
    run.environment_identity === frozenConfig.environment_identity,
    "run_environment_identity",
  );
  assertTimestampOrder(run.started_at, run.completed_at, "run_time");
  validateMetricSet(run.metrics);
  assertSameSet(
    run.cases?.map((item) => item.case_id),
    CASE_IDS,
    "run_case_set",
  );
  for (const item of run.cases) validateCaseRecord(item, run.variant_id);
  const attackCaseIds = CASE_IDS.filter(
    (caseId) => caseId !== "correct-control",
  );
  assertSameSet(
    run.recoveries?.map((item) => item.source_attack_case_id),
    attackCaseIds,
    "run_recovery_set",
  );
  for (const recovery of run.recoveries)
    validateRecoveryRecord(recovery, attackCaseIds);
  assert(
    metricValue(run, "rework_count") >= run.recoveries.length,
    "run_rework_count",
  );
  const recomputedFalseCompletions = run.cases.filter(
    (item) =>
      item.kind === "attack" &&
      item.gold.conformant === false &&
      item.workflow_status === "machine_accepted",
  ).length;
  assert(
    metricValue(run, "false_completion_count") === recomputedFalseCompletions,
    "run_false_completion_count",
  );
  assert(
    metricValue(run, "false_completion_rate") ===
      round(recomputedFalseCompletions / (CASE_IDS.length - 1)),
    "run_false_completion_rate",
  );
  const correctAttempts = [
    run.cases.find((item) => item.case_id === "correct-control"),
    ...run.recoveries,
  ];
  const recomputedFalseBlocking = correctAttempts.filter(
    (item) => item.workflow_status !== "machine_accepted",
  ).length;
  assert(
    metricValue(run, "false_blocking_count") === recomputedFalseBlocking,
    "run_false_blocking_count",
  );
  assert(
    metricValue(run, "false_blocking_rate") ===
      round(recomputedFalseBlocking / correctAttempts.length),
    "run_false_blocking_rate",
  );
  assert(
    metricValue(run, "modification_rounds") === run.recoveries.length,
    "run_modification_rounds",
  );
  const recomputedProcessExecutions = [...run.cases, ...run.recoveries].reduce(
    (total, item) => total + item.raw_execution.observed_main_execution_count,
    0,
  );
  assert(
    metricValue(run, "process_execution_count") === recomputedProcessExecutions,
    "run_process_execution_count",
  );
  assert(
    metricValue(run, "spawned_process_count") >= recomputedProcessExecutions,
    "run_spawned_process_count",
  );
  assert(
    metricValue(run, "authority_bytes") ===
      metricValue(run, "compiled_contract_bytes"),
    "run_authority_bytes",
  );
  assert(
    run.lifecycle_evidence?.raw_artifact_sha256 &&
      shaPattern.test(run.lifecycle_evidence.raw_artifact_sha256),
    "run_raw_artifact_identity",
  );
  return run;
}

export function deriveRealProcessRoiSummary(runs, frozenConfig) {
  assert(Array.isArray(runs), "summary_runs");
  const repeats = uniqueSorted(runs.map((run) => run.repeat));
  assert(
    [
      ADMISSION_THRESHOLDS.minimum_repeats,
      ADMISSION_THRESHOLDS.expanded_repeats,
    ].includes(repeats.length),
    "summary_repeat_count",
  );
  assert(
    repeats.every((repeat, index) => repeat === index + 1),
    "summary_repeat_sequence",
  );
  for (const run of runs) validateRunRecord(run, frozenConfig);
  assert(
    runs.length === repeats.length * VARIANT_IDS.length,
    "summary_run_count",
  );
  for (const repeat of repeats)
    assertSameSet(
      runs.filter((run) => run.repeat === repeat).map((run) => run.variant_id),
      VARIANT_IDS,
      `summary_variants:${repeat}`,
    );

  const grouped = Object.fromEntries(
    VARIANT_IDS.map((variant) => [
      variant,
      runs
        .filter((run) => run.variant_id === variant)
        .sort((left, right) => left.repeat - right.repeat),
    ]),
  );
  const perVariant = Object.fromEntries(
    VARIANT_IDS.map((variant) => [variant, variantSummary(grouped[variant])]),
  );
  const bKnownFalseAcceptanceReproduced = grouped.b.every((run) =>
    KNOWN_B_FALSE_ACCEPT_CASE_IDS.every(
      (caseId) => caseById(run, caseId).workflow_status === "machine_accepted",
    ),
  );
  const cKnownAttackRejection = grouped.c.every((run) =>
    run.cases
      .filter((item) => item.kind === "attack")
      .every((item) => item.workflow_status !== "machine_accepted"),
  );
  const cCorrectControls = grouped.c.every(
    (run) =>
      caseById(run, "correct-control").workflow_status === "machine_accepted",
  );
  const cCounterfactuals = grouped.c.every((run) =>
    COUNTERFACTUAL_IDS.every((id) =>
      caseById(run, "correct-control").counterfactuals.some(
        (item) =>
          item.id === id &&
          item.passed === true &&
          item.workflow_observed_passed === true,
      ),
    ),
  );
  const cRecoveryControls = grouped.c.every((run) =>
    run.recoveries.every(
      (item) =>
        item.workflow_status === "machine_accepted" &&
        item.counterfactuals.every(
          (control) =>
            control.passed === true &&
            control.workflow_observed_passed === true,
        ),
    ),
  );
  const requiredUnverifiedMetrics = runs.flatMap((run) =>
    REQUIRED_VERIFIED_METRICS.filter(
      (name) => run.metrics[name]?.status !== "measured",
    ).map((name) => `${run.variant_id}:${run.repeat}:${name}`),
  );
  const requiredMetricsVerified = requiredUnverifiedMetrics.length === 0;
  const aRoleHonest =
    frozenConfig.variants.a.safety_eligible === false &&
    grouped.a.every(
      (run) =>
        run.safety_eligible === false &&
        run.comparison_role === "cost-and-error-baseline-only",
    );
  const candidateSafetyFloor =
    aRoleHonest &&
    bKnownFalseAcceptanceReproduced &&
    cKnownAttackRejection &&
    cCorrectControls &&
    cCounterfactuals &&
    cRecoveryControls &&
    perVariant.c.false_completion_count ===
      ADMISSION_THRESHOLDS.candidate_false_completions &&
    perVariant.c.correct_accept_rate ===
      ADMISSION_THRESHOLDS.candidate_correct_accept_rate &&
    perVariant.c.counterfactual_pass_rate ===
      ADMISSION_THRESHOLDS.candidate_counterfactual_pass_rate;

  const paired = grouped.c.map((candidateRun, index) => {
    const baselineRun = grouped.b[index];
    assert(
      baselineRun.repeat === candidateRun.repeat,
      `summary_pair_repeat:${candidateRun.repeat}`,
    );
    const baseline = metricValue(baselineRun, "total_elapsed_ms");
    const candidate = metricValue(candidateRun, "total_elapsed_ms");
    return {
      repeat: candidateRun.repeat,
      baseline_total_elapsed_ms: baseline,
      candidate_total_elapsed_ms: candidate,
      net_benefit_ms: round(baseline - candidate),
      candidate_to_baseline_ratio: ratio(candidate, baseline),
    };
  });
  const wins = paired.filter((item) => item.net_benefit_ms > 0).length;
  const correctPathRatio = ratio(
    median(grouped.c.map((run) => metricValue(run, "correct_path_total_ms"))),
    median(grouped.b.map((run) => metricValue(run, "correct_path_total_ms"))),
  );
  const phaseRatios = Object.fromEntries(
    PHASE_COST_METRICS.map((name) => [
      name,
      ratio(
        median(grouped.c.map((run) => metricValue(run, name))),
        median(grouped.b.map((run) => metricValue(run, name))),
      ),
    ]),
  );
  const expansion = expansionDecision(runs, frozenConfig);
  const requiredRepeatCount = expansion.required_repeats;
  const completeRepeatSet = repeats.length === requiredRepeatCount;
  const costQualification =
    completeRepeatSet &&
    wins >= requiredWins(repeats.length) &&
    median(paired.map((item) => item.net_benefit_ms)) > 0 &&
    correctPathRatio <= ADMISSION_THRESHOLDS.maximum_correct_path_cost_ratio &&
    Object.values(phaseRatios).every(
      (value) => value <= ADMISSION_THRESHOLDS.maximum_phase_cost_ratio,
    );
  const evidenceValid =
    aRoleHonest &&
    bKnownFalseAcceptanceReproduced &&
    requiredMetricsVerified &&
    runs.every((run) => run.provenance_doubt_reasons.length === 0);
  const totalRoiPositive =
    evidenceValid && candidateSafetyFloor && costQualification;

  return {
    schema_version: "long-task-real-process-roi-summary-v1",
    repeats: repeats.length,
    required_repeats: requiredRepeatCount,
    required_wins: requiredWins(repeats.length),
    wins,
    expansion,
    evidence_valid: evidenceValid,
    a_safety_eligible: false,
    a_role_honest: aRoleHonest,
    b_known_r9_r11_false_acceptance_reproduced: bKnownFalseAcceptanceReproduced,
    candidate_safety_floor: candidateSafetyFloor,
    candidate_known_attack_rejection: cKnownAttackRejection,
    candidate_correct_controls: cCorrectControls,
    candidate_counterfactual_controls: cCounterfactuals,
    candidate_recovery_controls: cRecoveryControls,
    required_metrics_verified: requiredMetricsVerified,
    required_unverified_metrics: requiredUnverifiedMetrics,
    per_variant: perVariant,
    paired_cost: paired,
    median_net_benefit_ms: median(paired.map((item) => item.net_benefit_ms)),
    correct_path_cost_ratio: correctPathRatio,
    phase_cost_ratios: phaseRatios,
    cost_qualification: costQualification,
    total_roi_positive: totalRoiPositive,
    admission_verdict: !evidenceValid
      ? "invalid_evidence"
      : !candidateSafetyFloor
        ? "rejected_safety_floor"
        : !completeRepeatSet
          ? "requires_expanded_repeats"
          : costQualification
            ? "qualified_positive_roi"
            : "rejected_non_positive_roi",
  };
}

export function expansionDecision(runs, frozenConfig) {
  const initial = runs.filter(
    (run) => run.repeat <= ADMISSION_THRESHOLDS.minimum_repeats,
  );
  if (
    initial.length <
    ADMISSION_THRESHOLDS.minimum_repeats * VARIANT_IDS.length
  )
    return {
      required_repeats: ADMISSION_THRESHOLDS.minimum_repeats,
      reasons: ["initial_repeat_set_incomplete"],
    };
  for (const run of initial) validateRunRecord(run, frozenConfig);
  const byVariant = Object.fromEntries(
    VARIANT_IDS.map((variant) => [
      variant,
      initial
        .filter((run) => run.variant_id === variant)
        .sort((left, right) => left.repeat - right.repeat),
    ]),
  );
  const reasons = [];
  for (const variant of VARIANT_IDS) {
    const cv = coefficientOfVariation(
      byVariant[variant].map((run) => metricValue(run, "total_elapsed_ms")),
    );
    if (cv > ADMISSION_THRESHOLDS.maximum_coefficient_of_variation)
      reasons.push(`total_elapsed_cv:${variant}:${round(cv)}`);
  }
  const deltas = byVariant.c.map(
    (run, index) =>
      metricValue(byVariant.b[index], "total_elapsed_ms") -
      metricValue(run, "total_elapsed_ms"),
  );
  if (deltas.some((value) => value > 0) && deltas.some((value) => value <= 0))
    reasons.push("paired_cost_direction_inconsistent");
  const pairedTotalRatio = ratio(
    median(byVariant.c.map((run) => metricValue(run, "total_elapsed_ms"))),
    median(byVariant.b.map((run) => metricValue(run, "total_elapsed_ms"))),
  );
  if (Math.abs(pairedTotalRatio - 1) <= ADMISSION_THRESHOLDS.threshold_nearness)
    reasons.push("paired_total_ratio_near_break_even");
  const correctPathRatio = ratio(
    median(byVariant.c.map((run) => metricValue(run, "correct_path_total_ms"))),
    median(byVariant.b.map((run) => metricValue(run, "correct_path_total_ms"))),
  );
  if (
    Math.abs(
      correctPathRatio - ADMISSION_THRESHOLDS.maximum_correct_path_cost_ratio,
    ) <= ADMISSION_THRESHOLDS.threshold_nearness
  )
    reasons.push("correct_path_ratio_near_threshold");
  for (const name of PHASE_COST_METRICS) {
    const phaseRatio = ratio(
      median(byVariant.c.map((run) => metricValue(run, name))),
      median(byVariant.b.map((run) => metricValue(run, name))),
    );
    if (
      Math.abs(phaseRatio - ADMISSION_THRESHOLDS.maximum_phase_cost_ratio) <=
      ADMISSION_THRESHOLDS.threshold_nearness
    )
      reasons.push(`phase_ratio_near_threshold:${name}`);
  }
  if (initial.some((run) => run.provenance_doubt_reasons.length > 0))
    reasons.push("environment_or_provenance_doubt");
  return {
    required_repeats: reasons.length
      ? ADMISSION_THRESHOLDS.expanded_repeats
      : ADMISSION_THRESHOLDS.minimum_repeats,
    reasons,
  };
}

export function validateMetricSet(metrics) {
  assertSameSet(Object.keys(metrics ?? {}), REQUIRED_METRICS, "metric_set");
  for (const name of REQUIRED_METRICS) {
    const metric = metrics[name];
    assert(metric && typeof metric === "object", `metric_object:${name}`);
    assert(
      typeof metric.unit === "string" && metric.unit.length > 0,
      `metric_unit:${name}`,
    );
    assert(
      typeof metric.basis === "string" && metric.basis.length > 0,
      `metric_basis:${name}`,
    );
    if (NULLABLE_UNVERIFIED_METRICS.includes(name) && metric.value === null) {
      assert(metric.status === "unverified", `metric_unverified:${name}`);
      continue;
    }
    assert(metric.status === "measured", `metric_measured:${name}`);
    assert(Number.isFinite(metric.value), `metric_number:${name}`);
    if (!SIGNED_METRICS.includes(name))
      assert(metric.value >= 0, `metric_nonnegative:${name}`);
  }
}

export function measuredMetric(value, unit, basis) {
  assert(Number.isFinite(value), "measured_metric_value");
  return { value: round(value), unit, status: "measured", basis };
}

export function unverifiedMetric(unit, basis) {
  return { value: null, unit, status: "unverified", basis };
}

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function median(values) {
  assert(values.length > 0, "median_empty");
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : round((sorted[middle - 1] + sorted[middle]) / 2);
}

export function coefficientOfVariation(values) {
  assert(values.length > 0, "coefficient_of_variation_empty");
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return values.every((value) => value === 0) ? 0 : Infinity;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

export function assert(condition, code) {
  if (!condition) throw new Error(`real_process_roi_invalid:${code}`);
}

function validateCaseRecord(item, variantId) {
  assert(CASE_IDS.includes(item?.case_id), "case_id");
  assert(
    item.kind === (item.case_id === "correct-control" ? "control" : "attack"),
    `case_kind:${item.case_id}`,
  );
  assert(
    ["normal", "degraded"].includes(item.mode),
    `case_mode:${item.case_id}`,
  );
  assert(
    typeof item.workflow_status === "string" && item.workflow_status.length > 0,
    `case_workflow_status:${item.case_id}`,
  );
  assert(
    item.gold?.schema_version === "long-task-real-process-gold-result-v1" &&
      item.gold.case_id === item.case_id &&
      item.gold.observer === "real-process-gold-v1" &&
      item.gold.independent_of_harness === true,
    `case_gold_owner:${item.case_id}`,
  );
  assert(
    item.gold.conformant === (item.kind === "control"),
    `case_gold_conformance:${item.case_id}`,
  );
  assert(
    shaPattern.test(item.gold.result_sha256 ?? "") &&
      item.gold.result_sha256 === resultIdentity(item.gold),
    `case_gold_sha:${item.case_id}`,
  );
  assert(
    Array.isArray(item.gold.facts) &&
      item.gold.facts.length === 8 &&
      new Set(item.gold.facts.map((fact) => fact.fact_id)).size === 8 &&
      item.gold.semantic_conformant ===
        item.gold.facts.every((fact) => fact.matches === true) &&
      item.gold.conformant ===
        (item.gold.semantic_conformant && item.gold.boundary_conformant),
    `case_gold_fact_count:${item.case_id}`,
  );
  assert(
    item.raw_execution?.maximum_envelopes_per_execution === 1,
    `case_single_envelope:${item.case_id}`,
  );
  assert(
    item.raw_execution?.minimum_observations_per_envelope >= 4 &&
      Number.isInteger(item.raw_execution?.observed_main_execution_count) &&
      item.raw_execution.observed_main_execution_count >= 0,
    `case_multi_fact_envelope:${item.case_id}`,
  );
  assert(
    Array.isArray(item.command_record_refs) &&
      item.command_record_refs.length > 0,
    `case_command_refs:${item.case_id}`,
  );
  assert(
    Array.isArray(item.counterfactuals),
    `case_counterfactuals:${item.case_id}`,
  );
  if (item.case_id === "correct-control") {
    assertSameSet(
      item.counterfactuals.map((control) => control.id),
      COUNTERFACTUAL_IDS,
      "case_counterfactual_set",
    );
    for (const control of item.counterfactuals) {
      assert(
        typeof control.passed === "boolean" &&
          typeof control.workflow_observed_passed === "boolean" &&
          control.result_sha256 === resultIdentity(control),
        `counterfactual_passed:${control.id}`,
      );
      assert(
        control.baseline_observation_count ===
          control.mutated_observation_count &&
          control.baseline_observation_count >= 8,
        `counterfactual_obligation_universe:${control.id}`,
      );
      assert(
        control.affected_changed === true &&
          control.preserved_unchanged === true &&
          control.unexpected_changed_fact_ids.length === 0,
        `counterfactual_impact:${control.id}`,
      );
    }
  }
  if (variantId === "a")
    assert(
      item.authority_boundary === "legacy-project-self-report",
      `case_a_authority_boundary:${item.case_id}`,
    );
}

function validateRecoveryRecord(item, attackCaseIds) {
  assert(
    attackCaseIds.includes(item?.source_attack_case_id),
    "recovery_source_attack",
  );
  assert(
    typeof item.workflow_status === "string" && item.workflow_status.length > 0,
    `recovery_terminal:${item.source_attack_case_id}`,
  );
  assert(
    item.gold?.schema_version === "long-task-real-process-gold-result-v1" &&
      item.gold.case_id === "correct-control" &&
      item.gold.observer === "real-process-gold-v1" &&
      item.gold.independent_of_harness === true &&
      item.gold.conformant === true &&
      item.gold.result_sha256 === resultIdentity(item.gold),
    `recovery_gold:${item.source_attack_case_id}`,
  );
  assert(
    shaPattern.test(item.gold.result_sha256 ?? "") &&
      Array.isArray(item.gold.facts) &&
      item.gold.facts.length === 8 &&
      item.gold.facts.every((fact) => fact.matches === true),
    `recovery_gold_facts:${item.source_attack_case_id}`,
  );
  assert(
    item.raw_execution?.maximum_envelopes_per_execution === 1 &&
      item.raw_execution?.minimum_observations_per_envelope >= 4 &&
      Number.isInteger(item.raw_execution?.observed_main_execution_count) &&
      item.raw_execution.observed_main_execution_count >= 0,
    `recovery_raw_execution:${item.source_attack_case_id}`,
  );
  assert(
    Array.isArray(item.command_record_refs) &&
      item.command_record_refs.length > 0,
    `recovery_command_refs:${item.source_attack_case_id}`,
  );
  assertSameSet(
    item.counterfactuals?.map((control) => control.id),
    COUNTERFACTUAL_IDS,
    `recovery_counterfactual_set:${item.source_attack_case_id}`,
  );
  for (const control of item.counterfactuals) {
    assert(
      typeof control.passed === "boolean" &&
        typeof control.workflow_observed_passed === "boolean" &&
        control.result_sha256 === resultIdentity(control) &&
        control.baseline_observation_count ===
          control.mutated_observation_count &&
        control.baseline_observation_count >= 8 &&
        control.affected_changed === true &&
        control.preserved_unchanged === true &&
        control.unexpected_changed_fact_ids.length === 0,
      `recovery_counterfactual:${item.source_attack_case_id}:${control.id}`,
    );
  }
}

function variantSummary(runs) {
  const attacks = runs.flatMap((run) =>
    run.cases.filter((item) => item.kind === "attack"),
  );
  const controls = runs.map((run) => caseById(run, "correct-control"));
  const falseCompletions = attacks.filter(
    (item) => item.workflow_status === "machine_accepted",
  ).length;
  const counterfactuals = controls.flatMap((item) => item.counterfactuals);
  const correctAttempts = runs.flatMap((run) => [
    caseById(run, "correct-control"),
    ...run.recoveries,
  ]);
  return {
    runs: runs.length,
    false_completion_count: falseCompletions,
    false_completion_rate: round(falseCompletions / attacks.length),
    correct_accept_count: controls.filter(
      (item) => item.workflow_status === "machine_accepted",
    ).length,
    correct_accept_rate: round(
      controls.filter((item) => item.workflow_status === "machine_accepted")
        .length / controls.length,
    ),
    counterfactual_pass_rate: round(
      counterfactuals.filter((item) => item.passed === true).length /
        counterfactuals.length,
    ),
    false_blocking_count: correctAttempts.filter(
      (item) => item.workflow_status !== "machine_accepted",
    ).length,
    false_blocking_rate: round(
      correctAttempts.filter(
        (item) => item.workflow_status !== "machine_accepted",
      ).length / correctAttempts.length,
    ),
    median_total_elapsed_ms: median(
      runs.map((run) => metricValue(run, "total_elapsed_ms")),
    ),
    median_correct_path_total_ms: median(
      runs.map((run) => metricValue(run, "correct_path_total_ms")),
    ),
    metrics: Object.fromEntries(
      REQUIRED_METRICS.map((name) => {
        const rows = runs.map((run) => run.metrics[name]);
        const units = new Set(rows.map((row) => row.unit));
        assert(units.size === 1, `variant_metric_unit:${name}`);
        const measured = rows.filter((row) => row.status === "measured");
        const unverified = rows.filter((row) => row.status === "unverified");
        return [
          name,
          measured.length === rows.length
            ? {
                status: "measured",
                unit: rows[0].unit,
                median: median(measured.map((row) => row.value)),
                values: measured.map((row) => row.value),
              }
            : unverified.length === rows.length
              ? {
                  status: "unverified",
                  unit: rows[0].unit,
                  median: null,
                  values: rows.map(() => null),
                  bases: rows.map((row) => row.basis),
                }
              : {
                  status: "partially_unverified",
                  unit: rows[0].unit,
                  median: null,
                  values: rows.map((row) => row.value),
                  bases: rows.map((row) => row.basis),
                },
        ];
      }),
    ),
  };
}

function caseById(run, caseId) {
  const item = run.cases.find((candidate) => candidate.case_id === caseId);
  assert(item, `case_missing:${run.variant_id}:${run.repeat}:${caseId}`);
  return item;
}

function metricValue(run, name) {
  const metric = run.metrics[name];
  assert(
    metric?.status === "measured" && Number.isFinite(metric.value),
    `metric_required_for_scoring:${run.variant_id}:${run.repeat}:${name}`,
  );
  return metric.value;
}

function assertTimestampOrder(started, completed, label) {
  const start = Date.parse(started);
  const end = Date.parse(completed);
  assert(Number.isFinite(start) && Number.isFinite(end), `${label}:timestamp`);
  assert(end >= start, `${label}:order`);
}

function assertSameSet(left, right, code) {
  assert(Array.isArray(left) && left.length === right.length, code);
  assert(
    [...left]
      .sort()
      .every((value, index) => value === [...right].sort()[index]),
    code,
  );
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function ratio(numerator, denominator) {
  if (denominator === 0) return numerator === 0 ? 1 : Infinity;
  return round(numerator / denominator);
}

function resultIdentity(value) {
  const projection = { ...value };
  delete projection.result_sha256;
  delete projection.workflow_observed_passed;
  return sha256(canonical(projection));
}

function round(value) {
  return Math.round(value * 10_000) / 10_000;
}
