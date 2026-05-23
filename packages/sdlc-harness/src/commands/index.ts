import { doctor } from "./doctor.js";
import { init } from "./init.js";
import { packageSource } from "./package-source.js";
import { sync } from "./sync.js";
import { upgrade } from "./upgrade.js";
import { validate } from "./validate.js";

export type CommandHandler = (args: string[]) => Promise<void> | void;

export const commands: Record<string, CommandHandler> = {
  help,
  init,
  sync,
  upgrade,
  doctor,
  validate,
  "validate-harness": (args) => validate(["validate-harness", ...args]),
  "validate-current": (args) => validate(["validate-current", ...args]),
  "validate-pm": (args) => validate(["validate-pm", ...args]),
  "validate-design": (args) => validate(["validate-design", ...args]),
  "validate-dev": (args) => validate(["validate-dev", ...args]),
  package: packageSource
};

export function help(): void {
  console.log(`sdlc-harness commands:
  init [--adopt] [--harness-folder <path>]
                       Initialize a new project or adopt an existing one
  sync                 Materialize canonical assets into the workspace
  upgrade              Run migrations and then sync
  doctor               Diagnose project configuration and drift
  validate <gate>      Run a Harness validation gate
  package <subcommand> Maintain package canonical source`);
}
