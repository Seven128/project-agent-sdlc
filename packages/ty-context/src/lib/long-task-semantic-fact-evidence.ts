import type {
  CompiledCheckV2,
  EvidenceCapabilityRecordV2,
} from "./long-task-delivery-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

type SemanticRecord = Extract<
  EvidenceCapabilityRecordV2,
  { capability: "semantic_fact" }
>;
type SemanticExpectation =
  CompiledCheckV2["semantic_fact_expectations"][number];

export function validateSemanticFactEvidence(
  check: CompiledCheckV2,
  record: SemanticRecord,
  artifactHashes: Record<string, string>,
): string | null {
  const expectations = check.semantic_fact_expectations.filter(
    (item) => item.assertion_ref === record.assertion_key,
  );
  if (expectations.length !== 1)
    return expectations.length
      ? "semantic_fact_expectation_duplicate"
      : "semantic_fact_expectation_missing";
  const expected = expectations[0];
  const authorityError = validateSemanticFactEvidenceAuthority(
    check,
    record,
    expected,
  );
  if (authorityError) return authorityError;
  const artifactError = validateSemanticFactArtifacts(
    record,
    expected,
    artifactHashes,
  );
  if (artifactError) return artifactError;
  const observerError = validateSemanticFactObservers(
    record,
    expected,
    artifactHashes,
  );
  if (observerError) return observerError;
  if (record.verdict !== "passed" || record.comparison.passed !== true)
    return "semantic_fact_failed";
  return null;
}

function validateSemanticFactEvidenceAuthority(
  check: CompiledCheckV2,
  record: SemanticRecord,
  expected: SemanticExpectation,
): string | null {
  if (!sameSemanticFactIdentity(record, expected))
    return "semantic_fact_identity_mismatch";
  if (
    record.target_ref !== check.execution_target.target_ref ||
    expected.check_ref !== check.key
  )
    return "semantic_fact_target_mismatch";
  if (
    record.actual_observation.sensitivity !== expected.observation_sensitivity
  )
    return "semantic_fact_sensitivity_mismatch";
  if (
    !validSemanticFactRedaction(
      record.actual_observation.sensitivity,
      record.actual_observation.redaction,
    )
  )
    return "semantic_fact_redaction_mismatch";
  if (
    canonicalValueJson(record.expected) !==
    canonicalValueJson(expected.expected)
  )
    return "semantic_fact_expected_value_mismatch";
  if (!sameSemanticFactComparisonAuthority(record, expected))
    return "semantic_fact_comparison_authority_mismatch";
  if (
    record.comparison.result_sha256 !==
    semanticFactComparisonResultIdentity({
      fact_ref: record.fact_ref,
      proof_ref: record.proof_ref,
      fact_key: record.fact_key,
      fact_revision_digest: record.fact_revision_digest,
      obligation_key: record.obligation_key,
      obligation_revision_digest: record.obligation_revision_digest,
      target_ref: record.target_ref,
      actual_value_sha256: record.actual_observation.value_sha256,
      expected_value_sha256: expected.expected.sha256,
      comparator: record.comparison.comparator,
      mode: record.comparison.mode,
      parameters_sha256: record.comparison.parameters.sha256,
      tolerance_sha256: record.comparison.tolerance?.sha256 ?? null,
      mask_sha256: record.comparison.mask?.sha256 ?? null,
      passed: record.comparison.passed,
    })
  )
    return "semantic_fact_comparison_result_identity_mismatch";
  if (
    record.comparison.comparator === "exact_value" &&
    record.actual_observation.value_sha256 !== expected.expected.sha256
  )
    return "semantic_fact_exact_value_mismatch";
  if (
    canonicalValueJson(record.oracle) !== canonicalValueJson(expected.oracle) ||
    canonicalValueJson(record.environment) !==
      canonicalValueJson(expected.environment)
  )
    return "semantic_fact_oracle_environment_mismatch";
  return null;
}

function sameSemanticFactIdentity(
  record: SemanticRecord,
  expected: SemanticExpectation,
): boolean {
  return (
    record.manifest_ref === expected.manifest_ref &&
    record.manifest_sha256 === expected.manifest_sha256 &&
    record.outcome_ref === expected.outcome_ref &&
    record.fact_ref === expected.fact_ref &&
    record.proof_ref === expected.proof_ref &&
    record.method === expected.method &&
    record.subject_ref === expected.subject_ref &&
    record.condition_ref === expected.condition_ref &&
    record.property_ref === expected.property_ref &&
    sameSemanticFactRevisionIdentity(record, expected)
  );
}

function sameSemanticFactRevisionIdentity(
  record: SemanticRecord,
  expected: SemanticExpectation,
): boolean {
  const present =
    record.fact_key !== undefined ||
    record.fact_revision_digest !== undefined ||
    record.obligation_key !== undefined ||
    record.obligation_revision_digest !== undefined;
  if (!expected.revision_identity_required && !present) return true;
  return (
    record.fact_key === expected.fact_key &&
    record.fact_key === record.fact_ref &&
    record.fact_revision_digest === expected.fact_revision_digest &&
    record.obligation_key === expected.obligation_key &&
    record.obligation_key === record.proof_ref &&
    record.obligation_revision_digest === expected.obligation_revision_digest
  );
}

function validSemanticFactRedaction(
  sensitivity: SemanticRecord["actual_observation"]["sensitivity"],
  redaction: SemanticRecord["actual_observation"]["redaction"],
): boolean {
  return (
    (sensitivity === "plain" && redaction === null) ||
    (sensitivity === "protected" && redaction !== null)
  );
}

function sameSemanticFactComparisonAuthority(
  record: SemanticRecord,
  expected: SemanticExpectation,
): boolean {
  return (
    record.comparison.comparator === expected.comparison.comparator &&
    record.comparison.mode === expected.comparison.mode &&
    canonicalValueJson(record.comparison.parameters) ===
      canonicalValueJson(expected.comparison.parameters) &&
    canonicalValueJson(record.comparison.tolerance) ===
      canonicalValueJson(expected.comparison.tolerance) &&
    canonicalValueJson(record.comparison.mask) ===
      canonicalValueJson(expected.comparison.mask)
  );
}

function validateSemanticFactArtifacts(
  record: SemanticRecord,
  expected: SemanticExpectation,
  artifactHashes: Record<string, string>,
): string | null {
  if (
    artifactHashes[record.actual_observation.artifact_path] !==
    record.actual_observation.artifact_sha256
  )
    return "semantic_fact_observation_artifact_mismatch";
  if (
    artifactHashes[record.actual_environment.artifact_path] !==
      record.actual_environment.artifact_sha256 ||
    record.actual_environment.value_sha256 !==
      expected.environment.definition.sha256
  )
    return "semantic_fact_environment_observation_mismatch";
  if (
    artifactHashes[record.comparison.artifact_path] !==
    record.comparison.artifact_sha256
  )
    return "semantic_fact_comparison_artifact_mismatch";
  return null;
}

function validateSemanticFactObservers(
  record: SemanticRecord,
  expected: SemanticExpectation,
  artifactHashes: Record<string, string>,
): string | null {
  if (
    !sameSet(
      record.observer_results.map((item) => item.target_ref),
      expected.observer_refs,
    )
  )
    return "semantic_fact_observer_set_mismatch";
  const observerObservations = new Set<string>();
  const primaryObservation = `${record.actual_observation.artifact_path}\0${canonicalValueJson(record.actual_observation.locator)}`;
  for (const observer of record.observer_results) {
    const observation = `${observer.artifact_path}\0${canonicalValueJson(observer.locator)}`;
    if (
      observation === primaryObservation ||
      observerObservations.has(observation)
    )
      return "semantic_fact_observer_observation_reused";
    observerObservations.add(observation);
    if (artifactHashes[observer.artifact_path] !== observer.artifact_sha256)
      return "semantic_fact_observer_artifact_mismatch";
    if (
      observer.passed !== true ||
      (record.comparison.comparator === "exact_value" &&
        observer.value_sha256 !== expected.expected.sha256)
    )
      return "semantic_fact_observer_failed";
    if (
      observer.comparison_result_sha256 !==
      semanticFactComparisonResultIdentity({
        fact_ref: record.fact_ref,
        proof_ref: record.proof_ref,
        fact_key: record.fact_key,
        fact_revision_digest: record.fact_revision_digest,
        obligation_key: record.obligation_key,
        obligation_revision_digest: record.obligation_revision_digest,
        target_ref: observer.target_ref,
        actual_value_sha256: observer.value_sha256,
        expected_value_sha256: expected.expected.sha256,
        comparator: record.comparison.comparator,
        mode: record.comparison.mode,
        parameters_sha256: record.comparison.parameters.sha256,
        tolerance_sha256: record.comparison.tolerance?.sha256 ?? null,
        mask_sha256: record.comparison.mask?.sha256 ?? null,
        passed: observer.passed,
      })
    )
      return "semantic_fact_observer_comparison_identity_mismatch";
  }
  return null;
}

export function semanticFactComparisonResultIdentity(value: {
  fact_ref: string;
  proof_ref: string;
  fact_key?: string;
  fact_revision_digest?: string;
  obligation_key?: string;
  obligation_revision_digest?: string;
  target_ref: string;
  actual_value_sha256: string;
  expected_value_sha256: string;
  comparator: string;
  mode: "exact" | "tolerance";
  parameters_sha256: string;
  tolerance_sha256: string | null;
  mask_sha256: string | null;
  passed: boolean;
}): string {
  const revisionIdentityPresent =
    value.fact_key !== undefined ||
    value.fact_revision_digest !== undefined ||
    value.obligation_key !== undefined ||
    value.obligation_revision_digest !== undefined;
  return sha256Hex(
    canonicalValueJson(
      revisionIdentityPresent
        ? value
        : {
            fact_ref: value.fact_ref,
            proof_ref: value.proof_ref,
            target_ref: value.target_ref,
            actual_value_sha256: value.actual_value_sha256,
            expected_value_sha256: value.expected_value_sha256,
            comparator: value.comparator,
            mode: value.mode,
            parameters_sha256: value.parameters_sha256,
            tolerance_sha256: value.tolerance_sha256,
            mask_sha256: value.mask_sha256,
            passed: value.passed,
          },
    ),
  );
}

export function validateDistinctSemanticFactEvidence(
  records: EvidenceCapabilityRecordV2[],
): string | null {
  const observations = new Set<string>();
  const comparisons = new Set<string>();
  const identities = new Set<string>();
  for (const record of records) {
    if (record.capability !== "semantic_fact") continue;
    const identity = record.obligation_key
      ? `${record.obligation_key}\0${record.obligation_revision_digest}\0${record.fact_key}\0${record.fact_revision_digest}`
      : `${record.fact_ref}\0${record.proof_ref}`;
    if (identities.has(identity)) return "semantic_fact_result_duplicate";
    identities.add(identity);
    const observation = `${record.actual_observation.artifact_path}\0${canonicalValueJson(record.actual_observation.locator)}`;
    if (observations.has(observation))
      return "semantic_fact_observation_reused";
    observations.add(observation);
    const comparison = `${record.comparison.artifact_path}\0${canonicalValueJson(record.comparison.locator)}`;
    if (comparisons.has(comparison)) return "semantic_fact_comparison_reused";
    comparisons.add(comparison);
  }
  return null;
}

function sameSet(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((item) => right.includes(item))
  );
}

export const typed_semantic_fact_runtime_evidence =
  "obligation_key+obligation_revision_digest->fact_key+fact_revision_digest+actual+comparison+verdict+oracle+environment";
