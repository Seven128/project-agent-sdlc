import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import {
  parseContextManifest,
  type ContextManifest,
} from "./context-manifest-schema.js";

export const DEFAULT_CONTEXT_TOTAL_SOFT_BUDGET_BYTES = 64 * 1024;
export const DEFAULT_CONTEXT_FILE_SOFT_BUDGET_BYTES = 16 * 1024;

export type DefaultContextSelectionReason =
  "core" | "default_area" | "default_role" | "default_child";

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
  const manifestPath = "project_context/context.toml";
  const manifestContent = await readFile(
    path.join(projectRoot, ...manifestPath.split("/")),
    "utf8",
  );
  const parsed = parseContextManifest(manifestContent, manifestPath);
  if (!parsed.manifest || parsed.errors.length > 0) {
    throw new Error(`context_manifest_invalid:${parsed.errors.join("|")}`);
  }

  const selected = selectDefaultContextPaths(parsed.manifest);
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

// This is the advisory startup set only. It does not restrict later reads or
// turn default Area/read-policy selection into a Context or edit permission.
export function selectDefaultContextPaths(
  manifest: ContextManifest,
): Map<string, Set<DefaultContextSelectionReason>> {
  const selected = new Map<string, Set<DefaultContextSelectionReason>>();
  const add = (
    value: string,
    reason: DefaultContextSelectionReason,
  ): boolean => {
    const normalized = normalizeContextPath(value);
    const reasons = selected.get(normalized) ?? new Set();
    const changed = !reasons.has(reason);
    reasons.add(reason);
    selected.set(normalized, reasons);
    return changed;
  };

  for (const core of [
    "project_context/context.toml",
    "project_context/global.md",
    "project_context/architecture.md",
  ])
    add(core, "core");

  for (const area of manifest.areas) {
    if (area.default) add(area.context, "default_area");
  }

  const children = new Map(
    manifest.contexts.map(
      (context) =>
        [
          normalizeContextPath(context.path),
          context.default_children.map(normalizeContextPath),
        ] as const,
    ),
  );
  const queue: string[] = [];
  const queued = new Set<string>();
  const enqueue = (contextPath: string): void => {
    if (queued.has(contextPath)) return;
    queued.add(contextPath);
    queue.push(contextPath);
  };
  for (const context of manifest.contexts) {
    if (context.read_policy !== "default") continue;
    const normalized = normalizeContextPath(context.path);
    add(normalized, "default_role");
    enqueue(normalized);
  }
  while (queue.length > 0) {
    const parent = queue.shift()!;
    for (const child of children.get(parent) ?? []) {
      add(child, "default_child");
      enqueue(child);
    }
  }
  return selected;
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

function normalizeContextPath(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\.\//u, "");
}
