import type {
  CompiledCheckV2,
  CompiledObservationAuthorityV2,
  EvidenceCapabilityRecordV2,
} from "./long-task-delivery-types.js";
import { matchesRepoPattern } from "./long-task-paths.js";
import { canonicalValueJson } from "./strict-codec.js";
import { admittedObservationCandidates } from "./long-task-admitted-observation-records.js";
import {
  JSON_POINTER_EXACT_CAPABILITY,
  JSON_POINTER_EXACT_METHODS,
  createJsonPointerExactBudget,
  isJsonPointerExactOracle,
  normalizeObservationArtifactPath,
  observationErrorMessage,
  validateJsonPointerExactLocator,
  type JsonPointerExactLocator,
  type JsonPointerExactObservation,
} from "./long-task-json-pointer-observation.js";
import { extractJsonPointerExactObservation } from "./long-task-observation-artifact.js";

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
  observation: JsonPointerExactObservation | null;
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
}): Promise<PreparedAdmittedObservationSet> {
  const budget = createJsonPointerExactBudget();
  const entries: PreparedAdmittedObservation[] = [];
  const consumedAuthorities = new Set<string>();
  const entriesByAuthority = new Map<string, PreparedAdmittedObservation>();
  for (const candidate of admittedObservationCandidates(input.records)) {
    const observationKey = admittedObservationKey(
      candidate.actual_observation.artifact_path,
      candidate.actual_observation.locator,
    );
    let reason: string | null = null;
    let observation: JsonPointerExactObservation | null = null;
    const authorityResolution = resolveObservationAuthority(input.check, {
      assertion_key: candidate.assertion_key,
      identity_ref: candidate.identity_ref,
      method: candidate.method,
    });
    const authority = authorityResolution.authority;
    const authorityKey = authority
      ? admittedObservationAuthorityKey(authority)
      : null;
    if (!isJsonPointerExactOracle(candidate.oracle))
      reason = "custom_oracle_machine_completion_forbidden";
    else if (!authority) reason = authorityResolution.reason;
    else if (authority.authority === "external_confirmation")
      reason = "unsupported_observer_requires_external_confirmation";
    else if (consumedAuthorities.has(authorityKey!)) {
      reason = "admitted_observation_duplicate";
      const prior = entriesByAuthority.get(authorityKey!);
      if (prior) {
        prior.observation = null;
        prior.reason = reason;
      }
    } else if (authority.authority === "package_process_json_exact")
      reason = "admitted_observation_runtime_required";
    if (authorityKey) consumedAuthorities.add(authorityKey);
    if (!reason) {
      const decision = observationAdmissionDecision({
        method: candidate.method,
        comparator: candidate.comparison.comparator,
        mode: candidate.comparison.mode,
        tolerance: candidate.comparison.tolerance,
        mask: candidate.comparison.mask,
        sensitivity: candidate.actual_observation.sensitivity,
        locator: candidate.actual_observation.locator,
        oracle: candidate.oracle,
        target_family: input.check.execution_target_definition.runtime_family,
        current_static_artifact:
          input.check.execution_target_definition.role === "product",
        snapshot_matches: true,
      });
      if (decision.authority !== "machine") reason = decision.reason;
    }
    const carrierRole = classifyObservationCarrier({
      artifact_path: candidate.actual_observation.artifact_path,
      source_paths: [...(input.authority_paths ?? [])],
      expected_authority_paths: input.check.verification_inputs,
      product_carrier_paths:
        authority?.carrier_refs.flatMap((ref) => ref.carrier_paths) ?? [],
      current_observer_artifact_paths: input.check.artifact_globs,
    });
    if (!reason && carrierRole !== "product_carrier")
      reason =
        carrierRole === "expected_authority_forbidden"
          ? "observation_expected_authority_forbidden"
          : "observation_product_reachability_required";
    const expectedLocator = authority
      ? {
          kind: "json_pointer" as const,
          value: authority.locator_policy.value,
        }
      : null;
    if (
      !reason &&
      expectedLocator &&
      canonicalValueJson(candidate.actual_observation.locator) !==
        canonicalValueJson(expectedLocator)
    )
      reason = "observation_locator_identity_mismatch";
    if (!reason)
      try {
        observation = await extractJsonPointerExactObservation({
          root: input.snapshot_root,
          artifact_path: candidate.actual_observation.artifact_path,
          locator: candidate.actual_observation.locator,
          sensitivity: candidate.actual_observation.sensitivity,
          budget,
        });
      } catch (error) {
        reason = observationErrorMessage(error);
      }
    const entry: PreparedAdmittedObservation = {
      assertion_key: candidate.assertion_key,
      identity_ref: candidate.identity_ref,
      authority_key: authorityKey,
      obligation_ref: authority?.obligation_ref ?? null,
      method: candidate.method,
      observation_key: observationKey,
      observation,
      reason,
    };
    entries.push(entry);
    if (authorityKey) entriesByAuthority.set(authorityKey, entry);
  }
  for (const authority of input.check.observation_authorities ?? []) {
    const authorityKey = admittedObservationAuthorityKey(authority);
    if (consumedAuthorities.has(authorityKey)) continue;
    const entry: PreparedAdmittedObservation = {
      assertion_key: authority.assertion_ref,
      identity_ref: authority.observation_identity,
      authority_key: authorityKey,
      obligation_ref: authority.obligation_ref,
      method: authority.method,
      observation_key: `compiled-authority\0${authorityKey}`,
      observation: null,
      reason:
        authority.authority === "external_confirmation"
          ? "unsupported_observer_requires_external_confirmation"
          : authority.authority === "package_process_json_exact"
            ? "admitted_observation_runtime_required"
            : "admitted_observation_missing",
    };
    entries.push(entry);
    entriesByAuthority.set(authorityKey, entry);
  }
  return {
    by_observation_key: new Map(
      entries.map((entry) => [entry.observation_key, entry]),
    ),
    by_authority_key: entriesByAuthority,
    entries,
  };
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
