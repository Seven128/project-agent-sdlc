import { FORMAL_EVIDENCE_CAPACITY } from "./long_task_real_process_schema_policy.mjs";
import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  assertTimestamp,
  parseJson,
} from "./long_task_formal_total_cost_shared.mjs";
import { consumeFormalExecutionArtifact } from "./long_task_formal_execution_artifacts.mjs";

export function validateFormalExactInvocation({
  invocation,
  collector,
  runBinding,
  setup,
  scenario,
  record,
  runArtifactIndex,
  runtimeTcbIdentity,
}) {
  assertExactKeys(
    invocation,
    ["argv", "cwd", "executable", "shell"],
    "formal_execution_exact_invocation_fields",
  );
  const prefix = `formal-evidence/${record.invocation_id}`;
  const implementationRef = `inputs/formal-evidence-precollection/${collector.implementation_ref}`;
  const taskRef = `inputs/formal-evidence-precollection/${scenario.task_source_ref}`;
  const packageRef = `setup/${runBinding.variant_id}/${setup.package_path}`;
  const expectedArgv = [
    implementationRef,
    "--candidate-package",
    packageRef,
    "--task",
    taskRef,
    "--output",
    `${prefix}/output.bin`,
    "--invocation-id",
    record.invocation_id,
    "--scenario-id",
    scenario.scenario_id,
    "--variant-id",
    runBinding.variant_id,
  ];
  if (scenario.measurement_profile.raw_prompt.presence === "required")
    expectedArgv.push("--raw-prompt", `${prefix}/raw-prompt.bin`);
  if (scenario.measurement_profile.provider_event.presence === "required")
    expectedArgv.push("--provider-event", `${prefix}/provider-event.json`);
  assert(
    invocation.executable === runtimeTcbIdentity.runtime.node_exec_path &&
      canonical(invocation.argv) === canonical(expectedArgv) &&
      invocation.cwd === runArtifactIndex.run_set_root &&
      invocation.shell === false &&
      collector.runtime_kind === "node-direct" &&
      runBinding.variant_id !== "a" &&
      runArtifactIndex.get(implementationRef)?.sha256 ===
        collector.implementation_sha256 &&
      runArtifactIndex.get(taskRef)?.sha256 === scenario.task.entry.sha256 &&
      runArtifactIndex.get(packageRef)?.sha256 === setup.package_sha256,
    "formal_execution_exact_invocation",
  );
}

export async function validateFormalCandidateObservation({
  reference,
  invocationId,
  runBinding,
  runArtifactIndex,
  consumedArtifacts,
}) {
  const expectedRef = `formal-evidence/${invocationId}/candidate-observation.json`;
  assert(reference === expectedRef, "formal_candidate_observation_ref");
  const bytes = await consumeFormalExecutionArtifact(
    runArtifactIndex,
    consumedArtifacts,
    reference,
    "candidate_observation",
    FORMAL_EVIDENCE_CAPACITY.maximum_measurement_record_bytes,
  );
  const observation = parseJson(
    bytes,
    `formal_candidate_observation_json:${reference}`,
  );
  assertExactKeys(
    observation,
    ["after", "before", "invocation_id", "schema_version"],
    `formal_candidate_observation_fields:${reference}`,
  );
  assert(
    observation.schema_version === "formal-candidate-observation-v1" &&
      observation.invocation_id === invocationId,
    `formal_candidate_observation:${reference}`,
  );
  const emptySha = sha256(Buffer.alloc(0));
  for (const [phase, item] of [
    ["before", observation.before],
    ["after", observation.after],
  ])
    validateCandidatePhase(
      item,
      phase,
      reference,
      invocationId,
      runBinding,
      emptySha,
    );
  assert(
    canonical(observation.before) === canonical(observation.after),
    `formal_candidate_observation_drift:${reference}`,
  );
}

export function validateFormalClocks(clocks, policy, collectionWindow) {
  assertExactKeys(
    clocks,
    [
      "completed_at",
      "monotonic_clock_id",
      "monotonic_completed_ns",
      "monotonic_started_ns",
      "started_at",
      "wall_clock_id",
    ],
    "formal_execution_clock_fields",
  );
  const startedWall = assertTimestamp(
    clocks.started_at,
    "formal_execution_wall_started",
  );
  const completedWall = assertTimestamp(
    clocks.completed_at,
    "formal_execution_wall_completed",
  );
  const startedNs = decimalBigInt(
    clocks.monotonic_started_ns,
    "formal_execution_monotonic_started",
  );
  const completedNs = decimalBigInt(
    clocks.monotonic_completed_ns,
    "formal_execution_monotonic_completed",
  );
  const durationNs = completedNs - startedNs;
  const wallDurationNs = BigInt(completedWall - startedWall) * 1_000_000n;
  const toleranceNs =
    BigInt(policy.wall_monotonic_elapsed_tolerance_ms) * 1_000_000n;
  assert(
    clocks.monotonic_clock_id === policy.monotonic_clock_id &&
      clocks.wall_clock_id === policy.wall_clock_id &&
      completedNs > startedNs &&
      completedWall >= startedWall &&
      absoluteBigInt(durationNs - wallDurationNs) <= toleranceNs &&
      startedWall >= collectionWindow.started &&
      completedWall <= collectionWindow.completed,
    "formal_execution_clock_relation",
  );
  return {
    ...clocks,
    startedWall,
    completedWall,
    startedNs,
    completedNs,
    durationNs,
  };
}

export function validateFormalExit(exit) {
  assertExactKeys(
    exit,
    [
      "active_processes_at_result",
      "descendants_cleaned",
      "exit_code",
      "output_overflow",
      "timed_out",
      "total_processes",
    ],
    "formal_execution_exit_fields",
  );
  assert(
    exit.exit_code === 0 &&
      exit.timed_out === false &&
      exit.output_overflow === false &&
      exit.descendants_cleaned === true &&
      exit.active_processes_at_result === 0 &&
      Number.isSafeInteger(exit.total_processes) &&
      exit.total_processes >= 1,
    "formal_execution_exit",
  );
}

export function validateFormalSensitiveArtifactReference(
  value,
  required,
  label,
  expectedArtifactRef,
) {
  if (!required) {
    assert(value === null, `formal_execution_${label}_forbidden`);
    return null;
  }
  assertExactKeys(
    value,
    ["artifact_ref", "disposition", "redaction_rule_ref"],
    `formal_execution_${label}_fields`,
  );
  assert(
    ["redacted", "retained"].includes(value.disposition) &&
      typeof value.artifact_ref === "string" &&
      value.artifact_ref === expectedArtifactRef &&
      (value.disposition === "retained"
        ? value.redaction_rule_ref === null
        : typeof value.redaction_rule_ref === "string" &&
          value.redaction_rule_ref.length > 0),
    `formal_execution_${label}`,
  );
  return value;
}

function validateCandidatePhase(
  item,
  phase,
  reference,
  invocationId,
  runBinding,
  emptySha,
) {
  assertExactKeys(
    item,
    ["commit", "invocation_id", "status_bytes", "status_sha256", "tree"],
    `formal_candidate_observation_${phase}_fields:${reference}`,
  );
  assert(
    item.invocation_id === invocationId &&
      item.commit === runBinding.candidate_commit &&
      item.tree === runBinding.candidate_tree &&
      item.status_bytes === 0 &&
      item.status_sha256 === emptySha,
    `formal_candidate_observation_${phase}:${reference}`,
  );
}

function decimalBigInt(value, code) {
  assert(typeof value === "string" && /^[0-9]+$/u.test(value), code);
  return BigInt(value);
}

function absoluteBigInt(value) {
  return value < 0n ? -value : value;
}
