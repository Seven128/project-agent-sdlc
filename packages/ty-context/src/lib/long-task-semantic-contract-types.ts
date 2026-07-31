import type { ExecutionTargetCapabilityV2 } from "./execution-target-capabilities.js";

export type { ExecutionTargetCapabilityV2 } from "./execution-target-capabilities.js";

export interface KeyedStatementV2 {
  key: string;
  statement: string;
}

export interface ApplicableKeyedStatementV2 extends KeyedStatementV2 {
  applicability_refs: string[];
}

export type ExternalConfirmationKindV2 =
  | "functional_prerequisite"
  | "field_validation"
  | "production_release_gate"
  | "commercial_activation"
  | "expert_authority";

export type TargetCompletionStateV2 =
  | "implementation_complete"
  | "target_profile_usable"
  | "production_release_ready";

export type ExecutionTargetRuntimeFamilyV2 =
  "browser" | "native" | "desktop" | "service" | "process" | "external";

export interface TargetProfileV2 {
  key: string;
  description: string;
  required_state: TargetCompletionStateV2;
  required_target_refs: string[];
}

export interface ExecutionTargetV2 {
  key: string;
  description: string;
  role: "product" | "support" | "observer";
  runtime_family: ExecutionTargetRuntimeFamilyV2;
  root_entrypoint: string;
  capabilities: ExecutionTargetCapabilityV2[];
}

export interface DeliveryStageV2 {
  key: string;
  title: string;
  depends_on: string[];
  gate_outcome: string;
}

export type DeliveryJourneyRoleV2 =
  "success" | "degradation" | "recovery" | "stage_gate" | "conformance";

export interface ClaimApplicabilityV2 {
  key: string;
  target_ref: string;
  journey_role: DeliveryJourneyRoleV2;
  dimensions: Array<{ key: string; value: string }>;
  given_refs: string[];
  when_refs: string[];
}

export type EvidenceCapabilityV2 =
  | "presence"
  | "interaction_trace"
  | "state_delta"
  | "cross_surface_consistency"
  | "durable_readback"
  | "boundary_invocation"
  | "external_side_effect"
  | "failure_injection"
  | "visual_render"
  | "design_conformance"
  | "design_method"
  | "design_symbolic_certificate"
  | "semantic_fact"
  | "target_runtime"
  | "input_variation";

export interface CheckExecutionTargetV2 {
  target_ref: string;
  entrypoint: "root" | "internal";
}

export interface DeliveryScenarioV2 {
  given: KeyedStatementV2[];
  when: KeyedStatementV2[];
}
