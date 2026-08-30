import type { BigIntStats } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import { assertSafeRepositoryFilePath } from "../repository-path-safety.js";
import { sha256Hex } from "../strict-codec.js";
import type {
  MutationFileChange,
  MutationFileIdentity,
  MutationRecordedFileState,
  MutationFileState,
} from "./mutation-types.js";

export async function captureMutationFileState(
  repository: string,
  relative: string,
  options: { allow_hardlinks?: boolean } = {},
): Promise<MutationFileState> {
  let safe;
  try {
    safe = await assertSafeRepositoryFilePath(
      repository,
      relative,
      "context_mutation_snapshot",
      {
        destinationMayBeAbsent: true,
        allowHardlinks: options.allow_hardlinks === true,
      },
    );
  } catch (error) {
    if (/^protected_input_parent_not_found:/u.test(message(error)))
      return absentMutationFileState();
    throw error;
  }
  if (!safe.status) return absentMutationFileState();
  const before = await lstat(safe.absolute, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink())
    invalid(`snapshot_target_unsafe:${relative}`);
  if (!options.allow_hardlinks && before.nlink !== 1n)
    invalid(`snapshot_target_hardlinked:${relative}`);
  const bytes = await readFile(safe.absolute);
  const after = await lstat(safe.absolute, { bigint: true });
  if (!sameBigIntStatus(before, after))
    invalid(`snapshot_changed_during_read:${relative}`);
  if (after.ino === 0n) invalid(`snapshot_identity_unavailable:${relative}`);
  return {
    exists: true,
    sha256: sha256Hex(bytes),
    bytes_base64: bytes.toString("base64"),
    mode: Number(after.mode & 0o777n),
    identity: fileIdentity(after),
  };
}

export function mutationFileStateFromBytes(
  bytes: Uint8Array,
  mode: number,
): MutationFileState {
  const buffer = Buffer.from(bytes);
  return {
    exists: true,
    sha256: sha256Hex(buffer),
    bytes_base64: buffer.toString("base64"),
    mode: mode & 0o777,
    identity: null,
  };
}

export function absentMutationFileState(): MutationFileState {
  return {
    exists: false,
    sha256: null,
    bytes_base64: null,
    mode: null,
    identity: null,
  };
}

export async function assertMutationChangesCurrent(
  repository: string,
  changes: MutationFileChange[],
): Promise<void> {
  const conflicts: string[] = [];
  for (const change of changes) {
    const current = await captureMutationFileState(
      repository,
      mutationPhysicalPath(change),
    );
    if (!sameMutationSnapshot(current, change.before))
      conflicts.push(change.path);
  }
  if (conflicts.length) invalid(`cas_conflict:${conflicts.sort().join(",")}`);
}

export async function assertMutationChangesContentState(
  repository: string,
  changes: MutationFileChange[],
  side: "before" | "after",
): Promise<void> {
  const conflicts: string[] = [];
  for (const change of changes) {
    const expected =
      side === "before"
        ? (change.published_before ?? change.before)
        : (change.published_after ?? change.after);
    const current = await captureMutationFileState(
      repository,
      mutationPhysicalPath(change),
    );
    if (!sameMutationRecordedState(current, expected))
      conflicts.push(change.path);
  }
  if (conflicts.length)
    invalid(`${side}_state_conflict:${conflicts.sort().join(",")}`);
}

export function sameMutationContentState(
  left: MutationFileState,
  right: MutationFileState,
): boolean {
  return left.exists === right.exists && left.sha256 === right.sha256;
}

export function mutationPhysicalPath(
  change: Pick<MutationFileChange, "path" | "physical_path">,
): string {
  return change.physical_path ?? change.path;
}

export function mutationRecordedFileState(
  state: MutationFileState,
): MutationRecordedFileState {
  return {
    exists: state.exists,
    sha256: state.sha256,
    mode: state.mode,
    identity: state.identity,
  };
}

export function sameMutationRecordedState(
  current: MutationFileState,
  expected: MutationRecordedFileState | MutationFileState,
): boolean {
  return (
    current.exists === expected.exists &&
    current.sha256 === expected.sha256 &&
    current.mode === expected.mode &&
    sameMutationIdentity(current.identity, expected.identity)
  );
}

export function sameMutationSnapshot(
  current: MutationFileState,
  expected: MutationFileState,
): boolean {
  return sameMutationRecordedState(current, expected);
}

export function sameMutationIdentity(
  left: MutationFileIdentity | null,
  right: MutationFileIdentity | null,
): boolean {
  if (left === null || right === null) return left === right;
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtime_ns === right.mtime_ns &&
    left.ctime_ns === right.ctime_ns
  );
}

function fileIdentity(status: BigIntStats): MutationFileIdentity {
  return {
    dev: status.dev.toString(10),
    ino: status.ino.toString(10),
    nlink: status.nlink.toString(10),
    size: status.size.toString(10),
    mtime_ns: status.mtimeNs.toString(10),
    ctime_ns: status.ctimeNs.toString(10),
  };
}

function sameBigIntStatus(left: BigIntStats, right: BigIntStats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mode === right.mode &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function invalid(reason: string): never {
  throw new Error(`context_mutation_invalid:${reason}`);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
