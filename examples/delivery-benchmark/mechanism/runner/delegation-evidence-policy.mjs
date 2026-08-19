import {
  delegatedWorkerPacketsConform,
  DELEGATION_MINIMUM_QUALIFYING_PACKETS,
  DELEGATION_SOLO_REASON_IDS,
  selectedDelegationPacketsConform,
} from "./delegation-policy-evaluation.mjs";
import { normalize } from "./shared.mjs";

export function evaluateDelegationExecutionPolicy(input) {
  const issues = [];
  const workers = input.workers;
  const selectedPackets = workers
    .map((item) => input.packetGold.get(item.packet_id))
    .filter(Boolean);
  const workerPackets = new Set(workers.map((item) => item.packet_id));

  if (
    workers.length > 0 &&
    (selectedPackets.length !== workers.length ||
      !delegatedWorkerPacketsConform(selectedPackets))
  )
    issues.push("delegated_worker_packet_selection_invalid");

  if (input.candidate && input.qualifying) {
    if (
      workers.length < DELEGATION_MINIMUM_QUALIFYING_PACKETS ||
      workerPackets.size !== workers.length ||
      input.workerLifecycle.concurrent_worker_peak < 2
    )
      issues.push("candidate_required_multiple_exact_workers");
    if (!selectedDelegationPacketsConform(selectedPackets))
      issues.push("candidate_worker_packet_selection_invalid");
    if (input.soloReason !== null)
      issues.push("candidate_solo_reason_forbidden_when_qualified");
    if (parentMutatedSelectedPacket(input, selectedPackets))
      issues.push("candidate_parent_mutated_worker_packet");
  } else if (input.candidate) {
    if (workers.length > 0)
      issues.push("candidate_solo_fallback_spawned_worker");
    if (
      !DELEGATION_SOLO_REASON_IDS.includes(input.soloReason) ||
      !input.suitability.applicable_solo_reasons.includes(input.soloReason)
    )
      issues.push("candidate_solo_reason_missing_or_invalid");
  }

  return { policy_conformant: issues.length === 0, issues };
}

function parentMutatedSelectedPacket(input, selectedPackets) {
  const protectedPaths = new Set(
    selectedPackets.flatMap((item) => item.allowed_paths.map(normalize)),
  );
  return (input.parentChangedPaths ?? []).some((item) =>
    protectedPaths.has(normalize(item)),
  );
}
