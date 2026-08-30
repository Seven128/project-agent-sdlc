import { chmod, link, lstat, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import {
  assertSafeRepositoryFilePath,
  resolveInsideRepository,
} from "../repository-path-safety.js";
import { sha256Hex } from "../strict-codec.js";
import {
  captureMutationFileState,
  mutationPhysicalPath,
  mutationRecordedFileState,
  sameMutationRecordedState,
} from "./mutation-file-state.js";
import type {
  MutationFileChange,
  MutationFileState,
  MutationRecordedFileState,
  MutationTemporaryState,
} from "./mutation-types.js";

export {
  absentMutationFileState,
  assertMutationChangesContentState,
  assertMutationChangesCurrent,
  captureMutationFileState,
  mutationFileStateFromBytes,
} from "./mutation-file-state.js";

type MutationSide = "before" | "after";
type MutationDisposition = MutationSide | "conflict";
export type MutationBeforeSecondCas = (
  change: MutationFileChange,
) => Promise<void>;
export type MutationAfterTemporaryCreated = (
  change: MutationFileChange,
  side: MutationSide,
) => Promise<void>;

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
  side: MutationSide = "after",
  afterCreated?: MutationAfterTemporaryCreated,
): Promise<MutationTemporaryState | null> {
  const state = change[side];
  if (!state.exists) return null;
  if (!change.temporary_path) invalid(`temporary_path_missing:${change.path}`);
  const temporary = await assertSafeRepositoryFilePath(
    repository,
    change.temporary_path,
    "context_mutation_temporary",
    { destinationMayBeAbsent: true, allowHardlinks: true },
  );
  if (temporary.status) {
    const current = await captureMutationFileState(
      repository,
      change.temporary_path,
      { allow_hardlinks: true },
    );
    if (
      change.temporary_state?.side === side &&
      sameMutationRecordedState(current, change.temporary_state.state)
    )
      return change.temporary_state;
    invalid(`temporary_collision:${change.temporary_path}`);
  }
  const handle = await open(temporary.absolute, "wx", state.mode ?? 0o666);
  try {
    await handle.writeFile(stateBytes(state));
    await handle.sync();
  } finally {
    await handle.close();
  }
  if (state.mode !== null) await chmod(temporary.absolute, state.mode);
  await afterCreated?.(change, side);
  const captured = await captureMutationFileState(
    repository,
    change.temporary_path,
    { allow_hardlinks: true },
  );
  if (!samePayload(captured, state) || captured.identity?.nlink !== "1")
    invalid(`temporary_readback_mismatch:${change.temporary_path}`);
  return { side, state: mutationRecordedFileState(captured) };
}

export async function prepareMutationTemporaryForRecovery(
  repository: string,
  change: MutationFileChange,
  side: MutationSide,
  beforeSecondCas?: MutationBeforeSecondCas,
  afterCreated?: MutationAfterTemporaryCreated,
): Promise<MutationTemporaryState | null> {
  const desired = change[side];
  if (!change.temporary_path) invalid(`temporary_path_missing:${change.path}`);
  const temporary = await captureMutationFileState(
    repository,
    change.temporary_path,
    { allow_hardlinks: true },
  );
  if (temporary.exists) {
    if (
      desired.exists &&
      change.temporary_state?.side === side &&
      sameMutationRecordedState(temporary, change.temporary_state.state)
    )
      return change.temporary_state;
    if (
      desired.exists &&
      change.temporary_state?.side === side &&
      isOwnedDeletionRemainder(temporary, change.temporary_state.state)
    )
      return change.temporary_state;
    await removeOwnedTemporary(repository, change, temporary);
  }
  if (desired.exists)
    return stageMutationTemporary(repository, change, side, afterCreated);
  return stageDeletionTombstone(
    repository,
    change,
    side,
    beforeSecondCas,
    afterCreated,
  );
}

export async function applyMutationChangeForward(
  repository: string,
  change: MutationFileChange,
  beforeSecondCas?: MutationBeforeSecondCas,
): Promise<MutationRecordedFileState> {
  return applyMutationState(
    repository,
    change,
    "before",
    "after",
    beforeSecondCas,
  );
}

export async function applyMutationChangeBackward(
  repository: string,
  change: MutationFileChange,
  beforeSecondCas?: MutationBeforeSecondCas,
): Promise<MutationRecordedFileState> {
  return applyMutationState(
    repository,
    change,
    "after",
    "before",
    beforeSecondCas,
  );
}

export async function mutationChangeDisposition(
  repository: string,
  change: MutationFileChange,
): Promise<MutationDisposition> {
  await assertNoUnrecordedTemporary(repository, change);
  const current = await captureMutationFileState(
    repository,
    mutationPhysicalPath(change),
    {
      allow_hardlinks: true,
    },
  );
  if (matchesRecordedSide(current, change, "before")) return "before";
  if (matchesRecordedSide(current, change, "after")) return "after";
  return (
    (await ownedTemporaryTransition(repository, change, current)) ?? "conflict"
  );
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
  const current = await captureMutationFileState(
    repository,
    change.temporary_path,
    { allow_hardlinks: true },
  );
  await removeOwnedTemporary(repository, change, current);
}

async function applyMutationState(
  repository: string,
  change: MutationFileChange,
  expectedSide: MutationSide,
  desiredSide: MutationSide,
  beforeSecondCas?: MutationBeforeSecondCas,
): Promise<MutationRecordedFileState> {
  let disposition = await mutationChangeDisposition(repository, change);
  if (disposition === desiredSide)
    return captureDesiredEndpoint(repository, change, desiredSide);
  if (disposition !== expectedSide) invalid(`recovery_conflict:${change.path}`);

  const desired = change[desiredSide];
  const target = await assertSafeRepositoryFilePath(
    repository,
    mutationPhysicalPath(change),
    "context_mutation_commit_target",
    { destinationMayBeAbsent: true, allowHardlinks: !desired.exists },
  );
  if (desired.exists)
    await assertTemporaryReady(repository, change, desiredSide);
  else await assertDeletionTombstoneReady(repository, change, expectedSide);

  // This second cooperative CAS closes changes made during staging and path
  // acquisition. Publication remains a narrow rename/link/unlink window, not
  // a claim of hostile-writer filesystem atomicity.
  if (desired.exists) await beforeSecondCas?.(change);
  disposition = await mutationChangeDisposition(repository, change);
  if (disposition === desiredSide)
    return captureDesiredEndpoint(repository, change, desiredSide);
  if (disposition !== expectedSide)
    invalid(`second_cas_conflict:${change.path}`);

  if (!desired.exists) {
    if (!target.status) invalid(`deletion_target_missing:${change.path}`);
    await unlink(target.absolute);
  } else {
    const temporary = resolveInsideRepository(
      repository,
      change.temporary_path!,
      "context_mutation_commit_temporary",
    );
    if (change[expectedSide].exists) await rename(temporary, target.absolute);
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
  return captureDesiredEndpoint(repository, change, desiredSide);
}

async function captureDesiredEndpoint(
  repository: string,
  change: MutationFileChange,
  side: MutationSide,
): Promise<MutationRecordedFileState> {
  const current = await captureMutationFileState(
    repository,
    mutationPhysicalPath(change),
    {
      allow_hardlinks: true,
    },
  );
  const desired = change[side];
  if (!samePayload(current, desired))
    invalid(`post_commit_readback_mismatch:${change.path}`);
  const transition = await ownedTemporaryTransition(
    repository,
    change,
    current,
  );
  const recorded =
    side === "before" ? change.published_before : change.published_after;
  if (
    transition !== side &&
    !(recorded && sameMutationRecordedState(current, recorded)) &&
    !(desired.exists && sameMutationRecordedState(current, desired))
  )
    invalid(`post_commit_identity_mismatch:${change.path}`);
  return mutationRecordedFileState(current);
}

async function assertTemporaryReady(
  repository: string,
  change: MutationFileChange,
  side: MutationSide,
): Promise<void> {
  if (!change.temporary_path || change.temporary_state?.side !== side)
    invalid(`temporary_state_missing:${change.path}`);
  const temporary = await captureMutationFileState(
    repository,
    change.temporary_path,
    { allow_hardlinks: true },
  );
  if (!(
    (sameMutationRecordedState(temporary, change.temporary_state.state) &&
      temporary.identity?.nlink === "1") ||
    isOwnedDeletionRemainder(temporary, change.temporary_state.state)
  ))
    invalid(`temporary_identity_changed:${change.temporary_path}`);
}

function matchesRecordedSide(
  current: MutationFileState,
  change: MutationFileChange,
  side: MutationSide,
): boolean {
  const semantic = change[side];
  const published =
    side === "before" ? change.published_before : change.published_after;
  if (published && sameMutationRecordedState(current, published)) return true;
  if (semantic.exists) return sameMutationRecordedState(current, semantic);
  if (side !== "before") return false;
  const oppositePublished = change.published_after;
  return (
    oppositePublished === null && sameMutationRecordedState(current, semantic)
  );
}

async function ownedTemporaryTransition(
  repository: string,
  change: MutationFileChange,
  current: MutationFileState,
): Promise<MutationSide | null> {
  const prepared = change.temporary_state;
  if (!prepared || !change.temporary_path) return null;
  const temporary = await captureMutationFileState(
    repository,
    change.temporary_path!,
    { allow_hardlinks: true },
  );
  if (prepared.state.identity?.nlink === "2")
    return ownedDeletionTombstoneTransition(current, temporary, prepared);
  if (
    !current.exists ||
    !samePayload(current, change[prepared.side]) ||
    !sameFileObject(current, prepared.state)
  )
    return null;
  if (!temporary.exists)
    return current.identity?.nlink === "1" ? prepared.side : null;
  if (
    current.identity?.nlink === "2" &&
    temporary.identity?.nlink === "2" &&
    samePayload(temporary, change[prepared.side]) &&
    sameFileObject(current, temporary)
  )
    return prepared.side;
  return null;
}

function ownedDeletionTombstoneTransition(
  current: MutationFileState,
  temporary: MutationFileState,
  prepared: MutationTemporaryState,
): MutationSide | null {
  if (
    current.exists &&
    temporary.exists &&
    sameMutationRecordedState(current, prepared.state) &&
    sameMutationRecordedState(temporary, prepared.state)
  )
    return prepared.side;
  if (
    !current.exists &&
    temporary.exists &&
    isOwnedDeletionRemainder(temporary, prepared.state)
  )
    return oppositeSide(prepared.side);
  if (
    current.exists &&
    !temporary.exists &&
    isOwnedDeletionRemainder(current, prepared.state)
  )
    return prepared.side;
  return null;
}

async function removeOwnedTemporary(
  repository: string,
  change: MutationFileChange,
  temporary: MutationFileState,
): Promise<void> {
  if (!change.temporary_path || !change.temporary_state)
    invalid(
      `temporary_identity_unrecorded:${change.temporary_path ?? change.path}`,
    );
  const exact = sameMutationRecordedState(
    temporary,
    change.temporary_state.state,
  );
  let linkedPair = false;
  if (!exact && temporary.identity?.nlink === "2") {
    const target = await captureMutationFileState(
      repository,
      mutationPhysicalPath(change),
      { allow_hardlinks: true },
    );
    linkedPair =
      target.identity?.nlink === "2" &&
      sameFileObject(target, temporary) &&
      samePayload(temporary, change[change.temporary_state.side]) &&
      (await ownedTemporaryTransition(repository, change, target)) ===
        change.temporary_state.side;
  }
  const deletionRemainder =
    !exact &&
    change.temporary_state.state.identity?.nlink === "2" &&
    isOwnedDeletionRemainder(temporary, change.temporary_state.state) &&
    !(
      await captureMutationFileState(repository, mutationPhysicalPath(change), {
        allow_hardlinks: true,
      })
    ).exists;
  if (!exact && !linkedPair && !deletionRemainder)
    invalid(`temporary_identity_changed:${change.temporary_path}`);
  const absolute = resolveInsideRepository(
    repository,
    change.temporary_path,
    "context_mutation_temporary_cleanup",
  );
  await unlink(absolute);
  await syncParentDirectory(path.dirname(absolute));
}

function samePayload(
  current: MutationFileState,
  expected: MutationFileState,
): boolean {
  return (
    current.exists === expected.exists &&
    current.sha256 === expected.sha256 &&
    current.mode === expected.mode
  );
}

function sameFileObject(
  current: MutationFileState,
  expected: MutationRecordedFileState | MutationFileState,
): boolean {
  const left = current.identity;
  const right = expected.identity;
  return (
    left !== null &&
    right !== null &&
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtime_ns === right.mtime_ns
  );
}

async function stageDeletionTombstone(
  repository: string,
  change: MutationFileChange,
  desiredSide: MutationSide,
  beforeSecondCas?: MutationBeforeSecondCas,
  afterCreated?: MutationAfterTemporaryCreated,
): Promise<MutationTemporaryState> {
  const expectedSide = oppositeSide(desiredSide);
  if (!change[expectedSide].exists || change[desiredSide].exists)
    invalid(`deletion_transition_invalid:${change.path}`);
  let disposition = await mutationChangeDisposition(repository, change);
  if (disposition !== expectedSide) invalid(`recovery_conflict:${change.path}`);
  await beforeSecondCas?.(change);
  disposition = await mutationChangeDisposition(repository, change);
  if (disposition !== expectedSide)
    invalid(`second_cas_conflict:${change.path}`);
  const beforeLink = await captureMutationFileState(
    repository,
    mutationPhysicalPath(change),
  );
  if ((await mutationChangeDisposition(repository, change)) !== expectedSide)
    invalid(`second_cas_conflict:${change.path}`);
  const target = await assertSafeRepositoryFilePath(
    repository,
    mutationPhysicalPath(change),
    "context_mutation_deletion_target",
    { destinationMayBeAbsent: false },
  );
  const temporary = await assertSafeRepositoryFilePath(
    repository,
    change.temporary_path!,
    "context_mutation_deletion_tombstone",
    { destinationMayBeAbsent: true, allowHardlinks: true },
  );
  if (!target.status) invalid(`deletion_target_missing:${change.path}`);
  if (temporary.status) invalid(`temporary_collision:${change.temporary_path}`);
  try {
    await link(target.absolute, temporary.absolute);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      invalid(`temporary_collision:${change.temporary_path}`);
    throw error;
  }
  await afterCreated?.(change, expectedSide);
  const [targetState, temporaryState] = await Promise.all([
    captureMutationFileState(repository, mutationPhysicalPath(change), {
      allow_hardlinks: true,
    }),
    captureMutationFileState(repository, change.temporary_path!, {
      allow_hardlinks: true,
    }),
  ]);
  if (
    targetState.identity?.nlink !== "2" ||
    temporaryState.identity?.nlink !== "2" ||
    !sameMutationRecordedState(targetState, temporaryState) ||
    !samePayload(targetState, change[expectedSide]) ||
    !sameFileObject(targetState, beforeLink)
  )
    invalid(`deletion_tombstone_readback_mismatch:${change.path}`);
  await syncParentDirectory(path.dirname(temporary.absolute));
  return {
    side: expectedSide,
    state: mutationRecordedFileState(temporaryState),
  };
}

async function assertDeletionTombstoneReady(
  repository: string,
  change: MutationFileChange,
  expectedSide: MutationSide,
): Promise<void> {
  const prepared = change.temporary_state;
  if (
    !change.temporary_path ||
    !prepared ||
    prepared.side !== expectedSide ||
    prepared.state.identity?.nlink !== "2"
  )
    invalid(`deletion_tombstone_missing:${change.path}`);
  const [target, temporary] = await Promise.all([
    captureMutationFileState(repository, mutationPhysicalPath(change), {
      allow_hardlinks: true,
    }),
    captureMutationFileState(repository, change.temporary_path, {
      allow_hardlinks: true,
    }),
  ]);
  if (
    !sameMutationRecordedState(target, prepared.state) ||
    !sameMutationRecordedState(temporary, prepared.state)
  )
    invalid(`deletion_tombstone_identity_changed:${change.path}`);
}

async function assertNoUnrecordedTemporary(
  repository: string,
  change: MutationFileChange,
): Promise<void> {
  if (!change.temporary_path || change.temporary_state) return;
  const temporary = await captureMutationFileState(
    repository,
    change.temporary_path,
    { allow_hardlinks: true },
  );
  if (temporary.exists)
    invalid(
      `temporary_identity_unrecorded:${change.temporary_path}:manual_recovery_required_restore_exact_path_state_and_remove_only_the_verified_orphan`,
    );
}

function isOwnedDeletionRemainder(
  current: MutationFileState,
  recorded: MutationRecordedFileState,
): boolean {
  return (
    current.exists &&
    current.identity?.nlink === "1" &&
    recorded.identity?.nlink === "2" &&
    current.sha256 === recorded.sha256 &&
    current.mode === recorded.mode &&
    sameFileObject(current, recorded)
  );
}

function oppositeSide(side: MutationSide): MutationSide {
  return side === "before" ? "after" : "before";
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
