import type { DeliveryContractV2 } from "./long-task-contract-types.js";
import type { VerifierIdentityV2 } from "./long-task-authority-types.js";
import type {
  CheckExecutionResultV2,
  LongTaskFindingV2,
} from "./long-task-runtime-types.js";
import type { ExternalConfirmationEvaluationV1 } from "./long-task-external-confirmation-types.js";

export interface TargetedVerificationResultV2 {
  schema_version: "long-task-targeted-progress-v2";
  compiled_identity: string;
  snapshot_sha256: string;
  acceptance_authorized: false;
  selected_outcome: string | null;
  selected_check: string | null;
  updated_progress_records: string[];
  check_results: CheckExecutionResultV2[];
  findings: LongTaskFindingV2[];
  repair_frontier?: RepairFrontierV1;
  completed_at: string;
}

export interface RepairFrontierCheckV1 {
  check_ref: string;
  outcome_key: string | null;
  check_key: string;
  raw_execution_identity: string;
  obligation_refs: string[];
  reasons: string[];
}

export interface RepairFrontierGroupV1 {
  root_cause_key: string;
  finding_codes: string[];
  source_fragment_refs: string[];
  affected_fact_refs: string[];
  affected_proof_obligation_refs: string[];
  affected_claim_refs: string[];
  expected_authority_refs: string[];
  actual_evidence_refs: string[];
  suggested_implementation_owners: string[];
  suggested_owner_paths: string[];
  verification_owners: string[];
  invalidation_reasons: string[];
  rerun_obligation_refs: string[];
  minimum_diagnostic_reverify: string[];
  still_valid_diagnostic_evidence: string[];
}

export interface RepairFrontierSessionV1 {
  raw_execution_identity: string;
  check_refs: string[];
  obligation_refs: string[];
}

export interface RepairFrontierV1 {
  schema_version: "long-task-repair-frontier-v1";
  authority_scope: "derived_diagnostic_only";
  acceptance_authorized: false;
  persisted: false;
  compiled_identity: string;
  authority_revision: number;
  candidate_snapshot_sha256: string;
  changed_paths: string[];
  summary: {
    finding_groups: number;
    affected_facts: number;
    affected_proof_obligations: number;
    minimum_checks: number;
    still_valid_progress_records: number;
  };
  groups: RepairFrontierGroupV1[];
  minimum_diagnostic_reverify: RepairFrontierCheckV1[];
  rerun_sessions: RepairFrontierSessionV1[];
  still_valid_diagnostic_evidence: string[];
  forbidden_authority_changes_without_revision: {
    fields: string[];
    protected_paths: string[];
  };
  final_gate_requirement: "complete_one_snapshot_rerun_still_required";
  generated_at: string;
}

export type OutcomeStatusV2 =
  | "unverified"
  | "progress_passing"
  | "progress_failing"
  | "progress_stale"
  | "blocked_external";

export type StageStatusV2 =
  | "locked"
  | "ready"
  | "unverified"
  | "progress_passing"
  | "progress_failing"
  | "progress_stale"
  | "blocked_external";

export interface FinalReceiptV2 {
  schema_version: "long-task-final-receipt-v2" | "long-task-final-receipt-v3";
  receipt_sha256: string;
  authority_scope: "audit_only";
  reusable_for_acceptance: false;
  workflow_status:
    | "machine_accepted"
    | "delivery_accepted"
    | "machine_accepted_external_pending"
    | "needs_work"
    | "blocked_external";
  target_profile: DeliveryContractV2["task"]["target_profile"];
  target_state:
    | DeliveryContractV2["task"]["target_profile"]["required_state"]
    | "not_accepted"
    | "blocked_external";
  stage_results: Record<
    string,
    "passed" | "failed" | "blocked_external" | "blocked_dependency"
  >;
  compiled_identity: string;
  contract_sha256: string;
  snapshot_sha256: string;
  git_head: string;
  git_tree: string;
  source_hashes: Record<string, string>;
  context_hashes: Record<string, string>;
  verifier_identity: VerifierIdentityV2;
  check_results: CheckExecutionResultV2[];
  outcome_results: Record<string, "passed" | "failed" | "blocked_external">;
  external_confirmations: DeliveryContractV2["global"]["acceptance"]["external_confirmations"];
  external_confirmation_results?: ExternalConfirmationEvaluationV1[];
  findings: LongTaskFindingV2[];
  snapshot_preparation_ms: number;
  started_at: string;
  completed_at: string;
  /** Present on newly finalized v3 Receipts; historical Receipts remain audit-only. */
  finalization_identity_sha256?: string;
}

export type FinalReceiptV3 = Omit<FinalReceiptV2, "schema_version"> & {
  schema_version: "long-task-final-receipt-v3";
  external_confirmation_results: ExternalConfirmationEvaluationV1[];
  finalization_identity_sha256: string;
};
