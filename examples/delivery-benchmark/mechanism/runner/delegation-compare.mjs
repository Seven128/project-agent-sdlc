import { delegationAdmissionBoundary } from "./delegation-evidence-host.mjs";

export { aggregateDelegationComparisons } from "./delegation-aggregate.mjs";

export function compareDelegationScores(baseline, candidate) {
  const admissionBoundary = delegationAdmissionBoundary();
  const b = baseline.metrics;
  const c = candidate.metrics;
  const compatibility = delegationCompatibility(baseline, candidate);
  const quality = delegationQuality(b, c);
  const costs = delegationCostComparison(
    b.delegation.costs,
    c.delegation.costs,
  );
  const hardGatesPassed = delegationHardGates(
    b,
    c,
    compatibility,
    quality,
  );
  const suppliedFormalFailure =
    b.delegation.formal_failure_observed === true ||
    c.delegation.formal_failure_observed === true ||
    !b.hard_gate_passed ||
    !c.hard_gate_passed ||
    c.delegation.policy_conformant !== true ||
    !quality.final_gate_accepted ||
    !quality.must_allow_preserved ||
    quality.critical_or_major_regression;
  const observation = delegationObservation(
    admissionBoundary,
    b,
    c,
    compatibility,
    suppliedFormalFailure,
  );
  return {
    hard_gates_passed: hardGatesPassed,
    evidence_sufficient: observation.evidence_sufficient,
    independent_host_provenance_verified:
      observation.trusted_attempt_observed,
    pair_comparable: observation.pair_comparable,
    guidance_identity_compatible: compatibility.guidance,
    benchmark_inputs_compatible: compatibility.benchmark_inputs,
    harness_identity_compatible: compatibility.harness_identity,
    run_inputs_compatible: compatibility.run_inputs,
    host_environment_compatible: compatibility.host_environment,
    host_environment: {
      baseline: b.delegation.host_environment ?? null,
      candidate: c.delegation.host_environment ?? null,
    },
    supplied_formal_failure: suppliedFormalFailure,
    observed_formal_failure: observation.observed_formal_failure,
    hidden_quality_equal:
      b.hidden_quality.passed === c.hidden_quality.passed &&
      b.hidden_quality.total === c.hidden_quality.total,
    context_update_equal: b.context_update.correct && c.context_update.correct,
    ...quality,
    baseline_worker_count: b.delegation.observed_worker_count,
    candidate_worker_count: c.delegation.observed_worker_count,
    candidate_policy_conformant: c.delegation.policy_conformant === true,
    ...costs,
    service_tier: {
      baseline: b.delegation.service_tier.status,
      candidate: c.delegation.service_tier.status,
    },
    host_instability:
      b.delegation.host_instability === true ||
      c.delegation.host_instability === true ||
      !compatibility.host_environment,
    admission_boundary: admissionBoundary,
  };
}

function delegationCompatibility(baseline, candidate) {
  const b = baseline.metrics;
  const c = candidate.metrics;
  const baselineGuidance = baseline.run.workflow_guidance_source ?? {};
  const candidateGuidance = candidate.run.workflow_guidance_source ?? {};
  return {
    guidance:
      b.delegation_guidance?.correct === true &&
      c.delegation_guidance?.correct === true &&
      sameGuidance(baselineGuidance, candidateGuidance),
    benchmark_inputs:
      b.delegation_inputs?.correct === true &&
      c.delegation_inputs?.correct === true &&
      sameJson(baseline.run.benchmark_inputs, candidate.run.benchmark_inputs),
    harness_identity:
      b.delegation_harness_identity?.correct === true &&
      c.delegation_harness_identity?.correct === true &&
      sameJson(
        baseline.run.harness_runtime_identity,
        candidate.run.harness_runtime_identity,
      ),
    run_inputs:
      b.delegation_run_inputs?.correct === true &&
      c.delegation_run_inputs?.correct === true,
    host_environment:
      sameJson(
        b.delegation.host_environment,
        c.delegation.host_environment,
      ) &&
      b.delegation.effective_parent_claim_matched === true &&
      c.delegation.effective_parent_claim_matched === true,
  };
}

function delegationQuality(b, c) {
  const qualityObserved = [b, c].every(
    (item) => item.delegation_quality?.classification_complete === true,
  );
  const mustAllowPreserved =
    qualityObserved &&
    b.delegation_quality.must_allow_failure_count === 0 &&
    c.delegation_quality.must_allow_failure_count === 0;
  const criticalOrMajorRegression =
    !qualityObserved ||
    c.delegation_quality.critical_defect_count >
      b.delegation_quality.critical_defect_count ||
    c.delegation_quality.major_defect_count >
      b.delegation_quality.major_defect_count;
  return {
    final_gate_accepted: [b, c].every(
      (item) =>
        item.delegation.lifecycle?.final_gate_status === "machine_accepted",
    ),
    must_allow_preserved: mustAllowPreserved,
    critical_or_major_regression: criticalOrMajorRegression,
    defect_counts: {
      baseline: defectCounts(b),
      candidate: defectCounts(c),
    },
  };
}

function delegationHardGates(b, c, compatibility, quality) {
  return (
    b.hard_gate_passed &&
    c.hard_gate_passed &&
    Object.values(compatibility).every(Boolean) &&
    c.delegation.policy_conformant === true &&
    quality.final_gate_accepted &&
    quality.must_allow_preserved &&
    !quality.critical_or_major_regression &&
    b.hidden_quality.decision === "PASS" &&
    c.hidden_quality.decision === "PASS"
  );
}

function delegationObservation(boundary, b, c, compatibility, formalFailure) {
  const trustedAttemptObserved =
    boundary.promotion_admission_available === true &&
    [b, c].every(
      (item) =>
        item.delegation.available === true &&
        item.delegation.provenance?.verified === true,
    );
  const pairComparable = Object.values(compatibility).every(Boolean);
  const evidenceSufficient =
    trustedAttemptObserved &&
    pairComparable &&
    [b, c].every(
      (item) =>
        item.delegation.run_identity_bound === true &&
        item.delegation.candidate_binding?.bound === true &&
        item.delegation.pair_eligible === true,
    );
  return {
    trusted_attempt_observed: trustedAttemptObserved,
    pair_comparable: pairComparable,
    evidence_sufficient: evidenceSufficient,
    observed_formal_failure: trustedAttemptObserved && formalFailure,
  };
}

function delegationCostComparison(before, after) {
  const totalCost = compareTotalCostVector(before, after);
  const wallReduction = reduction(before?.wall_time_ms, after?.wall_time_ms);
  const parentTokenReduction = reduction(
    before?.parent_tokens,
    after?.parent_tokens,
  );
  const primaryImprovement = Math.max(
    finiteOrNegative(wallReduction),
    finiteOrNegative(parentTokenReduction),
  );
  return {
    wall_time_reduction: wallReduction,
    parent_token_reduction: parentTokenReduction,
    total_token_reduction: reduction(
      before?.total_tokens,
      after?.total_tokens,
    ),
    tool_turn_reduction: reduction(before?.tool_turns, after?.tool_turns),
    check_turn_reduction: reduction(before?.check_turns, after?.check_turns),
    integration_rework_reduction: difference(
      before?.integration_rework,
      after?.integration_rework,
    ),
    compaction_reduction: difference(before?.compactions, after?.compactions),
    primary_improvement: Number.isFinite(primaryImprovement)
      ? primaryImprovement
      : null,
    total_cost: totalCost,
  };
}

function sameGuidance(left, right) {
  return (
    left.candidate_promotion_content_bundle_sha256 ===
      right.candidate_promotion_content_bundle_sha256 &&
    left.guidance_provenance_sha256 === right.guidance_provenance_sha256 &&
    left.profile_content_sha256 === right.profile_content_sha256 &&
    sameJson(left.profile_expectation, right.profile_expectation) &&
    left.hook_content_sha256 === right.hook_content_sha256
  );
}

function defectCounts(metrics) {
  return {
    critical: metrics.delegation_quality.critical_defect_count,
    major: metrics.delegation_quality.major_defect_count,
    must_allow: metrics.delegation_quality.must_allow_failure_count,
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function compareTotalCostVector(before, after) {
  if (!before || !after) return { status: "unavailable" };
  const diagnosticKeys = ["parent_tokens", "child_tokens"];
  const gateKeys = [
    "wall_time_ms",
    "total_tokens",
    "tool_turns",
    "check_turns",
    "compactions",
    "integration_rework",
  ];
  const deltas = Object.fromEntries([
    ...diagnosticKeys.map((key) => [key, after[key] - before[key]]),
    ["wall_time_ms", after.wall_time_ms - before.wall_time_ms],
    ["total_tokens", after.total_tokens - before.total_tokens],
    ...gateKeys.slice(2).map((key) => [key, after[key] - before[key]]),
  ]);
  const values = gateKeys.map((key) => deltas[key]);
  return {
    status: values.every((value) => value <= 0)
      ? "candidate_no_worse"
      : values.every((value) => value >= 0)
        ? "candidate_worse"
        : "mixed_units_owner_review_required",
    deltas,
  };
}

function reduction(before, after) {
  return Number.isFinite(before) && before > 0 && Number.isFinite(after)
    ? (before - after) / before
    : null;
}

function difference(before, after) {
  return Number.isFinite(before) && Number.isFinite(after)
    ? before - after
    : null;
}

function finiteOrNegative(value) {
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}
