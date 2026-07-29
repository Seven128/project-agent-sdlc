import type { DesignResourceObservableFactManifestV1 } from "./design-resource-fact-manifest-types.js";
import {
  validateDesignResourceLocatedDigest,
  validateDesignResourceValueKind,
} from "./design-resource-fact-locator-validation.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import {
  invalid,
  nonempty,
  refsKnown,
  stableJson,
  unique,
} from "./design-resource-fact-universe-helpers.js";

export function validateManifestFacts(
  manifest: DesignResourceObservableFactManifestV1,
  handoff: DesignResourceHandoffV1,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
  sourceItems: Map<string, string>,
): void {
  const cells = new Map(manifest.fact_cells.map((cell) => [cell.key, cell]));
  const properties = new Map(
    manifest.properties.map((property) => [property.key, property]),
  );
  const evidence = new Map(manifest.evidence.map((item) => [item.key, item]));
  const lineageNodes = new Map(
    manifest.lineage_nodes.map((item) => [item.key, item]),
  );
  for (const fact of manifest.facts) {
    const property = validateFactIdentity(fact, cells, properties);
    validateFactSourceAndEvidence(fact, evidence, sourceItems);
    validateFactValue(fact, resources, contents);
    validateFactLineage(fact, property.family, manifest, handoff, lineageNodes);
  }
}

function validateFactIdentity(
  fact: DesignResourceObservableFactManifestV1["facts"][number],
  cells: Map<
    string,
    DesignResourceObservableFactManifestV1["fact_cells"][number]
  >,
  properties: Map<
    string,
    DesignResourceObservableFactManifestV1["properties"][number]
  >,
): DesignResourceObservableFactManifestV1["properties"][number] {
  const cell = cells.get(fact.cell_ref);
  const property = properties.get(fact.property_ref);
  if (
    !cell ||
    cell.fact_ref !== fact.key ||
    cell.subject_ref !== fact.subject_ref ||
    cell.target_ref !== fact.target_ref ||
    cell.condition_ref !== fact.condition_ref ||
    cell.variation_ref !== fact.variation_ref ||
    cell.property_ref !== fact.property_ref
  )
    invalid("manifest_fact_cell_mismatch", fact.key);
  if (
    !property ||
    property.dimension !== fact.dimension ||
    property.value_kind !== fact.value_kind
  )
    invalid("manifest_fact_property_mismatch", fact.key);
  return property;
}

function validateFactSourceAndEvidence(
  fact: DesignResourceObservableFactManifestV1["facts"][number],
  evidence: Map<string, unknown>,
  sourceItems: Map<string, string>,
): void {
  nonempty(fact.evidence_refs, `manifest_fact_evidence_required:${fact.key}`);
  nonempty(
    fact.source_item_refs,
    `manifest_fact_source_item_required:${fact.key}`,
  );
  unique(fact.evidence_refs, `manifest_fact_evidence_duplicate:${fact.key}`);
  refsKnown(
    fact.evidence_refs,
    evidence,
    "manifest_fact_evidence_unknown",
    fact.key,
  );
  refsKnown(
    fact.source_item_refs,
    sourceItems,
    "manifest_fact_source_item_unknown",
    fact.key,
  );
}

function validateFactValue(
  fact: DesignResourceObservableFactManifestV1["facts"][number],
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  const resolvedFactValue = validateDesignResourceLocatedDigest(
    fact.value,
    resources,
    contents,
    `manifest.fact.${fact.key}.value`,
  );
  validateDesignResourceValueKind(
    fact.value_kind,
    resolvedFactValue,
    `manifest.fact.${fact.key}.value`,
  );
  validateDesignResourceLocatedDigest(
    fact.lineage.resolved_value,
    resources,
    contents,
    `manifest.fact.${fact.key}.lineage.resolved_value`,
  );
  if (
    fact.value.sha256 !== fact.lineage.resolved_value.sha256 ||
    stableJson(fact.value.locator) !==
      stableJson(fact.lineage.resolved_value.locator)
  )
    invalid("manifest_fact_resolved_value_mismatch", fact.key);
}

function validateFactLineage(
  fact: DesignResourceObservableFactManifestV1["facts"][number],
  family: DesignResourceObservableFactManifestV1["properties"][number]["family"],
  manifest: DesignResourceObservableFactManifestV1,
  handoff: DesignResourceHandoffV1,
  nodes: Map<
    string,
    DesignResourceObservableFactManifestV1["lineage_nodes"][number]
  >,
): void {
  if (
    handoff.scope.style_dependency !== "non-fidelity" &&
    ["typography", "color", "decoration", "icon"].includes(family) &&
    fact.lineage.design_system_ref === null
  )
    invalid("manifest_style_fact_design_system_lineage_required", fact.key);
  if (
    fact.lineage.conflict_status === "none" &&
    fact.lineage.conflict_resolution !== ""
  )
    invalid("manifest_fact_conflict_resolution_forbidden", fact.key);
  if (
    fact.lineage.conflict_status === "resolved" &&
    !fact.lineage.conflict_resolution.trim()
  )
    invalid("manifest_fact_conflict_resolution_required", fact.key);
  if (
    fact.lineage.design_system_ref !== null &&
    fact.lineage.design_system_ref !== manifest.design_system.id
  )
    invalid("manifest_fact_design_system_lineage_mismatch", fact.key);
  validateLineageRefs(fact, nodes);
  validateLineageChain(fact, nodes);
}

function validateLineageRefs(
  fact: DesignResourceObservableFactManifestV1["facts"][number],
  nodes: Map<
    string,
    DesignResourceObservableFactManifestV1["lineage_nodes"][number]
  >,
): void {
  unique(
    fact.lineage.token_chain_refs,
    `manifest_fact_token_chain_duplicate:${fact.key}`,
  );
  unique(
    fact.lineage.override_chain_refs,
    `manifest_fact_override_chain_duplicate:${fact.key}`,
  );
  refsKnown(
    fact.lineage.token_chain_refs,
    nodes,
    "manifest_fact_token_lineage_unknown",
    fact.key,
  );
  refsKnown(
    fact.lineage.override_chain_refs,
    nodes,
    "manifest_fact_override_lineage_unknown",
    fact.key,
  );
  for (const ref of fact.lineage.token_chain_refs)
    if (
      ![
        "base_token",
        "alias_token",
        "semantic_token",
        "component_token",
      ].includes(nodes.get(ref)!.kind)
    )
      invalid("manifest_fact_token_lineage_kind_invalid", `${fact.key}:${ref}`);
  for (const ref of fact.lineage.override_chain_refs)
    if (
      ![
        "platform_override",
        "mode_override",
        "state_override",
        "instance_override",
        "slot_override",
        "direct_value",
      ].includes(nodes.get(ref)!.kind)
    )
      invalid(
        "manifest_fact_override_lineage_kind_invalid",
        `${fact.key}:${ref}`,
      );
}

function validateLineageChain(
  fact: DesignResourceObservableFactManifestV1["facts"][number],
  nodes: Map<
    string,
    DesignResourceObservableFactManifestV1["lineage_nodes"][number]
  >,
): void {
  const chain = [
    ...fact.lineage.token_chain_refs,
    ...fact.lineage.override_chain_refs,
  ];
  if (fact.lineage.design_system_ref === null && chain.length)
    invalid("manifest_fact_lineage_without_design_system", fact.key);
  if (fact.lineage.design_system_ref !== null && chain.length === 0)
    invalid("manifest_fact_design_system_chain_required", fact.key);
  for (let index = 1; index < chain.length; index += 1)
    if (!nodes.get(chain[index])!.predecessor_refs.includes(chain[index - 1]))
      invalid(
        "manifest_fact_lineage_chain_disconnected",
        `${fact.key}:${chain[index - 1]}:${chain[index]}`,
      );
  if (!chain.length) return;
  const effective = nodes.get(chain.at(-1)!)!.value;
  if (
    effective.sha256 !== fact.lineage.resolved_value.sha256 ||
    stableJson(effective.locator) !==
      stableJson(fact.lineage.resolved_value.locator)
  )
    invalid("manifest_fact_lineage_effective_value_mismatch", fact.key);
}
