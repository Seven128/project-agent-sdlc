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
import { resolveLongTaskCommandWorkdir } from "./long-task-workdir.js";
import { previewVerificationExecution } from "../lib/long-task-verification-preview.js";
import { runLongTaskCompactAuthoring } from "../lib/long-task-compact-authoring-service.js";
import { runLongTaskExternal } from "./long-task-external.js";

export async function longTask(args: string[]): Promise<void> {
  const subcommand = args[0] ?? "help";
  if (subcommand === "help") return help();
  if (subcommand === "external") return runLongTaskExternal(args.slice(1));
  const workdir = await resolveLongTaskCommandWorkdir(subcommand, args[1]);

  if (subcommand === "init") return initialize(workdir, args.slice(2));
  if (subcommand === "preflight") return preflight(workdir, args.slice(2));
  if (subcommand === "compact-authoring")
    return compactAuthoring(workdir, args.slice(2));
  if (await handleLongTaskRevisionCommand(subcommand, workdir, args.slice(2)))
    return;
  if (subcommand === "explain") {
    rejectUnknown(args.slice(2), []);
    return explainLongTask(workdir);
  }
  if (subcommand === "verify") return verify(workdir, args.slice(2));
  if (subcommand === "status") return status(workdir, args.slice(2));
  if (subcommand === "resume") return resume(workdir, args.slice(2));
  if (subcommand === "doctor") return doctor(workdir, args.slice(2));
  if (subcommand === "final-gate") return finalGate(workdir, args.slice(2));
  if (subcommand === "stop-check") return stopCheck(workdir, args.slice(2));
  if (subcommand === "close") return close(workdir, args.slice(2));
  if (subcommand === "abandon") return abandon(workdir, args.slice(2));
  throw new Error(`Unknown long-task subcommand: ${subcommand}`);
}

async function initialize(workdir: string, args: string[]): Promise<void> {
  rejectUnknown(args, []);
  await initializeLongTask(workdir);
  console.log(JSON.stringify({ status: "initialized", workdir }));
}

async function preflight(workdir: string, args: string[]): Promise<void> {
  rejectUnknown(args, []);
  await preflightLongTask(workdir);
}

async function compactAuthoring(
  workdir: string,
  args: string[],
): Promise<void> {
  const apply = flag(args, "--apply");
  rejectUnknown(args, apply ? ["--apply"] : []);
  const result = await runLongTaskCompactAuthoring(process.cwd(), workdir, {
    apply,
  });
  console.log(JSON.stringify(result, null, 2));
  if (
    result.status === "blocked" ||
    (apply && !result.applied && result.status !== "already_compact")
  )
    process.exitCode = 1;
}

async function status(workdir: string, args: string[]): Promise<void> {
  rejectUnknown(args, []);
  console.log(JSON.stringify(await readDeliveryStatus(workdir), null, 2));
}

async function resume(workdir: string, args: string[]): Promise<void> {
  rejectUnknown(args, []);
  console.log(JSON.stringify(await resumeDeliveryTask(workdir), null, 2));
}

async function doctor(workdir: string, args: string[]): Promise<void> {
  rejectUnknown(args, []);
  console.log(JSON.stringify(await doctorDeliveryTask(workdir), null, 2));
}

async function stopCheck(workdir: string, args: string[]): Promise<void> {
  const message = option(args, "--message") ?? "";
  rejectOptions(args, ["--message"]);
  const result = await stopCheckDeliveryTask(workdir, message);
  console.log(JSON.stringify(result));
  if (!result.continue) process.exitCode = 1;
}

async function close(workdir: string, args: string[]): Promise<void> {
  rejectUnknown(args, []);
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
}

async function abandon(workdir: string, args: string[]): Promise<void> {
  const forceCorruptState =
    args.length === 1 && args[0] === "--force-corrupt-state";
  if (args.length > 0 && !forceCorruptState)
    throw new Error(`Unknown or injected arguments: ${args.join(" ")}`);
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

function help(): void {
  console.log(`ty-context long-task commands:
  init <workdir>
  preflight <workdir>
  compact-authoring <workdir> [--apply]
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
  external rotate <workdir> --confirmation <key>
  external revoke <workdir> --confirmation <key>
  stop-check <workdir> [--message <text>]
  close <workdir>
  abandon <workdir> [--force-corrupt-state]`);
}
