import type {
  DeliveryJourneyRoleV2,
  EvidenceCapabilityV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import {
  normalizeRepositoryCwd,
  normalizeRepositoryFile,
  parseRepositoryPattern,
} from "./long-task-paths.js";

export type Shape = Record<string, unknown>;

export function object(
  value: unknown,
  label: string,
  required: string[],
  optional: string[] = [],
): Shape {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(label, "must be an object");
  const row = value as Shape;
  const allowed = new Set([...required, ...optional]);
  const unknown = Object.keys(row).filter((name) => !allowed.has(name));
  if (unknown.length) fail(label, `unknown keys: ${unknown.join(",")}`);
  const missing = required.filter((name) => !(name in row));
  if (missing.length) fail(label, `missing keys: ${missing.join(",")}`);
  return row;
}

export function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(label, "must be an array");
  return value;
}

export function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim())
    fail(label, "must be a non-empty string");
  return value;
}

export function text(value: unknown, label: string): string {
  if (typeof value !== "string") fail(label, "must be a string");
  return value;
}

export function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(label, "must be a boolean");
  return value;
}

export function strings(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    string(item, `${label}[${index}]`),
  );
}

export function repositoryFile(value: unknown, label: string): string {
  return normalizeRepositoryFile(string(value, label), label);
}

export function repositoryFiles(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    repositoryFile(item, `${label}[${index}]`),
  );
}

export function repositoryPattern(value: unknown, label: string): string {
  return parseRepositoryPattern(string(value, label), label).normalized;
}

export function repositoryPatterns(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) =>
    repositoryPattern(item, `${label}[${index}]`),
  );
}

export function repositoryCwd(value: unknown, label: string): string {
  return normalizeRepositoryCwd(string(value, label), label);
}

export function repositorySourceRef(value: unknown, label: string): string {
  const sourceRef = string(value, label);
  const [file, anchor, ...extra] = sourceRef.split("#");
  if (!file || extra.length || (anchor !== undefined && !anchor))
    fail(label, "source_claim_ref_invalid");
  const normalized = normalizeRepositoryFile(file, `${label}.file`);
  return anchor === undefined ? normalized : `${normalized}#${anchor}`;
}

export function literal<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !allowed.includes(value as T))
    fail(label, `must be one of ${allowed.join(",")}`);
  return value as T;
}

export function key(value: unknown, label: string): string {
  const result = string(value, label);
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(result))
    fail(label, "must match ^[a-z0-9][a-z0-9-]*$");
  return result;
}

export function nullable<T>(
  value: unknown,
  parser: (value: unknown) => T,
): T | null {
  return value === null ? null : parser(value);
}

export const PROOF_SURFACES = [
  "ui_browser",
  "runtime_behavior",
  "api_contract",
  "data_state",
  "security_boundary",
  "population_coverage",
  "implementation_structure",
] as const satisfies readonly ProofSurface[];

export const JOURNEY_ROLES = [
  "success",
  "degradation",
  "recovery",
  "stage_gate",
  "conformance",
] as const satisfies readonly DeliveryJourneyRoleV2[];

export const EVIDENCE_CAPABILITIES = [
  "presence",
  "interaction_trace",
  "state_delta",
  "cross_surface_consistency",
  "durable_readback",
  "boundary_invocation",
  "external_side_effect",
  "failure_injection",
  "visual_render",
  "design_conformance",
  "design_method",
  "target_runtime",
  "input_variation",
] as const satisfies readonly EvidenceCapabilityV2[];

export function fail(label: string, message: string): never {
  throw new Error(`delivery_contract_invalid:${label}:${message}`);
}
