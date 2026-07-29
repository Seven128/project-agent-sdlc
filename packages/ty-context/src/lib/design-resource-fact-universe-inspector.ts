import type { DesignResourceObservableFactManifestV1 } from "./design-resource-fact-manifest-types.js";
import {
  resolveDesignResourceLocatorValue,
  validateDesignResourceLocatedDigest,
} from "./design-resource-fact-locator-validation.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type {
  DesignResourceHandoffTargetV1,
  DesignResourceHandoffV1,
} from "./design-resource-handoff-types.js";
import {
  invalid,
  nonempty,
  refsKnown,
  sameSet,
  unique,
  validateBasis,
} from "./design-resource-fact-universe-helpers.js";

type Census = Map<
  string,
  DesignResourceObservableFactManifestV1["inspector"]["census"][number]
>;

export function validateManifestLineageNodes(
  manifest: DesignResourceObservableFactManifestV1,
  census: Census,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  const nodes = new Map(manifest.lineage_nodes.map((node) => [node.key, node]));
  for (const node of manifest.lineage_nodes) {
    unique(
      node.predecessor_refs,
      `manifest_lineage_predecessor_duplicate:${node.key}`,
    );
    refsKnown(
      node.predecessor_refs,
      nodes,
      "manifest_lineage_predecessor_unknown",
      node.key,
    );
    if (node.predecessor_refs.includes(node.key))
      invalid("manifest_lineage_self_reference", node.key);
    if (
      ["base_token", "direct_value"].includes(node.kind) &&
      node.predecessor_refs.length
    )
      invalid("manifest_lineage_root_predecessor_forbidden", node.key);
    if (
      !["base_token", "direct_value"].includes(node.kind) &&
      node.predecessor_refs.length === 0
    )
      invalid("manifest_lineage_predecessor_required", node.key);
    nonempty(node.census_refs, `manifest_lineage_census_required:${node.key}`);
    refsKnown(
      node.census_refs,
      census,
      "manifest_lineage_census_unknown",
      node.key,
    );
    for (const ref of node.census_refs)
      if (!["token", "declaration"].includes(census.get(ref)!.kind))
        invalid(
          "manifest_lineage_census_kind_invalid",
          `${node.key}:${ref}:${census.get(ref)!.kind}`,
        );
    validateDesignResourceLocatedDigest(
      node.value,
      resources,
      contents,
      `manifest.lineage_node.${node.key}.value`,
    );
  }
  validateLineageAcyclic(manifest, nodes);
}

function validateLineageAcyclic(
  manifest: DesignResourceObservableFactManifestV1,
  nodes: Map<
    string,
    DesignResourceObservableFactManifestV1["lineage_nodes"][number]
  >,
): void {
  for (const node of manifest.lineage_nodes) {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const walk = (ref: string): void => {
      if (visiting.has(ref)) invalid("manifest_lineage_cycle", node.key);
      if (visited.has(ref)) return;
      visiting.add(ref);
      for (const predecessor of nodes.get(ref)!.predecessor_refs)
        walk(predecessor);
      visiting.delete(ref);
      visited.add(ref);
    };
    walk(node.key);
  }
}

export function validateManifestInspector(
  manifest: DesignResourceObservableFactManifestV1,
  handoff: DesignResourceHandoffV1,
  target: DesignResourceHandoffTargetV1,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
  sourceItems: Map<string, string>,
): void {
  const inspector = manifest.inspector;
  validateInspectorIdentity(inspector);
  if (inspector.entry_resource_ref !== target.source_profile.entry_resource_ref)
    invalid(
      "manifest_inspector_entry_mismatch",
      `${manifest.target_key}:${inspector.entry_resource_ref}:${target.source_profile.entry_resource_ref}`,
    );
  validateInspectorInputs(manifest, target, resources);
  validateInspectorCensus(manifest, resources, contents, sourceItems);
  const expectedInspectorIdentity = `${inspector.identity}@${inspector.version}`;
  for (const resourceRef of target.resource_refs) {
    const closure = handoff.resource_fact_closure.find(
      (item) => item.resource_ref === resourceRef,
    );
    if (!closure || closure.inspection.inspector !== expectedInspectorIdentity)
      invalid(
        "manifest_resource_closure_inspector_mismatch",
        `${resourceRef}:${closure?.inspection.inspector ?? "missing"}:${expectedInspectorIdentity}`,
      );
  }
}

function validateInspectorIdentity(
  inspector: DesignResourceObservableFactManifestV1["inspector"],
): void {
  if (
    inspector.trust === "frozen_executable" &&
    inspector.implementation_sha256 === null
  )
    invalid("manifest_inspector_digest_required", inspector.identity);
  if (
    inspector.trust === "named_external_tcb" &&
    inspector.implementation_sha256 !== null
  )
    invalid("manifest_external_inspector_digest_forbidden", inspector.identity);
  nonempty(
    inspector.capability_refs,
    "manifest_inspector_capabilities_required",
  );
  unique(inspector.capability_refs, "manifest_inspector_capability_duplicate");
}

function validateInspectorInputs(
  manifest: DesignResourceObservableFactManifestV1,
  target: DesignResourceHandoffTargetV1,
  resources: Map<string, DesignResource>,
): void {
  const manifestResourceRef = target.source_profile.fact_manifest_resource_ref;
  const expectedInputs = target.resource_refs
    .filter((ref) => ref !== manifestResourceRef)
    .map((ref) => {
      const resource = resources.get(ref)!;
      return `${ref}\0${resource.path}\0${resource.sha256}`;
    });
  const actualInputs = manifest.inspector.input_resources.map(
    (item) => `${item.resource_ref}\0${item.path}\0${item.sha256}`,
  );
  sameSet(
    actualInputs,
    expectedInputs,
    "manifest_inspector_input_resource_mismatch",
    manifest.target_key,
  );
  unique(
    manifest.inspector.input_resources.map((item) => item.resource_ref),
    "manifest_inspector_input_resource_duplicate",
  );
}

function validateInspectorCensus(
  manifest: DesignResourceObservableFactManifestV1,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
  sourceItems: Map<string, string>,
): void {
  const inputRefs = new Set(
    manifest.inspector.input_resources.map((item) => item.resource_ref),
  );
  const censusByResource = new Map<string, number>();
  const censusFactRefs = new Set<string>();
  const censusFactCellRefs = new Set<string>();
  const facts = new Map(manifest.facts.map((fact) => [fact.key, fact]));
  const factCells = new Map(
    manifest.fact_cells.map((cell) => [cell.key, cell]),
  );
  const censusEntries = new Map(
    manifest.inspector.census.map((entry) => [entry.key, entry]),
  );
  for (const entry of manifest.inspector.census) {
    validateCensusEntry(
      entry,
      inputRefs,
      censusByResource,
      facts,
      factCells,
      censusEntries,
      resources,
      contents,
      sourceItems,
    );
    for (const ref of entry.fact_refs) censusFactRefs.add(ref);
    for (const ref of entry.fact_cell_refs) censusFactCellRefs.add(ref);
  }
  for (const ref of inputRefs)
    if (!censusByResource.has(ref))
      invalid("manifest_census_resource_missing", ref);
  sameSet(
    [...censusFactRefs],
    manifest.facts.map((fact) => fact.key),
    "manifest_census_fact_set_mismatch",
    manifest.target_key,
  );
  sameSet(
    [...censusFactCellRefs],
    manifest.fact_cells.map((cell) => cell.key),
    "manifest_census_fact_cell_set_mismatch",
    manifest.target_key,
  );
}

function validateCensusEntry(
  entry: DesignResourceObservableFactManifestV1["inspector"]["census"][number],
  inputRefs: Set<string>,
  censusByResource: Map<string, number>,
  facts: Map<string, unknown>,
  factCells: Map<string, unknown>,
  censusEntries: Census,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
  sourceItems: Map<string, string>,
): void {
  validateBasis(
    entry,
    sourceItems,
    censusEntries,
    `manifest_census:${entry.key}`,
  );
  if (entry.basis_refs.includes(entry.key))
    invalid("manifest_census_self_basis_forbidden", entry.key);
  if (!inputRefs.has(entry.resource_ref))
    invalid(
      "manifest_census_resource_outside_inputs",
      `${entry.key}:${entry.resource_ref}`,
    );
  censusByResource.set(
    entry.resource_ref,
    (censusByResource.get(entry.resource_ref) ?? 0) + 1,
  );
  resolveDesignResourceLocatorValue(
    { resource_ref: entry.resource_ref, ...entry.locator },
    resources.get(entry.resource_ref)!,
    contents.get(entry.resource_ref)!,
    `manifest.census.${entry.key}`,
  );
  unique(entry.fact_refs, `manifest_census_fact_ref_duplicate:${entry.key}`);
  unique(
    entry.fact_cell_refs,
    `manifest_census_fact_cell_ref_duplicate:${entry.key}`,
  );
  refsKnown(
    entry.fact_refs,
    facts,
    "manifest_census_fact_ref_unknown",
    entry.key,
  );
  refsKnown(
    entry.fact_cell_refs,
    factCells,
    "manifest_census_fact_cell_ref_unknown",
    entry.key,
  );
  if (
    entry.disposition === "covered" &&
    entry.fact_refs.length === 0 &&
    entry.fact_cell_refs.length === 0
  )
    invalid("manifest_census_covered_binding_required", entry.key);
  if (
    entry.disposition === "non_material" &&
    (entry.fact_refs.length > 0 || entry.fact_cell_refs.length > 0)
  )
    invalid("manifest_census_non_material_binding_forbidden", entry.key);
}
