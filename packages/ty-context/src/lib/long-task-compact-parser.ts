import {
  LONG_TASK_COMPACT_CAPACITY_FIELDS,
  type LongTaskCompactCapacityCounts,
  compactArray,
  compactFail,
  compactInteger,
  compactNonemptyString,
  compactPlainObject,
  compactResolveSelectors,
  compactStableRef,
  compactStableRefs,
  compactStrictObject,
} from "./long-task-compact-primitives.js";

export function parseLongTaskCompactFactSets(
  value: unknown,
  selectors: Map<string, string[]>,
  label: string,
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  const keys = new Set<string>();
  for (const [index, item] of compactArray(value, label).entries()) {
    const itemLabel = `${label}[${index}]`;
    const row = compactStrictObject(item, itemLabel, [
      "key",
      "defaults",
      "columns",
      "rows",
    ]);
    const key = compactStableRef(row.key, `${itemLabel}.key`);
    if (keys.has(key)) compactFail(itemLabel, `duplicate key: ${key}`);
    keys.add(key);
    result.push(
      ...parseLongTaskCompactTable(
        { defaults: row.defaults, columns: row.columns, rows: row.rows },
        selectors,
        itemLabel,
      ),
    );
  }
  return result;
}

export function parseLongTaskCompactProofTemplates(
  value: unknown,
  selectors: Map<string, string[]>,
  label: string,
): Map<string, Record<string, unknown>> {
  const result = new Map<string, Record<string, unknown>>();
  for (const [index, item] of compactArray(value, label).entries()) {
    const itemLabel = `${label}[${index}]`;
    const row = compactStrictObject(item, itemLabel, ["key", "binding"]);
    const key = compactStableRef(row.key, `${itemLabel}.key`);
    if (result.has(key)) compactFail(itemLabel, `duplicate key: ${key}`);
    const binding = compactPlainObject(
      compactResolveSelectors(row.binding, selectors, `${itemLabel}.binding`),
      `${itemLabel}.binding`,
    );
    if (
      ["proof_ref", "fact_ref"].some((field) => Object.hasOwn(binding, field))
    )
      compactFail(`${itemLabel}.binding`, "identity fields belong to rows");
    result.set(key, binding);
  }
  return result;
}

export function parseLongTaskCompactCapacity(
  value: unknown,
  label: string,
): {
  measured: LongTaskCompactCapacityCounts;
  maximum: LongTaskCompactCapacityCounts;
} {
  const row = compactStrictObject(value, label, [
    "theoretical_ground_universe",
    "measured",
    "maximum",
  ]);
  if (row.theoretical_ground_universe !== "not_materialized")
    compactFail(
      `${label}.theoretical_ground_universe`,
      "must be not_materialized",
    );
  return {
    measured: capacityCounts(row.measured, `${label}.measured`),
    maximum: capacityCounts(row.maximum, `${label}.maximum`),
  };
}

function capacityCounts(
  value: unknown,
  label: string,
): LongTaskCompactCapacityCounts {
  const row = compactStrictObject(value, label, [
    ...LONG_TASK_COMPACT_CAPACITY_FIELDS,
  ]);
  return Object.fromEntries(
    LONG_TASK_COMPACT_CAPACITY_FIELDS.map((field) => [
      field,
      compactInteger(row[field], `${label}.${field}`),
    ]),
  ) as LongTaskCompactCapacityCounts;
}

export function parseLongTaskCompactSelectors(
  value: unknown,
  label: string,
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const [index, item] of compactArray(value, label).entries()) {
    const itemLabel = `${label}[${index}]`;
    const row = compactStrictObject(item, itemLabel, ["key", "members"]);
    const key = compactStableRef(row.key, `${itemLabel}.key`);
    const members = compactStableRefs(row.members, `${itemLabel}.members`);
    if (result.has(key)) compactFail(itemLabel, `duplicate key: ${key}`);
    if (new Set(members).size !== members.length)
      compactFail(`${itemLabel}.members`, "members must be unique");
    result.set(key, members);
  }
  return result;
}

export function parseLongTaskCompactTable(
  value: unknown,
  selectors: Map<string, string[]>,
  label: string,
): Record<string, unknown>[] {
  const table = compactStrictObject(value, label, [
    "defaults",
    "columns",
    "rows",
  ]);
  const defaults = compactPlainObject(
    compactResolveSelectors(table.defaults, selectors, `${label}.defaults`),
    `${label}.defaults`,
  );
  const columns = compactArray(table.columns, `${label}.columns`).map(
    (item, index) => {
      const column = compactNonemptyString(item, `${label}.columns[${index}]`);
      if (!/^[a-z][a-z0-9_]*$/u.test(column))
        compactFail(`${label}.columns[${index}]`, "invalid column name");
      return column;
    },
  );
  if (new Set(columns).size !== columns.length)
    compactFail(`${label}.columns`, "columns must be unique");
  for (const column of columns)
    if (Object.hasOwn(defaults, column))
      compactFail(`${label}.columns`, `column duplicates default: ${column}`);
  return compactArray(table.rows, `${label}.rows`).map((item, index) => {
    const values = compactArray(item, `${label}.rows[${index}]`);
    if (values.length !== columns.length)
      compactFail(
        `${label}.rows[${index}]`,
        `column count mismatch: ${values.length}:${columns.length}`,
      );
    return {
      ...defaults,
      ...Object.fromEntries(
        columns.map((column, columnIndex) => [
          column,
          compactResolveSelectors(
            values[columnIndex],
            selectors,
            `${label}.rows[${index}][${columnIndex}]`,
          ),
        ]),
      ),
    };
  });
}

export function parseLongTaskCompactExceptions(
  value: unknown,
  label: string,
): Array<{ key: string; target_ref: string; rationale: string }> {
  const result: Array<{
    key: string;
    target_ref: string;
    rationale: string;
  }> = [];
  const seen = new Set<string>();
  for (const [index, item] of compactArray(value, label).entries()) {
    const itemLabel = `${label}[${index}]`;
    const row = compactStrictObject(item, itemLabel, [
      "key",
      "target_ref",
      "rationale",
    ]);
    const key = compactStableRef(row.key, `${itemLabel}.key`);
    const targetRef = compactStableRef(
      row.target_ref,
      `${itemLabel}.target_ref`,
    );
    const rationale = compactNonemptyString(
      row.rationale,
      `${itemLabel}.rationale`,
    );
    if (seen.has(key)) compactFail(itemLabel, `duplicate key: ${key}`);
    seen.add(key);
    result.push({ key, target_ref: targetRef, rationale });
  }
  return result;
}
