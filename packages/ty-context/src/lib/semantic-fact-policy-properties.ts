import {
  isCustomSemanticFactName,
  SEMANTIC_FACT_PROOF_METHODS,
  SEMANTIC_FACT_STANDARD_PROPERTIES,
} from "./semantic-fact-catalog.js";
import type { SemanticFactManifestIndexV1 } from "./semantic-fact-policy.js";
import {
  assertSameSemanticFactSet,
  requireSemanticFactBasis,
  semanticFactInvalid,
  uniqueNonemptySemanticFacts,
  uniqueSemanticFacts,
} from "./semantic-fact-policy-primitives.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export function validateSemanticFactPropertyClosure(
  manifest: SemanticFactManifestV1,
  units: SemanticFactManifestIndexV1["unit_by_ref"],
): void {
  const conditionByRef = new Map(
    manifest.conditions.map((item) => [item.key, item]),
  );
  for (const family of manifest.family_dispositions) {
    const properties = manifest.property_dispositions.filter(
      (item) => item.family_ref === family.key,
    );
    uniqueSemanticFacts(
      properties.map((item) => item.property),
      `family_property_identity:${family.key}`,
    );
    if (family.disposition !== "applicable") {
      if (properties.length)
        semanticFactInvalid(
          "inapplicable_family_properties_forbidden",
          `${family.key}:${properties.map((item) => item.key).join(",")}`,
        );
      continue;
    }
    const familyUnits = [...units.values()].filter(
      (item) => item.family_ref === family.key,
    );
    const standardProperties = family.standard
      ? SEMANTIC_FACT_STANDARD_PROPERTIES[
          family.family as keyof typeof SEMANTIC_FACT_STANDARD_PROPERTIES
        ]
      : [];
    if (!properties.length)
      semanticFactInvalid("applicable_family_property_required", family.key);
    assertSameSemanticFactSet(
      properties.filter((item) => item.standard).map((item) => item.property),
      [...standardProperties],
      `standard_property_universe:${family.key}`,
    );
    for (const property of properties)
      validateProperty(
        manifest,
        property,
        family,
        familyUnits,
        standardProperties,
        units,
        conditionByRef,
      );
    for (const unit of familyUnits)
      if (
        !properties.some((property) =>
          property.applicable_unit_refs.includes(unit.key),
        )
      )
        semanticFactInvalid(
          "applicable_unit_property_required",
          `${family.key}:${unit.key}`,
        );
  }
}

function validateProperty(
  manifest: SemanticFactManifestV1,
  property: SemanticFactManifestV1["property_dispositions"][number],
  family: SemanticFactManifestV1["family_dispositions"][number],
  familyUnits: Array<
    SemanticFactManifestIndexV1["unit_by_ref"] extends Map<string, infer Unit>
      ? Unit
      : never
  >,
  standardProperties: readonly string[],
  units: SemanticFactManifestIndexV1["unit_by_ref"],
  conditionByRef: Map<string, SemanticFactManifestV1["conditions"][number]>,
): void {
  const knownStandard = standardProperties.includes(property.property);
  if (property.standard !== knownStandard)
    semanticFactInvalid(
      "property_standard_flag_mismatch",
      `${family.key}:${property.property}`,
    );
  if (!property.standard && !isCustomSemanticFactName(property.property))
    semanticFactInvalid("custom_property_name_required", property.property);
  const partitions = [
    property.applicable_unit_refs,
    property.not_applicable_unit_refs,
    property.decision_required_unit_refs,
    property.unavailable_unit_refs,
  ];
  uniqueSemanticFacts(
    partitions.flat(),
    `property_unit_partition:${property.key}`,
  );
  assertSameSemanticFactSet(
    partitions.flat(),
    familyUnits.map((item) => item.key),
    `property_unit_universe:${property.key}`,
  );
  if (
    property.decision_required_unit_refs.length ||
    property.unavailable_unit_refs.length
  )
    semanticFactInvalid(
      "property_unresolved",
      `${property.key}:${[
        ...property.decision_required_unit_refs,
        ...property.unavailable_unit_refs,
      ].join(",")}`,
    );
  uniqueSemanticFacts(
    property.required_methods,
    `property_required_methods:${property.key}`,
  );
  uniqueSemanticFacts(
    property.required_evidence_capabilities,
    `property_required_capabilities:${property.key}`,
  );
  validatePropertyProof(property);
  validatePropertyConditions(manifest, property, units, conditionByRef);
  requireSemanticFactBasis(property, `property:${property.key}`);
}

function validatePropertyProof(
  property: SemanticFactManifestV1["property_dispositions"][number],
): void {
  if (property.applicable_unit_refs.length) {
    uniqueNonemptySemanticFacts(
      property.required_methods,
      `property_required_methods:${property.key}`,
    );
    if (!property.required_evidence_capabilities.includes("semantic_fact"))
      semanticFactInvalid(
        "property_semantic_fact_capability_required",
        property.key,
      );
    for (const method of property.required_methods)
      if (
        !SEMANTIC_FACT_PROOF_METHODS.includes(
          method as (typeof SEMANTIC_FACT_PROOF_METHODS)[number],
        ) &&
        !isCustomSemanticFactName(method)
      )
        semanticFactInvalid(
          "property_proof_method_unknown",
          `${property.key}:${method}`,
        );
  } else if (
    property.required_methods.length ||
    property.required_evidence_capabilities.length ||
    property.condition_refs.length
  )
    semanticFactInvalid("inapplicable_property_proof_forbidden", property.key);
}

function validatePropertyConditions(
  manifest: SemanticFactManifestV1,
  property: SemanticFactManifestV1["property_dispositions"][number],
  units: SemanticFactManifestIndexV1["unit_by_ref"],
  conditionByRef: Map<string, SemanticFactManifestV1["conditions"][number]>,
): void {
  uniqueSemanticFacts(
    property.condition_refs,
    `property_condition_refs:${property.key}`,
  );
  for (const conditionRef of property.condition_refs) {
    const condition = conditionByRef.get(conditionRef);
    if (!condition)
      semanticFactInvalid(
        "property_condition_unknown",
        `${property.key}:${conditionRef}`,
      );
    if (
      !property.applicable_unit_refs.some(
        (unitRef) => units.get(unitRef)?.outcome_ref === condition.outcome_ref,
      )
    )
      semanticFactInvalid(
        "property_condition_outcome_unused",
        `${property.key}:${conditionRef}`,
      );
  }
  for (const unitRef of property.applicable_unit_refs) {
    const unit = units.get(unitRef)!;
    const expectedConditions = manifest.conditions
      .filter((item) => item.outcome_ref === unit.outcome_ref)
      .map((item) => item.key);
    assertSameSemanticFactSet(
      property.condition_refs.filter(
        (conditionRef) =>
          conditionByRef.get(conditionRef)?.outcome_ref === unit.outcome_ref,
      ),
      expectedConditions,
      `property_condition_universe:${property.key}:${unitRef}`,
    );
  }
}
