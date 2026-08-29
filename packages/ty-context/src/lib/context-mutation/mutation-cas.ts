import {
  chmod,
  link,
  lstat,
  open,
  readFile,
  rename,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import {
  assertSafeRepositoryFilePath,
  resolveInsideRepository,
} from "../repository-path-safety.js";
import { sha256Hex } from "../strict-codec.js";
import {
  captureMutationFileState,
  sameMutationContentState,
} from "./mutation-file-state.js";
import type {
  MutationFileChange,
  MutationFileState,
} from "./mutation-types.js";

export {
  absentMutationFileState,
  assertMutationChangesContentState,
  assertMutationChangesCurrent,
  captureMutationFileState,
  mutationFileStateFromBytes,
} from "./mutation-file-state.js";

export function mutationTemporaryPath(
  target: string,
  transactionId: string,
  index: number,
): string {
  const parent = path.posix.dirname(target);
  const name = path.posix.basename(target);
  return `${parent}/.${name}.ty-context-mutation-${transactionId.slice(0, 16)}-${index}.tmp`;
}

export async function stageMutationTemporary(
  repository: string,
  change: MutationFileChange,
  state: MutationFileState = change.after,
): Promise<void> {
  if (!state.exists || !change.temporary_path) return;
  const bytes = stateBytes(state);
  const temporary = await assertSafeRepositoryFilePath(
    repository,
    change.temporary_path,
    "context_mutation_temporary",
    { destinationMayBeAbsent: true },
  );
  if (temporary.status) {
    const existing = await readFile(temporary.absolute);
    if (sha256Hex(existing) === state.sha256) return;
    invalid(`temporary_collision:${change.temporary_path}`);
  }
  const handle = await open(temporary.absolute, "wx", state.mode ?? 0o666);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  if (state.mode !== null) await chmod(temporary.absolute, state.mode);
  const readback = await readFile(temporary.absolute);
  if (sha256Hex(readback) !== state.sha256)
    invalid(`temporary_readback_mismatch:${change.temporary_path}`);
}

export async function prepareMutationTemporaryForRecovery(
  repository: string,
  change: MutationFileChange,
  desired: MutationFileState,
): Promise<void> {
  if (!change.temporary_path) return;
  const temporary = await assertSafeRepositoryFilePath(
    repository,
    change.temporary_path,
    "context_mutation_recovery_temporary",
    { destinationMayBeAbsent: true },
  );
  if (temporary.status) {
    const digest = sha256Hex(await readFile(temporary.absolute));
    if (desired.exists && digest === desired.sha256) return;
    await unlink(temporary.absolute);
    await syncParentDirectory(path.dirname(temporary.absolute));
  }
  if (desired.exists) await stageMutationTemporary(repository, change, desired);
}

export async function applyMutationChangeForward(
  repository: string,
  change: MutationFileChange,
): Promise<void> {
  await applyMutationState(repository, change, change.before, change.after);
}

export async function applyMutationChangeBackward(
  repository: string,
  change: MutationFileChange,
): Promise<void> {
  await applyMutationState(repository, change, change.after, change.before);
}

export async function mutationChangeDisposition(
  repository: string,
  change: MutationFileChange,
): Promise<"before" | "after" | "conflict"> {
  const current = await captureMutationFileState(repository, change.path);
  if (sameMutationContentState(current, change.before)) return "before";
  if (sameMutationContentState(current, change.after)) return "after";
  return "conflict";
}

export async function cleanupMutationTemporary(
  repository: string,
  change: MutationFileChange,
): Promise<void> {
  if (!change.temporary_path) return;
  const absolute = resolveInsideRepository(
    repository,
    change.temporary_path,
    "context_mutation_temporary_cleanup",
  );
  const status = await lstat(absolute).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!status) return;
  if (status.isSymbolicLink() || !status.isFile())
    invalid(`temporary_cleanup_unsafe:${change.temporary_path}`);
  const digest = sha256Hex(await readFile(absolute));
  const owned = [change.before.sha256, change.after.sha256].includes(digest);
  if (!owned) invalid(`temporary_cleanup_identity:${change.temporary_path}`);
  await unlink(absolute);
}

async function applyMutationState(
  repository: string,
  change: MutationFileChange,
  expected: MutationFileState,
  desired: MutationFileState,
): Promise<void> {
  const disposition = await mutationChangeDisposition(repository, change);
  const expectedDisposition = expected === change.before ? "before" : "after";
  const desiredDisposition = desired === change.before ? "before" : "after";
  if (disposition === desiredDisposition) return;
  if (disposition !== expectedDisposition)
    invalid(`recovery_conflict:${change.path}`);
  const target = await assertSafeRepositoryFilePath(
    repository,
    change.path,
    "context_mutation_commit_target",
    { destinationMayBeAbsent: true },
  );
  if (!desired.exists) {
    if (!target.status) return;
    await unlink(target.absolute);
  } else {
    await stageMutationTemporary(repository, change, desired);
    if (!change.temporary_path)
      invalid(`temporary_path_missing:${change.path}`);
    const temporary = resolveInsideRepository(
      repository,
      change.temporary_path,
      "context_mutation_commit_temporary",
    );
    if (expected.exists) await rename(temporary, target.absolute);
    else {
      try {
        await link(temporary, target.absolute);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "EEXIST")
          invalid(`destination_collision:${change.path}`);
        throw error;
      }
      await unlink(temporary);
    }
  }
  await syncParentDirectory(path.dirname(target.absolute));
  const current = await captureMutationFileState(repository, change.path);
  if (!sameMutationContentState(current, desired))
    invalid(`post_commit_readback_mismatch:${change.path}`);
}

async function syncParentDirectory(directory: string): Promise<void> {
  let handle;
  try {
    handle = await open(directory, "r");
    await handle.sync();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (
      process.platform === "win32" &&
      ["EACCES", "EINVAL", "EPERM"].includes(code ?? "")
    )
      return;
    throw error;
  } finally {
    await handle?.close();
  }
}

function stateBytes(state: MutationFileState): Buffer {
  if (!state.exists || state.bytes_base64 === null || state.sha256 === null)
    invalid("file_state_bytes_missing");
  const bytes = Buffer.from(state.bytes_base64, "base64");
  if (sha256Hex(bytes) !== state.sha256) invalid("file_state_digest_mismatch");
  return bytes;
}

function invalid(reason: string): never {
  throw new Error(`context_mutation_invalid:${reason}`);
}
