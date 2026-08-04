import type { EvidenceCapabilityV2 } from "./long-task-semantic-contract-types.js";
import type { DesignResourceVerificationMethod } from "./design-resource-handoff-types.js";
import type {
  DesignResourceComparator,
  DesignResourceLocatedDigestV1,
} from "./design-resource-fact-manifest-types.js";
import type {
  SemanticFactEnvironmentV1,
  SemanticFactLocatedValueV1,
  SemanticFactOracleV1,
} from "./semantic-fact-types.js";

interface EvidenceRecordBaseV2 {
  assertion_key: string;
  capability: EvidenceCapabilityV2;
}

export interface DesignEvidenceLocatorV2 {
  kind:
    | "json_pointer"
    | "image_region"
    | "semantic_node"
    | "trace_event"
    | "timeline_sample"
    | "asset_ref"
    | "custom";
  value: string;
}

export interface InteractionTraceEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "interaction_trace";
  target_ref: string;
  given_keys: string[];
  action_keys: string[];
}

export interface StateDeltaEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "state_delta";
  before_sha256: string;
  after_sha256: string;
  changed_fields: string[];
}

export interface CrossSurfaceConsistencyEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "cross_surface_consistency";
  surfaces: Array<{
    surface_ref: string;
    target_ref: string;
    state_sha256: string;
  }>;
}

export interface DurableReadbackEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "durable_readback";
  write_session_id: string;
  read_session_id: string;
  written_sha256: string;
  read_sha256: string;
}

export interface BoundaryInvocationEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "boundary_invocation";
  boundary: string;
  invocation_id: string;
  request_sha256: string;
  observer_target_ref: string;
}

export interface ExternalSideEffectEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "external_side_effect";
  boundary: string;
  effect_id: string;
  effect_sha256: string;
  observer_target_ref: string;
}

export interface FailureInjectionEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "failure_injection";
  fault: string;
  failure_observed: true;
  recovery_state_sha256: string;
}

export interface VisualRenderEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "visual_render";
  artifact_path: string;
  artifact_sha256: string;
}

export interface DesignConformanceEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "design_conformance";
  design_target_ref: string;
  target_ref: string;
  condition_keys: string[];
  actual_artifact_path: string;
  comparison_artifact_path: string;
}

export interface TargetRuntimeEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "target_runtime";
  target_ref: string;
  root_entrypoint: string;
  session_id: string;
  cold_start: boolean;
}

export interface DesignGroundMethodEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "design_method";
  design_target_ref: string;
  target_ref: string;
  method: DesignResourceVerificationMethod;
  cells: Array<{
    condition_key: string;
    artifact_path: string;
    observation_artifact_path: string;
    fact_refs: string[];
    fact_results: DesignFactResultV2[];
  }>;
}

export interface DesignFactResultV2 {
  fact_ref: string;
  subject_ref: string;
  variation_ref: string;
  property_ref: string;
  actual_observation: {
    artifact_path: string;
    artifact_sha256: string;
    locator: DesignEvidenceLocatorV2;
    value_sha256: string;
    sensitivity: "plain" | "protected";
    redaction: {
      policy_ref: string;
      representation: "digest_only" | "redacted_structured";
      raw_persisted: false;
    } | null;
  };
  actual_environment: {
    artifact_path: string;
    artifact_sha256: string;
    locator: DesignEvidenceLocatorV2;
    value_sha256: string;
  };
  expected: DesignResourceLocatedDigestV1;
  comparison: {
    artifact_path: string;
    artifact_sha256: string;
    locator: DesignEvidenceLocatorV2;
    result_sha256: string;
    comparator: DesignResourceComparator | string;
    mode: "exact" | "tolerance";
    parameters: DesignResourceLocatedDigestV1;
    tolerance: DesignResourceLocatedDigestV1 | null;
    mask: DesignResourceLocatedDigestV1 | null;
    passed: boolean;
  };
  verdict: "passed" | "failed";
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

export interface DesignSymbolicMethodEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "design_method";
  fact_model: "symbolic_rules_v2";
  design_target_ref: string;
  target_ref: string;
  method: DesignResourceVerificationMethod;
  artifact_path: string;
  observation_artifact_path: string;
  rule_results: DesignSymbolicRuleResultV2[];
}

export interface DesignSymbolicRuleResultV2 {
  obligation_ref: string;
  fact_rule_ref: string;
  region_sha256: string;
  subject_or_relation_ref: string;
  property_ref: string;
  population_ref: string | null;
  quantifier: {
    kind:
      | "one"
      | "all"
      | "any"
      | "none"
      | "exactly"
      | "at_least"
      | "at_most"
      | "range";
    minimum: number | null;
    maximum: number | null;
  };
  actual_observation: DesignFactResultV2["actual_observation"];
  actual_environment: DesignFactResultV2["actual_environment"];
  observation_sensitivity: "plain" | "protected";
  expected: DesignResourceLocatedDigestV1;
  proof_surface: string;
  observation_boundary: string;
  comparison: DesignFactResultV2["comparison"];
  verdict: "passed" | "failed";
  oracle: DesignFactResultV2["oracle"];
  environment: DesignFactResultV2["environment"];
  protected_value_policy: string;
  completion_effect: string;
}

export type DesignMethodEvidenceV2 =
  DesignGroundMethodEvidenceV2 | DesignSymbolicMethodEvidenceV2;

export interface DesignSymbolicCertificateEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "design_symbolic_certificate";
  design_target_ref: string;
  target_ref: string;
  artifact_path: string;
  artifact_sha256: string;
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
  certificate_results: Array<{
    certificate_ref: string;
    fact_rule_refs: string[];
    omitted_axis_refs: string[];
    dependency_edge_refs: string[];
    canonical_rule_dag_sha256: string;
    source_noninterference_proof_sha256?: string;
    production_noninterference_proof_sha256?: string;
    recomputed: true;
    verdict: "passed" | "failed";
  }>;
}

export interface SemanticFactEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "semantic_fact";
  manifest_ref: string;
  manifest_sha256: string;
  outcome_ref: string;
  target_ref: string;
  fact_ref: string;
  proof_ref: string;
  method: string;
  subject_ref: string;
  condition_ref: string;
  property_ref: string;
  actual_observation: {
    artifact_path: string;
    artifact_sha256: string;
    locator: DesignEvidenceLocatorV2;
    value_sha256: string;
    sensitivity: "plain" | "protected";
    redaction: {
      policy_ref: string;
      representation: "digest_only" | "redacted_structured";
      raw_persisted: false;
    } | null;
  };
  actual_environment: {
    artifact_path: string;
    artifact_sha256: string;
    locator: DesignEvidenceLocatorV2;
    value_sha256: string;
  };
  expected: SemanticFactLocatedValueV1;
  comparison: {
    artifact_path: string;
    artifact_sha256: string;
    locator: DesignEvidenceLocatorV2;
    result_sha256: string;
    comparator: string;
    mode: "exact" | "tolerance";
    parameters: SemanticFactLocatedValueV1;
    tolerance: SemanticFactLocatedValueV1 | null;
    mask: SemanticFactLocatedValueV1 | null;
    passed: boolean;
  };
  verdict: "passed" | "failed";
  oracle: SemanticFactOracleV1;
  environment: SemanticFactEnvironmentV1;
  observer_results: Array<{
    target_ref: string;
    artifact_path: string;
    artifact_sha256: string;
    locator: DesignEvidenceLocatorV2;
    value_sha256: string;
    comparison_result_sha256: string;
    passed: boolean;
  }>;
}

export interface InputVariationEvidenceV2 extends EvidenceRecordBaseV2 {
  capability: "input_variation";
  cases: Array<{ input_sha256: string; output_sha256: string }>;
  failure_case_observed: boolean;
}

export type EvidenceCapabilityRecordV2 =
  | InteractionTraceEvidenceV2
  | StateDeltaEvidenceV2
  | CrossSurfaceConsistencyEvidenceV2
  | DurableReadbackEvidenceV2
  | BoundaryInvocationEvidenceV2
  | ExternalSideEffectEvidenceV2
  | FailureInjectionEvidenceV2
  | VisualRenderEvidenceV2
  | DesignConformanceEvidenceV2
  | DesignMethodEvidenceV2
  | DesignSymbolicCertificateEvidenceV2
  | SemanticFactEvidenceV2
  | TargetRuntimeEvidenceV2
  | InputVariationEvidenceV2;
