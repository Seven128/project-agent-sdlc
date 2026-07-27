import type { ExecutionTargetCapabilityV2 } from "./execution-target-capabilities.js";

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
  "asset_integrity",
] as const;

export type DesignResourceVerificationMethod =
  (typeof DESIGN_RESOURCE_VERIFICATION_METHODS)[number];

export const DESIGN_RESOURCE_LOCATOR_KINDS = [
  "html_selector",
  "markdown_anchor",
  "json_pointer",
  "css_selector",
  "css_custom_property",
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
  resources: DesignResourceHandoffResourceV1[];
  conditions: DesignResourceHandoffConditionV1[];
  subjects: DesignResourceHandoffSubjectV1[];
  targets: DesignResourceHandoffTargetV1[];
  evidence: DesignResourceHandoffEvidenceV1[];
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
  viewport: {
    width: number;
    height: number;
    unit: "px";
  };
  modes: string[];
  states: string[];
  content_cases: string[];
  input_methods: string[];
  motion: "full" | "reduced" | "not_applicable";
}

export interface DesignResourceHandoffSubjectV1 {
  key: string;
  kind:
    | "surface"
    | "flow"
    | "region"
    | "component_family"
    | "control"
    | "state"
    | "asset";
  stable_keys: string[];
  target_refs: string[];
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

export interface DesignResourceHandoffCoverageV1 {
  key: string;
  subject_refs: string[];
  dimension: DesignResourceDimension;
  disposition: DesignResourceCoverageDisposition;
  target_refs: string[];
  condition_refs: string[];
  evidence_refs: string[];
  source_item_refs: string[];
  verification_methods: DesignResourceVerificationMethod[];
  rationale: string;
}

export interface DesignResourceHandoffBlockerV1 {
  key: string;
  target_refs: string[];
  subject_refs: string[];
  dimensions: DesignResourceDimension[];
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
  resource_hashes: Record<string, string>;
  counts: {
    resources: number;
    conditions: number;
    subjects: number;
    targets: number;
    evidence: number;
    coverage: number;
    acceptance_blockers: number;
  };
}
