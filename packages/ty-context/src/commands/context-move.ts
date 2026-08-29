import { CLI_EXIT_CODES, CliCommandError } from "../lib/cli-exit.js";
import { renderContextMoveText } from "../lib/context-move/context-move-render.js";
import { moveContext } from "../lib/context-move/context-move.js";

interface MoveOptions {
  from?: string;
  to?: string;
  apply: boolean;
  format: "text" | "json";
  help: boolean;
}

export async function contextMove(args: string[]): Promise<void> {
  const options = parseMoveArgs(args);
  if (options.help) {
    console.log(contextMoveHelp());
    return;
  }
  if (!options.from || !options.to)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      "context move requires --from and --to",
    );
  let result;
  try {
    result = await moveContext({
      project_root: process.cwd(),
      from_path: options.from,
      to_path: options.to,
      apply: options.apply,
    });
  } catch (error) {
    if (error instanceof CliCommandError) throw error;
    throw new CliCommandError(
      CLI_EXIT_CODES.internal,
      `context move failed internally: ${message(error)}`,
      { cause: error },
    );
  }
  if (options.format === "json")
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(renderContextMoveText(result));
}

function parseMoveArgs(args: string[]): MoveOptions {
  const options: MoveOptions = {
    apply: false,
    format: "text",
    help: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--apply") options.apply = true;
    else if (argument === "--json") options.format = "json";
    else if (argument === "--from" || argument === "--to") {
      const value = args[index + 1];
      if (!value || value.startsWith("--"))
        throw new CliCommandError(
          CLI_EXIT_CODES.arguments,
          `context move ${argument} requires a value`,
        );
      const key = argument === "--from" ? "from" : "to";
      if (options[key] !== undefined)
        throw new CliCommandError(
          CLI_EXIT_CODES.arguments,
          `context move ${argument} may be provided only once`,
        );
      options[key] = value;
      index += 1;
    } else if (argument === "--format") {
      const value = args[index + 1];
      if (value !== "text" && value !== "json")
        throw new CliCommandError(
          CLI_EXIT_CODES.arguments,
          "context move --format must be text or json",
        );
      options.format = value;
      index += 1;
    } else
      throw new CliCommandError(
        CLI_EXIT_CODES.arguments,
        `unknown context move argument: ${argument}`,
      );
  }
  return options;
}

function contextMoveHelp(): string {
  return `ty-context context move --from <project_context/file.md> --to <project_context/file.md>
  [--apply] [--format text|json]

Dry-run is the default. Move losslessly patches the Manifest and explicit local
Markdown links, reports unstructured exact references, validates a staged
Catalog, and applies only through the recoverable CAS/journal transaction.
There is no --force or whole-Manifest rewrite path.`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
