import type { AcceptanceObligationReachabilityV1 } from "./long-task-acceptance-reachability.js";
import type { ExternalConfirmationV2 } from "./long-task-contract-types.js";
import type { KeyedStatementV2 } from "./long-task-semantic-contract-types.js";
import type { SemanticFactLocatedValueV1 } from "./semantic-fact-types.js";

export interface ExternalConfirmationCandidateV1 {
  git_head: string;
  git_tree: string;
  snapshot_sha256: string;
}

export interface ExternalConfirmationActorV1 {
  id: string;
  role: string;
  authority_kind: "human" | "expert" | "external_system";
}

export interface ExternalConfirmationSessionV1 {
  id: string;
  target_ref: string;
  environment_identity: string;
  started_at: string;
  completed_at: string;
}

export interface ExternalConfirmationResultV1 {
  obligation_ref: string;
  fact_ref: string | null;
  claim_ref: string;
  applicability_ref: string;
  actual?: unknown;
  verdict: "passed" | "failed" | "unable";
  evidence_refs: string[];
  rationale?: string;
}

export interface ExternalConfirmationRecordV1 {
  schema_version: "long-task-external-confirmation-record-v1";
  confirmation_ref: string;
  compiled_identity: string;
  authority_revision: number;
  candidate: ExternalConfirmationCandidateV1;
  actor: ExternalConfirmationActorV1;
  session: ExternalConfirmationSessionV1;
  results: ExternalConfirmationResultV1[];
  artifact_hashes: Record<string, string>;
  relevant_input_identity: string;
  record_sha256: string;
}

export type ExternalConfirmationFulfillmentStateV1 =
  "pending" | "fulfilled" | "failed" | "unable" | "invalid" | "stale";

export interface ExternalConfirmationObligationResultV1 {
  obligation_ref: string;
  fact_ref: string | null;
  claim_ref: string;
  applicability_ref: string;
  outcome_key: string | null;
  verdict: "passed" | "failed" | "unable";
  result_kind: "actual" | "judgment";
  comparator_recomputed: boolean;
  evidence_refs: string[];
}

export interface ExternalConfirmationEvaluationV1 {
  confirmation_ref: string;
  owner: string;
  blocks_target: boolean;
  state: ExternalConfirmationFulfillmentStateV1;
  record_sha256: string | null;
  session_id: string | null;
  relevant_input_identity: string;
  carried_forward_from_candidate: boolean;
  actor_identity_assurance: "declared_identity_and_record_integrity_only";
  obligation_results: ExternalConfirmationObligationResultV1[];
  issues: string[];
}

export interface ExternalConfirmationExpectedV1 {
  authority_ref: string;
  kind: "semantic_fact" | "contract_claim";
  statement: string | null;
  located_value: SemanticFactLocatedValueV1 | null;
  comparison: {
    comparator: string;
    mode: "exact" | "tolerance";
    parameters: SemanticFactLocatedValueV1;
    tolerance: SemanticFactLocatedValueV1 | null;
    mask: SemanticFactLocatedValueV1 | null;
  } | null;
}

export interface ExternalConfirmationPreparationObligationV1 extends AcceptanceObligationReachabilityV1 {
  result_kind: "actual" | "judgment";
  expected: ExternalConfirmationExpectedV1;
}

export interface ExternalConfirmationPreparationConfirmationV1 {
  confirmation_ref: string;
  description: string;
  owner: string;
  actor: ExternalConfirmationActorV1;
  target_ref: string;
  environment_identity: string;
  scenario: NonNullable<ExternalConfirmationV2["scenario"]>;
  evidence_requirements: KeyedStatementV2[];
  session_group: string;
  relevant_input_identity: string;
  relevant_input_mode: "bounded_paths" | "whole_candidate";
  relevant_input_paths: string[];
  obligations: ExternalConfirmationPreparationObligationV1[];
}

export interface ExternalConfirmationPreparationSessionV1 {
  session_group: string;
  suggested_session_id: string;
  actor: ExternalConfirmationActorV1;
  target_ref: string;
  environment_identity: string;
  scenario: NonNullable<ExternalConfirmationV2["scenario"]>;
  evidence_requirements: KeyedStatementV2[];
  confirmation_refs: string[];
  obligations: ExternalConfirmationPreparationObligationV1[];
}

export interface ExternalConfirmationPreparationV1 {
  schema_version: "long-task-external-confirmation-preparation-v1";
  task_id: string;
  compiled_identity: string;
  authority_revision: number;
  candidate: ExternalConfirmationCandidateV1;
  actor_identity_boundary: "declared_identity_and_record_integrity_only_not_authentication";
  confirmations: ExternalConfirmationPreparationConfirmationV1[];
  sessions: ExternalConfirmationPreparationSessionV1[];
  generated_at: string;
}

export interface RelevantExternalInputIdentityV1 {
  mode: "bounded_paths" | "whole_candidate";
  identity: string;
  paths: string[];
}
