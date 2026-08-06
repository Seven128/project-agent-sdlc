import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import {
  lstat,
  open,
  readFile,
  readdir,
  rename,
  rmdir,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { normalizeRepositoryFile } from "./long-task-paths.js";
import {
  assertProtectedRepositoryFile,
  assertSafeRepositoryFilePath,
  ensureSafeRepositoryDirectory,
  resolveInsideRepository,
} from "./repository-path-safety.js";
import { sha256Hex } from "./strict-codec.js";

export const DESIGN_RESOURCE_RECOVERY_ROOT =
  "tmp/ty-context/design-resource-recovery";
const execFileAsync = promisify(execFile);

export interface RecoveryFileSnapshot {
  relative: string;
  absolute: string;
  bytes: Buffer;
  raw_byte_digest: string;
  mode: number;
}

export function recoveryCheckpointRelativePath(sessionId: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u.test(sessionId))
    invalid(`unsafe_session_id:${sessionId}`);
  return `${DESIGN_RESOURCE_RECOVERY_ROOT}/${sessionId}/checkpoint.json`;
}

export async function readRecoveryRepositoryFile(
  repository: string,
  locatorInput: string,
  label: string,
): Promise<RecoveryFileSnapshot> {
  const relative = normalizeRepositoryFile(locatorInput, label);
  const absolute = resolveInsideRepository(repository, relative, label);
  const safe = await assertProtectedRepositoryFile(repository, absolute, label);
  const [bytes, status] = await Promise.all([readFile(safe), lstat(safe)]);
  return {
    relative,
    absolute: safe,
    bytes,
    raw_byte_digest: sha256Hex(bytes),
    mode: status.mode,
  };
}

export async function readRecoveryCheckpointFile(
  repository: string,
  sessionId: string,
): Promise<RecoveryFileSnapshot> {
  return readRecoveryRepositoryFile(
    repository,
    recoveryCheckpointRelativePath(sessionId),
    "design_resource_recovery_checkpoint",
  );
}

export async function createRecoveryCheckpointFile(
  repository: string,
  sessionId: string,
  bytes: Uint8Array,
): Promise<{ path: string; raw_byte_digest: string; changed: boolean }> {
  const relative = recoveryCheckpointRelativePath(sessionId);
  await assertRecoveryPathIgnored(repository, relative);
  await ensureRecoverySessionDirectory(repository, sessionId);
  const existing = await readOptionalRepositoryFile(repository, relative);
  const expectedDigest = sha256Hex(bytes);
  if (existing) {
    if (existing.raw_byte_digest !== expectedDigest)
      invalid(`checkpoint_collision:${relative}`);
    return { path: relative, raw_byte_digest: expectedDigest, changed: false };
  }
  const result = await atomicCasWrite(repository, relative, bytes, null, 0o600);
  return { path: relative, raw_byte_digest: result, changed: true };
}

export async function updateRecoveryCheckpointFile(
  repository: string,
  sessionId: string,
  bytes: Uint8Array,
  expectedCurrentDigest: string,
): Promise<{ path: string; raw_byte_digest: string; changed: boolean }> {
  const relative = recoveryCheckpointRelativePath(sessionId);
  await assertRecoveryPathIgnored(repository, relative);
  const existing = await readRecoveryCheckpointFile(repository, sessionId);
  if (existing.raw_byte_digest !== expectedCurrentDigest)
    invalid(
      `checkpoint_update_cas_conflict:${expectedCurrentDigest}:${existing.raw_byte_digest}`,
    );
  const nextDigest = sha256Hex(bytes);
  if (nextDigest === existing.raw_byte_digest)
    return { path: relative, raw_byte_digest: nextDigest, changed: false };
  const written = await atomicCasWrite(
    repository,
    relative,
    bytes,
    expectedCurrentDigest,
    existing.mode,
  );
  return { path: relative, raw_byte_digest: written, changed: true };
}

export async function atomicCasWrite(
  repository: string,
  relativeInput: string,
  bytes: Uint8Array,
  expectedCurrentDigest: string | null,
  mode: number,
): Promise<string> {
  const relative = normalizeRepositoryFile(
    relativeInput,
    "design_resource_recovery_write_target",
  );
  const destination = await assertSafeRepositoryFilePath(
    repository,
    relative,
    "design_resource_recovery_write_target",
    { destinationMayBeAbsent: true },
  );
  const current = await readOptionalRepositoryFile(repository, relative);
  assertExpectedDigest(current?.raw_byte_digest ?? null, expectedCurrentDigest);
  const digest = sha256Hex(bytes);
  const temporary = path.join(
    path.dirname(destination.absolute),
    `.${path.basename(destination.absolute)}.ty-context-dra-${randomUUID()}.tmp`,
  );
  let created = false;
  try {
    const handle = await open(temporary, "wx", mode & 0o777);
    created = true;
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    const tempBytes = await readFile(temporary);
    if (sha256Hex(tempBytes) !== digest) invalid("temporary_readback_mismatch");
    const beforeRename = await readOptionalRepositoryFile(repository, relative);
    assertExpectedDigest(
      beforeRename?.raw_byte_digest ?? null,
      expectedCurrentDigest,
    );
    await rename(temporary, destination.absolute);
    created = false;
    const after = await readRecoveryRepositoryFile(
      repository,
      relative,
      "design_resource_recovery_write_readback",
    );
    if (after.raw_byte_digest !== digest)
      invalid("post_write_readback_mismatch");
    return digest;
  } catch (error) {
    if (!created) throw error;
    try {
      await cleanupOwnedTemporary(temporary, digest);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "design_resource_recovery_cleanup_failed",
      );
    }
    throw error;
  }
}

export async function removeRecoveryCheckpointFile(
  repository: string,
  sessionId: string,
  expectedDigest: string,
): Promise<
  | {
      status: "removed";
      path: string;
      checkpoint_removed: true;
      session_directory_removed: true;
      retained_entries: [];
    }
  | {
      status: "partial";
      path: string;
      checkpoint_removed: boolean;
      session_directory_removed: false;
      retained_entries: string[];
      reason: "unowned_entries" | "session_directory_cleanup_failed";
    }
> {
  const snapshot = await readRecoveryCheckpointFile(repository, sessionId);
  if (snapshot.raw_byte_digest !== expectedDigest)
    invalid(
      `checkpoint_remove_cas_conflict:${expectedDigest}:${snapshot.raw_byte_digest}`,
    );
  const sessionDirectory = path.dirname(snapshot.absolute);
  const before = (await readdir(sessionDirectory)).sort();
  const unowned = before.filter((entry) => entry !== "checkpoint.json");
  if (unowned.length)
    return {
      status: "partial",
      path: snapshot.relative,
      checkpoint_removed: false,
      session_directory_removed: false,
      retained_entries: before,
      reason: "unowned_entries",
    };
  await unlink(snapshot.absolute);
  try {
    await rmdir(sessionDirectory);
  } catch {
    const retained = await readdir(sessionDirectory).catch(() => []);
    return {
      status: "partial",
      path: snapshot.relative,
      checkpoint_removed: true,
      session_directory_removed: false,
      retained_entries: retained.sort(),
      reason: "session_directory_cleanup_failed",
    };
  }
  return {
    status: "removed",
    path: snapshot.relative,
    checkpoint_removed: true,
    session_directory_removed: true,
    retained_entries: [],
  };
}

export function deriveDigestCasState(
  current: string,
  before: string,
  after: string,
): "unapplied" | "applied" | "conflict" {
  if (current === before) return "unapplied";
  if (current === after) return "applied";
  return "conflict";
}

async function ensureRecoverySessionDirectory(
  repository: string,
  sessionId: string,
): Promise<void> {
  const relative = `${DESIGN_RESOURCE_RECOVERY_ROOT}/${sessionId}`;
  await ensureSafeRepositoryDirectory(
    repository,
    relative,
    "design_resource_recovery_session",
  );
  const absolute = resolveInsideRepository(
    repository,
    relative,
    "design_resource_recovery_session",
  );
  const entries = await readdir(absolute);
  const collisions = entries.filter((entry) => entry !== "checkpoint.json");
  if (collisions.length)
    invalid(`session_directory_collision:${collisions.sort().join(",")}`);
}

async function assertRecoveryPathIgnored(
  repository: string,
  relative: string,
): Promise<void> {
  try {
    await execFileAsync("git", ["check-ignore", "--quiet", "--", relative], {
      cwd: repository,
      windowsHide: true,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 1)
      invalid(`checkpoint_path_not_ignored:${relative}`);
    throw error;
  }
  try {
    await execFileAsync(
      "git",
      ["ls-files", "--error-unmatch", "--", relative],
      { cwd: repository, windowsHide: true },
    );
    invalid(`checkpoint_path_tracked:${relative}`);
  } catch (error) {
    if ((error as { code?: number }).code !== 1) throw error;
  }
}

async function readOptionalRepositoryFile(
  repository: string,
  relative: string,
): Promise<RecoveryFileSnapshot | null> {
  try {
    return await readRecoveryRepositoryFile(
      repository,
      relative,
      "design_resource_recovery_optional_file",
    );
  } catch (error) {
    if ((error as Error).message.includes("protected_input_not_found:"))
      return null;
    throw error;
  }
}

function assertExpectedDigest(
  actual: string | null,
  expected: string | null,
): void {
  if (actual === expected) return;
  invalid(`cas_conflict:${expected ?? "absent"}:${actual ?? "absent"}`);
}

async function cleanupOwnedTemporary(
  temporary: string,
  expectedDigest: string,
): Promise<void> {
  const status = await lstat(temporary).catch(() => null);
  if (!status) return;
  if (status.isSymbolicLink() || !status.isFile())
    invalid("temporary_cleanup_collision");
  const digest = sha256Hex(await readFile(temporary));
  if (digest !== expectedDigest) invalid("temporary_cleanup_identity_mismatch");
  await unlink(temporary);
}

function invalid(reason: string): never {
  throw new Error(`design_resource_recovery_invalid:${reason}`);
}
