import path from "node:path";
import { validateDelegationTrackPolicySource } from "./delegation-admission-policy.mjs";
import { aggregateDelegationComparisons } from "./delegation-compare.mjs";
import { resolveDelegationGuidance } from "./delegation-guidance.mjs";
import {
  collectDelegationSourceIdentity,
  sameDelegationSourceIdentity,
} from "./delegation-source-identity.mjs";
import {
  aggregateAuthoring,
  aggregateContextWorkflow,
  evaluateThresholds,
  requiredPairs,
} from "./comparison-metrics.mjs";
import {
  loadExperimentSet,
  readJson,
  sha256,
  writeJson,
} from "./shared.mjs";

export async function aggregateComparisons(options) {
  if (!options.scores?.length)
    throw new Error("aggregate requires one or more --score files");
  const comparisons = await Promise.all(
    options.scores.map((file) => readJson(path.resolve(file))),
  );
  assertSharedComparisonIdentity(comparisons);
  const experiments = await loadExperimentSet();
  const track = resolveAggregateTrack(comparisons[0], experiments);
  if (track.id === "long-task-delegation")
    return aggregateDelegation(comparisons, experiments, track, options);
  return aggregateOrdinary(comparisons, track, options);
}

function assertSharedComparisonIdentity(comparisons) {
  const first = comparisons[0];
  const sameTrack = comparisons.every(
    (item) =>
      item.track === first.track &&
      item.task_id === first.task_id &&
      item.baseline_variant === first.baseline_variant &&
      item.candidate_variant === first.candidate_variant,
  );
  if (!sameTrack)
    throw new Error(
      "aggregate inputs must share task, track, baseline, and candidate variants",
    );
  const fixedIdentity = JSON.stringify(first.run_identity);
  if (
    comparisons.some(
      (item) => JSON.stringify(item.run_identity) !== fixedIdentity,
    )
  )
    throw new Error(
      "aggregate inputs must share fixed model, reasoning, fixture, experiment, baseline, and source checkout identity",
    );
  const pairIds = comparisons.map(
    (item) => `${item.pair_id}\0${item.replicate}`,
  );
  if (new Set(pairIds).size !== pairIds.length)
    throw new Error("aggregate inputs must be distinct paired runs");
}

function resolveAggregateTrack(first, experiments) {
  const baseline = experiments.variants?.[first.baseline_variant];
  const candidate = experiments.variants?.[first.candidate_variant];
  const track = baseline ? experiments.tracks?.[baseline.track] : null;
  const valid =
    baseline?.role === "baseline" &&
    candidate?.role === "candidate" &&
    baseline.track === candidate.track &&
    first.track === baseline.track &&
    track?.tasks?.includes(first.task_id) &&
    track.variants?.includes(first.baseline_variant) &&
    track.variants?.includes(first.candidate_variant);
  if (!valid)
    throw new Error(
      "aggregate variants do not match the current experiment track and roles",
    );
  return { id: baseline.track, config: track, candidate };
}

async function aggregateDelegation(comparisons, experiments, track, options) {
  const first = comparisons[0];
  if (first.run_identity.experiment_set_sha256 !== sha256(experiments))
    throw new Error("delegation aggregate experiment set is stale");
  const currentSource = await collectDelegationSourceIdentity();
  if (
    currentSource.working_tree.clean !== true ||
    !sameDelegationSourceIdentity(
      first.run_identity.source_checkout_candidate,
      currentSource,
    )
  )
    throw new Error(
      "delegation aggregate source checkout identity is stale or dirty",
    );
  const resolved = await resolveDelegationGuidance(first.candidate_variant, {
    variantConfig: track.candidate,
  });
  const policy = validateDelegationTrackPolicySource(
    track.config,
    resolved.manifest,
    "examples/delivery-benchmark/mechanism/guidance/long-task-delegation-v1",
  );
  if (
    first.run_identity.delegation_admission_policy_sha256 !==
    resolved.manifest.admission_policy_sha256
  )
    throw new Error("delegation aggregate admission policy is stale");
  return aggregateDelegationComparisons(comparisons, policy, options);
}

async function aggregateOrdinary(comparisons, track, options) {
  const first = comparisons[0];
  const eligible = comparisons.filter((item) => item.decision_eligible);
  const thresholds = track.config.decision_thresholds;
  const summary =
    first.track === "long-task-authoring"
      ? aggregateAuthoring(eligible)
      : aggregateContextWorkflow(eligible);
  const pairRequirement = requiredPairs(
    track.config,
    eligible,
    summary,
    thresholds,
  );
  const enoughPairs = eligible.length >= pairRequirement.minimum;
  const report = {
    schema_version: "tiny-context-mechanism-aggregate-v1",
    aggregated_at: new Date().toISOString(),
    track: first.track,
    task_id: first.task_id,
    baseline_variant: first.baseline_variant,
    candidate_variant: first.candidate_variant,
    pair_count: comparisons.length,
    eligible_pair_count: eligible.length,
    minimum_recommended_pairs: pairRequirement.minimum,
    pair_requirement_reason: pairRequirement.reason,
    thresholds,
    summary,
    decision_eligible: enoughPairs,
    decision: enoughPairs
      ? evaluateThresholds(first.track, summary, thresholds)
      : "INSUFFICIENT_PAIRED_RUNS",
    comparisons,
  };
  if (options.out) await writeJson(path.resolve(options.out), report);
  return report;
}
