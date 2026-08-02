import {
  DESIGN_RESOURCE_SYMBOLIC_APPLICABILITY_PROFILE_CATALOG,
  resolveSymbolicApplicabilityProfiles,
} from "./design-resource-symbolic-applicability-profiles.js";
import type { DesignResourceObservableRuleManifestV2 } from "./design-resource-symbolic-fact-types.js";
import type { SymbolicManifestIndexes } from "./design-resource-symbolic-indexes.js";
import {
  assertSameSet,
  invalid,
  requireKnownRefs,
  unique,
} from "./design-resource-symbolic-validation-support.js";

export interface SymbolicApplicabilityIndex {
  mode: "legacy_physical_partitions" | "package_profiles";
  isApplicable(subjectRef: string, propertyRef: string): boolean;
}

export function buildSymbolicApplicabilityIndex(
  manifest: DesignResourceObservableRuleManifestV2,
  indexes: SymbolicManifestIndexes,
): SymbolicApplicabilityIndex {
  const compact = manifest.structural_applicability;
  if (!compact)
    return {
      mode: "legacy_physical_partitions",
      isApplicable: () => true,
    };
  if (
    compact.profile_catalog !==
    DESIGN_RESOURCE_SYMBOLIC_APPLICABILITY_PROFILE_CATALOG
  )
    invalid(
      "v2_applicability_profile_catalog_unknown",
      compact.profile_catalog,
    );
  const applicableBySubject = validateProfileBindings(manifest, indexes);
  validateCustomPropertyClosure(manifest, indexes, applicableBySubject);
  validateInstanceExceptions(manifest, indexes, applicableBySubject);
  return {
    mode: "package_profiles",
    isApplicable(subjectRef, propertyRef) {
      const properties = applicableBySubject.get(subjectRef);
      if (!properties) invalid("v2_applicability_subject_unknown", subjectRef);
      if (!indexes.properties.has(propertyRef))
        invalid("v2_applicability_property_unknown", propertyRef);
      return properties.has(propertyRef);
    },
  };
}

function validateProfileBindings(
  manifest: DesignResourceObservableRuleManifestV2,
  indexes: SymbolicManifestIndexes,
): Map<string, Set<string>> {
  const bindings = manifest.structural_applicability!.subject_profile_bindings;
  unique(
    bindings.map((binding) => binding.key),
    "v2_applicability_profile_binding_key_duplicate",
  );
  const boundSubjects = bindings.flatMap((binding) => binding.subject_refs);
  unique(boundSubjects, "v2_applicability_subject_profile_ambiguous");
  assertSameSet(
    boundSubjects,
    [...indexes.subjects.keys()],
    "v2_applicability_subject_profile_set_mismatch",
    manifest.target_key,
  );
  const result = new Map<string, Set<string>>();
  for (const binding of bindings) {
    if (!binding.subject_refs.length || !binding.profile_refs.length)
      invalid("v2_applicability_profile_binding_empty", binding.key);
    validateAuthorityRefs(binding, indexes, binding.key);
    unique(
      binding.profile_refs,
      `v2_applicability_profile_ref_duplicate:${binding.key}`,
    );
    const properties = resolveSymbolicApplicabilityProfiles(
      binding.profile_refs,
      binding.key,
    );
    const subjectCensusRefs = binding.subject_refs.flatMap((subjectRef) => {
      const subject = indexes.subjects.get(subjectRef);
      if (!subject)
        invalid("v2_applicability_profile_subject_unknown", subjectRef);
      return subject.census_refs;
    });
    assertSameSet(
      binding.census_refs,
      subjectCensusRefs,
      "v2_applicability_subject_census_set_mismatch",
      binding.key,
    );
    for (const subjectRef of binding.subject_refs) {
      const subject = indexes.subjects.get(subjectRef);
      if (!subject)
        invalid("v2_applicability_profile_subject_unknown", subjectRef);
      result.set(subjectRef, new Set(properties));
    }
  }
  return result;
}

function validateCustomPropertyClosure(
  manifest: DesignResourceObservableRuleManifestV2,
  indexes: SymbolicManifestIndexes,
  applicableBySubject: Map<string, Set<string>>,
): void {
  const rows =
    manifest.structural_applicability!.inspector_custom_property_closure;
  unique(
    rows.map((row) => row.property_ref),
    "v2_custom_property_closure_duplicate",
  );
  const customProperties = manifest.properties.filter(
    (property) => !property.standard,
  );
  assertSameSet(
    rows.map((row) => row.property_ref),
    customProperties.map((property) => property.key),
    "v2_custom_property_closure_set_mismatch",
    manifest.target_key,
  );
  for (const row of rows) {
    const property = indexes.properties.get(row.property_ref);
    if (!property || property.standard)
      invalid("v2_custom_property_closure_property_unknown", row.property_ref);
    validateAuthorityRefs(row, indexes, row.property_ref);
    requireKnownRefs(
      row.applicable_subject_refs,
      indexes.subjects,
      "v2_custom_property_subject_unknown",
    );
    unique(
      row.applicable_subject_refs,
      `v2_custom_property_subject_duplicate:${row.property_ref}`,
    );
    assertSameSet(
      row.census_refs,
      property.census_refs,
      "v2_custom_property_census_set_mismatch",
      row.property_ref,
    );
    for (const censusRef of row.census_refs) {
      const census = indexes.census.get(censusRef);
      if (
        census?.kind !== "custom_property" ||
        census.disposition !== "covered"
      )
        invalid(
          "v2_custom_property_census_authority_invalid",
          `${row.property_ref}:${censusRef}`,
        );
    }
    for (const subjectRef of row.applicable_subject_refs)
      applicableBySubject.get(subjectRef)!.add(row.property_ref);
  }
  assertSameSet(
    rows.flatMap((row) => row.census_refs),
    manifest.inspector.census
      .filter((row) => row.kind === "custom_property")
      .map((row) => row.key),
    "v2_custom_property_census_closure_mismatch",
    manifest.target_key,
  );
}

function validateInstanceExceptions(
  manifest: DesignResourceObservableRuleManifestV2,
  indexes: SymbolicManifestIndexes,
  applicableBySubject: Map<string, Set<string>>,
): void {
  const exceptions = manifest.structural_applicability!.instance_exceptions;
  unique(
    exceptions.map((item) => item.key),
    "v2_applicability_exception_key_duplicate",
  );
  const tupleKeys = exceptions.map(
    (item) => `${item.subject_ref}\u0000${item.property_ref}`,
  );
  unique(tupleKeys, "v2_applicability_exception_tuple_duplicate");
  for (const exception of exceptions) {
    const subject = indexes.subjects.get(exception.subject_ref);
    if (!subject)
      invalid("v2_applicability_exception_subject_unknown", exception.key);
    const property = indexes.properties.get(exception.property_ref);
    if (!property)
      invalid("v2_applicability_exception_property_unknown", exception.key);
    validateAuthorityRefs(exception, indexes, exception.key);
    assertSameSet(
      exception.census_refs,
      [...subject.census_refs, ...property.census_refs],
      "v2_applicability_exception_census_set_mismatch",
      exception.key,
    );
    const properties = applicableBySubject.get(exception.subject_ref)!;
    const requestedApplicability = exception.disposition === "applicable";
    if (properties.has(exception.property_ref) === requestedApplicability)
      invalid("v2_applicability_exception_noop", exception.key);
    if (exception.disposition === "applicable")
      properties.add(exception.property_ref);
    else properties.delete(exception.property_ref);
  }
}

function validateAuthorityRefs(
  row: {
    census_refs: string[];
    source_item_refs: string[];
    basis_refs: string[];
    rationale: string;
  },
  indexes: SymbolicManifestIndexes,
  label: string,
): void {
  if (
    !row.census_refs.length ||
    !row.source_item_refs.length ||
    !row.basis_refs.length ||
    !row.rationale.trim()
  )
    invalid("v2_applicability_authority_incomplete", label);
  unique(row.census_refs, `v2_applicability_census_duplicate:${label}`);
  unique(
    row.source_item_refs,
    `v2_applicability_source_item_duplicate:${label}`,
  );
  unique(row.basis_refs, `v2_applicability_basis_duplicate:${label}`);
  requireKnownRefs(
    row.census_refs,
    indexes.census,
    "v2_applicability_census_unknown",
  );
  requireKnownRefs(
    row.source_item_refs,
    indexes.sourceItems,
    "v2_applicability_source_item_unknown",
  );
}
