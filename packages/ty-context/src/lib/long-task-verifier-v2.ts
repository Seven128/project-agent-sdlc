import type {
  CheckExecutionResultV2,
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  LongTaskFindingV2,
  TargetedVerificationResultV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { deliveryCompileFreshness } from "./long-task-freshness.js";
import { assertVerifierAuthorityCurrent } from "./long-task-freshness.js";
import {
  enrichCheckResultFindings,
  enrichFinding,
} from "./long-task-finding-context.js";
import { prepareExecutionObservationUniverse } from "./long-task-execution-observation.js";
import { evaluateCheckEvidence } from "./long-task-evidence-v2.js";
import { matchesRepoPattern } from "./long-task-paths.js";
import { deriveRepairFrontier } from "./long-task-repair-frontier.js";
import {
  activeAuthorityIdentityMatches,
  loadActiveLongTaskAuthority,
  readProgressRecords,
  writeProgressRecord,
} from "./long-task-state.js";
import { createProgressRecord } from "./long-task-progress.js";
import {
  changedWorkspacePaths,
  createWorkspaceSnapshot,
  repositoryRoot,
  type WorkspaceSnapshotV2,
} from "./long-task-workspace.js";
import {
  classifyWorkspaceScope,
  protectedWorkspacePaths,
} from "./long-task-workspace-scope.js";
import { evaluateSelectedCounterfactuals } from "./long-task-verifier-counterfactuals.js";
import { executePreparedRawExecutionGroups } from "./long-task-verifier-execution.js";

export interface DeliveryRunV2 {
  snapshot: WorkspaceManifestV2;
  check_results: CheckExecutionResultV2[];
  findings: LongTaskFindingV2[];
}

export async function verifyDeliveryContract(
  workdir: string,
  selection: { outcome?: string; check?: string } = {},
): Promise<TargetedVerificationResultV2> {
  const repository = await repositoryRoot(process.cwd());
  const active = (
    await loadActiveLongTaskAuthority(repository, { migrate_legacy: true })
  ).authority;
  if (!active) throw new Error("active_task_missing");
  if (active.workdir !== (await resolved(workdir)))
    throw new Error("active_task_workdir_mismatch");
  await assertVerifierAuthorityCurrent(repository, active.verifier_identity);
  const compiled = active.authority_snapshot;
  const expectedAuthority = {
    task_id: active.task_id,
    authority_revision: active.authority_revision,
    compiled_identity: active.active_authority_identity,
    worktree_identity: active.worktree_identity,
  };
  const selected = selectChecks(compiled, selection);
  const existingProgress = await readProgressRecords(active.workdir);
  const snapshot = await createWorkspaceSnapshot(
    compiled.repository_root,
    compiled.workdir,
    `verify-${compiled.task.id}`,
  );
  try {
    const run = await runDeliveryChecks(compiled, snapshot, selected, true);
    const records = run.check_results.map((result) => {
      const check = selected.find(
        (item) => item.internal_id === result.internal_id,
      );
      if (!check)
        throw new Error(`compiled_check_not_found:${result.internal_id}`);
      return createProgressRecord(compiled, snapshot.manifest, check, result);
    });
    let authorityChanged = false;
    try {
      const current = (await loadActiveLongTaskAuthority(repository)).authority;
      authorityChanged =
        !current || !activeAuthorityIdentityMatches(current, expectedAuthority);
    } catch {
      authorityChanged = true;
    }
    if (authorityChanged) {
      run.findings.push({
        code: "active_authority_changed_during_verify",
        outcome_key: null,
        check_key: null,
        message:
          "Active Authority changed while targeted verification was running.",
        next_action:
          "Discard the stale progress and rerun verification against the active Authority Revision.",
      });
      const repairFrontier = deriveRepairFrontier({
        compiled,
        manifest: snapshot.manifest,
        progress: existingProgress,
        findings: run.findings,
      });
      return {
        schema_version: "long-task-targeted-progress-v2",
        compiled_identity: compiled.compiled_identity,
        snapshot_sha256: snapshot.manifest.snapshot_sha256,
        acceptance_authorized: false,
        selected_outcome: selection.outcome ?? null,
        selected_check: selection.check ?? null,
        updated_progress_records: [],
        check_results: run.check_results,
        findings: run.findings,
        repair_frontier: repairFrontier,
        completed_at: new Date().toISOString(),
      };
    }
    await Promise.all(
      records.map((record) => writeProgressRecord(workdir, record)),
    );
    const updatedProgress = {
      ...existingProgress,
      ...Object.fromEntries(
        records.map((record) => [record.check_internal_id, record]),
      ),
    };
    const repairFrontier = deriveRepairFrontier({
      compiled,
      manifest: snapshot.manifest,
      progress: updatedProgress,
      findings: run.findings,
    });
    return {
      schema_version: "long-task-targeted-progress-v2",
      compiled_identity: compiled.compiled_identity,
      snapshot_sha256: snapshot.manifest.snapshot_sha256,
      acceptance_authorized: false,
      selected_outcome: selection.outcome ?? null,
      selected_check: selection.check ?? null,
      updated_progress_records: records.map(
        (record) => record.check_internal_id,
      ),
      check_results: run.check_results,
      findings: run.findings,
      repair_frontier: repairFrontier,
      completed_at: new Date().toISOString(),
    };
  } finally {
    await snapshot.dispose();
  }
}

async function resolved(workdir: string): Promise<string> {
  return (await import("node:path")).default.resolve(workdir);
}

export async function runDeliveryChecks(
  compiled: CompiledDeliveryContractV2,
  snapshot: WorkspaceSnapshotV2,
  checks: CompiledCheckV2[],
  includeCounterfactuals: boolean,
  finalGate = false,
): Promise<DeliveryRunV2> {
  const observationAuthorityPaths = [
    compiled.contract_file,
    ...Object.keys(compiled.contract_files),
    ...Object.keys(compiled.source_hashes),
    ...compiled.context_snapshot.files,
  ];
  const findings = await preRunFindings(compiled, snapshot.manifest);
  if (finalGate)
    findings.push(...finalPathFindings(compiled, snapshot.manifest));
  if (findings.length)
    return {
      snapshot: snapshot.manifest,
      check_results: [],
      findings: findings.map((finding) => enrichFinding(compiled, finding)),
    };

  const completeChecks = allCompiledChecks(compiled);
  const selectedExecutionGroups = rawExecutionGroups(checks);
  const completeExecutionGroups = selectedExecutionGroups.map((group) =>
    completeChecks.filter(
      (check) =>
        check.raw_execution_identity === group[0].raw_execution_identity,
    ),
  );
  const preparedExecutionGroups = await prepareExecutionObservationUniverse({
    groups: completeExecutionGroups,
    snapshot_root: snapshot.root,
    workspace_manifest: snapshot.manifest,
    protected_authority_paths: observationAuthorityPaths,
  });
  const rawExecutions = await executePreparedRawExecutionGroups({
    selected_groups: selectedExecutionGroups,
    complete_groups: completeExecutionGroups,
    prepared_groups: preparedExecutionGroups,
  });
  const mainCheckResults: CheckExecutionResultV2[] = [];
  for (const check of checks) {
    const raw = rawExecutions.get(check.raw_execution_identity);
    if (!raw) throw new Error("raw_execution_group_result_missing");
    const outcome = check.outcome_key
      ? compiled.outcomes.find((item) => item.key === check.outcome_key)
      : undefined;
    mainCheckResults.push(
      await evaluateCheckEvidence(
        check,
        raw,
        snapshot.root,
        outcome,
        observationAuthorityPaths,
      ),
    );
  }

  // Sensitivity runs only for otherwise passing owners, so an external or
  // failed primary result cannot be obscured by a mutated-sandbox finding.
  const counterfactualFindings = includeCounterfactuals
    ? await evaluateSelectedCounterfactuals({
        compiled,
        selected_checks: checks,
        complete_checks: completeChecks,
        snapshot_root: snapshot.root,
        snapshot_manifest: snapshot.manifest,
        observation_authority_paths: observationAuthorityPaths,
        baseline_results: mainCheckResults,
        baseline_executions: rawExecutions,
      })
    : [];
  const unassignedCounterfactuals = counterfactualFindings.filter(
    (finding) =>
      !mainCheckResults.some((result) =>
        findingBelongsToCheck(finding, result),
      ),
  );
  const unassignedFinding = unassignedCounterfactuals.length
    ? unassignedCounterfactualFinding(unassignedCounterfactuals)
    : null;
  const checkResults = applyCounterfactualFindings(
    mainCheckResults,
    counterfactualFindings,
    unassignedFinding,
  ).map((result) => enrichCheckResultFindings(compiled, result));
  findings.push(...checkResults.flatMap((result) => result.findings));
  if (unassignedFinding && !checkResults.length)
    findings.push(unassignedFinding);
  return {
    snapshot: snapshot.manifest,
    check_results: checkResults,
    findings: findings.map((finding) => enrichFinding(compiled, finding)),
  };
}

function rawExecutionGroups(
  checks: readonly CompiledCheckV2[],
): CompiledCheckV2[][] {
  const groups = new Map<string, CompiledCheckV2[]>();
  for (const check of checks) {
    const group = groups.get(check.raw_execution_identity);
    if (group) group.push(check);
    else groups.set(check.raw_execution_identity, [check]);
  }
  return [...groups.values()];
}

function applyCounterfactualFindings(
  checkResults: CheckExecutionResultV2[],
  findings: LongTaskFindingV2[],
  unassignedFinding: LongTaskFindingV2 | null,
): CheckExecutionResultV2[] {
  return checkResults.map((result, index) => {
    const projected = findings.filter((finding) =>
      findingBelongsToCheck(finding, result),
    );
    const invariantFindings =
      unassignedFinding && index === 0 ? [unassignedFinding] : [];
    const projectedFindings = [...projected, ...invariantFindings];
    if (!projectedFindings.length) return result;
    return {
      ...result,
      status: result.status === "passed" ? "invalid_evidence" : result.status,
      claim_proofs: [],
      findings: [...result.findings, ...projectedFindings],
    };
  });
}

function findingBelongsToCheck(
  finding: LongTaskFindingV2,
  result: CheckExecutionResultV2,
): boolean {
  return (
    finding.check_key !== null &&
    finding.check_key === result.check_key &&
    finding.outcome_key === result.outcome_key
  );
}

function unassignedCounterfactualFinding(
  actual: LongTaskFindingV2[],
): LongTaskFindingV2 {
  return {
    code: "counterfactual_finding_unassigned",
    outcome_key: null,
    check_key: null,
    message:
      "A Counterfactual Finding could not be assigned to its owning Check Result.",
    actual,
    next_action:
      "Repair the Counterfactual evaluator ownership invariant before trusting verification progress.",
  };
}

function finalPathFindings(
  compiled: CompiledDeliveryContractV2,
  manifest: WorkspaceManifestV2,
): LongTaskFindingV2[] {
  const findings: LongTaskFindingV2[] = [];
  for (const check of allCompiledChecks(compiled))
    for (const pattern of check.expected_output_paths)
      if (
        !manifest.files.some((file) => matchesRepoPattern(file.path, pattern))
      )
        findings.push({
          code: "expected_output_path_missing",
          outcome_key: check.outcome_key,
          check_key: check.key,
          message: `Expected output path did not exist: ${pattern}`,
          expected: pattern,
          next_action: "Create the declared output and rerun verification.",
        });
  for (const outcome of compiled.outcomes)
    for (const binding of outcome.technical.bindings)
      if (
        binding.existence === "planned" &&
        !plannedBindingRequiredPatterns(binding).every((pattern) =>
          manifest.files.some((file) => matchesRepoPattern(file.path, pattern)),
        ) &&
        !outcome.acceptance.checks.some((check) =>
          (check.observation_authorities ?? []).some(
            (authority) =>
              authority.authority === "package_static_json_exact" &&
              authority.carrier_refs.some(
                (carrier) =>
                  carrier.binding_ref === `${outcome.key}.${binding.key}`,
              ),
          ),
        )
      )
        findings.push({
          code: "binding_missing",
          outcome_key: outcome.key,
          check_key: null,
          claim_keys: outcome.generated_claims.some(
            (claim) => claim.local_key === `obligation.${binding.key}`,
          )
            ? [`obligation.${binding.key}`]
            : [],
          message: `Planned binding is missing: ${binding.target}`,
          expected: binding.carrier_paths,
          next_action: "Implement the declared binding and rerun verification.",
        });
  for (const check of allCompiledChecks(compiled))
    for (const runtimePath of check.process_runtime_closure
      ?.allowed_runtime_files ?? [])
      if (!manifest.files.some((file) => file.path === runtimePath))
        findings.push({
          code: "process_runtime_input_missing",
          outcome_key: check.outcome_key,
          check_key: check.key,
          message: `Declared process runtime input did not exist in the Final Gate candidate: ${runtimePath}`,
          expected: runtimePath,
          next_action:
            "Materialize the Source-backed product root and every declared production runtime input, then rerun Final Gate.",
        });
  return findings;
}

function plannedBindingRequiredPatterns(
  binding: CompiledDeliveryContractV2["outcomes"][number]["technical"]["bindings"][number],
): string[] {
  return binding.kind === "file" || binding.kind === "path_glob"
    ? [binding.target]
    : binding.carrier_paths;
}

export function allCompiledChecks(
  compiled: CompiledDeliveryContractV2,
): CompiledCheckV2[] {
  return [
    ...compiled.global.acceptance.checks,
    ...compiled.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
}

export function selectChecks(
  compiled: CompiledDeliveryContractV2,
  selection: { outcome?: string; check?: string },
): CompiledCheckV2[] {
  const checks = allCompiledChecks(compiled);
  if (
    selection.outcome &&
    !compiled.outcomes.some((outcome) => outcome.key === selection.outcome)
  )
    throw new Error(`outcome_not_found:${selection.outcome}`);
  const filtered = checks.filter(
    (check) =>
      (!selection.outcome || check.outcome_key === selection.outcome) &&
      (!selection.check || check.key === selection.check),
  );
  if (selection.check && !filtered.length)
    throw new Error(`check_not_found:${selection.check}`);
  return filtered;
}

async function preRunFindings(
  compiled: CompiledDeliveryContractV2,
  current: WorkspaceManifestV2,
): Promise<LongTaskFindingV2[]> {
  const stale = await deliveryCompileFreshness(compiled);
  if (stale.length)
    return stale.map((code) => ({
      code,
      outcome_key: null,
      check_key: null,
      message: "A compiled Contract input changed.",
      next_action:
        "Run ty-context long-task compile --revise after reviewing the Contract change.",
    }));
  const changed = changedWorkspacePaths(
    compiled.initial_task_base.workspace_manifest,
    current,
  );
  const classification = classifyWorkspaceScope(
    compiled,
    changed,
    protectedWorkspacePaths({
      contract_files: compiled.contract_files,
      source_hashes: compiled.source_hashes,
      context_hashes: compiled.context_snapshot.sha256,
      checks: allCompiledChecks(compiled),
    }),
  );
  const escaped = classification.blocking_paths;
  return escaped.length
    ? [
        {
          code: "scope_escape",
          outcome_key: null,
          check_key: null,
          message: `Changed paths escape the Contract boundary (forbidden: ${classification.forbidden.join(",") || "none"}; unclassified: ${classification.unclassified.join(",") || "none"}).`,
          actual: escaped,
          next_action:
            "Review risk/ownership, revise declared change paths and recompile in the same Goal.",
        },
      ]
    : [];
}
