import type { DesignResourceHandoffCoverageV1 } from "./design-resource-handoff-types.js";
import { DESIGN_RESOURCE_VERIFICATION_METHODS } from "./design-resource-handoff-types.js";
import { array, literal, string } from "./long-task-shape-primitives.js";

const KEY = /^[a-z0-9][a-z0-9._-]*$/u;
const SOURCE_ITEM_KEY = /^[a-z0-9][a-z0-9-]*$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

export function stableKey(value: unknown, label: string): string {
  const result = string(value, label);
  if (!KEY.test(result))
    designResourceShapeFail(label, "must match ^[a-z0-9][a-z0-9._-]*$");
  return result;
}

export function stableKeys(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    stableKey(item, `${label}[${index}]`),
  );
}

export function contractKey(value: unknown, label: string): string {
  const result = string(value, label);
  if (!SOURCE_ITEM_KEY.test(result))
    designResourceShapeFail(label, "must match ^[a-z0-9][a-z0-9-]*$");
  return result;
}

export function contractKeys(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    contractKey(item, `${label}[${index}]`),
  );
}

export function sourceItemKeys(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const result = string(item, itemLabel);
    if (!SOURCE_ITEM_KEY.test(result))
      designResourceShapeFail(itemLabel, "must be a valid ty-source-item key");
    return result;
  });
}

export function verificationMethods(
  value: unknown,
  label: string,
): DesignResourceHandoffCoverageV1["verification_methods"] {
  return array(value, label).map((item, index) =>
    literal(item, DESIGN_RESOURCE_VERIFICATION_METHODS, `${label}[${index}]`),
  );
}

export function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
    designResourceShapeFail(label, "must be a positive safe integer");
  return value;
}

export function nonnegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    designResourceShapeFail(label, "must be a non-negative safe integer");
  return Number(value);
}

export function positiveNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    designResourceShapeFail(label, "must be a positive finite number");
  return value;
}

export function nonnegativeNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    designResourceShapeFail(label, "must be a non-negative finite number");
  return value;
}

export function sha256(value: unknown, label: string): string {
  const result = string(value, label);
  if (!SHA256.test(result))
    designResourceShapeFail(label, "must be a lowercase SHA-256");
  return result;
}

export function atomicAxisValue(value: unknown, label: string): string {
  const result = stableKey(value, label);
  if (/^all-/u.test(result) || /(?:^|[._-])catalog(?:$|[._-])/u.test(result))
    designResourceShapeFail(
      label,
      "must identify one atomic value, not a compound collection",
    );
  return result;
}

export function designResourceShapeFail(label: string, message: string): never {
  throw new Error(`design_resource_handoff_invalid:${label}:${message}`);
}
