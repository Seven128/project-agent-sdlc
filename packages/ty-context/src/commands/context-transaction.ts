import { CLI_EXIT_CODES, CliCommandError } from "../lib/cli-exit.js";
import {
  completeContextMutation,
  contextMutationStatus,
  rollbackContextMutation,
} from "../lib/context-mutation/mutation-recovery.js";
import type { ContextMutationStatus } from "../lib/context-mutation/mutation-types.js";

export async function contextTransaction(args: string[]): Promise<void> {
  const options = parseTransactionArgs(args);
  if (options.help || options.action === "help") {
    console.log(contextTransactionHelp());
    return;
  }
  let result;
  try {
    if (options.action === "status")
      result = await contextMutationStatus(process.cwd());
    else if (options.action === "rollback")
      result = await rollbackContextMutation(process.cwd());
    else result = await completeContextMutation(process.cwd());
  } catch (error) {
    if (error instanceof CliCommandError) throw error;
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      `context transaction ${options.action} failed: ${message(error)}`,
      { cause: error },
    );
  }
  if (options.format === "json")
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(renderTransactionStatus(result, options.action));
}

interface TransactionOptions {
  action: "help" | "status" | "rollback" | "complete";
  format: "text" | "json";
  help: boolean;
}

function parseTransactionArgs(args: string[]): TransactionOptions {
  const [actionInput = "help", ...rest] = args;
  if (
    actionInput !== "help" &&
    actionInput !== "status" &&
    actionInput !== "rollback" &&
    actionInput !== "complete"
  )
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      `unknown context transaction action: ${actionInput}`,
    );
  const options: TransactionOptions = {
    action: actionInput,
    format: "text",
    help: false,
  };
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--json") options.format = "json";
    else if (argument === "--format") {
      const value = rest[index + 1];
      if (value !== "text" && value !== "json")
        throw new CliCommandError(
          CLI_EXIT_CODES.arguments,
          "context transaction --format must be text or json",
        );
      options.format = value;
      index += 1;
    } else
      throw new CliCommandError(
        CLI_EXIT_CODES.arguments,
        `unknown context transaction argument: ${argument}`,
      );
  }
  return options;
}

function renderTransactionStatus(
  result: ContextMutationStatus,
  action: TransactionOptions["action"],
): string {
  if (!result.journal_present)
    return action === "status"
      ? "No unfinished Context mutation transaction.\n"
      : `Context mutation ${action} completed; no journal remains.\n`;
  const lines = [
    `Context mutation transaction: ${result.transaction_id}`,
    `Operation: ${result.operation}`,
    `Journal state: ${result.state}`,
  ];
  for (const directory of result.directories)
    lines.push(`- ${directory.path}: ${directory.state} (directory)`);
  for (const file of result.files)
    lines.push(
      `- ${file.path}: ${file.state}${file.current_sha256 ? ` (${file.current_sha256})` : ""}`,
    );
  lines.push(
    "Recovery:",
    ...result.recovery_commands.map((entry) => `- ${entry}`),
  );
  return `${lines.join("\n")}\n`;
}

function contextTransactionHelp(): string {
  return `ty-context context transaction status|rollback|complete [--format text|json]

Reports or resolves the single recoverable Context mutation journal. A new
register/move transaction is refused until this journal is completed or rolled
back. Recovery never overwrites a file whose bytes match neither side.`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
