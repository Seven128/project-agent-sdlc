import { parseStrictYaml } from "./strict-codec.js";

export function parseStrictJsonObject(
  content: string,
  label: string,
): Record<string, unknown> {
  try {
    JSON.parse(content);
  } catch (error) {
    throw invalid(label, `json:${message(error)}`);
  }
  return object(parseStrictYaml(content), label);
}

export function object(
  value: unknown,
  label: string,
  required: string[] = [],
  optional: string[] = [],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalid(label, "object_required");
  const record = value as Record<string, unknown>;
  const allowed = new Set([...required, ...optional]);
  if (allowed.size)
    for (const key of Object.keys(record))
      if (!allowed.has(key)) throw invalid(label, `unknown_field:${key}`);
  for (const key of required)
    if (!Object.hasOwn(record, key))
      throw invalid(label, `missing_field:${key}`);
  return record;
}

export function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || /[\0\r\n\t]/u.test(value))
    throw invalid(label, "non_empty_single_line_string_required");
  return value;
}

export function multilineText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.length || value.includes("\0"))
    throw invalid(label, "non_empty_text_required");
  return value;
}

export function digest(value: unknown, label: string): string {
  const result = text(value, label);
  if (!/^[0-9a-f]{64}$/u.test(result)) throw invalid(label, "sha256_required");
  return result;
}

export function integer(value: unknown, label: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum)
    throw invalid(label, `integer_at_least_${minimum}_required`);
  return value as number;
}

export function literal<T extends string | number | boolean>(
  value: unknown,
  expected: T,
  label: string,
): T {
  if (value !== expected) throw invalid(label, `expected:${String(expected)}`);
  return expected;
}

export function oneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
): T[number] {
  const result = text(value, label);
  if (!(allowed as readonly string[]).includes(result))
    throw invalid(label, `unsupported:${result}`);
  return result as T[number];
}

export function stringSet(
  value: unknown,
  label: string,
  options: { allowEmpty?: boolean } = {},
): string[] {
  if (!Array.isArray(value)) throw invalid(label, "array_required");
  const result = value.map((item, index) => text(item, `${label}[${index}]`));
  if (!options.allowEmpty && !result.length)
    throw invalid(label, "non_empty_array_required");
  if (new Set(result).size !== result.length)
    throw invalid(label, "duplicate_value");
  return result.sort(compareText);
}

export function arrayOf<T>(
  value: unknown,
  label: string,
  parse: (item: unknown, label: string) => T,
  options: { allowEmpty?: boolean } = {},
): T[] {
  if (!Array.isArray(value)) throw invalid(label, "array_required");
  if (!options.allowEmpty && !value.length)
    throw invalid(label, "non_empty_array_required");
  return value.map((item, index) => parse(item, `${label}[${index}]`));
}

export function optionalArrayOf<T>(
  value: unknown,
  label: string,
  parse: (item: unknown, label: string) => T,
): T[] {
  return arrayOf(value, label, parse, { allowEmpty: true });
}

export function unknownSemantics(
  record: Record<string, unknown>,
  key: string,
  label: string,
): unknown {
  if (!Object.hasOwn(record, key)) throw invalid(label, `missing_field:${key}`);
  return record[key];
}

export function invalid(label: string, reason: string): Error {
  return new Error(`design_resource_recovery_invalid:${label}:${reason}`);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
