import type { SemanticFactManifestIndexV1 } from "./semantic-fact-policy.js";
import {
  assertSameSemanticFactSet,
  requireSemanticFactBasis,
  requireSemanticFactSubset,
  semanticFactCellIdentity,
  semanticFactInvalid,
  uniqueNonemptySemanticFacts,
  validateSemanticFactLocatedValue,
  validateSemanticFactQuantifier,
} from "./semantic-fact-policy-primitives.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export function validateSemanticFactClosure(
  manifest: SemanticFactManifestV1,
  units: SemanticFactManifestIndexV1["unit_by_ref"],
): void {
  const propertyByRef = new Map(
    manifest.property_dispositions.map((item) => [item.key, item]),
  );
  const conditionByRef = new Map(
    manifest.conditions.map((item) => [item.key, item]),
  );
  const expectedCells: string[] = [];
  for (const property of manifest.property_dispositions)
    for (const unitRef of property.applicable_unit_refs) {
      const unit = units.get(unitRef)!;
      for (const conditionRef of property.condition_refs)
        if (conditionByRef.get(conditionRef)?.outcome_ref === unit.outcome_ref)
          expectedCells.push(
            semanticFactCellIdentity(unitRef, conditionRef, property.key),
          );
    }
  assertSameSemanticFactSet(
    manifest.fact_cells.map((item) =>
      semanticFactCellIdentity(
        item.unit_ref,
        item.condition_ref,
        item.property_ref,
      ),
    ),
    expectedCells,
    "fact_cell_universe",
  );
  const factByRef = new Map(manifest.facts.map((item) => [item.key, item]));
  const specifiedRefs: string[] = [];
  for (const cell of manifest.fact_cells)
    validateFactCell(
      cell,
      units,
      propertyByRef,
      conditionByRef,
      factByRef,
      specifiedRefs,
    );
  assertSameSemanticFactSet(
    specifiedRefs,
    manifest.facts.map((item) => item.key),
    "specified_fact_set",
  );
  for (const fact of manifest.facts) validateFact(manifest, fact);
}

function validateFactCell(
  cell: SemanticFactManifestV1["fact_cells"][number],
  units: SemanticFactManifestIndexV1["unit_by_ref"],
  propertyByRef: Map<
    string,
    SemanticFactManifestV1["property_dispositions"][number]
  >,
  conditionByRef: Map<string, SemanticFactManifestV1["conditions"][number]>,
  factByRef: Map<string, SemanticFactManifestV1["facts"][number]>,
  specifiedRefs: string[],
): void {
  const unit = units.get(cell.unit_ref);
  const property = propertyByRef.get(cell.property_ref);
  const condition = conditionByRef.get(cell.condition_ref);
  if (!unit || !property || !condition)
    semanticFactInvalid(
      "fact_cell_reference_unknown",
      `${cell.key}:${cell.unit_ref}:${cell.condition_ref}:${cell.property_ref}`,
    );
  if (
    cell.outcome_ref !== unit.outcome_ref ||
    condition.outcome_ref !== unit.outcome_ref
  )
    semanticFactInvalid("fact_cell_outcome_mismatch", cell.key);
  if (
    cell.disposition === "decision_required" ||
    cell.disposition === "unavailable"
  )
    semanticFactInvalid(
      "fact_cell_unresolved",
      `${cell.key}:${cell.disposition}`,
    );
  if (cell.disposition === "specified") {
    if (!cell.fact_ref)
      semanticFactInvalid("specified_fact_cell_ref_required", cell.key);
    specifiedRefs.push(cell.fact_ref);
    const fact = factByRef.get(cell.fact_ref);
    if (!fact)
      semanticFactInvalid(
        "fact_cell_fact_unknown",
        `${cell.key}:${cell.fact_ref}`,
      );
    if (
      fact.cell_ref !== cell.key ||
      fact.outcome_ref !== cell.outcome_ref ||
      fact.unit_ref !== cell.unit_ref ||
      fact.condition_ref !== cell.condition_ref ||
      fact.property_ref !== cell.property_ref ||
      fact.family_ref !== unit.family_ref ||
      fact.value_kind !== property.value_kind
    )
      semanticFactInvalid("fact_cell_fact_identity_mismatch", cell.key);
  } else if (cell.fact_ref)
    semanticFactInvalid("non_specified_fact_cell_ref_forbidden", cell.key);
  requireSemanticFactBasis(cell, `fact_cell:${cell.key}`);
}

function validateFact(
  manifest: SemanticFactManifestV1,
  fact: SemanticFactManifestV1["facts"][number],
): void {
  uniqueNonemptySemanticFacts(
    fact.source_item_refs,
    `fact_source_items:${fact.key}`,
  );
  requireSemanticFactSubset(
    fact.source_item_refs,
    manifest.scope.source_item_refs,
    "fact_source_item_unknown",
    fact.key,
  );
  if (!fact.provenance.basis_refs.length)
    semanticFactInvalid("fact_provenance_basis_required", fact.key);
  if (
    fact.provenance.kind === "logically_derived" &&
    !fact.provenance.derivation
  )
    semanticFactInvalid("fact_derivation_required", fact.key);
  if (
    fact.provenance.kind !== "logically_derived" &&
    fact.provenance.derivation
  )
    semanticFactInvalid("fact_derivation_forbidden", fact.key);
  if (
    fact.observation_sensitivity === "protected" &&
    fact.expected.representation !== "digest_only"
  )
    semanticFactInvalid("protected_fact_digest_only_required", fact.key);
  if (
    fact.observation_sensitivity === "plain" &&
    fact.expected.representation === "digest_only"
  )
    semanticFactInvalid("plain_fact_digest_only_forbidden", fact.key);
  validateSemanticFactLocatedValue(
    manifest,
    fact.expected,
    `fact:${fact.key}:expected`,
  );
  validateSemanticFactQuantifier(manifest, fact);
}
