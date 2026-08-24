import type {
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  LongTaskFindingV2,
  ProgressRecordV2,
  RepairFrontierCheckV1,
  RepairFrontierV1,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { enrichFinding } from "./long-task-finding-context.js";
import { matchesRepoPattern } from "./long-task-paths.js";
import { progressRecordFresh } from "./long-task-progress.js";
import {
  allChecks,
  authorityPaths,
  checkDependencyPatterns,
  checkDependencyPatternsForBinding,
  checkObligationRefs,
  freshDiagnosticEvidence,
  rerunSessions,
} from "./long-task-repair-frontier-checks.js";
import { groupRepairFindings } from "./long-task-repair-frontier-groups.js";
import {
  checkRef,
  normalizedClaimRefs,
  unique,
} from "./long-task-repair-frontier-utils.js";
import { changedWorkspacePaths } from "./long-task-workspace-manifest.js";

export interface RepairFrontierInputV1 {
  compiled: CompiledDeliveryContractV2;
  manifest: WorkspaceManifestV2;
  progress: Record<string, ProgressRecordV2>;
  findings: LongTaskFindingV2[];
  generated_at?: string;
}

/**
 * Builds a disposable diagnostic projection over the current candidate.
 * The projection deliberately has no persistence or acceptance path: Final
 * Gate must still rerun every declared Check on one snapshot.
 */
export function deriveRepairFrontier(
  input: RepairFrontierInputV1,
): RepairFrontierV1 {
  const findings = input.findings.map((finding) =>
    enrichFinding(input.compiled, finding),
  );
  const checks = allChecks(input.compiled);
  const changedPaths = changedWorkspacePaths(
    input.compiled.initial_task_base.workspace_manifest,
    input.manifest,
  );
  const reasonsByCheck = new Map<string, Set<string>>();

  for (const finding of findings)
    for (const check of checks)
      for (const reason of findingCheckReasons(finding, check))
        addCheckReason(reasonsByCheck, check.internal_id, reason);

  for (const check of checks) {
    const changedInputs = changedPaths.filter((changedPath) =>
      checkDependencyPatterns(input.compiled, check).some((pattern) =>
        matchesRepoPattern(changedPath, pattern),
      ),
    );
    for (const changedPath of changedInputs)
      addCheckReason(
        reasonsByCheck,
        check.internal_id,
        `changed_input:${changedPath}`,
      );
    const record = input.progress[check.internal_id];
    if (
      record &&
      !progressRecordFresh(record, input.compiled, input.manifest, check)
    )
      addCheckReason(
        reasonsByCheck,
        check.internal_id,
        `stale_progress:${checkRef(check)}`,
      );
  }

  const selectedChecks = selectedRepairChecks(checks, reasonsByCheck);
  const selectedCheckRefs = new Set(
    selectedChecks.map((check) => check.check_ref),
  );
  const stillValidByCheck = freshDiagnosticEvidence(
    input.compiled,
    input.manifest,
    input.progress,
    selectedCheckRefs,
  );
  const groups = groupRepairFindings(
    findings,
    selectedChecks,
    stillValidByCheck,
  );
  const stillValidEvidence = unique([...stillValidByCheck.values()]);

  return {
    schema_version: "long-task-repair-frontier-v1",
    authority_scope: "derived_diagnostic_only",
    acceptance_authorized: false,
    persisted: false,
    compiled_identity: input.compiled.compiled_identity,
    authority_revision: input.compiled.authority_revision,
    candidate_snapshot_sha256: input.manifest.snapshot_sha256,
    changed_paths: changedPaths,
    summary: {
      finding_groups: groups.length,
      affected_facts: unique(
        groups.flatMap((group) => group.affected_fact_refs),
      ).length,
      affected_proof_obligations: unique(
        groups.flatMap((group) => group.affected_proof_obligation_refs),
      ).length,
      minimum_checks: selectedChecks.length,
      still_valid_progress_records: stillValidEvidence.length,
    },
    groups,
    minimum_diagnostic_reverify: selectedChecks,
    rerun_sessions: rerunSessions(selectedChecks),
    still_valid_diagnostic_evidence: stillValidEvidence,
    forbidden_authority_changes_without_revision: {
      fields: [
        "Source",
        "Expected",
        "Claim",
        "proof_method_or_capability",
        "external_confirmation_scope_or_owner",
        "comparator_tolerance_or_mask",
        "applicability",
      ],
      protected_paths: authorityPaths(input.compiled),
    },
    final_gate_requirement: "complete_one_snapshot_rerun_still_required",
    generated_at: input.generated_at ?? new Date().toISOString(),
  };
}

function selectedRepairChecks(
  checks: CompiledCheckV2[],
  reasonsByCheck: Map<string, Set<string>>,
): RepairFrontierCheckV1[] {
  return checks
    .filter((check) => reasonsByCheck.has(check.internal_id))
    .map((check) => ({
      check_ref: checkRef(check),
      outcome_key: check.outcome_key,
      check_key: check.key,
      raw_execution_identity: check.raw_execution_identity,
      obligation_refs: checkObligationRefs(check),
      reasons: [...reasonsByCheck.get(check.internal_id)!].sort(),
    }))
    .sort((left, right) => left.check_ref.localeCompare(right.check_ref));
}

function findingCheckReasons(
  finding: LongTaskFindingV2,
  check: CompiledCheckV2,
): string[] {
  const reasons: string[] = [];
  if (
    finding.check_key !== null &&
    finding.check_key === check.key &&
    (finding.outcome_key ?? null) === check.outcome_key
  )
    reasons.push(`finding:${finding.code}`);
  const facts = new Set(finding.fact_refs ?? []);
  const proofs = new Set(finding.proof_obligation_refs ?? []);
  const claims = new Set(normalizedClaimRefs(finding));
  const reruns = new Set(finding.rerun_obligation_refs ?? []);
  for (const expectation of check.semantic_fact_expectations)
    reasons.push(
      ...semanticExpectationReasons(expectation, facts, proofs, claims, reruns),
    );
  for (const authority of check.observation_authorities)
    reasons.push(
      ...observationAuthorityReasons(authority, facts, proofs, claims, reruns),
    );
  if (
    finding.binding_ref &&
    checkDependencyPatternsForBinding(check, finding.binding_ref).length
  )
    reasons.push(`affected_binding:${finding.binding_ref}`);
  return unique(reasons);
}

function semanticExpectationReasons(
  expectation: CompiledCheckV2["semantic_fact_expectations"][number],
  facts: Set<string>,
  proofs: Set<string>,
  claims: Set<string>,
  reruns: Set<string>,
): string[] {
  const reasons: string[] = [];
  if (facts.has(expectation.fact_ref))
    reasons.push(`affected_fact:${expectation.fact_ref}`);
  if (proofs.has(expectation.proof_ref) || reruns.has(expectation.proof_ref))
    reasons.push(`affected_proof:${expectation.proof_ref}`);
  if (claims.has(expectation.claim_ref))
    reasons.push(`affected_claim:${expectation.claim_ref}`);
  return reasons;
}

function observationAuthorityReasons(
  authority: CompiledCheckV2["observation_authorities"][number],
  facts: Set<string>,
  proofs: Set<string>,
  claims: Set<string>,
  reruns: Set<string>,
): string[] {
  const reasons: string[] = [];
  if (authority.fact_ref && facts.has(authority.fact_ref))
    reasons.push(`affected_fact:${authority.fact_ref}`);
  if (
    proofs.has(authority.obligation_ref) ||
    reruns.has(authority.obligation_ref)
  )
    reasons.push(`affected_proof:${authority.obligation_ref}`);
  for (const claim of authority.claim_refs)
    if (claims.has(claim)) reasons.push(`affected_claim:${claim}`);
  return reasons;
}

function addCheckReason(
  target: Map<string, Set<string>>,
  internalId: string,
  reason: string,
): void {
  const reasons = target.get(internalId);
  if (reasons) reasons.add(reason);
  else target.set(internalId, new Set([reason]));
}
