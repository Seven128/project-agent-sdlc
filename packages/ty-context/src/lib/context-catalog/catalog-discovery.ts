import { lstat } from "node:fs/promises";
import path from "node:path";
import { listFiles } from "../fs.js";
import type { CatalogFile } from "./catalog-types.js";
import {
  normalizeContextPath,
  repositoryRelativePath,
} from "./catalog-paths.js";

export async function discoverContextMarkdownFiles(
  projectRoot: string,
  fileOverrides: ReadonlyMap<string, Uint8Array | null> = new Map(),
): Promise<CatalogFile[]> {
  const contextRoot = path.join(projectRoot, "project_context");
  const files = (await listFiles(contextRoot))
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .sort();
  const result = new Map<string, CatalogFile>();
  for (const absolutePath of files) {
    const metadata = await lstat(absolutePath);
    const relative = normalizeContextPath(
      repositoryRelativePath(projectRoot, absolutePath),
    );
    result.set(relative, {
      path: relative,
      absolute_path: absolutePath,
      bytes: metadata.size,
    });
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
  return [...result.values()].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
}
