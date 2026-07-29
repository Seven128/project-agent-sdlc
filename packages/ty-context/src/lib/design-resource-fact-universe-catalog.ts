import {
  DESIGN_RESOURCE_STANDARD_PROPERTIES,
  DESIGN_RESOURCE_STANDARD_PROPERTY_BY_KEY,
} from "./design-resource-fact-manifest-catalog.js";
import type { DesignResourceObservableFactManifestV1 } from "./design-resource-fact-manifest-types.js";
import { designFactMethodIsCompatible } from "./design-resource-fact-policy.js";
import {
  factCellFingerprint,
  invalid,
  nonempty,
  refsKnown,
  sameSet,
  sameSetValue,
  unique,
  validateBasis,
} from "./design-resource-fact-universe-helpers.js";

export function validateManifestPropertyCatalog(
  manifest: DesignResourceObservableFactManifestV1,
  census: Map<
    string,
    DesignResourceObservableFactManifestV1["inspector"]["census"][number]
  >,
): void {
  const properties = new Map(
    manifest.properties.map((property) => [property.key, property]),
  );
  for (const standard of DESIGN_RESOURCE_STANDARD_PROPERTIES) {
    const actual = properties.get(standard.key);
    if (!actual) invalid("manifest_standard_property_missing", standard.key);
    if (
      !actual.standard ||
      actual.family !== standard.family ||
      actual.dimension !== standard.dimension ||
      actual.value_kind !== standard.value_kind ||
      !sameSetValue(actual.required_methods, standard.required_methods) ||
      !sameSetValue(
        actual.inspector_capability_refs,
        standard.inspector_capability_refs,
      )
    )
      invalid("manifest_standard_property_definition_mismatch", standard.key);
  }
  for (const property of manifest.properties)
    validateProperty(property, manifest, census);
}

function validateProperty(
  property: DesignResourceObservableFactManifestV1["properties"][number],
  manifest: DesignResourceObservableFactManifestV1,
  census: Map<string, unknown>,
): void {
  unique(
    property.required_methods,
    `manifest_property_required_method_duplicate:${property.key}`,
  );
  nonempty(
    property.required_methods,
    `manifest_property_required_method_required:${property.key}`,
  );
  for (const method of property.required_methods)
    if (!designFactMethodIsCompatible(property.dimension, method))
      invalid(
        "manifest_property_required_method_incompatible",
        `${property.key}:${property.dimension}:${method}`,
      );
  unique(
    property.inspector_capability_refs,
    `manifest_property_capability_duplicate:${property.key}`,
  );
  nonempty(
    property.inspector_capability_refs,
    `manifest_property_capability_required:${property.key}`,
  );
  for (const capability of property.inspector_capability_refs)
    if (!manifest.inspector.capability_refs.includes(capability))
      invalid(
        "manifest_inspector_property_capability_missing",
        `${property.key}:${capability}`,
      );
  if (property.standard) {
    if (!DESIGN_RESOURCE_STANDARD_PROPERTY_BY_KEY.has(property.key))
      invalid("manifest_unknown_standard_property", property.key);
  } else {
    if (!property.key.startsWith("custom."))
      invalid("manifest_custom_property_namespace_required", property.key);
    nonempty(
      property.census_refs,
      `manifest_custom_property_census_required:${property.key}`,
    );
  }
  refsKnown(
    property.census_refs,
    census,
    "manifest_property_census_unknown",
    property.key,
  );
}

export function validateManifestCensusOwnership(
  manifest: DesignResourceObservableFactManifestV1,
): void {
  const ownership = censusOwnershipSets(manifest);
  for (const entry of manifest.inspector.census) {
    if (entry.disposition !== "covered") continue;
    if (!censusEntryHasOwner(entry, ownership))
      invalid(
        "manifest_census_semantic_owner_missing",
        `${entry.key}:${entry.kind}`,
      );
  }
}

function censusOwnershipSets(manifest: DesignResourceObservableFactManifestV1) {
  return {
    inspectorInputs: new Set(
      manifest.inspector.input_resources.map((item) => item.resource_ref),
    ),
    subject: new Set(
      manifest.subjects.flatMap((subject) => subject.census_refs),
    ),
    condition: new Set(
      manifest.axis_dispositions.flatMap((axis) =>
        axis.values.flatMap((value) => value.census_refs),
      ),
    ),
    variation: new Set(
      manifest.variation_axis_dispositions.flatMap((axis) =>
        axis.values.flatMap((value) => value.census_refs),
      ),
    ),
    property: new Set(
      manifest.properties.flatMap((property) => property.census_refs),
    ),
    lineage: new Set(
      manifest.lineage_nodes.flatMap((node) => node.census_refs),
    ),
    dynamic: new Set(
      manifest.subjects.flatMap((subject) =>
        [subject.presence_rule_ref, subject.population_ref].filter(
          (ref): ref is string => ref !== null,
        ),
      ),
    ),
  };
}

function censusEntryHasOwner(
  entry: DesignResourceObservableFactManifestV1["inspector"]["census"][number],
  sets: ReturnType<typeof censusOwnershipSets>,
): boolean {
  if (entry.kind === "resource")
    return sets.inspectorInputs.has(entry.resource_ref);
  if (entry.kind === "node") return sets.subject.has(entry.key);
  if (entry.kind === "declaration")
    return [
      sets.condition,
      sets.variation,
      sets.property,
      sets.lineage,
      sets.dynamic,
    ].some((set) => set.has(entry.key));
  if (
    entry.kind === "variant" ||
    entry.kind === "state" ||
    entry.kind === "interaction_phase"
  )
    return sets.variation.has(entry.key) || sets.dynamic.has(entry.key);
  if (entry.kind === "token") return sets.lineage.has(entry.key);
  if (entry.kind === "custom_property")
    return sets.property.has(entry.key) || sets.lineage.has(entry.key);
  if (entry.kind === "asset_reference" || entry.kind === "relation")
    return sets.subject.has(entry.key) || sets.property.has(entry.key);
  return entry.kind === "dynamic_population" && sets.dynamic.has(entry.key);
}

export function validateManifestFactCells(
  manifest: DesignResourceObservableFactManifestV1,
  sourceItems: Map<string, string>,
  census: Map<
    string,
    DesignResourceObservableFactManifestV1["inspector"]["census"][number]
  >,
): void {
  const subjects = new Map(
    manifest.subjects.map((subject) => [subject.key, subject]),
  );
  const conditions = new Set(manifest.conditions.map((item) => item.key));
  const variations = new Map(
    manifest.variations.map((item) => [item.key, item]),
  );
  const properties = new Set(manifest.properties.map((item) => item.key));
  const actual = new Map<string, string>();
  const coveredFacts: string[] = [];
  for (const cell of manifest.fact_cells) {
    validateFactCellReferences(
      cell,
      manifest,
      subjects,
      conditions,
      variations,
      properties,
    );
    validateBasis(cell, sourceItems, census, `manifest_fact_cell:${cell.key}`);
    const fingerprint = factCellFingerprint(cell);
    if (actual.has(fingerprint))
      invalid(
        "manifest_fact_cell_duplicate",
        `${actual.get(fingerprint)}:${cell.key}`,
      );
    actual.set(fingerprint, cell.key);
    validateFactCellDisposition(cell, coveredFacts);
  }
  sameSet(
    [...actual.keys()],
    expectedFactCellFingerprints(manifest),
    "manifest_expected_fact_cell_universe_mismatch",
    manifest.target_key,
  );
  unique(coveredFacts, "manifest_fact_ref_reused_by_cells");
  sameSet(
    coveredFacts,
    manifest.facts.map((fact) => fact.key),
    "manifest_expected_canonical_fact_set_mismatch",
    manifest.target_key,
  );
}

function validateFactCellReferences(
  cell: DesignResourceObservableFactManifestV1["fact_cells"][number],
  manifest: DesignResourceObservableFactManifestV1,
  subjects: Map<
    string,
    DesignResourceObservableFactManifestV1["subjects"][number]
  >,
  conditions: Set<string>,
  variations: Map<
    string,
    DesignResourceObservableFactManifestV1["variations"][number]
  >,
  properties: Set<string>,
): void {
  const subject = subjects.get(cell.subject_ref);
  const variation = variations.get(cell.variation_ref);
  if (!subject) invalid("manifest_fact_cell_subject_unknown", cell.key);
  if (!subject.target_refs.includes(cell.target_ref))
    invalid("manifest_fact_cell_target_outside_subject", cell.key);
  if (cell.target_ref !== manifest.target_key)
    invalid("manifest_fact_cell_target_mismatch", cell.key);
  if (!conditions.has(cell.condition_ref))
    invalid("manifest_fact_cell_condition_unknown", cell.key);
  if (!variation || variation.subject_ref !== cell.subject_ref)
    invalid("manifest_fact_cell_variation_mismatch", cell.key);
  if (!properties.has(cell.property_ref))
    invalid("manifest_fact_cell_property_unknown", cell.key);
}

function validateFactCellDisposition(
  cell: DesignResourceObservableFactManifestV1["fact_cells"][number],
  coveredFacts: string[],
): void {
  if (cell.disposition === "covered") {
    if (cell.fact_ref === null)
      invalid("manifest_covered_fact_ref_required", cell.key);
    coveredFacts.push(cell.fact_ref);
    return;
  }
  if (cell.fact_ref !== null)
    invalid("manifest_noncovered_fact_ref_forbidden", cell.key);
  if (
    cell.disposition === "decision_required" ||
    cell.disposition === "unavailable"
  )
    invalid("manifest_fact_cell_unresolved", cell.key);
}

function expectedFactCellFingerprints(
  manifest: DesignResourceObservableFactManifestV1,
): string[] {
  const expected: string[] = [];
  for (const subject of manifest.subjects)
    for (const condition of manifest.conditions)
      for (const variation of manifest.variations.filter(
        (item) => item.subject_ref === subject.key,
      ))
        for (const property of manifest.properties)
          expected.push(
            factCellFingerprint({
              subject_ref: subject.key,
              target_ref: manifest.target_key,
              condition_ref: condition.key,
              variation_ref: variation.key,
              property_ref: property.key,
            }),
          );
  return expected;
}
