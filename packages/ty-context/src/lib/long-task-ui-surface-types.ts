import type { DesignResourceVerificationMethod } from "./design-resource-handoff-types.js";
import type { ExecutionTargetCapabilityV2 } from "./execution-target-capabilities.js";

export type DesignTargetInterpretationV2 = "exact_target" | "constraint";

export interface DeliveryDesignVerificationBindingV2 {
  method: DesignResourceVerificationMethod;
  assertion_ref: string;
  evidence_artifacts: Array<{
    condition_key: string;
    path: string;
    observation_path: string;
    fact_refs: string[];
  }>;
}

export interface DeliveryDesignTargetV2 {
  key: string;
  interpretation: DesignTargetInterpretationV2;
  source_paths: string[];
  condition_keys: string[];
  claim_refs: string[];
  conformance_check_ref: string;
  conformance_assertion_ref: string;
  verification_method_bindings: DeliveryDesignVerificationBindingV2[];
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
