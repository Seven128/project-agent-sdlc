import { randomUUID } from "node:crypto";
import path from "node:path";
import { ensureSafeRepositoryDirectory } from "./repository-path-safety.js";
import {
  captureMutationFileState,
  mutationFileStateFromBytes,
  absentMutationFileState,
} from "./context-mutation/mutation-file-state.js";
import {
  stageMutationTemporary,
  prepareMutationTemporaryForRecovery,
  applyMutationChangeForward,
  cleanupMutationTemporary,
  mutationTemporaryPath,
} from "./context-mutation/mutation-cas.js";
import type {
  MutationFileChange,
  MutationFileState,
} from "./context-mutation/mutation-types.js";

// Reuse the Context writer's path, byte/identity CAS and exclusive publication.
// Callers own cross-file ordering/recovery and hold the maintenance lock.
export async function writeMaintenanceText(
  repository: string,
  relative: string,
  text: string,
  expected?: MutationFileState,
): Promise<boolean> {
  const before =
    expected ?? (await captureMutationFileState(repository, relative));
  const bytes = Buffer.from(text);
  if (before.bytes_base64 === bytes.toString("base64")) return false;
  await ensureSafeRepositoryDirectory(
    repository,
    path.posix.dirname(relative),
    "maintenance_write_parent",
  );
  const mode =
    before.mode ??
    (process.platform === "win32" ? 0o666 : 0o666 & ~process.umask());
  const change: MutationFileChange = {
    path: relative,
    before,
    after: mutationFileStateFromBytes(bytes, mode),
    commit_order: 0,
    temporary_path: mutationTemporaryPath(relative, randomUUID(), 0),
    temporary_state: null,
    published_before: null,
    published_after: null,
  };
  change.temporary_state = await stageMutationTemporary(repository, change);
  try {
    change.published_after = await applyMutationChangeForward(
      repository,
      change,
    );
  } finally {
    await cleanupMutationTemporary(repository, change);
  }
  return true;
}

export async function removeMaintenanceFile(
  repository: string,
  relative: string,
  expected: MutationFileState,
): Promise<void> {
  if (!expected.exists) return;
  const change: MutationFileChange = {
    path: relative,
    before: expected,
    after: absentMutationFileState(),
    commit_order: 0,
    temporary_path: mutationTemporaryPath(relative, randomUUID(), 0),
    temporary_state: null,
    published_before: null,
    published_after: null,
  };
  change.temporary_state = await prepareMutationTemporaryForRecovery(
    repository,
    change,
    "after",
  );
  try {
    change.published_after = await applyMutationChangeForward(
      repository,
      change,
    );
  } finally {
    await cleanupMutationTemporary(repository, change);
  }
}
