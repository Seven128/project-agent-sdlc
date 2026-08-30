import { randomUUID } from "node:crypto";
import type { BigIntStats } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  ensureSafeRepositoryDirectory,
  resolveInsideRepository,
} from "../repository-path-safety.js";
import { canonicalJson, sha256Hex } from "../strict-codec.js";
import {
  linkJournalTemporary,
  syncJournalDirectory,
  unlinkJournalPath,
  writeJournalTemporary,
} from "./mutation-journal-io.js";
import type { ContextMutationJournal } from "./mutation-types.js";
import { validateContextMutationJournal } from "./mutation-journal-validation.js";

export const CONTEXT_MUTATION_JOURNAL_DIRECTORY =
  "tmp/ty-context/context-transactions";

const SNAPSHOT_PATTERN = /^journal-(\d{6})\.json$/u;
const TEMPORARY_PATTERN = /^\.journal-(\d{6})\.[0-9a-f-]{36}\.tmp$/u;
const MAX_JOURNAL_SNAPSHOTS = 1024;
const MAX_JOURNAL_BYTES = 96 * 1024 * 1024;

export interface ContextMutationJournalSnapshot {
  absolute: string;
  bytes: Buffer;
  identity: BigIntStats;
  journal: ContextMutationJournal;
  relative: string;
}

export interface ContextMutationJournalReadOptions {
  after_snapshot_read?: (absolute: string) => Promise<void>;
}

interface JournalFileEntry {
  absolute: string;
  name: string;
  sequence: number;
  status: BigIntStats;
}

interface JournalInventory {
  directory: string;
  snapshots: JournalFileEntry[];
  temporaries: JournalFileEntry[];
}

export async function readLatestJournalSnapshot(
  repository: string,
  options: ContextMutationJournalReadOptions = {},
): Promise<ContextMutationJournalSnapshot | null> {
  const inventory = await readJournalInventory(repository);
  const snapshots = await readSnapshotChain(inventory, options);
  return snapshots.at(-1) ?? null;
}

export async function publishInitialJournalSnapshot(
  repository: string,
  journal: ContextMutationJournal,
): Promise<ContextMutationJournalSnapshot> {
  await ensureSafeRepositoryDirectory(
    repository,
    CONTEXT_MUTATION_JOURNAL_DIRECTORY,
    "context_mutation_journal_parent",
  );
  const inventory = await readJournalInventory(repository);
  if ((await readSnapshotChain(inventory)).length)
    invalid("unfinished_transaction_exists");
  await removeJournalTemporaries(inventory);
  return publishSnapshot(repository, journal);
}

export async function publishNextJournalSnapshot(
  repository: string,
  journal: ContextMutationJournal,
  expected: ContextMutationJournalSnapshot,
): Promise<ContextMutationJournalSnapshot> {
  let inventory = await readJournalInventory(repository);
  let current = (await readSnapshotChain(inventory)).at(-1);
  assertExpectedJournalSnapshot(current, expected);
  await removeJournalTemporaries(inventory);
  inventory = await readJournalInventory(repository);
  current = (await readSnapshotChain(inventory)).at(-1);
  assertExpectedJournalSnapshotAfterOwnedTemporaryCleanup(current, expected);
  return publishSnapshot(repository, journal);
}

export async function removeJournalSnapshotChain(
  repository: string,
  expected: ContextMutationJournalSnapshot,
): Promise<void> {
  let inventory = await readJournalInventory(repository);
  const snapshots = await readSnapshotChain(inventory);
  const current = snapshots.at(-1);
  assertExpectedJournalSnapshot(current, expected);
  await removeJournalTemporaries(inventory);
  inventory = await readJournalInventory(repository);
  const confirmed = await readSnapshotChain(inventory);
  assertExpectedJournalSnapshotAfterOwnedTemporaryCleanup(
    confirmed.at(-1),
    expected,
  );
  for (const snapshot of [...inventory.snapshots].reverse())
    await unlinkJournalPath(snapshot.absolute);
  await syncJournalDirectory(inventory.directory);
}

async function readJournalInventory(
  repository: string,
): Promise<JournalInventory> {
  const directory = resolveInsideRepository(
    repository,
    CONTEXT_MUTATION_JOURNAL_DIRECTORY,
    "context_mutation_journal_parent",
  );
  const existing = await lstat(directory).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    },
  );
  if (!existing) return { directory, snapshots: [], temporaries: [] };
  await ensureSafeRepositoryDirectory(
    repository,
    CONTEXT_MUTATION_JOURNAL_DIRECTORY,
    "context_mutation_journal_parent",
  );
  const snapshots: JournalFileEntry[] = [];
  const temporaries: JournalFileEntry[] = [];
  const entries = await readdir(directory, { withFileTypes: true });
  if (entries.length > MAX_JOURNAL_SNAPSHOTS + 16)
    invalid("journal_entry_limit_exceeded");
  for (const entry of entries) {
    if (!entry.isFile()) invalid(`journal_entry_unsafe:${entry.name}`);
    const snapshot = SNAPSHOT_PATTERN.exec(entry.name);
    const temporary = TEMPORARY_PATTERN.exec(entry.name);
    if (!snapshot && !temporary) invalid(`journal_entry_unowned:${entry.name}`);
    const absolute = path.join(directory, entry.name);
    const status = await lstat(absolute, { bigint: true });
    if (!status.isFile() || status.isSymbolicLink())
      invalid(`journal_entry_unsafe:${entry.name}`);
    if (status.ino === 0n)
      invalid(`journal_identity_unavailable:${entry.name}`);
    const target = snapshot ? snapshots : temporaries;
    target.push({
      absolute,
      name: entry.name,
      sequence: Number((snapshot ?? temporary)![1]),
      status,
    });
  }
  snapshots.sort((left, right) => left.sequence - right.sequence);
  temporaries.sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );
  if (snapshots.length > MAX_JOURNAL_SNAPSHOTS)
    invalid("journal_snapshot_limit_exceeded");
  return { directory, snapshots, temporaries };
}

async function readSnapshotChain(
  inventory: JournalInventory,
  options: ContextMutationJournalReadOptions = {},
): Promise<ContextMutationJournalSnapshot[]> {
  for (const snapshot of inventory.snapshots)
    assertSafeJournalLink(snapshot, inventory.temporaries);
  for (const temporary of inventory.temporaries)
    assertSafeJournalTemporary(temporary, inventory.snapshots);
  const snapshots: ContextMutationJournalSnapshot[] = [];
  for (const entry of inventory.snapshots) {
    if (entry.status.size > BigInt(MAX_JOURNAL_BYTES))
      invalid("journal_snapshot_too_large");
    const bytes = await readFile(entry.absolute);
    await options.after_snapshot_read?.(entry.absolute);
    const afterRead = await lstat(entry.absolute, { bigint: true }).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT")
          invalid(`journal_changed_during_read:${entry.name}`);
        throw error;
      },
    );
    if (!sameJournalIdentity(entry.status, afterRead))
      invalid(`journal_changed_during_read:${entry.name}`);
    let value: unknown;
    try {
      value = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      invalid(`journal_unreadable:${message(error)}`);
    }
    const journal = validateContextMutationJournal(value);
    if (journal.journal_sequence !== entry.sequence)
      invalid("journal_filename_sequence_mismatch");
    if (!bytes.equals(Buffer.from(canonicalJson(journal), "utf8")))
      invalid("journal_noncanonical_bytes");
    const previous = snapshots.at(-1);
    if (previous) {
      if (journal.journal_sequence !== previous.journal.journal_sequence + 1)
        invalid("journal_sequence_gap");
      if (journal.transaction_id !== previous.journal.transaction_id)
        invalid("journal_transaction_changed");
      if (journal.previous_journal_sha256 !== sha256Hex(previous.bytes))
        invalid("journal_predecessor_mismatch");
    }
    snapshots.push({
      absolute: entry.absolute,
      bytes,
      identity: afterRead,
      journal,
      relative: `${CONTEXT_MUTATION_JOURNAL_DIRECTORY}/${entry.name}`,
    });
  }
  return snapshots;
}

async function publishSnapshot(
  repository: string,
  journal: ContextMutationJournal,
): Promise<ContextMutationJournalSnapshot> {
  validateContextMutationJournal(journal);
  const directory = resolveInsideRepository(
    repository,
    CONTEXT_MUTATION_JOURNAL_DIRECTORY,
    "context_mutation_journal_parent",
  );
  const sequence = String(journal.journal_sequence).padStart(6, "0");
  const finalPath = path.join(directory, `journal-${sequence}.json`);
  const temporary = path.join(
    directory,
    `.journal-${sequence}.${randomUUID()}.tmp`,
  );
  await writeJournalTemporary(temporary, journal);
  let published = false;
  try {
    await linkJournalTemporary(temporary, finalPath);
    published = true;
    await unlinkJournalPath(temporary);
    await syncJournalDirectory(directory);
    await removeSupersededSnapshots(repository, journal.journal_sequence);
    await syncJournalDirectory(directory);
    const publishedSnapshot = await readLatestJournalSnapshot(repository);
    if (
      !publishedSnapshot ||
      publishedSnapshot.journal.journal_sequence !== journal.journal_sequence ||
      !publishedSnapshot.bytes.equals(
        Buffer.from(canonicalJson(journal), "utf8"),
      )
    )
      invalid("journal_publication_readback_mismatch");
    return publishedSnapshot;
  } catch (error) {
    if (!published) await unlinkJournalPath(temporary).catch(() => undefined);
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      invalid("journal_compare_and_swap_failed");
    throw error;
  }
}

export function assertExpectedJournalSnapshot(
  current: ContextMutationJournalSnapshot | undefined,
  expected: ContextMutationJournalSnapshot,
): void {
  if (!current) invalid("journal_missing");
  if (
    current.relative !== expected.relative ||
    !current.bytes.equals(expected.bytes) ||
    !sameJournalIdentity(current.identity, expected.identity)
  )
    invalid("journal_compare_and_swap_failed");
}

function assertExpectedJournalSnapshotAfterOwnedTemporaryCleanup(
  current: ContextMutationJournalSnapshot | undefined,
  expected: ContextMutationJournalSnapshot,
): void {
  if (!current) invalid("journal_missing");
  if (
    current.relative === expected.relative &&
    current.bytes.equals(expected.bytes) &&
    (sameJournalIdentity(current.identity, expected.identity) ||
      (expected.identity.nlink === 2n &&
        current.identity.nlink === 1n &&
        sameStableJournalIdentity(current.identity, expected.identity)))
  )
    return;
  invalid("journal_compare_and_swap_failed");
}

function assertSafeJournalLink(
  snapshot: JournalFileEntry,
  temporaries: JournalFileEntry[],
): void {
  if (snapshot.status.nlink === 1n) return;
  const ownedLinks = temporaries.filter(
    (entry) =>
      entry.sequence === snapshot.sequence &&
      entry.status.dev === snapshot.status.dev &&
      entry.status.ino === snapshot.status.ino &&
      sameJournalIdentity(entry.status, snapshot.status),
  );
  if (snapshot.status.nlink !== 2n || ownedLinks.length !== 1)
    invalid(
      `journal_hardlink_unowned_manual_recovery_required:${snapshot.name}`,
    );
}

function assertSafeJournalTemporary(
  temporary: JournalFileEntry,
  snapshots: JournalFileEntry[],
): void {
  const ownedSnapshots = snapshots.filter(
    (entry) =>
      entry.sequence === temporary.sequence &&
      entry.status.dev === temporary.status.dev &&
      entry.status.ino === temporary.status.ino &&
      entry.status.nlink === 2n &&
      temporary.status.nlink === 2n &&
      sameJournalIdentity(entry.status, temporary.status),
  );
  if (ownedSnapshots.length !== 1)
    invalid(
      `journal_temporary_unowned_manual_recovery_required:${temporary.name}`,
    );
}

function sameJournalIdentity(left: BigIntStats, right: BigIntStats): boolean {
  return (
    sameStableJournalIdentity(left, right) &&
    left.nlink === right.nlink &&
    left.ctimeNs === right.ctimeNs
  );
}

function sameStableJournalIdentity(
  left: BigIntStats,
  right: BigIntStats,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mode === right.mode &&
    left.mtimeNs === right.mtimeNs
  );
}

async function removeJournalTemporaries(
  inventory: JournalInventory,
): Promise<void> {
  if (inventory.temporaries.length === 0) return;
  const claimedSnapshots = new Set<string>();
  for (const temporary of inventory.temporaries) {
    const candidates = inventory.snapshots.filter(
      (snapshot) =>
        snapshot.sequence === temporary.sequence &&
        snapshot.status.dev === temporary.status.dev &&
        snapshot.status.ino === temporary.status.ino,
    );
    const snapshot = candidates.length === 1 ? candidates[0] : undefined;
    if (
      !snapshot ||
      claimedSnapshots.has(snapshot.name) ||
      snapshot.status.nlink !== 2n ||
      temporary.status.nlink !== 2n ||
      !sameJournalIdentity(snapshot.status, temporary.status)
    )
      invalid(
        `journal_temporary_unowned_manual_recovery_required:${temporary.name}`,
      );
    claimedSnapshots.add(snapshot.name);

    const [currentSnapshot, currentTemporary] = await Promise.all([
      lstatOwnedJournalEntry(snapshot),
      lstatOwnedJournalEntry(temporary),
    ]);
    if (
      !sameJournalIdentity(snapshot.status, currentSnapshot) ||
      !sameJournalIdentity(temporary.status, currentTemporary) ||
      !sameJournalIdentity(currentSnapshot, currentTemporary)
    )
      invalid(
        `journal_temporary_identity_changed_manual_recovery_required:${temporary.name}`,
      );
    try {
      await unlinkJournalPath(temporary.absolute);
    } catch (error) {
      invalid(
        `journal_temporary_cleanup_failed_manual_recovery_required:${temporary.name}:${message(error)}`,
      );
    }
    const afterSnapshot = await lstatOwnedJournalEntry(snapshot);
    const remainingTemporary = await lstat(temporary.absolute, {
      bigint: true,
    }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (
      remainingTemporary ||
      afterSnapshot.nlink !== 1n ||
      !sameStableJournalIdentity(currentSnapshot, afterSnapshot)
    )
      invalid(
        `journal_temporary_cleanup_transition_invalid_manual_recovery_required:${temporary.name}`,
      );
  }
  await syncJournalDirectory(inventory.directory);
}

async function lstatOwnedJournalEntry(
  entry: JournalFileEntry,
): Promise<BigIntStats> {
  return lstat(entry.absolute, { bigint: true }).catch(
    (error: NodeJS.ErrnoException) => {
      invalid(
        `journal_temporary_identity_changed_manual_recovery_required:${entry.name}:${message(error)}`,
      );
    },
  );
}

async function removeSupersededSnapshots(
  repository: string,
  currentSequence: number,
): Promise<void> {
  const inventory = await readJournalInventory(repository);
  for (const snapshot of inventory.snapshots)
    if (snapshot.sequence < currentSequence)
      await unlinkJournalPath(snapshot.absolute);
}

function invalid(reason: string): never {
  throw new Error(`context_mutation_invalid:${reason}`);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
