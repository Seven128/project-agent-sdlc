import { open, stat } from "node:fs/promises";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";
import { DESIGN_RESOURCE_SYMBOLIC_FACT_POLICY } from "./design-resource-symbolic-fact-policy.js";
import {
  DESIGN_RESOURCE_V1_REGENERATION_GUIDANCE,
  parseDesignResourceV1CapacityHeader,
  type DesignResourceV1CapacityHeader,
} from "./design-resource-v1-capacity-header.js";

export { parseDesignResourceV1CapacityHeader } from "./design-resource-v1-capacity-header.js";
export type { DesignResourceV1CapacityHeader } from "./design-resource-v1-capacity-header.js";

export async function assertDesignResourceV1HandoffCapacity(
  file: string,
): Promise<void> {
  const bytes = (await stat(file)).size;
  const limit =
    DESIGN_RESOURCE_SYMBOLIC_FACT_POLICY.v1_capacity.embedded_handoff_max_bytes;
  if (bytes > limit)
    invalid(
      "v1_handoff_capacity_exceeded",
      `bytes=${bytes}:limit=${limit}:${DESIGN_RESOURCE_V1_REGENERATION_GUIDANCE}`,
    );
}

export async function assertDesignResourceV1ManifestCapacity(
  file: string,
): Promise<DesignResourceV1CapacityHeader> {
  const bytes = (await stat(file)).size;
  const policy = DESIGN_RESOURCE_SYMBOLIC_FACT_POLICY.v1_capacity;
  if (bytes > policy.canonical_manifest_max_bytes)
    invalid(
      "v1_manifest_capacity_exceeded",
      `bytes=${bytes}:limit=${policy.canonical_manifest_max_bytes}:${DESIGN_RESOURCE_V1_REGENERATION_GUIDANCE}`,
    );

  const prefixBytes = Math.min(bytes, policy.capacity_header_prefix_max_bytes);
  const buffer = Buffer.alloc(prefixBytes);
  const handle = await open(file, "r");
  try {
    let offset = 0;
    while (offset < prefixBytes) {
      const result = await handle.read(
        buffer,
        offset,
        prefixBytes - offset,
        offset,
      );
      if (result.bytesRead === 0) break;
      offset += result.bytesRead;
    }
    if (offset !== prefixBytes)
      invalid(
        "v1_manifest_capacity_header_read_incomplete",
        `bytes_read=${offset}:expected=${prefixBytes}`,
      );
  } finally {
    await handle.close();
  }

  const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  const header = parseDesignResourceV1CapacityHeader(text);
  const expectedFactCells = header.collection_counts.get("fact_cells");
  if (expectedFactCells === undefined)
    invalid(
      "v1_manifest_capacity_header_fact_cells_missing",
      DESIGN_RESOURCE_V1_REGENERATION_GUIDANCE,
    );
  if (expectedFactCells > policy.expected_fact_cells_max)
    invalid(
      "v1_fact_cell_capacity_exceeded",
      `expected_count=${expectedFactCells}:limit=${policy.expected_fact_cells_max}:${DESIGN_RESOURCE_V1_REGENERATION_GUIDANCE}`,
    );
  return header;
}

function invalid(code: string, detail: string): never {
  invalidDesignResourceHandoff(code, detail);
}
