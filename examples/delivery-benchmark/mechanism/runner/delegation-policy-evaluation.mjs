import { normalize } from "./shared.mjs";

export const DELEGATION_SOLO_REASON_IDS = Object.freeze([
  "insufficient_qualifying_packets",
  "exact_profile_unavailable",
  "insufficient_host_capacity",
  "owner_or_path_conflict",
  "coordination_cost_exceeds_benefit",
]);

export const DELEGATION_QUALIFYING_PREDICATE_IDS = Object.freeze([
  "independently_safe",
  "positive_expected_parallel_benefit",
  "owner_path_source_of_truth_disjoint",
  "exact_profile_available",
  "sufficient_current_host_capacity",
]);

export const DELEGATION_MINIMUM_QUALIFYING_PACKETS = 2;

export function evaluateDelegationSuitability(packetItems, observations = {}) {
  const packets = Array.isArray(packetItems) ? packetItems : [];
  const safePackets = packets.filter(
    (item) => item?.independently_safe === true,
  );
  const positivePackets = safePackets.filter(
    (item) => item?.positive_expected_parallel_benefit === true,
  );
  const qualifyingPair = findDisjointPair(positivePackets);
  const ownerOrPathConflict =
    positivePackets.length >= DELEGATION_MINIMUM_QUALIFYING_PACKETS &&
    qualifyingPair.length === 0;
  const applicableSoloReasons = [];

  if (safePackets.length < DELEGATION_MINIMUM_QUALIFYING_PACKETS)
    applicableSoloReasons.push("insufficient_qualifying_packets");
  if (observations.profileAvailable !== true)
    applicableSoloReasons.push("exact_profile_unavailable");
  if (
    observations.capacityObserved !== true ||
    observations.availableSlots < 2
  )
    applicableSoloReasons.push("insufficient_host_capacity");
  if (ownerOrPathConflict)
    applicableSoloReasons.push("owner_or_path_conflict");
  if (
    safePackets.length >= DELEGATION_MINIMUM_QUALIFYING_PACKETS &&
    positivePackets.length < DELEGATION_MINIMUM_QUALIFYING_PACKETS
  )
    applicableSoloReasons.push("coordination_cost_exceeds_benefit");

  return {
    qualifying: applicableSoloReasons.length === 0,
    applicable_solo_reasons: applicableSoloReasons,
    owner_or_path_conflict: ownerOrPathConflict,
    qualifying_packet_ids: qualifyingPair.map((item) => item.packet_id),
  };
}

export function selectedDelegationPacketsConform(packetItems) {
  const packets = Array.isArray(packetItems) ? packetItems : [];
  return (
    packets.length >= DELEGATION_MINIMUM_QUALIFYING_PACKETS &&
    delegatedWorkerPacketsConform(packets)
  );
}

export function delegatedWorkerPacketsConform(packetItems) {
  const packets = Array.isArray(packetItems) ? packetItems : [];
  return (
    packets.length > 0 &&
    packets.every(
      (item) =>
        item?.independently_safe === true &&
        item?.positive_expected_parallel_benefit === true,
    ) &&
    packets.every((left, index) =>
      packets.slice(index + 1).every((right) => packetsDisjoint(left, right)),
    )
  );
}

function findDisjointPair(packets) {
  for (let left = 0; left < packets.length; left += 1) {
    for (let right = left + 1; right < packets.length; right += 1) {
      if (packetsDisjoint(packets[left], packets[right]))
        return [packets[left], packets[right]];
    }
  }
  return [];
}

function packetsDisjoint(left, right) {
  if (left?.owner === right?.owner) return false;
  const leftPaths = new Set((left?.allowed_paths ?? []).map(normalize));
  return !(right?.allowed_paths ?? []).some((file) =>
    leftPaths.has(normalize(file)),
  );
}
