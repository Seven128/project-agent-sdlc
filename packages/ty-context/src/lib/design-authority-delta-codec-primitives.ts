import { normalizeRepositoryFile } from "./long-task-paths.js";

export type DeltaRow = Record<string, unknown>;

export function deltaRow(
  value: unknown,
  label: string,
  required: string[],
  optional: string[] = [],
): DeltaRow {
  if (!value || typeof value !== "object" || Array.isArray(value))
    deltaInvalid(label, "object_required");
  const result = value as DeltaRow;
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(result))
    if (!allowed.has(key)) deltaInvalid(label, `unknown_field:${key}`);
  for (const key of required)
    if (!Object.hasOwn(result, key))
      deltaInvalid(label, `missing_field:${key}`);
  return result;
}

export function deltaArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) deltaInvalid(label, "array_required");
  return value;
}

export function deltaText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || /[\0\r\n\t]/u.test(value))
    deltaInvalid(label, "non_empty_single_line_string_required");
  return value;
}

export function deltaOneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
): T[number] {
  const result = deltaText(value, label);
  if (!(allowed as readonly string[]).includes(result))
    deltaInvalid(label, `unsupported:${result}`);
  return result as T[number];
}

export function deltaExact<T extends string | number>(
  value: unknown,
  expected: T,
  label: string,
): T {
  if (value !== expected) deltaInvalid(label, `expected:${String(expected)}`);
  return expected;
}

export function deltaStringSet(
  value: unknown,
  label: string,
  allowEmpty = false,
): string[] {
  const values = deltaArray(value, label).map((item, index) =>
    deltaText(item, `${label}[${index}]`),
  );
  if (!allowEmpty && !values.length)
    deltaInvalid(label, "non_empty_array_required");
  if (new Set(values).size !== values.length)
    deltaInvalid(label, "duplicate_value");
  return values.sort(deltaCompare);
}

export function deltaSourceRefSet(
  value: unknown,
  label: string,
  allowEmpty = false,
): string[] {
  return deltaStringSet(value, label, allowEmpty).map((item) => {
    const [file, anchor, ...extra] = item.split("#");
    if (!file || extra.length || (anchor !== undefined && !anchor))
      deltaInvalid(label, `invalid_source_ref:${item}`);
    const normalized = normalizeRepositoryFile(file, label);
    return anchor === undefined ? normalized : `${normalized}#${anchor}`;
  });
}

export function deltaCompare(left: string, right: string): number {
  return Buffer.from(left).compare(Buffer.from(right));
}

export function deltaInvalid(label: string, reason: string): never {
  throw new Error(`design_authority_delta_invalid:${label}:${reason}`);
}
