import { normalize } from "./shared.mjs";

const LIFECYCLE = [
  ["source_contract", "passed"],
  ["preflight", "passed"],
  ["compile", "passed"],
  ["checkpoint", "satisfied"],
  ["delegation", "passed"],
  ["parent_integration", "integrated"],
  ["project_verification", "passed"],
  ["final_gate", "machine_accepted"],
];

export function validateLifecycle(events, finalHead, finalTree, issues) {
  const values = Array.isArray(events) ? events : [];
  const phases = values.map((item) => item.phase);
  requireValue(
    JSON.stringify(phases) === JSON.stringify(LIFECYCLE.map(([phase]) => phase)),
    "lifecycle_sequence_incomplete",
    issues,
  );
  requireValue(
    values.every((item, index) => item.seq === index + 1),
    "lifecycle_sequence_invalid",
    issues,
  );
  requireValue(
    values.every((item, index) => item.status === LIFECYCLE[index]?.[1]),
    "lifecycle_phase_not_successful",
    issues,
  );
  const gate = values.at(-1);
  requireValue(gate?.status === "machine_accepted", "final_gate_not_accepted", issues);
  requireValue(
    gate?.head_commit === finalHead && gate?.tree === finalTree,
    "final_gate_candidate_mismatch",
    issues,
  );
  return {
    phases,
    final_gate_status: gate?.status ?? null,
    final_gate_bound: gate?.head_commit === finalHead && gate?.tree === finalTree,
  };
}

export function buildPacketGold(items, issues) {
  const values = Array.isArray(items) ? items : [];
  const result = new Map();
  for (const item of values) {
    const id = item?.packet_id;
    requireValue(nonEmpty(id), "gold_packet_id_invalid", issues);
    requireValue(!result.has(id), `gold_packet_duplicate:${id}`, issues);
    requireValue(nonEmpty(item?.owner), `gold_packet_owner_invalid:${id}`, issues);
    requireValue(
      typeof item?.independently_safe === "boolean" &&
        typeof item?.positive_expected_parallel_benefit === "boolean",
      `gold_packet_qualifying_flags_invalid:${id}`,
      issues,
    );
    const allowed = Array.isArray(item?.allowed_paths) ? item.allowed_paths.map(normalize) : [];
    requireValue(allowed.length > 0, `gold_packet_paths_empty:${id}`, issues);
    requireValue(allowed.every(safeRelativePath), `gold_packet_path_invalid:${id}`, issues);
    requireValue(
      new Set(allowed).size === allowed.length,
      `gold_packet_path_duplicate:${id}`,
      issues,
    );
    if (nonEmpty(id)) result.set(id, item);
  }
  return result;
}

export function validatePackets(packets, gold, issues) {
  requireValue(packets.length === gold.size, "packet_population_mismatch", issues);
  const seen = new Set();
  for (const packet of packets) {
    requireValue(!seen.has(packet.packet_id), `packet_duplicate:${packet.packet_id}`, issues);
    seen.add(packet.packet_id);
    const expected = gold.get(packet.packet_id);
    requireValue(Boolean(expected), `unknown_packet:${packet.packet_id}`, issues);
    if (!expected) continue;
    requireValue(
      packet.owner === expected.owner,
      `packet_owner_mismatch:${packet.packet_id}`,
      issues,
    );
    requireValue(
      samePaths(packet.allowed_paths, expected.allowed_paths),
      `packet_paths_mismatch:${packet.packet_id}`,
      issues,
    );
    requireValue(
      packet.positive_expected_parallel_benefit === expected.positive_expected_parallel_benefit,
      `packet_parallel_benefit_mismatch:${packet.packet_id}`,
      issues,
    );
    requireValue(
      packet.independently_safe === expected.independently_safe,
      `packet_independent_safety_mismatch:${packet.packet_id}`,
      issues,
    );
  }
}

export function validateAttribution(workers, parentPaths, packetGold, changed, issues) {
  const attributed = new Set((parentPaths ?? []).map(normalize));
  const workerPaths = [];
  const actors = new Set();
  for (const worker of workers) {
    requireValue(nonEmpty(worker.actor_id), "worker_actor_id_invalid", issues);
    const expected = packetGold.get(worker.packet_id);
    requireValue(Boolean(expected), `worker_packet_unknown:${worker.actor_id}`, issues);
    requireValue(!actors.has(worker.actor_id), "worker_actor_duplicate", issues);
    actors.add(worker.actor_id);
    for (const file of (worker.changed_paths ?? []).map(normalize)) {
      requireValue(
        expected?.allowed_paths.map(normalize).includes(file),
        `worker_path_out_of_scope:${file}`,
        issues,
      );
      requireValue(!attributed.has(file), `actor_path_overlap:${file}`, issues);
      attributed.add(file);
      workerPaths.push(file);
    }
  }
  const actual = changed.map(normalize).filter((file) => !file.startsWith(".benchmark/"));
  requireValue(samePaths([...attributed], actual), "actor_attribution_not_closed", issues);
  return {
    worker_paths: [...new Set(workerPaths)].sort(),
    parent_paths: [...new Set((parentPaths ?? []).map(normalize))].sort(),
    actual_paths: [...new Set(actual)].sort(),
  };
}

export function serviceTierStatus(parent, workers) {
  const parentTier = parent?.effective_service_tier;
  const childTiers = workers.map((item) => item.effective_service_tier);
  const parentHasTier = Object.hasOwn(parent ?? {}, "effective_service_tier");
  const childHasTier = workers.map((item) =>
    Object.hasOwn(item, "effective_service_tier"),
  );
  const invalid =
    (parentHasTier && !nonEmptyString(parentTier)) ||
    childTiers.some(
      (value, index) => childHasTier[index] && !nonEmptyString(value),
    );
  if (invalid)
    return { status: "invalid", parent: parentTier, children: childTiers };
  const observedChildTiers = childTiers.filter(nonEmptyString);
  if (
    nonEmptyString(parentTier) &&
    observedChildTiers.some((value) => value !== parentTier)
  )
    return { status: "mismatch", parent: parentTier, children: childTiers };
  if (
    !nonEmptyString(parentTier) ||
    workers.length === 0 ||
    observedChildTiers.length !== childTiers.length
  )
    return { status: "service_tier_inheritance_unverified" };
  return { status: "verified", parent: parentTier, children: childTiers };
}

function nonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

export function validateCosts(value, workers, issues) {
  const keys = ["wall_time_ms", "parent_tokens", "child_tokens", "tool_turns", "check_turns", "compactions", "integration_rework"];
  const positiveKeys = ["wall_time_ms", "parent_tokens", "tool_turns", "check_turns"];
  const nonnegativeKeys = ["child_tokens", "compactions", "integration_rework"];
  const workerTokens = safeSum(workers.map((item) => item.total_tokens));
  const totalTokens = safeSum([value?.parent_tokens, value?.child_tokens]);
  const valid =
    value &&
    positiveKeys.every((key) => Number.isSafeInteger(value[key]) && value[key] > 0) &&
    nonnegativeKeys.every((key) => Number.isSafeInteger(value[key]) && value[key] >= 0) &&
    workers.every((item) => Number.isSafeInteger(item.total_tokens) && item.total_tokens > 0) &&
    (workers.length === 0 || value.child_tokens > 0) &&
    workerTokens !== null &&
    totalTokens !== null;
  requireValue(valid, "delegation_costs_unavailable", issues);
  requireValue(!valid || workerTokens === value.child_tokens, "child_token_total_mismatch", issues);
  return valid
    ? {
        ...Object.fromEntries(keys.map((key) => [key, value[key]])),
        total_tokens: totalTokens,
      }
    : null;
}

export function requireValue(value, reason, issues) {
  if (!value) issues.push(reason);
}

export function isSha256(value) {
  return /^[0-9a-f]{64}$/u.test(value ?? "");
}

function samePaths(left, right) {
  return (
    JSON.stringify([...new Set((left ?? []).map(normalize))].sort()) ===
    JSON.stringify([...new Set((right ?? []).map(normalize))].sort())
  );
}

function nonEmpty(value) {
  return typeof value === "string" && value.length > 0;
}

function safeSum(values) {
  let total = 0;
  for (const value of values) {
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(total + value))
      return null;
    total += value;
  }
  return total;
}

function safeRelativePath(value) {
  return (
    nonEmpty(value) &&
    !value.startsWith("/") &&
    !/^[a-z]:/iu.test(value) &&
    !value.split("/").includes("..")
  );
}
