import { doctor } from "./doctor.js";
import { exportContext } from "./export-context.js";
import { init } from "./init.js";
import { packageSource } from "./package-source.js";
import { sync } from "./sync.js";
import { upgrade } from "./upgrade.js";
import { validate } from "./validate.js";
import { context } from "./context.js";
export type CommandHandler = (args: string[]) => Promise<void> | void;
const retired = [
  "enable",
  "disable",
  "route",
  "check-modularity",
  "validate-code-modularity",
  "validate-harness",
  "long-task",
  "design-resource",
  "design-authority",
  "delivery-set",
  "composite-long-task",
  "composite-campaign",
];
export const commands: Record<string, CommandHandler> = {
  help,
  init,
  sync,
  upgrade,
  doctor,
  context,
  "export-context": exportContext,
  validate,
  "validate-context": (args) => validate(["validate-context", ...args]),
  package: packageSource,
  ...Object.fromEntries(
    retired.map((name) => [
      name,
      () => {
        throw new Error(
          name +
            " is retired in schema 5. Tiny Context now provides project memory and a short development contract. Use upgrade for existing installations; validate-context checks structure only.",
        );
      },
    ]),
  ),
};
export function help(): void {
  console.log(`ty-context commands:
  init [--adopt] [--harness-folder <path>]  Initialize minimal project memory
  sync                                   Refresh supported managed instructions
  upgrade [--check] [--json] [--sessions-stopped]  Explicitly migrate an existing installation
  doctor [--strict]                       Inspect installation and Context diagnostics
  context list --default [--json]         List default body files and selection reasons
  context inspect <path>                 Inspect a Context owner and references
  context create --path <path> --role <role>
  context register --path <path> --role <role> [--apply]
  context move --from <path> --to <path> [--apply]
  context transaction status|rollback|complete
  validate-context                       Check structure and explicitly declared local dependencies
  export-context                         Export temporary project information
  package sync-source|check-source        Maintain canonical/package source parity

The CLI does not validate factual truth or certify product completion.`);
}
