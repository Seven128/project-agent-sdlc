import { randomUUID } from "node:crypto";
import type { BigIntStats } from "node:fs";
import {
  access,
  link,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
  canonicalJson,
  canonicalValueJson,
  sha256Hex,
} from "./strict-codec.js";
import type {
  CompiledDeliveryContractV2,
  FinalReceiptV2,
  FinalReceiptV3,
  InitialTaskBaseV2,
  ProgressRecordV2,
  VerifierIdentityV2,
} from "./long-task-delivery-types.js";
import {
  gitCommonDir,
  gitConfigGet,
  gitConfigSet,
  gitConfigUnset,
  gitPath,
} from "./long-task-workspace.js";
import { verifierAuthorityDiff } from "./long-task-verifier-authority.js";
import { deliveryCompileFreshness } from "./long-task-freshness.js";
import { assertNoUnfinishedContextMutationForAuthority } from "./context-mutation/mutation-journal.js";
import {
  assertActiveAuthorityLockToken,
  runWithActiveAuthorityLockToken,
} from "./long-task-active-authority-lock-context.js";
import type { AuthorityRevisionProposalV2 } from "./long-task-authority-revision-types.js";

const RUNTIME_FOLDER = ".ty-context";
const COMPILED_FILE = "compiled-contract.json";
const PROGRESS_FOLDER = "progress";
const AUTHORITY_PENDING_FILE = "authority-revision-pending.json";
const AUTHORITY_APPROVED_FILE = "authority-revision-approved.json";
const FINAL_FILE = "final-receipt.json";
const CONTRACT_FILE = "delivery-contract.yaml";

export interface ActiveLongTaskAuthorityV3 {
  schema_version: "active-long-task-authority-v3";
  task_id: string;
  repository_root: string;
  worktree_identity: string;
  workdir: string;
  active_authority_identity: string;
  authority_revision: number;
  initial_task_base: InitialTaskBaseV2;
  verifier_identity: VerifierIdentityV2;
  activated_at: string;
  authority_snapshot: CompiledDeliveryContractV2;
  authority_snapshot_sha256: string;
}

export type CompiledCacheStatusV3 =
  | "compiled_cache_matching"
  | "compiled_cache_missing_repairable"
  | "compiled_cache_mismatched_ignored";

export interface ActiveAuthorityLoadResultV3 {
  authority: ActiveLongTaskAuthorityV3 | null;
  source: "none" | "active_authority_v3";
  migrated: boolean;
}

export type ActiveAuthorityLockOperation =
  | "compile"
  | "commit"
  | "clear"
  | "abandon"
  | "migrate"
  | "external_confirmation"
  | "context_mutation"
  | "finalize";

export interface ActiveAuthorityLockToken {
  readonly repository_root: string;
  readonly operation: ActiveAuthorityLockOperation;
  readonly lock_id: string;
}

interface ActiveAuthorityLockOwnerV1 {
  schema_version: "active-authority-lock-owner-v1";
  lock_id: string;
  pid: number;
  operation: ActiveAuthorityLockOperation;
  created_at: string;
}

interface ActiveAuthorityLockSnapshot {
  bytes: Buffer;
  identity: BigIntStats;
  owner: ActiveAuthorityLockOwnerV1;
}

export interface ActiveAuthorityIdentityExpectation {
  task_id: string;
  authority_revision: number;
  compiled_identity: string;
  worktree_identity?: string;
}

export interface ClearActiveBindingCasOptions extends ActiveAuthorityIdentityExpectation {
  repository_root: string;
  workdir: string;
}

export interface StagedCompiledDeliveryContractV2 {
  publish(): Promise<void>;
  discard(): Promise<void>;
}

export interface PendingAuthorityRevisionV2 extends AuthorityRevisionProposalV2 {
  schema_version: "long-task-authority-revision-pending-v2";
  created_at: string;
}

export function runtimePath(workdir: string, file = ""): string {
  return path.join(path.resolve(workdir), RUNTIME_FOLDER, file);
}

export function worktreeIdentity(repositoryRoot: string): string {
  const normalized = normalizePath(repositoryRoot);
  return `wt-${sha256Hex(normalized)}`;
}

export async function activeRecordPath(
  repositoryRoot: string,
): Promise<string> {
  const identity = worktreeIdentity(repositoryRoot);
  return path.join(
    await gitCommonDir(repositoryRoot),
    "ty-context",
    "long-task",
    "worktrees",
    identity,
    "active.json",
  );
}

export async function activeAuthorityLockPath(
  repositoryRoot: string,
): Promise<string> {
  return `${await activeRecordPath(repositoryRoot)}.lock`;
}

export async function activeAuthorityLockExists(
  repositoryRoot: string,
): Promise<boolean> {
  return access(await activeAuthorityLockPath(repositoryRoot))
    .then(() => true)
    .catch(() => false);
}

export async function withActiveAuthorityLock<T>(
  repositoryRoot: string,
  operation: ActiveAuthorityLockOperation,
  action: (token: ActiveAuthorityLockToken) => Promise<T>,
): Promise<T> {
  return withActiveAuthorityLockInternal(
    repositoryRoot,
    operation,
    action,
    false,
  );
}

async function withActiveAuthorityLockInternal<T>(
  repositoryRoot: string,
  operation: ActiveAuthorityLockOperation,
  action: (token: ActiveAuthorityLockToken) => Promise<T>,
  breakStaleLock: boolean,
): Promise<T> {
  const root = path.resolve(repositoryRoot);
  const activeFile = await activeRecordPath(root);
  await mkdir(path.dirname(activeFile), { recursive: true });
  const lockFile = await activeAuthorityLockPath(root);
  const owner: ActiveAuthorityLockOwnerV1 = {
    schema_version: "active-authority-lock-owner-v1",
    lock_id: randomUUID(),
    pid: process.pid,
    operation,
    created_at: new Date().toISOString(),
  };
  const ownerBytes = Buffer.from(canonicalJson(owner), "utf8");
  const lock = await acquireActiveAuthorityLock(
    lockFile,
    ownerBytes,
    breakStaleLock,
  );
  const acquired = await readActiveAuthorityLockSnapshot(lockFile);
  assertLockSnapshotOwner(acquired, ownerBytes);
  try {
    const token = Object.freeze({
      repository_root: root,
      operation,
      lock_id: owner.lock_id,
    });
    return await runWithActiveAuthorityLockToken(token, () => action(token));
  } finally {
    await lock.close();
    await releaseActiveAuthorityLock(lockFile, ownerBytes, acquired.identity);
  }
}

async function acquireActiveAuthorityLock(
  lockFile: string,
  ownerBytes: Buffer,
  forceClear: boolean,
): Promise<import("node:fs/promises").FileHandle> {
  try {
    return await createActiveAuthorityLock(lockFile, ownerBytes);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  let stale: ActiveAuthorityLockSnapshot;
  try {
    stale = await readActiveAuthorityLockSnapshot(lockFile);
  } catch (error) {
    throw new Error(
      `active_authority_compare_and_swap_failed:lock_unavailable:owner_unreadable_manual_recovery_required:${message(error)}`,
    );
  }
  if (stale.identity.nlink !== 1n)
    throw new Error(
      "active_authority_compare_and_swap_failed:lock_owner_hardlinked_manual_recovery_required",
    );
  if (processIsLive(stale.owner.pid))
    throw new Error(
      `active_authority_compare_and_swap_failed:lock_unavailable:live_owner:${stale.owner.pid}:${stale.owner.operation}`,
    );
  const claim = `${lockFile}.reclaim-${stale.owner.lock_id}`;
  try {
    await link(lockFile, claim);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new Error(
        `active_authority_compare_and_swap_failed:lock_reclaim_interrupted_manual_recovery_required:${forceClear ? "force_clear" : "automatic"}:${stale.owner.lock_id}`,
      );
    throw error;
  }
  let acquired: import("node:fs/promises").FileHandle | null = null;
  try {
    const [current, claimed] = await Promise.all([
      readActiveAuthorityLockSnapshot(lockFile),
      readActiveAuthorityLockSnapshot(claim),
    ]);
    assertSameLockSnapshot(current, claimed);
    assertClaimedLockTransition(current, stale);
    if (processIsLive(stale.owner.pid))
      throw new Error(
        `active_authority_compare_and_swap_failed:lock_unavailable:owner_became_live:${stale.owner.pid}`,
      );
    await unlink(lockFile);
    try {
      acquired = await createActiveAuthorityLock(lockFile, ownerBytes);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        throw new Error(
          "active_authority_compare_and_swap_failed:lock_unavailable:reclaim_lost",
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
      `active_authority_lock_reclaim_cleanup_failed:${message(error)}`,
    );
  }
  return acquired;
}

async function createActiveAuthorityLock(
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

async function releaseActiveAuthorityLock(
  lockFile: string,
  ownerBytes: Buffer,
  identity: BigIntStats,
): Promise<void> {
  const current = await readActiveAuthorityLockSnapshot(lockFile).catch(
    (error) => {
      throw new Error(
        `active_authority_lock_release_ownership_lost:${message(error)}`,
      );
    },
  );
  if (
    !current.bytes.equals(ownerBytes) ||
    !sameLockIdentity(current.identity, identity)
  )
    throw new Error("active_authority_lock_release_ownership_lost");
  await unlink(lockFile);
}

async function readActiveAuthorityLockSnapshot(
  lockFile: string,
): Promise<ActiveAuthorityLockSnapshot> {
  const before = await lstat(lockFile, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink())
    throw new Error("active_authority_lock_owner_unsafe");
  const bytes = await readFile(lockFile);
  const after = await lstat(lockFile, { bigint: true });
  if (!sameLockIdentity(before, after))
    throw new Error("active_authority_lock_owner_changed_during_read");
  if (after.ino === 0n)
    throw new Error("active_authority_lock_owner_identity_unavailable");
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`active_authority_lock_owner_invalid:${message(error)}`);
  }
  const owner = validateActiveAuthorityLockOwner(value);
  if (!bytes.equals(Buffer.from(canonicalJson(owner), "utf8")))
    throw new Error("active_authority_lock_owner_noncanonical");
  return { bytes, identity: after, owner };
}

function validateActiveAuthorityLockOwner(
  value: unknown,
): ActiveAuthorityLockOwnerV1 {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("active_authority_lock_owner_object_required");
  const row = value as Record<string, unknown>;
  if (
    Object.keys(row).sort().join("\0") !==
      ["created_at", "lock_id", "operation", "pid", "schema_version"]
        .sort()
        .join("\0") ||
    row.schema_version !== "active-authority-lock-owner-v1" ||
    typeof row.lock_id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
      row.lock_id,
    ) ||
    typeof row.pid !== "number" ||
    !Number.isSafeInteger(row.pid) ||
    row.pid <= 0 ||
    !activeAuthorityLockOperation(row.operation) ||
    typeof row.created_at !== "string" ||
    !Number.isFinite(Date.parse(row.created_at))
  )
    throw new Error("active_authority_lock_owner_invalid");
  return row as unknown as ActiveAuthorityLockOwnerV1;
}

function activeAuthorityLockOperation(
  value: unknown,
): value is ActiveAuthorityLockOperation {
  return [
    "compile",
    "commit",
    "clear",
    "abandon",
    "migrate",
    "external_confirmation",
    "context_mutation",
    "finalize",
  ].includes(value as ActiveAuthorityLockOperation);
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
  snapshot: ActiveAuthorityLockSnapshot,
  ownerBytes: Buffer,
): void {
  if (!snapshot.bytes.equals(ownerBytes))
    throw new Error("active_authority_lock_acquire_ownership_lost");
}

function assertSameLockSnapshot(
  current: ActiveAuthorityLockSnapshot,
  expected: ActiveAuthorityLockSnapshot,
): void {
  if (
    !current.bytes.equals(expected.bytes) ||
    !sameLockIdentity(current.identity, expected.identity)
  )
    throw new Error(
      "active_authority_compare_and_swap_failed:lock_reclaim_owner_changed",
    );
}

function assertClaimedLockTransition(
  current: ActiveAuthorityLockSnapshot,
  expected: ActiveAuthorityLockSnapshot,
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
      "active_authority_compare_and_swap_failed:lock_reclaim_owner_changed",
    );
}

async function removeOwnedAcquisition(
  lockFile: string,
  ownerBytes: Buffer,
): Promise<void> {
  const current = await readActiveAuthorityLockSnapshot(lockFile);
  if (!current.bytes.equals(ownerBytes))
    throw new Error("active_authority_lock_acquire_cleanup_ownership_lost");
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

export async function writeCompiledDeliveryContract(
  compiled: CompiledDeliveryContractV2,
): Promise<void> {
  const staged = await stageCompiledDeliveryContract(compiled);
  try {
    await staged.publish();
  } catch (error) {
    await staged.discard();
    throw error;
  }
}

export async function stageCompiledDeliveryContract(
  compiled: CompiledDeliveryContractV2,
): Promise<StagedCompiledDeliveryContractV2> {
  const target = runtimePath(compiled.workdir, COMPILED_FILE);
  const temporary = await stageAtomicText(target, canonicalJson(compiled));
  let consumed = false;
  return {
    async publish() {
      if (consumed) throw new Error("compiled_cache_stage_already_consumed");
      await rename(temporary, target);
      consumed = true;
    },
    async discard() {
      if (consumed) return;
      consumed = true;
      await rm(temporary, { force: true });
    },
  };
}

export async function readCompiledDeliveryContract(
  workdir: string,
): Promise<CompiledDeliveryContractV2> {
  return validateCompiledDeliveryContract(
    await readJson(runtimePath(workdir, COMPILED_FILE)),
    path.resolve(workdir),
  );
}

export async function loadActiveLongTaskAuthority(
  repositoryRoot: string,
  _options: { migrate_legacy?: boolean } = {},
): Promise<ActiveAuthorityLoadResultV3> {
  return loadActiveLongTaskAuthorityUnlocked(path.resolve(repositoryRoot));
}

async function loadActiveLongTaskAuthorityUnlocked(
  root: string,
): Promise<ActiveAuthorityLoadResultV3> {
  const identity = worktreeIdentity(root);
  const [marker, raw] = await Promise.all([
    gitConfigGet(root, markerKey(identity)),
    readOptionalJson(await activeRecordPath(root)),
  ]);
  if (marker === null && raw === null)
    return { authority: null, source: "none", migrated: false };
  if (marker === null) throw new Error("active_binding_marker_missing");
  if (raw === null) throw new Error("active_binding_record_missing");
  const row = raw as Record<string, unknown>;
  if (row.schema_version === "active-long-task-authority-v3")
    return {
      authority: await validateActiveAuthorityV3(root, identity, marker, row),
      source: "active_authority_v3",
      migrated: false,
    };
  if (row.schema_version === "active-long-task-binding-v2")
    throw new Error("legacy_v2_active_authority_manual_required");
  throw new Error("active_authority_invalid:schema_version");
}

export async function loadActiveCompiledAuthority(
  repositoryRoot: string,
  workdir?: string,
  options: { migrate_legacy?: boolean } = {},
): Promise<CompiledDeliveryContractV2 | null> {
  const loaded = await loadActiveLongTaskAuthority(repositoryRoot, options);
  if (!loaded.authority) return null;
  if (
    workdir &&
    normalizePath(loaded.authority.workdir) !== normalizePath(workdir)
  )
    throw new Error("active_task_workdir_mismatch");
  return loaded.authority.authority_snapshot;
}

export async function readActiveLongTaskBinding(
  repositoryRoot: string,
): Promise<ActiveLongTaskAuthorityV3 | null> {
  return (await loadActiveLongTaskAuthority(repositoryRoot)).authority;
}

export async function inspectCompiledCache(
  authority: ActiveLongTaskAuthorityV3,
): Promise<CompiledCacheStatusV3> {
  try {
    const cache = await readCompiledDeliveryContract(authority.workdir);
    return cache.compiled_identity === authority.active_authority_identity
      ? "compiled_cache_matching"
      : "compiled_cache_mismatched_ignored";
  } catch (error) {
    return missingError(error)
      ? "compiled_cache_missing_repairable"
      : "compiled_cache_mismatched_ignored";
  }
}

export async function commitActiveAuthority(options: {
  candidate: CompiledDeliveryContractV2;
  expected_previous_identity: string | null;
}): Promise<ActiveLongTaskAuthorityV3> {
  const root = path.resolve(options.candidate.repository_root);
  const initial = await loadActiveLongTaskAuthorityUnlocked(root);
  const verifierDiff = initial.authority
    ? verifierAuthorityDiff(
        initial.authority.verifier_identity,
        options.candidate.verifier_identity,
      )
    : null;
  const operation: ActiveAuthorityLockOperation =
    initial.authority &&
    (verifierDiff?.verifier_content_changed ||
      verifierDiff?.verifier_runtime_locator_changed)
      ? "migrate"
      : "commit";
  return withActiveAuthorityLock(root, operation, async () => {
    await assertNoUnfinishedContextMutationForAuthority(root);
    const current = await loadActiveLongTaskAuthorityUnlocked(root);
    assertAuthorityCasCandidate(
      current.authority,
      options.candidate,
      options.expected_previous_identity,
    );
    await ensureRuntimeExcludes(root, options.candidate.workdir);
    const stale = await deliveryCompileFreshness(options.candidate);
    if (stale.length)
      throw new Error(`active_authority_candidate_stale:${stale.join(",")}`);
    const authority = activeAuthorityFromCompiled(
      options.candidate,
      current.authority?.activated_at ?? new Date().toISOString(),
    );
    await persistActiveAuthorityCasUnlocked(
      root,
      authority,
      options.expected_previous_identity,
    );
    return authority;
  });
}

export async function activateDeliveryContract(
  compiled: CompiledDeliveryContractV2,
): Promise<ActiveLongTaskAuthorityV3> {
  const current = await loadActiveLongTaskAuthority(compiled.repository_root);
  return commitActiveAuthority({
    candidate: compiled,
    expected_previous_identity:
      current.authority?.active_authority_identity ?? null,
  });
}

export async function assertMatchingActiveBinding(
  compiled: CompiledDeliveryContractV2,
): Promise<ActiveLongTaskAuthorityV3> {
  const active = (
    await loadActiveLongTaskAuthority(compiled.repository_root, {
      migrate_legacy: true,
    })
  ).authority;
  if (!active) throw new Error("active_task_missing");
  if (
    normalizePath(active.workdir) !== normalizePath(compiled.workdir) ||
    active.task_id !== compiled.task.id ||
    active.active_authority_identity !== compiled.compiled_identity ||
    active.authority_revision !== compiled.authority_revision ||
    active.worktree_identity !== worktreeIdentity(compiled.repository_root) ||
    !sameValue(active.verifier_identity, compiled.verifier_identity)
  )
    throw new Error("active_task_identity_mismatch");
  return active;
}

async function validateActiveAuthorityV3(
  root: string,
  identity: string,
  marker: string,
  row: Record<string, unknown>,
): Promise<ActiveLongTaskAuthorityV3> {
  if (
    typeof row.task_id !== "string" ||
    typeof row.repository_root !== "string" ||
    typeof row.worktree_identity !== "string" ||
    typeof row.workdir !== "string" ||
    typeof row.active_authority_identity !== "string" ||
    typeof row.authority_revision !== "number" ||
    !Number.isInteger(row.authority_revision) ||
    row.authority_revision < 1 ||
    typeof row.activated_at !== "string" ||
    typeof row.authority_snapshot_sha256 !== "string" ||
    !row.initial_task_base ||
    !row.verifier_identity ||
    !row.authority_snapshot
  )
    throw new Error("active_authority_invalid:shape");
  const authority = row as unknown as ActiveLongTaskAuthorityV3;
  if (marker !== markerValue(authority))
    throw new Error("marker_record_mismatch");
  if (authority.worktree_identity !== identity)
    throw new Error("active_authority_invalid:worktree_identity");
  if (normalizePath(authority.repository_root) !== normalizePath(root))
    throw new Error("active_authority_invalid:repository_identity");
  const snapshot = validateCompiledDeliveryContract(
    authority.authority_snapshot,
    path.resolve(authority.workdir),
  );
  if (
    sha256Hex(canonicalValueJson(snapshot)) !==
    authority.authority_snapshot_sha256
  )
    throw new Error("active_authority_invalid:snapshot_hash");
  if (
    authority.task_id !== snapshot.task.id ||
    normalizePath(authority.repository_root) !==
      normalizePath(snapshot.repository_root) ||
    normalizePath(authority.workdir) !== normalizePath(snapshot.workdir) ||
    authority.active_authority_identity !== snapshot.compiled_identity ||
    authority.authority_revision !== snapshot.authority_revision ||
    !sameValue(authority.initial_task_base, snapshot.initial_task_base) ||
    !sameValue(authority.verifier_identity, snapshot.verifier_identity)
  )
    throw new Error("active_authority_invalid:snapshot_binding");
  await assertActiveWorkdir(authority.workdir);
  return authority;
}

function validateCompiledDeliveryContract(
  value: unknown,
  expectedWorkdir?: string,
): CompiledDeliveryContractV2 {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("compiled_contract_invalid:shape");
  const compiled = value as CompiledDeliveryContractV2;
  if (
    compiled.schema_version !== "compiled-long-task-delivery-v2" ||
    typeof compiled.compiled_identity !== "string" ||
    typeof compiled.repository_root !== "string" ||
    typeof compiled.workdir !== "string"
  )
    throw new Error("compiled_contract_invalid:schema_version");
  const { compiled_identity: compiledIdentity, ...unsigned } = compiled;
  if (sha256Hex(canonicalValueJson(unsigned)) !== compiledIdentity)
    throw new Error("compiled_contract_invalid:identity");
  if (
    expectedWorkdir &&
    normalizePath(expectedWorkdir) !== normalizePath(compiled.workdir)
  )
    throw new Error("compiled_contract_invalid:workdir");
  return compiled;
}

function activeAuthorityFromCompiled(
  compiled: CompiledDeliveryContractV2,
  activatedAt: string,
): ActiveLongTaskAuthorityV3 {
  const authoritySnapshot = validateCompiledDeliveryContract(
    compiled,
    compiled.workdir,
  );
  return {
    schema_version: "active-long-task-authority-v3",
    task_id: authoritySnapshot.task.id,
    repository_root: path.resolve(authoritySnapshot.repository_root),
    worktree_identity: worktreeIdentity(authoritySnapshot.repository_root),
    workdir: path.resolve(authoritySnapshot.workdir),
    active_authority_identity: authoritySnapshot.compiled_identity,
    authority_revision: authoritySnapshot.authority_revision,
    initial_task_base: authoritySnapshot.initial_task_base,
    verifier_identity: authoritySnapshot.verifier_identity,
    activated_at: activatedAt,
    authority_snapshot: authoritySnapshot,
    authority_snapshot_sha256: sha256Hex(canonicalValueJson(authoritySnapshot)),
  };
}

function assertAuthorityCasCandidate(
  current: ActiveLongTaskAuthorityV3 | null,
  candidate: CompiledDeliveryContractV2,
  expectedPreviousIdentity: string | null,
): void {
  const currentIdentity = current?.active_authority_identity ?? null;
  if (currentIdentity !== expectedPreviousIdentity)
    throw new Error("active_authority_compare_and_swap_failed");
  if (!current) {
    if (candidate.authority_revision !== 1)
      throw new Error("active_authority_revision_invalid:new_task");
    return;
  }
  if (
    normalizePath(current.workdir) !== normalizePath(candidate.workdir) ||
    current.task_id !== candidate.task.id
  )
    throw new Error(`active_task_exists:${current.workdir}`);
  if (!sameValue(current.initial_task_base, candidate.initial_task_base))
    throw new Error("active_authority_initial_task_base_changed");
  if (currentIdentity === candidate.compiled_identity) {
    if (candidate.authority_revision !== current.authority_revision)
      throw new Error("active_authority_revision_invalid:unchanged_identity");
    return;
  }
  if (candidate.authority_revision !== current.authority_revision + 1)
    throw new Error("active_authority_revision_invalid:expected_increment");
}

async function persistActiveAuthorityCasUnlocked(
  root: string,
  authority: ActiveLongTaskAuthorityV3,
  expectedPreviousIdentity: string | null,
): Promise<void> {
  const activeFile = await activeRecordPath(root);
  await mkdir(path.dirname(activeFile), { recursive: true });
  const current = await loadActiveLongTaskAuthorityUnlocked(root);
  assertAuthorityCasCandidate(
    current.authority,
    authority.authority_snapshot,
    expectedPreviousIdentity,
  );
  const identity = worktreeIdentity(root);
  const key = markerKey(identity);
  const [oldRecord, oldMarker] = await Promise.all([
    readOptionalText(activeFile),
    gitConfigGet(root, key),
  ]);
  try {
    await atomicJson(activeFile, authority);
    await gitConfigSet(root, key, markerValue(authority));
  } catch (error) {
    try {
      if (oldRecord === null) await rm(activeFile, { force: true });
      else await atomicText(activeFile, oldRecord);
      if (oldMarker === null) await gitConfigUnset(root, key);
      else await gitConfigSet(root, key, oldMarker);
    } catch (rollbackError) {
      throw new Error(
        `active_authority_commit_rollback_failed:${message(rollbackError)}`,
      );
    }
    throw new Error(`active_authority_commit_failed:${message(error)}`);
  }
}

async function assertActiveWorkdir(workdir: string): Promise<void> {
  await access(workdir).catch(() => {
    throw new Error("active_binding_workdir_missing");
  });
  await access(path.join(workdir, CONTRACT_FILE)).catch(() => {
    throw new Error("active_binding_contract_missing");
  });
}

function markerValue(authority: ActiveLongTaskAuthorityV3): string {
  return [
    authority.task_id,
    String(authority.authority_revision),
    authority.active_authority_identity,
  ].join("|");
}

function sameValue(left: unknown, right: unknown): boolean {
  return canonicalValueJson(left) === canonicalValueJson(right);
}

export async function writeProgressRecord(
  workdir: string,
  record: ProgressRecordV2,
): Promise<void> {
  await atomicJson(
    runtimePath(
      workdir,
      path.join(PROGRESS_FOLDER, `${record.check_internal_id}.json`),
    ),
    record,
  );
}

export async function readProgressRecords(
  workdir: string,
): Promise<Record<string, ProgressRecordV2>> {
  const folder = runtimePath(workdir, PROGRESS_FOLDER);
  const names = await readdir(folder).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const rows: Record<string, ProgressRecordV2> = {};
  for (const name of names.filter((name) => name.endsWith(".json")).sort()) {
    const value = (await readJson(path.join(folder, name))) as ProgressRecordV2;
    if (value.schema_version !== "long-task-progress-record-v2")
      throw new Error(`progress_record_invalid:${name}`);
    rows[value.check_internal_id] = value;
  }
  return rows;
}

export async function writePendingAuthorityRevision(
  workdir: string,
  pending: PendingAuthorityRevisionV2,
): Promise<void> {
  await atomicJson(runtimePath(workdir, AUTHORITY_PENDING_FILE), pending);
  await rm(runtimePath(workdir, AUTHORITY_APPROVED_FILE), { force: true });
}

export async function readPendingAuthorityRevision(
  workdir: string,
): Promise<PendingAuthorityRevisionV2 | null> {
  return (await readOptionalJson(
    runtimePath(workdir, AUTHORITY_PENDING_FILE),
  )) as PendingAuthorityRevisionV2 | null;
}

export async function approvePendingAuthorityRevision(
  workdir: string,
  revision: string,
): Promise<void> {
  const pending = await readPendingAuthorityRevision(workdir);
  if (!pending || pending.revision_identity !== revision)
    throw new Error("authority_revision_not_found_or_mismatched");
  await atomicJson(runtimePath(workdir, AUTHORITY_APPROVED_FILE), {
    schema_version: "long-task-authority-revision-approved-v2",
    revision_identity: revision,
    approved_at: new Date().toISOString(),
  });
}

export async function authorityRevisionApproved(
  workdir: string,
  revision: string,
): Promise<boolean> {
  const value = (await readOptionalJson(
    runtimePath(workdir, AUTHORITY_APPROVED_FILE),
  )) as { revision_identity?: unknown } | null;
  return value?.revision_identity === revision;
}

export async function clearAuthorityRevision(workdir: string): Promise<void> {
  await Promise.all([
    rm(runtimePath(workdir, AUTHORITY_PENDING_FILE), { force: true }),
    rm(runtimePath(workdir, AUTHORITY_APPROVED_FILE), { force: true }),
  ]);
}

export async function invalidateDerivedProgress(
  workdir: string,
): Promise<void> {
  await Promise.all([
    rm(runtimePath(workdir, PROGRESS_FOLDER), { recursive: true, force: true }),
    rm(runtimePath(workdir, FINAL_FILE), { force: true }),
  ]);
}

export function sealFinalReceipt(
  unsigned: Omit<FinalReceiptV3, "receipt_sha256">,
): FinalReceiptV3 {
  return {
    ...unsigned,
    receipt_sha256: sha256Hex(canonicalValueJson(unsigned)),
  };
}

export async function commitFinalReceiptTransaction(input: {
  lock_token: ActiveAuthorityLockToken;
  repository_root: string;
  workdir: string;
  unsigned: Omit<FinalReceiptV3, "receipt_sha256">;
  expected_authority: ActiveAuthorityIdentityExpectation;
  close_on_accept: boolean;
  validate_current: (
    phase:
      "after_receipt_stage" | "after_receipt_publish" | "after_authority_clear",
  ) => Promise<void>;
}): Promise<FinalReceiptV3> {
  const root = path.resolve(input.repository_root);
  assertFinalizationLockToken(input.lock_token, root);
  const active = await assertCurrentAuthorityCas(
    root,
    input.workdir,
    input.expected_authority,
  );
  const receipt = sealFinalReceipt(input.unsigned);
  const content = canonicalJson(receipt);
  const workdirReceipt = runtimePath(input.workdir, FINAL_FILE);
  const auditReceipt = await auditReceiptPath(root);
  const activeFile = await activeRecordPath(root);
  const marker = markerKey(worktreeIdentity(root));
  const [oldWorkdirReceipt, oldAuditReceipt, oldActiveRecord, oldMarker] =
    await Promise.all([
      readOptionalText(workdirReceipt),
      readOptionalText(auditReceipt),
      readOptionalText(activeFile),
      gitConfigGet(root, marker),
    ]);
  if (oldActiveRecord === null || oldMarker !== markerValue(active))
    throw new Error("finalization_authority_persistence_cas_failed");
  const stagedWorkdirReceipt = await stageAtomicText(workdirReceipt, content);
  const stagedAuditReceipt = await stageAtomicText(auditReceipt, content);
  let activeBackup: string | null = null;
  try {
    await input.validate_current("after_receipt_stage");
    await assertCurrentAuthorityCas(
      root,
      input.workdir,
      input.expected_authority,
    );
    await rename(stagedWorkdirReceipt, workdirReceipt);
    await rename(stagedAuditReceipt, auditReceipt);
    await input.validate_current("after_receipt_publish");
    await assertCurrentAuthorityCas(
      root,
      input.workdir,
      input.expected_authority,
    );
    if (input.close_on_accept) {
      activeBackup = `${activeFile}.finalize-${process.pid}-${Date.now()}`;
      await rename(activeFile, activeBackup);
      if ((await readFile(activeBackup, "utf8")) !== oldActiveRecord)
        throw new Error("finalization_authority_record_changed_before_clear");
      if ((await gitConfigGet(root, marker)) !== oldMarker)
        throw new Error("finalization_authority_marker_changed_before_clear");
      await gitConfigUnset(root, marker);
      await input.validate_current("after_authority_clear");
      if ((await readOptionalText(activeFile)) !== null)
        throw new Error("finalization_authority_reappeared_during_clear");
      if ((await gitConfigGet(root, marker)) !== null)
        throw new Error(
          "finalization_authority_marker_reappeared_during_clear",
        );
      await rm(activeBackup, { force: true });
      activeBackup = null;
    }
    return receipt;
  } catch (error) {
    await Promise.allSettled([
      restoreOptionalText(workdirReceipt, oldWorkdirReceipt),
      restoreOptionalText(auditReceipt, oldAuditReceipt),
      restoreAuthorityAfterFinalizationFailure({
        active_file: activeFile,
        active_backup: activeBackup,
        old_active_record: oldActiveRecord,
        repository_root: root,
        marker,
        old_marker: oldMarker,
      }),
    ]).then((results) => {
      const rejected = results.find((result) => result.status === "rejected");
      if (rejected?.status === "rejected")
        throw new Error(
          `finalization_transaction_rollback_failed:${message(rejected.reason)}`,
        );
    });
    throw error;
  } finally {
    await Promise.all([
      rm(stagedWorkdirReceipt, { force: true }),
      rm(stagedAuditReceipt, { force: true }),
    ]);
  }
}

export async function readFinalReceipt(
  _repositoryRoot: string,
  workdir: string,
): Promise<FinalReceiptV2 | null> {
  const value = await readOptionalJson(runtimePath(workdir, FINAL_FILE));
  if (value === null) return null;
  const receipt = value as FinalReceiptV2;
  const { receipt_sha256: receiptHash, ...unsigned } = receipt;
  if (
    !["long-task-final-receipt-v2", "long-task-final-receipt-v3"].includes(
      receipt.schema_version,
    ) ||
    receipt.authority_scope !== "audit_only" ||
    receipt.reusable_for_acceptance !== false ||
    (receipt.finalization_identity_sha256 !== undefined &&
      !/^[a-f0-9]{64}$/u.test(receipt.finalization_identity_sha256)) ||
    sha256Hex(canonicalValueJson(unsigned)) !== receiptHash
  )
    throw new Error("final_receipt_integrity_mismatch");
  if (
    (receipt.schema_version === "long-task-final-receipt-v2" &&
      receipt.workflow_status === "delivery_accepted") ||
    (receipt.schema_version === "long-task-final-receipt-v3" &&
      (receipt.workflow_status === "machine_accepted_external_pending" ||
        !Array.isArray(receipt.external_confirmation_results)))
  )
    throw new Error("final_receipt_schema_status_mismatch");
  return receipt;
}

export function activeAuthorityIdentityMatches(
  authority: ActiveLongTaskAuthorityV3,
  expected: ActiveAuthorityIdentityExpectation,
): boolean {
  return (
    authority.task_id === expected.task_id &&
    authority.authority_revision === expected.authority_revision &&
    authority.active_authority_identity === expected.compiled_identity &&
    authority.worktree_identity ===
      (expected.worktree_identity ?? authority.worktree_identity)
  );
}

export async function clearActiveBindingCas(
  options: ClearActiveBindingCasOptions,
): Promise<boolean> {
  const root = path.resolve(options.repository_root);
  return withActiveAuthorityLock(root, "clear", async () =>
    clearActiveBindingCasUnlocked(root, options),
  );
}

async function clearActiveBindingCasUnlocked(
  root: string,
  options: ClearActiveBindingCasOptions,
): Promise<boolean> {
  const loaded = await loadActiveLongTaskAuthorityUnlocked(root);
  const active = loaded.authority;
  if (
    !active ||
    normalizePath(active.workdir) !== normalizePath(options.workdir) ||
    !activeAuthorityIdentityMatches(active, options)
  )
    throw new Error("active_authority_clear_compare_and_swap_failed");
  const activeFile = await activeRecordPath(root);
  const key = markerKey(worktreeIdentity(root));
  const [oldRecord, oldMarker] = await Promise.all([
    readOptionalText(activeFile),
    gitConfigGet(root, key),
  ]);
  try {
    await rm(activeFile, { force: true });
    await gitConfigUnset(root, key);
  } catch (error) {
    try {
      if (oldRecord !== null) await atomicText(activeFile, oldRecord);
      if (oldMarker !== null) await gitConfigSet(root, key, oldMarker);
    } catch (rollbackError) {
      throw new Error(
        `active_authority_clear_rollback_failed:${message(rollbackError)}`,
      );
    }
    throw new Error(`active_authority_clear_failed:${message(error)}`);
  }
  return true;
}

export async function abandonLongTaskState(
  repositoryRoot: string,
  workdir: string,
): Promise<void> {
  const root = path.resolve(repositoryRoot);
  const resolved = assertContainedWorkdir(root, workdir);
  await withActiveAuthorityLock(root, "abandon", async () => {
    const loaded = await loadActiveLongTaskAuthorityUnlocked(root);
    const active = loaded.authority;
    if (!active) throw new Error("active_task_missing");
    if (normalizePath(active.workdir) !== normalizePath(resolved))
      throw new Error("active_task_workdir_mismatch");
    await clearActiveBindingCasUnlocked(root, {
      repository_root: root,
      workdir: resolved,
      task_id: active.task_id,
      authority_revision: active.authority_revision,
      compiled_identity: active.active_authority_identity,
      worktree_identity: active.worktree_identity,
    });
    await rm(runtimePath(resolved), { recursive: true, force: true });
  });
}

export async function forceClearCorruptActiveState(
  repositoryRoot: string,
  workdir: string,
): Promise<void> {
  const root = path.resolve(repositoryRoot);
  const resolved = assertContainedWorkdir(root, workdir);
  const lockPresent = await activeAuthorityLockExists(root);
  let corruptState = lockPresent;
  if (!corruptState)
    try {
      await loadActiveLongTaskAuthorityUnlocked(root);
      corruptState = false;
    } catch {
      corruptState = true;
    }
  if (!corruptState)
    throw new Error("force_corrupt_state_requires_corrupt_active_state");
  await withActiveAuthorityLockInternal(
    root,
    "abandon",
    async () => {
      const activeFile = await activeRecordPath(root);
      const key = markerKey(worktreeIdentity(root));
      const [oldRecord, oldMarker] = await Promise.all([
        readOptionalText(activeFile),
        gitConfigGet(root, key),
      ]);
      try {
        await rm(activeFile, { force: true });
        await gitConfigUnset(root, key);
      } catch (error) {
        try {
          if (oldRecord !== null) await atomicText(activeFile, oldRecord);
          if (oldMarker !== null) await gitConfigSet(root, key, oldMarker);
        } catch (rollbackError) {
          throw new Error(
            `active_authority_force_clear_rollback_failed:${message(rollbackError)}`,
          );
        }
        throw new Error(
          `active_authority_force_clear_failed:${message(error)}`,
        );
      }
      await rm(runtimePath(resolved), { recursive: true, force: true });
    },
    true,
  );
}

export async function clearFinalReceipt(
  repositoryRoot: string,
  workdir: string,
): Promise<void> {
  await Promise.all([
    rm(runtimePath(workdir, FINAL_FILE), { force: true }),
    rm(await auditReceiptPath(repositoryRoot), { force: true }),
  ]);
}

async function auditReceiptPath(repositoryRoot: string): Promise<string> {
  return path.join(
    path.dirname(await activeRecordPath(repositoryRoot)),
    "last-final-receipt.json",
  );
}

async function ensureRuntimeExcludes(
  repositoryRoot: string,
  workdir: string,
): Promise<void> {
  const exclude = await gitPath(repositoryRoot, "info/exclude");
  await mkdir(path.dirname(exclude), { recursive: true });
  const existing = await readFile(exclude, "utf8").catch(() => "");
  const relativeRuntime = `${path
    .relative(repositoryRoot, runtimePath(workdir))
    .replace(/\\/gu, "/")}/`;
  if (!existing.split(/\r?\n/u).includes(relativeRuntime))
    await writeFile(
      exclude,
      `${existing.replace(/\s*$/u, "")}\n${relativeRuntime}\n`,
      "utf8",
    );
}

function markerKey(identity: string): string {
  return `ty-context.longTask.${identity}`;
}

function normalizePath(value: string): string {
  const normalized = path.resolve(value).replace(/\\/gu, "/");
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function assertContainedWorkdir(
  repositoryRoot: string,
  workdir: string,
): string {
  const root = path.resolve(repositoryRoot);
  const resolved = path.resolve(workdir);
  const relative = path.relative(root, resolved);
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new Error("long_task_workdir_outside_repository");
  return resolved;
}

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readOptionalJson(file: string): Promise<unknown | null> {
  try {
    return await readJson(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function readOptionalText(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function atomicJson(file: string, value: unknown): Promise<void> {
  await atomicText(file, canonicalJson(value));
}

async function atomicText(file: string, content: string): Promise<void> {
  const temporary = await stageAtomicText(file, content);
  await rename(temporary, file);
}

async function stageAtomicText(file: string, content: string): Promise<string> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  return temporary;
}

function assertFinalizationLockToken(
  token: ActiveAuthorityLockToken,
  repositoryRoot: string,
): void {
  try {
    assertActiveAuthorityLockToken(token, repositoryRoot);
  } catch {
    throw new Error("finalization_active_authority_lock_required");
  }
  if (token.operation !== "finalize")
    throw new Error("finalization_active_authority_lock_required");
}

async function assertCurrentAuthorityCas(
  repositoryRoot: string,
  workdir: string,
  expected: ActiveAuthorityIdentityExpectation,
): Promise<ActiveLongTaskAuthorityV3> {
  const current = (await loadActiveLongTaskAuthorityUnlocked(repositoryRoot))
    .authority;
  if (
    !current ||
    normalizePath(current.workdir) !== normalizePath(workdir) ||
    !activeAuthorityIdentityMatches(current, expected)
  )
    throw new Error("finalization_authority_compare_and_swap_failed");
  return current;
}

async function restoreOptionalText(
  file: string,
  previous: string | null,
): Promise<void> {
  if (previous === null) await rm(file, { force: true });
  else await atomicText(file, previous);
}

async function restoreAuthorityAfterFinalizationFailure(input: {
  active_file: string;
  active_backup: string | null;
  old_active_record: string;
  repository_root: string;
  marker: string;
  old_marker: string | null;
}): Promise<void> {
  await atomicText(input.active_file, input.old_active_record);
  if (input.active_backup) await rm(input.active_backup, { force: true });
  if (input.old_marker === null)
    await gitConfigUnset(input.repository_root, input.marker);
  else
    await gitConfigSet(input.repository_root, input.marker, input.old_marker);
}

function missingError(error: unknown): boolean {
  const value = message(error);
  return value.includes("ENOENT") || value.includes("no such file");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
