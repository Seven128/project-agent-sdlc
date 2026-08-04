import {
  DESIGN_RESOURCE_STANDARD_PROPERTIES,
  DESIGN_RESOURCE_STANDARD_PROPERTY_KEYS,
} from "./design-resource-fact-manifest-catalog.js";
import {
  DESIGN_RESOURCE_INSPECTOR_CAPABILITIES,
  DESIGN_RESOURCE_PROPERTY_FAMILIES,
} from "./design-resource-fact-manifest-types.js";
import {
  compareText,
  invalid,
} from "./design-resource-symbolic-validation-support.js";

export const DESIGN_RESOURCE_SYMBOLIC_APPLICABILITY_PROFILE_CATALOG =
  "package-subject-property-applicability-v1" as const;

export interface DesignResourceSymbolicApplicabilityProfileV1 {
  key: string;
  property_refs: readonly string[];
}

const profiles = buildProfiles();

export const DESIGN_RESOURCE_SYMBOLIC_APPLICABILITY_PROFILES: readonly DesignResourceSymbolicApplicabilityProfileV1[] =
  Object.freeze(profiles);

const profileByKey: ReadonlyMap<
  string,
  DesignResourceSymbolicApplicabilityProfileV1
> = new Map(profiles.map((profile) => [profile.key, profile]));

export function symbolicPropertyProfileKey(propertyRef: string): string {
  return `profile.property.${propertyRef}`;
}

export function resolveSymbolicApplicabilityProfiles(
  profileRefs: readonly string[],
  label: string,
): Set<string> {
  const propertyRefs = new Set<string>();
  for (const profileRef of profileRefs) {
    const profile = profileByKey.get(profileRef);
    if (!profile)
      invalid("v2_applicability_profile_unknown", `${label}:${profileRef}`);
    for (const propertyRef of profile.property_refs)
      propertyRefs.add(propertyRef);
  }
  return propertyRefs;
}

function buildProfiles(): DesignResourceSymbolicApplicabilityProfileV1[] {
  const result: DesignResourceSymbolicApplicabilityProfileV1[] = [
    {
      key: "profile.all-standard",
      property_refs: [...DESIGN_RESOURCE_STANDARD_PROPERTY_KEYS],
    },
  ];
  for (const property of DESIGN_RESOURCE_STANDARD_PROPERTIES)
    result.push({
      key: symbolicPropertyProfileKey(property.key),
      property_refs: [property.key],
    });
  for (const family of DESIGN_RESOURCE_PROPERTY_FAMILIES)
    result.push({
      key: `profile.family.${family}`,
      property_refs: DESIGN_RESOURCE_STANDARD_PROPERTIES.filter(
        (property) => property.family === family,
      ).map((property) => property.key),
    });
  for (const capability of DESIGN_RESOURCE_INSPECTOR_CAPABILITIES)
    result.push({
      key: `profile.capability.${capability}`,
      property_refs: DESIGN_RESOURCE_STANDARD_PROPERTIES.filter((property) =>
        property.inspector_capability_refs.includes(capability),
      ).map((property) => property.key),
    });
  result.sort((left, right) => compareText(left.key, right.key));
  if (new Set(result.map((profile) => profile.key)).size !== result.length)
    invalid("v2_applicability_profile_catalog_duplicate", "");
  const covered = new Set(result.flatMap((profile) => profile.property_refs));
  if (
    covered.size !== DESIGN_RESOURCE_STANDARD_PROPERTY_KEYS.length ||
    DESIGN_RESOURCE_STANDARD_PROPERTY_KEYS.some((key) => !covered.has(key))
  )
    invalid("v2_applicability_profile_catalog_incomplete", "");
  return result.map((profile) =>
    Object.freeze({
      ...profile,
      property_refs: Object.freeze(
        [...profile.property_refs].sort(compareText),
      ),
    }),
  );
}
