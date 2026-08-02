import {
  DESIGN_RESOURCE_EVIDENCE_BY_METHOD,
  DESIGN_RESOURCE_EVIDENCE_BY_DIMENSION,
  DESIGN_RESOURCE_METHODS_BY_DIMENSION,
} from "./design-resource-handoff-policy.js";
import type {
  DesignResourceDimension,
  DesignResourceEvidenceKind,
  DesignResourceVerificationMethod,
} from "./design-resource-handoff-types.js";
import type {
  DesignResourceComparator,
  DesignResourceInspectorCapability,
  DesignResourceOracleCapability,
} from "./design-resource-fact-manifest-types.js";

export const DESIGN_RESOURCE_FACT_INVARIANTS = Object.freeze({
  complete_observable_design_fact_delivery: true,
  resource_fact_inventory_closure_required: true,
  exact_target_visual_pixel_required: true,
  exact_fact_set_conservation_required: true,
  design_fact_expression_boundary: true,
  unsupported_design_fact_blocks: true,
  control_granularity_is_not_design_fact_granularity: true,
  public_design_fact_guidance_required: true,
  design_fact_values_stay_in_canonical_resources: true,
  no_second_design_fact_authority: true,
  fact_inventory_required: true,
  contract_evidence_fact_binding_required: true,
  authoring_obligation_universe_precedes_generation: true,
  frozen_inspector_census_required: true,
  first_class_condition_variation_property_axes_required: true,
  atomic_fact_cell_identity_required: true,
  expected_canonical_handoff_fact_universe_equality_required: true,
  aggregate_state_or_condition_labels_forbidden: true,
  complete_generation_without_sampling_or_truncation_required: true,
  fact_identity_and_proof_method_obligation_separation_required: true,
  property_required_methods_cannot_be_weakened: true,
  design_system_effective_value_lineage_required: true,
  dynamic_relation_and_asset_fact_closure_required: true,
  per_fact_expected_comparison_authority_required: true,
  per_fact_current_result_required: true,
  protected_fact_observation_redaction_required: true,
  selected_design_fact_antidegradation_required: true,
  design_fact_distribution_context_cost: true,
  forbidden_design_fact_shortcuts_absent: true,
  preflight_is_not_production_conformance: true,
  unsupported_facts_block: true,
  control_relations_unchanged: true,
} as const);

export const EXACT_TARGET_FULL_TARGET_METHODS = [
  "layout_geometry",
  "visual_pixel",
] as const satisfies readonly DesignResourceVerificationMethod[];

const STANDARD_COMPARATORS_BY_METHOD: Record<
  DesignResourceVerificationMethod,
  readonly DesignResourceComparator[]
> = {
  layout_geometry: ["exact_value", "numeric_delta", "geometry_delta"],
  visual_pixel: ["pixel_diff"],
  design_token: ["token_resolution"],
  content: ["exact_value", "content_equal"],
  component_state: ["exact_value", "state_equal"],
  interaction_trace: ["trace_equal", "state_equal"],
  motion_timeline: ["timeline_equal", "trace_equal"],
  responsive_reflow: ["reflow_equal", "geometry_delta"],
  input_method: ["state_equal", "trace_equal"],
  accessibility_semantics: ["semantic_equal", "state_equal"],
  accessibility_navigation: ["semantic_equal", "trace_equal"],
  accessibility_visual: ["pixel_diff", "semantic_equal"],
  gesture_trace: ["trace_equal"],
  scroll_navigation: ["trace_equal"],
  localization: ["content_equal", "semantic_equal"],
  system_ui: ["semantic_equal", "state_equal", "pixel_diff"],
  haptic_feedback: ["timeline_equal", "trace_equal"],
  sound_feedback: ["timeline_equal", "trace_equal"],
  asset_integrity: ["asset_equal"],
};

const ORACLE_CAPABILITIES_BY_METHOD: Record<
  DesignResourceVerificationMethod,
  readonly DesignResourceInspectorCapability[]
> = {
  layout_geometry: [
    "geometry_measurement",
    "component_anatomy",
    "css_cascade",
    "relations",
  ],
  visual_pixel: ["render_capture", "css_cascade", "html_dom", "system_ui"],
  design_token: ["design_tokens"],
  content: ["html_dom", "localization"],
  component_state: ["component_anatomy", "prototype_transitions"],
  interaction_trace: ["prototype_transitions", "input_rules"],
  motion_timeline: ["motion", "prototype_transitions"],
  responsive_reflow: ["responsive_rules", "geometry_measurement"],
  input_method: ["input_rules"],
  accessibility_semantics: ["accessibility"],
  accessibility_navigation: ["accessibility", "input_rules"],
  accessibility_visual: ["accessibility", "render_capture"],
  gesture_trace: ["input_rules", "prototype_transitions"],
  scroll_navigation: ["input_rules", "prototype_transitions"],
  localization: ["localization"],
  system_ui: ["system_ui"],
  haptic_feedback: ["haptics"],
  sound_feedback: ["audio"],
  asset_integrity: ["assets"],
};

export function assertDesignResourceFactPolicyEnabled(): void {
  if (
    Object.values(DESIGN_RESOURCE_FACT_INVARIANTS).some(
      (enabled) => enabled !== true,
    )
  )
    throw new Error("design_resource_fact_policy_disabled");
}

export function designFactMethodIsCompatible(
  dimension: DesignResourceDimension,
  method: DesignResourceVerificationMethod,
): boolean {
  return DESIGN_RESOURCE_METHODS_BY_DIMENSION[dimension].includes(method);
}

export function designFactEvidenceIsCompatible(
  dimension: DesignResourceDimension,
  kind: DesignResourceEvidenceKind,
): boolean {
  return DESIGN_RESOURCE_EVIDENCE_BY_DIMENSION[dimension].includes(kind);
}

export function designFactEvidenceSupportsMethod(
  method: DesignResourceVerificationMethod,
  kind: DesignResourceEvidenceKind,
): boolean {
  return DESIGN_RESOURCE_EVIDENCE_BY_METHOD[method].includes(kind);
}

export function designFactComparatorSupportsMethod(
  method: DesignResourceVerificationMethod,
  comparator: string,
): boolean {
  return (
    comparator.startsWith("custom.") ||
    STANDARD_COMPARATORS_BY_METHOD[method].includes(
      comparator as DesignResourceComparator,
    )
  );
}

export function designFactOracleSupportsMethod(
  method: DesignResourceVerificationMethod,
  capabilities: readonly DesignResourceOracleCapability[],
): boolean {
  return ORACLE_CAPABILITIES_BY_METHOD[method].some((capability) =>
    capabilities.includes(capability),
  );
}
