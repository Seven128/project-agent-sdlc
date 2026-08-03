import { Buffer } from "node:buffer";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import {
  semanticFactRevisionDigest,
  semanticObligationRevisionDigest,
} from "./semantic-fact-compact-carrier.js";
import { buildSemanticFactInspectorCensus } from "./semantic-fact-policy-census.js";
import { semanticFactCollectionIdentity } from "./semantic-fact-policy.js";
import { canonicalValueJson } from "./strict-codec.js";
import {
  applyCompactAuthoringSelectors,
  compactAuthoringTable,
  compactCapacityBudget,
  compactCommonFields as commonFields,
  compactWithoutFields as withoutFields,
} from "./compact-authoring-support.js";

export function createSemanticFactCompactCarrier(
  manifestInput: SemanticFactManifestV1,
): Record<string, unknown> {
  const manifest = normalizedMaterializedManifest(manifestInput);
  const proofDefaults = commonFields(
    manifest.proof_obligations as unknown as Record<string, unknown>[],
    ["key", "fact_ref"],
  );
  const base: Record<string, unknown> = {
    schema_version: "semantic-fact-compact-carrier-v1",
    key: manifest.key,
    capacity: {},
    scope: structuredClone(manifest.scope),
    inspector: {
      trust: manifest.inspector.trust,
      identity: manifest.inspector.identity,
      version: manifest.inspector.version,
      implementation_sha256: manifest.inspector.implementation_sha256,
      capabilities: structuredClone(manifest.inspector.capabilities),
      traversal: manifest.inspector.traversal,
      dynamic_discovery: manifest.inspector.dynamic_discovery,
    },
    selectors: [],
    catalogs: {
      inputs: compactTable(manifest.inputs),
      family_dispositions: compactTable(manifest.family_dispositions),
      subjects: compactTable(manifest.subjects),
      relations: compactTable(manifest.relations),
      populations: compactTable(manifest.populations),
      axis_dispositions: compactTable(manifest.axis_dispositions),
      condition_rules: compactTable(manifest.condition_rules),
      conditions: compactTable(manifest.conditions),
      condition_exclusions: compactTable(manifest.condition_exclusions),
      property_dispositions: compactTable(manifest.property_dispositions),
      fact_cells: compactTable(manifest.fact_cells),
      oracles: compactTable(manifest.oracles),
      environments: compactTable(manifest.environments),
      blockers: compactTable(manifest.blockers),
    },
    fact_sets: [
      {
        key: "fact-set.complete-source",
        ...compactTable(
          manifest.facts.map((fact) => ({
            fact_revision_digest: semanticFactRevisionDigest(
              fact as unknown as Record<string, unknown>,
            ),
            ...(fact as unknown as Record<string, unknown>),
          })),
          ["key"],
        ),
      },
    ],
    proof_templates: [
      {
        key: "proof-template.shared",
        proof: proofDefaults,
      },
    ],
    obligations: compactTable(
      manifest.proof_obligations.map((proof) => ({
        obligation_key: proof.key,
        obligation_revision_digest: semanticObligationRevisionDigest(
          proof as unknown as Record<string, unknown>,
        ),
        fact_key: proof.fact_ref,
        template_ref: "proof-template.shared",
        overrides: withoutFields(
          proof as unknown as Record<string, unknown>,
          ["key", "fact_ref", ...Object.keys(proofDefaults)],
        ),
      })),
    ),
    exceptions: [],
  };
  const { value: compact, selectors } = applyCompactAuthoringSelectors(base);
  compact.selectors = selectors;
  const measured = {
    inputs: manifest.inputs.length,
    catalog_rows:
      manifest.inputs.length +
      manifest.family_dispositions.length +
      manifest.subjects.length +
      manifest.relations.length +
      manifest.populations.length +
      manifest.axis_dispositions.length +
      manifest.condition_rules.length +
      manifest.conditions.length +
      manifest.condition_exclusions.length +
      manifest.property_dispositions.length +
      manifest.fact_cells.length +
      manifest.oracles.length +
      manifest.environments.length +
      manifest.blockers.length,
    selector_members: selectors.reduce(
      (sum, selector) => sum + selector.members.length,
      0,
    ),
    facts: manifest.facts.length,
    obligations: manifest.proof_obligations.length,
    census: manifest.inspector.census.length,
    canonical_bytes: Buffer.byteLength(canonicalValueJson(manifest), "utf8"),
  };
  compact.capacity = {
    theoretical_ground_universe: "not_materialized",
    measured,
    maximum: Object.fromEntries(
      Object.entries(measured).map(([name, count]) => [
        name,
        compactCapacityBudget(name, count),
      ]),
    ),
  };
  return compact;
}

function normalizedMaterializedManifest(
  input: SemanticFactManifestV1,
): SemanticFactManifestV1 {
  const manifest = structuredClone(input);
  manifest.inspector.census = buildSemanticFactInspectorCensus(manifest);
  const rows = {
    inputs: manifest.inputs,
    inspector_census: manifest.inspector.census,
    family_dispositions: manifest.family_dispositions,
    subjects: manifest.subjects,
    relations: manifest.relations,
    populations: manifest.populations,
    axis_dispositions: manifest.axis_dispositions,
    condition_rules: manifest.condition_rules,
    conditions: manifest.conditions,
    condition_exclusions: manifest.condition_exclusions,
    property_dispositions: manifest.property_dispositions,
    fact_cells: manifest.fact_cells,
    facts: manifest.facts,
    proof_obligations: manifest.proof_obligations,
    oracles: manifest.oracles,
    environments: manifest.environments,
    blockers: manifest.blockers,
  };
  manifest.generation = {
    strategy: "complete_explicit",
    sampling: "forbidden",
    truncation: "forbidden",
    chunk_count: 1,
    chunk_indexes: [0],
    collections: Object.entries(rows).map(([name, collection]) => ({
      name: name as SemanticFactManifestV1["generation"]["collections"][number]["name"],
      expected_count: collection.length,
      identity_sha256: semanticFactCollectionIdentity(collection),
    })),
  };
  return manifest;
}

function compactTable<T extends object>(
  input: T[],
  excludedDefaults: string[] = [],
): { defaults: Record<string, unknown>; columns: string[]; rows: unknown[][] } {
  return compactAuthoringTable(input, excludedDefaults);
}
