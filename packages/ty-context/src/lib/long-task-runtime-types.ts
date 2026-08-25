import type {
  CompiledExternalConfirmationIdentityAssuranceV2,
  DeliveryCheckV2,
  DeliveryContractV2,
  DeliveryOutcomeV2,
  DeliveryRunnerV2,
  ProofSurface,
} from "./long-task-contract-types.js";
import type {
  EvidenceCapabilityV2,
  ExecutionTargetV2,
} from "./long-task-semantic-contract-types.js";
import type { CompiledDesignTargetV2 } from "./long-task-ui-surface-types.js";
import type {
  AuthorityHashesV2,
  ContextAuthoritySnapshotV2,
  InitialTaskBaseV2,
  NextAuthorityMaterialsV2,
  VerifierIdentityV2,
} from "./long-task-authority-types.js";
import type { EvidenceAdapter } from "./long-task-evidence-adapter-types.js";
import type { EvidenceCapabilityRecordV2 } from "./long-task-evidence-capability-types.js";
import type {
  EffectiveRiskLevel,
  RiskFactName,
} from "./long-task-risk-types.js";
import type { AcceptanceReachabilityV1 } from "./long-task-acceptance-reachability.js";
import type { SemanticFactExpectationV2 } from "./semantic-fact-types.js";
import type { CompiledSourceItemV2 } from "./long-task-source-authority-types.js";
import type { WorkspaceManifestV2 } from "./long-task-workspace-runtime-types.js";
import type { JsonPointerExactObservation } from "./long-task-json-pointer-observation.js";

export interface FrozenRunnerV2 extends DeliveryRunnerV2 {
  executable: string;
  executable_argv_prefix: string[];
  resolved_cwd: string;
  resolved_target: string;
  definition_sha256: string;
  frozen_files: Record<string, string>;
  package_script: string | null;
  execution_identity: string;
}

export type CompiledObservationAuthorityKindV2 =
  | "package_static_json_exact"
  | "package_process_json_exact"
  | "external_confirmation";

export type CompiledObservationActualProjectionV2 =
  "raw_exact" | "presence_boolean" | "truthy_boolean" | "falsy_boolean";

export interface CompiledObservationAuthorityV2 {
  obligation_ref: string;
  fact_ref: string | null;
  assertion_ref: string;
  claim_refs: string[];
  target_ref: string;
  proof_surface: ProofSurface;
  method: string;
  evidence_capabilities: EvidenceCapabilityV2[];
  authority: CompiledObservationAuthorityKindV2;
  expected_identity: string;
  expected_value_sha256: string;
  actual_projection: CompiledObservationActualProjectionV2;
  observation_identity: string;
  comparison: {
    comparator: string;
    mode: string;
    parameters_sha256: string | null;
    tolerance_sha256: string | null;
    mask_sha256: string | null;
  };
  locator_policy: {
    kind: "fixed_json_pointer";
    value: string;
  };
  carrier_refs: Array<{
    binding_ref: string;
    carrier_paths: string[];
  }>;
  runtime_requirements: {
    runtime_family: ExecutionTargetV2["runtime_family"];
    target_role: ExecutionTargetV2["role"];
    entrypoint: DeliveryCheckV2["execution_target"]["entrypoint"];
    runner_type: DeliveryRunnerV2["type"];
    resolved_runner_target: string;
    declared_root_entrypoint: string;
    resolved_runner_argv: string[];
    declared_root_argv: string[] | null;
    effect: DeliveryRunnerV2["effect"];
    direct_root_match: boolean;
  };
}

export interface SourceBackedExecutionTargetV2 {
  target_ref: string;
  canonical_target_ref: string;
  source_claim_key: string;
  source_item_key: string;
  source_path: string;
  source_text_sha256: string;
  target_identity: string;
}

export interface CompiledProcessRuntimeClosureV2 {
  target_ref: string;
  source_target: SourceBackedExecutionTargetV2;
  root_target: string;
  root_argv_files: string[];
  production_carrier_files: string[];
  allowed_runtime_files: string[];
  production_binding_refs: string[];
  forbidden_role_matches: Array<{
    path: string;
    role: "expected_authority" | "verification" | "evidence";
    pattern: string;
  }>;
  closure_identity: string;
}

export interface CompiledCheckV2 extends Omit<DeliveryCheckV2, "runner"> {
  internal_id: string;
  outcome_key: string | null;
  runner: FrozenRunnerV2;
  evidence_adapter: EvidenceAdapter;
  verification_input_hashes: Record<string, string>;
  raw_execution_identity: string;
  execution_target_definition: ExecutionTargetV2;
  known_execution_targets: ExecutionTargetV2[];
  design_conformance_targets: CompiledDesignTargetV2[];
  semantic_fact_expectations: SemanticFactExpectationV2[];
  observation_authorities: CompiledObservationAuthorityV2[];
  process_runtime_closure: CompiledProcessRuntimeClosureV2 | null;
  completion_role: "semantic" | "diagnostic";
  expected_authority_refs: Record<string, string>;
  required_evidence_capabilities: Record<string, EvidenceCapabilityV2[]>;
}

export interface ProductClaimV2 {
  id: string;
  outcome_key: string;
  local_key: string;
  kind:
    | "result"
    | "requirement"
    | "control"
    | "control_relation"
    | "non_completing"
    | "obligation"
    | "semantic_fact"
    | "forbidden_shortcut";
  required_proof_surfaces: ProofSurface[];
  required_polarity: "positive" | "negative";
  applicability_refs: string[];
}

export interface GlobalClaimV2 {
  id: string;
  local_key: string;
  kind: "global_non_goal" | "global_constraint" | "global_forbidden_shortcut";
  required_polarity: "positive" | "negative";
  applicability_refs: string[];
}

export interface ClaimProofV2 {
  check_key: string;
  assertion_key: string | null;
  polarity: "positive" | "negative" | "population" | "counterfactual";
  proof_surface: ProofSurface;
  applicability_ref: string | null;
}

export interface ClaimCoverageSummaryV2 {
  claims_total: number;
  claims_covered: number;
  uncovered_claims: string[];
  claims_by_global: Record<
    string,
    {
      covered: boolean;
      applicability_refs: string[];
      uncovered_applicability_refs: string[];
      proofs: ClaimProofV2[];
    }
  >;
  claims_by_outcome: Record<
    string,
    Record<
      string,
      {
        required_surfaces: ProofSurface[];
        covered_surfaces: ProofSurface[];
        missing_surfaces: ProofSurface[];
        covered: boolean;
        applicability_refs: string[];
        uncovered_applicability_refs: string[];
        proofs: ClaimProofV2[];
      }
    >
  >;
}

export interface CompiledOutcomeV2 extends Omit<
  DeliveryOutcomeV2,
  "acceptance"
> {
  internal_id: string;
  generated_claims: ProductClaimV2[];
  risk_reasons: RiskFactName[];
  acceptance: Omit<DeliveryOutcomeV2["acceptance"], "checks"> & {
    checks: CompiledCheckV2[];
  };
}

export interface CompiledDeliveryContractV2 {
  schema_version: "compiled-long-task-delivery-v2";
  compiled_identity: string;
  repository_root: string;
  workdir: string;
  contract_file: string;
  contract_sha256: string;
  contract_files: Record<string, string>;
  source_hashes: Record<string, string>;
  source_items: CompiledSourceItemV2[];
  context_snapshot: ContextAuthoritySnapshotV2;
  verifier_identity: VerifierIdentityV2;
  effective_risk: EffectiveRiskLevel;
  risk_reasons: string[];
  baseline_workspace: WorkspaceManifestV2;
  initial_task_base: InitialTaskBaseV2;
  authority_hashes: AuthorityHashesV2;
  authority_materials: NextAuthorityMaterialsV2;
  authority_revision: number;
  claim_coverage: ClaimCoverageSummaryV2;
  acceptance_reachability: AcceptanceReachabilityV1;
  external_confirmation_identity_assurances: Record<
    string,
    CompiledExternalConfirmationIdentityAssuranceV2
  >;
  semantic_fact_manifest: DeliveryContractV2["semantic_fact_manifest"];
  task: DeliveryContractV2["task"];
  risk: DeliveryContractV2["risk"];
  source_claims: DeliveryContractV2["source_claims"];
  stages: DeliveryContractV2["stages"];
  global: Omit<DeliveryContractV2["global"], "acceptance"> & {
    acceptance: {
      checks: CompiledCheckV2[];
      counterfactual_controls: DeliveryContractV2["global"]["acceptance"]["counterfactual_controls"];
      external_confirmations: DeliveryContractV2["global"]["acceptance"]["external_confirmations"];
    };
  };
  outcomes: CompiledOutcomeV2[];
}

export interface LongTaskFindingV2 {
  code: string;
  outcome_key: string | null;
  check_key: string | null;
  source_claim_keys?: string[];
  source_target_refs?: string[];
  claim_keys?: string[];
  assertion_key?: string;
  binding_ref?: string;
  owning_outcome_key?: string;
  criterion?: string;
  observation?: string;
  owner_paths?: string[];
  source_fragment_refs?: string[];
  fact_refs?: string[];
  proof_obligation_refs?: string[];
  expected_authority_refs?: string[];
  actual_evidence_refs?: string[];
  implementation_owner?: {
    label: string;
    path_globs: string[];
  };
  verification_owner?:
    | {
        kind: "machine_check";
        outcome_key: string | null;
        check_key: string;
        runner_target: string;
        input_paths: string[];
      }
    | {
        kind: "external_confirmation";
        confirmation_ref: string;
        owner: string;
        target_ref: string;
      };
  invalidation_reasons?: string[];
  rerun_obligation_refs?: string[];
  message: string;
  expected?: unknown;
  actual?: unknown;
  next_action: string;
}

export type CheckExecutionStatusV2 =
  | "passed"
  | "assertion_failed"
  | "test_failed"
  | "blocked_external"
  | "infrastructure_error"
  | "invalid_evidence";

export interface AssertionResultV2 {
  key: string;
  criterion?: string;
  polarity: "positive" | "negative";
  passed: boolean;
  claims: string[];
  applicability_ref?: string;
  observation: string;
  evidence_capabilities: EvidenceCapabilityV2[];
  evidence_complete: boolean;
  status:
    | "passed"
    | "observation_missing"
    | "observation_type_mismatch"
    | "assertion_value_mismatch";
  expected?: unknown;
  actual?: unknown;
}

export interface RawCommandExecutionV2 {
  raw_execution_identity: string;
  execution_identity: string;
  execution_status:
    | "completed"
    | "blocked_external"
    | "infrastructure_error"
    | "invalid_evidence";
  exit_code: number;
  observations: Record<string, unknown>;
  evidence_records: EvidenceCapabilityRecordV2[];
  stdout_sha256: string;
  stderr_sha256: string;
  attempts: number;
  duration_ms: number;
  error: string | null;
  package_observations?: PackageObservationValueV2[];
  host_execution_attestation?: HostExecutionAttestationV2 | null;
}

export interface PackageObservationValueV2 {
  authority: Exclude<
    CompiledObservationAuthorityKindV2,
    "external_confirmation"
  >;
  observation_identity: string;
  assertion_ref: string;
  obligation_ref: string;
  method: string;
  raw_value: unknown;
  observation: JsonPointerExactObservation | null;
  reason: string | null;
}

export interface PackageProcessObservationV1 {
  schema_version: "ty-context-product-observation-v1";
  artifact_sha256: string;
  observations: Record<string, unknown>;
  value_sha256_by_identity: Record<string, string>;
  package_observations: PackageObservationValueV2[];
}

export interface HostExecutionAttestationV2 {
  raw_execution_identity: string;
  executable_path: string;
  declared_root_entrypoint: string;
  actual_argv: string[];
  declared_root_argv: string[];
  direct_root_match: boolean;
  pid: number;
  started_at: string;
  completed_at: string;
  exit_code: number;
  snapshot_sha256: string;
  observation_execution_nonce: string;
  observation_artifact_sha256: string;
  process_runtime_closure_identity: string;
}

export interface CheckRunnerExecutionContextV2 {
  snapshot_sha256?: string;
  observation_authorities?: readonly CompiledObservationAuthorityV2[];
  process_runtime_closure_identity?: string;
}

export interface CheckExecutionResultV2 {
  internal_id: string;
  outcome_key: string | null;
  check_key: string;
  status: CheckExecutionStatusV2;
  evidence_adapter: EvidenceAdapter;
  execution_identity: string;
  assertion_results: AssertionResultV2[];
  observations: Record<string, unknown>;
  evidence_records: EvidenceCapabilityRecordV2[];
  artifact_hashes: Record<string, string>;
  claim_proofs: ClaimProofV2[];
  findings: LongTaskFindingV2[];
  attempts: number;
  duration_ms: number;
}

export interface ProgressRecordV2 {
  schema_version: "long-task-progress-record-v2";
  compiled_identity: string;
  outcome_authority_hash: string;
  check_identity: string;
  check_internal_id: string;
  outcome_key: string | null;
  check_key: string;
  runner_verifier_identity: string;
  relevant_context_identity: string;
  resolved_input_path_hashes: Record<string, string>;
  binding_carrier_path_hashes: Record<string, string>;
  dependency_interface_identities: Record<string, string>;
  result: CheckExecutionStatusV2;
  check_result: CheckExecutionResultV2;
  findings: LongTaskFindingV2[];
  completed_at: string;
}

export type StrictRiskObligationV2 = {
  outcome_key: string;
  risk_fact: RiskFactName;
  obligations: string[];
};
