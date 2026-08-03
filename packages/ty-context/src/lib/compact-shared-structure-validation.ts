import { createCompactSharedStructures } from "./compact-shared-structures.js";
import type {
  CompactSharedStructureStatistics,
  CompactSharedStructureTarget,
  CompactSharedStructureTemplate,
} from "./compact-shared-structure-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

const STABLE_BOUNDARY = /^[a-z0-9][a-z0-9._:-]*$/u;
const STRUCTURE_KEY = /^structure\.[a-f0-9]{24}$/u;

export function materializeCanonicalCompactSharedStructures(
  targets: CompactSharedStructureTarget[],
  catalogInput: unknown,
  label: string,
): CompactSharedStructureStatistics {
  const catalog = parseCatalog(catalogInput, `${label}.shared_structures`);
  const encodedSlots = targets.map((target, index) => ({
    boundary: validBoundary(target.boundary, `${label}.slots[${index}]`),
    value: structuredClone(target.read()),
  }));
  const catalogByKey = new Map(catalog.map((item) => [item.key, item]));
  const materializedSlots = encodedSlots.map((slot, index) => ({
    boundary: slot.boundary,
    value: resolveReference(
      slot.value,
      slot.boundary,
      catalogByKey,
      `${label}.slots[${index}]`,
    ),
  }));
  const canonical = createCompactSharedStructures(materializedSlots);
  if (
    canonicalValueJson(canonical.catalog) !== canonicalValueJson(catalog) ||
    canonicalValueJson(canonical.slots) !== canonicalValueJson(encodedSlots)
  )
    fail(label, "shared structure catalog is not canonical");
  materializedSlots.forEach((slot, index) => targets[index].write(slot.value));
  return canonical.statistics;
}

function parseCatalog(
  value: unknown,
  label: string,
): CompactSharedStructureTemplate[] {
  if (!Array.isArray(value)) fail(label, "must be an array");
  const seen = new Set<string>();
  return value.map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    if (!item || typeof item !== "object" || Array.isArray(item))
      fail(itemLabel, "must be an object");
    const row = item as Record<string, unknown>;
    const fields = ["key", "digest", "boundary", "parameter_count", "template"];
    const unknown = Object.keys(row).filter((key) => !fields.includes(key));
    const missing = fields.filter((key) => !Object.hasOwn(row, key));
    if (unknown.length) fail(itemLabel, `unknown keys: ${unknown.join(",")}`);
    if (missing.length) fail(itemLabel, `missing keys: ${missing.join(",")}`);
    if (typeof row.key !== "string" || !STRUCTURE_KEY.test(row.key))
      fail(`${itemLabel}.key`, "must be a canonical structure key");
    if (seen.has(row.key)) fail(itemLabel, `duplicate key: ${row.key}`);
    seen.add(row.key);
    if (typeof row.digest !== "string" || !/^[a-f0-9]{64}$/u.test(row.digest))
      fail(`${itemLabel}.digest`, "must be a lowercase SHA-256");
    const boundary = validBoundary(row.boundary, `${itemLabel}.boundary`);
    if (
      !Number.isInteger(row.parameter_count) ||
      Number(row.parameter_count) < 0
    )
      fail(`${itemLabel}.parameter_count`, "must be an integer >= 0");
    const parameterCount = Number(row.parameter_count);
    const used = validateTemplate(row.template, parameterCount, itemLabel);
    for (let parameter = 0; parameter < parameterCount; parameter += 1)
      if (!used.has(parameter))
        fail(`${itemLabel}.template`, `unused parameter: ${parameter}`);
    const digest = sha256Hex(
      canonicalValueJson({
        boundary,
        parameter_count: parameterCount,
        template: row.template,
      }),
    );
    if (row.digest !== digest)
      fail(`${itemLabel}.digest`, `digest mismatch: ${row.digest}:${digest}`);
    if (row.key !== `structure.${digest.slice(0, 24)}`)
      fail(`${itemLabel}.key`, "key does not match digest");
    return {
      key: row.key,
      digest,
      boundary,
      parameter_count: parameterCount,
      template: structuredClone(row.template),
    };
  });
}

function validateTemplate(
  value: unknown,
  parameterCount: number,
  label: string,
): Set<number> {
  const used = new Set<number>();
  const visit = (item: unknown, path: string): void => {
    if (Array.isArray(item)) {
      item.forEach((child, index) => visit(child, `${path}[${index}]`));
      return;
    }
    if (!item || typeof item !== "object") {
      leafKind(item);
      return;
    }
    const row = item as Record<string, unknown>;
    if (Object.hasOwn(row, "structure_ref"))
      fail(path, "templates cannot contain structure references");
    if (Object.hasOwn(row, "parameter_index")) {
      if (
        Object.keys(row).length !== 1 ||
        !Number.isInteger(row.parameter_index) ||
        Number(row.parameter_index) < 0 ||
        Number(row.parameter_index) >= parameterCount
      )
        fail(path, "invalid parameter placeholder");
      used.add(Number(row.parameter_index));
      return;
    }
    for (const [key, child] of Object.entries(row))
      visit(child, `${path}.${key}`);
  };
  visit(value, `${label}.template`);
  return used;
}

function resolveReference(
  value: unknown,
  boundary: string,
  catalog: ReadonlyMap<string, CompactSharedStructureTemplate>,
  label: string,
): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return structuredClone(value);
  const row = value as Record<string, unknown>;
  if (!Object.hasOwn(row, "structure_ref")) return structuredClone(value);
  if (
    Object.keys(row).length !== 2 ||
    !Object.hasOwn(row, "arguments") ||
    typeof row.structure_ref !== "string"
  )
    fail(
      label,
      "structure reference must contain only structure_ref/arguments",
    );
  const template = catalog.get(row.structure_ref);
  if (!template) fail(label, `unknown structure: ${String(row.structure_ref)}`);
  if (template.boundary !== boundary)
    fail(
      label,
      `structure boundary mismatch: ${template.boundary}:${boundary}`,
    );
  if (!Array.isArray(row.arguments))
    fail(`${label}.arguments`, "must be an array");
  if (row.arguments.length !== template.parameter_count)
    fail(
      `${label}.arguments`,
      `parameter count mismatch: ${row.arguments.length}:${template.parameter_count}`,
    );
  row.arguments.forEach((argument, index) => {
    if (argument && typeof argument === "object")
      fail(`${label}.arguments[${index}]`, "arguments must be scalar");
    leafKind(argument);
  });
  return instantiateTemplate(template.template, row.arguments);
}

function instantiateTemplate(
  template: unknown,
  arguments_: unknown[],
): unknown {
  if (Array.isArray(template))
    return template.map((item) => instantiateTemplate(item, arguments_));
  if (!template || typeof template !== "object")
    return structuredClone(template);
  const row = template as Record<string, unknown>;
  if (Object.keys(row).length === 1 && Object.hasOwn(row, "parameter_index"))
    return structuredClone(arguments_[Number(row.parameter_index)]);
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      instantiateTemplate(value, arguments_),
    ]),
  );
}

function leafKind(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number" && Number.isFinite(value)) return "number";
  fail("value", `unsupported scalar: ${typeof value}`);
}

function validBoundary(value: unknown, label: string): string {
  if (typeof value !== "string" || !STABLE_BOUNDARY.test(value))
    fail(label, "must be a stable lowercase boundary");
  return value;
}

function fail(label: string, message: string): never {
  throw new Error(`compact_shared_structure_invalid:${label}:${message}`);
}
