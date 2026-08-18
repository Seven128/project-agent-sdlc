import type {
  AuthorityRevisionApprovalSummaryV2,
  AuthorityRevisionChangeClassV2,
  AuthorityRevisionDecisionBriefV2,
  AuthorityRevisionDecisionV2,
} from "./long-task-authority-revision-types.js";

export function authorityRevisionDecisionNextAction(
  decision: AuthorityRevisionDecisionV2,
): string {
  const brief = decision.decision_brief;
  const outcomes = brief.affected_outcomes.length
    ? brief.affected_outcomes.join(", ")
    : "contract-wide or global authority";
  if (!decision.user_decision_required)
    return `Authority Revision brief: ${brief.overview} ${brief.headline} ${brief.approval_reason} Material changes: ${brief.material_changes.join(" ")} Affected Outcomes: ${outcomes}. ${brief.if_approved.join(" ")}`;
  return `Authority Revision brief: ${brief.overview} ${brief.headline} ${brief.approval_reason} Material changes: ${brief.material_changes.join(" ")} Affected Outcomes: ${outcomes}. ${brief.if_approved.join(" ")} Present this brief first. If an explicit task-specific user instruction already covers every listed decision reason, mechanically relay that existing decision for exact Authority Revision ${decision.revision_identity} without asking again. A generic continue, blanket approval, recommendation or Agent inference does not count. Otherwise ask the user once to approve or reject this exact identity; keep the previous Authority active until approved and atomically adopted.`;
}

export function buildAuthorityRevisionDecisionBrief(
  summary: AuthorityRevisionApprovalSummaryV2,
  changeClass: AuthorityRevisionChangeClassV2,
  approvalRequired: boolean,
): AuthorityRevisionDecisionBriefV2 {
  const categories: string[] = [];
  const materialChanges: string[] = [];
  addCategory(
    summary.product_semantics_changed,
    "product meaning",
    detail(
      "Product Claims or semantics changed",
      summary.product_claim_changes,
    ),
  );
  addCategory(
    summary.global_or_technical_semantics_changed,
    "technical meaning",
    detail(
      "Global or technical semantics changed",
      summary.semantic_fields_changed,
    ),
  );
  addCategory(
    summary.source_or_claims_changed,
    "Source/Claims",
    detail("Source or Claim authority changed", summary.source_claim_changes),
  );
  addCategory(
    summary.context_authority_changed,
    "Context authority",
    "Controlling Context authority changed.",
  );
  addCategory(
    summary.acceptance_or_proof_weakened,
    "acceptance/proof",
    detail("Acceptance or proof was reduced", summary.proof_reductions),
  );
  addCategory(
    summary.verifier_or_runner_changed,
    "verifier/runner",
    summary.verifier_content_changed
      ? detail(
          "Verifier content changed; prior evidence is invalid and semantic preservation is not independently established",
          summary.verifier_files_changed,
        )
      : "Verifier or runner authority changed.",
  );
  addCategory(
    summary.write_scope_expanded,
    "write scope",
    detail(
      "Owner or allowed write scope expanded",
      uniqueSorted([
        ...summary.expanded_owner_paths,
        ...summary.expanded_expected_change_paths,
        ...summary.expanded_allowed_support_paths,
      ]),
    ),
  );
  addCategory(
    summary.risk_changed,
    "risk",
    "The effective risk authority changed.",
  );
  addCategory(
    summary.external_confirmations_changed,
    "external confirmations",
    detail(
      "External-confirmation authority changed",
      summary.external_confirmation_changes,
    ),
  );
  if (summary.added_verification_dependencies.length)
    materialChanges.push(
      detail(
        "Verification dependencies were added",
        summary.added_verification_dependencies,
      ),
    );
  if (!materialChanges.length)
    materialChanges.push(
      detail("Protected authority fields changed", summary.protected_reasons),
    );

  return {
    overview:
      "An Authority Revision is a proposed replacement of the locked delivery contract or its protected inputs. It changes what future execution and proof are bound to, but adoption never completes delivery.",
    headline: approvalRequired
      ? `User decision required: ${categories.length ? categories.join(", ") : changeClass} changed.`
      : "No user decision is required for this mechanically bounded Authority Revision.",
    approval_reason: approvalRequired
      ? changeClass === "scope_only_expansion"
        ? "The candidate expands declared implementation ownership or write scope and cannot replace the active Authority without exact user approval."
        : "The candidate changes protected delivery meaning, proof, risk, or execution authority and cannot replace the active Authority without exact user approval."
      : changeClass === "scope_only_expansion"
        ? "The candidate only expands repository-bound implementation scope; it changes no locked product Claim, target, acceptance capability, forbidden boundary or external confirmation."
        : changeClass === "mechanically_bounded_repair"
          ? "The locked user-facing meaning and proof obligations are preserved; changed execution, Source/Context snapshot or equivalent failure interception must still be re-proven on the new snapshot."
          : "The change is a machine-proven monotonic strengthening.",
    material_changes: materialChanges,
    affected_outcomes: [...summary.affected_outcomes],
    if_approved: approvalRequired
      ? [
          "The previous Authority remains active until exact approval and atomic adoption.",
          "Approval and adoption do not complete delivery; execution returns to rolling implementation or repair.",
          "A complete source-recompiled current-snapshot Final Gate remains mandatory.",
        ]
      : [
          "The mechanically safe revision may be atomically adopted without user approval.",
          "Adoption does not complete delivery; execution returns to rolling implementation or repair.",
          "A complete source-recompiled current-snapshot Final Gate remains mandatory.",
        ],
  };

  function addCategory(
    applies: boolean,
    category: string,
    materialChange: string,
  ): void {
    if (!applies) return;
    categories.push(category);
    materialChanges.push(materialChange);
  }
}

function detail(label: string, values: string[]): string {
  if (!values.length) return `${label}.`;
  const shown = values.slice(0, 3);
  const remaining = values.length - shown.length;
  return `${label}: ${shown.join(", ")}${remaining ? ` (+${remaining} more)` : ""}.`;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
