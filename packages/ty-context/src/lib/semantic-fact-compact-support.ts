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
import type { CompactSharedStructureTarget } from "./compact-shared-structures.js";

export {
  SEMANTIC_COMPACT_CAPACITY_FIELDS,
  validateSemanticCompactCapacity,
  validateSemanticCompactDeclaredMaximum,
  type SemanticCompactCapacityCounts,
} from "./semantic-fact-compact-capacity.js";

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

export type SemanticCompactCatalogs = Record<
  (typeof SEMANTIC_COMPACT_CATALOG_COLLECTIONS)[number],
  unknown[]
>;

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

export function semanticCompactSharedStructureTargets(
  root: Record<string, unknown>,
): CompactSharedStructureTarget[] {
  const targets: CompactSharedStructureTarget[] = [];
  addObjectFieldTargets(targets, root.scope, "source.scope");
  addObjectFieldTargets(targets, root.inspector, "source.inspector");
  const catalogs = plainRecord(root.catalogs);
  for (const name of SEMANTIC_COMPACT_CATALOG_COLLECTIONS)
    addCompactTableTargets(targets, catalogs?.[name], `source.catalog.${name}`);
  if (Array.isArray(root.fact_sets))
    for (const factSet of root.fact_sets)
      addCompactTableTargets(targets, factSet, "source.fact");
  if (Array.isArray(root.proof_templates))
    for (const template of root.proof_templates) {
      const row = plainRecord(template);
      if (row && Object.hasOwn(row, "proof"))
        addTarget(targets, row, "proof", "source.proof.policy");
    }
  addCompactTableTargets(targets, root.obligations, "source.obligation");
  return targets;
}

function addCompactTableTargets(
  targets: CompactSharedStructureTarget[],
  value: unknown,
  boundary: string,
): void {
  const table = plainRecord(value);
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows))
    return;
  const columns = table.columns.map(String);
  addObjectFieldTargets(targets, table.defaults, `${boundary}.default`);
  for (const rowValue of table.rows) {
    if (!Array.isArray(rowValue) || rowValue.length !== columns.length)
      continue;
    for (const [index, column] of columns.entries())
      if (isComposite(rowValue[index]))
        addTarget(targets, rowValue, index, `${boundary}.${column}`);
  }
}

function addObjectFieldTargets(
  targets: CompactSharedStructureTarget[],
  value: unknown,
  boundary: string,
): void {
  const row = plainRecord(value);
  if (!row) return;
  for (const key of Object.keys(row))
    if (isComposite(row[key]))
      addTarget(targets, row, key, `${boundary}.${key}`);
}

function addTarget(
  targets: CompactSharedStructureTarget[],
  parent: Record<string, unknown> | unknown[],
  key: string | number,
  boundary: string,
): void {
  targets.push({
    boundary,
    read: () => parent[key as never],
    write: (value) => {
      parent[key as never] = value as never;
    },
  });
}

function plainRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isComposite(value: unknown): boolean {
  return Boolean(value && typeof value === "object");
}
