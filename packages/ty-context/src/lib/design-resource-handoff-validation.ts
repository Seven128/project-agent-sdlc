import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseDesignResourceHandoffMarkdown } from "./design-resource-handoff-parser.js";
import { validateDesignResourceFiles } from "./design-resource-handoff-file-validation.js";
import { loadAndValidateDesignResourceFactManifests } from "./design-resource-fact-manifest-validation.js";
import { validateDesignResourceFacts } from "./design-resource-handoff-validation-facts.js";
import type {
  DesignResourceHandoffPreflightV1,
  ParsedDesignResourceHandoffV1,
} from "./design-resource-handoff-types.js";
import {
  validateDesignResourceBlockers,
  validateDesignResourceCoverage,
  validateDesignResourceReachability,
} from "./design-resource-handoff-validation-coverage.js";
import {
  indexDesignResourceItems,
  invalidDesignResourceHandoff,
  requireNonemptyDesignResourceValues,
  requireUniqueDesignResourceObjects,
  requireUniqueDesignResourceValues,
} from "./design-resource-handoff-validation-primitives.js";
import {
  validateDesignResourceConditions,
  validateDesignResourceEvidence,
  validateDesignResourceScope,
  validateDesignResourceSubjects,
  validateDesignResourceTargets,
} from "./design-resource-handoff-validation-structure.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { sha256Hex } from "./strict-codec.js";

export async function preflightDesignResourceHandoff(
  repository: string,
  handoffPath: string,
): Promise<DesignResourceHandoffPreflightV1> {
  const handoffFile = await assertProtectedRepositoryFile(
    repository,
    path.resolve(repository, ...handoffPath.split("/")),
    "design_resource_handoff",
  );
  const parsed = parseDesignResourceHandoffMarkdown(
    handoffPath,
    await readFile(handoffFile, "utf8"),
  );
  validateDesignResourceHandoffSemantics(parsed);
  const resourceHashes = await validateResourceIntegrity(repository, parsed);
  await validateDesignResourceFiles(repository, parsed);
  const manifests = await loadAndValidateDesignResourceFactManifests(
    repository,
    parsed,
  );
  const handoff = parsed.handoff;
  return {
    schema_version: "design-resource-handoff-preflight-v1",
    status: "ready",
    ...parsed,
    resource_hashes: resourceHashes,
    counts: {
      resources: handoff.resources.length,
      manifests: manifests.size,
      axis_dispositions: handoff.axis_dispositions.length,
      conditions: handoff.conditions.length,
      subjects: handoff.subjects.length,
      variations: handoff.variations.length,
      properties: handoff.properties.length,
      lineage_nodes: handoff.lineage_nodes.length,
      targets: handoff.targets.length,
      evidence: handoff.evidence.length,
      fact_cells: handoff.fact_cells.length,
      facts: handoff.facts.length,
      proof_obligations: handoff.proof_obligations.length,
      oracles: handoff.oracles.length,
      environments: handoff.environments.length,
      asset_bindings: handoff.asset_bindings.length,
      resource_fact_closure: handoff.resource_fact_closure.length,
      coverage: handoff.coverage.length,
      acceptance_blockers: handoff.acceptance_blockers.length,
    },
  };
}

export function validateDesignResourceHandoffSemantics(
  parsed: ParsedDesignResourceHandoffV1,
): void {
  const { handoff } = parsed;
  requireNonemptyDesignResourceValues(
    handoff.scope.surface_keys,
    "scope_surface_keys_required",
  );
  requireNonemptyDesignResourceValues(handoff.resources, "resources_required");
  requireNonemptyDesignResourceValues(
    handoff.axis_dispositions,
    "axis_dispositions_required",
  );
  requireNonemptyDesignResourceValues(
    handoff.conditions,
    "conditions_required",
  );
  requireNonemptyDesignResourceValues(handoff.subjects, "subjects_required");
  requireNonemptyDesignResourceValues(
    handoff.variation_axis_dispositions,
    "variation_axis_dispositions_required",
  );
  requireNonemptyDesignResourceValues(
    handoff.variations,
    "variations_required",
  );
  requireNonemptyDesignResourceValues(
    handoff.properties,
    "properties_required",
  );
  requireNonemptyDesignResourceValues(handoff.targets, "targets_required");
  requireNonemptyDesignResourceValues(handoff.evidence, "evidence_required");
  requireNonemptyDesignResourceValues(
    handoff.fact_cells,
    "fact_cells_required",
  );
  requireNonemptyDesignResourceValues(handoff.facts, "facts_required");
  requireNonemptyDesignResourceValues(
    handoff.proof_obligations,
    "proof_obligations_required",
  );
  requireNonemptyDesignResourceValues(handoff.oracles, "oracles_required");
  requireNonemptyDesignResourceValues(
    handoff.environments,
    "environments_required",
  );
  requireNonemptyDesignResourceValues(
    handoff.resource_fact_closure,
    "resource_fact_closure_required",
  );
  requireNonemptyDesignResourceValues(handoff.coverage, "coverage_required");

  requireUniqueDesignResourceValues(
    handoff.scope.surface_keys,
    "scope_surface_key_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.resources,
    "resource_key_duplicate",
  );
  requireUniqueDesignResourceValues(
    handoff.resources.map((item) => item.path),
    "resource_path_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.axis_dispositions,
    "axis_disposition_key_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.condition_exclusions,
    "condition_exclusion_key_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.conditions,
    "condition_key_duplicate",
  );
  requireUniqueDesignResourceObjects(handoff.subjects, "subject_key_duplicate");
  requireUniqueDesignResourceObjects(
    handoff.variation_axis_dispositions,
    "variation_axis_disposition_key_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.variation_exclusions,
    "variation_exclusion_key_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.variations,
    "variation_key_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.properties,
    "property_key_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.lineage_nodes,
    "lineage_node_key_duplicate",
  );
  requireUniqueDesignResourceObjects(handoff.targets, "target_key_duplicate");
  requireUniqueDesignResourceObjects(
    handoff.evidence,
    "evidence_key_duplicate",
  );
  requireUniqueDesignResourceObjects(handoff.facts, "fact_key_duplicate");
  requireUniqueDesignResourceObjects(
    handoff.fact_cells,
    "fact_cell_key_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.proof_obligations,
    "proof_obligation_key_duplicate",
  );
  requireUniqueDesignResourceObjects(handoff.oracles, "oracle_key_duplicate");
  requireUniqueDesignResourceObjects(
    handoff.environments,
    "environment_key_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.asset_bindings,
    "asset_binding_key_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.resource_fact_closure,
    "resource_fact_closure_key_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.coverage,
    "coverage_key_duplicate",
  );
  requireUniqueDesignResourceObjects(
    handoff.acceptance_blockers,
    "acceptance_blocker_key_duplicate",
  );

  const resources = indexDesignResourceItems(handoff.resources);
  const conditions = indexDesignResourceItems(handoff.conditions);
  const subjects = indexDesignResourceItems(handoff.subjects);
  const targets = indexDesignResourceItems(handoff.targets);
  const evidence = indexDesignResourceItems(handoff.evidence);
  const facts = indexDesignResourceItems(handoff.facts);
  const sourceItems = new Map(Object.entries(parsed.source_item_kinds));
  validateDesignResourceScope(handoff);
  validateDesignResourceConditions(handoff);
  validateDesignResourceSubjects(handoff, targets);
  validateDesignResourceTargets(handoff, resources, conditions);
  validateDesignResourceEvidence(handoff, resources, conditions);
  validateDesignResourceCoverage(
    handoff,
    subjects,
    targets,
    conditions,
    evidence,
    facts,
    sourceItems,
  );
  validateDesignResourceFacts(
    handoff,
    resources,
    conditions,
    subjects,
    targets,
    evidence,
    sourceItems,
  );
  validateDesignResourceBlockers(handoff, subjects, targets, sourceItems);
  validateDesignResourceReachability(handoff);
}

async function validateResourceIntegrity(
  repository: string,
  parsed: ParsedDesignResourceHandoffV1,
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const resource of parsed.handoff.resources) {
    if (resource.path === parsed.handoff_path)
      invalidDesignResourceHandoff(
        "resource_must_not_be_handoff",
        resource.key,
      );
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...resource.path.split("/")),
      `design_resource:${resource.key}`,
    );
    const digest = sha256Hex(await readFile(file));
    if (digest !== resource.sha256)
      invalidDesignResourceHandoff(
        "resource_digest_mismatch",
        `${resource.key}:${resource.sha256}:${digest}`,
      );
    hashes[resource.key] = digest;
  }
  return hashes;
}
