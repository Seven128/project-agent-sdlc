import {
  semanticArray,
  semanticFail,
  semanticInteger,
  semanticLiteral,
  semanticObject,
  semanticSha256,
  semanticStableRef,
  semanticStableRefs,
  semanticString,
} from "./semantic-fact-shape-primitives.js";
import {
  SEMANTIC_COMPACT_CAPACITY_FIELDS,
  SEMANTIC_COMPACT_CATALOG_COLLECTIONS,
  type SemanticCompactCapacityCounts,
  type SemanticCompactCatalogs,
  plainSemanticCompactObject,
  resolveSemanticCompactSelectors,
  semanticFactRevisionDigest,
  semanticObligationRevisionDigest,
} from "./semantic-fact-compact-support.js";

export function parseSemanticCompactCapacity(
  value: unknown,
  label: string,
): {
  measured: SemanticCompactCapacityCounts;
  maximum: SemanticCompactCapacityCounts;
} {
  const row = semanticObject(value, label, [
    "theoretical_ground_universe",
    "measured",
    "maximum",
  ]);
  semanticLiteral(
    row.theoretical_ground_universe,
    ["not_materialized"] as const,
    `${label}.theoretical_ground_universe`,
  );
  return {
    measured: parseCapacityCounts(row.measured, `${label}.measured`),
    maximum: parseCapacityCounts(row.maximum, `${label}.maximum`),
  };
}

function parseCapacityCounts(value: unknown, label: string): SemanticCompactCapacityCounts {
  const row = semanticObject(value, label, [...SEMANTIC_COMPACT_CAPACITY_FIELDS]);
  return Object.fromEntries(
    SEMANTIC_COMPACT_CAPACITY_FIELDS.map((field) => [
      field,
      semanticInteger(row[field], `${label}.${field}`),
    ]),
  ) as SemanticCompactCapacityCounts;
}

export function parseSemanticCompactSelectors(
  value: unknown,
  label: string,
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const [index, item] of semanticArray(value, label).entries()) {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, ["key", "members"]);
    const key = semanticStableRef(row.key, `${itemLabel}.key`);
    const members = semanticStableRefs(row.members, `${itemLabel}.members`);
    if (result.has(key)) semanticFail(itemLabel, `duplicate key: ${key}`);
    if (new Set(members).size !== members.length)
      semanticFail(itemLabel, "members must be unique");
    result.set(key, members);
  }
  return result;
}

export function parseSemanticCompactCatalogs(
  value: unknown,
  selectors: Map<string, string[]>,
  label: string,
): SemanticCompactCatalogs {
  const row = semanticObject(value, label, [
    ...SEMANTIC_COMPACT_CATALOG_COLLECTIONS,
  ]);
  return Object.fromEntries(
    SEMANTIC_COMPACT_CATALOG_COLLECTIONS.map((name) => [
      name,
      parseCompactTable(row[name], selectors, `${label}.${name}`),
    ]),
  ) as SemanticCompactCatalogs;
}

export function parseSemanticCompactFactSets(
  value: unknown,
  selectors: Map<string, string[]>,
  label: string,
): Array<{ fact: Record<string, unknown>; revision_digest: string }> {
  const result: Array<{
    fact: Record<string, unknown>;
    revision_digest: string;
  }> = [];
  const setKeys = new Set<string>();
  for (const [setIndex, item] of semanticArray(value, label).entries()) {
    const setLabel = `${label}[${setIndex}]`;
    const row = semanticObject(item, setLabel, [
      "key",
      "defaults",
      "columns",
      "rows",
    ]);
    const setKey = semanticStableRef(row.key, `${setLabel}.key`);
    if (setKeys.has(setKey)) semanticFail(setLabel, `duplicate key: ${setKey}`);
    setKeys.add(setKey);
    const defaults = plainSemanticCompactObject(
      row.defaults,
      `${setLabel}.defaults`,
    );
    if (Object.hasOwn(defaults, "key"))
      semanticFail(`${setLabel}.defaults`, "key cannot be defaulted");
    const rows = parseCompactTable(
      { defaults, columns: row.columns, rows: row.rows },
      selectors,
      setLabel,
    );
    for (const [rowIndex, factItem] of rows.entries()) {
      const rowLabel = `${setLabel}.rows[${rowIndex}]`;
      const factRow = plainSemanticCompactObject(factItem, rowLabel);
      if (!Object.hasOwn(factRow, "fact_revision_digest"))
        semanticFail(rowLabel, "missing fact_revision_digest");
      const { fact_revision_digest: digestValue, ...fact } = factRow;
      const revisionDigest = semanticSha256(
        digestValue,
        `${rowLabel}.fact_revision_digest`,
      );
      const actualDigest = semanticFactRevisionDigest(fact);
      if (revisionDigest !== actualDigest)
        semanticFail(
          `${rowLabel}.fact_revision_digest`,
          `revision digest mismatch: ${revisionDigest}:${actualDigest}`,
        );
      result.push({ fact, revision_digest: revisionDigest });
    }
  }
  return result;
}

export function parseSemanticCompactProofTemplates(
  value: unknown,
  selectors: Map<string, string[]>,
  label: string,
): Map<string, Record<string, unknown>> {
  const result = new Map<string, Record<string, unknown>>();
  for (const [index, item] of semanticArray(value, label).entries()) {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, ["key", "proof"]);
    const key = semanticStableRef(row.key, `${itemLabel}.key`);
    const proof = plainSemanticCompactObject(
      resolveSemanticCompactSelectors(row.proof, selectors, `${itemLabel}.proof`),
      `${itemLabel}.proof`,
    );
    if (Object.hasOwn(proof, "key") || Object.hasOwn(proof, "fact_ref"))
      semanticFail(
        `${itemLabel}.proof`,
        "key and fact_ref belong to obligation rows",
      );
    if (result.has(key)) semanticFail(itemLabel, `duplicate key: ${key}`);
    result.set(key, proof);
  }
  return result;
}

export function parseSemanticCompactObligations(
  value: unknown,
  templates: Map<string, Record<string, unknown>>,
  selectors: Map<string, string[]>,
  label: string,
): Array<{ proof: Record<string, unknown>; revision_digest: string }> {
  return parseCompactTable(value, selectors, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "obligation_key",
      "obligation_revision_digest",
      "fact_key",
      "template_ref",
      "overrides",
    ]);
    const obligationKey = semanticStableRef(
      row.obligation_key,
      `${itemLabel}.obligation_key`,
    );
    const factKey = semanticStableRef(row.fact_key, `${itemLabel}.fact_key`);
    const templateRef = semanticStableRef(
      row.template_ref,
      `${itemLabel}.template_ref`,
    );
    const template = templates.get(templateRef);
    if (!template)
      semanticFail(`${itemLabel}.template_ref`, `unknown template: ${templateRef}`);
    const overrides = plainSemanticCompactObject(
      resolveSemanticCompactSelectors(
        row.overrides,
        selectors,
        `${itemLabel}.overrides`,
      ),
      `${itemLabel}.overrides`,
    );
    if (Object.hasOwn(overrides, "key") || Object.hasOwn(overrides, "fact_ref"))
      semanticFail(
        `${itemLabel}.overrides`,
        "key and fact_ref cannot be overridden",
      );
    const proof = {
      ...template,
      ...overrides,
      key: obligationKey,
      fact_ref: factKey,
    };
    const revisionDigest = semanticSha256(
      row.obligation_revision_digest,
      `${itemLabel}.obligation_revision_digest`,
    );
    const actualDigest = semanticObligationRevisionDigest(proof);
    if (revisionDigest !== actualDigest)
      semanticFail(
        `${itemLabel}.obligation_revision_digest`,
        `revision digest mismatch: ${revisionDigest}:${actualDigest}`,
      );
    return { proof, revision_digest: revisionDigest };
  });
}

function parseCompactTable(
  value: unknown,
  selectors: Map<string, string[]>,
  label: string,
): Record<string, unknown>[] {
  const table = semanticObject(value, label, ["defaults", "columns", "rows"]);
  const defaults = plainSemanticCompactObject(
    resolveSemanticCompactSelectors(table.defaults, selectors, `${label}.defaults`),
    `${label}.defaults`,
  );
  const columns = semanticArray(table.columns, `${label}.columns`).map(
    (item, index) => {
      const column = semanticString(item, `${label}.columns[${index}]`);
      if (!/^[a-z][a-z0-9_]*$/u.test(column))
        semanticFail(`${label}.columns[${index}]`, "invalid column name");
      return column;
    },
  );
  if (new Set(columns).size !== columns.length)
    semanticFail(`${label}.columns`, "columns must be unique");
  for (const column of columns)
    if (Object.hasOwn(defaults, column))
      semanticFail(
        `${label}.columns`,
        `column duplicates default field: ${column}`,
      );
  return semanticArray(table.rows, `${label}.rows`).map((item, index) => {
    const rowLabel = `${label}.rows[${index}]`;
    const values = semanticArray(item, rowLabel);
    if (values.length !== columns.length)
      semanticFail(
        rowLabel,
        `column count mismatch: ${values.length}:${columns.length}`,
      );
    return {
      ...defaults,
      ...Object.fromEntries(
        columns.map((column, columnIndex) => [
          column,
          resolveSemanticCompactSelectors(
            values[columnIndex],
            selectors,
            `${rowLabel}[${columnIndex}]`,
          ),
        ]),
      ),
    };
  });
}

export function parseSemanticCompactExceptions(
  value: unknown,
  label: string,
): void {
  const seen = new Set<string>();
  for (const [index, item] of semanticArray(value, label).entries()) {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "target_ref",
      "rationale",
    ]);
    const key = semanticStableRef(row.key, `${itemLabel}.key`);
    semanticStableRef(row.target_ref, `${itemLabel}.target_ref`);
    if (typeof row.rationale !== "string" || !row.rationale.trim())
      semanticFail(`${itemLabel}.rationale`, "must be a non-empty string");
    if (seen.has(key)) semanticFail(itemLabel, `duplicate key: ${key}`);
    seen.add(key);
  }
}
