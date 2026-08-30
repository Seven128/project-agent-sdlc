import { lstat } from "node:fs/promises";
import path from "node:path";
import {
  assertProtectedRepositoryDirectory,
  assertSafeRepositoryFilePath,
  resolveInsideRepository,
} from "../repository-path-safety.js";
import {
  normalizeContextPath,
  normalizeContextPathSpelling,
} from "./catalog-paths.js";

export async function assertCatalogStagedFilePath(
  repository: string,
  relative: string,
  stagedDirectories: ReadonlySet<string>,
  label: string,
): Promise<void> {
  const absolute = resolveInsideRepository(repository, relative, label);
  const parent = normalizeContextPathSpelling(path.posix.dirname(relative));
  let physicalCursor = "";
  for (const segment of parent.split("/")) {
    if (!segment || segment === ".") continue;
    physicalCursor = physicalCursor ? `${physicalCursor}/${segment}` : segment;
    const canonicalCursor = normalizeContextPath(physicalCursor);
    const candidate = path.join(repository, ...physicalCursor.split("/"));
    const status = await lstat(candidate).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null;
        throw error;
      },
    );
    if (!status) {
      if (!stagedDirectories.has(canonicalCursor))
        throw new Error(
          `staged_parent_not_declared:${label}:${canonicalCursor}`,
        );
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
