import {
  sourceItemKeys,
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import type { DesignResourceSymbolicStructuralApplicabilityV2 } from "./design-resource-symbolic-fact-types.js";
import {
  array,
  literal,
  object,
  string,
} from "./long-task-shape-primitives.js";

export function parseSymbolicStructuralApplicability(
  value: unknown,
  label: string,
): DesignResourceSymbolicStructuralApplicabilityV2 {
  const root = object(value, label, [
    "profile_catalog",
    "subject_profile_bindings",
    "inspector_custom_property_closure",
    "instance_exceptions",
  ]);
  return {
    profile_catalog: literal(
      root.profile_catalog,
      ["package-subject-property-applicability-v1"] as const,
      `${label}.profile_catalog`,
    ),
    subject_profile_bindings: array(
      root.subject_profile_bindings,
      `${label}.subject_profile_bindings`,
    ).map((item, index) =>
      parseProfileBinding(item, `${label}.subject_profile_bindings[${index}]`),
    ),
    inspector_custom_property_closure: array(
      root.inspector_custom_property_closure,
      `${label}.inspector_custom_property_closure`,
    ).map((item, index) =>
      parseCustomPropertyClosure(
        item,
        `${label}.inspector_custom_property_closure[${index}]`,
      ),
    ),
    instance_exceptions: array(
      root.instance_exceptions,
      `${label}.instance_exceptions`,
    ).map((item, index) =>
      parseInstanceException(item, `${label}.instance_exceptions[${index}]`),
    ),
  };
}

function parseProfileBinding(value: unknown, label: string) {
  const row = object(value, label, [
    "key",
    "subject_refs",
    "profile_refs",
    "census_refs",
    "source_item_refs",
    "basis_refs",
    "rationale",
  ]);
  return {
    key: stableKey(row.key, `${label}.key`),
    subject_refs: stableKeys(row.subject_refs, `${label}.subject_refs`),
    profile_refs: stableKeys(row.profile_refs, `${label}.profile_refs`),
    census_refs: stableKeys(row.census_refs, `${label}.census_refs`),
    source_item_refs: sourceItemKeys(
      row.source_item_refs,
      `${label}.source_item_refs`,
    ),
    basis_refs: stableKeys(row.basis_refs, `${label}.basis_refs`),
    rationale: string(row.rationale, `${label}.rationale`),
  };
}

function parseCustomPropertyClosure(value: unknown, label: string) {
  const row = object(value, label, [
    "property_ref",
    "applicable_subject_refs",
    "census_refs",
    "source_item_refs",
    "basis_refs",
    "rationale",
  ]);
  return {
    property_ref: stableKey(row.property_ref, `${label}.property_ref`),
    applicable_subject_refs: stableKeys(
      row.applicable_subject_refs,
      `${label}.applicable_subject_refs`,
    ),
    census_refs: stableKeys(row.census_refs, `${label}.census_refs`),
    source_item_refs: sourceItemKeys(
      row.source_item_refs,
      `${label}.source_item_refs`,
    ),
    basis_refs: stableKeys(row.basis_refs, `${label}.basis_refs`),
    rationale: string(row.rationale, `${label}.rationale`),
  };
}

function parseInstanceException(value: unknown, label: string) {
  const row = object(value, label, [
    "key",
    "subject_ref",
    "property_ref",
    "disposition",
    "census_refs",
    "source_item_refs",
    "basis_refs",
    "rationale",
  ]);
  return {
    key: stableKey(row.key, `${label}.key`),
    subject_ref: stableKey(row.subject_ref, `${label}.subject_ref`),
    property_ref: stableKey(row.property_ref, `${label}.property_ref`),
    disposition: literal(
      row.disposition,
      ["applicable", "not_applicable"] as const,
      `${label}.disposition`,
    ),
    census_refs: stableKeys(row.census_refs, `${label}.census_refs`),
    source_item_refs: sourceItemKeys(
      row.source_item_refs,
      `${label}.source_item_refs`,
    ),
    basis_refs: stableKeys(row.basis_refs, `${label}.basis_refs`),
    rationale: string(row.rationale, `${label}.rationale`),
  };
}
