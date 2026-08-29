import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import {
  selectDefaultContextPaths,
  type DefaultContextSelectionReason,
} from "./context-catalog/catalog-default-footprint.js";
import { loadContextCatalog } from "./context-catalog/catalog-load.js";
import { normalizeContextPath } from "./context-catalog/catalog-paths.js";

export {
  selectDefaultContextPaths,
  type DefaultContextSelectionReason,
} from "./context-catalog/catalog-default-footprint.js";

export const DEFAULT_CONTEXT_TOTAL_SOFT_BUDGET_BYTES = 64 * 1024;
export const DEFAULT_CONTEXT_FILE_SOFT_BUDGET_BYTES = 16 * 1024;

export interface DefaultContextFileFootprint {
  path: string;
  bytes: number;
  reasons: DefaultContextSelectionReason[];
}

export interface DefaultContextFootprint {
  files: DefaultContextFileFootprint[];
  total_bytes: number;
  duplicate_groups: string[][];
}

export async function inspectDefaultContextFootprint(
  projectRootInput: string,
): Promise<DefaultContextFootprint> {
  const projectRoot = path.resolve(projectRootInput);
  const catalog = await loadContextCatalog(projectRoot, {
    discover_files: false,
    validate_manifest: false,
  });
  const parseErrors = catalog.diagnostics
    .filter(
      (entry) =>
        entry.code === "context_manifest_parse" ||
        entry.code === "context_manifest_missing",
    )
    .map((entry) => entry.message);
  if (!catalog.manifest || parseErrors.length > 0) {
    throw new Error(`context_manifest_invalid:${parseErrors.join("|")}`);
  }

  const selected = catalog.default_footprint;
  const files: DefaultContextFileFootprint[] = [];
  const hashes = new Map<string, string[]>();
  for (const [relativePath, reasons] of [...selected.entries()].sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const absolutePath = resolveProjectFile(projectRoot, relativePath);
    const metadata = await lstat(absolutePath);
    if (metadata.isSymbolicLink()) {
      throw new Error(
        `default_context_path_symlink_not_allowed:${relativePath}`,
      );
    }
    if (!metadata.isFile()) {
      throw new Error(`default_context_path_not_file:${relativePath}`);
    }
    const content = await readFile(absolutePath);
    const digest = createHash("sha256").update(content).digest("hex");
    const group = hashes.get(digest) ?? [];
    group.push(relativePath);
    hashes.set(digest, group);
    files.push({
      path: relativePath,
      bytes: content.byteLength,
      reasons: [...reasons].sort(),
    });
  }

  return {
    files,
    total_bytes: files.reduce((total, file) => total + file.bytes, 0),
    duplicate_groups: [...hashes.values()]
      .filter((group) => group.length > 1)
      .map((group) => [...group].sort())
      .sort(([left], [right]) => left.localeCompare(right)),
  };
}

function resolveProjectFile(projectRoot: string, relativePath: string): string {
  const absolutePath = path.resolve(
    projectRoot,
    ...normalizeContextPath(relativePath).split("/"),
  );
  const relative = path.relative(projectRoot, absolutePath);
  if (
    relative.startsWith(`..${path.sep}`) ||
    relative === ".." ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`default_context_path_outside_project:${relativePath}`);
  }
  return absolutePath;
}
