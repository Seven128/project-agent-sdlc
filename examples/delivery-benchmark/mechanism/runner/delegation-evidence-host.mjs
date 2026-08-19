import { requireValue, serviceTierStatus } from "./delegation-evidence-validation.mjs";
import { validateWorkerEvents } from "./delegation-evidence-worker-events.mjs";

const HOST_CAPABILITIES = [
  "hook_guard",
  "effective_execution",
  "capacity",
  "actor_mutations",
  "lifecycle",
  "costs",
];

const ADMISSION_BOUNDARY = Object.freeze({
  status: "trusted_host_integration_unavailable",
  trusted_host_channel: "unavailable",
  exact_attempt_set_attestation: "unavailable",
  comparison_recomputation: "unavailable",
  promotion_admission_available: false,
});

export function delegationAdmissionBoundary() {
  return { ...ADMISSION_BOUNDARY };
}

export function classifyHostProvenance(value, traceDigest) {
  const capabilities = new Set(value?.capabilities ?? []);
  const suppliedClaimMatched =
    value?.kind === "host_owned_delegation_trace_v1" &&
    value.trace_sha256 === traceDigest &&
    HOST_CAPABILITIES.every((item) => capabilities.has(item));

  // A repository or caller-supplied object cannot attest its own host origin.
  // A future host integration must expose a separate trusted channel and a new
  // adapter instead of weakening this classification.
  return {
    verified: false,
    status: "host_provenance_unverified",
    independent_channel: "unavailable",
    supplied_claim_matched: suppliedClaimMatched,
  };
}

export function validateHostObservations(host, guidance, expectedParent, issues) {
  const expectedProfile = validateExpectedProfile(
    guidance?.profile_expectation,
    issues,
  );
  const profileAvailable = validateProfileObservation(
    host?.profile,
    guidance?.profile_content_sha256,
    issues,
  );
  const { availableSlots, capacityObserved, observedAtMs } =
    validateCapacityObservation(host?.capacity, issues);
  const workers = Array.isArray(host?.workers) ? host.workers : [];
  validateGuardProbe(host?.guard_probe, profileAvailable, issues);
  const effectiveIssues = validateEffectiveWorkers(workers, expectedProfile);
  issues.push(...effectiveIssues);
  const tier = serviceTierStatus(host?.parent, workers);
  const hostEnvironment = validateHostEnvironment(host?.parent, expectedParent, {
    availableSlots: capacityObserved ? availableSlots : null,
    tier,
  }, issues);
  requireValue(
    profileAvailable || workers.length === 0,
    "worker_started_with_unavailable_profile",
    issues,
  );

  const workerLifecycle = validateWorkerEvents(
    host?.worker_events,
    workers,
    expectedProfile.agent_type,
    issues,
  );
  const startingCapacity = validateStartingCapacity(
    capacityObserved,
    observedAtMs,
    host?.delegation_decision_at_ms,
    workers,
    workerLifecycle,
    issues,
  );
  if (tier.status === "mismatch")
    issues.push("service_tier_inheritance_mismatch");
  if (tier.status === "invalid")
    issues.push("service_tier_observation_invalid");

  return {
    profileAvailable,
    availableSlots,
    capacityObserved,
    workers,
    effectiveIssues,
    workerLifecycle,
    tier,
    hostEnvironment,
    startingCapacity,
    effectiveParentClaimMatched: hostEnvironment.claim_matched,
  };
}

function validateExpectedProfile(expected, issues) {
  const value = expected ?? {};
  requireValue(
    nonEmpty(value.agent_type) &&
      nonEmpty(value.model) &&
      nonEmpty(value.model_reasoning_effort) &&
      value.child_agents_enabled === false &&
      value.service_tier_override === false &&
      value.unobservable_tier_status ===
        "service_tier_inheritance_unverified",
    "expected_profile_identity_unavailable",
    issues,
  );
  return value;
}

function validateProfileObservation(profile, expectedDigest, issues) {
  const available = profile?.available === true;
  requireValue(
    typeof profile?.available === "boolean",
    "host_profile_availability_unobserved",
    issues,
  );
  const identityMatched =
    profile?.status === "available" &&
    profile.content_sha256 === expectedDigest;
  const unavailableReasonObserved =
    nonEmpty(profile?.status) && profile.status !== "available";
  requireValue(
    available ? identityMatched : unavailableReasonObserved,
    available
      ? "host_profile_identity_mismatch"
      : "host_profile_unavailable_reason_missing",
    issues,
  );
  return available;
}

function validateCapacityObservation(capacity, issues) {
  const availableSlots = capacity?.available_slots;
  const capacityObserved =
    Number.isSafeInteger(availableSlots) &&
    availableSlots >= 0 &&
    Number.isSafeInteger(capacity?.observed_at_ms) &&
    capacity.observed_at_ms >= 0;
  requireValue(capacityObserved, "host_capacity_unavailable", issues);
  return {
    availableSlots,
    capacityObserved,
    observedAtMs: capacityObserved ? capacity.observed_at_ms : null,
  };
}

function validateStartingCapacity(
  capacityObserved,
  observedAtMs,
  decisionAtMs,
  workers,
  workerLifecycle,
  issues,
) {
  const decisionObserved =
    Number.isSafeInteger(decisionAtMs) && decisionAtMs >= 0;
  requireValue(
    decisionObserved,
    "host_delegation_decision_time_unavailable",
    issues,
  );
  const preDecision =
    capacityObserved && decisionObserved && observedAtMs < decisionAtMs;
  if (capacityObserved)
    requireValue(preDecision, "host_capacity_not_pre_decision", issues);
  const decisionPrecedesWorkers =
    workers.length === 0 ||
    (decisionObserved &&
      Number.isSafeInteger(workerLifecycle.first_worker_start_ms) &&
      decisionAtMs < workerLifecycle.first_worker_start_ms);
  if (workers.length > 0)
    requireValue(
      decisionPrecedesWorkers,
      "host_delegation_decision_not_pre_spawn",
      issues,
    );
  return {
    observed_at_ms: capacityObserved ? observedAtMs : null,
    delegation_decision_at_ms: decisionObserved ? decisionAtMs : null,
    pre_decision: preDecision,
    decision_precedes_workers: decisionPrecedesWorkers,
  };
}

function validateGuardProbe(probe, profileAvailable, issues) {
  requireValue(
    probe?.generic_spawn_denied === true &&
      probe?.exact_spawn_allowed === profileAvailable,
    "host_hook_guard_unverified",
    issues,
  );
}

function validateHostEnvironment(parent, expected, observations, issues) {
  const checks = hostEnvironmentChecks(parent, expected);
  for (const [matched, reason] of checks)
    requireValue(matched, reason, issues);
  return hostEnvironmentProjection(
    parent,
    observations,
    checks.every(([matched]) => matched),
  );
}

function hostEnvironmentChecks(parent, expected) {
  return [
    [
      parent?.effective_model === expected.model,
      "parent_effective_model_unverified_or_mismatch",
    ],
    [
      parent?.effective_reasoning_effort === expected.reasoning,
      "parent_effective_reasoning_unverified_or_mismatch",
    ],
    [
      parent?.provider_id === expected.provider,
      "host_provider_unverified_or_mismatch",
    ],
    [nonEmpty(parent?.host_version), "host_version_unobserved"],
    [nonEmpty(parent?.platform), "host_platform_unobserved"],
    [nonEmpty(parent?.arch), "host_arch_unobserved"],
  ];
}

function hostEnvironmentProjection(parent, observations, claimMatched) {
  return {
    claim_matched: claimMatched,
    provider_id: parent?.provider_id ?? null,
    host_version: parent?.host_version ?? null,
    platform: parent?.platform ?? null,
    arch: parent?.arch ?? null,
    parent_effective_model: parent?.effective_model ?? null,
    parent_effective_reasoning_effort:
      parent?.effective_reasoning_effort ?? null,
    parent_effective_service_tier: parent?.effective_service_tier ?? null,
    available_slots: observations.availableSlots,
  };
}

function nonEmpty(value) {
  return typeof value === "string" && value.length > 0;
}

function validateEffectiveWorkers(workers, expected) {
  const issues = [];
  for (const worker of workers) {
    const actor = worker.actor_id ?? "unknown";
    requireValue(
      worker.requested_agent_type === expected.agent_type,
      `requested_agent_type_mismatch:${actor}`,
      issues,
    );
    requireValue(
      !Object.hasOwn(worker, "requested_service_tier"),
      `requested_service_tier_forbidden:${actor}`,
      issues,
    );
    requireValue(
      worker.effective_agent_type === expected.agent_type,
      `effective_agent_type_unverified_or_mismatch:${actor}`,
      issues,
    );
    requireValue(
      worker.effective_model === expected.model,
      `effective_model_unverified_or_mismatch:${actor}`,
      issues,
    );
    requireValue(
      worker.effective_reasoning_effort === expected.model_reasoning_effort,
      `effective_reasoning_unverified_or_mismatch:${actor}`,
      issues,
    );
  }
  return issues;
}
