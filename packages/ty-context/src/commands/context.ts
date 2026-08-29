import { CLI_EXIT_CODES, CliCommandError } from "../lib/cli-exit.js";
import { contextCreate } from "./context-create.js";
import { contextInspect } from "./context-inspect.js";
import { contextMove } from "./context-move.js";
import { contextRegister } from "./context-register.js";
import { contextTransaction } from "./context-transaction.js";

export async function context(args: string[]): Promise<void> {
  const [subcommand = "help", ...rest] = args;
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    console.log(contextHelp());
    return;
  }
  if (subcommand === "create") return contextCreate(rest);
  if (subcommand === "inspect") return contextInspect(rest);
  if (subcommand === "move") return contextMove(rest);
  if (subcommand === "register") return contextRegister(rest);
  if (subcommand === "transaction") return contextTransaction(rest);
  throw new CliCommandError(
    CLI_EXIT_CODES.arguments,
    `unknown context subcommand: ${subcommand}`,
  );
}

function contextHelp(): string {
  return `ty-context context commands:
  context create --path <project_context/file.md> --role <role> [--format text|json]
  context inspect <project_context/file.md> [options]
  context move --from <project_context/file.md> --to <project_context/file.md> [--apply]
  context register --path <project_context/file.md> --role <role> [--apply] [options]
  context transaction status|rollback|complete [--format text|json]

Create publishes an unregistered TODO-only scaffold and never edits the
Manifest. Register and move are dry-run-first and commit only through the
recoverable CAS/journal transaction engine; neither has a force bypass.`;
}
