import { CLI_EXIT_CODES, CliCommandError } from "../cli-exit.js";
import { repositoryRoot } from "../long-task-git.js";
import { readActiveLongTaskBinding } from "../long-task-state.js";

export async function assertContextMutationOutsideActiveLongTask(
  repository: string,
  affectedPaths: Iterable<string>,
): Promise<void> {
  const gitRepository = await repositoryRoot(repository).catch((error) => {
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
  if (!gitRepository) return;
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
  const conflicts = [...affectedPaths].filter((file) => bound.has(file)).sort();
  if (conflicts.length === 0) return;
  throw new CliCommandError(
    CLI_EXIT_CODES.catalog,
    `active Long-Task Authority binds ${conflicts.join(", ")}; use the existing Authority Revision or rebinding flow before Context mutation`,
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
