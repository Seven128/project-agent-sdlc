import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { CompiledCheckV2 } from "./long-task-delivery-types.js";
import { matchesRepoPattern } from "./long-task-paths.js";
import { sha256Hex } from "./strict-codec.js";

export {
  JSON_POINTER_EXACT_CAPABILITY,
  JSON_POINTER_EXACT_LIMITS,
  JSON_POINTER_EXACT_METHODS,
  JSON_POINTER_EXACT_ORACLE_IDENTITY,
  JSON_POINTER_EXACT_ORACLE_VERSION,
  JSON_POINTER_EXACT_SPEC_SHA256,
  admittedObservationKey,
  classifyObservationCarrier,
  createJsonPointerExactBudget,
  extractJsonPointerExactObservation,
  extractJsonPointerExactObservationFromBytes,
  isJsonPointerExactOracle,
  jsonPointerExactLocatorForIdentity,
  observationAdmissionDecision,
  prepareAdmittedObservations,
} from "./long-task-admitted-observation.js";

export async function collectCheckArtifacts(
  check: CompiledCheckV2,
  snapshotRoot: string,
): Promise<{ hashes: Record<string, string>; errors: string[] }> {
  if (!check.artifact_globs.length) return { hashes: {}, errors: [] };
  const candidates: string[] = [];
  async function visit(directory: string, relative = ""): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!relative && entry.name === ".git") continue;
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink() || entry.name === "node_modules") continue;
      if (entry.isDirectory())
        await visit(path.join(directory, entry.name), next);
      else if (entry.isFile()) candidates.push(next);
    }
  }
  await visit(snapshotRoot);
  const selected = [
    ...new Set(
      check.artifact_globs.flatMap((pattern) =>
        candidates.filter((candidate) =>
          matchesRepoPattern(candidate, pattern),
        ),
      ),
    ),
  ].sort();
  const hashes = Object.fromEntries(
    await Promise.all(
      selected.map(
        async (relative) =>
          [
            relative,
            sha256Hex(
              await readFile(path.join(snapshotRoot, ...relative.split("/"))),
            ),
          ] as const,
      ),
    ),
  );
  const errors = check.artifact_globs
    .filter(
      (pattern) => !selected.some((file) => matchesRepoPattern(file, pattern)),
    )
    .map((pattern) => `artifact_glob_empty:${pattern}`);
  return { hashes, errors };
}
