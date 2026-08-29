import {
  applyMutationChangeForward,
  assertMutationChangesCurrent,
  assertMutationChangesContentState,
  cleanupMutationTemporary,
  stageMutationTemporary,
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
import { validateLiveContextMutation } from "./mutation-live-validation.js";
import type {
  ContextMutationJournal,
  ContextMutationPlan,
} from "./mutation-types.js";

export type MutationFaultPoint =
  "journal_created" | "prepared" | "before_validation" | `applied:${string}`;

export interface ExecuteContextMutationOptions {
  fault_after?: MutationFaultPoint;
}

export async function executeContextMutationPlan(
  repository: string,
  plan: ContextMutationPlan,
  options: ExecuteContextMutationOptions = {},
): Promise<void> {
  await assertMutationDirectoriesAbsent(repository, plan.directories);
  await assertMutationChangesCurrent(repository, plan.files);
  let journal = await createContextMutationJournal(repository, plan);
  fault(options, "journal_created");
  await prepareMutationDirectories(repository, plan.directories);
  for (const change of ordered(plan.files))
    await stageMutationTemporary(repository, change);
  journal = { ...journal, state: "prepared" };
  journal = await updateContextMutationJournal(repository, journal, [
    "planning",
  ]);
  fault(options, "prepared");
  await assertMutationChangesCurrent(repository, plan.files);
  journal = { ...journal, state: "committing" };
  journal = await updateContextMutationJournal(repository, journal, [
    "prepared",
  ]);
  for (const change of ordered(plan.files)) {
    await applyMutationChangeForward(repository, change);
    journal = {
      ...journal,
      applied_paths: [...new Set([...journal.applied_paths, change.path])],
    };
    journal = await updateContextMutationJournal(repository, journal, [
      "committing",
    ]);
    fault(options, `applied:${change.path}`);
  }
  journal = { ...journal, state: "validating" };
  journal = await updateContextMutationJournal(repository, journal, [
    "committing",
  ]);
  fault(options, "before_validation");
  await assertMutationChangesContentState(repository, journal.files, "after");
  await validateLiveContextMutation(repository, journal);
  await assertMutationChangesContentState(repository, journal.files, "after");
  await finishContextMutation(repository, journal);
}

export async function finishContextMutation(
  repository: string,
  journal: ContextMutationJournal,
): Promise<void> {
  for (const change of journal.files)
    await cleanupMutationTemporary(repository, change);
  await removeContextMutationJournal(repository, journal.transaction_id);
}

function ordered<T extends { commit_order: number }>(values: T[]): T[] {
  return [...values].sort(
    (left, right) => left.commit_order - right.commit_order,
  );
}

function fault(
  options: ExecuteContextMutationOptions,
  point: MutationFaultPoint,
): void {
  if (options.fault_after === point)
    throw new Error(`context_mutation_fault_injected:${point}`);
}
