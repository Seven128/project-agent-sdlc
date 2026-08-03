import {
  SEMANTIC_FACT_MANIFEST_COLLECTIONS,
  type SemanticFactManifestCollectionName,
  type SemanticFactManifestV1,
} from "./semantic-fact-types.js";
import { semanticFactCollectionIdentity } from "./semantic-fact-policy.js";
import {
  semanticFail,
  semanticStableRef,
} from "./semantic-fact-shape-primitives.js";

export {
  indexSemanticFactRevisionInputs,
  legacySemanticFactRevisionDigest,
  legacySemanticObligationRevisionDigest,
  semanticFactRevisionDigest,
  semanticObligationRevisionDigest,
  type SemanticFactRevisionInput,
} from "./semantic-fact-compact-revision.js";

export const SEMANTIC_COMPACT_CATALOG_COLLECTIONS = [
  "inputs",
  "family_dispositions",
  "subjects",
  "relations",
  "populations",
  "axis_dispositions",
  "condition_rules",
  "conditions",
  "condition_exclusions",
  "property_dispositions",
  "fact_cells",
  "oracles",
  "environments",
  "blockers",
] as const;

export const SEMANTIC_COMPACT_CAPACITY_FIELDS = [
  "inputs",
  "catalog_rows",
  "selector_members",
  "facts",
  "obligations",
  "census",
  "canonical_bytes",
] as const;

type CapacityField = (typeof SEMANTIC_COMPACT_CAPACITY_FIELDS)[number];
export type SemanticCompactCapacityCounts = Record<CapacityField, number>;
export type SemanticCompactCatalogs = Record<
  (typeof SEMANTIC_COMPACT_CATALOG_COLLECTIONS)[number],
  unknown[]
>;

const PACKAGE_MAXIMUM: SemanticCompactCapacityCounts = {
  inputs: 100_000,
  catalog_rows: 2_000_000,
  selector_members: 5_000_000,
  facts: 1_000_000,
  obligations: 2_000_000,
  census: 10_000_000,
  canonical_bytes: 256 * 1024 * 1024,
};

export function resolveSemanticCompactSelectors(
  value: unknown,
  selectors: Map<string, string[]>,
  label: string,
): unknown {
  if (Array.isArray(value))
    return value.map((item, index) =>
      resolveSemanticCompactSelectors(item, selectors, `${label}[${index}]`),
    );
  if (!value || typeof value !== "object") return value;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length === 1 && Object.hasOwn(row, "selector_ref")) {
    const selectorRef = semanticStableRef(
      row.selector_ref,
      `${label}.selector_ref`,
    );
    const members = selectors.get(selectorRef);
    if (!members)
      semanticFail(`${label}.selector_ref`, `unknown selector: ${selectorRef}`);
    return [...members];
  }
  if (Object.hasOwn(row, "selector_ref"))
    semanticFail(label, "selector_ref must be the only key in its object");
  return Object.fromEntries(
    Object.entries(row).map(([key, item]) => [
      key,
      resolveSemanticCompactSelectors(item, selectors, `${label}.${key}`),
    ]),
  );
}

export function plainSemanticCompactObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    semanticFail(label, "must be an object");
  return value as Record<string, unknown>;
}

export function assertUniqueSemanticCompactKeys(
  rows: unknown[],
  label: string,
): void {
  const seen = new Set<string>();
  for (const [index, keyValue] of rows.entries()) {
    const key = semanticStableRef(keyValue, `${label}[${index}].key`);
    if (seen.has(key)) semanticFail(label, `duplicate key: ${key}`);
    seen.add(key);
  }
}

export function emptySemanticCompactCollectionRows(
  catalogs: Record<
    (typeof SEMANTIC_COMPACT_CATALOG_COLLECTIONS)[number],
    unknown[]
  >,
  facts: Array<{ fact: Record<string, unknown> }>,
  obligations: Array<{ proof: Record<string, unknown> }>,
): Record<SemanticFactManifestCollectionName, Array<{ key: string }>> {
  return {
    ...Object.fromEntries(
      SEMANTIC_COMPACT_CATALOG_COLLECTIONS.map((name) => [
        name,
        catalogs[name] as Array<{ key: string }>,
      ]),
    ),
    inspector_census: [],
    facts: facts.map((item) => item.fact as { key: string }),
    proof_obligations: obligations.map((item) => item.proof as { key: string }),
  } as unknown as Record<
    SemanticFactManifestCollectionName,
    Array<{ key: string }>
  >;
}

export function semanticCompactCollectionRows(
  manifest: SemanticFactManifestV1,
): Record<SemanticFactManifestCollectionName, Array<{ key: string }>> {
  return {
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
}

export function semanticCompactGeneration(
  rows: Record<SemanticFactManifestCollectionName, Array<{ key: string }>>,
): SemanticFactManifestV1["generation"] {
  return {
    strategy: "complete_explicit",
    sampling: "forbidden",
    truncation: "forbidden",
    chunk_count: 1,
    chunk_indexes: [0],
    collections: SEMANTIC_FACT_MANIFEST_COLLECTIONS.map((name) => ({
      name,
      expected_count: rows[name].length,
      identity_sha256: semanticFactCollectionIdentity(rows[name]),
    })),
  };
}

export function validateSemanticCompactCapacity(
  capacity: {
    measured: SemanticCompactCapacityCounts;
    maximum: SemanticCompactCapacityCounts;
  },
  measured: SemanticCompactCapacityCounts,
  label: string,
): void {
  for (const field of SEMANTIC_COMPACT_CAPACITY_FIELDS) {
    if (capacity.maximum[field] > PACKAGE_MAXIMUM[field])
      semanticFail(
        `${label}.capacity.maximum.${field}`,
        `exceeds package maximum ${PACKAGE_MAXIMUM[field]}`,
      );
    if (capacity.measured[field] !== measured[field])
      semanticFail(
        `${label}.capacity.measured.${field}`,
        `measured mismatch: ${capacity.measured[field]}:${measured[field]}`,
      );
    if (measured[field] > capacity.maximum[field])
      semanticFail(
        `${label}.capacity.maximum.${field}`,
        `capacity exceeded: ${measured[field]}:${capacity.maximum[field]}`,
      );
  }
}

export function validateSemanticCompactDeclaredMaximum(
  maximum: SemanticCompactCapacityCounts,
  label: string,
): void {
  for (const field of SEMANTIC_COMPACT_CAPACITY_FIELDS)
    if (maximum[field] > PACKAGE_MAXIMUM[field])
      semanticFail(
        `${label}.capacity.maximum.${field}`,
        `exceeds package maximum ${PACKAGE_MAXIMUM[field]}`,
      );
}
