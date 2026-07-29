import { designFactEvidenceIsCompatible } from "./design-resource-fact-policy.js";
import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import {
  invalidDesignResourceHandoff,
  requireDesignSourceItemKind,
  requireKnownDesignResourceRef,
  requireNonemptyDesignResourceValues,
  requireUniqueDesignResourceValues,
} from "./design-resource-handoff-validation-primitives.js";

export function validateDesignResourceFactRecords(
  handoff: DesignResourceHandoffV1,
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
  conditions: Map<string, DesignResourceHandoffV1["conditions"][number]>,
  subjects: Map<string, DesignResourceHandoffV1["subjects"][number]>,
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
  sourceItems: Map<string, string>,
): void {
  const variations = new Map(
    handoff.variations.map((item) => [item.key, item]),
  );
  const properties = new Map(
    handoff.properties.map((item) => [item.key, item]),
  );
  const factCells = new Map(handoff.fact_cells.map((item) => [item.key, item]));
  const lineageNodes = new Map(
    handoff.lineage_nodes.map((item) => [item.key, item]),
  );
  for (const fact of handoff.facts) {
    validateFactReferences(
      fact,
      handoff.scope.surface_keys,
      conditions,
      subjects,
      targets,
      variations,
      properties,
      factCells,
    );
    validateFactSources(fact, sourceItems);
    validateFactEvidence(
      fact,
      targets.get(fact.target_ref)!,
      evidence,
      resources,
    );
    validateFactResources(
      fact,
      targets.get(fact.target_ref)!,
      resources,
      lineageNodes,
    );
  }
}

function validateFactReferences(
  fact: DesignResourceHandoffV1["facts"][number],
  scopedSurfaceKeys: string[],
  conditions: Map<string, DesignResourceHandoffV1["conditions"][number]>,
  subjects: Map<string, DesignResourceHandoffV1["subjects"][number]>,
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
  variations: Map<string, DesignResourceHandoffV1["variations"][number]>,
  properties: Map<string, DesignResourceHandoffV1["properties"][number]>,
  factCells: Map<string, DesignResourceHandoffV1["fact_cells"][number]>,
): void {
  requireKnownDesignResourceRef(subjects, fact.subject_ref, "subject");
  requireKnownDesignResourceRef(targets, fact.target_ref, "target");
  requireKnownDesignResourceRef(conditions, fact.condition_ref, "condition");
  requireKnownDesignResourceRef(variations, fact.variation_ref, "variation");
  requireKnownDesignResourceRef(properties, fact.property_ref, "property");
  requireKnownDesignResourceRef(factCells, fact.cell_ref, "fact_cell");
  const subject = subjects.get(fact.subject_ref)!;
  const target = targets.get(fact.target_ref)!;
  const variation = variations.get(fact.variation_ref)!;
  const property = properties.get(fact.property_ref)!;
  const cell = factCells.get(fact.cell_ref)!;
  if (!subject.target_refs.includes(fact.target_ref))
    invalidDesignResourceHandoff(
      "fact_target_outside_subject",
      `${fact.key}:${fact.subject_ref}:${fact.target_ref}`,
    );
  if (!target.condition_refs.includes(fact.condition_ref))
    invalidDesignResourceHandoff(
      "fact_condition_outside_target",
      `${fact.key}:${fact.target_ref}:${fact.condition_ref}`,
    );
  if (variation.subject_ref !== fact.subject_ref)
    invalidDesignResourceHandoff(
      "fact_variation_subject_mismatch",
      `${fact.key}:${fact.variation_ref}:${fact.subject_ref}`,
    );
  if (
    property.dimension !== fact.dimension ||
    property.value_kind !== fact.value_kind
  )
    invalidDesignResourceHandoff(
      "fact_property_definition_mismatch",
      `${fact.key}:${fact.property_ref}`,
    );
  if (
    cell.fact_ref !== fact.key ||
    cell.disposition !== "covered" ||
    cell.subject_ref !== fact.subject_ref ||
    cell.target_ref !== fact.target_ref ||
    cell.condition_ref !== fact.condition_ref ||
    cell.variation_ref !== fact.variation_ref ||
    cell.property_ref !== fact.property_ref
  )
    invalidDesignResourceHandoff("fact_cell_mismatch", fact.key);
  if (
    fact.observation_scope === "full_target" &&
    (subject.kind !== "surface" ||
      !subject.stable_keys.some((key) => scopedSurfaceKeys.includes(key)))
  )
    invalidDesignResourceHandoff(
      "full_target_fact_surface_required",
      `${fact.key}:${fact.subject_ref}`,
    );
}

function validateFactSources(
  fact: DesignResourceHandoffV1["facts"][number],
  sourceItems: Map<string, string>,
): void {
  requireNonemptyDesignResourceValues(
    fact.evidence_refs,
    `fact_evidence_refs_required:${fact.key}`,
  );
  requireNonemptyDesignResourceValues(
    fact.source_item_refs,
    `fact_source_item_refs_required:${fact.key}`,
  );
  requireUniqueDesignResourceValues(
    fact.evidence_refs,
    `fact_evidence_ref_duplicate:${fact.key}`,
  );
  requireUniqueDesignResourceValues(
    fact.source_item_refs,
    `fact_source_item_ref_duplicate:${fact.key}`,
  );
  for (const sourceItemRef of fact.source_item_refs) {
    requireKnownDesignResourceRef(sourceItems, sourceItemRef, "source_item");
    requireDesignSourceItemKind(sourceItems, sourceItemRef);
  }
}

function validateFactEvidence(
  fact: DesignResourceHandoffV1["facts"][number],
  target: DesignResourceHandoffV1["targets"][number],
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
): void {
  let exactResourceEvidence = false;
  for (const evidenceRef of fact.evidence_refs) {
    requireKnownDesignResourceRef(evidence, evidenceRef, "evidence");
    const item = evidence.get(evidenceRef)!;
    if (!target.resource_refs.includes(item.resource_ref))
      invalidDesignResourceHandoff(
        "fact_evidence_outside_target",
        `${fact.key}:${evidenceRef}:${fact.target_ref}`,
      );
    if (!item.condition_refs.includes(fact.condition_ref))
      invalidDesignResourceHandoff(
        "fact_evidence_condition_mismatch",
        `${fact.key}:${evidenceRef}:${fact.condition_ref}`,
      );
    if (!designFactEvidenceIsCompatible(fact.dimension, item.kind))
      invalidDesignResourceHandoff(
        "fact_evidence_kind_incompatible",
        `${fact.key}:${fact.dimension}:${evidenceRef}:${item.kind}`,
      );
    if (resources.get(item.resource_ref)?.role === "exact_target")
      exactResourceEvidence = true;
  }
  if (fact.observation_scope === "full_target" && !exactResourceEvidence)
    invalidDesignResourceHandoff(
      "full_target_fact_exact_resource_required",
      fact.key,
    );
}

function validateFactResources(
  fact: DesignResourceHandoffV1["facts"][number],
  target: DesignResourceHandoffV1["targets"][number],
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
  lineageNodes: Map<string, DesignResourceHandoffV1["lineage_nodes"][number]>,
): void {
  for (const resourceRef of [
    fact.value.locator.resource_ref,
    fact.lineage.resolved_value.locator.resource_ref,
  ]) {
    requireKnownDesignResourceRef(resources, resourceRef, "fact_resource");
    if (!target.resource_refs.includes(resourceRef))
      invalidDesignResourceHandoff(
        "fact_value_outside_target",
        `${fact.key}:${resourceRef}`,
      );
  }
  for (const ref of [
    ...fact.lineage.token_chain_refs,
    ...fact.lineage.override_chain_refs,
  ])
    requireKnownDesignResourceRef(lineageNodes, ref, "fact_lineage_node");
}
