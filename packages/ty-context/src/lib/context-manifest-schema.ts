import { parse } from "smol-toml";
import {
  CONTEXT_AREA_FIELDS,
  CONTEXT_NODE_FIELDS,
  CONTEXT_TOP_LEVEL_FIELDS,
  type ContextRole,
} from "./context-catalog/catalog-portable-contract.js";

export type { ContextRole } from "./context-catalog/catalog-portable-contract.js";

export interface ContextAreaEntry {
  line: number;
  id: string;
  root: string;
  context: string;
  kind?: string;
  default: boolean;
  forbidden_runtime_dependencies: string[];
}

export interface ContextNodeEntry {
  line: number;
  path: string;
  role: string;
  read_when?: string;
  read_policy?: string;
  triggers: string[];
  default_children: string[];
}

export interface ContextManifest {
  areas: ContextAreaEntry[];
  contexts: ContextNodeEntry[];
}

export interface ContextManifestParseResult {
  manifest?: ContextManifest;
  errors: string[];
}

export function parseContextManifest(
  content: string,
  file = "project_context/context.toml",
): ContextManifestParseResult {
  const errors: string[] = [];
  let parsed: Record<string, unknown>;
  try {
    parsed = parse(content) as Record<string, unknown>;
  } catch (error) {
    return {
      errors: [
        `${file} is not valid TOML: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  rejectUnknownFields(parsed, CONTEXT_TOP_LEVEL_FIELDS, file, errors);
  const rawAreas = tableArray(parsed.areas, "[[areas]]", file, errors);
  const rawContexts = tableArray(parsed.context, "[[context]]", file, errors);
  const areaLines = tableLines(content, "areas");
  const contextLines = tableLines(content, "context");

  const areas: ContextAreaEntry[] = [];
  for (const [index, value] of rawAreas.entries()) {
    const location = `${file} line ${areaLines[index] ?? 1}`;
    rejectUnknownFields(value, CONTEXT_AREA_FIELDS, location, errors);
    const id = requiredString(value, "id", location, errors);
    const root = requiredString(value, "root", location, errors);
    const context = requiredString(value, "context", location, errors);
    const kind = optionalString(value, "kind", location, errors);
    const defaultArea =
      optionalBoolean(value, "default", location, errors) ?? false;
    const forbiddenRuntimeDependencies = optionalStringArray(
      value,
      "forbidden_runtime_dependencies",
      location,
      errors,
    );
    if (id && root && context) {
      areas.push({
        line: areaLines[index] ?? 1,
        id,
        root,
        context,
        kind,
        default: defaultArea,
        forbidden_runtime_dependencies: forbiddenRuntimeDependencies,
      });
    }
  }

  const contexts: ContextNodeEntry[] = [];
  for (const [index, value] of rawContexts.entries()) {
    const location = `${file} line ${contextLines[index] ?? 1}`;
    rejectUnknownFields(value, CONTEXT_NODE_FIELDS, location, errors);
    const path = requiredString(value, "path", location, errors);
    const role = requiredString(value, "role", location, errors);
    const readWhen = optionalString(value, "read_when", location, errors);
    const readPolicy = optionalString(value, "read_policy", location, errors);
    const triggers = optionalStringArray(value, "triggers", location, errors);
    const defaultChildren = optionalStringArray(
      value,
      "default_children",
      location,
      errors,
    );
    if (path && role) {
      contexts.push({
        line: contextLines[index] ?? 1,
        path,
        role,
        read_when: readWhen,
        read_policy: readPolicy,
        triggers,
        default_children: defaultChildren,
      });
    }
  }

  return { manifest: { areas, contexts }, errors };
}

function tableArray(
  value: unknown,
  label: string,
  file: string,
  errors: string[],
): Array<Record<string, unknown>> {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((entry) => !isRecord(entry))) {
    errors.push(`${file} field ${label} must be an array of TOML tables`);
    return [];
  }
  return value as Array<Record<string, unknown>>;
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  location: string,
  errors: string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      errors.push(`${location} has unknown field ${key}`);
    }
  }
}

function requiredString(
  value: Record<string, unknown>,
  key: string,
  location: string,
  errors: string[],
): string | undefined {
  const candidate = value[key];
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate;
  }
  errors.push(`${location} must include non-empty string field ${key}`);
  return undefined;
}

function optionalString(
  value: Record<string, unknown>,
  key: string,
  location: string,
  errors: string[],
): string | undefined {
  const candidate = value[key];
  if (candidate === undefined) {
    return undefined;
  }
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate;
  }
  errors.push(`${location} field ${key} must be a non-empty string`);
  return undefined;
}

function optionalBoolean(
  value: Record<string, unknown>,
  key: string,
  location: string,
  errors: string[],
): boolean | undefined {
  const candidate = value[key];
  if (candidate === undefined || typeof candidate === "boolean") {
    return candidate;
  }
  errors.push(`${location} field ${key} must be a boolean`);
  return undefined;
}

function optionalStringArray(
  value: Record<string, unknown>,
  key: string,
  location: string,
  errors: string[],
): string[] {
  const candidate = value[key];
  if (candidate === undefined) {
    return [];
  }
  if (
    Array.isArray(candidate) &&
    candidate.every((entry) => typeof entry === "string" && entry.trim())
  ) {
    return candidate as string[];
  }
  errors.push(`${location} field ${key} must be an array of non-empty strings`);
  return [];
}

function tableLines(content: string, table: "areas" | "context"): number[] {
  const lines: number[] = [];
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (line.trim() === `[[${table}]]`) {
      lines.push(index + 1);
    }
  }
  return lines;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
