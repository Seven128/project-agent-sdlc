import path from "node:path";
import { compareDelegationScores } from "./delegation-compare.mjs";
import {
  collectDelegationSourceIdentity,
  delegationPairSourceIdentityMetrics,
} from "./delegation-source-identity.mjs";
import {
  compareAuthoring,
  compareContextWorkflow,
  interpretation,
} from "./comparison-metrics.mjs";
import { readJson, writeJson } from "./shared.mjs";

export { aggregateComparisons } from "./comparison-aggregate.mjs";

export async function compareMechanismScores(options) {
  const baseline = await readJson(path.resolve(options.baselineScore));
  const candidate = await readJson(path.resolve(options.candidateScore));
  const track = baseline.run.track;
  const currentSourceIdentity =
    track === "long-task-delegation" ? await collectDelegationSourceIdentity() : null;
  const compatibility = pairCompatibility(baseline, candidate, currentSourceIdentity);
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
      provider: baseline.run.provider,
      baseline_commit: baseline.run.baseline_commit,
      fixture_sha256: baseline.run.fixture_sha256,
      experiment_set_sha256: baseline.run.experiment_set_sha256,
      benchmark_inputs_sha256: baseline.run.benchmark_inputs_sha256,
      delegation_admission_policy_sha256:
        baseline.run.delegation_admission_policy_sha256,
      harness_runtime_identity: baseline.run.harness_runtime_identity,
      source_checkout_candidate: baseline.run.source_checkout_candidate,
      baseline_source_checkout_commit: baseline.run.source_checkout_commit,
      candidate_source_checkout_commit: candidate.run.source_checkout_commit,
    },
    compatibility,
    metrics:
      track === "long-task-authoring"
        ? compareAuthoring(baseline, candidate)
        : track === "long-task-delegation"
          ? compareDelegationScores(baseline, candidate)
          : compareContextWorkflow(baseline, candidate),
  };
  report.decision_eligible = compatibility.passed && compatibility.formal_ready && report.metrics.hard_gates_passed && report.metrics.evidence_sufficient;
  report.interpretation = interpretation(report);
  if (options.out) await writeJson(path.resolve(options.out), report);
  return report;
}

function pairCompatibility(left, right, currentSourceIdentity = null) {
  const fields = ["task_id", "track", "pair_id", "replicate", "model", "reasoning", "provider", "baseline_commit", "fixture_sha256", "experiment_set_sha256", "benchmark_inputs_sha256", "delegation_admission_policy_sha256"];
  const mismatches = fields
    .filter((field) => left.run[field] !== right.run[field])
    .map((field) => ({
      field,
      baseline: left.run[field],
      candidate: right.run[field],
    }));
  const roleCorrect = left.run.variant_role === "baseline" && right.run.variant_role === "candidate";
  const formalReady = left.run.protocol_status === "formal" && right.run.protocol_status === "formal" && left.run.harness_initialized === true && right.run.harness_initialized === true;
  if (
    left.run.track === "long-task-delegation" &&
    JSON.stringify(left.run.harness_runtime_identity) !==
      JSON.stringify(right.run.harness_runtime_identity)
  )
    mismatches.push({
      field: "harness_runtime_identity",
      baseline: left.run.harness_runtime_identity,
      candidate: right.run.harness_runtime_identity,
    });
  if (left.run.track !== "long-task-authoring" && left.run.source_checkout_commit !== right.run.source_checkout_commit)
    mismatches.push({
      field: "source_checkout_commit",
      baseline: left.run.source_checkout_commit,
      candidate: right.run.source_checkout_commit,
    });
  let sourceCheckoutCurrent = null;
  if (left.run.track === "long-task-delegation") {
    const sourceIdentity = delegationPairSourceIdentityMetrics(
      left.run.source_checkout_candidate,
      right.run.source_checkout_candidate,
      currentSourceIdentity,
    );
    sourceCheckoutCurrent = sourceIdentity.correct;
    if (!sourceIdentity.pair_match)
      mismatches.push({
        field: "source_checkout_candidate",
        baseline: left.run.source_checkout_candidate,
        candidate: right.run.source_checkout_candidate,
      });
    if (!sourceIdentity.current_match || !sourceIdentity.current_clean)
      mismatches.push({
        field: "source_checkout_candidate_current",
        baseline: left.run.source_checkout_candidate,
        candidate: currentSourceIdentity,
      });
  }
  return {
    passed: mismatches.length === 0 && roleCorrect,
    formal_ready: formalReady,
    role_correct: roleCorrect,
    source_checkout_current: sourceCheckoutCurrent,
    mismatches,
  };
}
