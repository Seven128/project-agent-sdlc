import type { DesignResourceObservableFactManifestV1 } from "./design-resource-fact-manifest-types.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type {
  DesignResourceHandoffTargetV1,
  DesignResourceHandoffV1,
} from "./design-resource-handoff-types.js";
import {
  validateManifestInspector,
  validateManifestLineageNodes,
} from "./design-resource-fact-universe-inspector.js";
import {
  validateManifestDesignSystem,
  validateManifestSubjects,
} from "./design-resource-fact-universe-subjects.js";
import { validateManifestConditionUniverse } from "./design-resource-fact-universe-conditions.js";
import { validateManifestVariationUniverse } from "./design-resource-fact-universe-variations.js";
import {
  validateManifestCensusOwnership,
  validateManifestFactCells,
  validateManifestPropertyCatalog,
} from "./design-resource-fact-universe-catalog.js";
import { validateManifestFacts } from "./design-resource-fact-universe-facts.js";
import { validateManifestProofAndEvidence } from "./design-resource-fact-universe-proof.js";
import {
  validateManifestAssets,
  validateManifestGeneration,
} from "./design-resource-fact-universe-assets.js";
import { unique } from "./design-resource-fact-universe-helpers.js";

export {
  conditionAxisValue,
  manifestIdentityDigest,
} from "./design-resource-fact-universe-helpers.js";

export function validateDesignResourceFactManifestUniverse(
  manifest: DesignResourceObservableFactManifestV1,
  handoff: DesignResourceHandoffV1,
  target: DesignResourceHandoffTargetV1,
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
  sourceItems: Map<string, string>,
): void {
  validateUniqueManifestCollections(manifest);
  const census = new Map(
    manifest.inspector.census.map((item) => [item.key, item]),
  );
  validateManifestInspector(
    manifest,
    handoff,
    target,
    resources,
    contents,
    sourceItems,
  );
  validateManifestDesignSystem(manifest, handoff, target, resources);
  validateManifestSubjects(manifest, census);
  validateManifestConditionUniverse(manifest, census, sourceItems);
  validateManifestVariationUniverse(manifest, census, sourceItems);
  validateManifestPropertyCatalog(manifest, census);
  validateManifestLineageNodes(manifest, census, resources, contents);
  validateManifestCensusOwnership(manifest);
  validateManifestFactCells(manifest, sourceItems, census);
  validateManifestFacts(manifest, handoff, resources, contents, sourceItems);
  validateManifestProofAndEvidence(manifest, target, resources, contents);
  validateManifestAssets(manifest, resources);
  validateManifestGeneration(manifest);
}

function validateUniqueManifestCollections(
  manifest: DesignResourceObservableFactManifestV1,
): void {
  for (const [name, rows] of [
    ["inspector_census", manifest.inspector.census],
    ["axis_disposition", manifest.axis_dispositions],
    ["condition_exclusion", manifest.condition_exclusions],
    ["condition", manifest.conditions],
    ["subject", manifest.subjects],
    ["variation_axis_disposition", manifest.variation_axis_dispositions],
    ["variation_exclusion", manifest.variation_exclusions],
    ["variation", manifest.variations],
    ["property", manifest.properties],
    ["lineage_node", manifest.lineage_nodes],
    ["fact_cell", manifest.fact_cells],
    ["fact", manifest.facts],
    ["evidence", manifest.evidence],
    ["proof_obligation", manifest.proof_obligations],
    ["oracle", manifest.oracles],
    ["environment", manifest.environments],
    ["asset_binding", manifest.asset_bindings],
    ["acceptance_blocker", manifest.acceptance_blockers],
  ] as const)
    unique(
      rows.map((item) => item.key),
      `manifest_${name}_key_duplicate`,
    );
}
