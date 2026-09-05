import path from "node:path";
import { realpath } from "node:fs/promises";
import { pathExists } from "../fs.js";
import { assertSafeRepositoryFilePath } from "../repository-path-safety.js";
import { assertCatalogStagedFilePath } from "./catalog-staged-path-safety.js";
import { isPathWithin, normalizeContextPath } from "./catalog-paths.js";
import type { CatalogFile } from "./catalog-types.js";

const EXPORT_ARTIFACT_NAME_PATTERNS = [
  /full-project-context/iu,
  /当前项目context/iu,
  /当前项目代码实现(?:context)?/iu,
  /code-level-implementation/iu,
  /project-overview/iu,
  /context-bundle/iu,
  /context-summary/iu,
  /context-export/iu,
];

export type CatalogPathErrorReporter = (
  code: string,
  message: string,
  location?: { path?: string; line?: number },
) => void;

export async function validateCatalogManifestPath(
  projectRoot: string,
  rawPath: string,
  allowedRoot: string,
  source: string,
  allowFile: boolean,
  addError: CatalogPathErrorReporter,
  fileOverrides: ReadonlyMap<string, Uint8Array | null> = new Map(),
  directoryOverrides: ReadonlySet<string> = new Set(),
  filesByPath: ReadonlyMap<string, CatalogFile> = new Map(),
): Promise<boolean> {
  if (
    path.isAbsolute(rawPath) ||
    rawPath.replace(/\\/gu, "/").split("/").includes("..")
  ) {
    addError(
      "manifest_path_not_relative",
      `project_context/context.toml ${source} path must be relative and must not contain '..': ${rawPath}`,
    );
    return false;
  }
  const target = path.resolve(projectRoot, rawPath);
  if (!isPathWithin(allowedRoot, target)) {
    addError(
      "manifest_path_outside_allowed_root",
      `project_context/context.toml ${source} escapes its allowed root: ${rawPath}`,
    );
    return false;
  }
  const relative = normalizeContextPath(path.relative(projectRoot, target));
  const physicalRelative = filesByPath.get(relative)?.physical_path ?? relative;
  const physicalTarget = path.resolve(projectRoot, physicalRelative);
  if (allowFile && fileOverrides.has(relative)) {
    if (fileOverrides.get(relative) === null) {
      addError(
        "manifest_path_missing",
        `project_context/context.toml references missing context file: ${relative}`,
      );
      return false;
    }
    try {
      await assertCatalogStagedFilePath(
        projectRoot,
        physicalRelative,
        directoryOverrides,
        `catalog_staged_file:${source}`,
      );
      return true;
    } catch (error) {
      addError(
        "manifest_path_staged_unsafe",
        `project_context/context.toml ${source} staged path is unsafe: ${message(error)}`,
      );
      return false;
    }
  }
  const existingTarget = allowFile ? physicalTarget : target;
  if (!(await pathExists(existingTarget))) {
    addError(
      "manifest_path_missing",
      `project_context/context.toml references missing ${allowFile ? "context file" : "area root"}: ${normalizeContextPath(rawPath)}`,
    );
    return false;
  }
  const realAllowedRoot = await realpath(allowedRoot);
  const realTarget = await realpath(existingTarget);
  if (!isPathWithin(realAllowedRoot, realTarget)) {
    addError(
      "manifest_path_symlink_escape",
      `project_context/context.toml ${source} resolves through a symbolic link outside its allowed root: ${rawPath}`,
    );
    return false;
  }
  if (allowFile) {
    try {
      await assertSafeRepositoryFilePath(
        projectRoot,
        physicalRelative,
        `catalog_file:${source}`,
      );
    } catch (error) {
      addError(
        "manifest_path_unsafe_file",
        `Unsafe declared Context file ${rawPath}: ${message(error)}`,
      );
      return false;
    }
  }
  return true;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function looksLikeContextExportArtifact(value: string): boolean {
  return EXPORT_ARTIFACT_NAME_PATTERNS.some((pattern) => pattern.test(value));
}
