export type SemanticShape = Record<string, unknown>;

export function semanticObject(
  value: unknown,
  label: string,
  required: string[],
  optional: string[] = [],
): SemanticShape {
  if (!value || typeof value !== "object" || Array.isArray(value))
    semanticFail(label, "must be an object");
  const row = value as SemanticShape;
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(row).filter((key) => !allowed.has(key));
  if (unknown.length) semanticFail(label, `unknown keys: ${unknown.join(",")}`);
  const missing = required.filter((key) => !Object.hasOwn(row, key));
  if (missing.length) semanticFail(label, `missing keys: ${missing.join(",")}`);
  return row;
}

export function semanticArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) semanticFail(label, "must be an array");
  return value;
}

export function semanticString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim())
    semanticFail(label, "must be a non-empty string");
  return value;
}

export function semanticStrings(value: unknown, label: string): string[] {
  return semanticArray(value, label).map((item, index) =>
    semanticString(item, `${label}[${index}]`),
  );
}

export function semanticStableRef(value: unknown, label: string): string {
  const result = semanticString(value, label);
  if (!/^[a-z0-9][a-z0-9._:-]*$/u.test(result))
    semanticFail(label, "must be a stable lowercase reference");
  return result;
}

export function semanticStableRefs(value: unknown, label: string): string[] {
  return semanticArray(value, label).map((item, index) =>
    semanticStableRef(item, `${label}[${index}]`),
  );
}

export function semanticSha256(value: unknown, label: string): string {
  const result = semanticString(value, label);
  if (!/^[a-f0-9]{64}$/u.test(result))
    semanticFail(label, "must be a lowercase SHA-256 digest");
  return result;
}

export function semanticNullableSha256(
  value: unknown,
  label: string,
): string | null {
  return value === null ? null : semanticSha256(value, label);
}

export function semanticInteger(
  value: unknown,
  label: string,
  minimum = 0,
): number {
  if (!Number.isInteger(value) || Number(value) < minimum)
    semanticFail(label, `must be an integer >= ${minimum}`);
  return Number(value);
}

export function semanticFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    semanticFail(label, "must be a finite number");
  return value;
}

export function semanticNullableNumber(
  value: unknown,
  label: string,
): number | null {
  return value === null ? null : semanticFiniteNumber(value, label);
}

export function semanticLiteral<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T))
    semanticFail(label, `must be one of ${allowed.join(",")}`);
  return value as T;
}

export function semanticNullable<T>(
  value: unknown,
  parser: (value: unknown) => T,
): T | null {
  return value === null ? null : parser(value);
}

export function semanticFail(label: string, message: string): never {
  throw new Error(`semantic_fact_manifest_invalid:${label}:${message}`);
}
