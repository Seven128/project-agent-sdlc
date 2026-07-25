import path from "node:path";
import {
  loadExperimentSet,
  median,
  ratio,
  readJson,
  round,
  writeJson
} from "./shared.mjs";

export async function compareMechanismScores(options) {
  const baseline = await readJson(path.resolve(options.baselineScore));
  const candidate = await readJson(path.resolve(options.candidateScore));
  const compatibility = pairCompatibility(baseline, candidate);
  const track = baseline.run.track;
  const report = {
    schema_version: "tiny-context-mechanism-comparison-v1",
    compared_at: new Date().toISOString(),
    track,
    task_id: baseline.run.task_id,
    pair_id: baseline.run.pair_id,
    replicate: baseline.run.replicate,
    baseline_variant: baseline.run.variant_id,
    candidate_variant: candidate.run.variant_id,
    run_identity: {
      model: baseline.run.model,
      reasoning: baseline.run.reasoning,
      baseline_commit: baseline.run.baseline_commit,
      fixture_sha256: baseline.run.fixture_sha256,
      experiment_set_sha256: baseline.run.experiment_set_sha256,
      baseline_source_checkout_commit: baseline.run.source_checkout_commit,
      candidate_source_checkout_commit: candidate.run.source_checkout_commit
    },
    compatibility,
    metrics: track === "long-task-authoring" ? compareAuthoring(baseline, candidate) : compareContextWorkflow(baseline, candidate)
  };
  report.decision_eligible = compatibility.passed && compatibility.formal_ready && report.metrics.hard_gates_passed && report.metrics.evidence_sufficient;
  report.interpretation = interpretation(report);
  if (options.out) await writeJson(path.resolve(options.out), report);
  return report;
}

export async function aggregateComparisons(options) {
  if (!options.scores?.length) throw new Error("aggregate requires one or more --score files");
  const comparisons = await Promise.all(options.scores.map((file) => readJson(path.resolve(file))));
  const first = comparisons[0];
  if (comparisons.some((item) => item.track !== first.track || item.task_id !== first.task_id || item.baseline_variant !== first.baseline_variant || item.candidate_variant !== first.candidate_variant)) throw new Error("aggregate inputs must share task, track, baseline, and candidate variants");
  const fixedIdentity = JSON.stringify(first.run_identity);
  if (comparisons.some((item) => JSON.stringify(item.run_identity) !== fixedIdentity)) throw new Error("aggregate inputs must share fixed model, reasoning, fixture, experiment, baseline, and source checkout identity");
  const pairedRunIds = comparisons.map((item) => `${item.pair_id}\0${item.replicate}`);
  if (new Set(pairedRunIds).size !== pairedRunIds.length) throw new Error("aggregate inputs must be distinct paired runs");
  const experiments = await loadExperimentSet();
  const thresholds = experiments.tracks[first.track].decision_thresholds;
  const eligible = comparisons.filter((item) => item.decision_eligible);
  const summary = first.track === "long-task-authoring" ? aggregateAuthoring(eligible) : aggregateContextWorkflow(eligible);
  const report = {
    schema_version: "tiny-context-mechanism-aggregate-v1",
    aggregated_at: new Date().toISOString(),
    track: first.track,
    task_id: first.task_id,
    baseline_variant: first.baseline_variant,
    candidate_variant: first.candidate_variant,
    pair_count: comparisons.length,
    eligible_pair_count: eligible.length,
    minimum_recommended_pairs: 3,
    thresholds,
    summary,
    decision_eligible: eligible.length >= 3,
    decision: eligible.length < 3 ? "INSUFFICIENT_PAIRED_RUNS" : evaluateThresholds(first.track, summary, thresholds),
    comparisons
  };
  if (options.out) await writeJson(path.resolve(options.out), report);
  return report;
}

function pairCompatibility(left, right) {
  const fields = ["task_id", "track", "pair_id", "replicate", "model", "reasoning", "baseline_commit", "fixture_sha256", "experiment_set_sha256"];
  const mismatches = fields.filter((field) => left.run[field] !== right.run[field]).map((field) => ({ field, baseline: left.run[field], candidate: right.run[field] }));
  const roleCorrect = left.run.variant_role === "baseline" && right.run.variant_role === "candidate";
  const formalReady = left.run.protocol_status === "formal" && right.run.protocol_status === "formal" && left.run.harness_initialized === true && right.run.harness_initialized === true;
  if (left.run.track !== "long-task-authoring" && left.run.source_checkout_commit !== right.run.source_checkout_commit) mismatches.push({ field: "source_checkout_commit", baseline: left.run.source_checkout_commit, candidate: right.run.source_checkout_commit });
  return { passed: mismatches.length === 0 && roleCorrect, formal_ready: formalReady, role_correct: roleCorrect, mismatches };
}

function compareContextWorkflow(baseline, candidate) {
  const b = baseline.metrics;
  const c = candidate.metrics;
  const hard = b.hard_gate_passed && c.hard_gate_passed;
  const selectionSufficient = [b.context_routing.selection_confidence, c.context_routing.selection_confidence].every((value) => value === "high");
  return {
    hard_gates_passed: hard,
    evidence_sufficient: selectionSufficient,
    hidden_quality_equal: b.hidden_quality.decision === "PASS" && c.hidden_quality.decision === "PASS" && b.hidden_quality.passed === c.hidden_quality.passed && b.hidden_quality.total === c.hidden_quality.total,
    context_update_equal: b.context_update.correct && c.context_update.correct,
    baseline_context_recall: b.context_routing.controlling_context_recall,
    candidate_context_recall: c.context_routing.controlling_context_recall,
    context_recall_delta: difference(c.context_routing.controlling_context_recall, b.context_routing.controlling_context_recall),
    baseline_selected_source_recall: b.context_routing.selected_source_recall,
    candidate_selected_source_recall: c.context_routing.selected_source_recall,
    selected_source_recall_preserved: b.context_routing.required_source_total === 0
      || (b.context_routing.selected_source_recall === 1 && c.context_routing.selected_source_recall === 1),
    baseline_irrelevant_context_bytes: b.context_routing.irrelevant_context_bytes,
    candidate_irrelevant_context_bytes: c.context_routing.irrelevant_context_bytes,
    irrelevant_context_bytes_reduction: reduction(b.context_routing.irrelevant_context_bytes, c.context_routing.irrelevant_context_bytes),
    baseline_read_rounds: b.context_routing.context_read_rounds,
    candidate_read_rounds: c.context_routing.context_read_rounds,
    read_round_reduction: difference(b.context_routing.context_read_rounds, c.context_routing.context_read_rounds),
    baseline_instruction_bytes: b.workflow_instruction_bytes,
    candidate_instruction_bytes: c.workflow_instruction_bytes,
    instruction_bytes_reduction: reduction(b.workflow_instruction_bytes, c.workflow_instruction_bytes),
    conformance_preserved: b.conformance_completed === true && c.conformance_completed === true,
    selection_evidence: { baseline: b.context_routing.selection_source, candidate: c.context_routing.selection_source }
  };
}

function compareAuthoring(baseline, candidate) {
  const b = baseline.metrics.authoring;
  const c = candidate.metrics.authoring;
  const fingerprintsEqual = Boolean(b.canonical_authority_fingerprint && b.canonical_authority_fingerprint === c.canonical_authority_fingerprint);
  const comparable = (value) => fingerprintsEqual ? value : null;
  return {
    hard_gates_passed: baseline.metrics.hard_gate_passed && candidate.metrics.hard_gate_passed && fingerprintsEqual,
    evidence_sufficient: fingerprintsEqual,
    canonical_authority_equivalent: fingerprintsEqual,
    authoring_cost_comparable: fingerprintsEqual,
    baseline_yaml_lines: comparable(b.effective_yaml_lines),
    candidate_yaml_lines: comparable(c.effective_yaml_lines),
    effective_yaml_line_reduction: comparable(reduction(b.effective_yaml_lines, c.effective_yaml_lines)),
    baseline_yaml_bytes: comparable(b.yaml_bytes),
    candidate_yaml_bytes: comparable(c.yaml_bytes),
    yaml_byte_reduction: comparable(reduction(b.yaml_bytes, c.yaml_bytes)),
    baseline_preflight_rounds: comparable(b.preflight_rounds),
    candidate_preflight_rounds: comparable(c.preflight_rounds),
    preflight_round_reduction: comparable(difference(b.preflight_rounds, c.preflight_rounds)),
    manual_source_ref_reduction: comparable(difference(b.manual_source_ref_count, c.manual_source_ref_count)),
    manual_source_statement_reduction: comparable(difference(b.manual_source_statement_count, c.manual_source_statement_count)),
    manual_risk_row_reduction: comparable(difference(b.manual_risk_fact_rows, c.manual_risk_fact_rows)),
    baseline_elapsed_ms: comparable(baseline.elapsed.duration_ms),
    candidate_elapsed_ms: comparable(candidate.elapsed.duration_ms),
    elapsed_reduction: comparable(reduction(baseline.elapsed.duration_ms, candidate.elapsed.duration_ms))
  };
}

function aggregateContextWorkflow(items) {
  return {
    hidden_quality_pass_rate: passRate(items, (item) => item.metrics.hidden_quality_equal),
    context_update_correctness: passRate(items, (item) => item.metrics.context_update_equal),
    controlling_context_recall: median(items.map((item) => item.metrics.candidate_context_recall)),
    selected_source_recall: median(items.map((item) => item.metrics.candidate_selected_source_recall)),
    irrelevant_context_bytes_reduction: median(items.map((item) => item.metrics.irrelevant_context_bytes_reduction)),
    read_round_reduction: median(items.map((item) => item.metrics.read_round_reduction)),
    instruction_bytes_reduction: median(items.map((item) => item.metrics.instruction_bytes_reduction)),
    native_verification_rate: passRate(items, (item) => item.metrics.hard_gates_passed),
    conformance_rate: passRate(items, (item) => item.metrics.conformance_preserved)
  };
}

function aggregateAuthoring(items) {
  return {
    preflight_ready_rate: passRate(items, (item) => item.metrics.hard_gates_passed),
    compile_success_rate: passRate(items, (item) => item.metrics.hard_gates_passed),
    canonical_authority_equivalence: passRate(items, (item) => item.metrics.canonical_authority_equivalent),
    effective_yaml_line_reduction: median(items.map((item) => item.metrics.effective_yaml_line_reduction)),
    median_preflight_round_reduction: median(items.map((item) => item.metrics.preflight_round_reduction)),
    elapsed_reduction: median(items.map((item) => item.metrics.elapsed_reduction))
  };
}

function evaluateThresholds(track, summary, thresholds) {
  const entries = Object.entries(thresholds);
  const failed = entries.filter(([key, value]) => {
    const actual = summary[key];
    return !Number.isFinite(actual) || actual < value;
  });
  return failed.length ? `THRESHOLDS_NOT_MET:${failed.map(([key]) => key).join(",")}` : track === "long-task-authoring" ? "AUTHORING_CANDIDATE_ADMISSIBLE" : "CANDIDATE_ADMISSIBLE_FOR_REVIEW";
}

function interpretation(report) {
  if (!report.compatibility.passed) return "The pair is invalid because fixed run identity differs.";
  if (!report.compatibility.formal_ready) return "The pair is calibration-only because Harness initialization or formal protocol metadata is missing.";
  if (!report.metrics.hard_gates_passed) return "The candidate is not comparable because quality, Context correctness, Compile, or canonical Authority regressed.";
  if (!report.metrics.evidence_sufficient) return "The pair is calibration-only because the required deterministic or host-trace evidence is missing.";
  return "The pair is eligible for aggregation; one pair alone is not enough for an implementation decision.";
}

function passRate(items, predicate) { return items.length ? items.filter(predicate).length / items.length : null; }
function reduction(before, after) { return Number.isFinite(before) && before > 0 && Number.isFinite(after) ? round((before - after) / before) : null; }
function difference(left, right) { return Number.isFinite(left) && Number.isFinite(right) ? round(left - right) : null; }
