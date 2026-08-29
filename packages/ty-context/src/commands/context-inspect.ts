import { CLI_EXIT_CODES, CliCommandError } from "../lib/cli-exit.js";
import { inspectContext } from "../lib/context-inspect/context-inspect.js";
import { renderContextInspectText } from "../lib/context-inspect/context-inspect-render.js";

interface InspectOptions {
  target?: string;
  task?: string;
  route_paths: string[];
  terms: string[];
  case_sensitive: boolean;
  format: "text" | "json";
  help: boolean;
}

export async function contextInspect(args: string[]): Promise<void> {
  const options = parseInspectArgs(args);
  if (options.help) {
    console.log(contextInspectHelp());
    return;
  }
  if (!options.target)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      "context inspect requires <project_context/file.md>",
    );
  let result;
  try {
    result = await inspectContext({
      project_root: process.cwd(),
      context_path: options.target,
      route_task: options.task,
      route_paths: options.route_paths,
      route_terms: options.terms,
      route_case_sensitive: options.case_sensitive,
    });
  } catch (error) {
    if (error instanceof CliCommandError) throw error;
    throw new CliCommandError(
      CLI_EXIT_CODES.internal,
      `context inspect failed internally: ${message(error)}`,
      { cause: error },
    );
  }
  if (options.format === "json")
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(renderContextInspectText(result));
  if (result.diagnostics.some((entry) => entry.severity === "error"))
    process.exitCode = CLI_EXIT_CODES.catalog;
  else if (result.route && !result.route.complete)
    process.exitCode = CLI_EXIT_CODES.incomplete;
}

function parseInspectArgs(args: string[]): InspectOptions {
  const options: InspectOptions = {
    route_paths: [],
    terms: [],
    case_sensitive: false,
    format: "text",
    help: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--json") options.format = "json";
    else if (argument === "--case-sensitive") options.case_sensitive = true;
    else if (argument === "--task")
      index = readValue(args, index, argument, (value) => {
        options.task = value;
      });
    else if (argument === "--route-path")
      index = readValue(args, index, argument, (value) => {
        options.route_paths.push(value);
      });
    else if (argument === "--term")
      index = readValue(args, index, argument, (value) => {
        options.terms.push(value);
      });
    else if (argument === "--format")
      index = readValue(args, index, argument, (value) => {
        if (value !== "text" && value !== "json")
          throw new CliCommandError(
            CLI_EXIT_CODES.arguments,
            "context inspect --format must be text or json",
          );
        options.format = value;
      });
    else if (argument.startsWith("--"))
      throw new CliCommandError(
        CLI_EXIT_CODES.arguments,
        `unknown context inspect argument: ${argument}`,
      );
    else if (options.target)
      throw new CliCommandError(
        CLI_EXIT_CODES.arguments,
        "context inspect accepts exactly one Context path",
      );
    else options.target = argument;
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
      `context inspect ${flag} requires a value`,
    );
  apply(value);
  return index + 1;
}

function contextInspectHelp(): string {
  return `ty-context context inspect <project_context/file.md>
  [--task <text>] [--route-path <repo-path>] [--term <literal>]
  [--case-sensitive] [--format text|json]

Reports ownership metadata, default-footprint membership, explicit Markdown
references, opt-in stable-key declarations and an optional experimental Router
explanation without modifying Context or Manifest files.`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
