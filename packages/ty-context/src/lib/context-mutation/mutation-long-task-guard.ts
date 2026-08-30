import { CLI_EXIT_CODES, CliCommandError } from "../cli-exit.js";
import { repositoryRoot } from "../long-task-git.js";
import {
  readActiveLongTaskBinding,
  withActiveAuthorityLock,
} from "../long-task-state.js";
import type {
  ContextMutationJournal,
  ContextMutationPlan,
} from "./mutation-types.js";

type ContextMutationAuthorityConflictPhase = "start" | "recovery";

export async function assertContextMutationOutsideActiveLongTask(
  repository: string,
  affectedPaths: Iterable<string>,
): Promise<void> {
  const gitRepository = await contextMutationGitRepository(repository);
  if (!gitRepository) return;
  await assertPathsOutsideActiveLongTask(gitRepository, affectedPaths);
}

export async function withContextMutationAuthorityInterlock<T>(
  repository: string,
  affectedPaths: Iterable<string>,
  action: () => Promise<T>,
  conflictPhase: ContextMutationAuthorityConflictPhase = "start",
): Promise<T> {
  const gitRepository = await contextMutationGitRepository(repository);
  if (!gitRepository) return action();
  return withActiveAuthorityLock(
    gitRepository,
    "context_mutation",
    async () => {
      await assertPathsOutsideActiveLongTask(
        gitRepository,
        affectedPaths,
        conflictPhase,
      );
      return action();
    },
  );
}

export function contextMutationAffectedPaths(
  mutation: ContextMutationPlan | ContextMutationJournal,
): string[] {
  const paths = new Set(mutation.files.map((entry) => entry.path));
  if (mutation.operation_data.kind === "register")
    paths.add(mutation.operation_data.context_path);
  else {
    paths.add(mutation.operation_data.from_path);
    paths.add(mutation.operation_data.to_path);
  }
  return [...paths].sort((left, right) =>
    Buffer.from(left, "utf8").compare(Buffer.from(right, "utf8")),
  );
}

async function contextMutationGitRepository(
  repository: string,
): Promise<string | null> {
  return repositoryRoot(repository).catch((error) => {
    if (
      /(?:not a git repository|--local can only be used inside a git repository)/iu.test(
        message(error),
      )
    )
      return null;
    throw new CliCommandError(
      CLI_EXIT_CODES.catalog,
      `context mutation cannot establish Long-Task Authority state: ${message(error)}`,
      { cause: error },
    );
  });
}

async function assertPathsOutsideActiveLongTask(
  gitRepository: string,
  affectedPaths: Iterable<string>,
  conflictPhase: ContextMutationAuthorityConflictPhase = "start",
): Promise<void> {
  const active = await readActiveLongTaskBinding(gitRepository).catch(
    (error) => {
      throw new CliCommandError(
        CLI_EXIT_CODES.catalog,
        `context mutation cannot establish Long-Task Authority state: ${message(error)}`,
        { cause: error },
      );
    },
  );
  if (!active) return;
  const bound = new Set([
    ...active.authority_snapshot.context_snapshot.files,
    ...Object.keys(active.authority_snapshot.source_hashes),
  ]);
  const conflicts = [...affectedPaths]
    .filter((file) => bound.has(file))
    .sort((left, right) =>
      Buffer.from(left, "utf8").compare(Buffer.from(right, "utf8")),
    );
  if (conflicts.length === 0) return;
  throw new CliCommandError(
    CLI_EXIT_CODES.catalog,
    conflictPhase === "recovery"
      ? `unfinished Context mutation conflicts with active Long-Task Authority binding for ${conflicts.join(", ")}; first end or abandon that binding through its legitimate Long-Task lifecycle, then complete or rollback the transaction, then use a fresh Compile/rebind and any required Authority Revision; Compile, Revision, and activation cannot bypass the unfinished journal`
      : `active Long-Task Authority binds ${conflicts.join(", ")}; end or abandon that binding through its legitimate Long-Task lifecycle before starting Context mutation; after the mutation, use a fresh Compile/rebind and Authority Revision only if the lifecycle requires it`,
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
