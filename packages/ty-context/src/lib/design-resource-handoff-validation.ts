import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseDesignResourceHandoffMarkdown } from "./design-resource-handoff-parser.js";
import { validateDesignResourceFiles } from "./design-resource-handoff-file-validation.js";
import {
  parseDesignResourceFactManifests,
  validateDesignResourceFactManifests,
} from "./design-resource-fact-manifest-validation.js";
import { hydrateManifestBackedDesignResourceHandoff } from "./design-resource-handoff-manifest-projection.js";
import { readDesignResourceSnapshot } from "./design-resource-handoff-snapshot.js";
import { validateDesignResourceFacts } from "./design-resource-handoff-validation-facts.js";
import type {
  DesignResourceHandoffInputV1,
  DesignResourceHandoffManifestBackedV1,
  ParsedDesignResourceHandoffInputV1,
} from "./design-resource-handoff-input-types.js";
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
  return preflightParsedDesignResourceHandoff(repository, parsed);
}

export async function preflightParsedDesignResourceHandoff(
  repository: string,
  parsed: ParsedDesignResourceHandoffInputV1,
): Promise<DesignResourceHandoffPreflightV1> {
  const inputHandoff = parsed.handoff;
  if (isManifestBacked(inputHandoff) && inputHandoff.targets.length !== 1)
    invalidDesignResourceHandoff(
      "manifest_backed_one_target_required",
      String(inputHandoff.targets.length),
    );
  if (!isManifestBacked(inputHandoff))
    validateDesignResourceHandoffSemantics({
      ...parsed,
      handoff: inputHandoff,
    });
  const snapshot = await readDesignResourceSnapshot(repository, parsed);
  const manifests = parseDesignResourceFactManifests(parsed, snapshot.contents);
  const handoff = isManifestBacked(inputHandoff)
    ? hydrateManifestBackedDesignResourceHandoff(inputHandoff, manifests)
    : inputHandoff;
  const normalized: ParsedDesignResourceHandoffV1 = { ...parsed, handoff };
  if (isManifestBacked(inputHandoff))
    validateDesignResourceHandoffSemantics(normalized);
  validateDesignResourceFiles(normalized, snapshot.contents);
  validateDesignResourceFactManifests(
    normalized,
    snapshot.contents,
    manifests,
    !isManifestBacked(inputHandoff),
  );
  const resources = new Map(
    handoff.resources.map((resource) => [resource.key, resource]),
  );
  return {
    schema_version: "design-resource-handoff-preflight-v1",
    status: "ready",
    ...normalized,
    resource_hashes: snapshot.hashes,
    manifest_identities: handoff.targets.map((target) => {
      const resourceRef = target.source_profile.fact_manifest_resource_ref;
      const resource = resources.get(resourceRef)!;
      const manifest = manifests.get(target.key)!;
      return {
        resource_ref: resourceRef,
        path: resource.path,
        sha256: snapshot.hashes[resourceRef],
        scope_key: manifest.scope_key,
        target_key: manifest.target_key,
        collections: manifest.generation.collections.map((collection) => ({
          ...collection,
        })),
      };
    }),
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

function isManifestBacked(
  handoff: DesignResourceHandoffInputV1,
): handoff is DesignResourceHandoffManifestBackedV1 {
  return "representation" in handoff;
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
