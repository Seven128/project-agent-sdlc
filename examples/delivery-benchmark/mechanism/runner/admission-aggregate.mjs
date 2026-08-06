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
    schema_version: "tiny-context-fresh-agent-pair-v2",
    config_sha256: configSha,
    track,
    pair_id: pair.pair_id,
    replicate: pair.replicate,
    requested_model: pair.requested_model,
    requested_reasoning_effort: pair.requested_reasoning_effort,
    requested_provider: pair.requested_provider,
    fixture_identity: pair.fixture_identity,
    environment_identity: pair.environment_identity,
    candidate_git: pair.candidate_git,
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
    provenance_doubt_reasons: union([
      ...(baseline.trace.provenance_doubt_reasons ?? []),
      ...(candidate.trace.provenance_doubt_reasons ?? []),
      ...(pair.baseline.simple?.trace.provenance_doubt_reasons ?? []),
      ...(pair.candidate.simple?.trace.provenance_doubt_reasons ?? []),
    ]),
  };
  if (track === "dra-semantic-recovery")
    addSimplePath(
      report,
      pair.baseline.simple,
      pair.candidate.simple,
      pair.invocation_order?.simple,
    );
  report.pairwise_win =
    qualityDelta > 0 &&
    criticalRegressions.length === 0 &&
    candidate.score.must_allow_false_blocking === 0 &&
    candidate.score.other_false_blocking <=
      baseline.score.other_false_blocking &&
    (report.simple_path?.candidate_hard_gate_passed ?? true);
  return report;
}

export function aggregateAdmissionPairs(track, reports, config, deterministic) {
  assertPairSet(track, reports);
  const eligible = reports;
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
    eligible.flatMap((item) => item.quality.critical_category_regressions),
  );
  const mustAllow = sum(
    eligible.map((item) => item.quality.candidate_must_allow_false_blocking),
  );
  const baselineOther = sum(
    eligible.map((item) => item.quality.baseline_other_false_blocking),
  );
  const candidateOther = sum(
    eligible.map((item) => item.quality.candidate_other_false_blocking),
  );
  const wins = eligible.filter((item) => item.pairwise_win).length;
  const simple =
    track === "dra-semantic-recovery" ? aggregateSimplePath(eligible) : null;
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
  const doubtfulPairs = reports.filter((item) => item.environment_doubt);
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
      simple.median_token_overhead <=
        config.thresholds.simple_path_max_overhead &&
      simple.median_wall_overhead <=
        config.thresholds.simple_path_max_overhead &&
      simple.candidate_tool_calls === 0);
  let decision = "ADMISSION_THRESHOLDS_NOT_MET";
  if (eligible.length < requiredPairs) decision = "MORE_PAIRS_REQUIRED";
  else if (zeroBaseline)
    decision =
      deterministicPassed && simplePassed && candidateDefects === 0
        ? "ZERO_DEFECT_BASELINE_HARDENING_ONLY"
        : "ZERO_DEFECT_BASELINE_NO_ADMISSION";
  else if (qualityPassed && simplePassed && deterministicPassed)
    decision = doubtfulPairs.length
      ? "ADMISSION_THRESHOLDS_MET_WITH_PROVENANCE_QUALIFICATION"
      : "ADMISSION_THRESHOLDS_MET";
  return {
    schema_version: "tiny-context-fresh-agent-aggregate-v2",
    config_sha256: reports[0].config_sha256,
    track,
    candidate_git: reports[0].candidate_git,
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
    provenance_qualification: {
      status: doubtfulPairs.length ? "unverified" : "verified",
      doubtful_pair_count: doubtfulPairs.length,
      doubt_reasons: union(
        doubtfulPairs.flatMap((item) => item.provenance_doubt_reasons ?? []),
      ),
    },
    simple_path: simple,
    quality_thresholds_passed: qualityPassed,
    simple_path_thresholds_passed: simplePassed,
    decision,
    reports,
  };
}

function addSimplePath(report, baseline, candidate, invocationOrder) {
  if (
    !Array.isArray(invocationOrder) ||
    invocationOrder.length !== 2 ||
    new Set(invocationOrder).size !== 2 ||
    !invocationOrder.includes("baseline") ||
    !invocationOrder.includes("candidate")
  )
    throw new Error("admission_pair_simple_invocation_order_invalid");
  report.simple_path = {
    invocation_order: invocationOrder,
    baseline_hard_gate_passed: baseline.score.hard_gate_passed,
    candidate_hard_gate_passed: candidate.score.hard_gate_passed,
    baseline_tokens: baseline.trace.total_tokens,
    candidate_tokens: candidate.trace.total_tokens,
    token_overhead: ratioDelta(
      candidate.trace.total_tokens,
      baseline.trace.total_tokens,
    ),
    baseline_wall_ms: baseline.trace.duration_ms,
    candidate_wall_ms: candidate.trace.duration_ms,
    wall_overhead: ratioDelta(
      candidate.trace.duration_ms,
      baseline.trace.duration_ms,
    ),
    baseline_tool_calls: baseline.trace.tool_calls,
    candidate_tool_calls: candidate.trace.tool_calls,
  };
  report.environment_doubt ||=
    baseline.trace.environment_doubt || candidate.trace.environment_doubt;
}

function aggregateSimplePath(reports) {
  const tokenOverheads = reports.map((item) => item.simple_path.token_overhead);
  const wallOverheads = reports.map((item) => item.simple_path.wall_overhead);
  const positionStrata = [0, 1].map((position) =>
    aggregatePositionStratum(reports, position),
  );
  return {
    all_candidate_hard_gates_passed: reports.every(
      (item) => item.simple_path.candidate_hard_gate_passed,
    ),
    median_token_overhead: median(
      positionStrata.map((item) => item.token_overhead),
    ),
    median_wall_overhead: median(
      positionStrata.map((item) => item.wall_overhead),
    ),
    raw_pair_median_token_overhead: median(tokenOverheads),
    raw_pair_median_wall_overhead: median(wallOverheads),
    candidate_tool_calls: sum(
      reports.map((item) => item.simple_path.candidate_tool_calls),
    ),
    position_strata: positionStrata,
    token_overheads: tokenOverheads,
    wall_overheads: wallOverheads,
  };
}

function aggregatePositionStratum(reports, position) {
  const metrics = {};
  for (const variant of ["baseline", "candidate"]) {
    const rows = reports.filter(
      (item) => item.simple_path.invocation_order[position] === variant,
    );
    if (!rows.length)
      throw new Error(
        `admission_aggregate_simple_order_coverage_missing:${position}:${variant}`,
      );
    metrics[variant] = {
      count: rows.length,
      tokens: median(rows.map((item) => item.simple_path[`${variant}_tokens`])),
      wall_ms: median(
        rows.map((item) => item.simple_path[`${variant}_wall_ms`]),
      ),
    };
  }
  return {
    position: position + 1,
    baseline_count: metrics.baseline.count,
    candidate_count: metrics.candidate.count,
    baseline_median_tokens: metrics.baseline.tokens,
    candidate_median_tokens: metrics.candidate.tokens,
    token_overhead: ratioDelta(
      metrics.candidate.tokens,
      metrics.baseline.tokens,
    ),
    baseline_median_wall_ms: metrics.baseline.wall_ms,
    candidate_median_wall_ms: metrics.candidate.wall_ms,
    wall_overhead: ratioDelta(
      metrics.candidate.wall_ms,
      metrics.baseline.wall_ms,
    ),
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
    requested_execution: invocation.trace.requested_execution,
    effective_execution: invocation.trace.effective_execution,
    provenance_doubt_reasons: invocation.trace.provenance_doubt_reasons,
  };
}

function categoryRegressions(baseline, candidate) {
  return Object.keys(candidate).filter(
    (key) => candidate[key] > (baseline[key] ?? 0),
  );
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function union(values) {
  return [...new Set(values)].sort();
}

function assertPairSet(track, reports) {
  if (!reports.length) throw new Error("admission_aggregate_requires_pairs");
  if (reports.some((item) => item.track !== track))
    throw new Error("admission_aggregate_track_mismatch");
  const identities = reports.map(
    (item) => `${item.pair_id}\0${item.replicate}`,
  );
  if (new Set(identities).size !== identities.length)
    throw new Error("admission_aggregate_duplicate_pair");
  if (new Set(reports.map((item) => item.replicate)).size !== reports.length)
    throw new Error("admission_aggregate_duplicate_replicate");
  const first = fixedIdentity(reports[0]);
  for (const item of reports)
    if (fixedIdentity(item) !== first)
      throw new Error("admission_aggregate_fixed_identity_mismatch");
}

function fixedIdentity(report) {
  return JSON.stringify({
    config: report.config_sha256,
    model: report.requested_model,
    reasoning: report.requested_reasoning_effort,
    provider: report.requested_provider,
    fixture: report.fixture_identity,
    environment: report.environment_identity,
    candidate_git: report.candidate_git,
  });
}
