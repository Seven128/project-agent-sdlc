import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { FORMAL_EVIDENCE_CAPACITY } from "./long_task_real_process_schema_policy.mjs";
import { deriveFormalInvocationId } from "./long_task_formal_total_cost_execution.mjs";
import {
  assertFormalCandidateUnchanged,
  formalArtifactRefs,
  formalCandidateSnapshot,
  formalCollectorEnvironment,
  readFreshFormalFile,
  resolveFormalArtifact,
} from "./long_task_formal_collection_io.mjs";
import { writeFormalScenarioRecords } from "./long_task_formal_scenario_records.mjs";

export async function collectFormalScenarioExecution(options) {
  const {
    resolvedRoot,
    formalRoot,
    runSetId,
    run,
    setup,
    scenario,
    collector,
    pairId,
    variantId,
    precollection,
    interactionRecorder,
    supervisor,
  } = options;
  if (!collector)
    throw new Error(`formal_collection_collector:${scenario.scenario_id}`);
  const invocationId = deriveFormalInvocationId({
    schema_version: "formal-invocation-projection-v1",
    run_set_id: runSetId,
    run_id: run.run_id,
    pair_id: pairId,
    variant_id: variantId,
    scenario_id: scenario.scenario_id,
    collector: {
      collector_id: collector.collector_id,
      implementation_sha256: collector.implementation_sha256,
    },
    attempt: 1,
    precollection_identity_sha256: precollection.identity.identity_sha256,
  });
  const executionRoot = path.join(formalRoot, invocationId);
  await mkdir(executionRoot, { recursive: false });
  const refs = formalArtifactRefs(invocationId);
  const argv = formalScenarioArgv({
    collector,
    setup,
    scenario,
    variantId,
    invocationId,
    refs,
  });
  const before = await formalCandidateSnapshot(setup.checkout, invocationId);
  const session = await interactionRecorder.begin({
    invocationId,
    scenarioId: scenario.scenario_id,
    timeoutMs: scenario.execution_timeout_ms,
  });
  const supervised = await runSupervisedScenario({
    resolvedRoot,
    scenario,
    pairId,
    variantId,
    invocationId,
    refs,
    argv,
    interactionRecorder,
    supervisor,
  });
  const humanTrace = session.complete({
    startedNs: supervised.monotonic_started_ns,
    completedNs: supervised.monotonic_completed_ns,
  });
  await validateChildArtifacts({
    resolvedRoot,
    executionRoot,
    scenario,
    invocationId,
    refs,
  });
  const after = await formalCandidateSnapshot(setup.checkout, invocationId);
  assertFormalCandidateUnchanged(before, after, setup.record);
  return writeFormalScenarioRecords({
    ...options,
    invocationId,
    refs,
    argv,
    supervised,
    humanTrace,
    before,
    after,
  });
}

async function runSupervisedScenario(options) {
  const {
    resolvedRoot,
    scenario,
    pairId,
    variantId,
    invocationId,
    refs,
    argv,
    interactionRecorder,
    supervisor,
  } = options;
  let supervised;
  try {
    supervised = await supervisor.run({
      requestId: invocationId,
      executable: process.execPath,
      argv,
      cwd: resolvedRoot,
      stdoutPath: resolveFormalArtifact(resolvedRoot, refs.stdout),
      stderrPath: resolveFormalArtifact(resolvedRoot, refs.stderr),
      timeoutMs: scenario.execution_timeout_ms,
      combinedOutputLimitBytes:
        FORMAL_EVIDENCE_CAPACITY.maximum_combined_stream_bytes,
      environment: formalCollectorEnvironment(),
    });
  } finally {
    interactionRecorder.finish?.(invocationId);
  }
  if (
    supervised.exit_code !== 0 ||
    supervised.timed_out ||
    supervised.output_overflow ||
    !supervised.descendants_cleaned ||
    supervised.active_processes_at_result !== 0
  )
    throw new Error(
      `formal_collection_execution_failed:${scenario.scenario_id}:${pairId}:${variantId}`,
    );
  return supervised;
}

async function validateChildArtifacts(options) {
  const { resolvedRoot, executionRoot, scenario, invocationId, refs } = options;
  const expected = new Set(["output.bin", "stderr.log", "stdout.log"]);
  if (scenario.measurement_profile.raw_prompt.presence === "required")
    expected.add("raw-prompt.bin");
  if (scenario.measurement_profile.provider_event.presence === "required")
    expected.add("provider-event.json");
  const actual = await readdir(executionRoot);
  if (
    actual.length !== expected.size ||
    actual.some((name) => !expected.has(name))
  )
    throw new Error(`formal_collection_child_file_set:${invocationId}`);
  const output = await readFreshFormalFile(
    resolveFormalArtifact(resolvedRoot, refs.output),
    FORMAL_EVIDENCE_CAPACITY.maximum_scenario_output_bytes,
  );
  if (output.length === 0)
    throw new Error(`formal_collection_output_empty:${invocationId}`);
  if (scenario.measurement_profile.raw_prompt.presence === "required")
    await readFreshFormalFile(
      resolveFormalArtifact(resolvedRoot, refs.rawPrompt),
      FORMAL_EVIDENCE_CAPACITY.maximum_raw_prompt_bytes,
    );
  if (scenario.measurement_profile.provider_event.presence === "required")
    await readFreshFormalFile(
      resolveFormalArtifact(resolvedRoot, refs.providerEvent),
      FORMAL_EVIDENCE_CAPACITY.maximum_measurement_record_bytes,
    );
}

function formalScenarioArgv({
  collector,
  setup,
  scenario,
  variantId,
  invocationId,
  refs,
}) {
  const argv = [
    `inputs/formal-evidence-precollection/${collector.implementation_ref}`,
    "--candidate-package",
    `setup/${variantId}/${setup.record.package_path}`,
    "--task",
    `inputs/formal-evidence-precollection/${scenario.task_source_ref}`,
    "--output",
    refs.output,
    "--invocation-id",
    invocationId,
    "--scenario-id",
    scenario.scenario_id,
    "--variant-id",
    variantId,
  ];
  if (scenario.measurement_profile.raw_prompt.presence === "required")
    argv.push("--raw-prompt", refs.rawPrompt);
  if (scenario.measurement_profile.provider_event.presence === "required")
    argv.push("--provider-event", refs.providerEvent);
  return argv;
}
