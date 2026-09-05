// File-maintenance lock extracted from the existing lock implementation.
// No task execution state or machine completion semantics live here.
import { randomUUID } from "node:crypto";
import type { BigIntStats } from "node:fs";
import { link, lstat, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./strict-codec.js";
import {
  ensureSafeRepositoryDirectory,
  assertSafeRepositoryFilePath,
} from "./repository-path-safety.js";
type MaintenanceOperation = "sync" | "upgrade" | "context_mutation" | "export";
interface MaintenanceLockOwner {
  schema_version: "maintenance-lock-owner-v1";
  lock_id: string;
  pid: number;
  operation: MaintenanceOperation;
  created_at: string;
}
interface MaintenanceLockSnapshot {
  bytes: Buffer;
  identity: BigIntStats;
  owner: MaintenanceLockOwner;
}
export async function withMaintenanceLock<T>(
  repository: string,
  operation: MaintenanceOperation,
  action: () => Promise<T>,
): Promise<T> {
  await ensureSafeRepositoryDirectory(
    repository,
    "tmp/ty-context",
    "maintenance_lock_parent",
  );
  const safe = await assertSafeRepositoryFilePath(
    repository,
    "tmp/ty-context/maintenance.lock",
    "maintenance_lock",
    { destinationMayBeAbsent: true },
  );
  const owner: MaintenanceLockOwner = {
    schema_version: "maintenance-lock-owner-v1",
    lock_id: randomUUID(),
    pid: process.pid,
    operation,
    created_at: new Date().toISOString(),
  };
  const bytes = Buffer.from(canonicalJson(owner));
  const lock = await acquireMaintenanceLock(safe.absolute, bytes, false);
  const snapshot = await readMaintenanceLockSnapshot(safe.absolute);
  assertLockSnapshotOwner(snapshot, bytes);
  try {
    return await action();
  } finally {
    await lock.close();
    await releaseMaintenanceLock(safe.absolute, bytes, snapshot.identity);
  }
}
async function acquireMaintenanceLock(
  lockFile: string,
  ownerBytes: Buffer,
  forceClear: boolean,
): Promise<import("node:fs/promises").FileHandle> {
  try {
    return await createMaintenanceLock(lockFile, ownerBytes);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  let stale: MaintenanceLockSnapshot;
  try {
    stale = await readMaintenanceLockSnapshot(lockFile);
  } catch (error) {
    throw new Error(
      `maintenance_compare_and_swap_failed:lock_unavailable:owner_unreadable_manual_recovery_required:${message(error)}`,
    );
  }
  if (stale.identity.nlink !== 1n)
    throw new Error(
      "maintenance_compare_and_swap_failed:lock_owner_hardlinked_manual_recovery_required",
    );
  if (processIsLive(stale.owner.pid))
    throw new Error(
      `maintenance_compare_and_swap_failed:lock_unavailable:live_owner:${stale.owner.pid}:${stale.owner.operation}`,
    );
  const claim = `${lockFile}.reclaim-${stale.owner.lock_id}`;
  try {
    await link(lockFile, claim);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new Error(
        `maintenance_compare_and_swap_failed:lock_reclaim_interrupted_manual_recovery_required:${forceClear ? "force_clear" : "automatic"}:${stale.owner.lock_id}`,
      );
    throw error;
  }
  let acquired: import("node:fs/promises").FileHandle | null = null;
  try {
    const [current, claimed] = await Promise.all([
      readMaintenanceLockSnapshot(lockFile),
      readMaintenanceLockSnapshot(claim),
    ]);
    assertSameLockSnapshot(current, claimed);
    assertClaimedLockTransition(current, stale);
    if (processIsLive(stale.owner.pid))
      throw new Error(
        `maintenance_compare_and_swap_failed:lock_unavailable:owner_became_live:${stale.owner.pid}`,
      );
    await unlink(lockFile);
    try {
      acquired = await createMaintenanceLock(lockFile, ownerBytes);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        throw new Error(
          "maintenance_compare_and_swap_failed:lock_unavailable:reclaim_lost",
        );
      throw error;
    }
  } catch (error) {
    await unlink(claim).catch(() => undefined);
    throw error;
  }
  try {
    await unlink(claim);
  } catch (error) {
    await acquired.close().catch(() => undefined);
    await removeOwnedAcquisition(lockFile, ownerBytes).catch(() => undefined);
    throw new Error(
      `maintenance_lock_reclaim_cleanup_failed:${message(error)}`,
    );
  }
  return acquired;
}

async function createMaintenanceLock(
  lockFile: string,
  ownerBytes: Buffer,
): Promise<import("node:fs/promises").FileHandle> {
  const handle = await open(lockFile, "wx");
  try {
    await handle.writeFile(ownerBytes);
    await handle.sync();
    return handle;
  } catch (error) {
    await handle.close().catch(() => undefined);
    await unlink(lockFile).catch(() => undefined);
    throw error;
  }
}

async function releaseMaintenanceLock(
  lockFile: string,
  ownerBytes: Buffer,
  identity: BigIntStats,
): Promise<void> {
  const current = await readMaintenanceLockSnapshot(lockFile).catch((error) => {
    throw new Error(
      `maintenance_lock_release_ownership_lost:${message(error)}`,
    );
  });
  if (
    !current.bytes.equals(ownerBytes) ||
    !sameLockIdentity(current.identity, identity)
  )
    throw new Error("maintenance_lock_release_ownership_lost");
  await unlink(lockFile);
}

async function readMaintenanceLockSnapshot(
  lockFile: string,
): Promise<MaintenanceLockSnapshot> {
  const before = await lstat(lockFile, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink())
    throw new Error("maintenance_lock_owner_unsafe");
  const bytes = await readFile(lockFile);
  const after = await lstat(lockFile, { bigint: true });
  if (!sameLockIdentity(before, after))
    throw new Error("maintenance_lock_owner_changed_during_read");
  if (after.ino === 0n)
    throw new Error("maintenance_lock_owner_identity_unavailable");
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`maintenance_lock_owner_invalid:${message(error)}`);
  }
  const owner = validateMaintenanceLockOwner(value);
  if (!bytes.equals(Buffer.from(canonicalJson(owner), "utf8")))
    throw new Error("maintenance_lock_owner_noncanonical");
  return { bytes, identity: after, owner };
}

function validateMaintenanceLockOwner(value: unknown): MaintenanceLockOwner {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("maintenance_lock_owner_object_required");
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).sort().join("\0") !==
      ["created_at", "lock_id", "operation", "pid", "schema_version"]
        .sort()
        .join("\0") ||
    row.schema_version !== "maintenance-lock-owner-v1" ||
    typeof row.lock_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
      row.lock_id,
    ) ||
    typeof row.pid !== "number" ||
    !Number.isSafeInteger(row.pid) ||
    row.pid <= 0 ||
    !maintenanceOperation(row.operation) ||
    typeof row.created_at !== "string" ||
    !Number.isFinite(Date.parse(row.created_at))
  )
    throw new Error("maintenance_lock_owner_invalid");
  return row as unknown as MaintenanceLockOwner;
}

function maintenanceOperation(value: unknown): value is MaintenanceOperation {
  return ["sync", "upgrade", "context_mutation", "export"].includes(
    value as MaintenanceOperation,
  );
}

function processIsLive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function assertLockSnapshotOwner(
  snapshot: MaintenanceLockSnapshot,
  ownerBytes: Buffer,
): void {
  if (!snapshot.bytes.equals(ownerBytes))
    throw new Error("maintenance_lock_acquire_ownership_lost");
}

function assertSameLockSnapshot(
  current: MaintenanceLockSnapshot,
  expected: MaintenanceLockSnapshot,
): void {
  if (
    !current.bytes.equals(expected.bytes) ||
    !sameLockIdentity(current.identity, expected.identity)
  )
    throw new Error(
      "maintenance_compare_and_swap_failed:lock_reclaim_owner_changed",
    );
}

function assertClaimedLockTransition(
  current: MaintenanceLockSnapshot,
  expected: MaintenanceLockSnapshot,
): void {
  if (
    !current.bytes.equals(expected.bytes) ||
    current.identity.dev !== expected.identity.dev ||
    current.identity.ino !== expected.identity.ino ||
    current.identity.size !== expected.identity.size ||
    current.identity.mode !== expected.identity.mode ||
    current.identity.mtimeNs !== expected.identity.mtimeNs ||
    current.identity.nlink !== 2n
  )
    throw new Error(
      "maintenance_compare_and_swap_failed:lock_reclaim_owner_changed",
    );
}

async function removeOwnedAcquisition(
  lockFile: string,
  ownerBytes: Buffer,
): Promise<void> {
  const current = await readMaintenanceLockSnapshot(lockFile);
  if (!current.bytes.equals(ownerBytes))
    throw new Error("maintenance_lock_acquire_cleanup_ownership_lost");
  await unlink(lockFile);
}

function sameLockIdentity(left: BigIntStats, right: BigIntStats): boolean {
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
function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
