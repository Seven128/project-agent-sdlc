import {
  isCustomSemanticFactName,
  SEMANTIC_FACT_STANDARD_FAMILIES,
} from "./semantic-fact-catalog.js";
import type { SemanticFactManifestIndexV1 } from "./semantic-fact-policy.js";
import {
  assertNoSemanticFactParentCycle,
  assertSameSemanticFactSet,
  requireSemanticFactBasis,
  requireSemanticFactSubset,
  semanticFactInvalid,
  uniqueNonemptySemanticFacts,
  uniqueSemanticFacts,
  validateSemanticFactLocatedValue,
} from "./semantic-fact-policy-primitives.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export function validateSemanticFactFamilyClosure(
  manifest: SemanticFactManifestV1,
): void {
  const standardRows = manifest.family_dispositions.filter(
    (item) => item.standard,
  );
  uniqueSemanticFacts(
    manifest.family_dispositions.flatMap((item) =>
      item.outcome_refs.map((outcomeRef) => `${outcomeRef}\0${item.family}`),
    ),
    "family_outcome_identity",
  );
  assertSameSemanticFactSet(
    standardRows.map((item) => item.family),
    [...SEMANTIC_FACT_STANDARD_FAMILIES],
    "standard_family_universe",
  );
  for (const family of manifest.family_dispositions) {
    if (
      family.standard !==
      SEMANTIC_FACT_STANDARD_FAMILIES.includes(
        family.family as (typeof SEMANTIC_FACT_STANDARD_FAMILIES)[number],
      )
    )
      semanticFactInvalid("family_standard_flag_mismatch", family.family);
    if (!family.standard && !isCustomSemanticFactName(family.family))
      semanticFactInvalid("custom_family_name_required", family.family);
    uniqueNonemptySemanticFacts(
      family.outcome_refs,
      `family_outcomes:${family.key}`,
    );
    requireSemanticFactSubset(
      family.outcome_refs,
      manifest.scope.outcome_refs,
      "family_outcome_unknown",
      family.key,
    );
    requireSemanticFactBasis(family, `family:${family.key}`);
    if (
      family.disposition === "decision_required" ||
      family.disposition === "unavailable"
    )
      semanticFactInvalid(
        "family_unresolved",
        `${family.key}:${family.disposition}`,
      );
  }
  for (const outcomeRef of manifest.scope.outcome_refs)
    for (const family of SEMANTIC_FACT_STANDARD_FAMILIES) {
      const rows = standardRows.filter(
        (item) =>
          item.family === family && item.outcome_refs.includes(outcomeRef),
      );
      if (rows.length !== 1)
        semanticFactInvalid(
          "standard_family_outcome_disposition_required",
          `${outcomeRef}:${family}:${rows.length}`,
        );
    }
}

export function validateSemanticFactUnits(
  manifest: SemanticFactManifestV1,
): SemanticFactManifestIndexV1["unit_by_ref"] {
  const familyByRef = new Map(
    manifest.family_dispositions.map((item) => [item.key, item]),
  );
  const unitRows = [
    ...manifest.subjects,
    ...manifest.relations,
    ...manifest.populations,
  ];
  uniqueSemanticFacts(
    unitRows.map((item) => item.key),
    "semantic_unit_key",
  );
  const units = new Map(unitRows.map((item) => [item.key, item]));
  validateSemanticFactUnitFamilies(unitRows, familyByRef);
  validateSemanticFactSubjectParents(manifest, units);
  validateSemanticFactRelations(manifest, units);
  validateSemanticFactPopulations(manifest, units);
  validateSemanticFactApplicableFamilyMembers(manifest, unitRows);
  return units;
}

type SemanticUnit =
  | SemanticFactManifestV1["subjects"][number]
  | SemanticFactManifestV1["relations"][number]
  | SemanticFactManifestV1["populations"][number];
type SemanticFamily = SemanticFactManifestV1["family_dispositions"][number];

function validateSemanticFactUnitFamilies(
  units: SemanticUnit[],
  familyByRef: Map<string, SemanticFamily>,
): void {
  for (const unit of units) {
    const family = familyByRef.get(unit.family_ref);
    if (!family)
      semanticFactInvalid(
        "unit_family_unknown",
        `${unit.key}:${unit.family_ref}`,
      );
    if (family.disposition !== "applicable")
      semanticFactInvalid(
        "unit_family_not_applicable",
        `${unit.key}:${unit.family_ref}:${family.disposition}`,
      );
    if (
      unit.outcome_ref !== undefined &&
      !family.outcome_refs.includes(unit.outcome_ref)
    )
      semanticFactInvalid(
        "unit_outcome_family_mismatch",
        `${unit.key}:${unit.outcome_ref}:${unit.family_ref}`,
      );
    requireSemanticFactBasis(unit, `unit:${unit.key}`);
  }
}

function validateSemanticFactSubjectParents(
  manifest: SemanticFactManifestV1,
  units: Map<string, SemanticUnit>,
): void {
  for (const subject of manifest.subjects) {
    if (subject.parent_ref && !units.has(subject.parent_ref))
      semanticFactInvalid(
        "subject_parent_unknown",
        `${subject.key}:${subject.parent_ref}`,
      );
    assertNoSemanticFactParentCycle(subject.key, manifest.subjects);
  }
}

function validateSemanticFactRelations(
  manifest: SemanticFactManifestV1,
  units: Map<string, SemanticUnit>,
): void {
  for (const relation of manifest.relations) {
    if (relation.endpoints.length < 2)
      semanticFactInvalid("relation_endpoints_required", relation.key);
    uniqueSemanticFacts(
      relation.endpoints.map((item) => item.role),
      `relation_endpoint_role:${relation.key}`,
    );
    for (const endpoint of relation.endpoints)
      if (!units.has(endpoint.unit_ref))
        semanticFactInvalid(
          "relation_endpoint_unknown",
          `${relation.key}:${endpoint.unit_ref}`,
        );
  }
}

function validateSemanticFactPopulations(
  manifest: SemanticFactManifestV1,
  units: Map<string, SemanticUnit>,
): void {
  for (const population of manifest.populations) {
    uniqueSemanticFacts(
      population.member_unit_refs,
      `population_members:${population.key}`,
    );
    for (const unitRef of population.member_unit_refs)
      if (!units.has(unitRef))
        semanticFactInvalid(
          "population_member_unknown",
          `${population.key}:${unitRef}`,
        );
    if (population.kind === "static" && !population.member_unit_refs.length)
      semanticFactInvalid("static_population_members_required", population.key);
    uniqueSemanticFacts(
      population.exclusion_refs,
      `population_exclusion_refs:${population.key}`,
    );
    if (population.kind === "static") {
      if (
        population.universe.representation !== "inline" ||
        !Array.isArray(population.universe.value) ||
        population.universe.value.some((item) => typeof item !== "string")
      )
        semanticFactInvalid(
          "static_population_inline_universe_required",
          population.key,
        );
      assertSameSemanticFactSet(
        population.universe.value as string[],
        population.member_unit_refs,
        `static_population_universe:${population.key}`,
      );
    }
    validateSemanticFactLocatedValue(
      manifest,
      population.universe,
      `population:${population.key}:universe`,
    );
  }
}

function validateSemanticFactApplicableFamilyMembers(
  manifest: SemanticFactManifestV1,
  units: SemanticUnit[],
): void {
  for (const family of manifest.family_dispositions) {
    const members = units.filter((item) => item.family_ref === family.key);
    if (family.disposition === "applicable") {
      for (const outcomeRef of family.outcome_refs)
        if (!members.some((item) => item.outcome_ref === outcomeRef))
          semanticFactInvalid(
            "applicable_family_unit_required",
            `${family.key}:${outcomeRef}`,
          );
    } else if (members.length)
      semanticFactInvalid(
        "inapplicable_family_units_forbidden",
        `${family.key}:${members.map((item) => item.key).join(",")}`,
      );
  }
}
