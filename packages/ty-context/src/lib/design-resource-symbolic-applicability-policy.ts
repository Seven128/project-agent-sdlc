import { DESIGN_RESOURCE_STANDARD_PROPERTIES } from "./design-resource-fact-manifest-catalog.js";
import type { DesignResourceInspectorCensusEntryV1 } from "./design-resource-fact-manifest-model.js";
import type { DesignResourceHandoffSubjectV1 } from "./design-resource-handoff-types.js";
import { compareText } from "./design-resource-symbolic-validation-support.js";

export const DESIGN_RESOURCE_SYMBOLIC_APPLICABILITY_POLICY_VERSION =
  "package-subject-capability-algebra-v1" as const;

export interface DerivedSymbolicStandardApplicabilityV1 {
  property_refs: string[];
  policy_basis_refs: string[];
}

const BASE_VISUAL_PROPERTIES = ["geometry.width", "color.background"];

const SUBJECT_FAMILIES: Readonly<Record<string, readonly string[]>> = {
  surface: [],
  flow: ["navigation"],
  region: [],
  overlay: ["interaction", "accessibility"],
  system_ui: ["system", "accessibility"],
  component_family: [],
  component_instance: [],
  control: ["interaction", "accessibility"],
  anatomy_part: [],
  slot: [],
  primitive: [],
  text: ["typography", "content"],
  icon: ["icon", "asset", "accessibility"],
  media: ["media", "asset", "accessibility"],
  asset: ["asset"],
  relation: ["relation"],
};

const CENSUS_FAMILIES: Readonly<Record<string, readonly string[]>> = {
  asset_reference: ["asset"],
  relation: ["relation"],
  dynamic_population: ["content"],
  interaction_phase: ["interaction"],
};

const propertyRefsByFamily = new Map<string, string[]>();
for (const property of DESIGN_RESOURCE_STANDARD_PROPERTIES) {
  const values = propertyRefsByFamily.get(property.family) ?? [];
  values.push(property.key);
  propertyRefsByFamily.set(property.family, values);
}

export function symbolicApplicabilitySubjectPolicyRef(kind: string): string {
  return `package-policy.subject-kind.${kind}.v1`;
}

export function symbolicApplicabilityCensusPolicyRef(kind: string): string {
  return `package-policy.census-kind.${kind.replaceAll("_", "-")}.v1`;
}

export const SYMBOLIC_APPLICABILITY_POPULATION_POLICY_REF =
  "package-policy.subject-population.v1" as const;

export function deriveRequiredSymbolicStandardApplicability(
  subject: DesignResourceHandoffSubjectV1,
  census: ReadonlyMap<string, DesignResourceInspectorCensusEntryV1>,
): DerivedSymbolicStandardApplicabilityV1 {
  const properties = new Set<string>();
  const policyBasis = new Set<string>();
  for (const propertyRef of BASE_VISUAL_PROPERTIES) properties.add(propertyRef);
  addFamilies(properties, SUBJECT_FAMILIES[subject.kind] ?? []);
  policyBasis.add(symbolicApplicabilitySubjectPolicyRef(subject.kind));

  for (const censusRef of subject.census_refs) {
    const kind = census.get(censusRef)?.kind;
    if (!kind) continue;
    const families = CENSUS_FAMILIES[kind] ?? [];
    if (!families.length) continue;
    addFamilies(properties, families);
    policyBasis.add(symbolicApplicabilityCensusPolicyRef(kind));
  }
  if (subject.population_ref !== null) {
    addFamilies(properties, ["content"]);
    policyBasis.add(SYMBOLIC_APPLICABILITY_POPULATION_POLICY_REF);
  }
  return {
    property_refs: [...properties].sort(compareText),
    policy_basis_refs: [...policyBasis].sort(compareText),
  };
}

export function isKnownSymbolicApplicabilityPolicyRef(value: string): boolean {
  if (value === SYMBOLIC_APPLICABILITY_POPULATION_POLICY_REF) return true;
  if (
    Object.keys(SUBJECT_FAMILIES).some(
      (kind) => value === symbolicApplicabilitySubjectPolicyRef(kind),
    )
  )
    return true;
  return Object.keys(CENSUS_FAMILIES).some(
    (kind) => value === symbolicApplicabilityCensusPolicyRef(kind),
  );
}

function addFamilies(properties: Set<string>, families: readonly string[]) {
  for (const family of families)
    for (const propertyRef of propertyRefsByFamily.get(family) ?? [])
      properties.add(propertyRef);
}
