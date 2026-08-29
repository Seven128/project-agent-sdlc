import { CLI_EXIT_CODES, CliCommandError } from "../lib/cli-exit.js";
import { CONTEXT_ROUTE_BUDGETS } from "../lib/context-router/context-route-budget.js";
import { renderContextRouteText } from "../lib/context-router/context-route-render.js";
import { routeContext } from "../lib/context-router/context-route.js";

interface RouteOptions {
  task?: string;
  paths: string[];
  terms: string[];
  includes: string[];
  format: "text" | "json";
  explain: boolean;
  case_sensitive: boolean;
  max_search_results: number;
  help: boolean;
}

export async function route(args: string[]): Promise<void> {
  let options: RouteOptions;
  try {
    options = parseRouteArgs(args);
  } catch (error) {
    if (error instanceof CliCommandError) throw error;
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
  if (options.help) {
    console.log(routeHelp());
    return;
  }
  if (options.task === undefined)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      "route requires --task <text>",
    );

  let result;
  try {
    result = await routeContext({
      project_root: process.cwd(),
      task: options.task,
      paths: options.paths,
      explicit_terms: options.terms,
      includes: options.includes,
      case_sensitive: options.case_sensitive,
      max_search_results: options.max_search_results,
    });
  } catch (error) {
    if (error instanceof CliCommandError) throw error;
    throw new CliCommandError(
      CLI_EXIT_CODES.internal,
      `route failed internally: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }

  if (options.format === "json")
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(renderContextRouteText(result, options.explain));
  if (!result.catalog_valid) process.exitCode = CLI_EXIT_CODES.catalog;
  else if (!result.complete) process.exitCode = CLI_EXIT_CODES.incomplete;
}

export function parseRouteArgs(args: string[]): RouteOptions {
  const options: RouteOptions = {
    paths: [],
    terms: [],
    includes: [],
    format: "text",
    explain: false,
    case_sensitive: false,
    max_search_results: CONTEXT_ROUTE_BUDGETS.output_matches,
    help: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--explain") options.explain = true;
    else if (argument === "--case-sensitive") options.case_sensitive = true;
    else if (argument === "--json") options.format = "json";
    else if (argument === "--task")
      index = readValue(
        args,
        index,
        "--task",
        (value) => (options.task = value),
      );
    else if (argument.startsWith("--task="))
      options.task = inlineValue(argument, "--task");
    else if (argument === "--path")
      index = readValue(args, index, "--path", (value) =>
        options.paths.push(value),
      );
    else if (argument.startsWith("--path="))
      options.paths.push(inlineValue(argument, "--path"));
    else if (argument === "--term")
      index = readValue(args, index, "--term", (value) =>
        options.terms.push(value),
      );
    else if (argument.startsWith("--term="))
      options.terms.push(inlineValue(argument, "--term"));
    else if (argument === "--include")
      index = readValue(args, index, "--include", (value) =>
        options.includes.push(value),
      );
    else if (argument.startsWith("--include="))
      options.includes.push(inlineValue(argument, "--include"));
    else if (argument === "--format")
      index = readValue(
        args,
        index,
        "--format",
        (value) => (options.format = parseFormat(value)),
      );
    else if (argument.startsWith("--format="))
      options.format = parseFormat(inlineValue(argument, "--format"));
    else if (argument === "--max-search-results")
      index = readValue(
        args,
        index,
        "--max-search-results",
        (value) => (options.max_search_results = parseMaximum(value)),
      );
    else if (argument.startsWith("--max-search-results="))
      options.max_search_results = parseMaximum(
        inlineValue(argument, "--max-search-results"),
      );
    else
      throw new CliCommandError(
        CLI_EXIT_CODES.arguments,
        `unknown route argument: ${argument}`,
      );
  }
  return options;
}

export function routeHelp(): string {
  return `ty-context route (experimental, read-only):
  route --task <text> [--path <repo-path>] [--term <literal>]
        [--include <project_context/file.md>] [--case-sensitive]
        [--max-search-results <1-${CONTEXT_ROUTE_BUDGETS.output_matches}>]
        [--explain] [--format text|json]

The Router scans registered and unregistered Context Markdown with literal,
versioned budgets. It does not establish Authority, participate in the default
footprint, or replace the Workflow-required bounded Context search.

JSON schema v1 budgets: task=8192 UTF-8 bytes; automatic terms=32; explicit
terms=32; term length=2-128 automatic/1-128 explicit Unicode code points;
files=4096; per-file scan=1048576 bytes; aggregate scan=33554432 bytes;
output matches=200 total/20 per file.

Exit codes: 0 complete (warnings/ambiguity/unresolved allowed), 2 arguments,
3 blocking Catalog, 4 incomplete budget, 5 I/O or path safety, 6 internal.`;
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
      `route ${flag} requires a value`,
    );
  apply(value);
  return index + 1;
}

function inlineValue(argument: string, flag: string): string {
  const value = argument.slice(`${flag}=`.length);
  if (!value)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      `route ${flag} requires a value`,
    );
  return value;
}

function parseFormat(value: string): "text" | "json" {
  if (value === "text" || value === "json") return value;
  throw new CliCommandError(
    CLI_EXIT_CODES.arguments,
    "route --format must be text or json",
  );
}

function parseMaximum(value: string): number {
  const parsed = Number(value);
  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > CONTEXT_ROUTE_BUDGETS.output_matches ||
    String(parsed) !== value.trim()
  )
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      `route --max-search-results must be an integer from 1 to ${CONTEXT_ROUTE_BUDGETS.output_matches}`,
    );
  return parsed;
}
