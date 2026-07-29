export const DESIGN_RESOURCE_STANDARD_CONDITION_AXES = [
  "platform",
  "os_version",
  "device_profile",
  "form_factor",
  "viewport",
  "orientation",
  "density",
  "safe_area",
  "window_state",
  "fold_state",
  "display_mode",
  "color_scheme",
  "locale",
  "language",
  "script",
  "direction",
  "pseudo_localization",
  "content_case",
  "data_case",
  "text_scale",
  "input_method",
  "assistive_technology",
  "motion",
  "transparency",
  "contrast",
  "bold_text",
  "button_shapes",
  "system_ui",
  "ime",
  "permission",
  "capability",
  "connectivity",
  "lifecycle",
] as const;

export type DesignResourceStandardConditionAxis =
  (typeof DESIGN_RESOURCE_STANDARD_CONDITION_AXES)[number];

export const DESIGN_RESOURCE_VARIATION_AXES = [
  "variant",
  "state",
  "interaction_phase",
  "presence_phase",
  "instance_case",
] as const;

export type DesignResourceVariationAxis =
  (typeof DESIGN_RESOURCE_VARIATION_AXES)[number];

export const DESIGN_RESOURCE_SUBJECT_KINDS = [
  "surface",
  "flow",
  "region",
  "overlay",
  "system_ui",
  "component_family",
  "component_instance",
  "control",
  "anatomy_part",
  "slot",
  "primitive",
  "text",
  "icon",
  "media",
  "asset",
  "relation",
] as const;

export type DesignResourceSubjectKind =
  (typeof DESIGN_RESOURCE_SUBJECT_KINDS)[number];

export const DESIGN_RESOURCE_SUBJECT_PRESENCE_KINDS = [
  "always",
  "conditional",
  "lazy",
  "virtualized",
  "portal",
  "overlay",
  "system_presented",
] as const;

export type DesignResourceSubjectPresenceKind =
  (typeof DESIGN_RESOURCE_SUBJECT_PRESENCE_KINDS)[number];

export const DESIGN_RESOURCE_PROPERTY_FAMILIES = [
  "geometry",
  "layout",
  "scroll",
  "typography",
  "color",
  "decoration",
  "content",
  "icon",
  "media",
  "interaction",
  "navigation",
  "motion",
  "feedback",
  "responsive",
  "accessibility",
  "asset",
  "system",
  "relation",
] as const;

export type DesignResourcePropertyFamily =
  (typeof DESIGN_RESOURCE_PROPERTY_FAMILIES)[number];

export const DESIGN_RESOURCE_VALUE_KINDS = [
  "boolean",
  "color",
  "digest",
  "enum",
  "length",
  "list",
  "locator",
  "number",
  "ratio",
  "relation",
  "semantic",
  "string",
  "timeline",
  "token_ref",
  "trace",
] as const;

export type DesignResourceValueKind =
  (typeof DESIGN_RESOURCE_VALUE_KINDS)[number];

export const DESIGN_RESOURCE_LINEAGE_NODE_KINDS = [
  "base_token",
  "alias_token",
  "semantic_token",
  "component_token",
  "platform_override",
  "mode_override",
  "state_override",
  "instance_override",
  "slot_override",
  "direct_value",
] as const;

export type DesignResourceLineageNodeKind =
  (typeof DESIGN_RESOURCE_LINEAGE_NODE_KINDS)[number];

export const DESIGN_RESOURCE_COMPARATORS = [
  "exact_value",
  "numeric_delta",
  "geometry_delta",
  "pixel_diff",
  "token_resolution",
  "content_equal",
  "state_equal",
  "trace_equal",
  "timeline_equal",
  "reflow_equal",
  "semantic_equal",
  "asset_equal",
] as const;

export type DesignResourceComparator =
  (typeof DESIGN_RESOURCE_COMPARATORS)[number];

export const DESIGN_RESOURCE_INSPECTOR_CAPABILITIES = [
  "html_dom",
  "css_cascade",
  "javascript_static",
  "json",
  "svg",
  "markdown",
  "assets",
  "design_tokens",
  "component_anatomy",
  "prototype_transitions",
  "responsive_rules",
  "input_rules",
  "accessibility",
  "motion",
  "localization",
  "system_ui",
  "haptics",
  "audio",
  "render_capture",
  "geometry_measurement",
  "custom_properties",
  "relations",
  "dynamic_population",
] as const;

export type DesignResourceInspectorCapability =
  (typeof DESIGN_RESOURCE_INSPECTOR_CAPABILITIES)[number];

export const DESIGN_RESOURCE_CENSUS_KINDS = [
  "resource",
  "node",
  "declaration",
  "token",
  "asset_reference",
  "relation",
  "custom_property",
  "variant",
  "state",
  "interaction_phase",
  "dynamic_population",
] as const;

export type DesignResourceCensusKind =
  (typeof DESIGN_RESOURCE_CENSUS_KINDS)[number];
