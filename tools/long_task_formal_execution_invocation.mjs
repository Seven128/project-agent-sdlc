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
  const expectedPrefix = [
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
  let cursor = expectedPrefix.length;
  let providerBridge = null;
  if (scenario.measurement_profile.provider_event.presence === "required") {
    const endpoint = invocation.argv[cursor + 1];
    const token = invocation.argv[cursor + 3];
    assert(
      invocation.argv[cursor] === "--provider-bridge" &&
        /^http:\/\/127\.0\.0\.1:(?:[1-9][0-9]{0,4})\/invoke$/u.test(
          endpoint ?? "",
        ) &&
        Number(new URL(endpoint).port) <= 65_535 &&
        invocation.argv[cursor + 2] === "--provider-bridge-token" &&
        /^[a-f0-9]{64}$/u.test(token ?? ""),
      "formal_execution_provider_bridge_invocation",
    );
    providerBridge = Object.freeze({
      endpoint,
      bridge_session_sha256: sha256(
        canonical({
          invocation_id: record.invocation_id,
          endpoint,
          token_sha256: sha256(token),
        }),
      ),
    });
    cursor += 4;
  }
  if (
    scenario.measurement_profile.meters.storage_byte_hour.presence ===
    "required"
  ) {
    assert(
      invocation.argv[cursor] === "--state-root" &&
        invocation.argv[cursor + 1] === `${prefix}/state-root`,
      "formal_execution_state_locator",
    );
    cursor += 2;
  }
  assert(
    invocation.executable === runtimeTcbIdentity.runtime.node_exec_path &&
      canonical(invocation.argv.slice(0, expectedPrefix.length)) ===
        canonical(expectedPrefix) &&
      invocation.argv.length === cursor &&
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
  return Object.freeze({ providerBridge });
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
      "human_completed_at",
      "human_monotonic_clock_id",
      "human_monotonic_completed_ns",
      "human_monotonic_started_ns",
      "human_started_at",
      "process_completed_at",
      "process_monotonic_clock_id",
      "process_monotonic_completed_ns",
      "process_monotonic_started_ns",
      "process_started_at",
      "wall_clock_id",
    ],
    "formal_execution_clock_fields",
  );
  const humanStartedWall = assertTimestamp(
    clocks.human_started_at,
    "formal_execution_human_wall_started",
  );
  const humanCompletedWall = assertTimestamp(
    clocks.human_completed_at,
    "formal_execution_human_wall_completed",
  );
  const processStartedWall = assertTimestamp(
    clocks.process_started_at,
    "formal_execution_process_wall_started",
  );
  const processCompletedWall = assertTimestamp(
    clocks.process_completed_at,
    "formal_execution_process_wall_completed",
  );
  const humanStartedNs = decimalBigInt(
    clocks.human_monotonic_started_ns,
    "formal_execution_human_monotonic_started",
  );
  const humanCompletedNs = decimalBigInt(
    clocks.human_monotonic_completed_ns,
    "formal_execution_human_monotonic_completed",
  );
  const processStartedNs = decimalBigInt(
    clocks.process_monotonic_started_ns,
    "formal_execution_process_monotonic_started",
  );
  const processCompletedNs = decimalBigInt(
    clocks.process_monotonic_completed_ns,
    "formal_execution_process_monotonic_completed",
  );
  const humanDurationNs = humanCompletedNs - humanStartedNs;
  const processDurationNs = processCompletedNs - processStartedNs;
  const humanWallDurationNs =
    BigInt(humanCompletedWall - humanStartedWall) * 1_000_000n;
  const processWallDurationNs =
    BigInt(processCompletedWall - processStartedWall) * 1_000_000n;
  const toleranceNs =
    BigInt(policy.wall_monotonic_elapsed_tolerance_ms) * 1_000_000n;
  assert(
    clocks.human_monotonic_clock_id === policy.human_monotonic_clock_id &&
      clocks.process_monotonic_clock_id ===
        policy.process_monotonic_clock_id &&
      clocks.wall_clock_id === policy.wall_clock_id &&
      humanCompletedNs > humanStartedNs &&
      processCompletedNs > processStartedNs &&
      humanCompletedWall >= humanStartedWall &&
      processCompletedWall >= processStartedWall &&
      absoluteBigInt(humanDurationNs - humanWallDurationNs) <= toleranceNs &&
      absoluteBigInt(processDurationNs - processWallDurationNs) <=
        toleranceNs &&
      processStartedWall >= humanStartedWall -
        policy.wall_monotonic_elapsed_tolerance_ms &&
      processCompletedWall <=
        humanCompletedWall + policy.wall_monotonic_elapsed_tolerance_ms &&
      humanStartedWall >= collectionWindow.started &&
      humanCompletedWall <= collectionWindow.completed,
    "formal_execution_clock_relation",
  );
  return {
    ...clocks,
    humanStartedWall,
    humanCompletedWall,
    processStartedWall,
    processCompletedWall,
    humanStartedNs,
    humanCompletedNs,
    processStartedNs,
    processCompletedNs,
    humanDurationNs,
    processDurationNs,
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
