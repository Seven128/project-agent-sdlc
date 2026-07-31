import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedDesignResourceHandoffInputV1 } from "./design-resource-handoff-input-types.js";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { sha256Hex } from "./strict-codec.js";
import { assertDesignResourceV1ManifestCapacity } from "./design-resource-v1-capacity.js";

export interface DesignResourceSnapshot {
  contents: Map<string, Buffer>;
  hashes: Record<string, string>;
}

export async function readDesignResourceSnapshot(
  repository: string,
  parsed: ParsedDesignResourceHandoffInputV1,
): Promise<DesignResourceSnapshot> {
  const contents = new Map<string, Buffer>();
  const hashes: Record<string, string> = {};
  const manifestResourceRefs = new Set(
    parsed.handoff.targets.map(
      (target) => target.source_profile.fact_manifest_resource_ref,
    ),
  );
  for (const resource of parsed.handoff.resources) {
    if (resource.path === parsed.handoff_path)
      invalidDesignResourceHandoff(
        "resource_must_not_be_handoff",
        resource.key,
      );
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...resource.path.split("/")),
      `design_resource:${resource.key}`,
    );
    if (manifestResourceRefs.has(resource.key))
      await assertDesignResourceV1ManifestCapacity(file);
    const bytes = await readFile(file);
    const digest = sha256Hex(bytes);
    if (digest !== resource.sha256)
      invalidDesignResourceHandoff(
        "resource_digest_mismatch",
        `${resource.key}:${resource.sha256}:${digest}`,
      );
    contents.set(resource.key, bytes);
    hashes[resource.key] = digest;
  }
  return { contents, hashes };
}
