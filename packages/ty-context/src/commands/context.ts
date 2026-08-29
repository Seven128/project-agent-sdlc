import { CLI_EXIT_CODES, CliCommandError } from "../lib/cli-exit.js";
import { contextCreate } from "./context-create.js";
import { contextInspect } from "./context-inspect.js";

export async function context(args: string[]): Promise<void> {
  const [subcommand = "help", ...rest] = args;
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    console.log(contextHelp());
    return;
  }
  if (subcommand === "create") return contextCreate(rest);
  if (subcommand === "inspect") return contextInspect(rest);
  throw new CliCommandError(
    CLI_EXIT_CODES.arguments,
    `unknown context subcommand: ${subcommand}`,
  );
}

function contextHelp(): string {
  return `ty-context context commands:
  context create --path <project_context/file.md> --role <role> [--format text|json]
  context inspect <project_context/file.md> [options]

Create publishes an unregistered TODO-only scaffold and never edits the
Manifest. Register and move are not included in the 0.10.1 capability.`;
}
