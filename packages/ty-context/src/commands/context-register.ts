import { CLI_EXIT_CODES, CliCommandError } from "../lib/cli-exit.js";
import { registerContext } from "../lib/context-register/context-register.js";
import { renderContextRegisterText } from "../lib/context-register/context-register-render.js";

interface RegisterOptions {
  path?: string;
  role?: string;
  read_policy?: string;
  read_when?: string;
  triggers: string[];
  default_children: string[];
  apply: boolean;
  format: "text" | "json";
  help: boolean;
}

export async function contextRegister(args: string[]): Promise<void> {
  const options = parseRegisterArgs(args);
  if (options.help) {
    console.log(contextRegisterHelp());
    return;
  }
  if (!options.path || !options.role)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      "context register requires --path and --role",
    );
  let result;
  try {
    result = await registerContext({
      project_root: process.cwd(),
      context_path: options.path,
      role: options.role,
      read_policy: options.read_policy,
      read_when: options.read_when,
      triggers: options.triggers,
      default_children: options.default_children,
      apply: options.apply,
    });
  } catch (error) {
    if (error instanceof CliCommandError) throw error;
    throw new CliCommandError(
      CLI_EXIT_CODES.internal,
      `context register failed internally: ${message(error)}`,
      { cause: error },
    );
  }
  if (options.format === "json")
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(renderContextRegisterText(result));
}

function parseRegisterArgs(args: string[]): RegisterOptions {
  const options: RegisterOptions = {
    triggers: [],
    default_children: [],
    apply: false,
    format: "text",
    help: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--apply") options.apply = true;
    else if (argument === "--json") options.format = "json";
    else if (argument === "--path")
      index = readValue(args, index, argument, (value) => {
        options.path = singleValue(options.path, value, argument);
      });
    else if (argument === "--role")
      index = readValue(args, index, argument, (value) => {
        options.role = singleValue(options.role, value, argument);
      });
    else if (argument === "--read-policy")
      index = readValue(args, index, argument, (value) => {
        options.read_policy = singleValue(options.read_policy, value, argument);
      });
    else if (argument === "--read-when")
      index = readValue(args, index, argument, (value) => {
        options.read_when = singleValue(options.read_when, value, argument);
      });
    else if (argument === "--trigger")
      index = readValue(args, index, argument, (value) => {
        options.triggers.push(value);
      });
    else if (argument === "--default-child")
      index = readValue(args, index, argument, (value) => {
        options.default_children.push(value);
      });
    else if (argument === "--format")
      index = readValue(args, index, argument, (value) => {
        if (value !== "text" && value !== "json")
          throw new CliCommandError(
            CLI_EXIT_CODES.arguments,
            "context register --format must be text or json",
          );
        options.format = value;
      });
    else
      throw new CliCommandError(
        CLI_EXIT_CODES.arguments,
        `unknown context register argument: ${argument}`,
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
      `context register ${flag} requires a value`,
    );
  apply(value);
  return index + 1;
}

function singleValue(
  previous: string | undefined,
  value: string,
  flag: string,
): string {
  if (previous !== undefined)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      `context register ${flag} may be provided only once`,
    );
  return value;
}

function contextRegisterHelp(): string {
  return `ty-context context register --path <project_context/file.md> --role <role>
  [--read-policy default|on-demand] [--read-when <text>]
  [--trigger <literal>]... [--default-child <context-path>]...
  [--apply] [--format text|json]

Dry-run is the default. Registration requires an existing unregistered,
recoverable Context file and a valid staged Catalog. --apply commits through
the CAS/journal transaction engine; there is no --force bypass.`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
