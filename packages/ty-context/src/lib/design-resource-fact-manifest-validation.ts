import { parseDesignResourceFactManifestJson } from "./design-resource-fact-manifest-shape.js";
import { validateDesignResourceFactManifestUniverse } from "./design-resource-fact-manifest-universe.js";
import type { DesignResourceObservableFactManifestV1 } from "./design-resource-fact-manifest-types.js";
import type {
  ParsedDesignResourceHandoffInputV1,
  ParsedDesignResourceHandoffV1,
  DesignResourceHandoffV1,
} from "./design-resource-handoff-types.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";

export function parseDesignResourceFactManifests(
  parsed: ParsedDesignResourceHandoffInputV1,
  contents: Map<string, Buffer>,
): Map<string, DesignResourceObservableFactManifestV1> {
  const resources = new Map(
    parsed.handoff.resources.map((resource) => [resource.key, resource]),
  );
  const manifests = new Map<string, DesignResourceObservableFactManifestV1>();
  for (const target of parsed.handoff.targets) {
    const manifestRef = target.source_profile.fact_manifest_resource_ref;
    const manifestResource = resources.get(manifestRef);
    if (!manifestResource)
      invalid("fact_manifest_resource_unknown", `${target.key}:${manifestRef}`);
    if (manifestResource.media_type !== "application/json")
      invalid(
        "fact_manifest_media_type_invalid",
        `${target.key}:${manifestResource.media_type}`,
      );
    if (manifestResource.role !== "supporting")
      invalid(
        "fact_manifest_supporting_role_required",
        `${target.key}:${manifestResource.role}`,
      );
    if (target.source_profile.entry_resource_ref === manifestRef)
      invalid("fact_manifest_must_not_be_entry", target.key);
    if (!target.source_profile.dependency_resource_refs.includes(manifestRef))
      invalid("fact_manifest_dependency_required", target.key);
    const manifest = parseDesignResourceFactManifestJson(
      contents.get(manifestRef)!.toString("utf8"),
    );
    if (manifests.has(manifest.target_key))
      invalid("fact_manifest_target_duplicate", manifest.target_key);
    if (
      manifest.target_key !== target.key ||
      manifest.scope_key !== parsed.handoff.scope.key
    )
      invalid(
        "fact_manifest_identity_mismatch",
        `${target.key}:${manifest.scope_key}:${manifest.target_key}`,
      );
    manifests.set(target.key, manifest);
  }
  sameSet(
    [...manifests.keys()],
    parsed.handoff.targets.map((target) => target.key),
    "fact_manifest_target_set_mismatch",
    "handoff",
  );
  return manifests;
}

export function validateDesignResourceFactManifests(
  parsed: ParsedDesignResourceHandoffV1,
  contents: Map<string, Buffer>,
  manifests: Map<string, DesignResourceObservableFactManifestV1>,
  validateProjection: boolean,
): void {
  const resources = new Map(
    parsed.handoff.resources.map((resource) => [resource.key, resource]),
  );
  const sourceItems = new Map(Object.entries(parsed.source_item_kinds));
  for (const target of parsed.handoff.targets) {
    const manifest = manifests.get(target.key);
    if (!manifest) invalid("fact_manifest_target_missing", target.key);
    validateDesignResourceFactManifestUniverse(
      manifest,
      parsed.handoff,
      target,
      resources,
      contents,
      sourceItems,
    );
    if (validateProjection)
      validateManifestProjection(parsed.handoff, target.key, manifest);
  }
}

function validateManifestProjection(
  handoff: DesignResourceHandoffV1,
  targetKey: string,
  manifest: DesignResourceObservableFactManifestV1,
): void {
  const target = handoff.targets.find((item) => item.key === targetKey)!;
  const targetConditions = new Set(target.condition_refs);
  const targetSubjects = new Set(
    handoff.subjects
      .filter((subject) => subject.target_refs.includes(targetKey))
      .map((subject) => subject.key),
  );
  const targetVariations = new Set(
    handoff.variations
      .filter((variation) => targetSubjects.has(variation.subject_ref))
      .map((variation) => variation.key),
  );
  const targetFacts = handoff.facts.filter(
    (fact) => fact.target_ref === targetKey,
  );
  const targetFactRefs = new Set(targetFacts.map((fact) => fact.key));
  const targetEvidenceRefs = new Set(
    targetFacts.flatMap((fact) => fact.evidence_refs),
  );
  const targetProof = handoff.proof_obligations.filter((proof) =>
    targetFactRefs.has(proof.fact_ref),
  );
  const targetOracleRefs = new Set(
    targetProof.map((proof) => proof.oracle_ref),
  );
  const targetEnvironmentRefs = new Set(
    targetProof.map((proof) => proof.environment_ref),
  );

  exactRows(
    handoff.axis_dispositions.filter((row) => row.target_ref === targetKey),
    manifest.axis_dispositions,
    "axis_dispositions",
    targetKey,
  );
  exactRows(
    handoff.condition_exclusions.filter((row) => row.target_ref === targetKey),
    manifest.condition_exclusions,
    "condition_exclusions",
    targetKey,
  );
  exactRows(
    handoff.conditions.filter((row) => targetConditions.has(row.key)),
    manifest.conditions,
    "conditions",
    targetKey,
  );
  exactRows(
    handoff.subjects.filter((row) => targetSubjects.has(row.key)),
    manifest.subjects,
    "subjects",
    targetKey,
  );
  exactRows(
    handoff.variation_axis_dispositions.filter((row) =>
      targetSubjects.has(row.subject_ref),
    ),
    manifest.variation_axis_dispositions,
    "variation_axis_dispositions",
    targetKey,
  );
  exactRows(
    handoff.variation_exclusions.filter((row) =>
      targetSubjects.has(row.subject_ref),
    ),
    manifest.variation_exclusions,
    "variation_exclusions",
    targetKey,
  );
  exactRows(
    handoff.variations.filter((row) => targetVariations.has(row.key)),
    manifest.variations,
    "variations",
    targetKey,
  );
  exactRows(handoff.properties, manifest.properties, "properties", targetKey);
  const targetLineageRefs = new Set(
    targetFacts.flatMap((fact) => [
      ...fact.lineage.token_chain_refs,
      ...fact.lineage.override_chain_refs,
    ]),
  );
  exactRows(
    handoff.lineage_nodes.filter((row) => targetLineageRefs.has(row.key)),
    manifest.lineage_nodes,
    "lineage_nodes",
    targetKey,
  );
  exactRows(
    handoff.fact_cells.filter((row) => row.target_ref === targetKey),
    manifest.fact_cells,
    "fact_cells",
    targetKey,
  );
  exactRows(targetFacts, manifest.facts, "facts", targetKey);
  exactRows(
    handoff.evidence.filter((row) => targetEvidenceRefs.has(row.key)),
    manifest.evidence,
    "evidence",
    targetKey,
  );
  exactRows(
    targetProof,
    manifest.proof_obligations,
    "proof_obligations",
    targetKey,
  );
  exactRows(
    handoff.oracles.filter((row) => targetOracleRefs.has(row.key)),
    manifest.oracles,
    "oracles",
    targetKey,
  );
  exactRows(
    handoff.environments.filter((row) => targetEnvironmentRefs.has(row.key)),
    manifest.environments,
    "environments",
    targetKey,
  );
  exactRows(
    handoff.asset_bindings.filter((row) => row.target_refs.includes(targetKey)),
    manifest.asset_bindings,
    "asset_bindings",
    targetKey,
  );
  exactRows(
    handoff.acceptance_blockers.filter((row) =>
      row.target_refs.includes(targetKey),
    ),
    manifest.acceptance_blockers,
    "acceptance_blockers",
    targetKey,
  );
}

function exactRows(
  handoffRows: Array<{ key: string }>,
  manifestRows: Array<{ key: string }>,
  collection: string,
  targetKey: string,
): void {
  const handoff = new Map(handoffRows.map((row) => [row.key, row]));
  if (handoff.size !== manifestRows.length)
    invalid(
      `manifest_handoff_${collection}_set_mismatch`,
      `${targetKey}:count:${handoff.size}:${manifestRows.length}`,
    );
  for (const manifestRow of manifestRows) {
    const handoffRow = handoff.get(manifestRow.key);
    if (!handoffRow)
      invalid(
        `manifest_handoff_${collection}_set_mismatch`,
        `${targetKey}:missing:${manifestRow.key}`,
      );
    if (canonicalJson(handoffRow) !== canonicalJson(manifestRow))
      invalid(
        `manifest_handoff_${collection}_row_mismatch`,
        `${targetKey}:${manifestRow.key}`,
      );
  }
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function sameSet(
  actual: string[],
  expected: string[],
  code: string,
  detail: string,
): void {
  const left = [...new Set(actual)].sort();
  const right = [...new Set(expected)].sort();
  if (
    left.length !== right.length ||
    left.some((item, index) => item !== right[index])
  )
    invalid(code, `${detail}:${left.join(",")}:${right.join(",")}`);
}

function invalid(code: string, detail: string): never {
  invalidDesignResourceHandoff(code, detail);
}
