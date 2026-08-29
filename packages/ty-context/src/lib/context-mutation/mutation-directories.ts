import { lstat, rmdir } from "node:fs/promises";
import path from "node:path";
import {
  assertProtectedRepositoryDirectory,
  ensureSafeRepositoryDirectory,
  resolveInsideRepository,
} from "../repository-path-safety.js";
import type {
  MutationDirectoryChange,
  MutationDirectoryStatus,
} from "./mutation-types.js";

export async function assertMutationDirectoriesAbsent(
  repository: string,
  directories: MutationDirectoryChange[],
): Promise<void> {
  const conflicts: string[] = [];
  for (const entry of directories)
    if ((await mutationDirectoryStatus(repository, entry)).state !== "absent")
      conflicts.push(entry.path);
  if (conflicts.length)
    invalid(`directory_cas_conflict:${conflicts.join(",")}`);
}

export async function prepareMutationDirectories(
  repository: string,
  directories: MutationDirectoryChange[],
): Promise<void> {
  for (const entry of directories)
    await ensureSafeRepositoryDirectory(
      repository,
      entry.path,
      "context_mutation_directory",
    );
}

export async function rollbackMutationDirectories(
  repository: string,
  directories: MutationDirectoryChange[],
): Promise<void> {
  for (const entry of [...directories].reverse()) {
    const status = await mutationDirectoryStatus(repository, entry);
    if (status.state === "absent") continue;
    if (status.state !== "directory")
      invalid(`directory_recovery_conflict:${entry.path}`);
    const absolute = await assertProtectedRepositoryDirectory(
      repository,
      path.join(repository, ...entry.path.split("/")),
      "context_mutation_directory_rollback",
    );
    try {
      await rmdir(absolute);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOTEMPTY")
        invalid(`directory_recovery_not_empty:${entry.path}`);
      throw error;
    }
  }
}

export async function mutationDirectoryStatus(
  repository: string,
  entry: MutationDirectoryChange,
): Promise<MutationDirectoryStatus> {
  const absolute = resolveInsideRepository(
    repository,
    entry.path,
    "context_mutation_directory_status",
  );
  const status = await lstat(absolute).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!status) return { path: entry.path, state: "absent" };
  if (status.isDirectory() && !status.isSymbolicLink()) {
    try {
      await assertProtectedRepositoryDirectory(
        repository,
        absolute,
        "context_mutation_directory_status",
      );
      return { path: entry.path, state: "directory" };
    } catch {
      return { path: entry.path, state: "conflict" };
    }
  }
  return { path: entry.path, state: "conflict" };
}

function invalid(reason: string): never {
  throw new Error(`context_mutation_invalid:${reason}`);
}
