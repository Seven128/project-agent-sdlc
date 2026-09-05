import { captureContextGraphSnapshotWithPhysicalFiles } from "./context-graph-snapshot.js";
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
  validateResolvedCompletionAuthorityClosure,
  validateDeliveryContractStructure,
} from "./long-task-delivery-validation.js";
import { validateRawExecutionObservationOwnership } from "./long-task-observation-ownership.js";
import {
  validateLongTaskDesignResourceHandoffs,
  type LongTaskDesignHandoffPreflight,
} from "./long-task-design-resource-handoff.js";
import { exactExternalDesignObligationRefs } from "./long-task-design-obligation.js";
import { validateLongTaskSemanticFactClosure } from "./long-task-semantic-fact-closure.js";
import {
  proofAdequacyCheckKey,
  validateLongTaskProofAdequacy,
  type ProofAdequacyByCheckV2,
} from "./long-task-proof-adequacy.js";
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
  assertAcceptanceReachable,
  compileAcceptanceReachability,
  type AcceptanceReachabilityV1,
} from "./long-task-acceptance-reachability.js";
import { exactExternalClaimActualObligationRefsByAssertion } from "./long-task-acceptance-reachability-helpers.js";
import type { DesignAuthorityIdentityV1 } from "./design-authority-types.js";
import {
  captureWorkspaceManifest,
  repoRelative,
} from "./long-task-workspace.js";
import { captureLongTaskContextControllingSources } from "./long-task-context-controlling-source.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export interface ActivationValidationResult {
  claims: CompiledClaimsV2 | null;
  risk: RiskDecisionV2 | null;
  source_hashes: Record<string, string> | null;
  source_items: CompiledSourceItemV2[] | null;
  context_snapshot: ContextAuthoritySnapshotV2 | null;
  project_design_authority: DesignAuthorityIdentityV1 | null;
  design_handoffs: LongTaskDesignHandoffPreflight[] | null;
  semantic_fact_manifest: SemanticFactManifestV1 | null;
  workspace: WorkspaceManifestV2 | null;
  global_checks: CompiledCheckV2[];
  outcomes: CompiledOutcomeV2[];
  proof_adequacy: ProofAdequacyByCheckV2 | null;
  acceptance_reachability: AcceptanceReachabilityV1 | null;
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
    deferCompletionAuthorityClosure: true,
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
  const designHandoffs = await attempt(mode, diagnostics, () =>
    validateLongTaskDesignResourceHandoffs(
      contract,
      repository,
      sourceItems ?? [],
    ),
  );
  const projectDesignAuthority =
    designHandoffs?.find(
      (handoff) =>
        handoff.project_design_authority_resolution.identity !== null,
    )?.project_design_authority_resolution.identity ?? null;
  const risk = await attempt(mode, diagnostics, () => {
    return classifyLongTaskRisk(contract);
  });
  const contextCapture = await attempt(mode, diagnostics, () =>
    captureContextGraphSnapshotWithPhysicalFiles(
      repository,
      contract.task.context_refs,
      contract.task.context_snapshot_mode,
    ),
  );
  const context = contextCapture?.snapshot ?? null;
  const controllingSources = contextCapture
    ? await attempt(mode, diagnostics, () =>
        captureLongTaskContextControllingSources(repository, contextCapture),
      )
    : null;
  const semanticFactClosure =
    sourceItems && contextCapture && controllingSources
      ? await attempt(mode, diagnostics, () =>
          validateLongTaskSemanticFactClosure(
            contract,
            repository,
            sourceItems,
            contextCapture,
            designHandoffs ?? undefined,
            controllingSources,
          ),
        )
      : null;
  const proofAdequacy = semanticFactClosure
    ? await attempt(mode, diagnostics, () =>
        validateLongTaskProofAdequacy(
          contract,
          semanticFactClosure.manifest,
          semanticFactClosure.expectations_by_check,
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
    ...new Set([
      ...workspace.files
        .map((file) => file.path)
        .filter(
          (file) =>
            file === workdirRelative || file.startsWith(`${workdirRelative}/`),
        ),
      `${workdirRelative}/delivery-contract.yaml`,
      ...Object.keys(sourceHashes ?? {}),
      ...(context?.files ?? []),
      ...(designHandoffs ?? []).flatMap(
        (handoff) => handoff.project_design_authority_resolution.member_paths,
      ),
    ]),
  ].sort((left, right) => Buffer.from(left).compare(Buffer.from(right)));

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
          proofAdequacy?.[proofAdequacyCheckKey(null, check.key)],
          new Set(),
          exactExternalClaimActualObligationRefsByAssertion(
            contract,
            null,
            check,
            proofAdequacy?.[proofAdequacyCheckKey(null, check.key)]
              ?.expected_authority_refs ?? {},
          ),
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
      const designTargets = designTargetsForCheck(outcome, check.key);
      const externalDesignObligationRefs = exactExternalDesignObligationRefs(
        contract,
        outcome.key,
        check.key,
      );
      const externalClaimObligationRefsByAssertion =
        exactExternalClaimActualObligationRefsByAssertion(
          contract,
          outcome.key,
          check,
          proofAdequacy?.[proofAdequacyCheckKey(outcome.key, check.key)]
            ?.expected_authority_refs ?? {},
        );
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
            designTargets,
            semanticFactClosure?.expectations_by_check.get(check.key) ?? [],
            scopeDeliveryBindings(outcome.key, outcome.technical.bindings),
            outcome.product.owner.path_globs,
            sourceBackedExecutionTargets.get(executionTarget.key) ?? null,
            observationAuthorityPaths,
            proofAdequacy?.[proofAdequacyCheckKey(outcome.key, check.key)],
            externalDesignObligationRefs,
            externalClaimObligationRefsByAssertion,
          ),
        outcome.key,
        check.key,
      );
      if (frozen) {
        blockedDesignAssertionRefsByCheck.set(
          check.key,
          removedAssertionRefs(check, frozen),
        );
        checks.push(frozen);
      }
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
  const acceptanceReachability =
    claims && semanticFactClosure
      ? compileAcceptanceReachability({
          contract,
          claims,
          manifest: semanticFactClosure.manifest,
          compiled_checks: allChecks,
        })
      : null;
  await attempt(mode, diagnostics, () =>
    validateResolvedCompletionAuthorityClosure(
      contract,
      globalChecks,
      outcomes,
      acceptanceReachability,
      mode === "collect"
        ? (error) => addDiagnosticError(diagnostics, new Error(error))
        : undefined,
    ),
  );
  if (risk)
    await attempt(mode, diagnostics, () =>
      validateRiskProof(contract, risk, acceptanceReachability, outcomes),
    );
  if (acceptanceReachability) {
    if (mode === "fail_fast") assertAcceptanceReachable(acceptanceReachability);
    else
      for (const obligation of acceptanceReachability.obligations)
        if (obligation.status === "unreachable")
          addDiagnosticError(
            diagnostics,
            new Error(
              `acceptance_obligation_unreachable:${obligation.source_obligation_ref}:${obligation.reason}`,
            ),
            obligation.outcome_key,
          );
  }
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
          acceptanceReachability,
        ),
      );
  }
  return {
    claims,
    risk,
    source_hashes: sourceHashes,
    source_items: sourceItems,
    context_snapshot: context,
    project_design_authority: projectDesignAuthority,
    design_handoffs: designHandoffs,
    semantic_fact_manifest: semanticFactClosure?.manifest ?? null,
    workspace,
    global_checks: globalChecks,
    outcomes,
    proof_adequacy: proofAdequacy,
    acceptance_reachability: acceptanceReachability,
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

function removedAssertionRefs(
  source: DeliveryContractV2["outcomes"][number]["acceptance"]["checks"][number],
  compiled: CompiledCheckV2,
): Set<string> {
  const retained = new Set(
    [...compiled.positive_assertions, ...compiled.negative_assertions].map(
      (assertion) => assertion.key,
    ),
  );
  return new Set(
    [...source.positive_assertions, ...source.negative_assertions]
      .map((assertion) => assertion.key)
      .filter((assertionRef) => !retained.has(assertionRef)),
  );
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
    project_design_authority: null,
    design_handoffs: null,
    semantic_fact_manifest: null,
    workspace: null,
    global_checks: [],
    outcomes: [],
    proof_adequacy: null,
    acceptance_reachability: null,
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
