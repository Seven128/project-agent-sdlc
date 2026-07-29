import type { DesignResourceObservableFactManifestV1 } from "./design-resource-fact-manifest-types.js";
import {
  parseDesignResourceHandoffBlockers,
  parseDesignResourceHandoffEvidence,
  parseDesignResourceHandoffFacts,
} from "./design-resource-handoff-shape-evidence.js";
import {
  parseDesignResourceHandoffConditions,
  parseDesignResourceHandoffSubjects,
} from "./design-resource-handoff-shape-structure.js";
import { contractKey } from "./design-resource-handoff-shape-primitives.js";
import { literal, object } from "./long-task-shape-primitives.js";
import {
  parseDesignResourceFactManifestGeneration,
  parseDesignResourceFactManifestInspector,
  parseDesignResourceLineageNodes,
  parseDesignResourceManifestDesignSystem,
} from "./design-resource-fact-manifest-shape-inspector.js";
import {
  parseDesignResourceAxisDispositions,
  parseDesignResourceConditionExclusions,
  parseDesignResourceVariationAxisDispositions,
  parseDesignResourceVariationExclusions,
  parseDesignResourceVariations,
} from "./design-resource-fact-manifest-shape-axes.js";
import {
  parseDesignResourceFactCells,
  parseDesignResourceProofObligations,
  parseDesignResourceProperties,
} from "./design-resource-fact-manifest-shape-facts.js";
import {
  parseDesignResourceAssetBindings,
  parseDesignResourceEnvironments,
  parseDesignResourceOracles,
} from "./design-resource-fact-manifest-shape-evidence.js";

export * from "./design-resource-fact-manifest-shape-inspector.js";
export * from "./design-resource-fact-manifest-shape-axes.js";
export * from "./design-resource-fact-manifest-shape-facts.js";
export * from "./design-resource-fact-manifest-shape-evidence.js";

export function parseDesignResourceFactManifestJson(
  content: string,
): DesignResourceObservableFactManifestV1 {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `design_resource_fact_manifest_invalid:json:${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return parseDesignResourceFactManifestShape(value);
}

export function parseDesignResourceFactManifestShape(
  value: unknown,
): DesignResourceObservableFactManifestV1 {
  const label = "design_resource_fact_manifest";
  const root = object(value, label, [
    "schema_version",
    "scope_key",
    "target_key",
    "inspector",
    "design_system",
    "generation",
    "axis_dispositions",
    "condition_exclusions",
    "conditions",
    "subjects",
    "variation_axis_dispositions",
    "variation_exclusions",
    "variations",
    "properties",
    "lineage_nodes",
    "fact_cells",
    "facts",
    "evidence",
    "proof_obligations",
    "oracles",
    "environments",
    "asset_bindings",
    "acceptance_blockers",
  ]);
  return {
    schema_version: literal(
      root.schema_version,
      ["design-resource-observable-fact-manifest-v1"] as const,
      `${label}.schema_version`,
    ),
    scope_key: contractKey(root.scope_key, `${label}.scope_key`),
    target_key: contractKey(root.target_key, `${label}.target_key`),
    inspector: parseDesignResourceFactManifestInspector(
      root.inspector,
      `${label}.inspector`,
    ),
    design_system: parseDesignResourceManifestDesignSystem(
      root.design_system,
      `${label}.design_system`,
    ),
    generation: parseDesignResourceFactManifestGeneration(
      root.generation,
      `${label}.generation`,
    ),
    axis_dispositions: parseDesignResourceAxisDispositions(
      root.axis_dispositions,
      `${label}.axis_dispositions`,
    ),
    condition_exclusions: parseDesignResourceConditionExclusions(
      root.condition_exclusions,
      `${label}.condition_exclusions`,
    ),
    conditions: parseDesignResourceHandoffConditions(root.conditions),
    subjects: parseDesignResourceHandoffSubjects(root.subjects),
    variation_axis_dispositions: parseDesignResourceVariationAxisDispositions(
      root.variation_axis_dispositions,
      `${label}.variation_axis_dispositions`,
    ),
    variation_exclusions: parseDesignResourceVariationExclusions(
      root.variation_exclusions,
      `${label}.variation_exclusions`,
    ),
    variations: parseDesignResourceVariations(
      root.variations,
      `${label}.variations`,
    ),
    properties: parseDesignResourceProperties(
      root.properties,
      `${label}.properties`,
    ),
    lineage_nodes: parseDesignResourceLineageNodes(
      root.lineage_nodes,
      `${label}.lineage_nodes`,
    ),
    fact_cells: parseDesignResourceFactCells(
      root.fact_cells,
      `${label}.fact_cells`,
    ),
    facts: parseDesignResourceHandoffFacts(root.facts),
    evidence: parseDesignResourceHandoffEvidence(root.evidence),
    proof_obligations: parseDesignResourceProofObligations(
      root.proof_obligations,
      `${label}.proof_obligations`,
    ),
    oracles: parseDesignResourceOracles(root.oracles, `${label}.oracles`),
    environments: parseDesignResourceEnvironments(
      root.environments,
      `${label}.environments`,
    ),
    asset_bindings: parseDesignResourceAssetBindings(
      root.asset_bindings,
      `${label}.asset_bindings`,
    ),
    acceptance_blockers: parseDesignResourceHandoffBlockers(
      root.acceptance_blockers,
    ),
  };
}
