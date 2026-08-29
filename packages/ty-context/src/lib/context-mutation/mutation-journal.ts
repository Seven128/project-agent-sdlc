import { sha256Hex } from "../strict-codec.js";
import {
  publishInitialJournalSnapshot,
  publishNextJournalSnapshot,
  readLatestJournalSnapshot,
  removeJournalSnapshotChain,
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

export async function readContextMutationJournal(
  repository: string,
): Promise<ContextMutationJournal | null> {
  return (await readLatestJournalSnapshot(repository))?.journal ?? null;
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
  await publishInitialJournalSnapshot(repository, journal);
  return journal;
}

export async function updateContextMutationJournal(
  repository: string,
  journal: ContextMutationJournal,
  expectedStates: ContextMutationJournalState[],
): Promise<ContextMutationJournal> {
  validateContextMutationJournal(journal);
  const current = await readLatestJournalSnapshot(repository);
  if (!current) invalid("journal_missing");
  if (current.journal.transaction_id !== journal.transaction_id)
    invalid("journal_transaction_changed");
  if (!expectedStates.includes(current.journal.state))
    invalid(`journal_state_changed:${current.journal.state}`);
  const next: ContextMutationJournal = {
    ...journal,
    journal_sequence: current.journal.journal_sequence + 1,
    previous_journal_sha256: sha256Hex(current.bytes),
  };
  validateContextMutationJournal(next);
  await publishNextJournalSnapshot(repository, next, current);
  return next;
}

export async function removeContextMutationJournal(
  repository: string,
  transactionId: string,
): Promise<void> {
  await removeJournalSnapshotChain(repository, transactionId);
}

function invalid(reason: string): never {
  throw new Error(`context_mutation_invalid:${reason}`);
}
