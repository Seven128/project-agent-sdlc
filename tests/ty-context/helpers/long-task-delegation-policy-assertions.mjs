import assert from "node:assert/strict";

export async function verifySoloFallbackWorkerFailures(original, gold, evaluate) {
  for (const [reason, mutate] of soloFallbackWorkerCases()) {
    const value = structuredClone(original);
    const inputGold = structuredClone(gold);
    configureOneWorker(value, "a", "src/a.mjs");
    mutate(value, inputGold);
    value.solo_reason_id = reason;
    const result = await evaluate(value, true, { gold: inputGold });
    assert.equal(result.qualifying_predicate_satisfied, false, reason);
    assert.equal(result.policy_conformant, false, reason);
    assert.equal(result.formal_failure_observed, true, reason);
    assert.ok(
      result.formal_failure_reasons.includes(
        "candidate_solo_fallback_spawned_worker",
      ),
      reason,
    );
  }
}

export async function verifyBaselineWorkerPacketSelection(
  original,
  gold,
  metadata,
  evaluate,
) {
  const baselineMetadata = {
    ...metadata,
    variant_id: "long-task-delegation-conditional",
    variant_role: "baseline",
  };
  const valid = baselineTrace(original, baselineMetadata);
  configureOneWorker(valid, "a", "src/a.mjs");
  const validResult = await evaluate(valid, true, { metadata: baselineMetadata });
  assert.equal(validResult.policy_conformant, true);
  assert.equal(validResult.formal_failure_observed, false);

  const invalid = baselineTrace(original, baselineMetadata);
  configureOneWorker(invalid, "c", "src/c.mjs");
  const invalidResult = await evaluate(invalid, true, {
    metadata: baselineMetadata,
    gold,
  });
  assert.equal(invalidResult.policy_conformant, false);
  assert.equal(invalidResult.formal_failure_observed, true);
  assert.ok(
    invalidResult.formal_failure_reasons.includes(
      "delegated_worker_packet_selection_invalid",
    ),
  );
}

function soloFallbackWorkerCases() {
  return [
    [
      "insufficient_qualifying_packets",
      (value, gold) => {
        value.packets[1].independently_safe = false;
        gold.delegation_packets[1].independently_safe = false;
      },
    ],
    [
      "exact_profile_unavailable",
      (value) => {
        value.host.profile = {
          available: false,
          status: "installed_profile_missing",
        };
        value.host.guard_probe.exact_spawn_allowed = false;
      },
    ],
    [
      "insufficient_host_capacity",
      (value) => (value.host.capacity.available_slots = 1),
    ],
    [
      "owner_or_path_conflict",
      (value, gold) => {
        value.packets[1].owner = "owner-a";
        gold.delegation_packets[1].owner = "owner-a";
      },
    ],
    [
      "coordination_cost_exceeds_benefit",
      (value, gold) => {
        value.packets[1].positive_expected_parallel_benefit = false;
        gold.delegation_packets[1].positive_expected_parallel_benefit = false;
      },
    ],
  ];
}

function baselineTrace(original, metadata) {
  const value = structuredClone(original);
  value.run_identity.variant_id = metadata.variant_id;
  value.run_identity.variant_role = metadata.variant_role;
  value.solo_reason_id = null;
  return value;
}

function configureOneWorker(value, packetId, changedPath) {
  const worker = value.host.workers[0];
  worker.packet_id = packetId;
  worker.changed_paths = [changedPath];
  value.host.workers = [worker];
  value.host.worker_events = [
    { ...value.host.worker_events[0], seq: 1 },
    { ...value.host.worker_events[2], seq: 2 },
  ];
  value.host.parent_changed_paths = [
    "context.md",
    "src/a.mjs",
    "src/b.mjs",
    "src/c.mjs",
  ].filter((item) => item !== changedPath);
  value.costs.child_tokens = worker.total_tokens;
}
