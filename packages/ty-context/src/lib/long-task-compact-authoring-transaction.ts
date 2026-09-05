import type { BigIntStats } from "node:fs";
import { chmod, lstat, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { sha256Hex } from "./strict-codec.js";

export interface CompactAuthoringFileSnapshotV1 {
  path: string;
  bytes: Buffer;
  sha256: string;
  identity: BigIntStats;
}

export interface CompactAuthoringTransactionEntryV1 {
  before: CompactAuthoringFileSnapshotV1;
  after: Buffer;
}

export interface CompactAuthoringTransactionHooksV1 {
  before_second_cas?: () => Promise<void>;
  before_publish?: (index: number) => Promise<void>;
  before_backup_cleanup?: (index: number) => Promise<void>;
}

interface StagedEntry {
  entry: CompactAuthoringTransactionEntryV1;
  temporary: string;
  backup: string;
  backed_up: boolean;
  published: boolean;
}

export async function captureCompactAuthoringFile(
  repository: string,
  file: string,
  label: string,
): Promise<CompactAuthoringFileSnapshotV1> {
  const protectedFile = await assertProtectedRepositoryFile(
    repository,
    file,
    label,
  );
  const before = await lstat(protectedFile, { bigint: true });
  const bytes = await readFile(protectedFile);
  const after = await lstat(protectedFile, { bigint: true });
  if (!sameIdentity(before, after))
    throw new Error(`compact_authoring_cas_conflict:${label}:read_race`);
  return {
    path: protectedFile,
    bytes,
    sha256: sha256Hex(bytes),
    identity: after,
  };
}

/**
 * Applies the two authoring carriers as one recoverable command transaction.
 * Staging, a second CAS, exact readback, and rollback all happen while the
 * caller owns the repository's Active-Authority lifecycle lock.
 */
export async function applyCompactAuthoringTransaction(
  repository: string,
  entries: CompactAuthoringTransactionEntryV1[],
  hooks: CompactAuthoringTransactionHooksV1 = {},
): Promise<string[]> {
  if (entries.length !== 2)
    throw new Error(
      `compact_authoring_transaction_invalid:exactly_two_files_required:${entries.length}`,
    );
  if (new Set(entries.map((entry) => normalized(entry.before.path))).size !== 2)
    throw new Error("compact_authoring_transaction_invalid:duplicate_target");
  const transactionId = randomUUID().replace(/-/gu, "");
  const staged: StagedEntry[] = entries.map((entry, index) => {
    const suffix = `${transactionId.slice(0, 20)}-${index}`;
    const parent = path.dirname(entry.before.path);
    const name = path.basename(entry.before.path);
    return {
      entry,
      temporary: path.join(parent, `.${name}.ty-context-compact-${suffix}.tmp`),
      backup: path.join(parent, `.${name}.ty-context-compact-${suffix}.bak`),
      backed_up: false,
      published: false,
    };
  });
  try {
    for (const item of staged) await stage(item);
    await hooks.before_second_cas?.();
    for (const item of staged)
      await assertSnapshotCurrent(repository, item.entry.before);

    try {
      for (const item of staged) {
        await rename(item.entry.before.path, item.backup);
        item.backed_up = true;
      }
      for (const [index, item] of staged.entries()) {
        await hooks.before_publish?.(index);
        await rename(item.temporary, item.entry.before.path);
        item.published = true;
      }
      for (const item of staged) {
        const current = await captureCompactAuthoringFile(
          repository,
          item.entry.before.path,
          "compact_authoring_readback",
        );
        if (!current.bytes.equals(item.entry.after))
          throw new Error(
            `compact_authoring_readback_mismatch:${display(item.entry.before.path)}`,
          );
      }
      for (const parent of new Set(
        staged.map((item) => path.dirname(item.entry.before.path)),
      ))
        await syncParentDirectory(parent);
    } catch (error) {
      await rollback(repository, staged, error);
      throw error;
    }
    // Both new carriers are committed. Cleanup must never roll back a carrier
    // after another original backup has already been removed.
    const cleanupFailures: string[] = [];
    for (const [index, item] of staged.entries()) {
      try {
        await hooks.before_backup_cleanup?.(index);
        await rm(item.backup, { force: true });
        item.backed_up = false;
      } catch (error) {
        cleanupFailures.push(`${display(item.backup)}:${message(error)}`);
      }
    }
    return cleanupFailures;
  } finally {
    for (const item of staged) {
      await rm(item.temporary, { force: true }).catch(() => undefined);
      if (!item.backed_up)
        await rm(item.backup, { force: true }).catch(() => undefined);
    }
  }
}

async function stage(item: StagedEntry): Promise<void> {
  const handle = await open(
    item.temporary,
    "wx",
    Number(item.entry.before.identity.mode & 0o777n),
  );
  try {
    await handle.writeFile(item.entry.after);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await chmod(item.temporary, Number(item.entry.before.identity.mode & 0o777n));
  const bytes = await readFile(item.temporary);
  const status = await lstat(item.temporary, { bigint: true });
  if (!status.isFile() || status.isSymbolicLink() || status.nlink !== 1n)
    throw new Error(
      `compact_authoring_temporary_invalid:${display(item.temporary)}`,
    );
  if (!bytes.equals(item.entry.after))
    throw new Error(
      `compact_authoring_temporary_readback_mismatch:${display(item.temporary)}`,
    );
}

async function assertSnapshotCurrent(
  repository: string,
  expected: CompactAuthoringFileSnapshotV1,
): Promise<void> {
  let current: CompactAuthoringFileSnapshotV1;
  try {
    current = await captureCompactAuthoringFile(
      repository,
      expected.path,
      "compact_authoring_second_cas",
    );
  } catch (error) {
    throw new Error(
      `compact_authoring_cas_conflict:${display(expected.path)}:${message(error)}`,
    );
  }
  if (
    !sameIdentity(expected.identity, current.identity) ||
    expected.sha256 !== current.sha256 ||
    !expected.bytes.equals(current.bytes)
  )
    throw new Error(
      `compact_authoring_cas_conflict:${display(expected.path)}:changed_since_analysis`,
    );
}

async function rollback(
  repository: string,
  staged: StagedEntry[],
  cause: unknown,
): Promise<void> {
  const failures: string[] = [];
  for (const item of [...staged].reverse()) {
    try {
      if (item.published) {
        await rm(item.entry.before.path, { force: true });
        item.published = false;
      }
      if (item.backed_up) {
        await rename(item.backup, item.entry.before.path);
        item.backed_up = false;
      }
    } catch (error) {
      failures.push(`${display(item.entry.before.path)}:${message(error)}`);
    }
  }
  if (!failures.length)
    for (const item of staged)
      try {
        const restored = await captureCompactAuthoringFile(
          repository,
          item.entry.before.path,
          "compact_authoring_rollback_readback",
        );
        if (
          restored.sha256 !== item.entry.before.sha256 ||
          !restored.bytes.equals(item.entry.before.bytes)
        )
          failures.push(`${display(item.entry.before.path)}:payload_mismatch`);
      } catch (error) {
        failures.push(`${display(item.entry.before.path)}:${message(error)}`);
      }
  if (failures.length)
    throw new Error(
      `compact_authoring_rollback_failed:${failures.join(",")}:original_error:${message(cause)}`,
    );
}

function sameIdentity(left: BigIntStats, right: BigIntStats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
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

function normalized(value: string): string {
  const resolved = path.resolve(value).replace(/\\/gu, "/");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function display(value: string): string {
  return value.replace(/\\/gu, "/");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
