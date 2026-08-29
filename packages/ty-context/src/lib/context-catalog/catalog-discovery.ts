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
): Promise<CatalogFile[]> {
  const contextRoot = path.join(projectRoot, "project_context");
  const files = (await listFiles(contextRoot))
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .sort();
  const result: CatalogFile[] = [];
  for (const absolutePath of files) {
    const metadata = await lstat(absolutePath);
    result.push({
      path: normalizeContextPath(
        repositoryRelativePath(projectRoot, absolutePath),
      ),
      absolute_path: absolutePath,
      bytes: metadata.size,
    });
  }
  return result;
}
