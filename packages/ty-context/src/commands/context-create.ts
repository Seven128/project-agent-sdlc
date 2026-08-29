import { CLI_EXIT_CODES, CliCommandError } from "../lib/cli-exit.js";
import { createContextScaffold } from "../lib/context-create/context-create.js";
import type { ContextCreateResult } from "../lib/context-create/context-create-types.js";

interface CreateOptions {
  path?: string;
  role?: string;
  format: "text" | "json";
  help: boolean;
}

export async function contextCreate(args: string[]): Promise<void> {
  const options = parseCreateArgs(args);
  if (options.help) {
    console.log(contextCreateHelp());
    return;
  }
  if (!options.path || !options.role)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      "context create requires --path and --role",
    );
  let result;
  try {
    result = await createContextScaffold({
      project_root: process.cwd(),
      context_path: options.path,
      role: options.role,
    });
  } catch (error) {
    if (error instanceof CliCommandError) throw error;
    throw new CliCommandError(
      CLI_EXIT_CODES.internal,
      `context create failed internally: ${message(error)}`,
      { cause: error },
    );
  }
  if (options.format === "json")
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(renderContextCreateText(result));
}

function parseCreateArgs(args: string[]): CreateOptions {
  const options: CreateOptions = { format: "text", help: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--json") options.format = "json";
    else if (argument === "--path")
      index = readValue(args, index, argument, (value) => {
        options.path = singleValue(options.path, value, argument);
      });
    else if (argument === "--role")
      index = readValue(args, index, argument, (value) => {
        options.role = singleValue(options.role, value, argument);
      });
    else if (argument === "--format")
      index = readValue(args, index, argument, (value) => {
        if (value !== "text" && value !== "json")
          throw new CliCommandError(
            CLI_EXIT_CODES.arguments,
            "context create --format must be text or json",
          );
        options.format = value;
      });
    else
      throw new CliCommandError(
        CLI_EXIT_CODES.arguments,
        `unknown context create argument: ${argument}`,
      );
  }
  return options;
}

function readValue(
  args: string[],
  index: number,
  flag: string,
  apply: (value: string) => void,
): number {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--") || value.length === 0)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      `context create ${flag} requires a value`,
    );
  apply(value);
  return index + 1;
}

function singleValue(
  current: string | undefined,
  value: string,
  flag: string,
): string {
  if (current !== undefined)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      `context create accepts ${flag} exactly once`,
    );
  return value;
}

function renderContextCreateText(result: ContextCreateResult): string {
  return [
    `Created unregistered Context scaffold: ${result.path}`,
    `Role: ${result.role}`,
    `Bytes: ${result.bytes}`,
    "Manifest modified: no",
    `Default footprint: unchanged (${result.default_footprint.before.path_count} paths, ${result.default_footprint.before.bytes} bytes)`,
    "Next:",
    ...result.next_steps.map((step) => `- ${step}`),
    "",
  ].join("\n");
}

function contextCreateHelp(): string {
  return `ty-context context create --path <project_context/file.md> --role <role>
  [--format text|json]

Creates one Role-specific TODO-only scaffold as an unregistered Context file.
It refuses collisions and unsafe paths, never edits context.toml and never
provides a create-and-register or force-overwrite option.`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
