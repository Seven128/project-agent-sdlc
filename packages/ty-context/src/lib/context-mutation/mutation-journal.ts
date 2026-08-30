import { canonicalJson, sha256Hex } from "../strict-codec.js";
import {
  publishInitialJournalSnapshot,
  publishNextJournalSnapshot,
  readLatestJournalSnapshot,
  removeJournalSnapshotChain,
  assertExpectedJournalSnapshot,
  type ContextMutationJournalSnapshot,
} from "./mutation-journal-storage.js";
export { CONTEXT_MUTATION_JOURNAL_DIRECTORY } from "./mutation-journal-storage.js";
import type {
  ContextMutationJournal,
  ContextMutationJournalState,
  ContextMutationPlan,
} from "./mutation-types.js";
import {
  CONTEXT_MUTATION_JOURNAL_SCHEMA,
  validateContextMutationJournal,
} from "./mutation-journal-validation.js";

const journalSnapshotBindings =
  new WeakMap<ContextMutationJournal, ContextMutationJournalSnapshot>();

export async function readContextMutationJournal(
  repository: string,
): Promise<ContextMutationJournal | null> {
  const snapshot = await readLatestJournalSnapshot(repository);
  return snapshot ? bindJournalSnapshot(snapshot) : null;
}

export async function assertNoUnfinishedContextMutationForAuthority(
  repository: string,
): Promise<void> {
  const journal = await readContextMutationJournal(repository);
  if (journal)
    throw new Error(
      `active_authority_context_mutation_unfinished:${journal.transaction_id}`,
    );
}

export async function createContextMutationJournal(
  repository: string,
  plan: ContextMutationPlan,
): Promise<ContextMutationJournal> {
  const journal: ContextMutationJournal = {
    schema_version: CONTEXT_MUTATION_JOURNAL_SCHEMA,
    ...plan,
    journal_sequence: 0,
    previous_journal_sha256: null,
    state: "planning",
    applied_paths: [],
  };
  validateContextMutationJournal(journal);
  return bindJournalSnapshot(
    await publishInitialJournalSnapshot(repository, journal),
  );
}

export async function updateContextMutationJournal(
  repository: string,
  expected: ContextMutationJournal,
  successor: ContextMutationJournal,
  expectedStates: ContextMutationJournalState[],
): Promise<ContextMutationJournal> {
  validateContextMutationJournal(expected);
  validateContextMutationJournal(successor);
  if (
    canonicalJson(immutableMutationPlan(expected)) !==
    canonicalJson(immutableMutationPlan(successor))
  )
    invalid("journal_successor_plan_changed");
  const current = await readLatestJournalSnapshot(repository);
  if (!current) invalid("journal_missing");
  try {
    assertExpectedJournalSnapshot(current, requiredSnapshotBinding(expected));
  } catch (error) {
    if (/journal_compare_and_swap_failed$/u.test(message(error)))
      invalid("journal_predecessor_compare_and_swap_failed");
    throw error;
  }
  if (current.journal.transaction_id !== expected.transaction_id)
    invalid("journal_transaction_changed");
  const expectedBytes = Buffer.from(canonicalJson(expected), "utf8");
  if (
    current.journal.journal_sequence !== expected.journal_sequence ||
    sha256Hex(current.bytes) !== sha256Hex(expectedBytes)
  )
    invalid("journal_predecessor_compare_and_swap_failed");
  if (!expectedStates.includes(current.journal.state))
    invalid(`journal_state_changed:${current.journal.state}`);
  const next: ContextMutationJournal = {
    ...successor,
    journal_sequence: expected.journal_sequence + 1,
    previous_journal_sha256: sha256Hex(current.bytes),
  };
  validateContextMutationJournal(next);
  return bindJournalSnapshot(
    await publishNextJournalSnapshot(repository, next, current),
  );
}

function immutableMutationPlan(journal: ContextMutationJournal): unknown {
  return {
    transaction_id: journal.transaction_id,
    operation: journal.operation,
    catalog_before_identity: journal.catalog_before_identity,
    catalog_after_identity: journal.catalog_after_identity,
    directories: journal.directories,
    files: journal.files.map((file) => ({
      path: file.path,
      before: file.before,
      after: file.after,
      commit_order: file.commit_order,
      temporary_path: file.temporary_path,
    })),
    operation_data: journal.operation_data,
  };
}

export async function removeContextMutationJournal(
  repository: string,
  expected: ContextMutationJournal,
): Promise<void> {
  validateContextMutationJournal(expected);
  const current = await readLatestJournalSnapshot(repository);
  if (!current) invalid("journal_missing");
  const expectedSnapshot = requiredSnapshotBinding(expected);
  assertExpectedJournalSnapshot(current, expectedSnapshot);
  if (
    current.journal.journal_sequence !== expected.journal_sequence ||
    sha256Hex(current.bytes) !==
      sha256Hex(Buffer.from(canonicalJson(expected), "utf8"))
  )
    invalid("journal_terminal_compare_and_swap_failed");
  await removeJournalSnapshotChain(repository, current);
}

export function assertSameContextMutationJournalSnapshot(
  expected: ContextMutationJournal,
  current: ContextMutationJournal,
): void {
  const expectedSnapshot = requiredSnapshotBinding(expected);
  const currentSnapshot = requiredSnapshotBinding(current);
  assertExpectedJournalSnapshot(currentSnapshot, expectedSnapshot);
}

function bindJournalSnapshot(
  snapshot: ContextMutationJournalSnapshot,
): ContextMutationJournal {
  journalSnapshotBindings.set(snapshot.journal, snapshot);
  return snapshot.journal;
}

function requiredSnapshotBinding(
  journal: ContextMutationJournal,
): ContextMutationJournalSnapshot {
  const snapshot = journalSnapshotBindings.get(journal);
  if (!snapshot) invalid("journal_predecessor_identity_missing");
  return snapshot;
}

function invalid(reason: string): never {
  throw new Error(`context_mutation_invalid:${reason}`);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
