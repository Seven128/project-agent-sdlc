import { Buffer } from "node:buffer";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

const STABLE_REF = /^[a-z0-9][a-z0-9._:-]*$/u;

export function compactCommonFields<T extends Record<string, unknown>>(
  rows: T[],
  excluded: string[],
): Record<string, unknown> {
  if (!rows.length) return {};
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(rows[0])) {
    if (excluded.includes(key)) continue;
    const identity = canonicalValueJson(rows[0][key]);
    if (
      rows.every(
        (row) =>
          Object.hasOwn(row, key) && canonicalValueJson(row[key]) === identity,
      )
    )
      result[key] = structuredClone(rows[0][key]);
  }
  return result;
}

export function compactWithoutFields<T extends Record<string, unknown>>(
  value: T,
  fields: string[],
): Record<string, unknown> {
  const excluded = new Set(fields);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !excluded.has(key))
      .map(([key, item]) => [key, structuredClone(item)]),
  );
}

export function compactAuthoringTable<T extends object>(
  input: T[],
  excludedDefaults: string[] = [],
): { defaults: Record<string, unknown>; columns: string[]; rows: unknown[][] } {
  const records = input as unknown as Record<string, unknown>[];
  const defaults = compactCommonFields(records, excludedDefaults);
  const columns = [
    ...new Set(records.flatMap((record) => Object.keys(record))),
  ].filter((key) => !Object.hasOwn(defaults, key));
  return {
    defaults,
    columns,
    rows: records.map((record, rowIndex) =>
      columns.map((column) => {
        if (!Object.hasOwn(record, column))
          throw new Error(
            `compact_authoring_sparse_cell:${rowIndex}:${column}`,
          );
        return structuredClone(record[column]);
      }),
    ),
  };
}

export function applyCompactAuthoringSelectors(
  base: Record<string, unknown>,
): {
  value: Record<string, unknown>;
  selectors: Array<{ key: string; members: string[] }>;
} {
  const selectorCounts = countSelectorCandidates(base);
  const selectorMap = new Map<string, string[]>();
  const value = replaceSharedSelectors(base, selectorCounts, selectorMap);
  return {
    value,
    selectors: [...selectorMap.entries()]
      .map(([key, members]) => ({ key, members }))
      .sort((left, right) => left.key.localeCompare(right.key)),
  };
}

function selectorCandidate(value: unknown): string[] | null {
  return Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && STABLE_REF.test(item))
    ? (value as string[])
    : null;
}

function countSelectorCandidates(value: unknown): Map<string, number> {
  const counts = new Map<string, number>();
  const visit = (item: unknown, parentKey = ""): void => {
    if (parentKey === "columns" || parentKey === "selectors") return;
    if (parentKey === "rows" && Array.isArray(item)) {
      for (const row of item) visit(row, "table_row");
      return;
    }
    if (parentKey === "table_row" && Array.isArray(item)) {
      for (const cell of item) visit(cell);
      return;
    }
    const candidate = selectorCandidate(item);
    if (candidate) {
      const identity = canonicalValueJson(candidate);
      counts.set(identity, (counts.get(identity) ?? 0) + 1);
      return;
    }
    if (Array.isArray(item)) for (const child of item) visit(child, parentKey);
    else if (item && typeof item === "object")
      for (const [key, child] of Object.entries(item)) visit(child, key);
  };
  visit(value);
  return counts;
}

function replaceSharedSelectors(
  value: unknown,
  counts: Map<string, number>,
  selectors: Map<string, string[]>,
): Record<string, unknown> {
  const replace = (item: unknown, parentKey = ""): unknown => {
    if (parentKey === "columns" || parentKey === "selectors")
      return structuredClone(item);
    if (parentKey === "rows" && Array.isArray(item))
      return item.map((row) => replace(row, "table_row"));
    if (parentKey === "table_row" && Array.isArray(item))
      return item.map((cell) => replace(cell));
    const candidate = selectorCandidate(item);
    if (candidate) {
      const identity = canonicalValueJson(candidate);
      const count = counts.get(identity) ?? 0;
      const selectorKey = `selector.refs.${sha256Hex(identity).slice(0, 16)}`;
      const referenceBytes = Buffer.byteLength(
        canonicalValueJson({ selector_ref: selectorKey }),
        "utf8",
      );
      const listBytes = Buffer.byteLength(identity, "utf8");
      if (count > 1 && (count - 1) * listBytes > count * referenceBytes) {
        selectors.set(selectorKey, [...candidate]);
        return { selector_ref: selectorKey };
      }
      return [...candidate];
    }
    if (Array.isArray(item)) return item.map((child) => replace(child, parentKey));
    if (item && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item).map(([key, child]) => [key, replace(child, key)]),
      );
    return item;
  };
  return replace(value) as Record<string, unknown>;
}

export function compactCapacityBudget(name: string, measured: number): number {
  if (name === "canonical_bytes")
    return Math.max(1024 * 1024, roundPowerOfTwo(measured));
  return Math.max(16, roundPowerOfTwo(measured));
}

function roundPowerOfTwo(value: number): number {
  if (value <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(value));
}
