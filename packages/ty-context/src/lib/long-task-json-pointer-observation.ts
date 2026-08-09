import path from "node:path";
import {
  canonicalValueJson,
  parseStrictYaml,
  sha256Hex,
} from "./strict-codec.js";

export const JSON_POINTER_EXACT_CAPABILITY = "json-pointer-exact-v1";
export const JSON_POINTER_EXACT_ORACLE_IDENTITY =
  "ty-context-json-pointer-exact";
export const JSON_POINTER_EXACT_ORACLE_VERSION = "1.0.0";
export const JSON_POINTER_EXACT_METHODS = Object.freeze([
  "exact_value",
  "content",
  "component_state",
] as const);
export const JSON_POINTER_EXACT_LIMITS = Object.freeze({
  max_file_bytes: 1_048_576,
  max_depth: 64,
  max_pointer_bytes: 4_096,
  max_pointer_segments: 128,
  max_canonical_value_bytes: 262_144,
  max_artifacts_per_check: 256,
  max_total_artifact_bytes: 16_777_216,
});
export const JSON_POINTER_EXACT_SPEC_SHA256 = sha256Hex(
  canonicalValueJson({
    capability: JSON_POINTER_EXACT_CAPABILITY,
    oracle_identity: JSON_POINTER_EXACT_ORACLE_IDENTITY,
    oracle_version: JSON_POINTER_EXACT_ORACLE_VERSION,
    media_type: "application/json",
    encoding: "utf-8",
    locator: "rfc6901-json-pointer",
    canonicalization: "canonical-json-v1",
    methods: JSON_POINTER_EXACT_METHODS,
    comparator: "exact_value",
    mode: "exact",
    sensitivity: "plain",
    limits: JSON_POINTER_EXACT_LIMITS,
  }),
);

export interface JsonPointerExactBudget {
  readonly seen_artifact_paths: Set<string>;
  total_artifact_bytes: number;
}

export interface JsonPointerExactLocator {
  kind: string;
  value: string;
}

export interface JsonPointerExactObservation {
  capability: typeof JSON_POINTER_EXACT_CAPABILITY;
  artifact_path: string;
  artifact_sha256: string;
  locator: { kind: "json_pointer"; value: string };
  value_sha256: string;
  canonical_value_bytes: number;
  sensitivity: "plain";
}

export function createJsonPointerExactBudget(): JsonPointerExactBudget {
  return { seen_artifact_paths: new Set<string>(), total_artifact_bytes: 0 };
}

export function isJsonPointerExactOracle(oracle: {
  trust?: string;
  identity?: string;
  version?: string;
  sha256?: string | null;
}): boolean {
  return (
    oracle.trust === "named_external_tcb" &&
    oracle.identity === JSON_POINTER_EXACT_ORACLE_IDENTITY &&
    oracle.version === JSON_POINTER_EXACT_ORACLE_VERSION &&
    oracle.sha256 === null
  );
}

export function extractJsonPointerExactObservationFromBytes(input: {
  artifact_path: string;
  bytes: Uint8Array;
  locator: JsonPointerExactLocator;
  sensitivity: string;
  budget?: JsonPointerExactBudget;
}): JsonPointerExactObservation {
  const artifactPath = normalizeObservationArtifactPath(input.artifact_path);
  if (input.sensitivity !== "plain")
    throw invalidObservation("observation_protected_requires_frozen_adapter");
  if (input.bytes.byteLength > JSON_POINTER_EXACT_LIMITS.max_file_bytes)
    throw invalidObservation("observation_artifact_size_limit");
  accountForArtifact(input.budget, artifactPath, input.bytes.byteLength);
  const locator = validateJsonPointerExactLocator(input.locator);
  const parsed = parseJsonWithoutDuplicateKeys(decodeUtf8Json(input.bytes));
  assertJsonTree(parsed, 0);
  const canonical = canonicalValueJson(resolveJsonPointer(parsed, locator.value));
  const canonicalBytes = Buffer.byteLength(canonical, "utf8");
  if (canonicalBytes > JSON_POINTER_EXACT_LIMITS.max_canonical_value_bytes)
    throw invalidObservation("observation_canonical_value_size_limit");
  return {
    capability: JSON_POINTER_EXACT_CAPABILITY,
    artifact_path: artifactPath,
    artifact_sha256: sha256Hex(input.bytes),
    locator,
    value_sha256: sha256Hex(canonical),
    canonical_value_bytes: canonicalBytes,
    sensitivity: "plain",
  };
}

export function validateJsonPointerExactLocator(
  locator: JsonPointerExactLocator,
): { kind: "json_pointer"; value: string } {
  if (
    locator.kind !== "json_pointer" ||
    typeof locator.value !== "string" ||
    locator.value.startsWith("#") ||
    (locator.value !== "" && !locator.value.startsWith("/")) ||
    Buffer.byteLength(locator.value, "utf8") >
      JSON_POINTER_EXACT_LIMITS.max_pointer_bytes
  )
    throw invalidObservation("observation_locator_not_admitted");
  const encoded = locator.value === "" ? [] : locator.value.slice(1).split("/");
  if (encoded.length > JSON_POINTER_EXACT_LIMITS.max_pointer_segments)
    throw invalidObservation("observation_locator_segment_limit");
  for (const token of encoded)
    if (/~(?:[^01]|$)/u.test(token))
      throw invalidObservation("observation_locator_not_admitted");
  return { kind: "json_pointer", value: locator.value };
}

export function normalizeObservationArtifactPath(value: string): string {
  if (
    !value ||
    value.includes("\\") ||
    value.includes("\0") ||
    path.posix.isAbsolute(value) ||
    /^[a-z]:/iu.test(value)
  )
    throw invalidObservation("observation_artifact_path_escape");
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".."))
    throw invalidObservation("observation_artifact_path_escape");
  return segments.join("/");
}

export function invalidObservation(code: string): Error {
  return new Error(code);
}

export function observationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function resolveJsonPointer(root: unknown, pointer: string): unknown {
  let current = root;
  if (pointer === "") return current;
  for (const encoded of pointer.slice(1).split("/")) {
    const token = encoded.replace(/~1/gu, "/").replace(/~0/gu, "~");
    if (Array.isArray(current)) {
      if (!/^(?:0|[1-9]\d*)$/u.test(token))
        throw invalidObservation("observation_locator_array_index_invalid");
      const index = Number(token);
      if (!Number.isSafeInteger(index) || index >= current.length)
        throw invalidObservation("observation_locator_not_found");
      current = current[index];
      continue;
    }
    if (!current || typeof current !== "object" || !Object.hasOwn(current, token))
      throw invalidObservation("observation_locator_not_found");
    current = (current as Record<string, unknown>)[token];
  }
  return current;
}

function parseJsonWithoutDuplicateKeys(content: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    throw invalidObservation("observation_json_invalid");
  }
  try {
    const strict = parseStrictYaml(content);
    if (canonicalValueJson(strict) !== canonicalValueJson(parsed))
      throw invalidObservation("observation_json_canonicalization_mismatch");
  } catch (error) {
    if (observationErrorMessage(error).includes("unique"))
      throw invalidObservation("observation_json_duplicate_key");
    if (observationErrorMessage(error).startsWith("observation_")) throw error;
    throw invalidObservation("observation_json_invalid");
  }
  return parsed;
}

function decodeUtf8Json(bytes: Uint8Array): string {
  if (
    bytes.byteLength >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  )
    throw invalidObservation("observation_json_utf8_invalid");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw invalidObservation("observation_json_utf8_invalid");
  }
}

function assertJsonTree(value: unknown, depth: number): void {
  if (depth > JSON_POINTER_EXACT_LIMITS.max_depth)
    throw invalidObservation("observation_json_depth_limit");
  if (typeof value === "number" && !Number.isFinite(value))
    throw invalidObservation("observation_json_number_invalid");
  if (Array.isArray(value)) {
    for (const entry of value) assertJsonTree(entry, depth + 1);
    return;
  }
  if (value && typeof value === "object")
    for (const entry of Object.values(value as Record<string, unknown>))
      assertJsonTree(entry, depth + 1);
}

function accountForArtifact(
  budget: JsonPointerExactBudget | undefined,
  artifactPath: string,
  bytes: number,
): void {
  if (!budget || budget.seen_artifact_paths.has(artifactPath)) return;
  if (
    budget.seen_artifact_paths.size >=
    JSON_POINTER_EXACT_LIMITS.max_artifacts_per_check
  )
    throw invalidObservation("observation_artifact_count_limit");
  if (
    budget.total_artifact_bytes + bytes >
    JSON_POINTER_EXACT_LIMITS.max_total_artifact_bytes
  )
    throw invalidObservation("observation_artifact_total_size_limit");
  budget.seen_artifact_paths.add(artifactPath);
  budget.total_artifact_bytes += bytes;
}
