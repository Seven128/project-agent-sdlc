import { coefficientOfVariation } from "./admission-shared.mjs";

export function pairExpansion(reports, reduction, simple, policy) {
  if (reports.length < policy.minimum_pairs)
    return { required_pairs: policy.minimum_pairs, reasons: ["minimum"] };
  const reasons = expansionReasons(reports, reduction, simple, policy);
  if (reports.length > policy.minimum_pairs)
    return {
      required_pairs: policy.expanded_pairs,
      reasons: reasons.length ? reasons : ["expanded-sample-set"],
    };
  return {
    required_pairs: reasons.length
      ? policy.expanded_pairs
      : policy.minimum_pairs,
    reasons: reasons.length ? reasons : ["base-sufficient"],
  };
}

function expansionReasons(reports, reduction, simple, policy) {
  const reasons = [];
  const qualityDeltas = reports.map(
    (item) => item.quality.targeted_defect_delta,
  );
  if (
    qualityDeltas.some((value) => value > 0) &&
    qualityDeltas.some((value) => value < 0)
  )
    reasons.push("pairwise-direction-inconsistent");
  for (const [name, values] of rawCvMetrics(reports)) {
    const cv = coefficientOfVariation(values);
    if (cv !== null && cv > policy.cv_threshold)
      reasons.push(`cv>${policy.cv_threshold}:${name}:${cv.toFixed(4)}`);
  }
  if (
    reduction !== null &&
    Math.abs(reduction - policy.quality_threshold) < policy.near_threshold_margin
  )
    reasons.push("near-threshold:targeted-defect-reduction");
  for (const [name, value] of simpleThresholdMetrics(simple))
    if (
      value !== null &&
      Math.abs(value - policy.simple_cost_threshold) <
        policy.near_threshold_margin
    )
      reasons.push(`near-threshold:${name}`);
  if (reports.some((item) => item.environment_doubt))
    reasons.push("environment-or-provider-trace-doubt");
  return reasons;
}

function rawCvMetrics(reports) {
  const values = [
    ["baseline-quality-wall", reports.map((item) => item.baseline.quality.wall_ms)],
    ["candidate-quality-wall", reports.map((item) => item.candidate.quality.wall_ms)],
    ["baseline-quality-tokens", reports.map((item) => item.baseline.quality.tokens)],
    ["candidate-quality-tokens", reports.map((item) => item.candidate.quality.tokens)],
  ];
  if (reports[0]?.simple_path)
    values.push(
      ["baseline-simple-wall", reports.map((item) => item.simple_path.baseline_wall_ms)],
      ["candidate-simple-wall", reports.map((item) => item.simple_path.candidate_wall_ms)],
      ["baseline-simple-tokens", reports.map((item) => item.simple_path.baseline_tokens)],
      ["candidate-simple-tokens", reports.map((item) => item.simple_path.candidate_tokens)],
    );
  return values;
}

function simpleThresholdMetrics(simple) {
  return simple
    ? [
        ["token-overhead", simple.median_token_overhead],
        ["wall-overhead", simple.median_wall_overhead],
      ]
    : [];
}
