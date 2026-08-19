import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  DELEGATION_QUALIFYING_PREDICATE_IDS,
  DELEGATION_MINIMUM_QUALIFYING_PACKETS,
  DELEGATION_SOLO_REASON_IDS,
  evaluateDelegationSuitability,
  selectedDelegationPacketsConform,
} from "../../../examples/delivery-benchmark/mechanism/runner/delegation-policy-evaluation.mjs";

export function verifyDelegationSuitabilityPolicy() {
  const packets = [
    packet("a", "owner-a", "src/a.mjs"),
    packet("b", "owner-b", "src/b.mjs"),
  ];
  const available = {
    profileAvailable: true,
    capacityObserved: true,
    availableSlots: 2,
  };
  assert.deepEqual(DELEGATION_SOLO_REASON_IDS, [
    "insufficient_qualifying_packets",
    "exact_profile_unavailable",
    "insufficient_host_capacity",
    "owner_or_path_conflict",
    "coordination_cost_exceeds_benefit",
  ]);
  assert.deepEqual(DELEGATION_QUALIFYING_PREDICATE_IDS, [
    "independently_safe",
    "positive_expected_parallel_benefit",
    "owner_path_source_of_truth_disjoint",
    "exact_profile_available",
    "sufficient_current_host_capacity",
  ]);
  assert.equal(DELEGATION_MINIMUM_QUALIFYING_PACKETS, 2);
  assert.deepEqual(
    evaluateDelegationSuitability(packets, available)
      .applicable_solo_reasons,
    [],
  );
  assert.equal(evaluateDelegationSuitability(packets, available).qualifying, true);

  const cases = [
    ["insufficient_qualifying_packets", packets.slice(0, 1), available],
    [
      "exact_profile_unavailable",
      packets,
      { ...available, profileAvailable: false },
    ],
    [
      "insufficient_host_capacity",
      packets,
      { ...available, availableSlots: 1 },
    ],
    [
      "owner_or_path_conflict",
      [packets[0], { ...packets[1], owner: "owner-a" }],
      available,
    ],
    [
      "owner_or_path_conflict",
      [packets[0], { ...packets[1], allowed_paths: ["src/a.mjs"] }],
      available,
    ],
    [
      "coordination_cost_exceeds_benefit",
      [packets[0], { ...packets[1], positive_expected_parallel_benefit: false }],
      available,
    ],
  ];
  for (const [reason, values, observations] of cases) {
    const result = evaluateDelegationSuitability(values, observations);
    assert.equal(result.qualifying, false, reason);
    assert.ok(result.applicable_solo_reasons.includes(reason), reason);
  }

  for (const extra of [
    { ...packet("c", "owner-c", "src/c.mjs"), independently_safe: false },
    {
      ...packet("c", "owner-c", "src/c.mjs"),
      positive_expected_parallel_benefit: false,
    },
    packet("c", "owner-a", "src/c.mjs"),
  ]) {
    const result = evaluateDelegationSuitability([...packets, extra], available);
    assert.equal(result.qualifying, true);
    assert.deepEqual(result.qualifying_packet_ids, ["a", "b"]);
  }
  assert.equal(selectedDelegationPacketsConform(packets), true);
  assert.equal(
    selectedDelegationPacketsConform([
      packets[0],
      { ...packets[1], independently_safe: false },
    ]),
    false,
  );
  assert.equal(
    selectedDelegationPacketsConform([
      packets[0],
      { ...packets[1], owner: "owner-a" },
    ]),
    false,
  );
  assert.equal(
    selectedDelegationPacketsConform([
      packets[0],
      { ...packets[1], allowed_paths: ["src/a.mjs"] },
    ]),
    false,
  );
}

export function delegationTrace(metadata, initial, initialTree, head, tree) {
  const phases = [
    ["source_contract", "passed"],
    ["preflight", "passed"],
    ["compile", "passed"],
    ["checkpoint", "satisfied"],
    ["delegation", "passed"],
    ["parent_integration", "integrated"],
    ["project_verification", "passed"],
    ["final_gate", "machine_accepted"],
  ];
  return {
    schema_version: "tiny-context-long-task-delegation-host-trace-v1",
    source: "self_declared_source_is_not_attestation",
    run_identity: {
      task_id: metadata.task_id,
      track: metadata.track,
      variant_id: metadata.variant_id,
      variant_role: metadata.variant_role,
      pair_id: metadata.pair_id,
      replicate: metadata.replicate,
      initial_commit: metadata.initial_commit,
      initial_tree: metadata.initial_tree,
      baseline_commit: metadata.baseline_commit,
      fixture_sha256: metadata.fixture_sha256,
      experiment_set_sha256: metadata.experiment_set_sha256,
      run_input_identity_sha256: metadata.run_input_identity.sha256,
      delegation_admission_policy_sha256:
        metadata.delegation_admission_policy_sha256,
      harness_runtime_identity_sha256:
        metadata.harness_runtime_identity.identity_sha256,
      requested_parent_model: metadata.model,
      requested_parent_reasoning: metadata.reasoning,
      requested_provider: metadata.provider,
      guidance_content_bundle_sha256: metadata.workflow_guidance_source.content_bundle_sha256,
      guidance_provenance_sha256: metadata.workflow_guidance_source.guidance_provenance_sha256,
      profile_content_sha256: metadata.workflow_guidance_source.profile_content_sha256,
      hook_content_sha256: metadata.workflow_guidance_source.hook_content_sha256,
      benchmark_inputs_sha256: metadata.benchmark_inputs_sha256,
      source_checkout_commit: metadata.source_checkout_candidate.head_commit,
      source_checkout_tree: metadata.source_checkout_candidate.head_tree,
      source_checkout_working_tree_digest:
        metadata.source_checkout_candidate.working_tree.digest,
    },
    candidate_before: {
      head_commit: initial,
      tree: initialTree,
      clean: true,
      working_tree_digest: "5".repeat(64),
    },
    candidate_after: { head_commit: head, tree },
    packets: [packet("a", "owner-a", "src/a.mjs"), packet("b", "owner-b", "src/b.mjs")],
    host: {
      profile: {
        available: true,
        status: "available",
        content_sha256: metadata.workflow_guidance_source.profile_content_sha256,
      },
      capacity: { available_slots: 2, observed_at_ms: 1 },
      delegation_decision_at_ms: 5,
      guard_probe: { generic_spawn_denied: true, exact_spawn_allowed: true },
      parent: {
        effective_model: metadata.model,
        effective_reasoning_effort: metadata.reasoning,
        provider_id: metadata.provider,
        host_version: "codex-test-v1",
        platform: "win32",
        arch: "x64",
        effective_service_tier: "priority",
      },
      parent_changed_paths: ["context.md"],
      workers: [worker("agent-a", "a", "src/a.mjs"), worker("agent-b", "b", "src/b.mjs")],
      worker_events: [
        workerEvent(1, "start", "agent-a", 10),
        workerEvent(2, "start", "agent-b", 20),
        workerEvent(3, "stop", "agent-a", 30),
        workerEvent(4, "stop", "agent-b", 40),
      ],
    },
    lifecycle: phases.map(([phase, status], index) => ({
      seq: index + 1,
      phase,
      status,
      ...(phase === "final_gate" ? { head_commit: head, tree } : {}),
    })),
    costs: {
      wall_time_ms: 1000,
      parent_tokens: 1000,
      child_tokens: 800,
      tool_turns: 20,
      check_turns: 8,
      compactions: 0,
      integration_rework: 1,
    },
    solo_reason_id: null,
  };
}

export function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function packet(packetId, owner, allowedPath) {
  return {
    packet_id: packetId,
    owner,
    allowed_paths: [allowedPath],
    independently_safe: true,
    positive_expected_parallel_benefit: true,
  };
}

function workerEvent(seq, event, actorId, timestampMs) {
  return {
    seq,
    event,
    actor_id: actorId,
    timestamp_ms: timestampMs,
    ...(event === "start"
      ? { actual_agent_type: "long_task_implementation" }
      : { status: "completed" }),
  };
}

function worker(actorId, packetId, changedPath) {
  return {
    actor_id: actorId,
    packet_id: packetId,
    requested_agent_type: "long_task_implementation",
    effective_agent_type: "long_task_implementation",
    effective_model: "gpt-5.6-luna",
    effective_reasoning_effort: "max",
    effective_service_tier: "priority",
    changed_paths: [changedPath],
    total_tokens: 400,
  };
}
