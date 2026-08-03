import { Buffer } from "node:buffer";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import type {
  CompactSharedStructureCandidateFamily as CandidateFamily,
  CompactSharedStructureCandidateOccurrence as CandidateOccurrence,
  CompactSharedStructureEncoding,
  CompactSharedStructureSlot,
  CompactSharedStructureTemplate,
} from "./compact-shared-structure-types.js";

export type {
  CompactSharedStructureEncoding,
  CompactSharedStructureFamilyStatistic,
  CompactSharedStructureSlot,
  CompactSharedStructureStatistics,
  CompactSharedStructureTarget,
  CompactSharedStructureTemplate,
} from "./compact-shared-structure-types.js";

const STABLE_BOUNDARY = /^[a-z0-9][a-z0-9._:-]*$/u;
const MINIMUM_NET_SAVING_BYTES = 32;

export function createCompactSharedStructures(
  slotsInput: CompactSharedStructureSlot[],
): CompactSharedStructureEncoding {
  const slots = slotsInput.map((slot, index) => ({
    boundary: validBoundary(slot.boundary, `slots[${index}].boundary`),
    value: structuredClone(slot.value),
  }));
  const grouped = new Map<string, CandidateOccurrence[]>();
  for (const [slotIndex, slot] of slots.entries()) {
    if (!isCandidateComposite(slot.value)) continue;
    const descriptor = describeStructure(slot.value);
    const identity = `${slot.boundary}\0${canonicalValueJson(descriptor.shape)}`;
    const occurrences = grouped.get(identity) ?? [];
    occurrences.push({
      slot_index: slotIndex,
      value: slot.value,
      leaves: descriptor.leaves,
      original_bytes: byteLength(slot.value),
    });
    grouped.set(identity, occurrences);
  }

  const candidateClusters = [...grouped.values()]
    .filter((occurrences) => occurrences.length > 1)
    .flatMap(partitionStableCandidateFamilies)
    .filter((group) => group.occurrences.length > 1);
  const candidates = candidateClusters
    .map(({ occurrences, parameter_positions }) =>
      buildCandidate(slots, occurrences, parameter_positions),
    )
    .filter((candidate): candidate is CandidateFamily => candidate !== null)
    .sort((left, right) => left.row.key.localeCompare(right.row.key));
  const bySlot = new Map<number, CandidateFamily>();
  for (const candidate of candidates)
    for (const occurrence of candidate.occurrences)
      bySlot.set(occurrence.slot_index, candidate);

  for (const [slotIndex, candidate] of bySlot) {
    const occurrenceIndex = candidate.occurrences.findIndex(
      (item) => item.slot_index === slotIndex,
    );
    slots[slotIndex].value = structuredClone(
      candidate.references[occurrenceIndex],
    );
  }
  const catalog = candidates.map((candidate) => candidate.row);
  const originalPayloadBytes = slotsInput.reduce(
    (sum, slot) => sum + byteLength(slot.value),
    0,
  );
  const encodedPayloadBytes = slots.reduce(
    (sum, slot) => sum + byteLength(slot.value),
    0,
  );
  const catalogBytes = byteLength(catalog);
  const familyStatistics = candidates
    .map((candidate) => candidate.statistic)
    .sort(
      (left, right) =>
        right.saved_bytes - left.saved_bytes ||
        left.key.localeCompare(right.key),
    );
  return {
    slots,
    catalog,
    statistics: {
      slot_count: slots.length,
      composite_slot_count: slotsInput.filter((slot) =>
        isCandidateComposite(slot.value),
      ).length,
      candidate_family_count: candidateClusters.length,
      emitted_family_count: catalog.length,
      exact_family_count: catalog.filter((item) => item.parameter_count === 0)
        .length,
      parameterized_family_count: catalog.filter(
        (item) => item.parameter_count > 0,
      ).length,
      reference_count: candidates.reduce(
        (sum, candidate) => sum + candidate.occurrences.length,
        0,
      ),
      argument_count: candidates.reduce(
        (sum, candidate) =>
          sum + candidate.occurrences.length * candidate.row.parameter_count,
        0,
      ),
      original_payload_bytes: originalPayloadBytes,
      encoded_payload_bytes: encodedPayloadBytes,
      catalog_bytes: catalogBytes,
      saved_bytes: originalPayloadBytes - encodedPayloadBytes - catalogBytes,
      remaining_beneficial_candidates: 0,
      families: familyStatistics,
    },
  };
}

function buildCandidate(
  slots: CompactSharedStructureSlot[],
  occurrences: CandidateOccurrence[],
  parameterPositions: number[],
): CandidateFamily | null {
  const boundary = slots[occurrences[0].slot_index].boundary;
  const parameterByPosition = new Map(
    parameterPositions.map((position, index) => [position, index]),
  );
  const template = buildTemplate(occurrences[0].value, parameterByPosition);
  const parameterCount = parameterPositions.length;
  const digest = sha256Hex(
    canonicalValueJson({ boundary, parameter_count: parameterCount, template }),
  );
  const key = `structure.${digest.slice(0, 24)}`;
  const row: CompactSharedStructureTemplate = {
    key,
    digest,
    boundary,
    parameter_count: parameterCount,
    template,
  };
  const references = occurrences.map((occurrence) => ({
    structure_ref: key,
    arguments: parameterPositions.map((position) =>
      structuredClone(occurrence.leaves[position]),
    ),
  }));
  const originalBytes = occurrences.reduce(
    (sum, occurrence) => sum + occurrence.original_bytes,
    0,
  );
  const encodedBytes =
    byteLength(row) +
    references.reduce((sum, reference) => sum + byteLength(reference), 0);
  const savedBytes = originalBytes - encodedBytes;
  if (savedBytes < MINIMUM_NET_SAVING_BYTES) return null;
  return {
    boundary,
    occurrences,
    parameter_positions: parameterPositions,
    template,
    row,
    references,
    statistic: {
      key,
      boundary,
      occurrences: occurrences.length,
      parameter_count: parameterCount,
      original_bytes: originalBytes,
      encoded_bytes: encodedBytes,
      saved_bytes: savedBytes,
    },
  };
}

function partitionStableCandidateFamilies(
  occurrences: CandidateOccurrence[],
): Array<{
  occurrences: CandidateOccurrence[];
  parameter_positions: number[];
}> {
  const leafCount = occurrences[0].leaves.length;
  const parameterPositions: number[] = [];
  const constantPositions: number[] = [];
  for (let index = 0; index < leafCount; index += 1) {
    const distinct = new Set(
      occurrences.map((occurrence) =>
        canonicalValueJson(occurrence.leaves[index]),
      ),
    ).size;
    if (distinct >= 3 && distinct / occurrences.length >= 0.2)
      parameterPositions.push(index);
    else constantPositions.push(index);
  }
  const clusters = new Map<string, CandidateOccurrence[]>();
  for (const occurrence of occurrences) {
    const identity = canonicalValueJson(
      constantPositions.map((position) => occurrence.leaves[position]),
    );
    const cluster = clusters.get(identity) ?? [];
    cluster.push(occurrence);
    clusters.set(identity, cluster);
  }
  return [...clusters.values()].map((cluster) => ({
    occurrences: cluster,
    parameter_positions: parameterPositions,
  }));
}

function describeStructure(value: unknown): {
  shape: unknown;
  leaves: unknown[];
} {
  const leaves: unknown[] = [];
  const visit = (item: unknown): unknown => {
    if (Array.isArray(item)) return ["array", item.map(visit)];
    if (item && typeof item === "object")
      return [
        "object",
        Object.keys(item as Record<string, unknown>)
          .sort()
          .map((key) => [key, visit((item as Record<string, unknown>)[key])]),
      ];
    leaves.push(item);
    return ["leaf", leafKind(item)];
  };
  return { shape: visit(value), leaves };
}

function buildTemplate(
  value: unknown,
  parameterByPosition: ReadonlyMap<number, number>,
): unknown {
  let leafIndex = 0;
  const visit = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.keys(item as Record<string, unknown>)
          .sort()
          .map((key) => [key, visit((item as Record<string, unknown>)[key])]),
      );
    const parameterIndex = parameterByPosition.get(leafIndex);
    leafIndex += 1;
    return parameterIndex === undefined
      ? structuredClone(item)
      : { parameter_index: parameterIndex };
  };
  return visit(value);
}

function isCandidateComposite(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (!Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    if (
      Object.keys(row).length === 1 &&
      (Object.hasOwn(row, "selector_ref") ||
        Object.hasOwn(row, "structure_ref") ||
        Object.hasOwn(row, "parameter_index"))
    )
      return false;
  }
  return true;
}

function leafKind(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  fail("value", `unsupported scalar: ${typeof value}`);
}

function validBoundary(value: unknown, label: string): string {
  if (typeof value !== "string" || !STABLE_BOUNDARY.test(value))
    fail(label, "must be a stable lowercase boundary");
  return value;
}

function byteLength(value: unknown): number {
  return Buffer.byteLength(canonicalValueJson(value), "utf8");
}

function fail(label: string, message: string): never {
  throw new Error(`compact_shared_structure_invalid:${label}:${message}`);
}
