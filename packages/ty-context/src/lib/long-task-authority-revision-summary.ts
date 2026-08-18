import type {
  AuthorityRevisionApprovalSummaryV2,
  AuthorityRevisionChangeClassV2,
  AuthorityRevisionDecisionV2,
  AuthorityRevisionDiffV2,
} from "./long-task-authority-revision-types.js";
import { buildAuthorityRevisionDecisionBrief } from "./long-task-authority-revision-brief.js";

const SCOPE_EXPANSION_REASONS = new Set([
  "owner_path_expanded",
  "expected_change_path_expanded",
  "allowed_path_expanded",
]);

const MECHANICALLY_BOUNDED_REASONS = new Set([
  "source_file_content_changed",
  "context_authority_changed",
  "verification_input_removed_or_replaced",
  "environment_requirement_removed",
  "risk_changed_requires_review",
]);

const USER_DECISION_REASONS = new Set([
  "product_claim_added",
  "product_claim_removed",
  "product_claim_changed",
  "global_semantics_changed",
  "source_claim_removed_or_changed",
  "source_claim_added",
  "source_path_removed_or_replaced",
  "check_removed",
  "negative_assertion_removed",
  "acceptance_semantics_reduced",
  "proof_surface_changed",
  "input_path_coverage_reduced",
  "expected_output_requirement_weakened",
  "artifact_removed",
  "owner_context_ref_removed",
  "forbidden_path_removed",
  "obligation_removed_or_weakened",
  "rollback_or_recovery_weakened",
  "counterfactual_removed",
  "population_weakened",
  "verifier_content_changed",
  "external_confirmation_changed",
]);

const AUTOMATIC_RUNNER_FIELDS = new Set([
  "target",
  "argv",
  "cwd",
  "timeout_ms",
  "retry_policy",
  "idempotent",
  "resolved_target",
  "resolved_cwd",
  "package_script",
]);

const PROOF_REDUCTION_REASONS = new Set([
  "check_removed",
  "negative_assertion_removed",
  "acceptance_semantics_reduced",
  "proof_surface_changed",
  "input_path_coverage_reduced",
  "expected_output_requirement_weakened",
  "artifact_removed",
  "binding_removed_or_expanded",
  "obligation_removed_or_weakened",
  "rollback_or_recovery_weakened",
  "counterfactual_removed",
  "population_weakened",
  "acceptance_not_monotonic",
]);

export function classifyAuthorityRevision(
  diff: AuthorityRevisionDiffV2,
): AuthorityRevisionChangeClassV2 {
  if (!diff.reduction_reasons.length) return "monotonic_evidence_strengthening";
  const userDecisionReasons = authorityRevisionUserDecisionReasons(diff);
  if (
    diff.reduction_reasons.every((reason) =>
      SCOPE_EXPANSION_REASONS.has(reason),
    )
  )
    return "scope_only_expansion";
  if (!userDecisionReasons.length) return "mechanically_bounded_repair";
  return "protected_semantic_or_proof_change";
}

export function authorityRevisionUserDecisionReasons(
  diff: AuthorityRevisionDiffV2,
): string[] {
  const reasons: string[] = [];
  for (const reason of diff.reduction_reasons) {
    if (USER_DECISION_REASONS.has(reason)) {
      reasons.push(reason);
      continue;
    }
    if (
      SCOPE_EXPANSION_REASONS.has(reason) ||
      MECHANICALLY_BOUNDED_REASONS.has(reason)
    )
      continue;
    if (reason === "product_semantics_changed") {
      if (diff.product_semantics_changed.some(isDecisionProductSemanticField))
        reasons.push(reason);
      continue;
    }
    if (reason === "runner_definition_changed") {
      if (
        diff.runner_definitions_changed.some(
          (entry) => !AUTOMATIC_RUNNER_FIELDS.has(lastAddressPart(entry)),
        )
      )
        reasons.push(reason);
      continue;
    }
    if (reason === "binding_removed_or_expanded") {
      if (
        diff.bindings_removed_or_expanded.some(
          (entry) =>
            entry.endsWith(":removed") ||
            entry.endsWith(":target_or_kind_changed"),
        )
      )
        reasons.push(reason);
      continue;
    }
    if (reason === "acceptance_not_monotonic") {
      if (!hasMechanicallyExplainedAcceptanceChange(diff)) reasons.push(reason);
      continue;
    }
    // New or unknown reason codes fail closed until this policy owner
    // explicitly classifies them.
    reasons.push(reason);
  }
  return uniqueSorted(reasons);
}

export function summarizeAuthorityRevision(
  diff: AuthorityRevisionDiffV2,
  outcomeKeys: string[],
): AuthorityRevisionApprovalSummaryV2 {
  const affectedOutcomes = scopeAffectedOutcomes(diff);
  const changeClass = classifyAuthorityRevision(diff);
  const userDecisionReasons = authorityRevisionUserDecisionReasons(diff);
  return {
    product_semantics_changed:
      diff.product_claims_added.length > 0 ||
      diff.product_claims_removed.length > 0 ||
      diff.product_claims_changed.length > 0 ||
      diff.product_semantics_changed.length > 0,
    global_or_technical_semantics_changed:
      diff.global_semantics_changed.length > 0 ||
      diff.technical_obligations_changed,
    source_or_claims_changed:
      diff.source_claims_changed ||
      diff.source_claims_added.length > 0 ||
      diff.source_claims_removed_or_changed.length > 0 ||
      diff.source_paths_removed_or_replaced.length > 0 ||
      diff.source_files_added.length > 0 ||
      diff.source_files_removed.length > 0 ||
      diff.source_files_changed.length > 0,
    context_authority_changed:
      diff.context_snapshot_mode_changed ||
      diff.context_topology_changed ||
      diff.context_files_added.length > 0 ||
      diff.context_files_removed.length > 0 ||
      diff.context_files_changed.length > 0,
    acceptance_or_proof_weakened: userDecisionReasons.some((reason) =>
      PROOF_REDUCTION_REASONS.has(reason),
    ),
    verifier_or_runner_changed:
      diff.verifier_content_changed ||
      diff.verifier_runtime_locator_changed ||
      diff.runner_definitions_changed.length > 0,
    verifier_content_changed: diff.verifier_content_changed,
    verifier_files_changed: uniqueSorted(diff.verifier_files_changed),
    write_scope_expanded: diff.owner_or_path_boundary_changed,
    risk_changed: diff.risk_changed,
    external_confirmations_changed: diff.external_confirmations_changed,
    semantic_fields_changed: uniqueSorted([
      ...diff.product_semantics_changed,
      ...diff.global_semantics_changed,
    ]),
    source_claim_changes: uniqueSorted([
      ...diff.source_claims_added,
      ...diff.source_claims_removed_or_changed,
    ]),
    product_claim_changes: uniqueSorted([
      ...diff.product_claims_added.map((claim) => `${claim}:added`),
      ...diff.product_claims_removed.map((claim) => `${claim}:removed`),
      ...diff.product_claims_changed.map((claim) => `${claim}:changed`),
    ]),
    proof_reductions: uniqueSorted(
      diff.reduction_reasons.filter((reason) =>
        PROOF_REDUCTION_REASONS.has(reason),
      ),
    ),
    external_confirmation_changes: uniqueSorted(
      diff.external_confirmation_changes,
    ),
    added_verification_dependencies: uniqueSorted([
      ...diff.verification_inputs_added,
      ...diff.input_paths_added,
    ]),
    expanded_owner_paths: uniqueSorted(diff.owner_paths_expanded),
    expanded_expected_change_paths: uniqueSorted(
      diff.expected_change_paths_expanded,
    ),
    expanded_allowed_support_paths: uniqueSorted(diff.allowed_paths_expanded),
    user_decision_reasons: userDecisionReasons,
    mechanically_bounded_reasons: uniqueSorted(
      diff.reduction_reasons.filter(
        (reason) => !userDecisionReasons.includes(reason),
      ),
    ),
    protected_reasons: uniqueSorted(diff.reduction_reasons),
    affected_outcomes:
      changeClass === "scope_only_expansion" && affectedOutcomes.length > 0
        ? affectedOutcomes
        : uniqueSorted(outcomeKeys),
  };
}

export function projectAuthorityRevisionDecision(value: {
  revision_identity: string;
  revision_diff: AuthorityRevisionDiffV2;
  affected_outcomes_or_contracts: string[];
  change_class?: AuthorityRevisionChangeClassV2;
  user_decision_required?: boolean;
  user_decision_reasons?: string[];
  approval_required?: boolean;
  approval_summary?: AuthorityRevisionApprovalSummaryV2;
}): AuthorityRevisionDecisionV2 {
  const diff = {
    ...value.revision_diff,
    verification_inputs_added:
      value.revision_diff.verification_inputs_added ?? [],
    input_paths_added: value.revision_diff.input_paths_added ?? [],
    acceptance_semantics_reduced:
      value.revision_diff.acceptance_semantics_reduced ?? [],
    external_confirmations_changed:
      value.revision_diff.external_confirmations_changed ?? false,
    external_confirmation_changes:
      value.revision_diff.external_confirmation_changes ?? [],
  } as AuthorityRevisionDiffV2;
  const computedSummary = summarizeAuthorityRevision(
    diff,
    value.affected_outcomes_or_contracts,
  );
  const storedSummary = value.approval_summary as
    Partial<AuthorityRevisionApprovalSummaryV2> | undefined;
  const approvalSummary = storedSummary
    ? {
        ...computedSummary,
        ...storedSummary,
        acceptance_or_proof_weakened:
          computedSummary.acceptance_or_proof_weakened,
        verifier_content_changed: computedSummary.verifier_content_changed,
        verifier_files_changed: computedSummary.verifier_files_changed,
        semantic_fields_changed:
          storedSummary.semantic_fields_changed ??
          computedSummary.semantic_fields_changed,
        source_claim_changes:
          storedSummary.source_claim_changes ??
          computedSummary.source_claim_changes,
        product_claim_changes:
          storedSummary.product_claim_changes ??
          computedSummary.product_claim_changes,
        proof_reductions: computedSummary.proof_reductions,
        external_confirmation_changes:
          storedSummary.external_confirmation_changes ??
          computedSummary.external_confirmation_changes,
        user_decision_reasons:
          storedSummary.user_decision_reasons ??
          computedSummary.user_decision_reasons,
        mechanically_bounded_reasons:
          storedSummary.mechanically_bounded_reasons ??
          computedSummary.mechanically_bounded_reasons,
      }
    : computedSummary;
  const changeClass = value.change_class ?? classifyAuthorityRevision(diff);
  const computedUserDecisionReasons =
    authorityRevisionUserDecisionReasons(diff);
  const userDecisionRequired =
    value.user_decision_required ??
    value.approval_required ??
    computedUserDecisionReasons.length > 0;
  const userDecisionReasons =
    value.user_decision_reasons ??
    approvalSummary.user_decision_reasons ??
    computedUserDecisionReasons;
  return {
    revision_identity: value.revision_identity,
    change_class: changeClass,
    user_decision_required: userDecisionRequired,
    user_decision_reasons: userDecisionReasons,
    approval_required: userDecisionRequired,
    approval_summary: approvalSummary,
    decision_brief: buildAuthorityRevisionDecisionBrief(
      approvalSummary,
      changeClass,
      userDecisionRequired,
    ),
  };
}

function isDecisionProductSemanticField(field: string): boolean {
  return (
    !/^stages\.[^.]+\.title$/u.test(field) &&
    !/^outcomes\.[^.]+\.title$/u.test(field)
  );
}

function lastAddressPart(value: string): string {
  return value.slice(value.lastIndexOf(":") + 1);
}

function hasMechanicallyExplainedAcceptanceChange(
  diff: AuthorityRevisionDiffV2,
): boolean {
  return (
    diff.verification_inputs_removed_or_replaced.length > 0 ||
    diff.environment_requirements_removed.length > 0
  );
}

function scopeAffectedOutcomes(diff: AuthorityRevisionDiffV2): string[] {
  return uniqueSorted(
    [
      ...diff.owner_paths_expanded,
      ...diff.expected_change_paths_expanded,
      ...diff.allowed_paths_expanded,
    ]
      .map((entry) => entry.split(":", 1)[0])
      .filter((key) => key.length > 0 && key !== "GLOBAL"),
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
