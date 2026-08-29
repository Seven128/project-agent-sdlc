import { readFile } from "node:fs/promises";
import { assertSafeRepositoryFilePath } from "../repository-path-safety.js";
import { sha256Hex } from "../strict-codec.js";
import type {
  MutationFileChange,
  MutationFileIdentity,
  MutationFileState,
} from "./mutation-types.js";

export async function captureMutationFileState(
  repository: string,
  relative: string,
): Promise<MutationFileState> {
  let safe;
  try {
    safe = await assertSafeRepositoryFilePath(
      repository,
      relative,
      "context_mutation_snapshot",
      { destinationMayBeAbsent: true },
    );
  } catch (error) {
    if (/^protected_input_parent_not_found:/u.test(message(error)))
      return absentMutationFileState();
    throw error;
  }
  if (!safe.status) return absentMutationFileState();
  const bytes = await readFile(safe.absolute);
  return {
    exists: true,
    sha256: sha256Hex(bytes),
    bytes_base64: bytes.toString("base64"),
    mode: safe.status.mode & 0o777,
    identity: fileIdentity(safe.status),
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
    const current = await captureMutationFileState(repository, change.path);
    if (!sameSnapshot(current, change.before)) conflicts.push(change.path);
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
    const expected = change[side];
    const current = await captureMutationFileState(repository, change.path);
    if (
      !sameMutationContentState(current, expected) ||
      (expected.exists && current.mode !== expected.mode)
    )
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

function sameSnapshot(
  current: MutationFileState,
  expected: MutationFileState,
): boolean {
  return (
    sameMutationContentState(current, expected) &&
    current.mode === expected.mode &&
    sameIdentity(current.identity, expected.identity)
  );
}

function sameIdentity(
  left: MutationFileIdentity | null,
  right: MutationFileIdentity | null,
): boolean {
  if (left === null || right === null) return left === right;
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtime_ms === right.mtime_ms &&
    left.ctime_ms === right.ctime_ms
  );
}

function fileIdentity(status: import("node:fs").Stats): MutationFileIdentity {
  return {
    dev: status.dev,
    ino: status.ino,
    nlink: status.nlink,
    size: status.size,
    mtime_ms: status.mtimeMs,
    ctime_ms: status.ctimeMs,
  };
}

function invalid(reason: string): never {
  throw new Error(`context_mutation_invalid:${reason}`);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
