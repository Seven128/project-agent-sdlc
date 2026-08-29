import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseDesignAuthorityDeltaAssessment } from "../lib/design-authority-delta-codec.js";
import { validateDesignAuthorityDeltaAssessmentCurrent } from "../lib/design-authority-delta-validation.js";
import { CLI_EXIT_CODES, CliCommandError } from "../lib/cli-exit.js";
import { normalizeRepositoryFile } from "../lib/long-task-paths.js";
import { assertProtectedRepositoryFile } from "../lib/repository-path-safety.js";
import { canonicalJson } from "../lib/strict-codec.js";

export async function designAuthorityDeltaCommand(
  args: string[],
): Promise<void> {
  const [subcommand = "help", ...rest] = args;
  if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    console.log(help());
    return;
  }
  if (subcommand !== "validate")
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      `unknown authority-delta subcommand: ${subcommand}`,
    );
  const json = rest.includes("--json");
  const positional = rest.filter((item) => item !== "--json");
  if (positional.length !== 1)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      "usage: ty-context design-resource authority-delta validate <assessment.json> [--json]",
    );
  const repository = process.cwd();
  const relative = normalizeRepositoryFile(
    positional[0],
    "design_authority_delta_assessment",
  );
  try {
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...relative.split("/")),
      "design_authority_delta_assessment",
    );
    const assessment = parseDesignAuthorityDeltaAssessment(
      await readFile(file, "utf8"),
    );
    const result = await validateDesignAuthorityDeltaAssessmentCurrent(
      repository,
      assessment,
    );
    if (json) process.stdout.write(canonicalJson(result));
    else {
      console.log(`Authority Delta Assessment: ${result.assessment}`);
      console.log(
        `Authority closure current: ${result.authority_identity.closure_digest}`,
      );
      console.log("Authority adoption: not performed");
      console.log("Repository writes: none");
    }
  } catch (error) {
    throw new CliCommandError(CLI_EXIT_CODES.catalog, message(error), {
      cause: error,
    });
  }
}

function help(): string {
  return `ty-context design-resource authority-delta commands:
  validate <assessment.json> [--json]
                       Strictly validate a non-authoritative assessment
                       against the current complete Design Authority closure

Validation is read-only. It does not select, adopt or update Authority and it
does not start Design System Authoring.`;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
