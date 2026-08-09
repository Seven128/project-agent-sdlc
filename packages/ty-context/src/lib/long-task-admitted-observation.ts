import type {
  CompiledCheckV2,
  CompiledObservationAuthorityV2,
  EvidenceCapabilityRecordV2,
  PackageObservationValueV2,
} from "./long-task-delivery-types.js";
import {
  classifyRepositoryPatternOverlap,
  matchesRepoPattern,
} from "./long-task-paths.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import {
  evaluateExactDigestComparison,
  type ExactDigestComparisonResult,
} from "./long-task-exact-comparison.js";
import {
  JSON_POINTER_EXACT_CAPABILITY,
  JSON_POINTER_EXACT_METHODS,
  isJsonPointerExactOracle,
  normalizeObservationArtifactPath,
  validateJsonPointerExactLocator,
  type JsonPointerExactLocator,
  type JsonPointerExactObservation,
} from "./long-task-json-pointer-observation.js";

export {
  JSON_POINTER_EXACT_CAPABILITY,
  JSON_POINTER_EXACT_LIMITS,
  JSON_POINTER_EXACT_METHODS,
  JSON_POINTER_EXACT_ORACLE_IDENTITY,
  JSON_POINTER_EXACT_ORACLE_VERSION,
  JSON_POINTER_EXACT_SPEC_SHA256,
  createJsonPointerExactBudget,
  extractJsonPointerExactObservationFromBytes,
  isJsonPointerExactOracle,
} from "./long-task-json-pointer-observation.js";
export type {
  JsonPointerExactBudget,
  JsonPointerExactLocator,
  JsonPointerExactObservation,
} from "./long-task-json-pointer-observation.js";
export { extractJsonPointerExactObservation } from "./long-task-observation-artifact.js";

export interface PreparedAdmittedObservation {
  assertion_key: string;
  identity_ref: string;
  authority_key: string | null;
  obligation_ref: string | null;
  method: string;
  observation_key: string;
  authority: CompiledObservationAuthorityV2["authority"] | null;
  raw_value: unknown;
  observation: JsonPointerExactObservation | null;
  comparison: ExactDigestComparisonResult | null;
  reason: string | null;
}

export interface PreparedAdmittedObservationSet {
  readonly by_observation_key: ReadonlyMap<string, PreparedAdmittedObservation>;
  readonly by_authority_key: ReadonlyMap<string, PreparedAdmittedObservation>;
  readonly entries: readonly PreparedAdmittedObservation[];
}

export async function prepareAdmittedObservations(input: {
  check: CompiledCheckV2;
  records: EvidenceCapabilityRecordV2[];
  snapshot_root: string;
  authority_paths?: readonly string[];
  package_observations?: readonly PackageObservationValueV2[];
}): Promise<PreparedAdmittedObservationSet> {
  const entries: PreparedAdmittedObservation[] = [];
  const entriesByAuthority = new Map<string, PreparedAdmittedObservation>();
  for (const authority of input.check.observation_authorities ?? []) {
    const authorityKey = admittedObservationAuthorityKey(authority);
    const candidates = (input.package_observations ?? []).filter(
      (candidate) =>
        candidate.authority === authority.authority &&
        candidate.observation_identity === authority.observation_identity &&
        candidate.assertion_ref === authority.assertion_ref &&
        candidate.obligation_ref === authority.obligation_ref &&
        candidate.method === authority.method,
    );
    const candidate = candidates.length === 1 ? candidates[0] : null;
    let reason: string | null = null;
    let comparison: ExactDigestComparisonResult | null = null;
    if (authority.authority === "external_confirmation")
      reason = "unsupported_observer_requires_external_confirmation";
    else if (candidates.length > 1) reason = "admitted_observation_duplicate";
    else if (!candidate)
      reason =
        authority.authority === "package_process_json_exact"
          ? "admitted_observation_runtime_required"
          : "admitted_observation_missing";
    else if (candidate.reason) reason = candidate.reason;
    else if (!candidate.observation) reason = "admitted_observation_missing";
    else if (
      candidate.observation.locator.kind !== "json_pointer" ||
      candidate.observation.locator.value !== authority.locator_policy.value
    )
      reason = "observation_locator_identity_mismatch";
    else {
      try {
        comparison = evaluateExactDigestComparison({
          identity: {
            kind: "compiled_observation_authority",
            expected_identity: authority.expected_identity,
            obligation_ref: authority.obligation_ref,
            observation_identity: authority.observation_identity,
            target_ref: authority.target_ref,
            method: authority.method,
          },
          actual_value_sha256: projectedActualValueSha256(authority, candidate),
          expected_value_sha256: authority.expected_value_sha256,
          comparator: authority.comparison.comparator,
          mode: authority.comparison.mode as "exact" | "tolerance",
          parameters_sha256: authority.comparison.parameters_sha256 ?? "",
          tolerance_sha256: authority.comparison.tolerance_sha256,
          mask_sha256: authority.comparison.mask_sha256,
        });
      } catch (error) {
        reason = error instanceof Error ? error.message : String(error);
      }
    }
    const entry: PreparedAdmittedObservation = {
      assertion_key: authority.assertion_ref,
      identity_ref: authority.observation_identity,
      authority_key: authorityKey,
      obligation_ref: authority.obligation_ref,
      method: authority.method,
      observation_key: candidate?.observation
        ? admittedObservationKey(
            candidate.observation.artifact_path,
            candidate.observation.locator,
          )
        : `compiled-authority\0${authorityKey}`,
      authority: authority.authority,
      raw_value: candidate?.raw_value,
      observation: candidate?.observation ?? null,
      comparison,
      reason,
    };
    entries.push(entry);
    entriesByAuthority.set(authorityKey, entry);
  }
  for (const candidate of input.package_observations ?? []) {
    const matches = (input.check.observation_authorities ?? []).filter(
      (authority) =>
        authority.authority === candidate.authority &&
        authority.observation_identity === candidate.observation_identity &&
        authority.assertion_ref === candidate.assertion_ref &&
        authority.obligation_ref === candidate.obligation_ref &&
        authority.method === candidate.method,
    );
    if (matches.length) continue;
    entries.push({
      assertion_key: "",
      identity_ref: candidate.observation_identity,
      authority_key: null,
      obligation_ref: null,
      method: "exact_value",
      observation_key: candidate.observation
        ? admittedObservationKey(
            candidate.observation.artifact_path,
            candidate.observation.locator,
          )
        : `unbound-package-observation\0${candidate.observation_identity}`,
      authority: null,
      raw_value: candidate.raw_value,
      observation: candidate.observation,
      comparison: null,
      reason: "machine_observer_not_admitted",
    });
  }
  return {
    by_observation_key: new Map(
      entries.map((entry) => [entry.observation_key, entry]),
    ),
    by_authority_key: entriesByAuthority,
    entries,
  };
}

function projectedActualValueSha256(
  authority: CompiledObservationAuthorityV2,
  candidate: PackageObservationValueV2,
): string {
  if (!candidate.observation) throw new Error("admitted_observation_missing");
  if (authority.actual_projection === "raw_exact")
    return candidate.observation.value_sha256;
  const projected =
    authority.actual_projection === "presence_boolean"
      ? true
      : Boolean(candidate.raw_value);
  return sha256Hex(canonicalValueJson(projected));
}

export function admittedObservationAuthorityKey(
  authority: Pick<
    CompiledObservationAuthorityV2,
    "assertion_ref" | "obligation_ref" | "method"
  >,
): string {
  return `${authority.assertion_ref}\0${authority.obligation_ref}\0${authority.method}`;
}

export function resolveObservationAuthority(
  check: CompiledCheckV2,
  candidate: {
    assertion_key: string;
    identity_ref: string;
    method: string;
  },
):
  | { authority: CompiledObservationAuthorityV2; reason: null }
  | { authority: null; reason: string } {
  const matches = (check.observation_authorities ?? []).filter(
    (authority) =>
      authority.assertion_ref === candidate.assertion_key &&
      authority.method === candidate.method &&
      authority.observation_identity === candidate.identity_ref,
  );
  if (matches.length === 1) return { authority: matches[0], reason: null };
  return {
    authority: null,
    reason:
      matches.length === 0
        ? "machine_observer_not_admitted"
        : "machine_observer_authority_ambiguous",
  };
}

export function admittedObservationKey(
  artifactPath: string,
  locator: JsonPointerExactLocator,
): string {
  return `${artifactPath}\0${canonicalValueJson(locator)}`;
}

export function jsonPointerExactLocatorForIdentity(identity: string): {
  kind: "json_pointer";
  value: string;
} {
  return {
    kind: "json_pointer",
    value: `/observations/${identity.replace(/~/gu, "~0").replace(/\//gu, "~1")}`,
  };
}

export type ObservationCarrierRole =
  | "expected_authority_forbidden"
  | "product_carrier"
  | "current_observer_artifact"
  | "unadmitted_evidence";

export type MachineObservationCarrierRoleConflict =
  "expected_authority" | "evidence_role";

export function classifyMachineObservationCarrierRoleConflict(input: {
  carrier_pattern: string;
  expected_authority_patterns: readonly string[];
  evidence_role_patterns: readonly string[];
}): MachineObservationCarrierRoleConflict | null {
  if (
    input.expected_authority_patterns.some(
      (pattern) =>
        classifyRepositoryPatternOverlap(input.carrier_pattern, pattern)
          .status === "proven_overlap",
    )
  )
    return "expected_authority";
  if (
    input.evidence_role_patterns.some(
      (pattern) =>
        classifyRepositoryPatternOverlap(input.carrier_pattern, pattern)
          .status === "proven_overlap",
    )
  )
    return "evidence_role";
  return null;
}

export function classifyObservationCarrier(input: {
  artifact_path: string;
  source_paths: string[];
  expected_authority_paths: string[];
  product_carrier_paths: string[];
  current_observer_artifact_paths: string[];
}): ObservationCarrierRole {
  const artifactPath = normalizeObservationArtifactPath(input.artifact_path);
  if (
    matchesAny(artifactPath, input.source_paths) ||
    matchesAny(artifactPath, input.expected_authority_paths)
  )
    return "expected_authority_forbidden";
  if (matchesAny(artifactPath, input.product_carrier_paths))
    return "product_carrier";
  if (matchesAny(artifactPath, input.current_observer_artifact_paths))
    return "current_observer_artifact";
  return "unadmitted_evidence";
}

export interface ObservationAdmissionInput {
  method: string;
  comparator: string;
  mode: string;
  tolerance: unknown;
  mask: unknown;
  sensitivity: string;
  locator: JsonPointerExactLocator;
  oracle: {
    trust?: string;
    identity?: string;
    version?: string;
    sha256?: string | null;
  };
  target_family: string;
  observed_target_family?: string;
  required_method?: string;
  current_static_artifact: boolean;
  historical_session?: boolean;
  snapshot_matches?: boolean;
}

export type ObservationAdmissionDecision =
  | {
      authority: "machine";
      reason: null;
      capability: typeof JSON_POINTER_EXACT_CAPABILITY;
    }
  | { authority: "external_confirmation"; reason: string; capability: null };

export function observationAdmissionDecision(
  input: ObservationAdmissionInput,
): ObservationAdmissionDecision {
  if (
    input.observed_target_family !== undefined &&
    input.observed_target_family !== input.target_family
  )
    return external("observation_target_proxy_mismatch");
  if (input.required_method && input.required_method !== input.method)
    return external("observation_capability_mismatch");
  if (
    input.target_family !== "process" ||
    input.historical_session === true ||
    !input.current_static_artifact ||
    input.snapshot_matches === false
  )
    return external("observation_current_static_target_required");
  if (!isJsonPointerExactOracle(input.oracle))
    return external("observation_oracle_not_admitted");
  if (
    !JSON_POINTER_EXACT_METHODS.some((method) => method === input.method) ||
    input.comparator !== "exact_value" ||
    input.mode !== "exact" ||
    input.tolerance !== null ||
    input.mask !== null
  )
    return external("observation_method_not_admitted");
  if (input.sensitivity !== "plain")
    return external("observation_protected_requires_frozen_adapter");
  try {
    validateJsonPointerExactLocator(input.locator);
  } catch {
    return external("observation_locator_not_admitted");
  }
  return {
    authority: "machine",
    reason: null,
    capability: JSON_POINTER_EXACT_CAPABILITY,
  };
}

function external(reason: string): ObservationAdmissionDecision {
  return { authority: "external_confirmation", reason, capability: null };
}

function matchesAny(candidate: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesRepoPattern(candidate, pattern));
}
