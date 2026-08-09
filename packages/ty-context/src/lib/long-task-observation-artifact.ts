import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import {
  JSON_POINTER_EXACT_LIMITS,
  extractJsonPointerExactObservationFromBytes,
  invalidObservation,
  normalizeObservationArtifactPath,
  type JsonPointerExactBudget,
  type JsonPointerExactLocator,
  type JsonPointerExactObservation,
} from "./long-task-json-pointer-observation.js";

export async function extractJsonPointerExactObservation(input: {
  root: string;
  artifact_path: string;
  locator: JsonPointerExactLocator;
  sensitivity: string;
  budget?: JsonPointerExactBudget;
}): Promise<JsonPointerExactObservation> {
  const artifactPath = normalizeObservationArtifactPath(input.artifact_path);
  const root = path.resolve(input.root);
  const resolved = path.resolve(root, ...artifactPath.split("/"));
  assertContained(root, resolved);
  await rejectSymbolicPath(root, artifactPath);
  const [rootReal, fileReal] = await Promise.all([realpath(root), realpath(resolved)]);
  assertContained(rootReal, fileReal);
  const before = await lstat(resolved);
  if (!before.isFile()) throw invalidObservation("observation_artifact_not_file");
  if (before.size > JSON_POINTER_EXACT_LIMITS.max_file_bytes)
    throw invalidObservation("observation_artifact_size_limit");
  const handle = await open(resolved, "r");
  try {
    const opened = await handle.stat();
    assertSameFile(before, opened);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    assertSameFile(opened, after);
    return extractJsonPointerExactObservationFromBytes({
      artifact_path: artifactPath,
      bytes,
      locator: input.locator,
      sensitivity: input.sensitivity,
      budget: input.budget,
    });
  } finally {
    await handle.close();
  }
}

function assertContained(root: string, target: string): void {
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw invalidObservation("observation_artifact_path_escape");
}

async function rejectSymbolicPath(root: string, relative: string): Promise<void> {
  let current = root;
  for (const segment of relative.split("/")) {
    current = path.join(current, segment);
    const entry = await lstat(current);
    if (entry.isSymbolicLink())
      throw invalidObservation("observation_artifact_symlink");
  }
}

function assertSameFile(
  before: { dev: number | bigint; ino: number | bigint; size: number },
  after: { dev: number | bigint; ino: number | bigint; size: number },
): void {
  if (
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size
  )
    throw invalidObservation("observation_artifact_changed_during_read");
}
