import type { DesignResourceVerificationMethod } from "./design-resource-handoff-types.js";
import type {
  DesignResourceComparator,
  DesignResourceLocatedDigestV1,
} from "./design-resource-fact-manifest-types.js";
import type { ExecutionTargetCapabilityV2 } from "./execution-target-capabilities.js";
import type { SymbolicExtensionalPointV1 } from "./symbolic-denotation-types.js";

export type DesignTargetInterpretationV2 = "exact_target" | "constraint";

export interface DeliveryDesignFactExpectationV2 {
  fact_ref: string;
  subject_ref: string;
  variation_ref: string;
  property_ref: string;
  observation_sensitivity: "plain" | "protected";
  expected: DesignResourceLocatedDigestV1;
  comparison: {
    comparator: DesignResourceComparator | string;
    mode: "exact" | "tolerance";
    parameters: DesignResourceLocatedDigestV1;
    tolerance: DesignResourceLocatedDigestV1 | null;
    mask: DesignResourceLocatedDigestV1 | null;
  };
  oracle: {
    key: string;
    trust: "frozen_executable" | "named_external_tcb";
    identity: string;
    version: string;
    sha256: string | null;
  };
  environment: {
    key: string;
    identity: string;
    definition: DesignResourceLocatedDigestV1;
  };
}

export interface DeliveryDesignVerificationBindingV2 {
  method: DesignResourceVerificationMethod;
  assertion_ref: string;
  evidence_artifacts: Array<{
    condition_key: string;
    path: string;
    observation_path: string;
    fact_refs: string[];
    fact_expectations: DeliveryDesignFactExpectationV2[];
  }>;
}

export interface DeliveryDesignSymbolicRuleExpectationV2 {
  obligation_ref: string;
  fact_rule_ref: string;
  region_sha256: string;
  subject_or_relation_ref: string;
  property_ref: string;
  population_ref: string | null;
  quantifier: SymbolicExtensionalPointV1["quantifier"];
  observation_sensitivity: "plain" | "protected";
  expected: DesignResourceLocatedDigestV1;
  proof_surface: string;
  observation_boundary: string;
  comparison: DeliveryDesignFactExpectationV2["comparison"];
  oracle: DeliveryDesignFactExpectationV2["oracle"];
  environment: DeliveryDesignFactExpectationV2["environment"];
  protected_value_policy: string;
  completion_effect: string;
}

export interface DeliveryDesignSymbolicVerificationBindingV2 {
  method: DesignResourceVerificationMethod;
  assertion_ref: string;
  artifact_path: string;
  observation_path: string;
  rule_expectations: DeliveryDesignSymbolicRuleExpectationV2[];
}

export interface DeliveryDesignSymbolicCertificateExpectationV2 {
  certificate_ref: string;
  fact_rule_refs: string[];
  omitted_axis_refs: string[];
  dependency_edge_refs: string[];
  canonical_rule_dag_sha256: string;
}

export interface DeliveryDesignSymbolicCertificateBindingV2 {
  assertion_ref: string;
  artifact_path: string;
  expectations: DeliveryDesignSymbolicCertificateExpectationV2[];
  metrics: {
    semantic_obligations: number;
    certificate_obligations: number;
    certificate_covered_omitted_axes: number;
    certificate_covered_dependency_edges: number;
    canonical_dag_nodes: number;
    canonical_partition_edges: number;
    canonical_bytes: number;
    theoretical_ground_cardinality: string;
  };
}

export interface DeliveryDesignTargetV2 {
  key: string;
  fact_model?: "symbolic_rules_v2";
  interpretation: DesignTargetInterpretationV2;
  source_paths: string[];
  condition_keys: string[];
  claim_refs: string[];
  conformance_check_ref: string;
  conformance_assertion_ref: string;
  verification_method_bindings: DeliveryDesignVerificationBindingV2[];
  symbolic_method_bindings?: DeliveryDesignSymbolicVerificationBindingV2[];
  symbolic_certificate_binding?: DeliveryDesignSymbolicCertificateBindingV2;
  actual_artifact_path: string;
  comparison_artifact_path: string;
}

export type DesignAcceptanceBlockerStatusV2 =
  "machine_claim" | "external_confirmation";

export interface DeliveryDesignAcceptanceBlockerV2 {
  key: string;
  status: DesignAcceptanceBlockerStatusV2;
  refs: string[];
  source_item_refs: string[];
  verification_methods: DesignResourceVerificationMethod[];
  required_capabilities: ExecutionTargetCapabilityV2[];
  rationale: string;
}

export interface DeliverySurfaceBindingV2 {
  key: string;
  surface_ref: string;
  target_ref: string;
  control_refs: string[];
  route_binding_ref: string;
  component_binding_refs: string[];
  root_journey_check_ref: string;
  entry_action_ref: string;
  design_targets: DeliveryDesignTargetV2[];
  acceptance_blockers: DeliveryDesignAcceptanceBlockerV2[];
}

export interface CompiledDesignTargetV2 extends DeliveryDesignTargetV2 {
  surface_binding_ref: string;
  surface_ref: string;
  target_ref: string;
}
