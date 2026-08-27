import type { EffectiveExternalObligationV1 } from "./long-task-acceptance-reachability-types.js";
import type {
  CompiledExternalConfirmationIdentityAssuranceV2,
  ExternalConfirmationV2,
} from "./long-task-contract-types.js";
import type { KeyedStatementV2 } from "./long-task-semantic-contract-types.js";
import type { DesignResourceLocatedDigestV1 } from "./design-resource-fact-manifest-types.js";
import type { SemanticFactLocatedValueV1 } from "./semantic-fact-types.js";

type ExternalConfirmationLocatedValueV1 =
  | SemanticFactLocatedValueV1
  | DesignResourceLocatedDigestV1
  | {
      kind: "compiled_assertion";
      ref: string;
      sha256: string;
      value: unknown;
    }
  | {
      kind: "compiled_assertion_comparison" | "design_strict_comparison";
      ref: string;
      sha256: string;
    };

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

export interface ExternalConfirmationResultV2 {
  obligation_ref: string;
  fact_ref: string | null;
  claim_ref: string;
  applicability_ref: string;
  result_kind: "actual" | "judgment";
  actual?: unknown;
  verdict: "passed" | "failed" | "unable";
  evidence_refs: string[];
  rationale?: string;
}

export interface ExternalConfirmationArtifactSnapshotV2 {
  sha256: string;
  size_bytes: number;
  media_type: string | null;
  store_ref: string;
}

export interface ExternalConfirmationRecordV2 {
  schema_version: "long-task-external-confirmation-record-v2";
  confirmation_ref: string;
  compiled_identity: string;
  authority_revision: number;
  candidate: ExternalConfirmationCandidateV1;
  challenge: string;
  actor: ExternalConfirmationActorV1;
  session: ExternalConfirmationSessionV1;
  results: ExternalConfirmationResultV2[];
  artifact_snapshots: Record<string, ExternalConfirmationArtifactSnapshotV2>;
  relevant_input_identity: string;
  attestation: {
    scheme: "ed25519";
    key_id: string;
    signature_base64: string;
  };
  record_sha256: string;
}

export type ExternalConfirmationRecord =
  ExternalConfirmationRecordV1 | ExternalConfirmationRecordV2;

export type ExternalConfirmationFulfillmentStateV1 =
  | "pending"
  | "fulfilled"
  | "failed"
  | "unable"
  | "invalid"
  | "stale"
  | "legacy_unattested";

export interface ExternalConfirmationObligationResultV1 {
  obligation_ref: string;
  fact_ref: string | null;
  claim_ref: string;
  applicability_ref: string;
  outcome_key: string | null;
  verdict: "passed" | "failed" | "unable";
  result_kind: "actual" | "judgment";
  completion_role: "blocking" | "advisory";
  acceptance_effect: "required" | "none";
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
  actor_identity_assurance:
    "ed25519_verified" | "declared_only" | "legacy_unattested" | "invalid";
  identity_assurance: CompiledExternalConfirmationIdentityAssuranceV2 | null;
  signature_verified: boolean;
  challenge_current: boolean;
  artifact_snapshot_integrity: boolean;
  record_schema_version: ExternalConfirmationRecord["schema_version"] | null;
  obligation_results: ExternalConfirmationObligationResultV1[];
  effective_blocking_obligation_refs: string[];
  effective_advisory_obligation_refs: string[];
  blocking_issues: string[];
  advisory_state: ExternalConfirmationFulfillmentStateV1 | null;
  advisory_issues: string[];
  issues: string[];
}

export interface ExternalConfirmationExpectedV1 {
  authority_ref: string;
  kind:
    | "semantic_fact"
    | "design_fact"
    | "contract_claim"
    | "contract_claim_actual";
  statement: string | null;
  located_value: ExternalConfirmationLocatedValueV1 | null;
  comparison: {
    comparator: string;
    mode: "exact" | "tolerance";
    parameters: ExternalConfirmationLocatedValueV1;
    tolerance: ExternalConfirmationLocatedValueV1 | null;
    mask: ExternalConfirmationLocatedValueV1 | null;
  } | null;
}

export interface ExternalConfirmationPreparationObligationV1 extends EffectiveExternalObligationV1 {
  result_kind: "actual" | "judgment";
  expected: ExternalConfirmationExpectedV1;
}

export interface ExternalConfirmationPreparationConfirmationV1 {
  confirmation_ref: string;
  description: string;
  owner: string;
  actor: ExternalConfirmationActorV1;
  identity_assurance: CompiledExternalConfirmationIdentityAssuranceV2;
  target_ref: string;
  environment_identity: string;
  scenario: NonNullable<ExternalConfirmationV2["scenario"]>;
  evidence_requirements: KeyedStatementV2[];
  session_group: string;
  relevant_input_identity: string;
  relevant_input_mode: "bounded_paths" | "whole_candidate";
  relevant_input_paths: string[];
  challenge: string;
  signable_canonical_digest: string;
  obligations: ExternalConfirmationPreparationObligationV1[];
}

export interface ExternalConfirmationPreparationSessionV1 {
  session_group: string;
  suggested_session_id: string;
  actor: ExternalConfirmationActorV1;
  identity_assurance: CompiledExternalConfirmationIdentityAssuranceV2;
  target_ref: string;
  environment_identity: string;
  scenario: NonNullable<ExternalConfirmationV2["scenario"]>;
  evidence_requirements: KeyedStatementV2[];
  confirmation_refs: string[];
  obligations: ExternalConfirmationPreparationObligationV1[];
}

export interface ExternalConfirmationPreparationV1 {
  schema_version: "long-task-external-confirmation-preparation-v2";
  acceptance_effect: "none";
  notice: "Preparation output does not establish acceptance.";
  task_id: string;
  compiled_identity: string;
  authority_revision: number;
  candidate: ExternalConfirmationCandidateV1;
  actor_identity_boundary: "detached_ed25519_required_for_blocking_fulfillment";
  confirmations: ExternalConfirmationPreparationConfirmationV1[];
  sessions: ExternalConfirmationPreparationSessionV1[];
  generated_at: string;
}

export interface RelevantExternalInputIdentityV1 {
  mode: "bounded_paths" | "whole_candidate";
  identity: string;
  paths: string[];
}
