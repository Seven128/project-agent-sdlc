import { lstat } from "node:fs/promises";
import path from "node:path";
import { listFiles } from "../fs.js";
import type { CatalogFile } from "./catalog-types.js";
import {
  compareUtf8Paths,
  normalizeContextPath,
  normalizeContextPathSpelling,
  portableContextPathCaseKey,
} from "./catalog-paths.js";
import { catalogDiagnostic } from "./catalog-diagnostics.js";
import type { CatalogDiagnostic } from "./catalog-types.js";

export interface CatalogDiscoveryResult {
  files: CatalogFile[];
  diagnostics: CatalogDiagnostic[];
}

export async function discoverContextMarkdownFiles(
  projectRoot: string,
  fileOverrides: ReadonlyMap<string, Uint8Array | null> = new Map(),
): Promise<CatalogDiscoveryResult> {
  const contextRoot = path.join(projectRoot, "project_context");
  const files = (await listFiles(contextRoot))
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .map((absolutePath) => ({
      absolutePath,
      physicalRelative: normalizeContextPathSpelling(
        path.relative(projectRoot, absolutePath),
      ),
    }))
    .sort((left, right) =>
      compareUtf8Paths(left.physicalRelative, right.physicalRelative),
    );
  const diagnostics: CatalogDiagnostic[] = [];
  const result = new Map<string, CatalogFile>();
  const physicalSpellings = new Map<string, string[]>();
  for (const { absolutePath, physicalRelative } of files) {
    const relative = normalizeContextPath(physicalRelative);
    const spellings = physicalSpellings.get(relative) ?? [];
    spellings.push(physicalRelative);
    physicalSpellings.set(relative, spellings);
    if (result.has(relative)) continue;
    const metadata = await lstat(absolutePath);
    result.set(relative, {
      path: relative,
      absolute_path: absolutePath,
      bytes: metadata.size,
    });
  }
  for (const [relative, spellings] of physicalSpellings) {
    const unique = [...new Set(spellings)].sort(compareUtf8Paths);
    if (unique.length < 2) continue;
    diagnostics.push(
      catalogDiagnostic(
        "context_path_unicode_collision",
        "error",
        `Context files ${unique.join(", ")} normalize to the same NFC repository path ${relative}`,
        { path: relative },
      ),
    );
  }
  for (const [relativeInput, bytes] of fileOverrides) {
    const relative = normalizeContextPath(relativeInput);
    if (
      !relative.startsWith("project_context/") ||
      !relative.toLowerCase().endsWith(".md")
    )
      continue;
    if (bytes === null) result.delete(relative);
    else
      result.set(relative, {
        path: relative,
        absolute_path: path.join(projectRoot, ...relative.split("/")),
        bytes: bytes.byteLength,
      });
  }
  addContextCaseCollisionDiagnostics(diagnostics, result.keys());
  return {
    files: [...result.values()].sort((left, right) =>
      compareUtf8Paths(left.path, right.path),
    ),
    diagnostics,
  };
}

function addContextCaseCollisionDiagnostics(
  diagnostics: CatalogDiagnostic[],
  paths: Iterable<string>,
): void {
  const folded = new Map<string, string[]>();
  for (const contextPath of paths) {
    const key = portableContextPathCaseKey(contextPath);
    const values = folded.get(key) ?? [];
    values.push(contextPath);
    folded.set(key, values);
  }
  for (const values of folded.values()) {
    const unique = [...new Set(values)].sort(compareUtf8Paths);
    if (unique.length < 2) continue;
    diagnostics.push(
      catalogDiagnostic(
        "context_path_case_collision",
        "error",
        `Context files ${unique.join(", ")} collide on a case-insensitive filesystem`,
        { path: unique[0] },
      ),
    );
  }
}
