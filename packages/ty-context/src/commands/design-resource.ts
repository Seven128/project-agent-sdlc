import { preflightDesignResourceHandoff } from "../lib/design-resource-handoff-validation.js";
import { normalizeRepositoryFile } from "../lib/long-task-paths.js";
import { canonicalJson } from "../lib/strict-codec.js";

export async function designResource(args: string[]): Promise<void> {
  const [subcommand = "help", ...rest] = args;
  if (subcommand === "help") {
    help();
    return;
  }
  if (subcommand !== "preflight")
    throw new Error(`Unknown design-resource subcommand: ${subcommand}`);
  const json = rest.includes("--json");
  const positional = rest.filter((item) => item !== "--json");
  if (positional.length !== 1)
    throw new Error(
      "usage: ty-context design-resource preflight <handoff.md> [--json]",
    );
  const handoffPath = normalizeRepositoryFile(
    positional[0],
    "design_resource_handoff",
  );
  const result = await preflightDesignResourceHandoff(
    process.cwd(),
    handoffPath,
  );
  if (json) {
    process.stdout.write(canonicalJson(result));
    return;
  }
  console.log(`Design resource handoff ready: ${result.handoff_path}`);
  console.log(`Scope: ${result.handoff.scope.key}`);
  console.log(
    `Targets: ${result.handoff.targets.map((item) => item.key).join(", ")}`,
  );
  console.log(
    `Coverage: ${result.counts.subjects} subjects x 8 dimensions (${result.counts.coverage} grouped rows)`,
  );
  console.log(`Acceptance blockers: ${result.counts.acceptance_blockers}`);
}

function help(): void {
  console.log(`ty-context design-resource commands:
  preflight <handoff.md> [--json]
                       Validate one selected implementation handoff`);
}
