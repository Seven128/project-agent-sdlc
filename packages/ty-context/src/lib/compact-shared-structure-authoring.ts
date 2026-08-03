import { createCompactSharedStructures } from "./compact-shared-structures.js";
import type {
  CompactSharedStructureStatistics,
  CompactSharedStructureTarget,
  CompactSharedStructureTemplate,
} from "./compact-shared-structure-types.js";

export function applyCompactSharedStructures(
  targets: CompactSharedStructureTarget[],
): {
  catalog: CompactSharedStructureTemplate[];
  statistics: CompactSharedStructureStatistics;
} {
  const encoded = createCompactSharedStructures(
    targets.map((target) => ({
      boundary: target.boundary,
      value: target.read(),
    })),
  );
  encoded.slots.forEach((slot, index) => targets[index].write(slot.value));
  return { catalog: encoded.catalog, statistics: encoded.statistics };
}
