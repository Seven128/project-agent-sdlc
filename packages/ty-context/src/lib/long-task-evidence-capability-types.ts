import type { EvidenceCapabilityV2 } from "./long-task-semantic-contract-types.js";
import type { DesignResourceVerificationMethod } from "./design-resource-handoff-types.js";

interface EvidenceRecordBaseV2 {
  assertion_key: string;
  capability: EvidenceCapabilityV2;
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
  | TargetRuntimeEvidenceV2
  | InputVariationEvidenceV2;
