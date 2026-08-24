import type {
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  ProgressRecordV2,
  RepairFrontierCheckV1,
  RepairFrontierSessionV1,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { progressRecordFresh } from "./long-task-progress.js";
import { checkRef, unique } from "./long-task-repair-frontier-utils.js";

export function checkDependencyPatterns(
  compiled: CompiledDeliveryContractV2,
  check: CompiledCheckV2,
): string[] {
  const outcome = check.outcome_key
    ? compiled.outcomes.find((item) => item.key === check.outcome_key)
    : null;
  const direct = [
    ...check.input_paths,
    ...check.verification_inputs,
    ...check.expected_output_paths,
    ...Object.keys(check.runner.frozen_files),
    ...check.observation_authorities.flatMap((authority) =>
      authority.carrier_refs.flatMap((carrier) => carrier.carrier_paths),
    ),
  ];
  if (outcome)
    direct.push(
      ...outcome.product.owner.path_globs,
      ...outcome.technical.expected_change_paths,
      ...outcome.technical.allowed_support_paths,
      ...outcome.technical.bindings.flatMap((binding) =>
        binding.kind === "file" || binding.kind === "path_glob"
          ? [binding.target, ...binding.carrier_paths]
          : binding.carrier_paths,
      ),
    );
  else
    for (const control of compiled.global.acceptance.counterfactual_controls) {
      if (control.check_key !== check.key) continue;
      direct.push(...bindingPatterns(compiled, control.binding_ref));
    }
  return unique(direct);
}

export function checkDependencyPatternsForBinding(
  check: CompiledCheckV2,
  bindingRef: string,
): string[] {
  return unique(
    check.observation_authorities
      .flatMap((authority) => authority.carrier_refs)
      .filter((carrier) => carrier.binding_ref === bindingRef)
      .flatMap((carrier) => carrier.carrier_paths),
  );
}

export function freshDiagnosticEvidence(
  compiled: CompiledDeliveryContractV2,
  manifest: WorkspaceManifestV2,
  progress: Record<string, ProgressRecordV2>,
  selectedCheckRefs: Set<string>,
): Map<string, string> {
  const result = new Map<string, string>();
  for (const check of allChecks(compiled)) {
    const record = progress[check.internal_id];
    if (
      !record ||
      selectedCheckRefs.has(checkRef(check)) ||
      !progressRecordFresh(record, compiled, manifest, check)
    )
      continue;
    result.set(
      checkRef(check),
      `progress:${checkRef(check)}:${record.result}:${record.completed_at}`,
    );
  }
  return result;
}

export function rerunSessions(
  checks: RepairFrontierCheckV1[],
): RepairFrontierSessionV1[] {
  const groups = new Map<string, RepairFrontierCheckV1[]>();
  for (const check of checks) {
    const group = groups.get(check.raw_execution_identity);
    if (group) group.push(check);
    else groups.set(check.raw_execution_identity, [check]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([identity, rows]) => ({
      raw_execution_identity: identity,
      check_refs: unique(rows.map((row) => row.check_ref)),
      obligation_refs: unique(rows.flatMap((row) => row.obligation_refs)),
    }));
}

export function authorityPaths(compiled: CompiledDeliveryContractV2): string[] {
  return unique([
    compiled.contract_file,
    ...Object.keys(compiled.contract_files),
    ...Object.keys(compiled.source_hashes),
    ...compiled.context_snapshot.files,
    ...compiled.task.source_paths,
    compiled.semantic_fact_manifest.source_path,
  ]);
}

export function allChecks(
  compiled: CompiledDeliveryContractV2,
): CompiledCheckV2[] {
  return [
    ...compiled.global.acceptance.checks,
    ...compiled.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ];
}

export function checkObligationRefs(check: CompiledCheckV2): string[] {
  return unique([
    ...check.semantic_fact_expectations.map(
      (expectation) => expectation.proof_ref,
    ),
    ...check.observation_authorities.map(
      (authority) => authority.obligation_ref,
    ),
  ]);
}

function bindingPatterns(
  compiled: CompiledDeliveryContractV2,
  bindingRef: string,
): string[] {
  const [outcomeKey, bindingKey] = bindingRef.split(".");
  const binding = compiled.outcomes
    .find((outcome) => outcome.key === outcomeKey)
    ?.technical.bindings.find((candidate) => candidate.key === bindingKey);
  if (!binding) return [];
  return binding.kind === "file" || binding.kind === "path_glob"
    ? [binding.target, ...binding.carrier_paths]
    : binding.carrier_paths;
}
