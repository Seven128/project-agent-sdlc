import { compileDeliveryContract } from "./long-task-delivery-compiler.js";
import type {
  CheckExecutionResultV2,
  CompiledCheckV2,
  FinalReceiptV3,
  LongTaskFindingV2,
} from "./long-task-delivery-types.js";
import { evaluateExternalConfirmations } from "./long-task-external-confirmation-plan.js";
import type { ExternalConfirmationEvaluationV1 } from "./long-task-external-confirmation-types.js";
import { enrichFinding } from "./long-task-finding-context.js";
import {
  captureFinalGateProtectedInputIdentity,
  finalGateIntegrityFindings,
} from "./long-task-final-integrity.js";
import {
  assertMatchingActiveBinding,
  loadActiveLongTaskAuthority,
  writeFinalReceipt,
} from "./long-task-state.js";
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
      (confirmation) => confirmation.blocks_target,
    );
    const externalNeedsWork = blockingExternal.some((confirmation) =>
      ["failed", "unable", "invalid", "stale"].includes(confirmation.state),
    );
    const externalPending = blockingExternal.some(
      (confirmation) => confirmation.state === "pending",
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
    return writeFinalReceipt(repository, active.workdir, {
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
      external_confirmations: compiled.global.acceptance.external_confirmations,
      external_confirmation_results: externalResults,
      findings: receiptFindings,
      snapshot_preparation_ms: snapshot.preparation_ms,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
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
        (confirmation) =>
          confirmation.blocks_target &&
          externalConfirmationImpactsOutcome(
            compiled,
            confirmation,
            outcomeKey,
          ),
      );
      const status =
        owned.some((check) => check.status !== "passed") ||
        ownFindings.length ||
        external.some((confirmation) =>
          ["failed", "unable", "invalid", "stale"].includes(confirmation.state),
        )
          ? "failed"
          : external.some((confirmation) => confirmation.state === "pending")
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
  if (
    evaluation.obligation_results.some(
      (result) => result.outcome_key === outcomeKey,
    )
  )
    return true;
  const declaration = compiled.global.acceptance.external_confirmations.find(
    (confirmation) => confirmation.key === evaluation.confirmation_ref,
  );
  return Boolean(
    declaration?.impact_claims.some(
      (claim) => claim === outcomeKey || claim.startsWith(`${outcomeKey}.`),
    ),
  );
}

export function externalConfirmationFindings(
  compiled: Awaited<ReturnType<typeof compileDeliveryContract>>,
  evaluations: ExternalConfirmationEvaluationV1[],
): LongTaskFindingV2[] {
  return evaluations
    .filter(
      (evaluation) =>
        evaluation.state !== "fulfilled" &&
        (evaluation.blocks_target || evaluation.state !== "pending"),
    )
    .map((evaluation) => {
      const declaration =
        compiled.global.acceptance.external_confirmations.find(
          (confirmation) => confirmation.key === evaluation.confirmation_ref,
        );
      const obligations = compiled.acceptance_reachability.obligations.filter(
        (obligation) =>
          obligation.confirmation_ref === evaluation.confirmation_ref,
      );
      const declaredObligations = declaration?.obligations ?? [];
      return {
        code: evaluation.blocks_target
          ? `external_confirmation_${evaluation.state}`
          : `external_confirmation_advisory_${evaluation.state}`,
        outcome_key:
          evaluation.obligation_results.find(
            (result) => result.outcome_key !== null,
          )?.outcome_key ?? null,
        check_key: null,
        claim_keys: [
          ...new Set([
            ...obligations.map((obligation) => obligation.claim_ref),
            ...evaluation.obligation_results.map((result) => result.claim_ref),
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
          ...evaluation.obligation_results.flatMap((result) =>
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
        invalidation_reasons: [evaluation.state, ...evaluation.issues],
        rerun_obligation_refs: obligations.map(
          (obligation) => obligation.obligation_ref,
        ),
        actual: evaluation,
        message: evaluation.blocks_target
          ? `Blocking External Confirmation ${evaluation.confirmation_ref} is ${evaluation.state}.`
          : `Advisory External Confirmation ${evaluation.confirmation_ref} is ${evaluation.state}.`,
        next_action:
          evaluation.state === "pending"
            ? `Run ty-context long-task external prepare <workdir> --confirmation ${evaluation.confirmation_ref}, collect exact per-obligation evidence, then submit the record.`
            : `Repair or revoke External Confirmation ${evaluation.confirmation_ref}, prepare it again on the current candidate, and submit a fresh exact record.`,
      };
    });
}

async function resolved(workdir: string): Promise<string> {
  return (await import("node:path")).default.resolve(workdir);
}
