import { DESIGN_RESOURCE_STANDARD_PROPERTIES } from "./design-resource-fact-manifest-catalog.js";
import { resolveDesignResourceLocatorValue } from "./design-resource-fact-locator-validation.js";
import type { DesignResourcePropertyDefinitionV1 } from "./design-resource-fact-types.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type {
  DesignResourceObservableRuleManifestV2,
  ParsedDesignResourceHandoffV2,
} from "./design-resource-symbolic-fact-types.js";
import {
  assertSameSet,
  compareText,
  invalid,
  stableJson,
} from "./design-resource-symbolic-validation-support.js";

export function validateSymbolicInspectorAndResources(
  manifest: DesignResourceObservableRuleManifestV2,
  target: ParsedDesignResourceHandoffV2["handoff"]["targets"][number],
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  if (
    (manifest.inspector.trust === "frozen_executable" &&
      manifest.inspector.implementation_sha256 === null) ||
    (manifest.inspector.trust === "named_external_tcb" &&
      manifest.inspector.implementation_sha256 !== null)
  )
    invalid("v2_inspector_trust_digest_mismatch", target.key);
  if (
    manifest.inspector.traversal !== "complete_enumeration" ||
    manifest.inspector.dynamic_discovery !== "fully_enumerated"
  )
    invalid("v2_inspector_incomplete", target.key);
  if (
    manifest.inspector.entry_resource_ref !==
    target.source_profile.entry_resource_ref
  )
    invalid("v2_inspector_entry_mismatch", target.key);
  assertSameSet(
    manifest.inspector.input_resources.map((item) => item.resource_ref),
    target.resource_refs.filter(
      (ref) => ref !== target.source_profile.fact_manifest_resource_ref,
    ),
    "v2_inspector_input_resource_set_mismatch",
    target.key,
  );
  for (const input of manifest.inspector.input_resources) {
    const resource = resources.get(input.resource_ref);
    if (
      !resource ||
      resource.path !== input.path ||
      resource.sha256 !== input.sha256 ||
      !contents.has(input.resource_ref)
    )
      invalid("v2_inspector_input_resource_mismatch", input.resource_ref);
  }
  for (const row of manifest.inspector.census) {
    const resource = resources.get(row.resource_ref);
    const bytes = contents.get(row.resource_ref);
    if (!resource || !bytes) invalid("v2_census_resource_unknown", row.key);
    if (
      !manifest.inspector.input_resources.some(
        (input) => input.resource_ref === row.resource_ref,
      )
    )
      invalid("v2_census_resource_outside_inspector_inputs", row.key);
    resolveDesignResourceLocatorValue(
      { resource_ref: row.resource_ref, ...row.locator },
      resource,
      bytes,
      `v2.inspector.census.${row.key}`,
    );
    if (row.disposition === "covered" && !row.fact_refs.length)
      invalid("v2_census_rule_refs_required", row.key);
    if (row.disposition === "non_material" && row.fact_refs.length)
      invalid("v2_non_material_census_rule_refs_forbidden", row.key);
    if (row.fact_cell_refs.length)
      invalid("v2_census_ground_fact_cell_refs_forbidden", row.key);
  }
  if (manifest.design_system.disposition === "used") {
    const resource = resources.get(manifest.design_system.resource_ref);
    if (!resource || resource.sha256 !== manifest.design_system.sha256)
      invalid("v2_design_system_resource_mismatch", target.key);
  }
}

export function validateSymbolicPropertyCatalog(
  properties: DesignResourcePropertyDefinitionV1[],
): void {
  const actual = new Map(
    properties.map((property) => [property.key, property]),
  );
  for (const standard of DESIGN_RESOURCE_STANDARD_PROPERTIES) {
    const candidate = actual.get(standard.key);
    if (!candidate) invalid("v2_standard_property_missing", standard.key);
    if (
      stableJson(propertyPolicy(candidate)) !==
      stableJson(propertyPolicy(standard))
    )
      invalid("v2_standard_property_definition_mismatch", standard.key);
  }
  for (const property of properties) validatePropertyAuthority(property);
}

function validatePropertyAuthority(
  property: DesignResourcePropertyDefinitionV1,
): void {
  if (property.standard) {
    if (
      !DESIGN_RESOURCE_STANDARD_PROPERTIES.some(
        (item) => item.key === property.key,
      )
    )
      invalid("v2_unknown_standard_property", property.key);
    return;
  }
  if (
    !property.key.startsWith("custom.") ||
    !property.inspector_capability_refs.length ||
    !property.census_refs.length
  )
    invalid("v2_custom_property_authority_incomplete", property.key);
}

function propertyPolicy(property: DesignResourcePropertyDefinitionV1) {
  return {
    key: property.key,
    family: property.family,
    dimension: property.dimension,
    value_kind: property.value_kind,
    required_methods: [...property.required_methods].sort(compareText),
    standard: property.standard,
    inspector_capability_refs: [...property.inspector_capability_refs].sort(
      compareText,
    ),
  };
}
