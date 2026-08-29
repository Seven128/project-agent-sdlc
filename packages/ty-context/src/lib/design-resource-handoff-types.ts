import type { ExecutionTargetCapabilityV2 } from "./execution-target-capabilities.js";
import type {
  DesignResourceAssetBindingV1,
  DesignResourceAxisDispositionV1,
  DesignResourceConditionCombinationDispositionV1,
  DesignResourceEnvironmentV1,
  DesignResourceFactCellV1,
  DesignResourceFactV1,
  DesignResourceLineageNodeV1,
  DesignResourceManifestCollectionName,
  DesignResourceOracleV1,
  DesignResourcePropertyDefinitionV1,
  DesignResourceProofObligationV1,
  DesignResourceRelationEndpointV1,
  DesignResourceSubjectKind,
  DesignResourceSubjectPresenceKind,
  DesignResourceSubjectVariationV1,
  DesignResourceVariationAxisDispositionV1,
  DesignResourceVariationCombinationDispositionV1,
} from "./design-resource-fact-manifest-types.js";
import type {
  DesignResourceImplementationFeasibilityIdentityV1,
  DesignResourceImplementationFeasibilityV1,
  DesignResourceTechnicalFeasibilityInputV1,
} from "./design-resource-implementation-feasibility-types.js";
import type {
  DesignAuthorityHandoffBinding,
  DesignAuthorityHandoffResolution,
} from "./design-authority-types.js";

export const DESIGN_RESOURCE_DIMENSIONS = [
  "surface_flow",
  "visual_content",
  "component_control",
  "state_interaction",
  "motion",
  "adaptation_input",
  "accessibility",
  "assets",
] as const;

export type DesignResourceDimension =
  (typeof DESIGN_RESOURCE_DIMENSIONS)[number];

export const DESIGN_RESOURCE_EVIDENCE_KINDS = [
  "frame",
  "component_variant",
  "prototype_state",
  "prototype_transition",
  "motion_spec",
  "motion_capture",
  "responsive_spec",
  "input_spec",
  "accessibility_spec",
  "semantic_tree",
  "token_spec",
  "asset",
  "annotation",
  "localization_spec",
  "system_ui_spec",
  "haptic_spec",
  "sound_spec",
  "sound_capture",
  "render_environment",
  "relation_spec",
] as const;

export type DesignResourceEvidenceKind =
  (typeof DESIGN_RESOURCE_EVIDENCE_KINDS)[number];

export const DESIGN_RESOURCE_VERIFICATION_METHODS = [
  "layout_geometry",
  "visual_pixel",
  "design_token",
  "content",
  "component_state",
  "interaction_trace",
  "motion_timeline",
  "responsive_reflow",
  "input_method",
  "accessibility_semantics",
  "accessibility_navigation",
  "accessibility_visual",
  "gesture_trace",
  "scroll_navigation",
  "localization",
  "system_ui",
  "haptic_feedback",
  "sound_feedback",
  "asset_integrity",
] as const;

export type DesignResourceVerificationMethod =
  (typeof DESIGN_RESOURCE_VERIFICATION_METHODS)[number];

export const DESIGN_RESOURCE_LOCATOR_KINDS = [
  "html_selector",
  "html_inner_html",
  "markdown_anchor",
  "json_pointer",
  "css_selector",
  "css_custom_property",
  "html_attribute",
  "css_declaration",
  "javascript_export",
  "svg_selector",
  "svg_inner_xml",
  "svg_attribute",
  "whole_resource",
] as const;

export type DesignResourceLocatorKind =
  (typeof DESIGN_RESOURCE_LOCATOR_KINDS)[number];

export type DesignResourceSourceProfileKind =
  "implementation_web" | "implementation_app" | "reference";

export type DesignResourceCoverageDisposition =
  | "covered"
  | "not_applicable"
  | "excluded_by_scope"
  | "decision_required"
  | "unavailable";

export interface DesignResourceHandoffV1 {
  schema_version: "design-resource-handoff-v1";
  intent: "implementation_handoff";
  scope: {
    key: string;
    style_dependency: "style-bearing" | "non-fidelity" | "mixed";
    surface_keys: string[];
    necessary_context: string[];
    exclusions: string[];
  };
  provenance: {
    provider: string;
    provider_version: string;
    project: string;
    run: string;
    capability: string;
    agent: string;
    model: string;
    design_system_id: string;
  };
  project_design_authority?: DesignAuthorityHandoffBinding;
  technical_feasibility_inputs: DesignResourceTechnicalFeasibilityInputV1[];
  resources: DesignResourceHandoffResourceV1[];
  axis_dispositions: DesignResourceAxisDispositionV1[];
  condition_exclusions: DesignResourceConditionCombinationDispositionV1[];
  conditions: DesignResourceHandoffConditionV1[];
  subjects: DesignResourceHandoffSubjectV1[];
  variation_axis_dispositions: DesignResourceVariationAxisDispositionV1[];
  variation_exclusions: DesignResourceVariationCombinationDispositionV1[];
  variations: DesignResourceSubjectVariationV1[];
  properties: DesignResourcePropertyDefinitionV1[];
  lineage_nodes: DesignResourceLineageNodeV1[];
  targets: DesignResourceHandoffTargetV1[];
  evidence: DesignResourceHandoffEvidenceV1[];
  fact_cells: DesignResourceFactCellV1[];
  facts: DesignResourceFactV1[];
  proof_obligations: DesignResourceProofObligationV1[];
  oracles: DesignResourceOracleV1[];
  environments: DesignResourceEnvironmentV1[];
  asset_bindings: DesignResourceAssetBindingV1[];
  resource_fact_closure: DesignResourceHandoffResourceFactClosureV1[];
  coverage: DesignResourceHandoffCoverageV1[];
  acceptance_blockers: DesignResourceHandoffBlockerV1[];
  proposal: {
    reconciliation_status: "applied" | "returned" | "not_applicable";
    path: string;
    revision: string;
  };
}

export interface DesignResourceHandoffResourceV1 {
  key: string;
  role: "exact_target" | "constraint" | "supporting";
  path: string;
  media_type: string;
  sha256: string;
  editable_upstream: {
    owner: string;
    locator: string;
    update_route: string;
  };
}

export interface DesignResourceHandoffConditionV1 {
  key: string;
  platform: string;
  os_version: string;
  device_profile: string;
  form_factor: string;
  viewport: {
    key: string;
    width: number;
    height: number;
    unit: "px";
  };
  orientation: string;
  density: {
    key: string;
    pixel_ratio: number;
  };
  safe_area: {
    key: string;
    top: number;
    right: number;
    bottom: number;
    left: number;
    unit: "px";
  };
  window_state: string;
  fold_state: string;
  display_mode: string;
  color_scheme: string;
  locale: string;
  language: string;
  script: string;
  direction: "ltr" | "rtl" | "not_applicable";
  pseudo_localization: string;
  content_case: string;
  data_case: string;
  text_scale: {
    key: string;
    multiplier: number;
  };
  input_method: string;
  assistive_technology: string;
  motion: string;
  transparency: string;
  contrast: string;
  bold_text: string;
  button_shapes: string;
  system_ui: string;
  ime: string;
  permission: string;
  capability: string;
  connectivity: string;
  lifecycle: string;
  custom_axes: Array<{
    axis_ref: string;
    value_ref: string;
  }>;
}

export interface DesignResourceHandoffSubjectV1 {
  key: string;
  kind: DesignResourceSubjectKind;
  stable_keys: string[];
  target_refs: string[];
  parent_ref: string | null;
  instance_of_ref: string | null;
  slot_key: string | null;
  override_of_ref: string | null;
  family_ref: string | null;
  presence: DesignResourceSubjectPresenceKind;
  presence_rule_ref: string | null;
  population_ref: string | null;
  portal_host_ref: string | null;
  relation_endpoints: DesignResourceRelationEndpointV1[];
  census_refs: string[];
}

export interface DesignResourceHandoffTargetV1 {
  key: string;
  interpretation: "exact_target" | "constraint";
  resource_refs: string[];
  condition_refs: string[];
  source_profile: {
    kind: DesignResourceSourceProfileKind;
    entry_resource_ref: string;
    dependency_resource_refs: string[];
    fact_manifest_resource_ref: string;
    acquisition: "complete";
  };
  selection_basis: string;
}

export interface DesignResourceHandoffEvidenceV1 {
  key: string;
  resource_ref: string;
  kind: DesignResourceEvidenceKind;
  locator: {
    kind: DesignResourceLocatorKind;
    value: string;
  };
  condition_refs: string[];
}

export type DesignResourceHandoffFactV1 = DesignResourceFactV1;

export interface DesignResourceHandoffResourceFactClosureV1 {
  key: string;
  resource_ref: string;
  disposition: "material_with_facts" | "supporting_only";
  fact_refs: string[];
  inspection: {
    status: "complete";
    inspector: string;
  };
  rationale: string;
}

export interface DesignResourceHandoffCoverageV1 {
  key: string;
  subject_refs: string[];
  dimension: DesignResourceDimension;
  disposition: DesignResourceCoverageDisposition;
  target_refs: string[];
  condition_refs: string[];
  variation_refs: string[];
  property_refs: string[];
  evidence_refs: string[];
  fact_cell_refs: string[];
  fact_refs: string[];
  proof_obligation_refs: string[];
  source_item_refs: string[];
  verification_methods: DesignResourceVerificationMethod[];
  rationale: string;
}

export interface DesignResourceHandoffBlockerV1 {
  key: string;
  target_refs: string[];
  subject_refs: string[];
  dimensions: DesignResourceDimension[];
  fact_cell_refs: string[];
  fact_refs: string[];
  proof_obligation_refs: string[];
  source_item_refs: string[];
  verification_methods: DesignResourceVerificationMethod[];
  required_capabilities: ExecutionTargetCapabilityV2[];
  description: string;
}

export interface ParsedDesignResourceHandoffV1 {
  handoff_path: string;
  handoff: DesignResourceHandoffV1;
  source_item_keys: string[];
  source_item_kinds: Record<string, string>;
}

export interface DesignResourceHandoffPreflightV1 extends ParsedDesignResourceHandoffV1 {
  schema_version: "design-resource-handoff-preflight-v1";
  status: "ready";
  project_design_authority_resolution: DesignAuthorityHandoffResolution;
  resource_hashes: Record<string, string>;
  technical_feasibility_documents: DesignResourceImplementationFeasibilityV1[];
  technical_feasibility_identities: DesignResourceImplementationFeasibilityIdentityV1[];
  limitations: string[];
  manifest_identities: Array<{
    resource_ref: string;
    path: string;
    sha256: string;
    scope_key: string;
    target_key: string;
    collections: Array<{
      name: DesignResourceManifestCollectionName;
      expected_count: number;
      identity_sha256: string;
    }>;
  }>;
  counts: {
    resources: number;
    manifests: number;
    axis_dispositions: number;
    conditions: number;
    subjects: number;
    variations: number;
    properties: number;
    lineage_nodes: number;
    targets: number;
    evidence: number;
    fact_cells: number;
    facts: number;
    proof_obligations: number;
    oracles: number;
    environments: number;
    asset_bindings: number;
    resource_fact_closure: number;
    coverage: number;
    acceptance_blockers: number;
  };
}
