import {
  DESIGN_RESOURCE_INSPECTOR_CAPABILITIES,
  DESIGN_RESOURCE_PROPERTY_FAMILIES,
  DESIGN_RESOURCE_VALUE_KINDS,
  type DesignResourceInspectorCapability,
  type DesignResourcePropertyDefinitionV1,
  type DesignResourcePropertyFamily,
  type DesignResourceValueKind,
} from "./design-resource-fact-manifest-types.js";
import {
  DESIGN_RESOURCE_DIMENSIONS,
  type DesignResourceDimension,
} from "./design-resource-handoff-types.js";
import { designResourceRequiredMethods } from "./design-resource-fact-property-methods.js";

const STANDARD_PROPERTY_ROWS = `
geometry.coordinate-system|geometry|surface_flow|enum|component_anatomy
geometry.position-x|geometry|surface_flow|length|component_anatomy
geometry.position-y|geometry|surface_flow|length|component_anatomy
geometry.width|geometry|surface_flow|length|component_anatomy
geometry.height|geometry|surface_flow|length|component_anatomy
geometry.min-width|geometry|surface_flow|length|component_anatomy
geometry.max-width|geometry|surface_flow|length|component_anatomy
geometry.min-height|geometry|surface_flow|length|component_anatomy
geometry.max-height|geometry|surface_flow|length|component_anatomy
geometry.aspect-ratio|geometry|surface_flow|ratio|component_anatomy
geometry.content-width|geometry|surface_flow|length|component_anatomy
geometry.logical-physical-unit|geometry|surface_flow|semantic|component_anatomy
geometry.precision-rounding|geometry|surface_flow|semantic|component_anatomy
geometry.pixel-snapping|geometry|visual_content|semantic|component_anatomy
geometry.touch-target|geometry|component_control|length|component_anatomy
geometry.hit-slop|geometry|component_control|list|component_anatomy
layout.safe-area-insets|layout|adaptation_input|list|responsive_rules
layout.edge-constraints|layout|surface_flow|relation|relations
layout.mode|layout|surface_flow|enum|css_cascade
layout.grid-template|layout|surface_flow|string|css_cascade
layout.flex-basis|layout|surface_flow|length|css_cascade
layout.flex-grow|layout|surface_flow|number|css_cascade
layout.flex-shrink|layout|surface_flow|number|css_cascade
layout.order|layout|surface_flow|number|css_cascade
layout.margin-top|layout|surface_flow|length|css_cascade
layout.margin-right|layout|surface_flow|length|css_cascade
layout.margin-bottom|layout|surface_flow|length|css_cascade
layout.margin-left|layout|surface_flow|length|css_cascade
layout.padding-top|layout|surface_flow|length|css_cascade
layout.padding-right|layout|surface_flow|length|css_cascade
layout.padding-bottom|layout|surface_flow|length|css_cascade
layout.padding-left|layout|surface_flow|length|css_cascade
layout.row-gap|layout|surface_flow|length|css_cascade
layout.column-gap|layout|surface_flow|length|css_cascade
layout.align-items|layout|surface_flow|enum|css_cascade
layout.align-self|layout|surface_flow|enum|css_cascade
layout.justify-content|layout|surface_flow|enum|css_cascade
layout.baseline|layout|surface_flow|relation|relations
layout.anchor|layout|surface_flow|relation|relations
layout.transform|layout|visual_content|list|css_cascade
layout.transform-origin|layout|visual_content|list|css_cascade
layout.z-index|layout|surface_flow|number|css_cascade
layout.elevation|layout|visual_content|number|css_cascade
layout.clip|layout|visual_content|string|css_cascade
layout.mask|layout|visual_content|locator|css_cascade
layout.overflow|layout|surface_flow|enum|css_cascade
layout.occlusion|layout|surface_flow|relation|relations
scroll.container-owner|scroll|state_interaction|relation|relations
scroll.axis|scroll|state_interaction|enum|prototype_transitions,input_rules
scroll.nested-priority|scroll|state_interaction|relation|prototype_transitions,input_rules
scroll.indicator|scroll|visual_content|enum|prototype_transitions,input_rules
scroll.content-inset|scroll|adaptation_input|list|responsive_rules
scroll.bounce-overscroll|scroll|state_interaction|enum|prototype_transitions,input_rules
scroll.sticky-fixed-mode|scroll|state_interaction|enum|prototype_transitions,input_rules
scroll.restoration|scroll|state_interaction|semantic|prototype_transitions,input_rules
typography.font-family|typography|visual_content|string|css_cascade
typography.font-fallback|typography|visual_content|list|css_cascade
typography.variable-axes|typography|visual_content|list|css_cascade
typography.features|typography|visual_content|list|css_cascade
typography.font-size|typography|visual_content|length|css_cascade
typography.font-weight|typography|visual_content|number|css_cascade
typography.line-height|typography|visual_content|length|css_cascade
typography.letter-spacing|typography|visual_content|length|css_cascade
typography.numeral-style|typography|visual_content|enum|css_cascade
typography.hyphenation|typography|visual_content|enum|css_cascade
typography.formatting|typography|visual_content|semantic|localization
color.foreground|color|visual_content|color|design_tokens
color.background|color|visual_content|color|design_tokens
color.fill|color|visual_content|color|design_tokens
color.stroke|color|visual_content|color|design_tokens
color.gradient|color|visual_content|list|design_tokens
decoration.border-width|decoration|visual_content|length|css_cascade
decoration.border-style|decoration|visual_content|enum|css_cascade
decoration.border-dash|decoration|visual_content|list|css_cascade
decoration.stroke-cap|decoration|visual_content|enum|css_cascade
decoration.stroke-join|decoration|visual_content|enum|css_cascade
decoration.radius|decoration|visual_content|list|css_cascade
decoration.shadow|decoration|visual_content|list|css_cascade
decoration.blur|decoration|visual_content|number|css_cascade
decoration.vibrancy|decoration|visual_content|enum|system_ui
decoration.blend-mode|decoration|visual_content|enum|css_cascade
decoration.opacity|decoration|visual_content|number|css_cascade
content.copy|content|visual_content|string|html_dom
content.max-lines|content|visual_content|number|css_cascade
content.truncation|content|visual_content|enum|css_cascade
content.wrapping|content|visual_content|enum|css_cascade
content.visibility|content|component_control|boolean|html_dom
content.availability|content|component_control|enum|html_dom
content.layout-impact|content|component_control|semantic|component_anatomy
content.population-identity|content|component_control|semantic|dynamic_population
content.population-item-identity|content|component_control|semantic|dynamic_population
content.population-cardinality|content|component_control|number|dynamic_population
content.population-ordering|content|component_control|semantic|dynamic_population
content.virtualization-window|content|adaptation_input|semantic|dynamic_population
content.population-edge-cases|content|component_control|list|dynamic_population
content.date-format|content|visual_content|semantic|localization
content.time-format|content|visual_content|semantic|localization
content.number-format|content|visual_content|semantic|localization
content.unit-format|content|visual_content|semantic|localization
icon.glyph|icon|visual_content|locator|assets
icon.size|icon|visual_content|length|component_anatomy
icon.stroke|icon|visual_content|length|css_cascade
icon.tint|icon|visual_content|color|design_tokens
icon.position|icon|surface_flow|relation|relations
icon.text-gap|icon|surface_flow|length|component_anatomy
media.aspect-ratio|media|assets|ratio|assets
media.density-variant|media|assets|enum|assets
media.color-space|media|assets|enum|assets
media.crop-fit|media|assets|enum|assets
media.focal-point|media|assets|list|assets
media.mask|media|assets|locator|assets
media.placeholder|media|assets|locator|assets
media.error-state|media|assets|semantic|assets
media.decode-policy|media|assets|enum|assets
media.fallback|media|assets|locator|assets
interaction.trigger|interaction|state_interaction|semantic|prototype_transitions,input_rules
interaction.hit-testing|interaction|state_interaction|semantic|prototype_transitions,input_rules
interaction.pointer-events|interaction|state_interaction|enum|prototype_transitions,input_rules
interaction.gesture-priority|interaction|state_interaction|relation|prototype_transitions,input_rules
interaction.drag-threshold|interaction|state_interaction|length|prototype_transitions,input_rules
interaction.drag-axis|interaction|state_interaction|enum|prototype_transitions,input_rules
interaction.drag-bounds|interaction|state_interaction|list|prototype_transitions,input_rules
interaction.velocity-threshold|interaction|state_interaction|number|prototype_transitions,input_rules
interaction.snap-points|interaction|state_interaction|list|prototype_transitions,input_rules
interaction.cancel-reverse|interaction|state_interaction|semantic|prototype_transitions,input_rules
interaction.request-replacement|interaction|state_interaction|semantic|prototype_transitions,input_rules
interaction.repeated-input|interaction|state_interaction|semantic|prototype_transitions,input_rules
interaction.concurrent-operation|interaction|state_interaction|semantic|prototype_transitions,input_rules
interaction.validation|interaction|state_interaction|semantic|prototype_transitions,input_rules
interaction.focus-selection-cursor|interaction|state_interaction|semantic|prototype_transitions,input_rules
interaction.input-type|interaction|state_interaction|enum|prototype_transitions,input_rules
interaction.return-action|interaction|state_interaction|enum|prototype_transitions,input_rules
interaction.autocorrect|interaction|state_interaction|boolean|prototype_transitions,input_rules
interaction.autocapitalization|interaction|state_interaction|enum|prototype_transitions,input_rules
interaction.input-mask|interaction|state_interaction|semantic|prototype_transitions,input_rules
interaction.secure-entry|interaction|state_interaction|boolean|prototype_transitions,input_rules
interaction.clipboard|interaction|state_interaction|semantic|prototype_transitions,input_rules
interaction.password-manager|interaction|state_interaction|semantic|prototype_transitions,input_rules
interaction.long-press-threshold|interaction|state_interaction|number|prototype_transitions,input_rules
interaction.double-tap-window|interaction|state_interaction|number|prototype_transitions,input_rules
interaction.debounce|interaction|state_interaction|number|prototype_transitions,input_rules
interaction.throttle|interaction|state_interaction|number|prototype_transitions,input_rules
interaction.timeout|interaction|state_interaction|number|prototype_transitions,input_rules
interaction.latency-feedback|interaction|state_interaction|timeline|prototype_transitions,input_rules
interaction.keyboard-traversal|interaction|state_interaction|trace|prototype_transitions,input_rules
navigation.destination|navigation|state_interaction|semantic|prototype_transitions,input_rules
navigation.back-dismiss|navigation|state_interaction|semantic|prototype_transitions,input_rules
navigation.deep-link|navigation|state_interaction|semantic|prototype_transitions,input_rules
navigation.restoration|navigation|state_interaction|semantic|prototype_transitions,input_rules
motion.trigger-priority|motion|motion|semantic|motion,prototype_transitions
motion.start-value|motion|motion|timeline|motion,prototype_transitions
motion.end-value|motion|motion|timeline|motion,prototype_transitions
motion.animated-properties|motion|motion|list|motion,prototype_transitions
motion.coordinate-pivot|motion|motion|list|motion,prototype_transitions
motion.duration|motion|motion|number|motion,prototype_transitions
motion.delay|motion|motion|number|motion,prototype_transitions
motion.easing|motion|motion|semantic|motion,prototype_transitions
motion.spring|motion|motion|list|motion,prototype_transitions
motion.sequence|motion|motion|timeline|motion,prototype_transitions
motion.overshoot-clamping|motion|motion|semantic|motion,prototype_transitions
motion.interruption|motion|motion|semantic|motion,prototype_transitions
motion.continue-current-value|motion|motion|semantic|motion,prototype_transitions
motion.reduced-alternative|motion|motion|semantic|motion,prototype_transitions
feedback.visible|feedback|state_interaction|semantic|prototype_transitions,input_rules
feedback.spoken|feedback|accessibility|semantic|accessibility
feedback.sound-type-time|feedback|state_interaction|timeline|prototype_transitions,input_rules
feedback.haptic-type-time|feedback|state_interaction|timeline|prototype_transitions,input_rules
responsive.breakpoint-range|responsive|adaptation_input|list|responsive_rules
responsive.reflow|responsive|adaptation_input|semantic|responsive_rules
responsive.wrap|responsive|adaptation_input|semantic|responsive_rules
responsive.reorder|responsive|adaptation_input|semantic|responsive_rules
responsive.content-priority|responsive|adaptation_input|semantic|responsive_rules
responsive.expansion-scroll|responsive|adaptation_input|semantic|responsive_rules
responsive.text-pressure|responsive|adaptation_input|semantic|responsive_rules
accessibility.role|accessibility|accessibility|enum|accessibility
accessibility.name|accessibility|accessibility|string|accessibility
accessibility.value|accessibility|accessibility|string|accessibility
accessibility.hint|accessibility|accessibility|string|accessibility
accessibility.state|accessibility|accessibility|semantic|accessibility
accessibility.grouping-relations|accessibility|accessibility|relation|accessibility
accessibility.reading-order|accessibility|accessibility|list|accessibility
accessibility.focus-order|accessibility|accessibility|list|accessibility
accessibility.focus-visibility|accessibility|accessibility|semantic|accessibility
accessibility.custom-actions|accessibility|accessibility|list|accessibility
accessibility.live-announcement|accessibility|accessibility|semantic|accessibility
accessibility.screen-reader|accessibility|accessibility|trace|accessibility
accessibility.switch-control|accessibility|accessibility|trace|accessibility
accessibility.voice-control|accessibility|accessibility|trace|accessibility
accessibility.non-color-cue|accessibility|accessibility|semantic|accessibility
accessibility.contrast|accessibility|accessibility|number|accessibility
accessibility.text-scale-reflow|accessibility|accessibility|semantic|accessibility
accessibility.preference-adaptation|accessibility|accessibility|semantic|accessibility
asset.identity|asset|assets|string|assets
asset.path|asset|assets|locator|assets
asset.sha256|asset|assets|digest|assets
asset.role-format|asset|assets|semantic|assets
asset.intrinsic-size|asset|assets|list|assets
asset.variants|asset|assets|list|assets
asset.tintability|asset|assets|boolean|assets
asset.loading-fallback|asset|assets|semantic|assets
asset.license-provenance|asset|assets|semantic|assets
asset.consumer-mapping|asset|assets|relation|assets
system.platform-convention|system|adaptation_input|semantic|system_ui
system.status-navigation-bars|system|adaptation_input|semantic|system_ui
system.permission-sheet|system|state_interaction|semantic|system_ui
system.keyboard-ime-avoidance|system|adaptation_input|semantic|system_ui
system.font-rasterization|system|visual_content|semantic|system_ui
system.render-environment|system|visual_content|semantic|system_ui
relation.relative-position|relation|surface_flow|relation|relations
relation.relative-spacing|relation|surface_flow|relation|relations
relation.shared-baseline|relation|surface_flow|relation|relations
relation.equal-proportional-size|relation|surface_flow|relation|relations
relation.containment|relation|surface_flow|relation|relations
relation.overlap-z-order|relation|surface_flow|relation|relations
relation.synchronized-state-motion|relation|state_interaction|relation|relations
relation.family-instance-consistency|relation|component_control|relation|relations
relation.cross-surface-consistency|relation|component_control|relation|relations
`;

export const DESIGN_RESOURCE_STANDARD_PROPERTIES = STANDARD_PROPERTY_ROWS.trim()
  .split("\n")
  .map(parseStandardProperty);

export const DESIGN_RESOURCE_STANDARD_PROPERTY_KEYS = Object.freeze(
  DESIGN_RESOURCE_STANDARD_PROPERTIES.map((item) => item.key),
);

export const DESIGN_RESOURCE_STANDARD_PROPERTY_BY_KEY: ReadonlyMap<
  string,
  DesignResourcePropertyDefinitionV1
> = new Map(
  DESIGN_RESOURCE_STANDARD_PROPERTIES.map((item) => [item.key, item]),
);

function parseStandardProperty(
  row: string,
): DesignResourcePropertyDefinitionV1 {
  const [key, family, dimension, valueKind, capabilities, ...extra] =
    row.split("|");
  const capabilityRefs = capabilities?.split(",") ?? [];
  if (
    !key ||
    extra.length ||
    !DESIGN_RESOURCE_PROPERTY_FAMILIES.includes(
      family as DesignResourcePropertyFamily,
    ) ||
    !DESIGN_RESOURCE_DIMENSIONS.includes(
      dimension as DesignResourceDimension,
    ) ||
    !DESIGN_RESOURCE_VALUE_KINDS.includes(
      valueKind as DesignResourceValueKind,
    ) ||
    !capabilityRefs.length ||
    capabilityRefs.some(
      (capability) =>
        !DESIGN_RESOURCE_INSPECTOR_CAPABILITIES.includes(
          capability as DesignResourceInspectorCapability,
        ),
    )
  )
    throw new Error(`design_resource_standard_property_invalid:${row}`);
  return {
    key,
    family: family as DesignResourcePropertyFamily,
    dimension: dimension as DesignResourceDimension,
    value_kind: valueKind as DesignResourceValueKind,
    required_methods: designResourceRequiredMethods(
      key,
      family as DesignResourcePropertyFamily,
    ),
    standard: true,
    inspector_capability_refs:
      capabilityRefs as DesignResourceInspectorCapability[],
    census_refs: [],
  };
}
