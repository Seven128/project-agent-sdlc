import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileDeliveryContract } from "./long-task-delivery-compiler.js";
import type {
  FinalReceiptV3,
  LongTaskFindingV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { evaluateExternalConfirmations } from "./long-task-external-confirmation-plan.js";
import type { ExternalConfirmationEvaluationV1 } from "./long-task-external-confirmation-types.js";
import {
  captureFinalizationIdentity,
  finalizationIdentityDigest,
  type FinalizationIdentityV1,
} from "./long-task-finalization-identity.js";
import {
  assertVerifierAuthorityCurrent,
  deliveryCompileFreshness,
} from "./long-task-freshness.js";
import {
  activeAuthorityIdentityMatches,
  assertMatchingActiveBinding,
  commitFinalReceiptTransaction,
  loadActiveLongTaskAuthority,
  sealFinalReceipt,
  type ActiveAuthorityIdentityExpectation,
  type ActiveLongTaskAuthorityV3,
  withActiveAuthorityLock,
} from "./long-task-state.js";
import { canonicalValueJson } from "./strict-codec.js";
import {
  captureWorkspaceFingerprint,
  currentGitState,
} from "./long-task-workspace.js";
import { workspaceFingerprintExcludedPrefixes } from "./long-task-workspace-manifest.js";

type UnsignedFinalReceiptV3 = Omit<FinalReceiptV3, "receipt_sha256">;

export async function finalizeDeliveryGateCas(input: {
  provisional_result: Omit<
    FinalReceiptV3,
    "receipt_sha256" | "finalization_identity_sha256"
  >;
  expected_authority: ActiveAuthorityIdentityExpectation;
  expected_finalization_identity: FinalizationIdentityV1;
  repository: string;
  workdir: string;
  provisional_manifest: WorkspaceManifestV2;
  close_on_accept: boolean;
}): Promise<FinalReceiptV3> {
  const expectedDigest = finalizationIdentityDigest(
    input.expected_finalization_identity,
  );
  return withActiveAuthorityLock(
    input.repository,
    "finalize",
    async (lockToken) => {
      let currentActive: ActiveLongTaskAuthorityV3 | null = null;
      let currentIdentity: FinalizationIdentityV1 | null = null;
      let currentExternal: ExternalConfirmationEvaluationV1[] | null = null;
      try {
        currentActive = (
          await loadActiveLongTaskAuthority(input.repository, {
            migrate_legacy: false,
          })
        ).authority;
        if (
          !currentActive ||
          currentActive.workdir !== input.workdir ||
          !activeAuthorityIdentityMatches(
            currentActive,
            input.expected_authority,
          )
        )
          throw new FinalizationCasError(
            "finalization_authority_compare_and_swap_failed",
          );
        await assertVerifierAuthorityCurrent(
          input.repository,
          currentActive.verifier_identity,
        );
        const stale = await deliveryCompileFreshness(
          currentActive.authority_snapshot,
        );
        if (stale.length)
          throw new FinalizationCasError(
            `finalization_compiled_inputs_stale:${stale.join(",")}`,
          );
        const compiled = await compileDeliveryContract(
          input.workdir,
          input.repository,
          {
            live_gate: true,
            initial_task_base: currentActive.initial_task_base,
            authority_revision: currentActive.authority_revision,
            require_completion_gate: true,
          },
        );
        await assertMatchingActiveBinding(compiled);
        const current = await captureCurrentFinalizationState(
          input.repository,
          input.workdir,
          currentActive,
          compiled,
          input.provisional_manifest,
        );
        currentIdentity = current.identity;
        assertExpectedFinalizationIdentity(
          currentIdentity,
          input.expected_finalization_identity,
        );
        currentExternal = await evaluateExternalConfirmations(
          compiled,
          input.repository,
          input.workdir,
          input.provisional_manifest,
          current.candidate,
        );
        if (
          canonicalValueJson(currentExternal) !==
          canonicalValueJson(
            input.provisional_result.external_confirmation_results,
          )
        )
          throw new FinalizationCasError(
            "finalization_external_evaluation_changed",
          );
        await finalizationPhaseSignal("after_finalization_evaluation");
        const unsigned: UnsignedFinalReceiptV3 = {
          ...input.provisional_result,
          external_confirmation_results: currentExternal,
          finalization_identity_sha256: expectedDigest,
          completed_at: new Date().toISOString(),
        };
        const accepted = acceptedWorkflowStatus(unsigned.workflow_status);
        return await commitFinalReceiptTransaction({
          lock_token: lockToken,
          repository_root: input.repository,
          workdir: input.workdir,
          unsigned,
          expected_authority: input.expected_authority,
          close_on_accept: input.close_on_accept && accepted,
          validate_current: async (phase) => {
            const signaled = await finalizationPhaseSignal(phase);
            if (phase === "after_receipt_stage" && !signaled) return;
            const refreshed = await captureCurrentFinalizationState(
              input.repository,
              input.workdir,
              currentActive!,
              compiled,
              input.provisional_manifest,
            );
            assertExpectedFinalizationIdentity(
              refreshed.identity,
              input.expected_finalization_identity,
            );
          },
        });
      } catch (error) {
        const currentDigest = currentIdentity
          ? finalizationIdentityDigest(currentIdentity)
          : expectedDigest;
        const failure = rejectedReceipt(
          input.provisional_result,
          currentExternal,
          currentDigest,
          error,
        );
        const activeNow = (
          await loadActiveLongTaskAuthority(input.repository, {
            migrate_legacy: false,
          }).catch(() => ({ authority: null }))
        ).authority;
        if (activeNow && activeNow.workdir === input.workdir) {
          const currentExpectation = authorityExpectation(activeNow);
          try {
            return await commitFinalReceiptTransaction({
              lock_token: lockToken,
              repository_root: input.repository,
              workdir: input.workdir,
              unsigned: failure,
              expected_authority: currentExpectation,
              close_on_accept: false,
              validate_current: async () => undefined,
            });
          } catch {
            // A failure Receipt is audit-only. If even its persistence CAS races,
            // return a sealed non-accepted result without overwriting newer state.
          }
        }
        return sealFinalReceipt(failure);
      }
    },
  );
}

async function captureCurrentFinalizationState(
  repository: string,
  workdir: string,
  active: ActiveLongTaskAuthorityV3,
  compiled: Awaited<ReturnType<typeof compileDeliveryContract>>,
  provisionalManifest: WorkspaceManifestV2,
) {
  // Fingerprint capture runs git write-tree. The finalization lock excludes
  // Harness mutations, while this ordering also prevents a same-process
  // currentGitState status refresh from competing for the repository index.
  const fingerprint = await captureWorkspaceFingerprint(
    repository,
    workspaceFingerprintExcludedPrefixes(repository, [workdir]),
  );
  const git = await currentGitState(repository);
  if (
    git.dirty.length ||
    fingerprint.head !== git.head ||
    fingerprint.head_tree !== git.tree ||
    provisionalManifest.git_head !== git.head ||
    provisionalManifest.fingerprint.head_tree !== git.tree ||
    provisionalManifest.fingerprint.identity !== fingerprint.identity ||
    provisionalManifest.snapshot_sha256 !== fingerprint.identity
  )
    throw new FinalizationCasError(
      `finalization_candidate_not_clean_or_stable:${git.dirty.join(",")}`,
    );
  const candidate = {
    git_head: git.head,
    git_tree: git.tree,
    snapshot_sha256: fingerprint.identity,
  };
  return {
    candidate,
    identity: await captureFinalizationIdentity({
      repository,
      active,
      compiled,
      candidate,
      workspace_fingerprint: fingerprint,
    }),
  };
}

function assertExpectedFinalizationIdentity(
  current: FinalizationIdentityV1,
  expected: FinalizationIdentityV1,
): void {
  if (
    finalizationIdentityDigest(current) !== finalizationIdentityDigest(expected)
  )
    throw new FinalizationCasError(
      "finalization_identity_compare_and_swap_failed",
    );
}

function rejectedReceipt(
  provisional: Omit<
    FinalReceiptV3,
    "receipt_sha256" | "finalization_identity_sha256"
  >,
  currentExternal: ExternalConfirmationEvaluationV1[] | null,
  finalizationIdentitySha256: string,
  error: unknown,
): UnsignedFinalReceiptV3 {
  const reason = message(error);
  const finding: LongTaskFindingV2 = {
    code: reason.split(":", 1)[0] || "finalization_compare_and_swap_failed",
    outcome_key: null,
    check_key: null,
    message:
      "Finalization identity or persistence changed during the Live Final Gate; no accepted terminal was published and Active Authority was not cleared.",
    actual: { reason },
    invalidation_reasons: [reason],
    next_action:
      "Stop concurrent mutation, inspect the current Authority/candidate/external state, and rerun the complete Live Final Gate.",
  };
  return {
    ...provisional,
    workflow_status: "needs_work",
    target_state: "not_accepted",
    stage_results: Object.fromEntries(
      Object.keys(provisional.stage_results).map((key) => [key, "failed"]),
    ),
    outcome_results: Object.fromEntries(
      Object.keys(provisional.outcome_results).map((key) => [key, "failed"]),
    ),
    external_confirmation_results:
      currentExternal ?? provisional.external_confirmation_results,
    findings: [...provisional.findings, finding],
    finalization_identity_sha256: finalizationIdentitySha256,
    completed_at: new Date().toISOString(),
  };
}

function authorityExpectation(
  active: ActiveLongTaskAuthorityV3,
): ActiveAuthorityIdentityExpectation {
  return {
    task_id: active.task_id,
    authority_revision: active.authority_revision,
    compiled_identity: active.active_authority_identity,
    worktree_identity: active.worktree_identity,
  };
}

function acceptedWorkflowStatus(
  status: FinalReceiptV3["workflow_status"],
): boolean {
  return status === "machine_accepted" || status === "delivery_accepted";
}

class FinalizationCasError extends Error {}

async function finalizationPhaseSignal(phase: string): Promise<boolean> {
  if (process.env.NODE_ENV !== "test") return false;
  const configured = process.env.TY_CONTEXT_TEST_FINALIZATION_SIGNAL_DIR;
  if (!configured) return false;
  if (!path.isAbsolute(configured))
    throw new FinalizationCasError(
      "finalization_test_signal_directory_must_be_absolute",
    );
  const folder = path.resolve(configured);
  await mkdir(folder, { recursive: true });
  const started = path.join(folder, `${phase}.started`);
  const release = path.join(folder, `${phase}.release`);
  await writeFile(started, `${phase}\n`, { flag: "a" });
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (
      await access(release)
        .then(() => true)
        .catch(() => false)
    )
      return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new FinalizationCasError(`finalization_test_signal_timeout:${phase}`);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
