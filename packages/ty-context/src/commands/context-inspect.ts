import { inspectContext } from "../lib/context-inspect/context-inspect.js";
import { renderContextInspectText } from "../lib/context-inspect/context-inspect-render.js";
import { CliCommandError, CLI_EXIT_CODES } from "../lib/cli-exit.js";
export async function contextInspect(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(
      "context inspect <project_context/file.md> [--format text|json]",
    );
    return;
  }
  const [target, ...rest] = args;
  const json = rest.length === 1 && rest[0] === "--json";
  if (
    !target ||
    (!json &&
      rest.length &&
      (rest.length !== 2 ||
        rest[0] !== "--format" ||
        !["text", "json"].includes(rest[1])))
  )
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      "Usage: context inspect <path> [--format text|json] [--json]. Ranking/route options have retired.",
    );
  const result = await inspectContext({
    project_root: process.cwd(),
    context_path: target,
  });
  if (json || rest[1] === "json") console.log(JSON.stringify(result, null, 2));
  else console.log(renderContextInspectText(result));
  if (result.diagnostics.some((entry) => entry.severity === "error"))
    process.exitCode = CLI_EXIT_CODES.catalog;
}
