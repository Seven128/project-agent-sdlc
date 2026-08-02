import { DESIGN_RESOURCE_STANDARD_PROPERTIES } from "../../packages/ty-context/dist/lib/design-resource-fact-manifest-catalog.js";
import { SYMBOLIC_TARGET_KEY } from "./design-resource-symbolic-handoff-fixture-constants.mjs";

export const SYMBOLIC_SCALE_SUBJECT_COUNT = 639;
export const SYMBOLIC_SCALE_PROPERTY_COUNT = 217;
export const SYMBOLIC_SCALE_AXIS_COUNT = 53;
export const SYMBOLIC_SCALE_VARIATION_COUNT = 5_245;

export function buildSymbolicScaleCatalog() {
  if (
    DESIGN_RESOURCE_STANDARD_PROPERTIES.length !== SYMBOLIC_SCALE_PROPERTY_COUNT
  )
    throw new Error(
      `symbolic_scale_property_catalog_drift:${DESIGN_RESOURCE_STANDARD_PROPERTIES.length}`,
    );
  const variations = Array.from(
    { length: SYMBOLIC_SCALE_VARIATION_COUNT },
    (_, index) => `variation-${String(index).padStart(4, "0")}`,
  );
  const domains = [
    { key: "variation.case", kind: "enum", values: variations },
    ...Array.from({ length: SYMBOLIC_SCALE_AXIS_COUNT - 1 }, (_, index) => ({
      key: `condition.axis-${String(index).padStart(2, "0")}`,
      kind: "enum",
      values: ["off", "on"],
    })),
  ];
  const properties = DESIGN_RESOURCE_STANDARD_PROPERTIES.map((property) => ({
    ...structuredClone(property),
    census_refs:
      property.key === "geometry.width"
        ? ["census.property.width"]
        : property.key === "color.background"
          ? ["census.property.background"]
          : [],
  }));
  const subjects = Array.from(
    { length: SYMBOLIC_SCALE_SUBJECT_COUNT },
    (_, index) => {
      const key = `component.scale-${String(index).padStart(3, "0")}`;
      return {
        key,
        kind: "component_instance",
        stable_keys: [key],
        target_refs: [SYMBOLIC_TARGET_KEY],
        parent_ref: null,
        instance_of_ref: null,
        slot_key: null,
        override_of_ref: null,
        family_ref: null,
        presence: "always",
        presence_rule_ref: null,
        population_ref: null,
        portal_host_ref: null,
        relation_endpoints: [],
        census_refs: ["census.subject.scale"],
      };
    },
  );
  return { variations, domains, properties, subjects };
}
