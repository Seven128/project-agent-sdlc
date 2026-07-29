import {
  DESIGN_RESOURCE_CENSUS_KINDS,
  DESIGN_RESOURCE_INSPECTOR_CAPABILITIES,
  DESIGN_RESOURCE_LINEAGE_NODE_KINDS,
  DESIGN_RESOURCE_MANIFEST_COLLECTIONS,
  type DesignResourceDesignSystemSnapshotV1,
  type DesignResourceInspectorV1,
  type DesignResourceLineageNodeV1,
  type DesignResourceManifestGenerationV1,
} from "./design-resource-fact-manifest-types.js";
import { parseDesignResourceLocatedDigest } from "./design-resource-fact-shape-primitives.js";
import { DESIGN_RESOURCE_LOCATOR_KINDS } from "./design-resource-handoff-types.js";
import {
  nonnegativeInteger,
  positiveInteger,
  sha256,
  sourceItemKeys,
  stableKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import {
  array,
  literal,
  nullable,
  object,
  repositoryFile,
  string,
} from "./long-task-shape-primitives.js";

export function parseDesignResourceLineageNodes(
  value: unknown,
  label = "design_resource_handoff.lineage_nodes",
): DesignResourceLineageNodeV1[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, [
      "key",
      "kind",
      "predecessor_refs",
      "value",
      "census_refs",
    ]);
    return {
      key: stableKey(row.key, `${itemLabel}.key`),
      kind: literal(
        row.kind,
        DESIGN_RESOURCE_LINEAGE_NODE_KINDS,
        `${itemLabel}.kind`,
      ),
      predecessor_refs: stableKeys(
        row.predecessor_refs,
        `${itemLabel}.predecessor_refs`,
      ),
      value: parseDesignResourceLocatedDigest(row.value, `${itemLabel}.value`),
      census_refs: stableKeys(row.census_refs, `${itemLabel}.census_refs`),
    };
  });
}

export function parseDesignResourceFactManifestInspector(
  value: unknown,
  label: string,
): DesignResourceInspectorV1 {
  const row = object(value, label, [
    "trust",
    "identity",
    "version",
    "implementation_sha256",
    "capability_refs",
    "entry_resource_ref",
    "input_resources",
    "traversal",
    "dynamic_discovery",
    "census",
  ]);
  return {
    trust: literal(
      row.trust,
      ["frozen_executable", "named_external_tcb"] as const,
      `${label}.trust`,
    ),
    identity: string(row.identity, `${label}.identity`),
    version: string(row.version, `${label}.version`),
    implementation_sha256: nullable(row.implementation_sha256, (item) =>
      sha256(item, `${label}.implementation_sha256`),
    ),
    capability_refs: array(row.capability_refs, `${label}.capability_refs`).map(
      (item, index) =>
        literal(
          item,
          DESIGN_RESOURCE_INSPECTOR_CAPABILITIES,
          `${label}.capability_refs[${index}]`,
        ),
    ),
    entry_resource_ref: stableKey(
      row.entry_resource_ref,
      `${label}.entry_resource_ref`,
    ),
    input_resources: array(row.input_resources, `${label}.input_resources`).map(
      (item, index) => {
        const itemLabel = `${label}.input_resources[${index}]`;
        const input = object(item, itemLabel, [
          "resource_ref",
          "path",
          "sha256",
        ]);
        return {
          resource_ref: stableKey(
            input.resource_ref,
            `${itemLabel}.resource_ref`,
          ),
          path: repositoryFile(input.path, `${itemLabel}.path`),
          sha256: sha256(input.sha256, `${itemLabel}.sha256`),
        };
      },
    ),
    traversal: literal(
      row.traversal,
      ["complete_enumeration"] as const,
      `${label}.traversal`,
    ),
    dynamic_discovery: literal(
      row.dynamic_discovery,
      ["fully_enumerated"] as const,
      `${label}.dynamic_discovery`,
    ),
    census: parseInspectorCensus(row.census, `${label}.census`),
  };
}

function parseInspectorCensus(
  value: unknown,
  label: string,
): DesignResourceInspectorV1["census"] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const entry = object(item, itemLabel, [
      "key",
      "kind",
      "resource_ref",
      "locator",
      "disposition",
      "fact_refs",
      "fact_cell_refs",
      "source_item_refs",
      "basis_refs",
      "rationale",
    ]);
    const locator = object(entry.locator, `${itemLabel}.locator`, [
      "kind",
      "value",
    ]);
    return {
      key: stableKey(entry.key, `${itemLabel}.key`),
      kind: literal(
        entry.kind,
        DESIGN_RESOURCE_CENSUS_KINDS,
        `${itemLabel}.kind`,
      ),
      resource_ref: stableKey(entry.resource_ref, `${itemLabel}.resource_ref`),
      locator: {
        kind: literal(
          locator.kind,
          DESIGN_RESOURCE_LOCATOR_KINDS,
          `${itemLabel}.locator.kind`,
        ),
        value: string(locator.value, `${itemLabel}.locator.value`),
      },
      disposition: literal(
        entry.disposition,
        ["covered", "non_material"] as const,
        `${itemLabel}.disposition`,
      ),
      fact_refs: stableKeys(entry.fact_refs, `${itemLabel}.fact_refs`),
      fact_cell_refs: stableKeys(
        entry.fact_cell_refs,
        `${itemLabel}.fact_cell_refs`,
      ),
      source_item_refs: sourceItemKeys(
        entry.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      basis_refs: stableKeys(entry.basis_refs, `${itemLabel}.basis_refs`),
      rationale: string(entry.rationale, `${itemLabel}.rationale`),
    };
  });
}

export function parseDesignResourceManifestDesignSystem(
  value: unknown,
  label: string,
): DesignResourceDesignSystemSnapshotV1 {
  const row = object(value, label, [
    "disposition",
    "id",
    "revision",
    "resource_ref",
    "sha256",
  ]);
  return {
    disposition: literal(
      row.disposition,
      ["used", "not_applicable"] as const,
      `${label}.disposition`,
    ),
    id: string(row.id, `${label}.id`),
    revision: string(row.revision, `${label}.revision`),
    resource_ref: stableKey(row.resource_ref, `${label}.resource_ref`),
    sha256: sha256(row.sha256, `${label}.sha256`),
  };
}

export function parseDesignResourceFactManifestGeneration(
  value: unknown,
  label: string,
): DesignResourceManifestGenerationV1 {
  const row = object(value, label, [
    "strategy",
    "sampling",
    "truncation",
    "chunk_count",
    "chunk_indexes",
    "collections",
  ]);
  return {
    strategy: literal(
      row.strategy,
      ["complete_explicit"] as const,
      `${label}.strategy`,
    ),
    sampling: literal(
      row.sampling,
      ["forbidden"] as const,
      `${label}.sampling`,
    ),
    truncation: literal(
      row.truncation,
      ["forbidden"] as const,
      `${label}.truncation`,
    ),
    chunk_count: positiveInteger(row.chunk_count, `${label}.chunk_count`),
    chunk_indexes: array(row.chunk_indexes, `${label}.chunk_indexes`).map(
      (item, index) =>
        nonnegativeInteger(item, `${label}.chunk_indexes[${index}]`),
    ),
    collections: array(row.collections, `${label}.collections`).map(
      (item, index) => {
        const itemLabel = `${label}.collections[${index}]`;
        const collection = object(item, itemLabel, [
          "name",
          "expected_count",
          "identity_sha256",
        ]);
        return {
          name: literal(
            collection.name,
            DESIGN_RESOURCE_MANIFEST_COLLECTIONS,
            `${itemLabel}.name`,
          ),
          expected_count: nonnegativeInteger(
            collection.expected_count,
            `${itemLabel}.expected_count`,
          ),
          identity_sha256: sha256(
            collection.identity_sha256,
            `${itemLabel}.identity_sha256`,
          ),
        };
      },
    ),
  };
}
