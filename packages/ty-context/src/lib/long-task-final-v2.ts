import { compileDeliveryContract } from "./long-task-delivery-compiler.js";
import type {
  CheckExecutionResultV2,
  CompiledCheckV2,
  FinalReceiptV3,
  LongTaskFindingV2,
} from "./long-task-delivery-types.js";
import { evaluateExternalConfirmations } from "./long-task-external-confirmation-plan.js";
import {
  allEffectiveExternalRows,
  blockingExternalRows,
} from "./long-task-external-confirmation-identity.js";
import type { ExternalConfirmationEvaluationV1 } from "./long-task-external-confirmation-types.js";
import { enrichFinding } from "./long-task-finding-context.js";
import {
  captureFinalGateProtectedInputIdentity,
  finalGateIntegrityFindings,
} from "./long-task-final-integrity.js";
import { captureFinalizationIdentity } from "./long-task-finalization-identity.js";
import {
  assertMatchingActiveBinding,
  loadActiveLongTaskAuthority,
} from "./long-task-state.js";
import { finalizeDeliveryGateCas } from "./long-task-terminal-finalization.js";
import {
  assertVerifierAuthorityCurrent,
  deliveryCompileFreshness,
} from "./long-task-freshness.js";
import {
  allCompiledChecks,
  runDeliveryChecks,
} from "./long-task-verifier-v2.js";
import {
  captureWorkspaceFingerprint,
  createWorkspaceSnapshot,
  currentGitState,
  repositoryRoot,
} from "./long-task-workspace.js";

export async function runDeliveryFinalGate(
  workdirInput: string,
  options: { close_on_accept?: boolean } = {},
): Promise<FinalReceiptV3> {
  const startedAt = new Date().toISOString();
  const repository = await repositoryRoot(process.cwd());
  const active = (
    await loadActiveLongTaskAuthority(repository, { migrate_legacy: true })
  ).authority;
  if (!active) throw new Error("active_task_missing");
  if (active.workdir !== (await resolved(workdirInput)))
    throw new Error("active_task_workdir_mismatch");
  await assertVerifierAuthorityCurrent(repository, active.verifier_identity);
  const acceptedAuthority = {
    task_id: active.task_id,
    authority_revision: active.authority_revision,
    compiled_identity: active.active_authority_identity,
    worktree_identity: active.worktree_identity,
  };
  const acceptedCompiled = active.authority_snapshot;
  const [candidate, , staleAuthorityInputs] = await Promise.all([
    currentGitState(repository),
    assertMatchingActiveBinding(acceptedCompiled),
    deliveryCompileFreshness(acceptedCompiled),
  ]);
  if (candidate.dirty.length)
    throw new Error(
      `final_gate_requires_clean_candidate_commit:${candidate.dirty.join(",")}`,
    );

  if (staleAuthorityInputs.length)
    throw new Error(
      `final_gate_protected_input_stale:${staleAuthorityInputs.join(",")}`,
    );

  const compiled = await compileDeliveryContract(active.workdir, repository, {
    live_gate: true,
    initial_task_base: active.initial_task_base,
    authority_revision: active.authority_revision,
    require_completion_gate: true,
  });
  const [, protectedInputsBefore, before] = await Promise.all([
    assertMatchingActiveBinding(compiled),
    captureFinalGateProtectedInputIdentity(repository, compiled),
    captureWorkspaceFingerprint(repository),
  ]);
  const snapshot = await createWorkspaceSnapshot(
    repository,
    active.workdir,
    `final-${compiled.task.id}`,
  );
  try {
    const expectedFinalizationIdentity = await captureFinalizationIdentity({
      repository,
      active,
      compiled,
      candidate: {
        git_head: candidate.head,
        git_tree: candidate.tree,
        snapshot_sha256: snapshot.manifest.snapshot_sha256,
      },
      workspace_fingerprint: snapshot.manifest.fingerprint,
    });
    const run = await runDeliveryChecks(
      compiled,
      snapshot,
      allCompiledChecks(compiled),
      true,
      true,
    );
    const externalResults = await evaluateExternalConfirmations(
      compiled,
      repository,
      active.workdir,
      snapshot.manifest,
      {
        git_head: candidate.head,
        git_tree: candidate.tree,
        snapshot_sha256: snapshot.manifest.snapshot_sha256,
      },
    );
    run.findings.push(
      ...(await finalGateIntegrityFindings({
        repository,
        active,
        accepted_authority: acceptedAuthority,
        candidate,
        workspace_identity_before: before.identity,
        protected_inputs_before: protectedInputsBefore,
      })),
    );
    const outcomeResults = projectOutcomes(
      compiled,
      run.check_results,
      run.findings,
      externalResults,
    );
    const checks = allCompiledChecks(compiled);
    const machineFailed =
      run.check_results.some((result) => semanticCheckFailed(checks, result)) ||
      run.findings.some((finding) => completionFindingBlocks(checks, finding));
    const blockingExternal = externalResults.filter(
      (evaluation) => evaluation.blocks_target,
    );
    const externalNeedsWork = blockingExternal.some(
      (evaluation) =>
        evaluation.state !== "fulfilled" && evaluation.state !== "pending",
    );
    const externalPending = blockingExternal.some(
      (evaluation) => evaluation.state === "pending",
    );
    const workflowStatus: FinalReceiptV3["workflow_status"] =
      machineFailed || externalNeedsWork
        ? "needs_work"
        : externalPending
          ? "blocked_external"
          : blockingExternal.length
            ? "delivery_accepted"
            : "machine_accepted";
    const targetState: FinalReceiptV3["target_state"] =
      workflowStatus === "machine_accepted" ||
      workflowStatus === "delivery_accepted"
        ? compiled.task.target_profile.required_state
        : workflowStatus === "blocked_external"
          ? "blocked_external"
          : "not_accepted";
    const externalFindings = externalConfirmationFindings(
      compiled,
      externalResults,
    );
    const receiptFindings = [...run.findings, ...externalFindings].map(
      (finding) => enrichFinding(compiled, finding),
    );
    return finalizeDeliveryGateCas({
      repository,
      workdir: active.workdir,
      provisional_manifest: snapshot.manifest,
      expected_authority: acceptedAuthority,
      expected_finalization_identity: expectedFinalizationIdentity,
      close_on_accept: options.close_on_accept ?? false,
      provisional_result: {
        schema_version: "long-task-final-receipt-v3",
        authority_scope: "audit_only",
        reusable_for_acceptance: false,
        workflow_status: workflowStatus,
        target_profile: compiled.task.target_profile,
        target_state: targetState,
        stage_results: projectStages(compiled, outcomeResults),
        compiled_identity: compiled.compiled_identity,
        contract_sha256: compiled.contract_sha256,
        snapshot_sha256: snapshot.manifest.snapshot_sha256,
        git_head: candidate.head,
        git_tree: candidate.tree,
        source_hashes: compiled.source_hashes,
        context_hashes: compiled.context_snapshot.sha256,
        verifier_identity: compiled.verifier_identity,
        check_results: run.check_results,
        outcome_results: outcomeResults,
        external_confirmations:
          compiled.global.acceptance.external_confirmations,
        external_confirmation_results: externalResults,
        findings: receiptFindings,
        snapshot_preparation_ms: snapshot.preparation_ms,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      },
    });
  } finally {
    await snapshot.dispose();
  }
}

function projectStages(
  compiled: Awaited<ReturnType<typeof compileDeliveryContract>>,
  outcomes: Record<string, "passed" | "failed" | "blocked_external">,
): FinalReceiptV3["stage_results"] {
  const result: FinalReceiptV3["stage_results"] = {};
  const remaining = new Set(compiled.stages.map((stage) => stage.key));
  while (remaining.size) {
    let advanced = false;
    for (const stage of compiled.stages) {
      if (!remaining.has(stage.key)) continue;
      if (stage.depends_on.some((dependency) => remaining.has(dependency)))
        continue;
      const owned = compiled.outcomes
        .filter((outcome) => outcome.stage === stage.key)
        .map((outcome) => outcomes[outcome.key]);
      result[stage.key] = owned.includes("failed")
        ? "failed"
        : owned.includes("blocked_external")
          ? "blocked_external"
          : stage.depends_on.some(
                (dependency) => result[dependency] !== "passed",
              )
            ? "blocked_dependency"
            : "passed";
      remaining.delete(stage.key);
      advanced = true;
    }
    if (!advanced) {
      for (const stage of remaining) result[stage] = "blocked_dependency";
      break;
    }
  }
  return result;
}

function projectOutcomes(
  compiled: Awaited<ReturnType<typeof compileDeliveryContract>>,
  checks: CheckExecutionResultV2[],
  findings: LongTaskFindingV2[],
  externalResults: ExternalConfirmationEvaluationV1[],
): Record<string, "passed" | "failed" | "blocked_external"> {
  const compiledChecks = allCompiledChecks(compiled);
  return Object.fromEntries(
    compiled.outcomes.map((outcome) => {
      const outcomeKey = outcome.key;
      const owned = checks.filter(
        (check) =>
          check.outcome_key === outcomeKey &&
          compiledChecks.find(
            (candidate) =>
              candidate.outcome_key === check.outcome_key &&
              candidate.key === check.check_key,
          )?.completion_role === "semantic",
      );
      const ownFindings = findings.filter(
        (finding) =>
          (finding.outcome_key === outcomeKey ||
            (finding.outcome_key === null && finding.check_key === null)) &&
          completionFindingBlocks(compiledChecks, finding),
      );
      const external = externalResults.filter(
        (evaluation) =>
          evaluation.blocks_target &&
          externalConfirmationImpactsOutcome(compiled, evaluation, outcomeKey),
      );
      const status =
        owned.some((check) => check.status !== "passed") ||
        ownFindings.length ||
        external.some(
          (evaluation) =>
            evaluation.state !== "fulfilled" && evaluation.state !== "pending",
        )
          ? "failed"
          : external.some((evaluation) => evaluation.state === "pending")
            ? "blocked_external"
            : "passed";
      return [outcomeKey, status];
    }),
  );
}

function semanticCheckFailed(
  checks: CompiledCheckV2[],
  result: CheckExecutionResultV2,
): boolean {
  const check = checks.find(
    (candidate) =>
      candidate.outcome_key === result.outcome_key &&
      candidate.key === result.check_key,
  );
  return check?.completion_role === "semantic" && result.status !== "passed";
}

function completionFindingBlocks(
  checks: CompiledCheckV2[],
  finding: LongTaskFindingV2,
): boolean {
  if (!finding.check_key) return true;
  const check = checks.find(
    (candidate) =>
      candidate.outcome_key === finding.outcome_key &&
      candidate.key === finding.check_key,
  );
  return check?.completion_role !== "diagnostic";
}

function externalConfirmationImpactsOutcome(
  compiled: Awaited<ReturnType<typeof compileDeliveryContract>>,
  evaluation: ExternalConfirmationEvaluationV1,
  outcomeKey: string,
): boolean {
  return blockingExternalRows(compiled, evaluation.confirmation_ref).some(
    (row) =>
      row.outcome_key === outcomeKey ||
      row.claim_ref === outcomeKey ||
      row.claim_ref.startsWith(`${outcomeKey}.`) ||
      row.local_claim_ref === outcomeKey ||
      row.local_claim_ref.startsWith(`${outcomeKey}.`),
  );
}

export function externalConfirmationFindings(
  compiled: Awaited<ReturnType<typeof compileDeliveryContract>>,
  evaluations: ExternalConfirmationEvaluationV1[],
): LongTaskFindingV2[] {
  return evaluations.flatMap((evaluation) => {
    const roles: Array<{
      role: "blocking" | "advisory";
      state: ExternalConfirmationEvaluationV1["state"];
      issues: string[];
    }> = [];
    if (evaluation.blocks_target && evaluation.state !== "fulfilled")
      roles.push({
        role: "blocking",
        state: evaluation.state,
        issues: evaluation.blocking_issues,
      });
    if (
      evaluation.advisory_state &&
      evaluation.advisory_state !== "fulfilled" &&
      evaluation.advisory_state !== "pending"
    )
      roles.push({
        role: "advisory",
        state: evaluation.advisory_state,
        issues: evaluation.advisory_issues,
      });
    return roles.map(({ role, state, issues }) => {
      const declaration =
        compiled.global.acceptance.external_confirmations.find(
          (confirmation) => confirmation.key === evaluation.confirmation_ref,
        );
      const obligations = allEffectiveExternalRows(
        compiled,
        evaluation.confirmation_ref,
      ).filter((obligation) => obligation.completion_role === role);
      const obligationRefs = new Set(
        obligations.map((obligation) => obligation.obligation_ref),
      );
      const results = evaluation.obligation_results.filter(
        (result) => result.completion_role === role,
      );
      const declaredObligations = (declaration?.obligations ?? []).filter(
        (obligation) => obligationRefs.has(obligation.key),
      );
      return {
        code:
          role === "blocking"
            ? `external_confirmation_${state}`
            : `external_confirmation_advisory_${state}`,
        outcome_key:
          results.find((result) => result.outcome_key !== null)?.outcome_key ??
          obligations.find((obligation) => obligation.outcome_key !== null)
            ?.outcome_key ??
          null,
        check_key: null,
        claim_keys: [
          ...new Set([
            ...obligations.map((obligation) => obligation.claim_ref),
            ...results.map((result) => result.claim_ref),
          ]),
        ].sort(),
        fact_refs: obligations.flatMap((obligation) =>
          obligation.fact_ref ? [obligation.fact_ref] : [],
        ),
        proof_obligation_refs: obligations.flatMap((obligation) =>
          obligation.proof_ref ? [obligation.proof_ref] : [],
        ),
        expected_authority_refs: declaredObligations.map(
          (obligation) => obligation.expected_authority_ref,
        ),
        actual_evidence_refs: [
          ...(evaluation.record_sha256
            ? [`external-record:${evaluation.record_sha256}`]
            : []),
          ...results.flatMap((result) =>
            result.evidence_refs.map(
              (reference) => `external-artifact:${reference}`,
            ),
          ),
        ],
        verification_owner: {
          kind: "external_confirmation" as const,
          confirmation_ref: evaluation.confirmation_ref,
          owner: evaluation.owner,
          target_ref: declaration?.target_ref ?? "undeclared",
        },
        invalidation_reasons: [state, ...issues],
        rerun_obligation_refs: obligations.map(
          (obligation) => obligation.obligation_ref,
        ),
        actual: evaluation,
        message:
          role === "blocking"
            ? `Blocking External Confirmation ${evaluation.confirmation_ref} is ${state}.`
            : `Advisory External Confirmation ${evaluation.confirmation_ref} is ${state}.`,
        next_action:
          state === "pending"
            ? `Run ty-context long-task external prepare <workdir> --confirmation ${evaluation.confirmation_ref}, collect exact per-obligation evidence, then submit the record.`
            : `Repair or revoke External Confirmation ${evaluation.confirmation_ref}, prepare it again on the current candidate, and submit a fresh exact record.`,
      };
    });
  });
}

async function resolved(workdir: string): Promise<string> {
  return (await import("node:path")).default.resolve(workdir);
}
