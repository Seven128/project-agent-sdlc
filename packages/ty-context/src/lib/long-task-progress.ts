import type {
  CheckExecutionResultV2,
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  ProgressRecordV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { outcomeAuthorityHash } from "./long-task-authority.js";
import { contextAuthorityProjection } from "./long-task-context-authority.js";
import { matchesRepoPattern } from "./long-task-paths.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export function createProgressRecord(
  compiled: CompiledDeliveryContractV2,
  manifest: WorkspaceManifestV2,
  check: CompiledCheckV2,
  result: CheckExecutionResultV2,
): ProgressRecordV2 {
  const outcome = check.outcome_key
    ? (compiled.outcomes.find((item) => item.key === check.outcome_key) ?? null)
    : null;
  return {
    schema_version: "long-task-progress-record-v2",
    compiled_identity: compiled.compiled_identity,
    outcome_authority_hash: progressAuthorityHash(compiled, outcome ?? null),
    check_identity: checkIdentity(check),
    check_internal_id: check.internal_id,
    outcome_key: check.outcome_key,
    check_key: check.key,
    runner_verifier_identity: runnerVerifierIdentity(compiled, check),
    relevant_context_identity: contextIdentity(compiled),
    resolved_input_path_hashes: hashPatterns(manifest, check.input_paths),
    binding_carrier_path_hashes: hashPatterns(
      manifest,
      progressBindingCarrierPatterns(compiled, check, outcome),
    ),
    dependency_interface_identities: dependencyInterfaceIdentities(
      compiled,
      manifest,
      outcome?.depends_on ?? [],
    ),
    result: result.status,
    check_result: result,
    findings: result.findings,
    completed_at: new Date().toISOString(),
  };
}

export function progressRecordFresh(
  record: ProgressRecordV2,
  compiled: CompiledDeliveryContractV2,
  manifest: WorkspaceManifestV2,
  check: CompiledCheckV2,
): boolean {
  const outcome = check.outcome_key
    ? (compiled.outcomes.find((item) => item.key === check.outcome_key) ?? null)
    : null;
  const expectedOutcomeAuthority = progressAuthorityHash(
    compiled,
    outcome ?? null,
  );
  return (
    record.check_internal_id === check.internal_id &&
    record.check_identity === checkIdentity(check) &&
    record.outcome_authority_hash === expectedOutcomeAuthority &&
    record.runner_verifier_identity ===
      runnerVerifierIdentity(compiled, check) &&
    record.relevant_context_identity === contextIdentity(compiled) &&
    same(
      record.resolved_input_path_hashes,
      hashPatterns(manifest, check.input_paths),
    ) &&
    same(
      record.binding_carrier_path_hashes,
      hashPatterns(
        manifest,
        progressBindingCarrierPatterns(compiled, check, outcome),
      ),
    ) &&
    same(
      record.dependency_interface_identities,
      dependencyInterfaceIdentities(
        compiled,
        manifest,
        outcome?.depends_on ?? [],
      ),
    )
  );
}

function progressBindingCarrierPatterns(
  compiled: CompiledDeliveryContractV2,
  check: CompiledCheckV2,
  outcome: CompiledDeliveryContractV2["outcomes"][number] | null,
): string[] {
  if (outcome)
    return outcome.technical.bindings.flatMap(
      (binding) => binding.carrier_paths,
    );
  const references = (compiled.global.acceptance.counterfactual_controls ?? [])
    .filter((control) => control.check_key === check.key)
    .map((control) => control.binding_ref);
  return references.flatMap((reference) => {
    const [outcomeKey, bindingKey] = reference.split(".");
    return (
      compiled.outcomes
        .find((item) => item.key === outcomeKey)
        ?.technical.bindings.find((binding) => binding.key === bindingKey)
        ?.carrier_paths ?? []
    );
  });
}

function progressAuthorityHash(
  compiled: CompiledDeliveryContractV2,
  outcome: CompiledDeliveryContractV2["outcomes"][number] | null,
): string {
  return sha256Hex(
    canonicalValueJson({
      source: compiled.authority_hashes.source_authority_hash,
      product: compiled.authority_hashes.product_authority_hash,
      acceptance: compiled.authority_hashes.acceptance_authority_hash,
      risk: compiled.authority_hashes.risk_authority_hash,
      outcome: outcome ? outcomeAuthorityHash(outcome) : null,
    }),
  );
}

export function checkIdentity(check: CompiledCheckV2): string {
  return sha256Hex(
    canonicalValueJson({
      internal_id: check.internal_id,
      proof_surface: check.proof_surface,
      evidence_adapter: check.evidence_adapter,
      runner: check.runner.execution_identity,
      raw_execution: check.raw_execution_identity,
      verification_input_hashes: check.verification_input_hashes,
      input_paths: check.input_paths,
      expected_output_paths: check.expected_output_paths,
      artifact_globs: check.artifact_globs,
      positive_assertions: check.positive_assertions,
      negative_assertions: check.negative_assertions,
      journey_roles: check.journey_roles,
      execution_target: check.execution_target,
      execution_target_definition: check.execution_target_definition,
      scenario: check.scenario,
      environment_requirements: check.environment_requirements,
      observation_authorities: check.observation_authorities,
      process_runtime_closure: check.process_runtime_closure,
    }),
  );
}

function runnerVerifierIdentity(
  compiled: CompiledDeliveryContractV2,
  check: CompiledCheckV2,
): string {
  return sha256Hex(
    canonicalValueJson({
      runner: check.raw_execution_identity,
      verifier: compiled.verifier_identity.bundle_sha256,
    }),
  );
}

function contextIdentity(compiled: CompiledDeliveryContractV2): string {
  return sha256Hex(
    canonicalValueJson(contextAuthorityProjection(compiled.context_snapshot)),
  );
}

function dependencyInterfaceIdentities(
  compiled: CompiledDeliveryContractV2,
  manifest: WorkspaceManifestV2,
  dependencies: string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of dependencies) {
    const dependency = compiled.outcomes.find((outcome) => outcome.key === key);
    if (!dependency) continue;
    result[key] = sha256Hex(
      canonicalValueJson({
        authority: outcomeAuthorityHash(dependency),
        carriers: hashPatterns(
          manifest,
          dependency.technical.bindings.flatMap(
            (binding) => binding.carrier_paths,
          ),
        ),
      }),
    );
  }
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function hashPatterns(
  manifest: WorkspaceManifestV2,
  patterns: string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pattern of patterns)
    for (const file of manifest.files)
      if (matchesRepoPattern(file.path, pattern))
        result[file.path] = file.sha256;
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function same(left: unknown, right: unknown): boolean {
  return canonicalValueJson(left) === canonicalValueJson(right);
}
