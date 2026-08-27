import type {
  CompiledDeliveryContractV2,
  FinalReceiptV2,
  LongTaskFindingV2,
  OutcomeStatusV2,
  ProgressRecordV2,
  StageStatusV2,
  WorkspaceManifestV2,
  ExternalConfirmationEvaluationV1,
} from "./long-task-delivery-types.js";
import { progressRecordFresh } from "./long-task-progress.js";
import { blockingExternalRows } from "./long-task-external-confirmation-identity.js";

interface StatusProjectionInputV2 {
  compiled: CompiledDeliveryContractV2;
  manifest: WorkspaceManifestV2;
  stale: string[];
  progress: Record<string, ProgressRecordV2>;
  receipt: FinalReceiptV2 | null;
  receiptError: string | null;
  finalizationIdentitySha256: string | null;
  externalConfirmations: ExternalConfirmationEvaluationV1[];
}

export type AuditGateStatusV2 =
  | "no_final_gate"
  | "last_gate_passed"
  | "last_gate_failed"
  | "last_gate_blocked"
  | "last_gate_inputs_stale";

export function projectDeliveryStatus(input: StatusProjectionInputV2): {
  finalResult: AuditGateStatusV2;
  finalWorkflowStatus: FinalReceiptV2["workflow_status"] | null;
  targetState: FinalReceiptV2["target_state"];
  outcomes: Record<string, OutcomeStatusV2>;
  stages: Record<string, StageStatusV2>;
  readyStages: string[];
  readyOutcomes: string[];
  needsReverify: string[];
  progressPassing: string[];
  progressFailing: string[];
  findings: LongTaskFindingV2[];
} {
  const outcomes = projectOutcomes(input);
  const stages = projectStages(input.compiled, outcomes);
  return {
    finalResult: projectFinalResult(input),
    finalWorkflowStatus: receiptFresh(input)
      ? input.receipt!.workflow_status
      : null,
    targetState: receiptFresh(input)
      ? (input.receipt!.target_state ?? legacyTargetState(input.receipt!))
      : "not_accepted",
    outcomes,
    stages,
    readyStages: Object.entries(stages)
      .filter(([, status]) => status === "ready")
      .map(([key]) => key),
    readyOutcomes: readyOutcomes(input.compiled, outcomes, stages),
    needsReverify: Object.entries(outcomes)
      .filter(([, status]) =>
        ["unverified", "progress_stale", "progress_failing"].includes(status),
      )
      .map(([key]) => key),
    progressPassing: Object.entries(outcomes)
      .filter(([, status]) => status === "progress_passing")
      .map(([key]) => key),
    progressFailing: Object.entries(outcomes)
      .filter(([, status]) => status === "progress_failing")
      .map(([key]) => key),
    findings: projectFindings(input),
  };
}

function projectOutcomes(
  input: StatusProjectionInputV2,
): Record<string, OutcomeStatusV2> {
  const outcomes: Record<string, OutcomeStatusV2> = {};
  for (const outcome of input.compiled.outcomes) {
    const external = input.externalConfirmations.filter(
      (evaluation) =>
        evaluation.blocks_target &&
        externalConfirmationImpactsOutcome(
          input.compiled,
          evaluation,
          outcome.key,
        ),
    );
    const states = outcome.acceptance.checks.map((check) => {
      const record = input.progress[check.internal_id];
      if (!record) return "unverified" as const;
      if (
        input.stale.length ||
        !progressRecordFresh(record, input.compiled, input.manifest, check)
      )
        return "progress_stale" as const;
      if (record.result === "passed") return "progress_passing" as const;
      if (record.result === "blocked_external")
        return "blocked_external" as const;
      return "progress_failing" as const;
    });
    outcomes[outcome.key] =
      states.includes("progress_failing") ||
      external.some(
        (evaluation) =>
          evaluation.state !== "fulfilled" && evaluation.state !== "pending",
      )
        ? "progress_failing"
        : external.some((evaluation) => evaluation.state === "pending") ||
            states.includes("blocked_external")
          ? "blocked_external"
          : states.includes("progress_stale")
            ? "progress_stale"
            : states.length > 0 &&
                states.every((state) => state === "progress_passing")
              ? "progress_passing"
              : "unverified";
  }
  return outcomes;
}

function externalConfirmationImpactsOutcome(
  compiled: CompiledDeliveryContractV2,
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

function projectFindings(input: StatusProjectionInputV2): LongTaskFindingV2[] {
  const findings: LongTaskFindingV2[] = input.stale.map((code) => ({
    code,
    outcome_key: null,
    check_key: null,
    message: "A compiled authority input changed.",
    next_action: "Review the change and recompile the Delivery Contract.",
  }));
  if (input.receiptError)
    findings.push({
      code: input.receiptError,
      outcome_key: null,
      check_key: null,
      message:
        "The last audit Receipt is invalid; it has no acceptance authority.",
      next_action: "Run a new Live Final Gate.",
    });
  const checks = [
    ...input.compiled.global.acceptance.checks,
    ...input.compiled.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
  for (const record of Object.values(input.progress)) {
    const check = checks.find(
      (candidate) => candidate.internal_id === record.check_internal_id,
    );
    if (!check) continue;
    if (progressRecordFresh(record, input.compiled, input.manifest, check)) {
      findings.push(...record.findings);
      continue;
    }
    if (check.outcome_key === null)
      findings.push({
        code: "global_progress_stale",
        outcome_key: null,
        check_key: check.key,
        message: `Targeted progress for Global Check ${check.key} is stale.`,
        next_action:
          "Rerun the Global Check against the current carrier snapshot.",
      });
  }
  return findings;
}

function readyOutcomes(
  compiled: CompiledDeliveryContractV2,
  outcomes: Record<string, OutcomeStatusV2>,
  stages: Record<string, StageStatusV2>,
): string[] {
  return compiled.outcomes
    .filter(
      (outcome) =>
        stages[outcome.stage] !== "locked" &&
        stages[outcome.stage] !== "blocked_external" &&
        stages[outcome.stage] !== "progress_passing" &&
        outcomes[outcome.key] !== "blocked_external" &&
        outcomes[outcome.key] !== "progress_passing" &&
        outcome.depends_on.every(
          (dependency) => outcomes[dependency] === "progress_passing",
        ),
    )
    .map((outcome) => outcome.key);
}

function legacyTargetState(
  receipt: FinalReceiptV2,
): FinalReceiptV2["target_state"] {
  if (
    receipt.workflow_status === "machine_accepted" ||
    receipt.workflow_status === "delivery_accepted"
  )
    return receipt.target_profile.required_state;
  return receipt.workflow_status === "blocked_external"
    ? "blocked_external"
    : "not_accepted";
}

function projectStages(
  compiled: CompiledDeliveryContractV2,
  outcomes: Record<string, OutcomeStatusV2>,
): Record<string, StageStatusV2> {
  const result: Record<string, StageStatusV2> = {};
  const remaining = new Set(compiled.stages.map((stage) => stage.key));
  while (remaining.size) {
    let advanced = false;
    for (const stage of compiled.stages) {
      if (!remaining.has(stage.key)) continue;
      if (stage.depends_on.some((dependency) => remaining.has(dependency)))
        continue;
      const prerequisitesPassing = stage.depends_on.every(
        (dependency) => result[dependency] === "progress_passing",
      );
      if (!prerequisitesPassing) result[stage.key] = "locked";
      else {
        const owned = compiled.outcomes
          .filter((outcome) => outcome.stage === stage.key)
          .map((outcome) => outcomes[outcome.key]);
        const gate = outcomes[stage.gate_outcome];
        result[stage.key] = owned.includes("progress_failing")
          ? "progress_failing"
          : owned.includes("blocked_external")
            ? "blocked_external"
            : owned.includes("progress_stale")
              ? "progress_stale"
              : gate === "progress_passing" &&
                  owned.every((status) => status === "progress_passing")
                ? "progress_passing"
                : owned.every((status) => status === "unverified")
                  ? "ready"
                  : "unverified";
      }
      remaining.delete(stage.key);
      advanced = true;
    }
    if (!advanced) {
      for (const stage of remaining) result[stage] = "locked";
      break;
    }
  }
  return result;
}

function projectFinalResult(input: StatusProjectionInputV2): AuditGateStatusV2 {
  if (!input.receipt) return "no_final_gate";
  if (!receiptFresh(input)) return "last_gate_inputs_stale";
  if (input.receipt.workflow_status === "blocked_external")
    return "last_gate_blocked";
  if (input.receipt.workflow_status === "machine_accepted_external_pending")
    return "last_gate_blocked";
  if (input.receipt.workflow_status === "needs_work") return "last_gate_failed";
  return "last_gate_passed";
}

function receiptFresh(input: StatusProjectionInputV2): boolean {
  return Boolean(
    input.receipt &&
    !input.receiptError &&
    input.finalizationIdentitySha256 !== null &&
    input.receipt.finalization_identity_sha256 ===
      input.finalizationIdentitySha256 &&
    !input.stale.length &&
    blockingExternalInputsFresh(input) &&
    input.receipt.compiled_identity === input.compiled.compiled_identity &&
    input.receipt.snapshot_sha256 === input.manifest.snapshot_sha256 &&
    input.receipt.git_head === input.manifest.git_head &&
    input.receipt.git_tree === input.manifest.fingerprint.head_tree,
  );
}

function blockingExternalInputsFresh(input: StatusProjectionInputV2): boolean {
  if (!input.receipt) return false;
  const project = (rows: ExternalConfirmationEvaluationV1[]) =>
    rows
      .filter((row) => row.blocks_target)
      .map((row) => ({
        confirmation_ref: row.confirmation_ref,
        state: row.state,
        record_sha256: row.record_sha256,
        relevant_input_identity: row.relevant_input_identity,
      }))
      .sort((left, right) =>
        left.confirmation_ref.localeCompare(right.confirmation_ref),
      );
  return (
    JSON.stringify(
      project(input.receipt.external_confirmation_results ?? []),
    ) === JSON.stringify(project(input.externalConfirmations))
  );
}
