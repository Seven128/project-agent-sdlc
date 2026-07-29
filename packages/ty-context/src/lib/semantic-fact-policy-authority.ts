import { SEMANTIC_FACT_REQUIRED_INSPECTOR_CAPABILITIES } from "./semantic-fact-catalog.js";
import {
  assertSameSemanticFactSet,
  requireSemanticFactBasis,
  requireSemanticFactSubset,
  semanticFactCollections,
  semanticFactInvalid,
  uniqueNonemptySemanticFacts,
  uniqueSemanticFacts,
} from "./semantic-fact-policy-primitives.js";
import {
  SEMANTIC_FACT_MANIFEST_COLLECTIONS,
  type SemanticFactManifestV1,
} from "./semantic-fact-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export function validateSemanticFactInspector(
  manifest: SemanticFactManifestV1,
): void {
  uniqueNonemptySemanticFacts(
    manifest.inspector.capabilities,
    "inspector_capabilities",
  );
  requireSemanticFactSubset(
    [...SEMANTIC_FACT_REQUIRED_INSPECTOR_CAPABILITIES],
    manifest.inspector.capabilities,
    "inspector_capability_missing",
    manifest.key,
  );
  if (
    manifest.inspector.trust === "frozen_executable"
      ? !manifest.inspector.implementation_sha256
      : manifest.inspector.implementation_sha256 !== null
  )
    semanticFactInvalid(
      "inspector_identity_digest_mismatch",
      `${manifest.inspector.trust}:${manifest.inspector.implementation_sha256 ?? "missing"}`,
    );
}

export function validateSemanticFactSourceLineage(
  manifest: SemanticFactManifestV1,
): void {
  const validate = (
    label: string,
    row: { key: string; source_item_refs: string[] },
  ) => {
    uniqueNonemptySemanticFacts(
      row.source_item_refs,
      `${label}_source_items:${row.key}`,
    );
    requireSemanticFactSubset(
      row.source_item_refs,
      manifest.scope.source_item_refs,
      `${label}_source_item_unknown`,
      row.key,
    );
  };
  for (const row of manifest.scope.exclusions) {
    validate("scope_exclusion", row);
    uniqueNonemptySemanticFacts(
      row.affected_refs,
      `scope_exclusion_affected_refs:${row.key}`,
    );
    requireSemanticFactBasis(row, `scope_exclusion:${row.key}`);
  }
  for (const row of manifest.family_dispositions) validate("family", row);
  for (const row of manifest.subjects) validate("subject", row);
  for (const row of manifest.relations) validate("relation", row);
  for (const row of manifest.populations) validate("population", row);
  for (const row of manifest.axis_dispositions) {
    validate("axis", row);
    for (const value of row.values) validate(`axis_value:${row.key}`, value);
  }
  for (const row of manifest.condition_rules) validate("condition_rule", row);
  for (const row of manifest.conditions) validate("condition", row);
  for (const row of manifest.condition_exclusions)
    validate("condition_exclusion", row);
  for (const row of manifest.property_dispositions) validate("property", row);
  for (const row of manifest.fact_cells) validate("fact_cell", row);
  for (const row of manifest.facts) validate("fact", row);
  for (const row of manifest.blockers) {
    validate("blocker", row);
    uniqueNonemptySemanticFacts(
      row.affected_refs,
      `blocker_affected_refs:${row.key}`,
    );
  }
}

export function semanticFactCollectionIdentity(
  rows: Array<{ key: string }>,
): string {
  return sha256Hex(canonicalValueJson(rows.map((item) => item.key).sort()));
}

export function validateSemanticFactUniqueIdentities(
  manifest: SemanticFactManifestV1,
): void {
  uniqueNonemptySemanticFacts(
    manifest.scope.outcome_refs,
    "scope_outcome_refs",
  );
  uniqueNonemptySemanticFacts(
    manifest.scope.source_item_refs,
    "scope_source_item_refs",
  );
  uniqueSemanticFacts(
    manifest.inputs.map((item) => `${item.kind}\0${item.source_ref}`),
    "input_resource",
  );
  for (const [name, rows] of Object.entries(semanticFactCollections(manifest)))
    uniqueSemanticFacts(
      rows.map((item) => item.key),
      `${name}_key`,
    );
  uniqueSemanticFacts(
    manifest.inspector.census.map((item) => item.key),
    "inspector_census_key",
  );
  uniqueSemanticFacts(
    manifest.generation.collections.map((item) => item.name),
    "generation_collection_name",
  );
  uniqueSemanticFacts(
    manifest.generation.chunk_indexes,
    "generation_chunk_index",
  );
  const expectedChunks = Array.from(
    { length: manifest.generation.chunk_count },
    (_unused, index) => index,
  );
  assertSameSemanticFactSet(
    manifest.generation.chunk_indexes,
    expectedChunks,
    "generation_chunk_indexes",
  );
}

export function validateSemanticFactGeneration(
  manifest: SemanticFactManifestV1,
): void {
  assertSameSemanticFactSet(
    manifest.generation.collections.map((item) => item.name),
    [...SEMANTIC_FACT_MANIFEST_COLLECTIONS],
    "generation_collection_set",
  );
  const actual = semanticFactCollections(manifest);
  for (const declaration of manifest.generation.collections) {
    const rows = actual[declaration.name];
    if (declaration.expected_count !== rows.length)
      semanticFactInvalid(
        "generation_collection_count_mismatch",
        `${declaration.name}:${declaration.expected_count}:${rows.length}`,
      );
    const digest = semanticFactCollectionIdentity(rows);
    if (declaration.identity_sha256 !== digest)
      semanticFactInvalid(
        "generation_collection_identity_mismatch",
        `${declaration.name}:${declaration.identity_sha256}:${digest}`,
      );
  }
}
