import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import {
  parseDesignResourceAssetBindings,
  parseDesignResourceAxisDispositions,
  parseDesignResourceConditionExclusions,
  parseDesignResourceEnvironments,
  parseDesignResourceFactCells,
  parseDesignResourceLineageNodes,
  parseDesignResourceOracles,
  parseDesignResourceProofObligations,
  parseDesignResourceProperties,
  parseDesignResourceVariationAxisDispositions,
  parseDesignResourceVariationExclusions,
  parseDesignResourceVariations,
} from "./design-resource-fact-manifest-shape.js";
import {
  parseDesignResourceHandoffBlockers,
  parseDesignResourceHandoffCoverage,
  parseDesignResourceHandoffEvidence,
  parseDesignResourceHandoffFacts,
  parseDesignResourceHandoffResourceFactClosure,
} from "./design-resource-handoff-shape-evidence.js";
import {
  contractKey,
  stableKeys,
} from "./design-resource-handoff-shape-primitives.js";
import {
  parseDesignResourceHandoffConditions,
  parseDesignResourceHandoffResources,
  parseDesignResourceHandoffSubjects,
  parseDesignResourceHandoffTargets,
} from "./design-resource-handoff-shape-structure.js";
import {
  literal,
  object,
  repositoryFile,
  string,
  strings,
} from "./long-task-shape-primitives.js";

export function parseDesignResourceHandoffShape(
  value: unknown,
): DesignResourceHandoffV1 {
  const root = object(value, "design_resource_handoff", [
    "schema_version",
    "intent",
    "scope",
    "provenance",
    "resources",
    "axis_dispositions",
    "condition_exclusions",
    "conditions",
    "subjects",
    "variation_axis_dispositions",
    "variation_exclusions",
    "variations",
    "properties",
    "lineage_nodes",
    "targets",
    "evidence",
    "fact_cells",
    "facts",
    "proof_obligations",
    "oracles",
    "environments",
    "asset_bindings",
    "resource_fact_closure",
    "coverage",
    "acceptance_blockers",
    "proposal",
  ]);
  const scope = object(root.scope, "design_resource_handoff.scope", [
    "key",
    "style_dependency",
    "surface_keys",
    "necessary_context",
    "exclusions",
  ]);
  const provenance = object(
    root.provenance,
    "design_resource_handoff.provenance",
    [
      "provider",
      "provider_version",
      "project",
      "run",
      "capability",
      "agent",
      "model",
      "design_system_id",
    ],
  );
  const proposal = object(root.proposal, "design_resource_handoff.proposal", [
    "reconciliation_status",
    "path",
    "revision",
  ]);
  return {
    schema_version: literal(
      root.schema_version,
      ["design-resource-handoff-v1"] as const,
      "design_resource_handoff.schema_version",
    ),
    intent: literal(
      root.intent,
      ["implementation_handoff"] as const,
      "design_resource_handoff.intent",
    ),
    scope: {
      key: contractKey(scope.key, "design_resource_handoff.scope.key"),
      style_dependency: literal(
        scope.style_dependency,
        ["style-bearing", "non-fidelity", "mixed"] as const,
        "design_resource_handoff.scope.style_dependency",
      ),
      surface_keys: stableKeys(
        scope.surface_keys,
        "design_resource_handoff.scope.surface_keys",
      ),
      necessary_context: strings(
        scope.necessary_context,
        "design_resource_handoff.scope.necessary_context",
      ),
      exclusions: strings(
        scope.exclusions,
        "design_resource_handoff.scope.exclusions",
      ),
    },
    provenance: {
      provider: string(
        provenance.provider,
        "design_resource_handoff.provenance.provider",
      ),
      provider_version: string(
        provenance.provider_version,
        "design_resource_handoff.provenance.provider_version",
      ),
      project: string(
        provenance.project,
        "design_resource_handoff.provenance.project",
      ),
      run: string(provenance.run, "design_resource_handoff.provenance.run"),
      capability: string(
        provenance.capability,
        "design_resource_handoff.provenance.capability",
      ),
      agent: string(
        provenance.agent,
        "design_resource_handoff.provenance.agent",
      ),
      model: string(
        provenance.model,
        "design_resource_handoff.provenance.model",
      ),
      design_system_id: string(
        provenance.design_system_id,
        "design_resource_handoff.provenance.design_system_id",
      ),
    },
    resources: parseDesignResourceHandoffResources(root.resources),
    axis_dispositions: parseDesignResourceAxisDispositions(
      root.axis_dispositions,
    ),
    condition_exclusions: parseDesignResourceConditionExclusions(
      root.condition_exclusions,
    ),
    conditions: parseDesignResourceHandoffConditions(root.conditions),
    subjects: parseDesignResourceHandoffSubjects(root.subjects),
    variation_axis_dispositions: parseDesignResourceVariationAxisDispositions(
      root.variation_axis_dispositions,
    ),
    variation_exclusions: parseDesignResourceVariationExclusions(
      root.variation_exclusions,
    ),
    variations: parseDesignResourceVariations(root.variations),
    properties: parseDesignResourceProperties(root.properties),
    lineage_nodes: parseDesignResourceLineageNodes(root.lineage_nodes),
    targets: parseDesignResourceHandoffTargets(root.targets),
    evidence: parseDesignResourceHandoffEvidence(root.evidence),
    fact_cells: parseDesignResourceFactCells(root.fact_cells),
    facts: parseDesignResourceHandoffFacts(root.facts),
    proof_obligations: parseDesignResourceProofObligations(
      root.proof_obligations,
    ),
    oracles: parseDesignResourceOracles(root.oracles),
    environments: parseDesignResourceEnvironments(root.environments),
    asset_bindings: parseDesignResourceAssetBindings(root.asset_bindings),
    resource_fact_closure: parseDesignResourceHandoffResourceFactClosure(
      root.resource_fact_closure,
    ),
    coverage: parseDesignResourceHandoffCoverage(root.coverage),
    acceptance_blockers: parseDesignResourceHandoffBlockers(
      root.acceptance_blockers,
    ),
    proposal: {
      reconciliation_status: literal(
        proposal.reconciliation_status,
        ["applied", "returned", "not_applicable"] as const,
        "design_resource_handoff.proposal.reconciliation_status",
      ),
      path: repositoryFile(
        proposal.path,
        "design_resource_handoff.proposal.path",
      ),
      revision: string(
        proposal.revision,
        "design_resource_handoff.proposal.revision",
      ),
    },
  };
}
