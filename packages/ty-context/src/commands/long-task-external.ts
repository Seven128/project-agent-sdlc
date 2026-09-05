import path from "node:path";
import {
  externalConfirmationStatus,
  prepareExternalConfirmations,
  revokeExternalConfirmation,
  rotateExternalConfirmation,
  submitExternalConfirmation,
} from "../lib/long-task-external-confirmation-plan.js";
import {
  option,
  rejectOptions,
  rejectUnknown,
} from "./long-task-command-args.js";
import { canonicalLongTaskCommandWorkdir } from "./long-task-workdir.js";

export async function runLongTaskExternal(args: string[]): Promise<void> {
  const action = args[0];
  const workdirArgument = args[1];
  if (!action)
    throw new Error("external requires prepare|submit|status|rotate|revoke");
  if (!workdirArgument)
    throw new Error(`external ${action} requires <workdir>`);
  const workdir = await canonicalLongTaskCommandWorkdir(
    path.resolve(process.cwd(), workdirArgument),
    false,
  );
  const commandArgs = args.slice(2);
  if (action === "prepare") return prepare(workdir, commandArgs);
  if (action === "submit") return submit(workdir, commandArgs);
  if (action === "status") return status(workdir, commandArgs);
  if (action === "revoke") return revoke(workdir, commandArgs);
  if (action === "rotate") return rotate(workdir, commandArgs);
  throw new Error(`Unknown long-task external subcommand: ${action}`);
}

async function prepare(workdir: string, args: string[]): Promise<void> {
  const confirmation = option(args, "--confirmation");
  rejectOptions(args, ["--confirmation"]);
  console.log(
    JSON.stringify(
      await prepareExternalConfirmations(workdir, confirmation),
      null,
      2,
    ),
  );
}

async function submit(workdir: string, args: string[]): Promise<void> {
  const confirmation = option(args, "--confirmation");
  const record = option(args, "--record");
  rejectOptions(args, ["--confirmation", "--record"]);
  if (!confirmation) throw new Error("--confirmation requires a value");
  if (!record) throw new Error("--record requires a value");
  const result = await submitExternalConfirmation({
    workdir,
    confirmation_ref: confirmation,
    record_path: path.resolve(process.cwd(), record),
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.state !== "fulfilled") process.exitCode = 1;
}

async function status(workdir: string, args: string[]): Promise<void> {
  rejectUnknown(args, []);
  console.log(
    JSON.stringify(await externalConfirmationStatus(workdir), null, 2),
  );
}

async function revoke(workdir: string, args: string[]): Promise<void> {
  const confirmation = requiredConfirmation(args);
  console.log(
    JSON.stringify(
      await revokeExternalConfirmation({
        workdir,
        confirmation_ref: confirmation,
      }),
      null,
      2,
    ),
  );
}

async function rotate(workdir: string, args: string[]): Promise<void> {
  const confirmation = requiredConfirmation(args);
  console.log(
    JSON.stringify(
      await rotateExternalConfirmation({
        workdir,
        confirmation_ref: confirmation,
      }),
      null,
      2,
    ),
  );
}

function requiredConfirmation(args: string[]): string {
  const confirmation = option(args, "--confirmation");
  rejectOptions(args, ["--confirmation"]);
  if (!confirmation) throw new Error("--confirmation requires a value");
  return confirmation;
}
