import { Buffer } from "node:buffer";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { parseSemanticFactManifestShape } from "./semantic-fact-manifest-shape.js";
import { buildSemanticFactInspectorCensus } from "./semantic-fact-policy-census.js";
import {
  semanticFail,
  semanticLiteral,
  semanticObject,
  semanticStableRef,
} from "./semantic-fact-shape-primitives.js";
import { canonicalValueJson } from "./strict-codec.js";
import {
  parseSemanticCompactCapacity,
  parseSemanticCompactCatalogs,
  parseSemanticCompactExceptions,
  parseSemanticCompactFactSets,
  parseSemanticCompactObligations,
  parseSemanticCompactProofTemplates,
  parseSemanticCompactSelectors,
} from "./semantic-fact-compact-parser.js";
import {
  SEMANTIC_COMPACT_CATALOG_COLLECTIONS,
  type SemanticCompactCapacityCounts,
  assertUniqueSemanticCompactKeys,
  emptySemanticCompactCollectionRows,
  semanticCompactCollectionRows,
  semanticCompactGeneration,
  resolveSemanticCompactSelectors,
  validateSemanticCompactCapacity,
  validateSemanticCompactDeclaredMaximum,
} from "./semantic-fact-compact-support.js";

export {
  semanticFactRevisionDigest,
  semanticObligationRevisionDigest,
} from "./semantic-fact-compact-support.js";

export const SEMANTIC_FACT_COMPACT_CARRIER_VERSION =
  "semantic-fact-compact-carrier-v1" as const;

export interface SemanticFactRevisionIdentityV1 {
  key: string;
  revision_digest: string;
}

export interface MaterializedSemanticFactCompactCarrierV1 {
  manifest: SemanticFactManifestV1;
  fact_revisions: SemanticFactRevisionIdentityV1[];
  obligation_revisions: SemanticFactRevisionIdentityV1[];
  measured: SemanticCompactCapacityCounts;
}

export function parseSemanticFactCompactCarrierShape(
  value: unknown,
): MaterializedSemanticFactCompactCarrierV1 {
  const label = "semantic_fact_compact_carrier";
  const root = semanticObject(value, label, [
    "schema_version",
    "key",
    "capacity",
    "scope",
    "inspector",
    "selectors",
    "catalogs",
    "fact_sets",
    "proof_templates",
    "obligations",
    "exceptions",
  ]);
  semanticLiteral(
    root.schema_version,
    [SEMANTIC_FACT_COMPACT_CARRIER_VERSION] as const,
    `${label}.schema_version`,
  );
  const key = semanticStableRef(root.key, `${label}.key`);
  const capacity = parseSemanticCompactCapacity(
    root.capacity,
    `${label}.capacity`,
  );
  validateSemanticCompactDeclaredMaximum(capacity.maximum, label);
  const selectors = parseSemanticCompactSelectors(
    root.selectors,
    `${label}.selectors`,
  );
  const catalogs = parseSemanticCompactCatalogs(
    root.catalogs,
    selectors,
    `${label}.catalogs`,
  );
  const factRows = parseSemanticCompactFactSets(
    root.fact_sets,
    selectors,
    `${label}.fact_sets`,
  );
  const proofTemplates = parseSemanticCompactProofTemplates(
    root.proof_templates,
    selectors,
    `${label}.proof_templates`,
  );
  const obligationRows = parseSemanticCompactObligations(
    root.obligations,
    proofTemplates,
    selectors,
    `${label}.obligations`,
  );
  parseSemanticCompactExceptions(root.exceptions, `${label}.exceptions`);

  assertUniqueSemanticCompactKeys(
    factRows.map((item) => item.fact.key),
    `${label}.facts`,
  );
  assertUniqueSemanticCompactKeys(
    obligationRows.map((item) => item.proof.key),
    `${label}.obligations`,
  );
  const factKeys = new Set(factRows.map((item) => item.fact.key));
  for (const row of obligationRows)
    if (!factKeys.has(row.proof.fact_ref))
      semanticFail(
        `${label}.obligations`,
        `unknown fact_key: ${row.proof.fact_ref}`,
      );

  const preliminary = parseSemanticFactManifestShape({
    schema_version: "semantic-fact-manifest-v1",
    key,
    scope: resolveSemanticCompactSelectors(
      root.scope,
      selectors,
      `${label}.scope`,
    ),
    inspector: {
      ...(resolveSemanticCompactSelectors(
        root.inspector,
        selectors,
        `${label}.inspector`,
      ) as Record<string, unknown>),
      census: [],
    },
    generation: semanticCompactGeneration(
      emptySemanticCompactCollectionRows(catalogs, factRows, obligationRows),
    ),
    ...catalogs,
    facts: factRows.map((item) => item.fact),
    proof_obligations: obligationRows.map((item) => item.proof),
  });
  preliminary.inspector.census = buildSemanticFactInspectorCensus(preliminary);
  preliminary.generation = semanticCompactGeneration(
    semanticCompactCollectionRows(preliminary),
  );
  const manifest = parseSemanticFactManifestShape(preliminary);
  const measured: SemanticCompactCapacityCounts = {
    inputs: manifest.inputs.length,
    catalog_rows: SEMANTIC_COMPACT_CATALOG_COLLECTIONS.reduce(
      (sum, name) => sum + manifest[name].length,
      0,
    ),
    selector_members: [...selectors.values()].reduce(
      (sum, members) => sum + members.length,
      0,
    ),
    facts: manifest.facts.length,
    obligations: manifest.proof_obligations.length,
    census: manifest.inspector.census.length,
    canonical_bytes: Buffer.byteLength(canonicalValueJson(manifest), "utf8"),
  };
  validateSemanticCompactCapacity(capacity, measured, label);
  return {
    manifest,
    fact_revisions: factRows.map((item) => ({
      key: semanticStableRef(item.fact.key, `${label}.fact_revision.key`),
      revision_digest: item.revision_digest,
    })),
    obligation_revisions: obligationRows.map((item) => ({
      key: semanticStableRef(
        item.proof.key,
        `${label}.obligation_revision.key`,
      ),
      revision_digest: item.revision_digest,
    })),
    measured,
  };
}
