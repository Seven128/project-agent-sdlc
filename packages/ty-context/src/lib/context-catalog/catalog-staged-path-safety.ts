import { lstat } from "node:fs/promises";
import path from "node:path";
import {
  assertProtectedRepositoryDirectory,
  assertSafeRepositoryFilePath,
  resolveInsideRepository,
} from "../repository-path-safety.js";
import { normalizeContextPath } from "./catalog-paths.js";

export async function assertCatalogStagedFilePath(
  repository: string,
  relative: string,
  stagedDirectories: ReadonlySet<string>,
  label: string,
): Promise<void> {
  const absolute = resolveInsideRepository(repository, relative, label);
  const parent = normalizeContextPath(path.posix.dirname(relative));
  let cursor = "";
  for (const segment of parent.split("/")) {
    if (!segment || segment === ".") continue;
    cursor = cursor ? `${cursor}/${segment}` : segment;
    const candidate = path.join(repository, ...cursor.split("/"));
    const status = await lstat(candidate).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null;
        throw error;
      },
    );
    if (!status) {
      if (!stagedDirectories.has(cursor))
        throw new Error(`staged_parent_not_declared:${label}:${cursor}`);
      continue;
    }
    await assertProtectedRepositoryDirectory(
      repository,
      candidate,
      `${label}:parent`,
    );
  }
  const target = await lstat(absolute).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (target)
    await assertSafeRepositoryFilePath(repository, relative, label, {
      destinationMayBeAbsent: true,
    });
}
