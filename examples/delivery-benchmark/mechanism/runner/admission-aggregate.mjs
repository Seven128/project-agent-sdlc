import { pairExpansion } from "./admission-expansion.mjs";
import { median, ratioDelta } from "./admission-shared.mjs";
export function compareAdmissionPair(track, pair, configSha) {
  const baseline = pair.baseline.quality;
  const candidate = pair.candidate.quality;
  const criticalRegressions = categoryRegressions(
    baseline.score.critical_categories,
    candidate.score.critical_categories,
  );
  const qualityDelta =
    baseline.score.targeted_defects - candidate.score.targeted_defects;
  const report = {
    schema_version: "tiny-context-fresh-agent-pair-v1",
    config_sha256: configSha,
    track,
    pair_id: pair.pair_id,
    replicate: pair.replicate,
    model: pair.model,
    reasoning_effort: pair.reasoning_effort,
    fixture_identity: pair.fixture_identity,
    environment_identity: pair.environment_identity,
    baseline: summarizeVariant(pair.baseline),
    candidate: summarizeVariant(pair.candidate),
    quality: {
      baseline_targeted_defects: baseline.score.targeted_defects,
      candidate_targeted_defects: candidate.score.targeted_defects,
      targeted_defect_delta: qualityDelta,
      targeted_defect_reduction:
        baseline.score.targeted_defects > 0
          ? qualityDelta / baseline.score.targeted_defects
          : null,
      quality_win: qualityDelta > 0,
      critical_category_regressions: criticalRegressions,
      candidate_must_allow_false_blocking:
        candidate.score.must_allow_false_blocking,
      baseline_other_false_blocking: baseline.score.other_false_blocking,
      candidate_other_false_blocking: candidate.score.other_false_blocking,
    },
    environment_doubt:
      baseline.trace.environment_doubt || candidate.trace.environment_doubt,
  };
  if (track === "dra-semantic-recovery")
    addSimplePath(report, pair.baseline.simple, pair.candidate.simple);
  report.pairwise_win =
    qualityDelta > 0 &&
    criticalRegressions.length === 0 &&
    candidate.score.must_allow_false_blocking === 0 &&
    candidate.score.other_false_blocking <= baseline.score.other_false_blocking &&
    (report.simple_path?.candidate_hard_gate_passed ?? true);
  return report;
}

export function aggregateAdmissionPairs(
  track,
  reports,
  config,
  deterministic,
) {
  assertPairSet(track, reports);
  const eligible = reports.filter((item) => !item.environment_doubt);
  const baselineDefects = sum(
    eligible.map((item) => item.quality.baseline_targeted_defects),
  );
  const candidateDefects = sum(
    eligible.map((item) => item.quality.candidate_targeted_defects),
  );
  const reduction =
    baselineDefects > 0
      ? (baselineDefects - candidateDefects) / baselineDefects
      : null;
  const criticalRegressions = union(
    eligible.flatMap(
      (item) => item.quality.critical_category_regressions,
    ),
  );
  const mustAllow = sum(
    eligible.map(
      (item) => item.quality.candidate_must_allow_false_blocking,
    ),
  );
  const baselineOther = sum(
    eligible.map((item) => item.quality.baseline_other_false_blocking),
  );
  const candidateOther = sum(
    eligible.map((item) => item.quality.candidate_other_false_blocking),
  );
  const wins = eligible.filter((item) => item.pairwise_win).length;
  const simple =
    track === "dra-semantic-recovery"
      ? aggregateSimplePath(eligible)
      : null;
  const expansion = pairExpansion(
    reports,
    reduction,
    simple,
    config.pair_policy,
  );
  const requiredPairs = expansion.required_pairs;
  const winsRequired =
    requiredPairs === config.pair_policy.expanded_pairs
      ? config.pair_policy.expanded_wins
      : config.pair_policy.minimum_wins;
  const deterministicPassed = deterministic?.tracks?.[track]?.passed === true;
  const zeroBaseline = baselineDefects === 0;
  const qualityPassed =
    !zeroBaseline &&
    reduction >= config.thresholds.targeted_defect_reduction &&
    criticalRegressions.length === 0 &&
    mustAllow === 0 &&
    candidateOther <= baselineOther &&
    wins >= winsRequired;
  const simplePassed =
    !simple ||
    (simple.all_candidate_hard_gates_passed &&
      simple.median_token_overhead <= config.thresholds.simple_path_max_overhead &&
      simple.median_wall_overhead <= config.thresholds.simple_path_max_overhead &&
      simple.candidate_tool_calls === 0);
  let decision = "ADMISSION_THRESHOLDS_NOT_MET";
  if (eligible.length < requiredPairs) decision = "MORE_PAIRS_REQUIRED";
  else if (zeroBaseline)
    decision =
      deterministicPassed && simplePassed && candidateDefects === 0
        ? "ZERO_DEFECT_BASELINE_HARDENING_ONLY"
        : "ZERO_DEFECT_BASELINE_NO_ADMISSION";
  else if (qualityPassed && simplePassed && deterministicPassed)
    decision = "ADMISSION_THRESHOLDS_MET";
  return {
    schema_version: "tiny-context-fresh-agent-aggregate-v1",
    track,
    pair_count: reports.length,
    eligible_pair_count: eligible.length,
    required_pairs: requiredPairs,
    expansion_reasons: expansion.reasons,
    pairwise_wins: wins,
    pairwise_wins_required: winsRequired,
    baseline_targeted_defects: baselineDefects,
    candidate_targeted_defects: candidateDefects,
    targeted_defect_reduction: reduction,
    zero_defect_baseline: zeroBaseline,
    critical_category_regressions: criticalRegressions,
    candidate_must_allow_false_blocking: mustAllow,
    baseline_other_false_blocking: baselineOther,
    candidate_other_false_blocking: candidateOther,
    deterministic_hard_gates_passed: deterministicPassed,
    simple_path: simple,
    quality_thresholds_passed: qualityPassed,
    simple_path_thresholds_passed: simplePassed,
    decision,
    reports,
  };
}

function addSimplePath(report, baseline, candidate) {
  report.simple_path = {
    baseline_hard_gate_passed: baseline.score.hard_gate_passed,
    candidate_hard_gate_passed: candidate.score.hard_gate_passed,
    baseline_tokens: baseline.trace.total_tokens,
    candidate_tokens: candidate.trace.total_tokens,
    token_overhead: ratioDelta(candidate.trace.total_tokens, baseline.trace.total_tokens),
    baseline_wall_ms: baseline.trace.duration_ms,
    candidate_wall_ms: candidate.trace.duration_ms,
    wall_overhead: ratioDelta(candidate.trace.duration_ms, baseline.trace.duration_ms),
    baseline_tool_calls: baseline.trace.tool_calls,
    candidate_tool_calls: candidate.trace.tool_calls,
  };
  report.environment_doubt ||=
    baseline.trace.environment_doubt || candidate.trace.environment_doubt;
}

function aggregateSimplePath(reports) {
  const tokenOverheads = reports.map((item) => item.simple_path.token_overhead);
  const wallOverheads = reports.map((item) => item.simple_path.wall_overhead);
  return {
    all_candidate_hard_gates_passed: reports.every(
      (item) => item.simple_path.candidate_hard_gate_passed,
    ),
    median_token_overhead: median(tokenOverheads),
    median_wall_overhead: median(wallOverheads),
    candidate_tool_calls: sum(
      reports.map((item) => item.simple_path.candidate_tool_calls),
    ),
    token_overheads: tokenOverheads,
    wall_overheads: wallOverheads,
  };
}

function summarizeVariant(variant) {
  const result = { quality: summarizeInvocation(variant.quality) };
  if (variant.simple) result.simple = summarizeInvocation(variant.simple);
  return result;
}

function summarizeInvocation(invocation) {
  return {
    score: invocation.score,
    wall_ms: invocation.trace.duration_ms,
    tokens: invocation.trace.total_tokens,
    tool_calls: invocation.trace.tool_calls,
    trace_identity: invocation.trace.trace_identity,
  };
}

function categoryRegressions(baseline, candidate) {
  return Object.keys(candidate).filter(
    (key) => candidate[key] > (baseline[key] ?? 0),
  );
}

function sum(values) { return values.reduce((total, value) => total + value, 0); }

function union(values) {
  return [...new Set(values)].sort();
}

function assertPairSet(track, reports) {
  if (!reports.length) throw new Error("admission_aggregate_requires_pairs");
  if (reports.some((item) => item.track !== track))
    throw new Error("admission_aggregate_track_mismatch");
  const identities = reports.map((item) => `${item.pair_id}\0${item.replicate}`);
  if (new Set(identities).size !== identities.length)
    throw new Error("admission_aggregate_duplicate_pair");
  const first = fixedIdentity(reports[0]);
  for (const item of reports)
    if (fixedIdentity(item) !== first)
      throw new Error("admission_aggregate_fixed_identity_mismatch");
}

function fixedIdentity(report) {
  return JSON.stringify({
    config: report.config_sha256,
    model: report.model,
    reasoning: report.reasoning_effort,
    fixture: report.fixture_identity,
    environment: report.environment_identity,
  });
}
