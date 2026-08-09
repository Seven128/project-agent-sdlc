import { captureContextGraphSnapshot } from "./context-graph-snapshot.js";
import { addDiagnosticError } from "./long-task-authoring-preflight-diagnostics.js";
import type { AuthoringPreflightDiagnosticV1 } from "./long-task-authoring-preflight-types.js";
import {
  compileProductClaimCoverage,
  type CompiledClaimsV2,
} from "./long-task-claims.js";
import {
  hashDeclaredFiles,
  validateCounterfactualPaths,
  validateTechnicalPaths,
  validateVerificationInputSeparation,
} from "./long-task-delivery-preflight.js";
import type {
  CompiledCheckV2,
  CompiledDesignTargetV2,
  CompiledOutcomeV2,
  CompiledSourceItemV2,
  ContextAuthoritySnapshotV2,
  DeliveryContractV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { validateClaimEvidenceSensitivity } from "./long-task-evidence-sensitivity-policy.js";
import { validateSemanticConformance } from "./long-task-conformance-policy.js";
import {
  deliveryContractStructureDiagnostics,
  validateDeliveryContractStructure,
} from "./long-task-delivery-validation.js";
import { validateRawExecutionObservationOwnership } from "./long-task-observation-ownership.js";
import { validateLongTaskDesignResourceHandoffs } from "./long-task-design-resource-handoff.js";
import { validateLongTaskSemanticFactClosure } from "./long-task-semantic-fact-closure.js";
import { freezeDeliveryCheck } from "./long-task-runner-freeze.js";
import {
  classifyLongTaskRisk,
  validateRiskProof,
  type RiskDecisionV2,
} from "./long-task-risk.js";
import { validateSourceContinuity } from "./long-task-source-continuity.js";
import { compileSourceInventory } from "./long-task-source-inventory.js";
import { validateSourceTargetContinuity } from "./long-task-source-target-continuity.js";
import { validateSourceAnchors } from "./long-task-source-validation.js";
import {
  captureWorkspaceManifest,
  repoRelative,
} from "./long-task-workspace.js";

export interface ActivationValidationResult {
  claims: CompiledClaimsV2 | null;
  risk: RiskDecisionV2 | null;
  source_hashes: Record<string, string> | null;
  source_items: CompiledSourceItemV2[] | null;
  context_snapshot: ContextAuthoritySnapshotV2 | null;
  workspace: WorkspaceManifestV2 | null;
  global_checks: CompiledCheckV2[];
  outcomes: CompiledOutcomeV2[];
}

export async function validateContractForActivation(options: {
  contract: DeliveryContractV2;
  repository: string;
  workdir: string;
  mode: "collect" | "fail_fast";
  diagnostics?: AuthoringPreflightDiagnosticV1[];
}): Promise<ActivationValidationResult> {
  const { contract, repository, workdir, mode } = options;
  const diagnostics = options.diagnostics ?? [];
  if (mode === "collect")
    for (const error of deliveryContractStructureDiagnostics(contract))
      addDiagnosticError(diagnostics, error);
  else validateDeliveryContractStructure(contract);

  const claims = await attempt(mode, diagnostics, () =>
    compileProductClaimCoverage(contract),
  );
  if (mode === "fail_fast") {
    const decisions = contract.source_claims
      .filter((claim) => claim.disposition.type === "decision_required")
      .map((claim) => claim.key);
    if (decisions.length)
      throw new Error(`source_claim_decision_required:${decisions.join(",")}`);
  }

  const sourceHashes = await attempt(mode, diagnostics, () =>
    hashDeclaredFiles(repository, contract.task.source_paths, "source"),
  );
  await attempt(mode, diagnostics, () =>
    validateSourceAnchors(repository, contract.source_claims),
  );
  const sourceItems = await attempt(mode, diagnostics, async () => {
    const items = await compileSourceInventory(
      repository,
      contract.task.source_paths,
    );
    validateSourceContinuity(
      contract,
      items,
      mode === "collect"
        ? (error) => addDiagnosticError(diagnostics, new Error(error))
        : undefined,
    );
    validateSourceTargetContinuity(
      contract,
      items,
      mode === "collect"
        ? (error) => addDiagnosticError(diagnostics, new Error(error))
        : undefined,
    );
    return items;
  });
  await attempt(mode, diagnostics, () =>
    validateLongTaskDesignResourceHandoffs(contract, repository),
  );
  const risk = await attempt(mode, diagnostics, () => {
    const decision = classifyLongTaskRisk(contract);
    validateRiskProof(contract, decision);
    return decision;
  });
  const context = await attempt(mode, diagnostics, () =>
    captureContextGraphSnapshot(
      repository,
      contract.task.context_refs,
      contract.task.context_snapshot_mode,
    ),
  );
  const semanticFactClosure =
    sourceItems && context
      ? await attempt(mode, diagnostics, () =>
          validateLongTaskSemanticFactClosure(
            contract,
            repository,
            sourceItems,
            context.files,
          ),
        )
      : null;

  const workdirRelative = repoRelative(repository, workdir);
  const observationAuthorityPaths = [
    `${workdirRelative}/delivery-contract.yaml`,
    ...Object.keys(sourceHashes ?? {}),
    ...(context?.files ?? []),
  ];
  const workspace = await attempt(mode, diagnostics, async () => {
    const manifest = await captureWorkspaceManifest(repository, workdir);
    validateTechnicalPaths(contract, repository, workdirRelative, manifest);
    return manifest;
  });
  if (!workspace)
    return emptyCompiledResult(
      claims,
      risk,
      sourceHashes,
      sourceItems,
      context,
    );

  const globalChecks: CompiledCheckV2[] = [];
  for (const check of contract.global.acceptance.checks) {
    const executionTarget = contract.task.execution_targets.find(
      (target) => target.key === check.execution_target.target_ref,
    );
    if (!executionTarget) continue;
    const frozen = await attempt(
      mode,
      diagnostics,
      () =>
        freezeDeliveryCheck(
          check,
          null,
          repository,
          workspace,
          executionTarget,
          contract.task.execution_targets,
          [],
          [],
          [],
          observationAuthorityPaths,
        ),
      null,
      check.key,
    );
    if (frozen) globalChecks.push(frozen);
  }
  const outcomes: CompiledOutcomeV2[] = [];
  for (const outcome of contract.outcomes) {
    const checks: CompiledCheckV2[] = [];
    for (const check of outcome.acceptance.checks) {
      const executionTarget = contract.task.execution_targets.find(
        (target) => target.key === check.execution_target.target_ref,
      );
      if (!executionTarget) continue;
      const frozen = await attempt(
        mode,
        diagnostics,
        () =>
          freezeDeliveryCheck(
            check,
            outcome.key,
            repository,
            workspace,
            executionTarget,
            contract.task.execution_targets,
            designTargetsForCheck(outcome, check.key),
            semanticFactClosure?.expectations_by_check.get(check.key) ?? [],
            outcome.technical.bindings,
            observationAuthorityPaths,
          ),
        outcome.key,
        check.key,
      );
      if (frozen) checks.push(frozen);
    }
    outcomes.push({
      ...outcome,
      internal_id: `OUT.${outcome.key}`,
      generated_claims: claims?.by_outcome[outcome.key] ?? [],
      risk_reasons: risk?.reasons_by_outcome[outcome.key] ?? [],
      acceptance: { ...outcome.acceptance, checks },
    });
  }
  const allChecks = [
    ...globalChecks,
    ...outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
  await attempt(mode, diagnostics, () =>
    validateVerificationInputSeparation(contract, allChecks, workdirRelative),
  );
  await attempt(mode, diagnostics, () =>
    validateRawExecutionObservationOwnership(allChecks),
  );
  if (
    allGlobalChecksFrozen(contract, globalChecks) &&
    allOutcomeChecksFrozen(contract, outcomes)
  ) {
    await attempt(mode, diagnostics, () =>
      validateCounterfactualPaths(
        contract,
        globalChecks,
        outcomes,
        repository,
        workdirRelative,
        [
          ...contract.task.source_paths,
          ...(context?.files ?? contract.task.context_refs),
        ],
      ),
    );
    await attempt(mode, diagnostics, () =>
      validateClaimEvidenceSensitivity(
        contract,
        globalChecks,
        outcomes,
        mode === "collect"
          ? (error) => addDiagnosticError(diagnostics, new Error(error))
          : undefined,
      ),
    );
    if (risk)
      await attempt(mode, diagnostics, () =>
        validateSemanticConformance(
          contract,
          risk.effective_level,
          allChecks,
          mode === "collect"
            ? (error) => addDiagnosticError(diagnostics, new Error(error))
            : undefined,
        ),
      );
  }
  return {
    claims,
    risk,
    source_hashes: sourceHashes,
    source_items: sourceItems,
    context_snapshot: context,
    workspace,
    global_checks: globalChecks,
    outcomes,
  };
}

function designTargetsForCheck(
  outcome: DeliveryContractV2["outcomes"][number],
  checkKey: string,
): CompiledDesignTargetV2[] {
  return (outcome.product.surface_bindings ?? []).flatMap((binding) =>
    binding.design_targets
      .filter((target) => target.conformance_check_ref === checkKey)
      .map((target) => ({
        ...target,
        surface_binding_ref: binding.key,
        surface_ref: binding.surface_ref,
        target_ref: binding.target_ref,
      })),
  );
}

async function attempt<T>(
  mode: "collect" | "fail_fast",
  diagnostics: AuthoringPreflightDiagnosticV1[],
  action: () => T | Promise<T>,
  outcomeKey?: string | null,
  checkKey?: string,
): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    if (mode === "fail_fast") throw error;
    addDiagnosticError(diagnostics, error, outcomeKey, checkKey);
    return null;
  }
}

function emptyCompiledResult(
  claims: CompiledClaimsV2 | null,
  risk: RiskDecisionV2 | null,
  sourceHashes: Record<string, string> | null,
  sourceItems: CompiledSourceItemV2[] | null,
  context: ContextAuthoritySnapshotV2 | null,
): ActivationValidationResult {
  return {
    claims,
    risk,
    source_hashes: sourceHashes,
    source_items: sourceItems,
    context_snapshot: context,
    workspace: null,
    global_checks: [],
    outcomes: [],
  };
}

function allGlobalChecksFrozen(
  contract: DeliveryContractV2,
  checks: CompiledCheckV2[],
): boolean {
  return checks.length === contract.global.acceptance.checks.length;
}

function allOutcomeChecksFrozen(
  contract: DeliveryContractV2,
  outcomes: CompiledOutcomeV2[],
): boolean {
  return outcomes.every(
    (outcome) =>
      outcome.acceptance.checks.length ===
      contract.outcomes.find((item) => item.key === outcome.key)!.acceptance
        .checks.length,
  );
}
