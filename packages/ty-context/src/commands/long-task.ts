import path from "node:path";
import { runDeliveryFinalGate } from "../lib/long-task-final-v2.js";
import {
  closeDeliveryTask,
  doctorDeliveryTask,
  readDeliveryStatus,
  resumeDeliveryTask,
  stopCheckDeliveryTask,
} from "../lib/long-task-status-v2.js";
import {
  abandonLongTaskState,
  forceClearCorruptActiveState,
} from "../lib/long-task-state.js";
import { verifyDeliveryContract } from "../lib/long-task-verifier-v2.js";
import { repositoryRoot } from "../lib/long-task-workspace.js";
import {
  initializeLongTask,
  preflightLongTask,
} from "./long-task-authoring.js";
import {
  flag,
  option,
  rejectOptions,
  rejectUnknown,
} from "./long-task-command-args.js";
import { explainLongTask } from "./long-task-explain.js";
import { handleLongTaskRevisionCommand } from "./long-task-revision.js";
import { previewVerificationExecution } from "../lib/long-task-verification-preview.js";
import {
  externalConfirmationStatus,
  prepareExternalConfirmations,
  revokeExternalConfirmation,
  submitExternalConfirmation,
} from "../lib/long-task-external-confirmation-plan.js";

export async function longTask(args: string[]): Promise<void> {
  const subcommand = args[0] ?? "help";
  if (subcommand === "help") return help();
  if (subcommand === "external") return external(args.slice(1));
  const workdirArgument = args[1];
  if (!workdirArgument) throw new Error(`${subcommand} requires <workdir>`);
  const workdir = path.resolve(process.cwd(), workdirArgument);

  if (subcommand === "init") {
    rejectUnknown(args.slice(2), []);
    await initializeLongTask(workdir);
    console.log(JSON.stringify({ status: "initialized", workdir }));
    return;
  }
  if (subcommand === "preflight") {
    rejectUnknown(args.slice(2), []);
    return preflightLongTask(workdir);
  }
  if (await handleLongTaskRevisionCommand(subcommand, workdir, args.slice(2)))
    return;
  if (subcommand === "explain") {
    rejectUnknown(args.slice(2), []);
    return explainLongTask(workdir);
  }
  if (subcommand === "verify") return verify(workdir, args.slice(2));
  if (subcommand === "status") {
    rejectUnknown(args.slice(2), []);
    console.log(JSON.stringify(await readDeliveryStatus(workdir), null, 2));
    return;
  }
  if (subcommand === "resume") {
    rejectUnknown(args.slice(2), []);
    console.log(JSON.stringify(await resumeDeliveryTask(workdir), null, 2));
    return;
  }
  if (subcommand === "doctor") {
    rejectUnknown(args.slice(2), []);
    console.log(JSON.stringify(await doctorDeliveryTask(workdir), null, 2));
    return;
  }
  if (subcommand === "final-gate") return finalGate(workdir, args.slice(2));
  if (subcommand === "stop-check") {
    const message = option(args.slice(2), "--message") ?? "";
    rejectOptions(args.slice(2), ["--message"]);
    const result = await stopCheckDeliveryTask(workdir, message);
    console.log(JSON.stringify(result));
    if (!result.continue) process.exitCode = 1;
    return;
  }
  if (subcommand === "close") {
    rejectUnknown(args.slice(2), []);
    const result = await closeDeliveryTask(workdir);
    console.log(
      JSON.stringify({
        status: result.status,
        workdir,
        workflow_status: result.workflow_status,
        external_confirmations: result.external_confirmations,
        external_confirmation_results: result.external_confirmation_results,
        target_profile: result.target_profile,
        target_state: result.target_state,
        stage_results: result.stage_results,
        acceptance_scope: result.acceptance_scope,
        closed_scope: result.closed_scope,
        native_goal_effect: result.native_goal_effect,
      }),
    );
    return;
  }
  if (subcommand === "abandon") {
    const forceCorruptState =
      args.length === 3 && args[2] === "--force-corrupt-state";
    if (args.length > 2 && !forceCorruptState)
      throw new Error(
        `Unknown or injected arguments: ${args.slice(2).join(" ")}`,
      );
    const root = await repositoryRoot(process.cwd());
    if (forceCorruptState) await forceClearCorruptActiveState(root, workdir);
    else await abandonLongTaskState(root, workdir);
    console.log(
      JSON.stringify({
        status: "abandoned",
        workdir,
        force_corrupt_state: forceCorruptState,
      }),
    );
    return;
  }
  throw new Error(`Unknown long-task subcommand: ${subcommand}`);
}

async function verify(workdir: string, args: string[]): Promise<void> {
  const explain = flag(args, "--explain");
  const optionArgs = args.filter((value) => value !== "--explain");
  const outcome = option(optionArgs, "--outcome");
  const check = option(optionArgs, "--check");
  rejectOptions(optionArgs, ["--outcome", "--check"]);
  if (explain) {
    console.log(
      JSON.stringify(
        await previewVerificationExecution(workdir, { outcome, check }),
      ),
    );
    return;
  }
  const result = await verifyDeliveryContract(workdir, { outcome, check });
  console.log(JSON.stringify(result));
  if (result.findings.length) process.exitCode = 1;
}

async function finalGate(workdir: string, args: string[]): Promise<void> {
  rejectUnknown(args, []);
  const result = await runDeliveryFinalGate(workdir);
  console.log(
    JSON.stringify({
      ...result,
      acceptance_scope: "declared_delivery_authority",
      native_goal_effect: "none",
    }),
  );
  if (
    result.workflow_status !== "machine_accepted" &&
    result.workflow_status !== "delivery_accepted"
  )
    process.exitCode = 1;
}

async function external(args: string[]): Promise<void> {
  const action = args[0];
  const workdirArgument = args[1];
  if (!action)
    throw new Error("external requires prepare|submit|status|revoke");
  if (!workdirArgument)
    throw new Error(`external ${action} requires <workdir>`);
  const workdir = path.resolve(process.cwd(), workdirArgument);
  const commandArgs = args.slice(2);
  if (action === "prepare") {
    const confirmation = option(commandArgs, "--confirmation");
    rejectOptions(commandArgs, ["--confirmation"]);
    console.log(
      JSON.stringify(
        await prepareExternalConfirmations(workdir, confirmation),
        null,
        2,
      ),
    );
    return;
  }
  if (action === "submit") {
    const confirmation = option(commandArgs, "--confirmation");
    const record = option(commandArgs, "--record");
    rejectOptions(commandArgs, ["--confirmation", "--record"]);
    if (!confirmation) throw new Error("--confirmation requires a value");
    if (!record) throw new Error("--record requires a value");
    const result = await submitExternalConfirmation({
      workdir,
      confirmation_ref: confirmation,
      record_path: path.resolve(process.cwd(), record),
    });
    console.log(JSON.stringify(result, null, 2));
    if (result.state !== "fulfilled") process.exitCode = 1;
    return;
  }
  if (action === "status") {
    rejectUnknown(commandArgs, []);
    console.log(
      JSON.stringify(await externalConfirmationStatus(workdir), null, 2),
    );
    return;
  }
  if (action === "revoke") {
    const confirmation = option(commandArgs, "--confirmation");
    rejectOptions(commandArgs, ["--confirmation"]);
    if (!confirmation) throw new Error("--confirmation requires a value");
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
    return;
  }
  throw new Error(`Unknown long-task external subcommand: ${action}`);
}

function help(): void {
  console.log(`ty-context long-task commands:
  init <workdir>
  preflight <workdir>
  compile <workdir>
  compile <workdir> --revise
  diagnose-revision <workdir> [--outcome <key>] [--check <key>]
  approve-authority-revision <workdir> --revision <sha>
  explain <workdir>
  verify <workdir> [--outcome <key>] [--check <key>] [--explain]
  status <workdir>
  resume <workdir>
  doctor <workdir>
  final-gate <workdir>
  external prepare <workdir> [--confirmation <key>]
  external submit <workdir> --confirmation <key> --record <path>
  external status <workdir>
  external revoke <workdir> --confirmation <key>
  stop-check <workdir> [--message <text>]
  close <workdir>
  abandon <workdir> [--force-corrupt-state]`);
}
