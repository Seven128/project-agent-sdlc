import { randomUUID } from "node:crypto";
import type { Stats } from "node:fs";
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
  journal: ContextMutationJournal;
  relative: string;
}

interface JournalFileEntry {
  absolute: string;
  name: string;
  sequence: number;
  status: Stats;
}

interface JournalInventory {
  directory: string;
  snapshots: JournalFileEntry[];
  temporaries: JournalFileEntry[];
}

export async function readLatestJournalSnapshot(
  repository: string,
): Promise<ContextMutationJournalSnapshot | null> {
  const inventory = await readJournalInventory(repository);
  const snapshots = await readSnapshotChain(inventory);
  return snapshots.at(-1) ?? null;
}

export async function publishInitialJournalSnapshot(
  repository: string,
  journal: ContextMutationJournal,
): Promise<void> {
  await ensureSafeRepositoryDirectory(
    repository,
    CONTEXT_MUTATION_JOURNAL_DIRECTORY,
    "context_mutation_journal_parent",
  );
  const inventory = await readJournalInventory(repository);
  if ((await readSnapshotChain(inventory)).length)
    invalid("unfinished_transaction_exists");
  await removeJournalTemporaries(inventory.temporaries);
  await publishSnapshot(repository, journal);
}

export async function publishNextJournalSnapshot(
  repository: string,
  journal: ContextMutationJournal,
  expected: ContextMutationJournalSnapshot,
): Promise<void> {
  let inventory = await readJournalInventory(repository);
  let current = (await readSnapshotChain(inventory)).at(-1);
  assertExpectedSnapshot(current, expected);
  await removeJournalTemporaries(inventory.temporaries);
  inventory = await readJournalInventory(repository);
  current = (await readSnapshotChain(inventory)).at(-1);
  assertExpectedSnapshot(current, expected);
  await publishSnapshot(repository, journal);
}

export async function removeJournalSnapshotChain(
  repository: string,
  transactionId: string,
): Promise<void> {
  let inventory = await readJournalInventory(repository);
  const snapshots = await readSnapshotChain(inventory);
  const current = snapshots.at(-1);
  if (!current) return;
  if (current.journal.transaction_id !== transactionId)
    invalid("journal_transaction_changed");
  await removeJournalTemporaries(inventory.temporaries);
  inventory = await readJournalInventory(repository);
  const confirmed = await readSnapshotChain(inventory);
  if (confirmed.at(-1)?.journal.transaction_id !== transactionId)
    invalid("journal_transaction_changed");
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
    const status = await lstat(absolute);
    if (!status.isFile() || status.isSymbolicLink())
      invalid(`journal_entry_unsafe:${entry.name}`);
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
): Promise<ContextMutationJournalSnapshot[]> {
  const snapshots: ContextMutationJournalSnapshot[] = [];
  for (const entry of inventory.snapshots) {
    assertSafeJournalLink(entry, inventory.temporaries);
    if (entry.status.size > MAX_JOURNAL_BYTES)
      invalid("journal_snapshot_too_large");
    const bytes = await readFile(entry.absolute);
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
      journal,
      relative: `${CONTEXT_MUTATION_JOURNAL_DIRECTORY}/${entry.name}`,
    });
  }
  return snapshots;
}

async function publishSnapshot(
  repository: string,
  journal: ContextMutationJournal,
): Promise<void> {
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
    await removeSupersededSnapshots(repository, journal.journal_sequence);
    await syncJournalDirectory(directory);
  } catch (error) {
    if (!published) await unlinkJournalPath(temporary).catch(() => undefined);
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      invalid("journal_compare_and_swap_failed");
    throw error;
  }
}

function assertExpectedSnapshot(
  current: ContextMutationJournalSnapshot | undefined,
  expected: ContextMutationJournalSnapshot,
): void {
  if (!current) invalid("journal_missing");
  if (
    current.relative !== expected.relative ||
    sha256Hex(current.bytes) !== sha256Hex(expected.bytes)
  )
    invalid("journal_compare_and_swap_failed");
}

function assertSafeJournalLink(
  snapshot: JournalFileEntry,
  temporaries: JournalFileEntry[],
): void {
  if (snapshot.status.nlink === 1) return;
  const ownedLinks = temporaries.filter(
    (entry) =>
      entry.status.dev === snapshot.status.dev &&
      entry.status.ino === snapshot.status.ino,
  );
  if (snapshot.status.nlink !== 2 || ownedLinks.length !== 1)
    invalid(`journal_hardlink_unowned:${snapshot.name}`);
}

async function removeJournalTemporaries(
  temporaries: JournalFileEntry[],
): Promise<void> {
  for (const temporary of temporaries)
    await unlinkJournalPath(temporary.absolute);
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
