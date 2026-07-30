import type { DesignResourceObservableFactManifestV1 } from "./design-resource-fact-manifest-types.js";
import type {
  DesignResourceHandoffManifestBackedV1,
  DesignResourceHandoffV1,
} from "./design-resource-handoff-types.js";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";

export function hydrateManifestBackedDesignResourceHandoff(
  descriptor: DesignResourceHandoffManifestBackedV1,
  manifests: Map<string, DesignResourceObservableFactManifestV1>,
): DesignResourceHandoffV1 {
  if (descriptor.targets.length !== 1)
    invalidDesignResourceHandoff(
      "manifest_backed_one_target_required",
      String(descriptor.targets.length),
    );
  const target = descriptor.targets[0];
  const manifest = manifests.get(target.key);
  if (!manifest)
    invalidDesignResourceHandoff("fact_manifest_target_missing", target.key);
  return {
    schema_version: descriptor.schema_version,
    intent: descriptor.intent,
    scope: descriptor.scope,
    provenance: descriptor.provenance,
    resources: descriptor.resources,
    axis_dispositions: manifest.axis_dispositions,
    condition_exclusions: manifest.condition_exclusions,
    conditions: manifest.conditions,
    subjects: manifest.subjects,
    variation_axis_dispositions: manifest.variation_axis_dispositions,
    variation_exclusions: manifest.variation_exclusions,
    variations: manifest.variations,
    properties: manifest.properties,
    lineage_nodes: manifest.lineage_nodes,
    targets: descriptor.targets,
    evidence: manifest.evidence,
    fact_cells: manifest.fact_cells,
    facts: manifest.facts,
    proof_obligations: manifest.proof_obligations,
    oracles: manifest.oracles,
    environments: manifest.environments,
    asset_bindings: manifest.asset_bindings,
    resource_fact_closure: descriptor.resource_fact_closure,
    coverage: descriptor.coverage,
    acceptance_blockers: manifest.acceptance_blockers,
    proposal: descriptor.proposal,
  };
}
