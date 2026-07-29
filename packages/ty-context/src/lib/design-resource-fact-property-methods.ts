import type { DesignResourcePropertyFamily } from "./design-resource-fact-manifest-types.js";
import type { DesignResourceVerificationMethod } from "./design-resource-handoff-types.js";

const LAYOUT_PIXEL_KEYS = new Set([
  "layout.transform",
  "layout.transform-origin",
  "layout.elevation",
  "layout.clip",
  "layout.mask",
]);
const CONTENT_LOCALIZATION_KEYS = new Set([
  "content.date-format",
  "content.time-format",
  "content.number-format",
  "content.unit-format",
]);
const CONTENT_REFLOW_KEYS = new Set([
  "content.max-lines",
  "content.truncation",
  "content.wrapping",
]);
const CONTENT_STATE_KEYS = new Set([
  "content.visibility",
  "content.availability",
  "content.population-identity",
  "content.population-item-identity",
  "content.population-cardinality",
  "content.population-ordering",
  "content.population-edge-cases",
]);
const GESTURE_KEYS = new Set([
  "interaction.drag-threshold",
  "interaction.drag-axis",
  "interaction.drag-bounds",
  "interaction.velocity-threshold",
  "interaction.snap-points",
  "interaction.long-press-threshold",
  "interaction.double-tap-window",
]);
const INPUT_KEYS = new Set([
  "interaction.input-type",
  "interaction.return-action",
  "interaction.autocorrect",
  "interaction.autocapitalization",
  "interaction.input-mask",
  "interaction.secure-entry",
  "interaction.clipboard",
  "interaction.password-manager",
  "interaction.keyboard-traversal",
]);
const ACCESSIBILITY_NAVIGATION_KEYS = new Set([
  "accessibility.reading-order",
  "accessibility.focus-order",
  "accessibility.screen-reader",
  "accessibility.switch-control",
  "accessibility.voice-control",
]);
const ACCESSIBILITY_VISUAL_KEYS = new Set([
  "accessibility.focus-visibility",
  "accessibility.non-color-cue",
  "accessibility.contrast",
  "accessibility.text-scale-reflow",
  "accessibility.preference-adaptation",
]);

export function designResourceRequiredMethods(
  key: string,
  family: DesignResourcePropertyFamily,
): DesignResourceVerificationMethod[] {
  const resolver = FAMILY_METHODS[family];
  return resolver ? resolver(key) : ["visual_pixel"];
}

const FAMILY_METHODS: Partial<
  Record<
    DesignResourcePropertyFamily,
    (key: string) => DesignResourceVerificationMethod[]
  >
> = {
  geometry: (key) =>
    key === "geometry.pixel-snapping" ? ["visual_pixel"] : ["layout_geometry"],
  layout: (key) => {
    if (key === "layout.safe-area-insets")
      return ["layout_geometry", "responsive_reflow"];
    return LAYOUT_PIXEL_KEYS.has(key)
      ? ["layout_geometry", "visual_pixel"]
      : ["layout_geometry"];
  },
  scroll: (key) => {
    if (key === "scroll.indicator") return ["visual_pixel"];
    return key === "scroll.content-inset"
      ? ["responsive_reflow", "scroll_navigation"]
      : ["scroll_navigation"];
  },
  typography: (key) =>
    new Set([
      "typography.numeral-style",
      "typography.hyphenation",
      "typography.formatting",
    ]).has(key)
      ? ["visual_pixel", "content"]
      : ["layout_geometry", "visual_pixel"],
  color: () => ["visual_pixel"],
  decoration: () => ["visual_pixel"],
  content: contentMethods,
  icon: (key) =>
    new Set(["icon.position", "icon.text-gap"]).has(key)
      ? ["layout_geometry"]
      : ["visual_pixel"],
  media: () => ["asset_integrity"],
  asset: () => ["asset_integrity"],
  interaction: interactionMethods,
  navigation: () => ["interaction_trace"],
  motion: () => ["motion_timeline"],
  feedback: feedbackMethods,
  responsive: () => ["responsive_reflow"],
  accessibility: accessibilityMethods,
  system: systemMethods,
  relation: relationMethods,
};

function contentMethods(key: string): DesignResourceVerificationMethod[] {
  if (CONTENT_LOCALIZATION_KEYS.has(key)) return ["content", "localization"];
  if (CONTENT_REFLOW_KEYS.has(key)) return ["content", "responsive_reflow"];
  if (key === "content.virtualization-window") return ["responsive_reflow"];
  if (key === "content.layout-impact")
    return ["component_state", "layout_geometry"];
  return CONTENT_STATE_KEYS.has(key) ? ["component_state"] : ["content"];
}

function interactionMethods(key: string): DesignResourceVerificationMethod[] {
  if (GESTURE_KEYS.has(key)) return ["gesture_trace"];
  if (INPUT_KEYS.has(key)) return ["input_method"];
  return key === "interaction.trigger"
    ? ["component_state", "interaction_trace"]
    : ["interaction_trace"];
}

function feedbackMethods(key: string): DesignResourceVerificationMethod[] {
  if (key === "feedback.spoken") return ["accessibility_semantics"];
  if (key === "feedback.sound-type-time") return ["sound_feedback"];
  if (key === "feedback.haptic-type-time") return ["haptic_feedback"];
  return ["component_state"];
}

function accessibilityMethods(key: string): DesignResourceVerificationMethod[] {
  if (ACCESSIBILITY_NAVIGATION_KEYS.has(key))
    return ["accessibility_navigation"];
  return ACCESSIBILITY_VISUAL_KEYS.has(key)
    ? ["accessibility_visual"]
    : ["accessibility_semantics"];
}

function systemMethods(key: string): DesignResourceVerificationMethod[] {
  if (
    new Set(["system.font-rasterization", "system.render-environment"]).has(key)
  )
    return ["visual_pixel"];
  return key === "system.keyboard-ime-avoidance"
    ? ["input_method"]
    : ["system_ui"];
}

function relationMethods(key: string): DesignResourceVerificationMethod[] {
  if (key === "relation.synchronized-state-motion")
    return ["interaction_trace"];
  return new Set([
    "relation.family-instance-consistency",
    "relation.cross-surface-consistency",
  ]).has(key)
    ? ["component_state"]
    : ["layout_geometry"];
}
