import type {
  DesignResourceCoverageDisposition,
  DesignResourceDimension,
  DesignResourceLocatorKind,
  DesignResourceVerificationMethod,
} from "./design-resource-handoff-types.js";
import type {
  DesignResourceComparator,
  DesignResourceInspectorCapability,
  DesignResourceLineageNodeKind,
  DesignResourcePropertyFamily,
  DesignResourceStandardConditionAxis,
  DesignResourceSubjectKind,
  DesignResourceSubjectPresenceKind,
  DesignResourceValueKind,
  DesignResourceVariationAxis,
} from "./design-resource-fact-enums.js";

export interface DesignResourceTypedLocatorV1 {
  resource_ref: string;
  kind: DesignResourceLocatorKind;
  value: string;
}

export interface DesignResourceLocatedDigestV1 {
  locator: DesignResourceTypedLocatorV1;
  sha256: string;
}

export interface DesignResourceAxisValueV1 {
  key: string;
  census_refs: string[];
}

export interface DesignResourceAxisDispositionV1 {
  key: string;
  target_ref: string;
  axis: DesignResourceStandardConditionAxis | string;
  disposition: "applicable" | "not_applicable";
  values: DesignResourceAxisValueV1[];
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface DesignResourceConditionCombinationDispositionV1 {
  key: string;
  target_ref: string;
  axis_values: Array<{
    axis_ref: string;
    value_ref: string;
  }>;
  disposition: Exclude<DesignResourceCoverageDisposition, "covered">;
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface DesignResourceVariationAxisDispositionV1 {
  key: string;
  subject_ref: string;
  axis: DesignResourceVariationAxis;
  disposition: "applicable" | "not_applicable";
  values: DesignResourceAxisValueV1[];
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface DesignResourceVariationCombinationDispositionV1 {
  key: string;
  subject_ref: string;
  axis_values: Array<{
    axis_ref: DesignResourceVariationAxis;
    value_ref: string;
  }>;
  disposition: Exclude<DesignResourceCoverageDisposition, "covered">;
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface DesignResourceSubjectVariationV1 {
  key: string;
  subject_ref: string;
  variant: string;
  state: string;
  interaction_phase: string;
  presence_phase: string;
  instance_case: string;
}

export interface DesignResourceRelationEndpointV1 {
  role: string;
  subject_ref: string;
}

export interface DesignResourcePropertyDefinitionV1 {
  key: string;
  family: DesignResourcePropertyFamily;
  dimension: DesignResourceDimension;
  value_kind: DesignResourceValueKind;
  required_methods: DesignResourceVerificationMethod[];
  standard: boolean;
  inspector_capability_refs: DesignResourceInspectorCapability[];
  census_refs: string[];
}

export interface DesignResourceFactCellV1 {
  key: string;
  subject_ref: string;
  target_ref: string;
  condition_ref: string;
  variation_ref: string;
  property_ref: string;
  disposition: DesignResourceCoverageDisposition;
  fact_ref: string | null;
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface DesignResourceFactLineageV1 {
  design_system_ref: string | null;
  token_chain_refs: string[];
  override_chain_refs: string[];
  resolved_value: DesignResourceLocatedDigestV1;
  conflict_status: "none" | "resolved";
  conflict_resolution: string;
}

export interface DesignResourceLineageNodeV1 {
  key: string;
  kind: DesignResourceLineageNodeKind;
  predecessor_refs: string[];
  value: DesignResourceLocatedDigestV1;
  census_refs: string[];
}

export interface DesignResourceFactV1 {
  key: string;
  cell_ref: string;
  subject_ref: string;
  target_ref: string;
  condition_ref: string;
  variation_ref: string;
  property_ref: string;
  dimension: DesignResourceDimension;
  observation_scope: "subject" | "full_target";
  observation_sensitivity: "plain" | "protected";
  value_kind: DesignResourceValueKind;
  value: DesignResourceLocatedDigestV1;
  evidence_refs: string[];
  source_item_refs: string[];
  lineage: DesignResourceFactLineageV1;
}

export interface DesignResourceOracleV1 {
  key: string;
  trust: "frozen_executable" | "named_external_tcb";
  identity: string;
  version: string;
  sha256: string | null;
  capability_refs: DesignResourceInspectorCapability[];
}

export interface DesignResourceEnvironmentV1 {
  key: string;
  identity: string;
  definition: DesignResourceLocatedDigestV1;
}

export interface DesignResourceProofObligationV1 {
  key: string;
  fact_ref: string;
  method: DesignResourceVerificationMethod;
  comparison: {
    comparator: DesignResourceComparator | string;
    mode: "exact" | "tolerance";
    parameters: DesignResourceLocatedDigestV1;
    tolerance: DesignResourceLocatedDigestV1 | null;
    mask: DesignResourceLocatedDigestV1 | null;
  };
  oracle_ref: string;
  environment_ref: string;
}

export interface DesignResourceAssetBindingV1 {
  key: string;
  asset_subject_ref: string;
  resource_ref: string;
  target_refs: string[];
  condition_refs: string[];
  fact_refs: string[];
  consumer_subject_refs: string[];
}

export type { DesignResourceSubjectKind, DesignResourceSubjectPresenceKind };
