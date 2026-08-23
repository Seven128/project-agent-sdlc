import type {
  DesignResourceImplementationFeasibilityCellV1,
  DesignResourceImplementationFeasibilityV1,
  DesignResourceTechnicalSourceRecordV1,
} from "./design-resource-implementation-feasibility-types.js";
import type { DesignResourceImplementationFeasibilityTargetModel } from "./design-resource-implementation-feasibility-model.js";
import { validateDesignFactRefs } from "./design-resource-implementation-feasibility-validation-facts.js";
import {
  validateFeasibleRealization,
  validateRequiredRealization,
} from "./design-resource-implementation-feasibility-validation-realizations.js";
import {
  assertNoExactVisualValues,
  assertSameSet,
  cellPair,
  invalidFeasibility,
  requireKnownRefs,
  unique,
} from "./design-resource-implementation-feasibility-validation-support.js";

export async function validateFeasibilityCells(
  repository: string,
  document: DesignResourceImplementationFeasibilityV1,
  model: DesignResourceImplementationFeasibilityTargetModel,
  profileRefs: Set<string>,
  sources: Map<string, DesignResourceTechnicalSourceRecordV1>,
): Promise<void> {
  unique(
    document.component_family_cells.map((item) => item.key),
    "cell_key_duplicate",
  );
  unique(
    document.blockers.map((item) => item.key),
    "blocker_key_duplicate",
  );
  const families = new Set(model.component_family_refs);
  const blockers = new Map(document.blockers.map((item) => [item.key, item]));
  const usedBlockers = new Set<string>();
  const cellPairs: string[] = [];
  const realizationKeys: string[] = [];
  for (const cell of document.component_family_cells) {
    cellPairs.push(
      cellPair(cell.component_family_ref, cell.condition_profile_ref),
    );
    await validateCell(
      repository,
      cell,
      document,
      model,
      families,
      profileRefs,
      sources,
      blockers,
      usedBlockers,
      realizationKeys,
    );
  }
  unique(cellPairs, "component_family_condition_cell_duplicate");
  unique(realizationKeys, "realization_key_duplicate");
  if (document.realization_mode !== "reference") {
    const expected = model.component_family_refs.flatMap((familyRef) =>
      [...profileRefs].map((profileRef) => cellPair(familyRef, profileRef)),
    );
    assertSameSet(
      cellPairs,
      expected,
      "component_family_condition_cell_set_mismatch",
    );
  }
  validateBlockers(document, families, profileRefs, sources, usedBlockers);
}

async function validateCell(
  repository: string,
  cell: DesignResourceImplementationFeasibilityCellV1,
  document: DesignResourceImplementationFeasibilityV1,
  model: DesignResourceImplementationFeasibilityTargetModel,
  families: Set<string>,
  profileRefs: Set<string>,
  sources: Map<string, DesignResourceTechnicalSourceRecordV1>,
  blockers: Map<
    string,
    DesignResourceImplementationFeasibilityV1["blockers"][number]
  >,
  usedBlockers: Set<string>,
  realizationKeys: string[],
): Promise<void> {
  validateCellIdentity(cell, document.target_ref, families, profileRefs);
  unique(cell.design_fact_refs, "cell_design_fact_ref_duplicate", cell.key);
  if (
    !cell.design_fact_refs.length &&
    document.realization_mode !== "reference"
  )
    invalidFeasibility("cell_design_fact_refs_required", cell.key);
  validateDesignFactRefs(cell, model, document);
  validateCellBlockers(cell, blockers, usedBlockers);
  if (!cell.feasible_realizations.length && !cell.blocker_refs.length)
    invalidFeasibility("cell_candidate_or_blocker_required", cell.key);
  unique(
    cell.feasible_realizations.map((item) => item.key),
    "cell_realization_key_duplicate",
    cell.key,
  );
  for (const realization of cell.feasible_realizations) {
    realizationKeys.push(realization.key);
    await validateFeasibleRealization(repository, realization, sources);
  }
  validateRequiredRealization(cell, sources);
}

function validateCellBlockers(
  cell: DesignResourceImplementationFeasibilityCellV1,
  blockers: Map<
    string,
    DesignResourceImplementationFeasibilityV1["blockers"][number]
  >,
  usedBlockers: Set<string>,
): void {
  unique(cell.blocker_refs, "cell_blocker_ref_duplicate", cell.key);
  for (const blockerRef of cell.blocker_refs) {
    const blocker = blockers.get(blockerRef);
    if (!blocker)
      invalidFeasibility("cell_blocker_unknown", `${cell.key}:${blockerRef}`);
    if (
      blocker.target_ref !== cell.target_ref ||
      blocker.component_family_ref !== cell.component_family_ref ||
      blocker.condition_profile_ref !== cell.condition_profile_ref
    )
      invalidFeasibility(
        "cell_blocker_scope_mismatch",
        `${cell.key}:${blockerRef}`,
      );
    usedBlockers.add(blockerRef);
  }
}

function validateBlockers(
  document: DesignResourceImplementationFeasibilityV1,
  families: Set<string>,
  profileRefs: Set<string>,
  sources: Map<string, DesignResourceTechnicalSourceRecordV1>,
  usedBlockers: Set<string>,
): void {
  for (const blocker of document.blockers) {
    if (blocker.target_ref !== document.target_ref)
      invalidFeasibility("blocker_target_mismatch", blocker.key);
    if (!families.has(blocker.component_family_ref))
      invalidFeasibility("blocker_component_family_unknown", blocker.key);
    if (!profileRefs.has(blocker.condition_profile_ref))
      invalidFeasibility("blocker_condition_profile_unknown", blocker.key);
    if (!blocker.source_record_refs.length)
      invalidFeasibility("blocker_source_required", blocker.key);
    assertNoExactVisualValues([blocker.description], blocker.key);
    unique(blocker.source_record_refs, "blocker_source_duplicate", blocker.key);
    requireKnownRefs(
      blocker.source_record_refs,
      sources,
      "blocker_source_unknown",
      blocker.key,
    );
    if (!usedBlockers.has(blocker.key))
      invalidFeasibility("blocker_unreferenced", blocker.key);
  }
}

function validateCellIdentity(
  cell: DesignResourceImplementationFeasibilityCellV1,
  targetRef: string,
  families: Set<string>,
  profiles: Set<string>,
): void {
  if (cell.target_ref !== targetRef)
    invalidFeasibility("cell_target_mismatch", cell.key);
  if (!families.has(cell.component_family_ref))
    invalidFeasibility("cell_component_family_unknown", cell.key);
  if (!profiles.has(cell.condition_profile_ref))
    invalidFeasibility("cell_condition_profile_unknown", cell.key);
}
