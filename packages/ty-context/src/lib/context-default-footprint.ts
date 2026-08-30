import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import {
  selectDefaultContextPaths,
  type DefaultContextSelectionReason,
} from "./context-catalog/catalog-default-footprint.js";
import { loadContextCatalog } from "./context-catalog/catalog-load.js";
import {
  compareUtf8Paths,
  normalizeContextPath,
  normalizeContextPathSpelling,
} from "./context-catalog/catalog-paths.js";
import type { ContextManifest } from "./context-manifest-schema.js";

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
  const physicalPaths = physicalDefaultPaths(catalog.manifest);
  for (const [relativePath, reasons] of [...selected.entries()].sort(
    ([left], [right]) => compareUtf8Paths(left, right),
  )) {
    const absolutePath = resolveProjectFile(
      projectRoot,
      physicalPaths.get(relativePath) ?? relativePath,
    );
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
      reasons: [...reasons].sort(compareUtf8Paths),
    });
  }

  return {
    files,
    total_bytes: files.reduce((total, file) => total + file.bytes, 0),
    duplicate_groups: [...hashes.values()]
      .filter((group) => group.length > 1)
      .map((group) => [...group].sort(compareUtf8Paths))
      .sort(comparePathGroups),
  };
}

function physicalDefaultPaths(manifest: ContextManifest): Map<string, string> {
  const physical = new Map<string, string>();
  const addOwner = (rawPath: string): void => {
    const canonical = normalizeContextPath(rawPath);
    const spelling = normalizeContextPathSpelling(rawPath);
    const previous = physical.get(canonical);
    if (previous !== undefined && previous !== spelling)
      throw new Error(
        `default_context_path_unicode_collision:${canonical}:${[previous, spelling].sort(compareUtf8Paths).join(",")}`,
      );
    physical.set(canonical, spelling);
  };
  for (const core of [
    "project_context/context.toml",
    "project_context/global.md",
    "project_context/architecture.md",
  ])
    addOwner(core);
  for (const area of manifest.areas) addOwner(area.context);
  for (const context of manifest.contexts) addOwner(context.path);
  for (const context of manifest.contexts)
    for (const child of context.default_children) {
      const canonical = normalizeContextPath(child);
      if (!physical.has(canonical))
        physical.set(canonical, normalizeContextPathSpelling(child));
    }
  return physical;
}

function comparePathGroups(left: string[], right: string[]): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const comparison = compareUtf8Paths(left[index], right[index]);
    if (comparison !== 0) return comparison;
  }
  return left.length - right.length;
}

function resolveProjectFile(projectRoot: string, relativePath: string): string {
  const absolutePath = path.resolve(
    projectRoot,
    ...normalizeContextPathSpelling(relativePath).split("/"),
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
