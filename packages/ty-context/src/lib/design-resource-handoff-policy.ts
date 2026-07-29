import type {
  DesignResourceDimension,
  DesignResourceEvidenceKind,
  DesignResourceVerificationMethod,
} from "./design-resource-handoff-types.js";

export const DESIGN_RESOURCE_EVIDENCE_BY_DIMENSION: Record<
  DesignResourceDimension,
  readonly DesignResourceEvidenceKind[]
> = {
  surface_flow: [
    "frame",
    "prototype_state",
    "prototype_transition",
    "relation_spec",
    "annotation",
  ],
  visual_content: [
    "frame",
    "component_variant",
    "token_spec",
    "localization_spec",
    "render_environment",
    "annotation",
  ],
  component_control: [
    "frame",
    "component_variant",
    "prototype_state",
    "token_spec",
    "relation_spec",
    "annotation",
  ],
  state_interaction: [
    "component_variant",
    "prototype_state",
    "prototype_transition",
    "input_spec",
    "haptic_spec",
    "sound_spec",
    "sound_capture",
    "system_ui_spec",
  ],
  motion: [
    "prototype_transition",
    "motion_spec",
    "motion_capture",
    "haptic_spec",
    "sound_spec",
    "sound_capture",
  ],
  adaptation_input: [
    "responsive_spec",
    "input_spec",
    "localization_spec",
    "system_ui_spec",
    "render_environment",
  ],
  accessibility: ["accessibility_spec", "semantic_tree", "input_spec", "frame"],
  assets: ["asset", "token_spec", "annotation"],
};

export const DESIGN_RESOURCE_METHODS_BY_DIMENSION: Record<
  DesignResourceDimension,
  readonly DesignResourceVerificationMethod[]
> = {
  surface_flow: [
    "layout_geometry",
    "design_token",
    "interaction_trace",
    "scroll_navigation",
  ],
  visual_content: [
    "layout_geometry",
    "visual_pixel",
    "design_token",
    "content",
    "responsive_reflow",
    "localization",
  ],
  component_control: [
    "layout_geometry",
    "visual_pixel",
    "design_token",
    "component_state",
  ],
  state_interaction: [
    "component_state",
    "interaction_trace",
    "gesture_trace",
    "scroll_navigation",
    "input_method",
    "system_ui",
    "haptic_feedback",
    "sound_feedback",
  ],
  motion: ["motion_timeline", "haptic_feedback", "sound_feedback"],
  adaptation_input: [
    "layout_geometry",
    "responsive_reflow",
    "input_method",
    "scroll_navigation",
    "localization",
    "system_ui",
  ],
  accessibility: [
    "accessibility_semantics",
    "accessibility_navigation",
    "accessibility_visual",
  ],
  assets: ["asset_integrity"],
};

export const DESIGN_RESOURCE_EVIDENCE_BY_METHOD: Record<
  DesignResourceVerificationMethod,
  readonly DesignResourceEvidenceKind[]
> = {
  layout_geometry: [
    "frame",
    "component_variant",
    "responsive_spec",
    "relation_spec",
    "annotation",
  ],
  visual_pixel: ["frame", "component_variant", "render_environment"],
  design_token: ["token_spec", "component_variant", "annotation"],
  content: ["frame", "component_variant", "localization_spec", "annotation"],
  component_state: [
    "component_variant",
    "prototype_state",
    "prototype_transition",
  ],
  interaction_trace: [
    "prototype_transition",
    "input_spec",
    "system_ui_spec",
    "haptic_spec",
  ],
  motion_timeline: ["prototype_transition", "motion_spec", "motion_capture"],
  responsive_reflow: [
    "responsive_spec",
    "component_variant",
    "render_environment",
  ],
  input_method: ["input_spec", "prototype_transition"],
  accessibility_semantics: ["accessibility_spec", "semantic_tree"],
  accessibility_navigation: [
    "accessibility_spec",
    "semantic_tree",
    "input_spec",
  ],
  accessibility_visual: ["accessibility_spec", "frame"],
  gesture_trace: ["input_spec", "prototype_transition", "motion_capture"],
  scroll_navigation: ["prototype_transition", "responsive_spec", "input_spec"],
  localization: ["localization_spec", "component_variant", "frame"],
  system_ui: ["system_ui_spec", "prototype_transition"],
  haptic_feedback: ["haptic_spec", "prototype_transition"],
  sound_feedback: ["sound_spec", "sound_capture", "prototype_transition"],
  asset_integrity: ["asset"],
};
