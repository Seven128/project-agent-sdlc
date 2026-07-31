import { createHash } from "node:crypto";
import type {
  SymbolicDenotationAxisDomain,
  SymbolicDenotationScalar,
} from "./symbolic-denotation-types.js";

export function exactKeys(
  value: object,
  expected: string[],
  label: string,
): void {
  const actual = Object.keys(value).sort(compareText);
  const required = [...expected].sort(compareText);
  if (
    actual.length !== required.length ||
    actual.some((key, index) => key !== required[index])
  )
    invalid(
      "shape_keys_invalid",
      `${label}:actual=${actual.join(",")}:expected=${required.join(",")}`,
    );
}

export function stableKey(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9._-]*$/u.test(value))
    invalid("stable_key_invalid", `${label}:${String(value)}`);
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => compareText(left, right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function compareScalar(
  left: SymbolicDenotationScalar,
  right: SymbolicDenotationScalar,
): number {
  if (typeof left !== typeof right) return typeof left === "number" ? -1 : 1;
  return typeof left === "number"
    ? left - (right as number)
    : compareText(left, right as string);
}

export function scalarEqual(
  left: SymbolicDenotationScalar,
  right: SymbolicDenotationScalar,
): boolean {
  return typeof left === typeof right && left === right;
}

export function domainCardinality(
  domain: SymbolicDenotationAxisDomain,
): bigint {
  return domain.kind === "enum"
    ? BigInt(domain.values.length)
    : BigInt(domain.maximum) - BigInt(domain.minimum) + 1n;
}

export function neverValue(value: never): string {
  return String(value);
}

export function invalid(code: string, detail: string): never {
  throw new Error(`symbolic_denotation_invalid:${code}:${detail}`);
}
