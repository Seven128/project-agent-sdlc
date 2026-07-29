import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import {
  invalidDesignResourceHandoff,
  requireDesignSourceItemKind,
  requireKnownDesignResourceRef,
  requireNonemptyDesignResourceValues,
  requireUniqueDesignResourceValues,
} from "./design-resource-handoff-validation-primitives.js";

export function validateDesignResourceFactCells(
  handoff: DesignResourceHandoffV1,
  conditions: Map<string, DesignResourceHandoffV1["conditions"][number]>,
  subjects: Map<string, DesignResourceHandoffV1["subjects"][number]>,
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
  sourceItems: Map<string, string>,
): void {
  const variations = new Map(
    handoff.variations.map((item) => [item.key, item]),
  );
  const properties = new Map(
    handoff.properties.map((item) => [item.key, item]),
  );
  const facts = new Map(handoff.facts.map((item) => [item.key, item]));
  const fingerprints: string[] = [];
  for (const cell of handoff.fact_cells) {
    validateFactCellReferences(
      cell,
      conditions,
      subjects,
      targets,
      variations,
      properties,
    );
    validateFactCellBasis(cell, sourceItems);
    validateFactCellDisposition(cell, facts);
    fingerprints.push(factCellFingerprint(cell));
  }
  requireUniqueDesignResourceValues(
    fingerprints,
    "fact_cell_identity_duplicate",
  );
}

function validateFactCellReferences(
  cell: DesignResourceHandoffV1["fact_cells"][number],
  conditions: Map<string, DesignResourceHandoffV1["conditions"][number]>,
  subjects: Map<string, DesignResourceHandoffV1["subjects"][number]>,
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
  variations: Map<string, DesignResourceHandoffV1["variations"][number]>,
  properties: Map<string, DesignResourceHandoffV1["properties"][number]>,
): void {
  requireKnownDesignResourceRef(subjects, cell.subject_ref, "cell_subject");
  requireKnownDesignResourceRef(targets, cell.target_ref, "cell_target");
  requireKnownDesignResourceRef(
    conditions,
    cell.condition_ref,
    "cell_condition",
  );
  requireKnownDesignResourceRef(
    variations,
    cell.variation_ref,
    "cell_variation",
  );
  requireKnownDesignResourceRef(properties, cell.property_ref, "cell_property");
  const subject = subjects.get(cell.subject_ref)!;
  const target = targets.get(cell.target_ref)!;
  const variation = variations.get(cell.variation_ref)!;
  if (!subject.target_refs.includes(cell.target_ref))
    invalidDesignResourceHandoff("fact_cell_target_outside_subject", cell.key);
  if (!target.condition_refs.includes(cell.condition_ref))
    invalidDesignResourceHandoff(
      "fact_cell_condition_outside_target",
      cell.key,
    );
  if (variation.subject_ref !== cell.subject_ref)
    invalidDesignResourceHandoff(
      "fact_cell_variation_subject_mismatch",
      cell.key,
    );
}

function validateFactCellBasis(
  cell: DesignResourceHandoffV1["fact_cells"][number],
  sourceItems: Map<string, string>,
): void {
  requireNonemptyDesignResourceValues(
    cell.source_item_refs,
    `fact_cell_source_item_refs_required:${cell.key}`,
  );
  requireNonemptyDesignResourceValues(
    cell.basis_refs,
    `fact_cell_basis_refs_required:${cell.key}`,
  );
  for (const sourceItemRef of cell.source_item_refs) {
    requireKnownDesignResourceRef(sourceItems, sourceItemRef, "source_item");
    requireDesignSourceItemKind(sourceItems, sourceItemRef);
  }
}

function validateFactCellDisposition(
  cell: DesignResourceHandoffV1["fact_cells"][number],
  facts: Map<string, DesignResourceHandoffV1["facts"][number]>,
): void {
  if (cell.disposition === "covered") {
    if (cell.fact_ref === null)
      invalidDesignResourceHandoff("covered_fact_cell_fact_required", cell.key);
    requireKnownDesignResourceRef(facts, cell.fact_ref, "cell_fact");
    return;
  }
  if (cell.fact_ref !== null)
    invalidDesignResourceHandoff(
      "noncovered_fact_cell_fact_forbidden",
      cell.key,
    );
  if (
    cell.disposition === "decision_required" ||
    cell.disposition === "unavailable"
  )
    invalidDesignResourceHandoff("unresolved_fact_cell", cell.key);
}

function factCellFingerprint(
  cell: DesignResourceHandoffV1["fact_cells"][number],
): string {
  return [
    cell.subject_ref,
    cell.target_ref,
    cell.condition_ref,
    cell.variation_ref,
    cell.property_ref,
  ].join("\0");
}
