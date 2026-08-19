import {
  difference,
  executionCostComparison,
  reduction,
} from "./comparison-cost-metrics.mjs";
import { median } from "./shared.mjs";

export function compareContextWorkflow(baseline, candidate) {
  const b = baseline.metrics;
  const c = candidate.metrics;
  const assuranceTrack = baseline.run.track === "workflow-assurance";
  const selectionSufficient = [b, c].every(
    (item) => item.context_routing.selection_confidence === "high",
  );
  const costSufficient =
    !assuranceTrack ||
    [b, c].every(
      (item) => item.execution_cost.confidence === "high_host_trace",
    );
  const elapsedSufficient =
    !assuranceTrack ||
    [baseline, candidate].every((item) => item.elapsed.confidence === "high");
  return {
    hard_gates_passed: b.hard_gate_passed && c.hard_gate_passed,
    evidence_sufficient:
      selectionSufficient && costSufficient && elapsedSufficient,
    hidden_quality_equal:
      b.hidden_quality.decision === "PASS" &&
      c.hidden_quality.decision === "PASS" &&
      b.hidden_quality.passed === c.hidden_quality.passed &&
      b.hidden_quality.total === c.hidden_quality.total,
    context_update_equal: b.context_update.correct && c.context_update.correct,
    baseline_context_recall: b.context_routing.controlling_context_recall,
    candidate_context_recall: c.context_routing.controlling_context_recall,
    context_recall_delta: difference(
      c.context_routing.controlling_context_recall,
      b.context_routing.controlling_context_recall,
    ),
    baseline_selected_source_recall: selectedSourceRecall(b),
    candidate_selected_source_recall: selectedSourceRecall(c),
    selected_source_recall_preserved:
      b.context_routing.required_source_total === 0 ||
      (b.context_routing.selected_source_recall === 1 &&
        c.context_routing.selected_source_recall === 1),
    baseline_irrelevant_context_bytes:
      b.context_routing.irrelevant_context_bytes,
    candidate_irrelevant_context_bytes:
      c.context_routing.irrelevant_context_bytes,
    irrelevant_context_bytes_reduction: reduction(
      b.context_routing.irrelevant_context_bytes,
      c.context_routing.irrelevant_context_bytes,
    ),
    baseline_read_rounds: b.context_routing.context_read_rounds,
    candidate_read_rounds: c.context_routing.context_read_rounds,
    read_round_reduction: difference(
      b.context_routing.context_read_rounds,
      c.context_routing.context_read_rounds,
    ),
    baseline_instruction_bytes: b.workflow_instruction_bytes,
    candidate_instruction_bytes: c.workflow_instruction_bytes,
    instruction_bytes_reduction: reduction(
      b.workflow_instruction_bytes,
      c.workflow_instruction_bytes,
    ),
    conformance_preserved:
      (!b.conformance_required || b.conformance_completed === true) &&
      (!c.conformance_required || c.conformance_completed === true),
    workflow_route_correct:
      b.handoff.workflow_route_correct && c.handoff.workflow_route_correct,
    owner_scope_conformance: b.change_scope.correct && c.change_scope.correct,
    false_complete_free:
      b.handoff.false_complete_free && c.handoff.false_complete_free,
    honest_handoff: b.handoff.honest_handoff && c.handoff.honest_handoff,
    ...executionCostComparison(b, c),
    baseline_elapsed_ms: baseline.elapsed.duration_ms,
    candidate_elapsed_ms: candidate.elapsed.duration_ms,
    elapsed_reduction: reduction(
      baseline.elapsed.duration_ms,
      candidate.elapsed.duration_ms,
    ),
    selection_evidence: {
      baseline: b.context_routing.selection_source,
      candidate: c.context_routing.selection_source,
    },
  };
}

export function compareAuthoring(baseline, candidate) {
  const b = baseline.metrics.authoring;
  const c = candidate.metrics.authoring;
  const fingerprintsEqual = Boolean(
    b.canonical_authority_fingerprint &&
      b.canonical_authority_fingerprint === c.canonical_authority_fingerprint,
  );
  const comparable = (value) => (fingerprintsEqual ? value : null);
  return {
    hard_gates_passed:
      baseline.metrics.hard_gate_passed &&
      candidate.metrics.hard_gate_passed &&
      fingerprintsEqual,
    evidence_sufficient: fingerprintsEqual,
    canonical_authority_equivalent: fingerprintsEqual,
    authoring_cost_comparable: fingerprintsEqual,
    baseline_yaml_lines: comparable(b.effective_yaml_lines),
    candidate_yaml_lines: comparable(c.effective_yaml_lines),
    effective_yaml_line_reduction: comparable(
      reduction(b.effective_yaml_lines, c.effective_yaml_lines),
    ),
    baseline_yaml_bytes: comparable(b.yaml_bytes),
    candidate_yaml_bytes: comparable(c.yaml_bytes),
    yaml_byte_reduction: comparable(reduction(b.yaml_bytes, c.yaml_bytes)),
    baseline_preflight_rounds: comparable(b.preflight_rounds),
    candidate_preflight_rounds: comparable(c.preflight_rounds),
    preflight_round_reduction: comparable(
      difference(b.preflight_rounds, c.preflight_rounds),
    ),
    manual_source_ref_reduction: comparable(
      difference(b.manual_source_ref_count, c.manual_source_ref_count),
    ),
    manual_source_statement_reduction: comparable(
      difference(
        b.manual_source_statement_count,
        c.manual_source_statement_count,
      ),
    ),
    manual_risk_row_reduction: comparable(
      difference(b.manual_risk_fact_rows, c.manual_risk_fact_rows),
    ),
    baseline_elapsed_ms: comparable(baseline.elapsed.duration_ms),
    candidate_elapsed_ms: comparable(candidate.elapsed.duration_ms),
    elapsed_reduction: comparable(
      reduction(baseline.elapsed.duration_ms, candidate.elapsed.duration_ms),
    ),
  };
}

export function aggregateContextWorkflow(items) {
  return {
    hidden_quality_pass_rate: rate(items, "hidden_quality_equal"),
    context_update_correctness: rate(items, "context_update_equal"),
    controlling_context_recall: metricMedian(items, "candidate_context_recall"),
    selected_source_recall: metricMedian(items, "candidate_selected_source_recall"),
    irrelevant_context_bytes_reduction: metricMedian(
      items,
      "irrelevant_context_bytes_reduction",
    ),
    read_round_reduction: metricMedian(items, "read_round_reduction"),
    instruction_bytes_reduction: metricMedian(
      items,
      "instruction_bytes_reduction",
    ),
    native_verification_rate: rate(items, "hard_gates_passed"),
    conformance_rate: rate(items, "conformance_preserved"),
    workflow_route_correctness: rate(items, "workflow_route_correct"),
    owner_scope_conformance: rate(items, "owner_scope_conformance"),
    false_complete_free_rate: rate(items, "false_complete_free"),
    honest_handoff_rate: rate(items, "honest_handoff"),
    total_tool_call_reduction: metricMedian(items, "total_tool_call_reduction"),
    pre_implementation_tool_call_reduction: metricMedian(
      items,
      "pre_implementation_tool_call_reduction",
    ),
    formal_enumeration_tool_call_reduction: metricMedian(
      items,
      "formal_enumeration_tool_call_reduction",
    ),
    token_reduction: metricMedian(items, "token_reduction"),
    elapsed_reduction: metricMedian(items, "elapsed_reduction"),
  };
}

export function aggregateAuthoring(items) {
  return {
    preflight_ready_rate: rate(items, "hard_gates_passed"),
    compile_success_rate: rate(items, "hard_gates_passed"),
    canonical_authority_equivalence: rate(
      items,
      "canonical_authority_equivalent",
    ),
    effective_yaml_line_reduction: metricMedian(
      items,
      "effective_yaml_line_reduction",
    ),
    median_preflight_round_reduction: metricMedian(
      items,
      "preflight_round_reduction",
    ),
    elapsed_reduction: metricMedian(items, "elapsed_reduction"),
  };
}

export function evaluateThresholds(track, summary, thresholds) {
  const failed = Object.entries(thresholds).filter(([key, value]) => {
    const actual = summary[key];
    return !Number.isFinite(actual) || actual < value;
  });
  if (failed.length)
    return `THRESHOLDS_NOT_MET:${failed.map(([key]) => key).join(",")}`;
  return track === "long-task-authoring"
    ? "AUTHORING_CANDIDATE_ADMISSIBLE"
    : "CANDIDATE_ADMISSIBLE_FOR_REVIEW";
}

export function requiredPairs(track, eligible, summary, thresholds) {
  const policy = track.pair_policy;
  if (!policy) return { minimum: 3, reason: "fixed_minimum" };
  if (eligible.length < policy.minimum_pairs)
    return { minimum: policy.minimum_pairs, reason: "base_minimum" };
  const near = (policy.near_threshold_metrics ?? []).filter((key) =>
    nearThreshold(summary[key], thresholds[key], policy.near_threshold_margin),
  );
  const highVariance = (policy.high_variance_metrics ?? []).filter((key) =>
    highVarianceMetric(
      eligible,
      key,
      policy.minimum_pairs,
      policy.high_variance_range,
    ),
  );
  if (!near.length && !highVariance.length)
    return { minimum: policy.minimum_pairs, reason: "base_sufficient" };
  const reasons = [
    ...near.map((key) => `near:${key}`),
    ...highVariance.map((key) => `variance:${key}`),
  ];
  return {
    minimum: policy.high_variance_or_near_threshold_pairs,
    reason: `expanded:${reasons.join(",")}`,
  };
}

export function interpretation(report) {
  if (!report.compatibility.passed)
    return "The pair is invalid because fixed run identity differs.";
  if (!report.compatibility.formal_ready)
    return "The pair is calibration-only because Harness initialization or formal protocol metadata is missing.";
  if (!report.metrics.hard_gates_passed)
    return "The candidate is not comparable because quality, Context correctness, Compile, or canonical Authority regressed.";
  if (!report.metrics.evidence_sufficient)
    return "The pair is calibration-only because the required deterministic or host-trace evidence is missing.";
  return "The pair is eligible for aggregation; one pair alone is not enough for an implementation decision.";
}

function selectedSourceRecall(metrics) {
  return metrics.context_routing.required_source_total === 0
    ? 1
    : metrics.context_routing.selected_source_recall;
}

function nearThreshold(actual, expected, margin) {
  return (
    Number.isFinite(actual) &&
    Number.isFinite(expected) &&
    Math.abs(actual - expected) <= margin
  );
}

function highVarianceMetric(items, key, minimum, range) {
  const values = items.map((item) => item.metrics[key]).filter(Number.isFinite);
  return (
    values.length >= minimum && Math.max(...values) - Math.min(...values) >= range
  );
}

function rate(items, key) {
  return items.length
    ? items.filter((item) => item.metrics[key]).length / items.length
    : null;
}

function metricMedian(items, key) {
  return median(items.map((item) => item.metrics[key]));
}
