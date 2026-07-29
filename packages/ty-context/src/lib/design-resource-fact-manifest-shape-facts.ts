import {
  DESIGN_RESOURCE_COMPARATORS,
  DESIGN_RESOURCE_INSPECTOR_CAPABILITIES,
  DESIGN_RESOURCE_PROPERTY_FAMILIES,
  DESIGN_RESOURCE_VALUE_KINDS,
  type DesignResourceFactCellV1,
  type DesignResourceProofObligationV1,
  type DesignResourcePropertyDefinitionV1,
} from "./design-resource-fact-manifest-types.js";
import { parseDesignResourceLocatedDigest } from "./design-resource-fact-shape-primitives.js";
import {
  DESIGN_RESOURCE_DIMENSIONS,
  DESIGN_RESOURCE_VERIFICATION_METHODS,
} from "./design-resource-handoff-types.js";
import {
  contractKey,
  sourceItemKeys,
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import {
  array,
  boolean,
  literal,
  nullable,
  object,
  string,
} from "./long-task-shape-primitives.js";

export function parseDesignResourceProperties(
  value: unknown,
  label = "design_resource_handoff.properties",
): DesignResourcePropertyDefinitionV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "family",
      "dimension",
      "value_kind",
      "required_methods",
      "standard",
      "inspector_capability_refs",
      "census_refs",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      family: literal(
        row.family,
        DESIGN_RESOURCE_PROPERTY_FAMILIES,
        `${itemLabel}.family`,
      ),
      dimension: literal(
        row.dimension,
        DESIGN_RESOURCE_DIMENSIONS,
        `${itemLabel}.dimension`,
      ),
      value_kind: literal(
        row.value_kind,
        DESIGN_RESOURCE_VALUE_KINDS,
        `${itemLabel}.value_kind`,
      ),
      required_methods: array(
        row.required_methods,
        `${itemLabel}.required_methods`,
      ).map((method, methodIndex) =>
        literal(
          method,
          DESIGN_RESOURCE_VERIFICATION_METHODS,
          `${itemLabel}.required_methods[${methodIndex}]`,
        ),
      ),
      standard: boolean(row.standard, `${itemLabel}.standard`),
      inspector_capability_refs: array(
        row.inspector_capability_refs,
        `${itemLabel}.inspector_capability_refs`,
      ).map((capability, capabilityIndex) =>
        literal(
          capability,
          DESIGN_RESOURCE_INSPECTOR_CAPABILITIES,
          `${itemLabel}.inspector_capability_refs[${capabilityIndex}]`,
        ),
      ),
      census_refs: stableKeys(row.census_refs, `${itemLabel}.census_refs`),
    };
  });
}

export function parseDesignResourceFactCells(
  value: unknown,
  label = "design_resource_handoff.fact_cells",
): DesignResourceFactCellV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "subject_ref",
      "target_ref",
      "condition_ref",
      "variation_ref",
      "property_ref",
      "disposition",
      "fact_ref",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      subject_ref: stableKey(row.subject_ref, `${itemLabel}.subject_ref`),
      target_ref: contractKey(row.target_ref, `${itemLabel}.target_ref`),
      condition_ref: contractKey(
        row.condition_ref,
        `${itemLabel}.condition_ref`,
      ),
      variation_ref: stableKey(row.variation_ref, `${itemLabel}.variation_ref`),
      property_ref: stableKey(row.property_ref, `${itemLabel}.property_ref`),
      disposition: literal(
        row.disposition,
        [
          "covered",
          "not_applicable",
          "excluded_by_scope",
          "decision_required",
          "unavailable",
        ] as const,
        `${itemLabel}.disposition`,
      ),
      fact_ref: nullable(row.fact_ref, (factRef) =>
        stableKey(factRef, `${itemLabel}.fact_ref`),
      ),
      source_item_refs: sourceItemKeys(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: stableKeys(row.basis_refs, `${itemLabel}.basis_refs`),
      rationale: string(row.rationale, `${itemLabel}.rationale`),
    };
  });
}

export function parseDesignResourceProofObligations(
  value: unknown,
  label = "design_resource_handoff.proof_obligations",
): DesignResourceProofObligationV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "fact_ref",
      "method",
      "comparison",
      "oracle_ref",
      "environment_ref",
    ]);
    const comparison = object(row.comparison, `${itemLabel}.comparison`, [
      "comparator",
      "mode",
      "parameters",
      "tolerance",
      "mask",
    ]);
    const comparator = parseComparator(
      comparison.comparator,
      `${itemLabel}.comparison.comparator`,
    );
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      fact_ref: stableKey(row.fact_ref, `${itemLabel}.fact_ref`),
      method: literal(
        row.method,
        DESIGN_RESOURCE_VERIFICATION_METHODS,
        `${itemLabel}.method`,
      ),
      comparison: {
        comparator,
        mode: literal(
          comparison.mode,
          ["exact", "tolerance"] as const,
          `${itemLabel}.comparison.mode`,
        ),
        parameters: parseDesignResourceLocatedDigest(
          comparison.parameters,
          `${itemLabel}.comparison.parameters`,
        ),
        tolerance: nullable(comparison.tolerance, (entry) =>
          parseDesignResourceLocatedDigest(
            entry,
            `${itemLabel}.comparison.tolerance`,
          ),
        ),
        mask: nullable(comparison.mask, (entry) =>
          parseDesignResourceLocatedDigest(
            entry,
            `${itemLabel}.comparison.mask`,
          ),
        ),
      },
      oracle_ref: stableKey(row.oracle_ref, `${itemLabel}.oracle_ref`),
      environment_ref: stableKey(
        row.environment_ref,
        `${itemLabel}.environment_ref`,
      ),
    };
  });
}

function parseComparator(value: unknown, label: string): string {
  const comparator = string(value, label);
  if (
    !DESIGN_RESOURCE_COMPARATORS.includes(
      comparator as (typeof DESIGN_RESOURCE_COMPARATORS)[number],
    ) &&
    !/^custom\.[a-z0-9][a-z0-9._-]*$/u.test(comparator)
  )
    throw new Error(
      `design_resource_handoff_invalid:${label}:must be a standard comparator or custom.*`,
    );
  return comparator;
}
