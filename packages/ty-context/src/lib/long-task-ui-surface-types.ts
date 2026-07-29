import type { DesignResourceVerificationMethod } from "./design-resource-handoff-types.js";
import type {
  DesignResourceComparator,
  DesignResourceLocatedDigestV1,
} from "./design-resource-fact-manifest-types.js";
import type { ExecutionTargetCapabilityV2 } from "./execution-target-capabilities.js";

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
