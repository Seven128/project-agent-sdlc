import {
  applyMutationChangeForward,
  assertMutationChangesCurrent,
  assertMutationChangesContentState,
  cleanupMutationTemporary,
  mutationChangeDisposition,
  prepareMutationTemporaryForRecovery,
  stageMutationTemporary,
  type MutationAfterTemporaryCreated,
  type MutationBeforeSecondCas,
} from "./mutation-cas.js";
import {
  assertMutationDirectoriesAbsent,
  prepareMutationDirectories,
} from "./mutation-directories.js";
import {
  createContextMutationJournal,
  removeContextMutationJournal,
  updateContextMutationJournal,
} from "./mutation-journal.js";
import { withContextMutationInterlock } from "./mutation-interlock.js";
import { validateLiveContextMutation } from "./mutation-live-validation.js";
import type {
  ContextMutationJournal,
  ContextMutationPlan,
} from "./mutation-types.js";

export type MutationFaultPoint =
  | "journal_created"
  | "prepared"
  | "before_validation"
  | `temporary_created_before_identity:${string}`
  | `published_before_journal:${string}`
  | `applied:${string}`;

export type MutationBarrier = (
  point: MutationFaultPoint,
  change?: ContextMutationJournal["files"][number],
) => Promise<void>;

export interface ExecuteContextMutationOptions {
  fault_after?: MutationFaultPoint;
  before_second_cas?: MutationBeforeSecondCas;
  barrier?: MutationBarrier;
}

export async function executeContextMutationPlan(
  repository: string,
  plan: ContextMutationPlan,
  options: ExecuteContextMutationOptions = {},
): Promise<void> {
  await withContextMutationInterlock(repository, async () =>
    executeContextMutationPlanLocked(repository, plan, options),
  );
}

async function executeContextMutationPlanLocked(
  repository: string,
  plan: ContextMutationPlan,
  options: ExecuteContextMutationOptions,
): Promise<void> {
  await assertMutationDirectoriesAbsent(repository, plan.directories);
  await assertMutationChangesCurrent(repository, plan.files);
  let journal = await createContextMutationJournal(repository, plan);
  await checkpoint(options, "journal_created");
  await prepareMutationDirectories(repository, plan.directories);
  for (const change of ordered(journal.files)) {
    const temporary = await stageMutationTemporary(
      repository,
      change,
      "after",
      temporaryCreatedCheckpoint(options),
    );
    if (!temporary) continue;
    const successor = replaceJournalFile(journal, change.path, {
      temporary_state: temporary,
    });
    journal = await updateContextMutationJournal(
      repository,
      journal,
      successor,
      ["planning"],
    );
  }
  journal = await updateContextMutationJournal(
    repository,
    journal,
    { ...journal, state: "prepared" },
    ["planning"],
  );
  await checkpoint(options, "prepared");
  await assertMutationChangesCurrent(repository, plan.files);
  journal = await updateContextMutationJournal(
    repository,
    journal,
    { ...journal, state: "committing" },
    ["prepared"],
  );
  for (const planned of ordered(journal.files)) {
    let change = journal.files.find((entry) => entry.path === planned.path)!;
    if (
      !change.after.exists &&
      (await mutationChangeDisposition(repository, change)) !== "after"
    ) {
      const temporary = await prepareMutationTemporaryForRecovery(
        repository,
        change,
        "after",
        options.before_second_cas,
        temporaryCreatedCheckpoint(options),
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
    const published = await applyMutationChangeForward(
      repository,
      change,
      options.before_second_cas,
    );
    await checkpoint(
      options,
      `published_before_journal:${change.path}`,
      change,
    );
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
    await checkpoint(options, `applied:${change.path}`, change);
  }
  journal = await updateContextMutationJournal(
    repository,
    journal,
    { ...journal, state: "validating" },
    ["committing"],
  );
  await checkpoint(options, "before_validation");
  await assertMutationChangesContentState(repository, journal.files, "after");
  await validateLiveContextMutation(repository, journal);
  await assertMutationChangesContentState(repository, journal.files, "after");
  await finishContextMutation(repository, journal);
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

export async function finishContextMutation(
  repository: string,
  journal: ContextMutationJournal,
): Promise<void> {
  await cleanupContextMutationTemporaries(repository, journal);
  await removeContextMutationJournal(repository, journal);
}

export async function cleanupContextMutationTemporaries(
  repository: string,
  journal: ContextMutationJournal,
): Promise<void> {
  for (const change of ordered(journal.files))
    await cleanupMutationTemporary(repository, change);
}

function ordered<T extends { commit_order: number }>(values: T[]): T[] {
  return [...values].sort(
    (left, right) => left.commit_order - right.commit_order,
  );
}

function markApplied(
  journal: ContextMutationJournal,
  change: ContextMutationJournal["files"][number],
): ContextMutationJournal {
  if (journal.applied_paths.includes(change.path)) return journal;
  if (journal.applied_paths.length !== change.commit_order)
    throw new Error(
      `context_mutation_invalid:journal_applied_paths_not_prefix:${change.path}`,
    );
  return {
    ...journal,
    applied_paths: [...journal.applied_paths, change.path],
  };
}

function temporaryCreatedCheckpoint(
  options: ExecuteContextMutationOptions,
): MutationAfterTemporaryCreated {
  return async (change) =>
    checkpoint(
      options,
      `temporary_created_before_identity:${change.path}`,
      change,
    );
}

async function checkpoint(
  options: ExecuteContextMutationOptions,
  point: MutationFaultPoint,
  change?: ContextMutationJournal["files"][number],
): Promise<void> {
  await options.barrier?.(point, change);
  if (options.fault_after === point)
    throw new Error(`context_mutation_fault_injected:${point}`);
}
