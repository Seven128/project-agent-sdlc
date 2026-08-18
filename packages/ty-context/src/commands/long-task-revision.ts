import path from "node:path";
import { diagnoseAuthorityRevision } from "../lib/long-task-authority-revision-diagnosis.js";
import { authorityRevisionDecisionNextAction } from "../lib/long-task-authority-revision-brief.js";
import { projectAuthorityRevisionDecision } from "../lib/long-task-authority-revision-summary.js";
import type { AuthorityRevisionProposalV2 } from "../lib/long-task-authority-revision-types.js";
import { canRetainProgressForSupportingContextRevision } from "../lib/long-task-context-authority.js";
import { compileDeliveryContract } from "../lib/long-task-delivery-compiler.js";
import type { CompiledDeliveryContractV2 } from "../lib/long-task-delivery-types.js";
import {
  approvePendingAuthorityRevision,
  clearFinalReceipt,
  clearAuthorityRevision,
  commitActiveAuthority,
  invalidateDerivedProgress,
  loadActiveLongTaskAuthority,
  readPendingAuthorityRevision,
  stageCompiledDeliveryContract,
} from "../lib/long-task-state.js";
import { repositoryRoot } from "../lib/long-task-workspace.js";
import { option, rejectOptions } from "./long-task-command-args.js";

type ExecutionModelCheckpoint =
  | {
      required: true;
      phase: "post_authority_lock_pre_implementation";
      action: "change_model_in_host_then_continue";
      resume_token: "model checkpoint cleared, continue";
      turn_boundary: "end_current_turn";
      blocked_until_resume: [
        "product_implementation",
        "file_edits",
        "build",
        "test_execution",
      ];
      model_change_owner: "host_or_user";
      model_change_observable_by_harness: false;
      generic_continue_satisfies: false;
      message: string;
    }
  | { required: false };

export async function handleLongTaskRevisionCommand(
  subcommand: string,
  workdir: string,
  args: string[],
): Promise<boolean> {
  if (subcommand === "compile") await compile(workdir, args);
  else if (subcommand === "diagnose-revision")
    await diagnoseRevision(workdir, args);
  else if (subcommand === "approve-authority-revision")
    await approveRevision(workdir, args);
  else return false;
  return true;
}

async function compile(workdir: string, args: string[]): Promise<void> {
  const revise = args.length === 1 && args[0] === "--revise";
  if (args.length && !revise)
    throw new Error(`Unknown or injected arguments: ${args.join(" ")}`);
  const root = await repositoryRoot(process.cwd());
  const loaded = await loadActiveLongTaskAuthority(root, {
    migrate_legacy: true,
  });
  const previous = loaded.authority?.authority_snapshot ?? null;
  if (loaded.authority && loaded.authority.workdir !== path.resolve(workdir))
    throw new Error(`active_task_exists:${loaded.authority.workdir}`);
  const revisionCapture: { proposal: AuthorityRevisionProposalV2 | null } = {
    proposal: null,
  };
  const compiled = await compileForCommand(
    workdir,
    revise,
    previous,
    revisionCapture,
  );
  if (loaded.authority && loaded.authority.task_id !== compiled.task.id)
    throw new Error(`active_task_exists:${loaded.authority.workdir}`);
  const preserveProgress =
    previous !== null &&
    canRetainProgressForSupportingContextRevision(previous, compiled);
  const stagedCache = await stageCompiledDeliveryContract(compiled);
  let authorityCommitted = false;
  try {
    await commitActiveAuthority({
      candidate: compiled,
      expected_previous_identity:
        loaded.authority?.active_authority_identity ?? null,
    });
    authorityCommitted = true;
    try {
      await stagedCache.publish();
    } catch (error) {
      await stagedCache.discard();
      throw new Error(
        `compiled_cache_projection_publish_failed:${message(error)}`,
      );
    }
  } catch (error) {
    if (!authorityCommitted) await stagedCache.discard();
    throw error;
  }
  if (!previous || previous.compiled_identity !== compiled.compiled_identity) {
    if (!preserveProgress) await invalidateDerivedProgress(workdir);
    await clearFinalReceipt(compiled.repository_root, workdir);
  }
  await clearAuthorityRevision(workdir);
  printCompileResult(
    compiled,
    previous,
    preserveProgress,
    revisionCapture.proposal,
  );
}

function printCompileResult(
  compiled: CompiledDeliveryContractV2,
  previous: CompiledDeliveryContractV2 | null,
  preserveProgress: boolean,
  revisionProposal: AuthorityRevisionProposalV2 | null,
): void {
  const firstAuthorityLock = previous === null;
  const authorityChanged =
    previous !== null &&
    previous.compiled_identity !== compiled.compiled_identity;
  console.log(
    JSON.stringify({
      status: "compiled",
      lifecycle_event: firstAuthorityLock
        ? "authority_locked"
        : authorityChanged
          ? "authority_revision_adopted"
          : "authority_recompiled_unchanged",
      delivery_completed_by_this_event: false,
      native_goal_effect: "none",
      task_id: compiled.task.id,
      compiled_identity: compiled.compiled_identity,
      authority_revision: compiled.authority_revision,
      effective_risk: compiled.effective_risk,
      outcomes: compiled.outcomes.map((outcome) => outcome.key),
      claim_coverage: compiled.claim_coverage,
      progress_preserved: preserveProgress,
      authority_revision_change: revisionProposal
        ? projectAuthorityRevisionDecision(revisionProposal)
        : null,
      next_action: firstAuthorityLock
        ? "End this turn now. Do not implement, edit files, build, or test. After the user handles the model change in the host, ask them to reply exactly: model checkpoint cleared, continue. This is package-managed prompt guidance; Harness cannot observe the next host message or verify the model change."
        : authorityChanged
          ? "Run status or resume, then continue rolling implementation or repair under the adopted Authority Revision."
          : "Continue rolling implementation or repair under the active Authority.",
      execution_model_checkpoint: executionModelCheckpoint(firstAuthorityLock),
    }),
  );
}

async function compileForCommand(
  workdir: string,
  revise: boolean,
  previous: CompiledDeliveryContractV2 | null,
  capture: { proposal: AuthorityRevisionProposalV2 | null },
): Promise<CompiledDeliveryContractV2> {
  try {
    return await compileDeliveryContract(workdir, process.cwd(), {
      revise,
      previous_authority: previous,
      on_authority_revision(value) {
        capture.proposal = value;
      },
    });
  } catch (error) {
    if (message(error).startsWith("authority_change_requires_user_decision:"))
      await printPendingDecision(workdir, previous);
    throw error;
  }
}

async function printPendingDecision(
  workdir: string,
  previous: CompiledDeliveryContractV2 | null,
): Promise<void> {
  const pending = await readPendingAuthorityRevision(workdir);
  if (!pending) throw new Error("authority_revision_pending_state_missing");
  const decision = projectAuthorityRevisionDecision(pending);
  console.log(
    JSON.stringify({
      status: "authority_revision_pending",
      acceptance_authorized: false,
      delivery_completed_by_this_event: false,
      native_goal_effect: "none",
      active_compiled_identity: previous?.compiled_identity ?? null,
      pending_authority_revision: decision,
      next_action: authorityRevisionDecisionNextAction(decision),
    }),
  );
}

async function diagnoseRevision(
  workdir: string,
  args: string[],
): Promise<void> {
  const outcome = option(args, "--outcome");
  const check = option(args, "--check");
  rejectOptions(args, ["--outcome", "--check"]);
  const result = await diagnoseAuthorityRevision(workdir, { outcome, check });
  console.log(JSON.stringify(result));
  if (result.findings.length) process.exitCode = 1;
}

async function approveRevision(workdir: string, args: string[]): Promise<void> {
  const revision = option(args, "--revision");
  rejectOptions(args, ["--revision"]);
  if (!revision) throw new Error("--revision requires a value");
  await approvePendingAuthorityRevision(workdir, revision);
  console.log(
    JSON.stringify({
      status: "authority_revision_approved",
      revision,
      delivery_completed_by_this_event: false,
      native_goal_effect: "none",
      next_action:
        "Run compile --revise to atomically adopt the approved revision, then return to rolling implementation or repair.",
    }),
  );
}

function executionModelCheckpoint(
  firstAuthorityLock: boolean,
): ExecutionModelCheckpoint {
  if (!firstAuthorityLock) return { required: false };
  return {
    required: true,
    phase: "post_authority_lock_pre_implementation",
    action: "change_model_in_host_then_continue",
    resume_token: "model checkpoint cleared, continue",
    turn_boundary: "end_current_turn",
    blocked_until_resume: [
      "product_implementation",
      "file_edits",
      "build",
      "test_execution",
    ],
    model_change_owner: "host_or_user",
    model_change_observable_by_harness: false,
    generic_continue_satisfies: false,
    message:
      "Authority Lock created. End the current turn before product implementation, file edits, builds, or tests. After handling the model change, reply exactly: model checkpoint cleared, continue. This is package-managed prompt guidance; Harness cannot observe the next host message or verify the model change.",
  };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
