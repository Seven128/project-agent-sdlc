import { checkModularity } from "./check-modularity.js";
import { compositeLongTask } from "./composite-long-task.js";
import { compositeCampaign } from "./composite-campaign.js";
import { longTask } from "./long-task.js";
import { deliverySet } from "./delivery-set.js";
import { designResource } from "./design-resource.js";
import { designAuthority } from "./design-authority.js";
import { doctor } from "./doctor.js";
import { exportContext } from "./export-context.js";
import { enable } from "./enable.js";
import { disable } from "./disable.js";
import { init } from "./init.js";
import { packageSource } from "./package-source.js";
import { sync } from "./sync.js";
import { upgrade } from "./upgrade.js";
import { validate } from "./validate.js";
import { route } from "./route.js";
import { context } from "./context.js";
import { assertHarnessProfileEnabled } from "../lib/profiles.js";

export type CommandHandler = (args: string[]) => Promise<void> | void;

export const commands: Record<string, CommandHandler> = {
  help,
  init,
  enable,
  disable,
  sync,
  upgrade,
  doctor,
  route,
  context,
  "check-modularity": checkModularity,
  "export-context": exportContext,
  validate,
  "validate-context": (args) => validate(["validate-context", ...args]),
  "validate-code-modularity": (args) =>
    validate(["validate-code-modularity", ...args]),
  "validate-harness": (args) => validate(["validate-harness", ...args]),
  "long-task": (args) => withLongTaskProfile(args, longTask),
  "design-resource": designResource,
  "design-authority": designAuthority,
  "delivery-set": deliverySet,
  "composite-long-task": compositeLongTask,
  "composite-campaign": compositeCampaign,
  package: packageSource,
};

export function help(): void {
  console.log(`ty-context commands:
  init [--adopt] [--harness-folder <path>]
                       Initialize/adopt a project; without --harness-folder, choose target agent first
  enable long-task     Install Long-Task Skill, lifecycle Hooks, templates and optional Codex worker
  disable long-task    Remove only package-owned long-task profile assets
  sync                 Refresh managed assets; does not run migrations
  upgrade [--check] [--json]
                       Run safe migrations, sync managed assets and doctor
  doctor [--strict]    Diagnose project configuration and all Context files; new findings are advisory
  route --task <text>  Experimentally route to read-only Context candidates
  context inspect <path>
                       Inspect one Context owner, references and optional route explanation
  context register --path <path> --role <role> [--apply]
                       Dry-run or transactionally register one recoverable Context
  context move --from <path> --to <path> [--apply]
                       Dry-run or transactionally move one registered Context
  context transaction status|rollback|complete
                       Inspect or resolve an unfinished Context mutation journal
  check-modularity --touched|--file <path>|--base <ref> [--limit 300] [--fail-on-warning]
                       Warn when selected handwritten source files exceed a line-count limit
  export-context --full|--code|--all|--source-pack|--code-index|--task-context
                       Export temporary Context, code snapshot or bounded Source Pack artifacts
  validate <gate>      Run a Harness validation gate
  validate-context     Validate Minimal Context fact-source recoverability
  validate-code-modularity
                       Enforce touched handwritten source file modularity
  validate-harness     Run validate-context and validate-code-modularity
  design-resource <subcommand>
                       Validate handoffs, Authority assessments, or explicit DRA recovery
  design-authority inspect|tokens
                       Inspect the complete authority closure or project Tokens; read-only
  long-task <subcommand>
                       Manage one Canonical Delivery Contract in the current workspace
  delivery-set <subcommand>
                       Retired; use one complete Contract with semantic Outcomes
  composite-long-task Retired command; use ty-context long-task
  composite-campaign  Retired command; use ty-context long-task
  package <subcommand> Maintain package canonical source`);
}

async function withLongTaskProfile(
  args: string[],
  handler: CommandHandler,
): Promise<void> {
  const subcommand = args[0] ?? "help";
  if (subcommand !== "help")
    await assertHarnessProfileEnabled(process.cwd(), "long-task");
  await handler(args);
}
