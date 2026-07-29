import {
  DESIGN_RESOURCE_MANIFEST_COLLECTIONS,
  type DesignResourceObservableFactManifestV1,
} from "./design-resource-fact-manifest-types.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import {
  invalid,
  manifestCollectionRows,
  manifestIdentityDigest,
  nonempty,
  refsKnown,
  sameSet,
  unique,
} from "./design-resource-fact-universe-helpers.js";

export function validateManifestAssets(
  manifest: DesignResourceObservableFactManifestV1,
  resources: Map<string, DesignResource>,
): void {
  const subjects = new Map(
    manifest.subjects.map((subject) => [subject.key, subject]),
  );
  const assetSubjects = manifest.subjects.filter(
    (subject) => subject.kind === "asset",
  );
  const bound = new Set<string>();
  for (const binding of manifest.asset_bindings) {
    validateAssetBinding(binding, manifest, subjects, resources);
    if (bound.has(binding.asset_subject_ref))
      invalid(
        "manifest_asset_subject_binding_duplicate",
        binding.asset_subject_ref,
      );
    bound.add(binding.asset_subject_ref);
  }
  for (const subject of assetSubjects)
    if (!bound.has(subject.key))
      invalid("manifest_asset_subject_binding_missing", subject.key);
}

function validateAssetBinding(
  binding: DesignResourceObservableFactManifestV1["asset_bindings"][number],
  manifest: DesignResourceObservableFactManifestV1,
  subjects: Map<
    string,
    DesignResourceObservableFactManifestV1["subjects"][number]
  >,
  resources: Map<string, DesignResource>,
): void {
  const subject = subjects.get(binding.asset_subject_ref);
  if (!subject || subject.kind !== "asset")
    invalid("manifest_asset_binding_subject_invalid", binding.key);
  if (!resources.has(binding.resource_ref))
    invalid("manifest_asset_binding_resource_unknown", binding.key);
  for (const [name, refs] of [
    ["target", binding.target_refs],
    ["condition", binding.condition_refs],
    ["fact", binding.fact_refs],
    ["consumer", binding.consumer_subject_refs],
  ] as const) {
    nonempty(refs, `manifest_asset_binding_${name}s_required:${binding.key}`);
    unique(refs, `manifest_asset_binding_${name}_duplicate:${binding.key}`);
  }
  refsKnown(
    binding.target_refs,
    new Map([[manifest.target_key, true]]),
    "manifest_asset_binding_target_unknown",
    binding.key,
  );
  const assetFacts = manifest.facts.filter(
    (fact) => fact.subject_ref === binding.asset_subject_ref,
  );
  sameSet(
    binding.fact_refs,
    assetFacts.map((fact) => fact.key),
    "manifest_asset_binding_fact_set_mismatch",
    binding.key,
  );
  sameSet(
    binding.condition_refs,
    [...new Set(assetFacts.map((fact) => fact.condition_ref))],
    "manifest_asset_binding_condition_set_mismatch",
    binding.key,
  );
  sameSet(
    binding.target_refs,
    subject.target_refs,
    "manifest_asset_binding_target_set_mismatch",
    binding.key,
  );
  validateAssetFacts(binding, manifest, assetFacts);
  refsKnown(
    binding.condition_refs,
    new Map(manifest.conditions.map((item) => [item.key, item])),
    "manifest_asset_binding_condition_unknown",
    binding.key,
  );
  refsKnown(
    binding.fact_refs,
    new Map(manifest.facts.map((item) => [item.key, item])),
    "manifest_asset_binding_fact_unknown",
    binding.key,
  );
  refsKnown(
    binding.consumer_subject_refs,
    subjects,
    "manifest_asset_binding_consumer_unknown",
    binding.key,
  );
}

function validateAssetFacts(
  binding: DesignResourceObservableFactManifestV1["asset_bindings"][number],
  manifest: DesignResourceObservableFactManifestV1,
  facts: DesignResourceObservableFactManifestV1["facts"],
): void {
  for (const fact of facts) {
    if (fact.dimension !== "assets")
      invalid(
        "manifest_asset_fact_dimension_invalid",
        `${binding.key}:${fact.key}:${fact.dimension}`,
      );
    const resourceBound =
      fact.value.locator.resource_ref === binding.resource_ref ||
      fact.lineage.resolved_value.locator.resource_ref ===
        binding.resource_ref ||
      fact.evidence_refs.some(
        (ref) =>
          manifest.evidence.find((item) => item.key === ref)?.resource_ref ===
          binding.resource_ref,
      );
    if (!resourceBound)
      invalid(
        "manifest_asset_binding_resource_unattributed",
        `${binding.key}:${fact.key}:${binding.resource_ref}`,
      );
  }
}

export function validateManifestGeneration(
  manifest: DesignResourceObservableFactManifestV1,
): void {
  const generation = manifest.generation;
  if (
    generation.chunk_indexes.length !== generation.chunk_count ||
    generation.chunk_indexes.some((value, index) => value !== index)
  )
    invalid("manifest_generation_chunk_closure_mismatch", manifest.target_key);
  unique(
    generation.collections.map((item) => item.name),
    "manifest_generation_collection_duplicate",
  );
  sameSet(
    generation.collections.map((item) => item.name),
    [...DESIGN_RESOURCE_MANIFEST_COLLECTIONS],
    "manifest_generation_collection_set_mismatch",
    manifest.target_key,
  );
  const rowsByCollection = manifestCollectionRows(manifest);
  for (const declaration of generation.collections) {
    const rows = rowsByCollection.get(declaration.name)!;
    if (rows.length !== declaration.expected_count)
      invalid(
        "manifest_generation_count_mismatch",
        `${declaration.name}:${rows.length}:${declaration.expected_count}`,
      );
    const actual = manifestIdentityDigest(rows);
    if (actual !== declaration.identity_sha256)
      invalid(
        "manifest_generation_identity_mismatch",
        `${declaration.name}:${declaration.identity_sha256}:${actual}`,
      );
  }
}
