import path from "node:path";
import { realpath } from "node:fs/promises";
import { pathExists } from "../fs.js";
import { isPathWithin, normalizeContextPath } from "./catalog-paths.js";

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
  if (!(await pathExists(target))) {
    addError(
      "manifest_path_missing",
      `project_context/context.toml references missing ${allowFile ? "context file" : "area root"}: ${normalizeContextPath(rawPath)}`,
    );
    return false;
  }
  const realAllowedRoot = await realpath(allowedRoot);
  const realTarget = await realpath(target);
  if (!isPathWithin(realAllowedRoot, realTarget)) {
    addError(
      "manifest_path_symlink_escape",
      `project_context/context.toml ${source} resolves through a symbolic link outside its allowed root: ${rawPath}`,
    );
    return false;
  }
  return true;
}

export function looksLikeContextExportArtifact(value: string): boolean {
  return EXPORT_ARTIFACT_NAME_PATTERNS.some((pattern) => pattern.test(value));
}
