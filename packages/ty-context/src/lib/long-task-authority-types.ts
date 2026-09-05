import type {
  DeliveryControlV2,
  DeliveryOutcomeV2,
  ProofSurface,
} from "./long-task-contract-types.js";
import type {
  ClaimApplicabilityV2,
  DeliveryStageV2,
  ExecutionTargetV2,
  TargetProfileV2,
} from "./long-task-semantic-contract-types.js";
import type {
  DeliveryDesignTargetV2,
  DeliverySurfaceBindingV2,
} from "./long-task-ui-surface-types.js";
import type { CompiledSourceItemV2 } from "./long-task-source-authority-types.js";
import type { SemanticFactGlobalBindingsV2 } from "./long-task-semantic-fact-binding-types.js";
import type { WorkspaceManifestV2 } from "./long-task-workspace-runtime-types.js";

export interface AuthorityHashesV2 {
  source_authority_hash: string;
  product_authority_hash: string;
  acceptance_authority_hash: string;
  risk_authority_hash: string;
  technical_authority_hash: string;
}

export interface ProductSemanticProjectionV2 {
  task_goal: string;
  target_profile: TargetProfileV2;
  execution_targets: ExecutionTargetV2[];
  stages: DeliveryStageV2[];
  global_non_goals: Array<{
    key: string;
    statement: string;
    applicability_refs: string[];
  }>;
  outcomes: Array<{
    key: string;
    title: string;
    stage: string;
    applicability: ClaimApplicabilityV2[];
    observable_result: string;
    result_applicability_refs: string[];
    success_path_required: boolean;
    degradation_path_required: boolean;
    owner: {
      label: string;
      owner_surfaces: string[];
    };
    requirements: Array<{
      key: string;
      statement: string;
      required_proof_surfaces: ProofSurface[];
      applicability_refs: string[];
    }>;
    controls: Array<{
      key: string;
      surface: string;
      region: string;
      location: string;
      control_type: string;
      label_content: string;
      user_task: string;
      visibility: string;
      availability: string;
      trigger: string;
      input: string;
      validation: string;
      default_value: string;
      interaction: string;
      navigation_result: string;
      loading_state: string;
      empty_state: string;
      success_state: string;
      failure_state: string;
      recovery: string;
      permission: string;
      feedback: string;
      accessibility: string;
      field_coverage: DeliveryControlV2["field_coverage"];
    }>;
    control_relation_closure: DeliveryOutcomeV2["product"]["control_relation_closure"];
    control_relations: DeliveryOutcomeV2["product"]["control_relations"];
    surface_bindings: Array<
      Omit<DeliverySurfaceBindingV2, "design_targets"> & {
        design_targets: Array<Omit<DeliveryDesignTargetV2, "source_paths">>;
      }
    >;
    non_completing_outcomes: Array<{ key: string; statement: string }>;
  }>;
}

export interface GlobalSemanticProjectionV2 {
  applicability: ClaimApplicabilityV2[];
  semantic_fact_bindings: SemanticFactGlobalBindingsV2 | null;
  constraints: Array<{
    key: string;
    statement: string;
    applicability_refs: string[];
  }>;
  forbidden_shortcuts: Array<{
    key: string;
    statement: string;
    applicability_refs: string[];
  }>;
}

export interface ContextAuthoritySnapshotV2 {
  mode: "referenced" | "full";
  topology_sha256: string;
  files: string[];
  sha256: Record<string, string>;
  controlling_files?: string[];
  supporting_files?: string[];
}

export interface NextAuthorityMaterialsV2 {
  source_hashes: Record<string, string>;
  source_items: CompiledSourceItemV2[];
  context_snapshot: ContextAuthoritySnapshotV2;
  product_semantics: ProductSemanticProjectionV2;
  global_semantics: GlobalSemanticProjectionV2;
  design_semantics: DesignSemanticAuthorityMaterialV2[];
  design_implementation_bindings: DesignImplementationBindingMaterialV2[];
  design_non_binding_contract_sha256: string;
  design_non_binding_source_sha256: string;
}

export interface DesignSemanticAuthorityMaterialV2 {
  target_key: string;
  handoff_identity: string;
  handoff_semantics_sha256: string;
  project_design_authority_sha256: string | null;
  feasibility_semantics_sha256: string | null;
  source_item_semantics_sha256: string;
}

export interface DesignImplementationBindingMaterialV2 {
  target_key: string;
  handoff_path: string;
  binding_paths: string[];
  target_source_paths: string[];
  technical_feasibility_inputs: unknown[];
  technical_feasibility_identities: unknown[];
  technical_source_records: unknown[];
  route_binding: unknown;
  component_bindings: unknown[];
}

export interface AuthorityMaterialHashesV2 {
  source_hashes_sha256: string;
  context_snapshot_sha256: string;
  product_semantics_sha256: string;
  global_semantics_sha256: string;
  design_semantics_sha256: string;
  design_implementation_bindings_sha256: string;
  design_non_binding_contract_sha256: string;
  design_non_binding_source_sha256: string;
}

export interface InitialTaskBaseV2 {
  git_commit: string;
  git_tree: string;
  workspace_manifest: WorkspaceManifestV2;
}

export interface VerifierContentAuthority {
  package_name: string;
  bundle_sha256: string;
  schema_sha256: string;
  hook_sha256: string;
  bundle_files: Record<string, string>;
}

export interface VerifierRuntimeLocator {
  package_version: string;
  package_root: string;
}

export interface VerifierIdentityV2
  extends VerifierContentAuthority, VerifierRuntimeLocator {
  package_name: "project-tiny-context-harness";
}
