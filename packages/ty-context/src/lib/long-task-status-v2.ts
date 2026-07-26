import path from "node:path";
import { compileDeliveryContract } from "./long-task-delivery-compiler.js";
import { authorityRevisionDecisionNextAction } from "./long-task-authority-revision-brief.js";
import type { AuthorityRevisionDecisionV2 } from "./long-task-authority-revision-types.js";
import { projectAuthorityRevisionDecision } from "./long-task-authority-revision-summary.js";
import type {
  ExternalConfirmationV2,
  FinalReceiptV2,
  LongTaskFindingV2,
  OutcomeStatusV2,
  StageStatusV2,
  TargetProfileV2,
} from "./long-task-delivery-types.js";
import { runDeliveryFinalGate } from "./long-task-final-v2.js";
import { deliveryCompileFreshness } from "./long-task-freshness.js";
import {
  activeAuthorityLockExists,
  type ActiveLongTaskAuthorityV3,
  clearActiveBindingCas,
  inspectCompiledCache,
  loadActiveLongTaskAuthority,
  readActiveLongTaskBinding,
  readFinalReceipt,
  readPendingAuthorityRevision,
  readProgressRecords,
} from "./long-task-state.js";
import {
  type AuditGateStatusV2,
  projectDeliveryStatus,
} from "./long-task-status-projection.js";
import {
  captureWorkspaceManifest,
  currentGitState,
  repositoryRoot,
} from "./long-task-workspace.js";

export interface DeliveryStatusV2 {
  schema_version: "long-task-status-v2";
  task_id: string;
  compiled_identity: string;
  effective_risk: "standard" | "strict";
  workspace_snapshot_sha256: string;
  acceptance_authority: "live_final_gate_required";
  acceptance_scope: "declared_machine_authority";
  native_goal_effect: "none";
  final_result: AuditGateStatusV2;
  final_workflow_status: FinalReceiptV2["workflow_status"] | null;
  external_confirmations: ExternalConfirmationV2[];
  target_profile: TargetProfileV2;
  target_state: FinalReceiptV2["target_state"];
  outcomes: Record<string, OutcomeStatusV2>;
  stages: Record<string, StageStatusV2>;
  ready_stages: string[];
  ready_outcomes: string[];
  /** Compatibility alias for the advisory acceptance/verification frontier; never an implementation gate. */
  ready_for_implementation: string[];
  needs_reverify: string[];
  progress_passing: string[];
  progress_failing: string[];
  findings: LongTaskFindingV2[];
  pending_authority_revision: AuthorityRevisionDecisionV2 | null;
}

export async function readDeliveryStatus(
  workdir: string,
): Promise<DeliveryStatusV2> {
  const root = await repositoryRoot(process.cwd());
  const loaded = await loadActiveLongTaskAuthority(root);
  const active = loaded.authority;
  if (!active) throw new Error("active_task_missing");
  if (active.workdir !== path.resolve(workdir))
    throw new Error("active_task_workdir_mismatch");
  return readDeliveryStatusForAuthority(active);
}

async function readDeliveryStatusForAuthority(
  active: ActiveLongTaskAuthorityV3,
): Promise<DeliveryStatusV2> {
  const compiled = active.authority_snapshot;
  const cacheStatus = await inspectCompiledCache(active);
  const current = await captureWorkspaceManifest(
    compiled.repository_root,
    compiled.workdir,
  );
  const stale = await deliveryCompileFreshness(compiled);
  const [progress, pending] = await Promise.all([
    readProgressRecords(active.workdir),
    readPendingAuthorityRevision(active.workdir),
  ]);
  let receipt = null;
  let receiptError: string | null = null;
  try {
    receipt = await readFinalReceipt(
      compiled.repository_root,
      compiled.workdir,
    );
  } catch (error) {
    receiptError = message(error);
  }
  const projection = projectDeliveryStatus({
    compiled,
    manifest: current,
    stale,
    progress,
    receipt,
    receiptError,
  });
  return {
    schema_version: "long-task-status-v2",
    task_id: compiled.task.id,
    compiled_identity: compiled.compiled_identity,
    effective_risk: compiled.effective_risk,
    workspace_snapshot_sha256: current.snapshot_sha256,
    acceptance_authority: "live_final_gate_required",
    acceptance_scope: "declared_machine_authority",
    native_goal_effect: "none",
    final_result: projection.finalResult,
    final_workflow_status: projection.finalWorkflowStatus,
    external_confirmations: compiled.global.acceptance.external_confirmations,
    target_profile: compiled.task.target_profile,
    target_state: projection.targetState,
    outcomes: projection.outcomes,
    stages: projection.stages,
    ready_stages: projection.readyStages,
    ready_outcomes: projection.readyOutcomes,
    ready_for_implementation: projection.readyOutcomes,
    needs_reverify: projection.needsReverify,
    progress_passing: projection.progressPassing,
    progress_failing: projection.progressFailing,
    pending_authority_revision: pending
      ? projectAuthorityRevisionDecision(pending)
      : null,
    findings: [
      ...projection.findings,
      ...(cacheStatus === "compiled_cache_matching"
        ? []
        : [cacheDiagnostic(cacheStatus)]),
    ],
  };
}

export async function resumeDeliveryTask(
  workdir: string,
): Promise<Record<string, unknown>> {
  const root = await repositoryRoot(process.cwd());
  const loaded = await loadActiveLongTaskAuthority(root);
  const active = loaded.authority;
  if (!active) throw new Error("active_task_missing");
  if (active.workdir !== path.resolve(workdir))
    throw new Error("active_task_workdir_mismatch");
  const compiled = active.authority_snapshot;
  // Status capture runs git write-tree; finish it before git status can refresh
  // the same repository index inside currentGitState.
  const status = await readDeliveryStatusForAuthority(active);
  const git = await currentGitState(compiled.repository_root);
  return {
    schema_version: "long-task-resume-v2",
    task: {
      id: compiled.task.id,
      title: compiled.task.title,
      goal: compiled.task.goal,
      target_profile: compiled.task.target_profile,
      execution_targets: compiled.task.execution_targets,
    },
    contract_identity: compiled.compiled_identity,
    authority_revision: compiled.authority_revision,
    effective_risk: compiled.effective_risk,
    context_refs: compiled.task.context_refs,
    git,
    acceptance_authority: "live_final_gate_required",
    acceptance_scope: "declared_machine_authority",
    native_goal_effect: "none",
    last_gate: status.final_result,
    final_workflow_status: status.final_workflow_status,
    external_confirmations: status.external_confirmations,
    target_profile: status.target_profile,
    target_state: status.target_state,
    outcomes: status.outcomes,
    stages: status.stages,
    ready_stages: status.ready_stages,
    ready_outcomes: status.ready_outcomes,
    ready_for_implementation: status.ready_for_implementation,
    needs_reverify: status.needs_reverify,
    progress_passing: status.progress_passing,
    progress_failing: status.progress_failing,
    pending_authority_revision: status.pending_authority_revision,
    recent_findings: status.findings,
    next_safe_action: nextAction(status),
  };
}

export async function doctorDeliveryTask(
  workdirInput: string,
): Promise<Record<string, unknown>> {
  const root = await repositoryRoot(process.cwd());
  let loaded;
  try {
    loaded = await loadActiveLongTaskAuthority(root);
  } catch (error) {
    const finding = doctorAuthorityFinding(message(error));
    return {
      schema_version: "long-task-doctor-v2",
      status: finding,
      healthy: false,
      findings: [finding],
      next_action: `ty-context long-task abandon ${path.resolve(workdirInput)} --force-corrupt-state`,
    };
  }
  const active = loaded.authority;
  if (!active) return { status: "no_active_task", healthy: true };
  if (active.workdir !== path.resolve(workdirInput))
    throw new Error("active_task_workdir_mismatch");
  const findings: string[] = [
    "active_authority_valid",
    await inspectCompiledCache(active),
  ];
  if (await activeAuthorityLockExists(root))
    findings.push("active_authority_lock_present");
  let currentAuthorityIdentity: string | null = null;
  try {
    const compiled = await compileDeliveryContract(active.workdir, root, {
      live_gate: true,
      initial_task_base: active.initial_task_base,
      authority_revision: active.authority_revision,
      require_completion_gate: true,
    });
    currentAuthorityIdentity = compiled.compiled_identity;
    if (compiled.compiled_identity !== active.active_authority_identity)
      findings.push("active_authority_source_mismatch");
  } catch (error) {
    findings.push(`active_authority_source_invalid:${message(error)}`);
  }
  return {
    schema_version: "long-task-doctor-v2",
    status: findings[0],
    healthy: !findings.some(
      (finding) =>
        finding === "active_authority_lock_present" ||
        finding === "active_authority_source_mismatch" ||
        finding.startsWith("active_authority_source_invalid:"),
    ),
    task_id: active.task_id,
    authority_revision: active.authority_revision,
    marker_and_record: "matched",
    contract: "available",
    current_authority_identity: currentAuthorityIdentity,
    active_authority_identity: active.active_authority_identity,
    verifier_identity: active.verifier_identity.bundle_sha256,
    hook: "available",
    source_context_fresh: !findings.some((finding) =>
      finding.startsWith("active_authority_source_"),
    ),
    compiled_cache: findings.find((finding) =>
      finding.startsWith("compiled_cache_"),
    ),
    findings,
    ...(findings.includes("active_authority_lock_present")
      ? {
          next_action: `ty-context long-task abandon ${path.resolve(workdirInput)} --force-corrupt-state`,
        }
      : {}),
  };
}

export async function stopCheckDeliveryTask(
  workdirInput: string,
  messageText = "",
): Promise<StopCheckDeliveryResultV2> {
  const root = await repositoryRoot(process.cwd());
  let active;
  try {
    active = await readActiveLongTaskBinding(root);
  } catch (error) {
    return {
      continue: false,
      reason: "long_task_state_invalid",
      message: message(error),
    };
  }
  if (!active) return { continue: true, reason: "no_active_task" };
  if (active.workdir !== path.resolve(workdirInput))
    return { continue: false, reason: "active_task_workdir_mismatch" };
  try {
    const result = await runDeliveryFinalGate(active.workdir);
    if (
      result.workflow_status === "machine_accepted" ||
      result.workflow_status === "machine_accepted_external_pending"
    ) {
      try {
        await clearActiveBindingCas({
          repository_root: root,
          workdir: active.workdir,
          task_id: active.task_id,
          authority_revision: active.authority_revision,
          compiled_identity: active.active_authority_identity,
          worktree_identity: active.worktree_identity,
        });
      } catch (error) {
        if (
          message(error).includes(
            "active_authority_clear_compare_and_swap_failed",
          )
        )
          return {
            continue: false,
            reason: "active_authority_changed_after_final_gate",
            workflow_status: result.workflow_status,
            external_confirmations: result.external_confirmations,
            target_profile: result.target_profile,
            target_state: result.target_state,
            stage_results: result.stage_results,
            message:
              "Active Authority changed after the Live Final Gate; the accepted identity was not cleared.",
          };
        throw error;
      }
      return {
        continue: true,
        reason: result.workflow_status,
        workflow_status: result.workflow_status,
        external_confirmations: result.external_confirmations,
        target_profile: result.target_profile,
        target_state: result.target_state,
        stage_results: result.stage_results,
        acceptance_scope: "declared_machine_authority",
        native_goal_effect: "none",
        message: acceptedScopeMessage(
          result.workflow_status,
          result.external_confirmations,
          result.target_profile,
        ),
      };
    }
    return {
      continue: false,
      reason: `live_final_gate_${result.workflow_status}`,
      workflow_status: result.workflow_status,
      external_confirmations: result.external_confirmations,
      target_profile: result.target_profile,
      target_state: result.target_state,
      stage_results: result.stage_results,
      message:
        messageText ||
        result.findings.at(-1)?.next_action ||
        "Repair the failing Check and rerun Stop.",
    };
  } catch (error) {
    if (message(error).includes("verifier_authority_migration_required"))
      return {
        continue: false,
        reason: "verifier_authority_migration_required",
      };
    return {
      continue: false,
      reason: "live_final_gate_error",
      message: message(error),
    };
  }
}

export interface StopCheckDeliveryResultV2 {
  continue: boolean;
  reason: string;
  workflow_status?: FinalReceiptV2["workflow_status"];
  external_confirmations?: ExternalConfirmationV2[];
  target_profile?: TargetProfileV2;
  target_state?: FinalReceiptV2["target_state"];
  stage_results?: FinalReceiptV2["stage_results"];
  acceptance_scope?: "declared_machine_authority";
  native_goal_effect?: "none";
  message?: string;
}

export interface CloseDeliveryResultV2 {
  status: "closed";
  workflow_status: Extract<
    FinalReceiptV2["workflow_status"],
    "machine_accepted" | "machine_accepted_external_pending"
  >;
  external_confirmations: ExternalConfirmationV2[];
  target_profile: TargetProfileV2;
  target_state: FinalReceiptV2["target_state"];
  stage_results: FinalReceiptV2["stage_results"];
  acceptance_scope: "declared_machine_authority";
  closed_scope: "machine_authority";
  native_goal_effect: "none";
}

export async function closeDeliveryTask(
  workdir: string,
): Promise<CloseDeliveryResultV2> {
  const root = await repositoryRoot(process.cwd());
  const active = await readActiveLongTaskBinding(root);
  if (!active || active.workdir !== path.resolve(workdir))
    throw new Error("active_task_missing_or_mismatched");
  const result = await runDeliveryFinalGate(active.workdir);
  if (
    result.workflow_status !== "machine_accepted" &&
    result.workflow_status !== "machine_accepted_external_pending"
  )
    throw new Error(`close_live_final_gate_failed:${result.workflow_status}`);
  await clearActiveBindingCas({
    repository_root: root,
    workdir: active.workdir,
    task_id: active.task_id,
    authority_revision: active.authority_revision,
    compiled_identity: active.active_authority_identity,
    worktree_identity: active.worktree_identity,
  });
  return {
    status: "closed",
    workflow_status: result.workflow_status,
    external_confirmations: result.external_confirmations,
    target_profile: result.target_profile,
    target_state: result.target_state,
    stage_results: result.stage_results,
    acceptance_scope: "declared_machine_authority",
    closed_scope: "machine_authority",
    native_goal_effect: "none",
  };
}

function acceptedScopeMessage(
  workflowStatus: Extract<
    FinalReceiptV2["workflow_status"],
    "machine_accepted" | "machine_accepted_external_pending"
  >,
  confirmations: ExternalConfirmationV2[],
  targetProfile: TargetProfileV2,
): string {
  const scope = `Declared machine Authority accepted for target ${targetProfile.key}:${targetProfile.required_state} and cleared. This result has no direct effect on the platform-native Goal; before completing it, confirm current Goal/user meaning is fully represented by accepted Source and no revision, blocker, or omitted requirement remains.`;
  if (workflowStatus === "machine_accepted") return scope;
  const pending = confirmations
    .map((confirmation) => `${confirmation.key} (${confirmation.owner})`)
    .join(", ");
  return `${scope} Complete external delivery remains pending: ${pending}. Do not report complete external delivery.`;
}

function nextAction(status: DeliveryStatusV2): string {
  if (status.pending_authority_revision)
    return authorityRevisionDecisionNextAction(
      status.pending_authority_revision,
    );
  if (status.findings.length) return status.findings.at(-1)!.next_action;
  if (status.ready_outcomes.length) {
    const outcome = status.ready_outcomes[0]!;
    if (status.outcomes[outcome] === "progress_stale")
      return `Targeted evidence for Outcome ${outcome} on the acceptance/verification frontier is stale. This is a freshness fact, not an implementation gate or immediate per-edit rerun instruction: coalesce relevant changes and refresh the cheapest reliable declared Check only before relying on this Progress. Implementation may continue, and Final Gate needs no targeted refresh because it reruns every Check.`;
    return `Outcome ${outcome} is on the advisory acceptance/verification frontier. Implementation order remains Goal-owned; run its declared Check when the feedback value justifies the cost, or continue in-scope implementation before the complete Final Gate.`;
  }
  return "Create a clean candidate commit; Stop will run the authoritative Live Final Gate.";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function cacheDiagnostic(
  code:
    "compiled_cache_missing_repairable" | "compiled_cache_mismatched_ignored",
): LongTaskFindingV2 {
  return {
    code,
    outcome_key: null,
    check_key: null,
    message:
      code === "compiled_cache_missing_repairable"
        ? "The compiled cache projection is missing; active authority remains valid."
        : "The compiled cache projection does not match active authority and was ignored.",
    next_action:
      "Run ty-context long-task compile to rebuild the cache projection from active authority.",
  };
}

function doctorAuthorityFinding(error: string): string {
  if (error.includes("legacy_v2_active_authority_manual_required"))
    return "legacy_v2_active_authority_manual_required";
  if (error.includes("active_authority_continuity_unrecoverable"))
    return "active_authority_continuity_unrecoverable";
  if (
    error.includes("marker") ||
    error.includes("active_binding_marker") ||
    error.includes("active_binding_record_missing")
  )
    return "marker_record_mismatch";
  return "active_authority_invalid";
}
