import assert from "node:assert/strict";

export function assertDelegationEvidenceStates({
  claimedHostEnvelope,
  unattested,
  fallback,
}) {
  assert.equal(claimedHostEnvelope.pair_eligible, false);
  assert.deepEqual(claimedHostEnvelope.ineligible_reasons, [
    "host_provenance_unverified",
  ]);
  assert.equal(claimedHostEnvelope.provenance.verified, false);
  assert.equal(claimedHostEnvelope.provenance.supplied_claim_matched, true);
  assert.equal(claimedHostEnvelope.policy_conformant, true);
  assert.equal(claimedHostEnvelope.qualifying_packet_count, 2);
  assert.equal(claimedHostEnvelope.effective_profile_verified, false);
  assert.equal(claimedHostEnvelope.effective_profile_claim_matched, true);
  assert.equal(claimedHostEnvelope.effective_parent_verified, false);
  assert.equal(claimedHostEnvelope.effective_parent_claim_matched, true);
  assert.equal(claimedHostEnvelope.host_environment.provider_id, "openai");
  assert.equal(claimedHostEnvelope.host_environment.platform, "win32");
  assert.equal(claimedHostEnvelope.host_environment.arch, "x64");
  assert.equal(
    claimedHostEnvelope.host_environment.parent_effective_service_tier,
    "priority",
  );
  assert.equal(claimedHostEnvelope.host_environment.available_slots, 2);
  assert.equal(claimedHostEnvelope.worker_lifecycle.concurrent_worker_peak, 2);
  assert.equal(claimedHostEnvelope.worker_lifecycle.first_worker_start_ms, 10);
  assert.equal(claimedHostEnvelope.starting_capacity.observed_at_ms, 1);
  assert.equal(claimedHostEnvelope.starting_capacity.delegation_decision_at_ms, 5);
  assert.equal(claimedHostEnvelope.starting_capacity.pre_decision, true);
  assert.equal(claimedHostEnvelope.starting_capacity.decision_precedes_workers, true);
  assert.equal(
    claimedHostEnvelope.service_tier.status,
    "service_tier_inheritance_unverified",
  );
  assert.equal(
    claimedHostEnvelope.service_tier.supplied_claim_status,
    "verified",
  );
  assert.equal(claimedHostEnvelope.host_instability, true);
  assert.equal(claimedHostEnvelope.formal_failure_observed, false);

  assert.equal(unattested.pair_eligible, false);
  assert.ok(unattested.ineligible_reasons.includes("host_provenance_unverified"));
  assert.equal(unattested.provenance.supplied_claim_matched, false);

  assert.equal(fallback.qualifying_predicate_satisfied, false);
  assert.equal(fallback.policy_conformant, true);
  assert.equal(
    fallback.service_tier.status,
    "service_tier_inheritance_unverified",
  );
  assert.equal(
    fallback.host_environment.parent_effective_service_tier,
    "priority",
  );
  assert.deepEqual(fallback.ineligible_reasons, ["host_provenance_unverified"]);
  assert.equal(fallback.formal_failure_observed, false);
}

export async function verifyCompoundFallbackReason(
  parentFallback,
  original,
  evaluate,
) {
  const unavailable = structuredClone(parentFallback);
  delete unavailable.host.capacity.available_slots;
  const accepted = await evaluate(unavailable, true);
  assert.equal(accepted.policy_conformant, true);
  assert.equal(accepted.formal_failure_observed, false);
  assert.ok(accepted.ineligible_reasons.includes("host_capacity_unavailable"));

  const started = structuredClone(unavailable);
  started.host.workers = [structuredClone(original.host.workers[0])];
  started.host.worker_events = [
    structuredClone(original.host.worker_events[0]),
    { ...structuredClone(original.host.worker_events[2]), seq: 2 },
  ];
  started.host.parent_changed_paths = ["context.md", "src/b.mjs", "src/c.mjs"];
  started.costs.child_tokens = 400;
  const rejected = await evaluate(started, true);
  assert.equal(rejected.policy_conformant, false);
  assert.equal(rejected.formal_failure_observed, true);
  assert.ok(
    rejected.formal_failure_reasons.includes(
      "candidate_solo_fallback_spawned_worker",
    ),
  );

  const late = structuredClone(original);
  late.host.workers = [];
  late.host.worker_events = [];
  late.host.parent_changed_paths = ["context.md", "src/a.mjs", "src/b.mjs", "src/c.mjs"];
  late.host.capacity = { available_slots: 1, observed_at_ms: 5 };
  late.costs.child_tokens = 0;
  late.solo_reason_id = "insufficient_host_capacity";
  const lateResult = await evaluate(late, true);
  assert.equal(lateResult.policy_conformant, true);
  assert.equal(lateResult.formal_failure_observed, true);
  assert.ok(lateResult.ineligible_reasons.includes("host_capacity_not_pre_decision"));
}

export async function verifyTierObservationTyping(original, evaluate) {
  const unobserved = structuredClone(original);
  delete unobserved.host.workers[1].effective_service_tier;
  const unverified = await evaluate(unobserved, true);
  assert.equal(
    unverified.service_tier.supplied_claim_status,
    "service_tier_inheritance_unverified",
  );
  assert.equal(unverified.formal_failure_observed, false);

  const invalid = structuredClone(original);
  invalid.host.parent.effective_service_tier = 1;
  for (const worker of invalid.host.workers)
    worker.effective_service_tier = 1;
  const rejected = await evaluate(invalid, true);
  assert.ok(rejected.ineligible_reasons.includes("service_tier_observation_invalid"));
  assert.equal(rejected.formal_failure_observed, true);
}

export async function verifyRejectedDelegationTraces(original, evaluate) {
  for (const [name, mutate, pattern] of rejectedTraceCases()) {
    const value = structuredClone(original);
    mutate(value);
    const result = await evaluate(value, true);
    assert.equal(result.pair_eligible, false, name);
    assert.match(result.ineligible_reasons.join("\n"), pattern, name);
    if (
      [
        "generic child",
        "tier mismatch",
        "mixed tier mismatch",
        "invalid tier type",
        "out of scope",
        "late starting capacity",
      ].includes(name)
    )
      assert.equal(result.formal_failure_observed, true, name);
  }

  const policyFailureTrace = structuredClone(original);
  policyFailureTrace.host.workers.pop();
  const policyFailure = await evaluate(policyFailureTrace, true);
  assert.equal(policyFailure.candidate_binding.bound, true);
  assert.ok(
    policyFailure.ineligible_reasons.includes(
      "candidate_required_multiple_exact_workers",
    ),
  );
}

function rejectedTraceCases() {
  return [
    [
      "generic child",
      (value) => (value.host.workers[0].effective_agent_type = "worker"),
      /effective_agent_type/u,
    ],
    [
      "requested-as-effective",
      (value) => delete value.host.workers[0].effective_model,
      /effective_model/u,
    ],
    [
      "tier override",
      (value) => (value.host.workers[0].requested_service_tier = "priority"),
      /requested_service_tier/u,
    ],
    [
      "tier mismatch",
      (value) => {
        value.host.parent.effective_service_tier = "priority";
        value.host.workers[0].effective_service_tier = "standard";
        value.host.workers[1].effective_service_tier = "priority";
      },
      /service_tier_inheritance_mismatch/u,
    ],
    [
      "mixed tier mismatch",
      (value) => {
        value.host.parent.effective_service_tier = "priority";
        value.host.workers[0].effective_service_tier = "standard";
        delete value.host.workers[1].effective_service_tier;
      },
      /service_tier_inheritance_mismatch/u,
    ],
    [
      "invalid tier type",
      (value) => {
        value.host.parent.effective_service_tier = 1;
        for (const worker of value.host.workers)
          worker.effective_service_tier = 1;
      },
      /service_tier_observation_invalid/u,
    ],
    [
      "out of scope",
      (value) => (value.host.workers[0].changed_paths = ["context.md"]),
      /worker_path_out_of_scope/u,
    ],
    [
      "parent overlap",
      (value) => value.host.parent_changed_paths.push("src/a.mjs"),
      /candidate_parent_mutated_worker_packet/u,
    ],
    [
      "capacity unavailable",
      (value) => delete value.host.capacity.available_slots,
      /host_capacity_unavailable/u,
    ],
    [
      "unsafe capacity number",
      (value) =>
        (value.host.capacity.available_slots = Number.MAX_SAFE_INTEGER + 1),
      /host_capacity_unavailable/u,
    ],
    [
      "late starting capacity",
      (value) => (value.host.capacity.observed_at_ms = 5),
      /host_capacity_not_pre_decision/u,
    ],
    [
      "late delegation decision",
      (value) => (value.host.delegation_decision_at_ms = 10),
      /host_delegation_decision_not_pre_spawn/u,
    ],
    [
      "provider mismatch",
      (value) => (value.host.parent.provider_id = "other-provider"),
      /host_provider_unverified_or_mismatch/u,
    ],
    [
      "platform missing",
      (value) => delete value.host.parent.platform,
      /host_platform_unobserved/u,
    ],
    [
      "nonmonotonic worker timestamps",
      (value) => {
        value.host.worker_events[1].timestamp_ms = 40;
        value.host.worker_events[2].timestamp_ms = 20;
      },
      /worker_event_time_not_monotonic/u,
    ],
    [
      "zero worker tokens",
      (value) => {
        value.host.workers[0].total_tokens = 0;
        value.costs.child_tokens = 400;
      },
      /delegation_costs_unavailable/u,
    ],
    [
      "unsafe total token sum",
      (value) => {
        value.costs.parent_tokens = Number.MAX_SAFE_INTEGER;
      },
      /delegation_costs_unavailable/u,
    ],
    [
      "unsafe worker token sum",
      (value) => {
        value.host.workers[0].total_tokens = Number.MAX_SAFE_INTEGER;
        value.host.workers[1].total_tokens = Number.MAX_SAFE_INTEGER;
        value.costs.child_tokens = Number.MAX_SAFE_INTEGER;
      },
      /delegation_costs_unavailable/u,
    ],
    [
      "fixture identity mismatch",
      (value) => (value.run_identity.fixture_sha256 = "f".repeat(64)),
      /run_identity_mismatch:fixture_sha256/u,
    ],
    [
      "trace rewrites frozen benefit",
      (value) => (value.packets[0].positive_expected_parallel_benefit = false),
      /packet_parallel_benefit_mismatch/u,
    ],
    [
      "trace rewrites frozen safety",
      (value) => (value.packets[0].independently_safe = false),
      /packet_independent_safety_mismatch/u,
    ],
    [
      "missing worker",
      (value) => value.host.workers.pop(),
      /candidate_required_multiple_exact_workers/u,
    ],
    [
      "stale gate",
      (value) => (value.lifecycle.at(-1).head_commit = "0".repeat(40)),
      /final_gate_candidate_mismatch/u,
    ],
  ];
}
