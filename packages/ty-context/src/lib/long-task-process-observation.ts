import type {
  CompiledObservationAuthorityV2,
  PackageProcessObservationV1,
} from "./long-task-runtime-types.js";
import {
  assertJsonTree,
  decodeUtf8Json,
  JSON_POINTER_EXACT_CAPABILITY,
  JSON_POINTER_EXACT_LIMITS,
  observationErrorMessage,
  parseJsonWithoutDuplicateKeys,
  resolveJsonPointer,
  validateJsonPointerExactLocator,
} from "./long-task-json-pointer-observation.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export const PRODUCT_OBSERVATION_SCHEMA_VERSION =
  "ty-context-product-observation-v1" as const;

export function decodeProductObservationEnvelope(input: {
  bytes: Uint8Array;
  authorities: readonly CompiledObservationAuthorityV2[];
}): PackageProcessObservationV1 {
  let artifactSha256: string;
  let parsed: Record<string, unknown>;
  try {
    if (input.bytes.byteLength > JSON_POINTER_EXACT_LIMITS.max_file_bytes)
      throw new Error("observation_artifact_size_limit");
    const strict = parseJsonWithoutDuplicateKeys(decodeUtf8Json(input.bytes));
    assertJsonTree(strict, 0);
    parsed = record(strict);
    artifactSha256 = sha256Hex(input.bytes);
  } catch (error) {
    throw invalid(
      `process_observation_decode_invalid:${observationErrorMessage(error)}`,
    );
  }
  requireExactKeys(parsed, ["observations", "schema_version"]);
  if (parsed.schema_version !== PRODUCT_OBSERVATION_SCHEMA_VERSION)
    throw invalid("process_observation_schema_invalid");
  const observations = record(parsed.observations);
  const expectedIdentities = expectedObservationIdentities(input.authorities);
  const actualIdentities = Object.keys(observations).sort();
  if (!sameStrings(actualIdentities, expectedIdentities))
    throw invalid(
      `process_observation_identity_set_mismatch:expected=${expectedIdentities.join(",")}:actual=${actualIdentities.join(",")}`,
    );
  if (
    expectedIdentities.length >
    JSON_POINTER_EXACT_LIMITS.max_artifacts_per_check
  )
    throw invalid("process_observation_identity_count_limit");

  const valueSha256: Record<string, string> = {};
  const packageObservations: PackageProcessObservationV1["package_observations"] =
    [];
  for (const observationIdentity of expectedIdentities) {
    const pointer = observationPointer(observationIdentity);
    try {
      validateJsonPointerExactLocator({ kind: "json_pointer", value: pointer });
    } catch (error) {
      throw invalid(
        `process_observation_decode_invalid:${observationErrorMessage(error)}`,
      );
    }
    for (const authority of input.authorities)
      if (
        authority.observation_identity === observationIdentity &&
        (authority.authority !== "package_process_json_exact" ||
          authority.locator_policy.kind !== "fixed_json_pointer" ||
          authority.locator_policy.value !== pointer)
      )
        throw invalid("process_observation_authority_invalid");
    let rawValue: unknown;
    try {
      rawValue = resolveJsonPointer(parsed, pointer);
    } catch (error) {
      throw invalid(
        `process_observation_decode_invalid:${observationErrorMessage(error)}`,
      );
    }
    const canonical = canonicalValueJson(rawValue);
    if (
      Buffer.byteLength(canonical, "utf8") >
      JSON_POINTER_EXACT_LIMITS.max_canonical_value_bytes
    )
      throw invalid("process_observation_value_size_limit");
    valueSha256[observationIdentity] = sha256Hex(canonical);
    for (const authority of input.authorities.filter(
      (candidate) => candidate.observation_identity === observationIdentity,
    ))
      packageObservations.push({
        authority: "package_process_json_exact",
        observation_identity: observationIdentity,
        assertion_ref: authority.assertion_ref,
        obligation_ref: authority.obligation_ref,
        method: authority.method,
        raw_value: rawValue,
        observation: {
          capability: JSON_POINTER_EXACT_CAPABILITY,
          artifact_path: "process.stdout.json",
          artifact_sha256: artifactSha256,
          locator: { kind: "json_pointer", value: pointer },
          value_sha256: valueSha256[observationIdentity],
          canonical_value_bytes: Buffer.byteLength(canonical, "utf8"),
          sensitivity: "plain",
        },
        reason: null,
      });
  }
  return {
    schema_version: PRODUCT_OBSERVATION_SCHEMA_VERSION,
    artifact_sha256: artifactSha256,
    observations,
    value_sha256_by_identity: valueSha256,
    package_observations: packageObservations,
  };
}

function expectedObservationIdentities(
  authorities: readonly CompiledObservationAuthorityV2[],
): string[] {
  if (!authorities.length)
    throw invalid("process_observation_authority_required");
  const identities = new Set<string>();
  for (const authority of authorities) {
    if (authority.authority !== "package_process_json_exact")
      throw invalid("process_observation_authority_invalid");
    if (!authority.observation_identity)
      throw invalid("process_observation_identity_invalid");
    identities.add(authority.observation_identity);
  }
  return [...identities].sort();
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalid("process_observation_object_required");
  return value as Record<string, unknown>;
}

function requireExactKeys(
  value: Record<string, unknown>,
  expected: string[],
): void {
  const actual = Object.keys(value).sort();
  if (!sameStrings(actual, [...expected].sort()))
    throw invalid("process_observation_envelope_fields_invalid");
}

function observationPointer(identityValue: string): string {
  return `/observations/${identityValue.replace(/~/gu, "~0").replace(/\//gu, "~1")}`;
}

function sameStrings(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function invalid(code: string): Error {
  return new Error(code);
}
