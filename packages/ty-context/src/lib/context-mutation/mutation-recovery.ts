import {
  applyMutationChangeBackward,
  applyMutationChangeForward,
  assertMutationChangesContentState,
  captureMutationFileState,
  mutationChangeDisposition,
  prepareMutationTemporaryForRecovery,
} from "./mutation-cas.js";
import { finishContextMutation } from "./mutation-commit.js";
import {
  mutationDirectoryStatus,
  prepareMutationDirectories,
  rollbackMutationDirectories,
} from "./mutation-directories.js";
import {
  readContextMutationJournal,
  updateContextMutationJournal,
} from "./mutation-journal.js";
import {
  validateLiveContextMutation,
  validateRolledBackContextMutation,
} from "./mutation-live-validation.js";
import type {
  ContextMutationJournal,
  ContextMutationStatus,
  MutationFileChange,
} from "./mutation-types.js";

export async function contextMutationStatus(
  repository: string,
): Promise<ContextMutationStatus> {
  const journal = await readContextMutationJournal(repository);
  if (!journal)
    return {
      schema_version: 1,
      journal_present: false,
      directories: [],
      files: [],
      recovery_commands: [],
    };
  const directories = [];
  for (const entry of journal.directories)
    directories.push(await mutationDirectoryStatus(repository, entry));
  const files = [];
  for (const change of ordered(journal.files)) {
    const state = await mutationChangeDisposition(repository, change);
    const current = await currentDigest(repository, change);
    files.push({ path: change.path, state, current_sha256: current });
  }
  return {
    schema_version: 1,
    journal_present: true,
    transaction_id: journal.transaction_id,
    operation: journal.operation,
    state: journal.state,
    directories,
    files,
    recovery_commands: [
      "ty-context context transaction rollback",
      "ty-context context transaction complete",
    ],
  };
}

export async function completeContextMutation(
  repository: string,
): Promise<ContextMutationStatus> {
  let journal = await requiredJournal(repository);
  await assertNoConflicts(repository, journal);
  const previousState = journal.state;
  journal = { ...journal, state: "committing" };
  journal = await updateContextMutationJournal(repository, journal, [
    previousState,
  ]);
  await prepareMutationDirectories(repository, journal.directories);
  const forward = ordered(journal.files);
  for (const change of forward)
    await prepareMutationTemporaryForRecovery(repository, change, change.after);
  for (const change of forward) {
    await applyMutationChangeForward(repository, change);
    journal = {
      ...journal,
      applied_paths: [...new Set([...journal.applied_paths, change.path])],
    };
    journal = await updateContextMutationJournal(repository, journal, [
      "committing",
    ]);
  }
  journal = { ...journal, state: "validating" };
  journal = await updateContextMutationJournal(repository, journal, [
    "committing",
  ]);
  await assertMutationChangesContentState(repository, journal.files, "after");
  await validateLiveContextMutation(repository, journal);
  await assertMutationChangesContentState(repository, journal.files, "after");
  await finishContextMutation(repository, journal);
  return contextMutationStatus(repository);
}

export async function rollbackContextMutation(
  repository: string,
): Promise<ContextMutationStatus> {
  let journal = await requiredJournal(repository);
  await assertNoConflicts(repository, journal);
  const previousState = journal.state;
  journal = { ...journal, state: "committing" };
  journal = await updateContextMutationJournal(repository, journal, [
    previousState,
  ]);
  const backward = ordered(journal.files).reverse();
  for (const change of backward)
    await prepareMutationTemporaryForRecovery(
      repository,
      change,
      change.before,
    );
  for (const change of backward)
    await applyMutationChangeBackward(repository, change);
  await assertMutationChangesContentState(repository, journal.files, "before");
  await validateRolledBackContextMutation(repository, journal);
  await rollbackMutationDirectories(repository, journal.directories);
  await finishContextMutation(repository, journal);
  return contextMutationStatus(repository);
}

async function requiredJournal(
  repository: string,
): Promise<ContextMutationJournal> {
  const journal = await readContextMutationJournal(repository);
  if (!journal) invalid("journal_missing");
  return journal;
}

async function assertNoConflicts(
  repository: string,
  journal: ContextMutationJournal,
): Promise<void> {
  const conflicts: string[] = [];
  for (const change of journal.files)
    if ((await mutationChangeDisposition(repository, change)) === "conflict")
      conflicts.push(change.path);
  if (conflicts.length)
    invalid(`recovery_conflict:${conflicts.sort().join(",")}`);
}

async function currentDigest(
  repository: string,
  change: MutationFileChange,
): Promise<string | null> {
  return (await captureMutationFileState(repository, change.path)).sha256;
}

function ordered<T extends { commit_order: number }>(values: T[]): T[] {
  return [...values].sort(
    (left, right) => left.commit_order - right.commit_order,
  );
}

function invalid(reason: string): never {
  throw new Error(`context_mutation_invalid:${reason}`);
}
