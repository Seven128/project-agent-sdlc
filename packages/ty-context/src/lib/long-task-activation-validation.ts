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
  SourceBackedExecutionTargetV2,
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
import { scopeDeliveryBindings } from "./long-task-scoped-binding.js";
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
  const structureOptions = {
    allowDeferredDesignComponentBindingClosure: true,
  } as const;
  if (mode === "collect")
    for (const error of deliveryContractStructureDiagnostics(
      contract,
      structureOptions,
    ))
      addDiagnosticError(diagnostics, error);
  else validateDeliveryContractStructure(contract, structureOptions);

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
  let sourceBackedExecutionTargets = new Map<
    string,
    SourceBackedExecutionTargetV2
  >();
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
    sourceBackedExecutionTargets = validateSourceTargetContinuity(
      contract,
      items,
      mode === "collect"
        ? (error) => addDiagnosticError(diagnostics, new Error(error))
        : undefined,
    );
    return items;
  });
  await attempt(mode, diagnostics, () =>
    validateLongTaskDesignResourceHandoffs(
      contract,
      repository,
      sourceItems ?? [],
    ),
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
  const observationAuthorityPaths = [
    ...workspace.files
      .map((file) => file.path)
      .filter(
        (file) =>
          file === workdirRelative || file.startsWith(`${workdirRelative}/`),
      ),
    `${workdirRelative}/delivery-contract.yaml`,
    ...Object.keys(sourceHashes ?? {}),
    ...(context?.files ?? []),
  ];

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
          contract.outcomes.flatMap((outcome) =>
            scopeDeliveryBindings(outcome.key, outcome.technical.bindings),
          ),
          contract.outcomes.flatMap(
            (outcome) => outcome.product.owner.path_globs,
          ),
          sourceBackedExecutionTargets.get(executionTarget.key) ?? null,
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
    const blockedDesignAssertionRefsByCheck = new Map<string, Set<string>>();
    for (const check of outcome.acceptance.checks) {
      const executionTarget = contract.task.execution_targets.find(
        (target) => target.key === check.execution_target.target_ref,
      );
      if (!executionTarget) continue;
      const blockedDesignAssertionRefs = externallyBlockedDesignAssertionRefs(
        outcome,
        check,
        contract.global.acceptance.external_confirmations,
      );
      blockedDesignAssertionRefsByCheck.set(
        check.key,
        blockedDesignAssertionRefs,
      );
      const machineCheck = projectMachineCheck(
        check,
        blockedDesignAssertionRefs,
      );
      const frozen = await attempt(
        mode,
        diagnostics,
        () =>
          freezeDeliveryCheck(
            machineCheck,
            outcome.key,
            repository,
            workspace,
            executionTarget,
            contract.task.execution_targets,
            designTargetsForCheck(
              outcome,
              check.key,
              contract.global.acceptance.external_confirmations,
            ),
            semanticFactClosure?.expectations_by_check.get(check.key) ?? [],
            scopeDeliveryBindings(outcome.key, outcome.technical.bindings),
            outcome.product.owner.path_globs,
            sourceBackedExecutionTargets.get(executionTarget.key) ?? null,
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
      acceptance: {
        ...outcome.acceptance,
        checks,
        counterfactual_controls: outcome.acceptance.counterfactual_controls.map(
          (control) =>
            projectCounterfactualControl(
              control,
              outcome.acceptance.checks.find(
                (check) => check.key === control.check_key,
              ),
              blockedDesignAssertionRefsByCheck.get(control.check_key) ??
                new Set(),
            ),
        ),
      },
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
  confirmations: DeliveryContractV2["global"]["acceptance"]["external_confirmations"],
): CompiledDesignTargetV2[] {
  return (outcome.product.surface_bindings ?? []).flatMap((binding) =>
    binding.design_targets
      .filter(
        (target) =>
          target.conformance_check_ref === checkKey &&
          !confirmations.some(
            (confirmation) =>
              confirmation.blocks_target &&
              confirmation.impact_claims.some((claimRef) =>
                target.claim_refs.some(
                  (targetClaimRef) =>
                    claimRef === `${outcome.key}.${targetClaimRef}`,
                ),
              ),
          ),
      )
      .map((target) => ({
        ...target,
        surface_binding_ref: binding.key,
        surface_ref: binding.surface_ref,
        target_ref: binding.target_ref,
      })),
  );
}

function externallyBlockedDesignAssertionRefs(
  outcome: DeliveryContractV2["outcomes"][number],
  check: DeliveryContractV2["outcomes"][number]["acceptance"]["checks"][number],
  confirmations: DeliveryContractV2["global"]["acceptance"]["external_confirmations"],
): Set<string> {
  const refs = new Set<string>();
  const impactedClaims = new Set<string>();
  for (const binding of outcome.product.surface_bindings ?? [])
    for (const target of binding.design_targets) {
      if (target.conformance_check_ref !== check.key) continue;
      const blocked = confirmations.some(
        (confirmation) =>
          confirmation.blocks_target &&
          confirmation.impact_claims.some((claimRef) =>
            target.claim_refs.some(
              (targetClaimRef) =>
                claimRef === `${outcome.key}.${targetClaimRef}`,
            ),
          ),
      );
      if (!blocked) continue;
      for (const confirmation of confirmations)
        if (
          confirmation.blocks_target &&
          confirmation.impact_claims.some((claimRef) =>
            target.claim_refs.some(
              (targetClaimRef) =>
                claimRef === `${outcome.key}.${targetClaimRef}`,
            ),
          )
        )
          for (const claimRef of confirmation.impact_claims)
            impactedClaims.add(claimRef);
      refs.add(target.conformance_assertion_ref);
      for (const method of target.verification_method_bindings)
        refs.add(method.assertion_ref);
      for (const method of target.symbolic_method_bindings ?? [])
        refs.add(method.assertion_ref);
      if (target.symbolic_certificate_binding)
        refs.add(target.symbolic_certificate_binding.assertion_ref);
    }
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ])
    if (
      assertion.evidence_capabilities.includes("state_delta") &&
      assertion.claims.length > 0 &&
      assertion.claims.every((claimRef) =>
        impactedClaims.has(`${outcome.key}.${claimRef}`),
      )
    )
      refs.add(assertion.key);
  return refs;
}

function projectMachineCheck(
  check: DeliveryContractV2["outcomes"][number]["acceptance"]["checks"][number],
  externallyBlockedAssertionRefs: Set<string>,
): typeof check {
  if (!externallyBlockedAssertionRefs.size) return check;
  return {
    ...check,
    positive_assertions: check.positive_assertions.filter(
      (assertion) => !externallyBlockedAssertionRefs.has(assertion.key),
    ),
    negative_assertions: check.negative_assertions.filter(
      (assertion) => !externallyBlockedAssertionRefs.has(assertion.key),
    ),
  };
}

function projectCounterfactualControl(
  control: DeliveryContractV2["outcomes"][number]["acceptance"]["counterfactual_controls"][number],
  check:
    | DeliveryContractV2["outcomes"][number]["acceptance"]["checks"][number]
    | undefined,
  externallyBlockedAssertionRefs: Set<string>,
): typeof control {
  if (!check || !externallyBlockedAssertionRefs.size) return control;
  const externallyBlockedClaims = new Set(
    [...check.positive_assertions, ...check.negative_assertions]
      .filter((assertion) => externallyBlockedAssertionRefs.has(assertion.key))
      .flatMap((assertion) => assertion.claims),
  );
  return {
    ...control,
    claims: control.claims.filter(
      (claimRef) => !externallyBlockedClaims.has(claimRef),
    ),
    expected_assertion_failures: control.expected_assertion_failures.filter(
      (assertionRef) => !externallyBlockedAssertionRefs.has(assertionRef),
    ),
    preserved_assertions: control.preserved_assertions.filter(
      (assertionRef) => !externallyBlockedAssertionRefs.has(assertionRef),
    ),
  };
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
