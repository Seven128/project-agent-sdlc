import type { EvidenceCapabilityV2 } from "./long-task-semantic-contract-types.js";
import type { DesignResourceVerificationMethod } from "./design-resource-handoff-types.js";
import type {
  DesignResourceComparator,
  DesignResourceLocatedDigestV1,
} from "./design-resource-fact-manifest-types.js";

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

export interface DesignMethodEvidenceV2 extends EvidenceRecordBaseV2 {
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
  | TargetRuntimeEvidenceV2
  | InputVariationEvidenceV2;
