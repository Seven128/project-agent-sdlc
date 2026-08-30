import {
  applyMutationChangeBackward,
  applyMutationChangeForward,
  assertMutationChangesContentState,
  captureMutationFileState,
  mutationChangeDisposition,
  prepareMutationTemporaryForRecovery,
} from "./mutation-cas.js";
import {
  cleanupContextMutationTemporaries,
  finishContextMutation,
} from "./mutation-commit.js";
import {
  mutationDirectoryStatus,
  prepareMutationDirectories,
  rollbackMutationDirectories,
} from "./mutation-directories.js";
import {
  assertSameContextMutationJournalSnapshot,
  readContextMutationJournal,
  updateContextMutationJournal,
} from "./mutation-journal.js";
import {
  contextMutationAffectedPaths,
  withContextMutationAuthorityInterlock,
} from "./mutation-long-task-guard.js";
import {
  validateLiveContextMutation,
  validateRolledBackContextMutation,
} from "./mutation-live-validation.js";
import type {
  ContextMutationJournal,
  ContextMutationStatus,
  MutationFileChange,
} from "./mutation-types.js";
import { canonicalJson } from "../strict-codec.js";

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
  const initial = await requiredJournal(repository);
  return withContextMutationAuthorityInterlock(
    repository,
    contextMutationAffectedPaths(initial),
    async () => completeContextMutationLocked(repository, initial),
    "recovery",
  );
}

async function completeContextMutationLocked(
  repository: string,
  initial: ContextMutationJournal,
): Promise<ContextMutationStatus> {
  let journal = await requiredMatchingJournal(repository, initial);
  await assertRecoveryLiveVector(repository, journal);
  const previousState = journal.state;
  journal = await updateContextMutationJournal(
    repository,
    journal,
    { ...journal, state: "committing" },
    [previousState],
  );
  await prepareMutationDirectories(repository, journal.directories);
  const forward = ordered(journal.files);
  for (const planned of forward) {
    let change = journal.files.find((entry) => entry.path === planned.path)!;
    if ((await mutationChangeDisposition(repository, change)) !== "after") {
      const temporary = await prepareMutationTemporaryForRecovery(
        repository,
        change,
        "after",
      );
      const successor = replaceJournalFile(journal, change.path, {
        temporary_state: temporary,
      });
      journal = await updateContextMutationJournal(
        repository,
        journal,
        successor,
        ["committing"],
      );
      change = journal.files.find((entry) => entry.path === planned.path)!;
    }
    const published = await applyMutationChangeForward(repository, change);
    let successor = replaceJournalFile(journal, change.path, {
      published_after: published,
    });
    successor = markApplied(successor, change);
    journal = await updateContextMutationJournal(
      repository,
      journal,
      successor,
      ["committing"],
    );
  }
  journal = await updateContextMutationJournal(
    repository,
    journal,
    { ...journal, state: "validating" },
    ["committing"],
  );
  await assertMutationChangesContentState(repository, journal.files, "after");
  await validateLiveContextMutation(repository, journal);
  await assertMutationChangesContentState(repository, journal.files, "after");
  await finishContextMutation(repository, journal);
  return contextMutationStatus(repository);
}

export async function rollbackContextMutation(
  repository: string,
): Promise<ContextMutationStatus> {
  const initial = await requiredJournal(repository);
  return withContextMutationAuthorityInterlock(
    repository,
    contextMutationAffectedPaths(initial),
    async () => rollbackContextMutationLocked(repository, initial),
    "recovery",
  );
}

async function rollbackContextMutationLocked(
  repository: string,
  initial: ContextMutationJournal,
): Promise<ContextMutationStatus> {
  let journal = await requiredMatchingJournal(repository, initial);
  await assertRecoveryLiveVector(repository, journal);
  const previousState = journal.state;
  journal = await updateContextMutationJournal(
    repository,
    journal,
    { ...journal, state: "committing" },
    [previousState],
  );
  const backward = ordered(journal.files).reverse();
  for (const planned of backward) {
    let change = journal.files.find((entry) => entry.path === planned.path)!;
    if ((await mutationChangeDisposition(repository, change)) !== "before") {
      const temporary = await prepareMutationTemporaryForRecovery(
        repository,
        change,
        "before",
      );
      const successor = replaceJournalFile(journal, change.path, {
        temporary_state: temporary,
      });
      journal = await updateContextMutationJournal(
        repository,
        journal,
        successor,
        ["committing"],
      );
      change = journal.files.find((entry) => entry.path === planned.path)!;
    }
    const published = await applyMutationChangeBackward(repository, change);
    let successor = replaceJournalFile(journal, change.path, {
      published_before: published,
    });
    successor = markRolledBack(successor, change);
    journal = await updateContextMutationJournal(
      repository,
      journal,
      successor,
      ["committing"],
    );
  }
  await assertMutationChangesContentState(repository, journal.files, "before");
  await validateRolledBackContextMutation(repository, journal);
  await cleanupContextMutationTemporaries(repository, journal);
  await rollbackMutationDirectories(repository, journal.directories);
  await finishContextMutation(repository, journal);
  return contextMutationStatus(repository);
}

async function requiredMatchingJournal(
  repository: string,
  expected: ContextMutationJournal,
): Promise<ContextMutationJournal> {
  const current = await requiredJournal(repository);
  if (
    current.transaction_id !== expected.transaction_id ||
    canonicalJson(current) !== canonicalJson(expected)
  )
    invalid("journal_transaction_changed");
  assertSameContextMutationJournalSnapshot(expected, current);
  return current;
}

async function requiredJournal(
  repository: string,
): Promise<ContextMutationJournal> {
  const journal = await readContextMutationJournal(repository);
  if (!journal) invalid("journal_missing");
  return journal;
}

async function assertRecoveryLiveVector(
  repository: string,
  journal: ContextMutationJournal,
): Promise<void> {
  const conflicts: string[] = [];
  const dispositions: Array<"before" | "after"> = [];
  for (const change of ordered(journal.files)) {
    const disposition = await mutationChangeDisposition(repository, change);
    if (disposition === "conflict")
      conflicts.push(change.path);
    else dispositions.push(disposition);
  }
  if (conflicts.length)
    invalid(`recovery_conflict:${conflicts.sort().join(",")}`);
  let observedPrefix = 0;
  let beforeSeen = false;
  for (const disposition of dispositions) {
    if (disposition === "before") beforeSeen = true;
    else if (beforeSeen) invalid("recovery_live_vector_not_applied_prefix");
    else observedPrefix += 1;
  }
  const recordedPrefix = journal.applied_paths.length;
  const allowed =
    journal.state === "validating"
      ? observedPrefix === journal.files.length
      : journal.state === "planning" || journal.state === "prepared"
        ? observedPrefix === 0
        : Math.abs(observedPrefix - recordedPrefix) <= 1;
  if (!allowed)
    invalid(
      `recovery_live_vector_applied_prefix_mismatch:${journal.state}:${recordedPrefix}:${observedPrefix}`,
    );
}

async function currentDigest(
  repository: string,
  change: MutationFileChange,
): Promise<string | null> {
  return (
    await captureMutationFileState(repository, change.path, {
      allow_hardlinks: true,
    })
  ).sha256;
}

function ordered<T extends { commit_order: number }>(values: T[]): T[] {
  return [...values].sort(
    (left, right) => left.commit_order - right.commit_order,
  );
}

function replaceJournalFile(
  journal: ContextMutationJournal,
  file: string,
  replacement: Partial<ContextMutationJournal["files"][number]>,
): ContextMutationJournal {
  return {
    ...journal,
    files: journal.files.map((entry) =>
      entry.path === file ? { ...entry, ...replacement } : entry,
    ),
  };
}

function markApplied(
  journal: ContextMutationJournal,
  change: MutationFileChange,
): ContextMutationJournal {
  if (journal.applied_paths.includes(change.path)) return journal;
  if (journal.applied_paths.length !== change.commit_order)
    invalid(`journal_applied_paths_not_prefix:${change.path}`);
  return {
    ...journal,
    applied_paths: [...journal.applied_paths, change.path],
  };
}

function markRolledBack(
  journal: ContextMutationJournal,
  change: MutationFileChange,
): ContextMutationJournal {
  if (!journal.applied_paths.includes(change.path)) return journal;
  if (journal.applied_paths.at(-1) !== change.path)
    invalid(`journal_applied_paths_not_prefix:${change.path}`);
  return { ...journal, applied_paths: journal.applied_paths.slice(0, -1) };
}

function invalid(reason: string): never {
  throw new Error(`context_mutation_invalid:${reason}`);
}
