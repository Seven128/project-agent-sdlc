import type {
  AuthorityHashesV2,
  AuthorityMaterialHashesV2,
  NextAuthorityMaterialsV2,
  VerifierIdentityV2,
} from "./long-task-authority-types.js";

export type AuthorityRevisionChangeClassV2 =
  | "monotonic_evidence_strengthening"
  | "mechanically_bounded_repair"
  | "scope_only_expansion"
  | "protected_semantic_or_proof_change";

export interface AuthorityRevisionApprovalSummaryV2 {
  product_semantics_changed: boolean;
  global_or_technical_semantics_changed: boolean;
  source_or_claims_changed: boolean;
  context_authority_changed: boolean;
  acceptance_or_proof_weakened: boolean;
  verifier_or_runner_changed: boolean;
  verifier_content_changed: boolean;
  verifier_files_changed: string[];
  write_scope_expanded: boolean;
  risk_changed: boolean;
  external_confirmations_changed: boolean;
  semantic_fields_changed: string[];
  source_claim_changes: string[];
  product_claim_changes: string[];
  proof_reductions: string[];
  external_confirmation_changes: string[];
  added_verification_dependencies: string[];
  expanded_owner_paths: string[];
  expanded_expected_change_paths: string[];
  expanded_allowed_support_paths: string[];
  user_decision_reasons: string[];
  mechanically_bounded_reasons: string[];
  protected_reasons: string[];
  affected_outcomes: string[];
}

export interface AuthorityRevisionProposalV2 {
  previous_hashes: AuthorityHashesV2;
  next_hashes: AuthorityHashesV2;
  previous_materials: NextAuthorityMaterialsV2;
  next_materials: NextAuthorityMaterialsV2;
  previous_material_hashes: AuthorityMaterialHashesV2;
  next_material_hashes: AuthorityMaterialHashesV2;
  changed_authority_sections: string[];
  revision_diff: AuthorityRevisionDiffV2;
  new_risk_floor: "standard" | "strict";
  affected_outcomes_or_contracts: string[];
  change_class: AuthorityRevisionChangeClassV2;
  user_decision_required: boolean;
  user_decision_reasons: string[];
  /** Compatibility alias for user_decision_required. */
  approval_required: boolean;
  approval_summary: AuthorityRevisionApprovalSummaryV2;
  revision_identity: string;
}

export interface AuthorityRevisionDecisionBriefV2 {
  overview: string;
  headline: string;
  approval_reason: string;
  material_changes: string[];
  affected_outcomes: string[];
  if_approved: string[];
}

export interface AuthorityRevisionDecisionV2 {
  revision_identity: string;
  change_class: AuthorityRevisionChangeClassV2;
  user_decision_required: boolean;
  user_decision_reasons: string[];
  /** Compatibility alias for user_decision_required. */
  approval_required: boolean;
  approval_summary: AuthorityRevisionApprovalSummaryV2;
  decision_brief: AuthorityRevisionDecisionBriefV2;
}

export interface AuthorityRevisionDiffV2 {
  product_claims_added: string[];
  product_claims_removed: string[];
  product_claims_changed: string[];
  product_semantics_changed: string[];
  global_semantics_changed: string[];
  checks_added: string[];
  checks_removed: string[];
  negative_assertions_removed: string[];
  acceptance_semantics_reduced: string[];
  proof_surfaces_changed: string[];
  source_claims_added: string[];
  source_claims_removed_or_changed: string[];
  source_paths_removed_or_replaced: string[];
  source_files_added: string[];
  source_files_removed: string[];
  source_files_changed: string[];
  context_snapshot_mode_changed: boolean;
  context_topology_changed: boolean;
  context_files_added: string[];
  context_files_removed: string[];
  context_files_changed: string[];
  design_semantics_changed: string[];
  design_implementation_bindings_changed: string[];
  implementation_binding_refresh_targets: string[];
  owner_paths_expanded: string[];
  owner_context_refs_removed: string[];
  expected_change_paths_expanded: string[];
  allowed_paths_expanded: string[];
  forbidden_paths_removed: string[];
  runner_definitions_changed: string[];
  verification_inputs_added: string[];
  verification_inputs_removed_or_replaced: string[];
  input_paths_added: string[];
  input_paths_removed_or_narrowed: string[];
  expected_output_paths_removed_or_weakened: string[];
  artifacts_removed: string[];
  environment_requirements_removed: string[];
  bindings_removed_or_expanded: string[];
  obligations_removed_or_weakened: string[];
  rollback_or_recovery_weakened: string[];
  counterfactuals_removed: string[];
  population_weakened: string[];
  external_confirmations_changed: boolean;
  external_confirmation_changes: string[];
  verifier_content_changed: boolean;
  verifier_runtime_locator_changed: boolean;
  verifier_files_changed: string[];
  previous_verifier: VerifierIdentityV2;
  next_verifier: VerifierIdentityV2;
  source_claims_changed: boolean;
  risk_changed: boolean;
  owner_or_path_boundary_changed: boolean;
  runner_or_verification_inputs_changed: boolean;
  technical_obligations_changed: boolean;
  reduction_reasons: string[];
}
