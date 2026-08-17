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
import { assertAuthoritativeFormalAcquisitionRuntime } from "./long_task_formal_acquisition_runtime.mjs";

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
    acquisitionRuntime,
    runtimeTcbIdentity,
    stateRetention,
  } = options;
  if (!collector)
    throw new Error(`formal_collection_collector:${scenario.scenario_id}`);
  assertAuthoritativeFormalAcquisitionRuntime(
    acquisitionRuntime,
    runtimeTcbIdentity,
  );
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
  const providerRequired =
    scenario.measurement_profile.provider_event.presence === "required";
  const stateRequired =
    scenario.measurement_profile.meters.storage_byte_hour.presence ===
    "required";
  let providerOpened = false;
  let stateOpened = false;
  let primaryError = null;
  try {
    const providerArgv = providerRequired
      ? await acquisitionRuntime.openProviderCapture({
          invocationId,
          scenarioTimeoutMs: scenario.execution_timeout_ms,
        })
      : [];
    providerOpened = providerRequired;
    const stateArgv = stateRequired
      ? await acquisitionRuntime.beginStateCapture({
          invocationId,
          executionRoot,
          runSetRoot: resolvedRoot,
          stateRootRef: refs.stateRoot,
        })
      : [];
    stateOpened = stateRequired;
    const argv = formalScenarioArgv({
      collector,
      setup,
      scenario,
      variantId,
      invocationId,
      refs,
      providerArgv,
      stateArgv,
    });
    const before = await formalCandidateSnapshot(setup.checkout, invocationId);
    const session = await acquisitionRuntime.beginInteraction({
      invocationId,
      scenarioId: scenario.scenario_id,
      timeoutMs: scenario.execution_timeout_ms,
    });
    const supervised = await runSupervisedScenario({
      resolvedRoot,
      scenario,
      invocationId,
      refs,
      argv,
      acquisitionRuntime,
      runtimeTcbIdentity,
    });
    const humanTrace = session.complete();
    if (providerRequired) {
      await acquisitionRuntime.finalizeProviderCapture({
        invocationId,
        rawPromptPath: resolveFormalArtifact(resolvedRoot, refs.rawPrompt),
        providerEventPath: resolveFormalArtifact(
          resolvedRoot,
          refs.providerEvent,
        ),
      });
      providerOpened = false;
    }
    if (stateRequired) {
      await acquisitionRuntime.finalizeStateCapture({
        invocationId,
        payloadPath: resolveFormalArtifact(resolvedRoot, refs.statePayload),
        ledgerPath: resolveFormalArtifact(resolvedRoot, refs.storageLedger),
        retention: stateRetention,
      });
      stateOpened = false;
    }
    await validateAcquiredArtifacts({
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
  } catch (error) {
    primaryError = error;
  } finally {
    if (providerOpened)
      try {
        await acquisitionRuntime.abortProviderCapture(invocationId);
      } catch (error) {
        primaryError = error;
      }
    if (stateOpened)
      try {
        await acquisitionRuntime.abortStateCapture(invocationId);
      } catch (error) {
        primaryError ??= error;
      }
  }
  throw primaryError;
}

async function runSupervisedScenario({
  resolvedRoot,
  scenario,
  invocationId,
  refs,
  argv,
  acquisitionRuntime,
  runtimeTcbIdentity,
}) {
  let supervised;
  try {
    supervised = await acquisitionRuntime.runProcess({
      requestId: invocationId,
      executable: runtimeTcbIdentity.runtime.node_exec_path,
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
    acquisitionRuntime.finishInteraction(invocationId);
  }
  if (
    supervised.exit_code !== 0 ||
    supervised.timed_out ||
    supervised.output_overflow ||
    !supervised.descendants_cleaned ||
    supervised.active_processes_at_result !== 0
  )
    throw new Error(`formal_collection_execution_failed:${invocationId}`);
  return supervised;
}

async function validateAcquiredArtifacts(options) {
  const { resolvedRoot, executionRoot, scenario, invocationId, refs } = options;
  const expected = new Set(["output.bin", "stderr.log", "stdout.log"]);
  if (scenario.measurement_profile.provider_event.presence === "required") {
    expected.add("raw-prompt.bin");
    expected.add("provider-event.json");
  }
  if (
    scenario.measurement_profile.meters.storage_byte_hour.presence ===
    "required"
  ) {
    expected.add("state-payload.bin");
    expected.add("storage-ledger.json");
  }
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
  if (scenario.measurement_profile.provider_event.presence === "required") {
    const prompt = await readFreshFormalFile(
      resolveFormalArtifact(resolvedRoot, refs.rawPrompt),
      FORMAL_EVIDENCE_CAPACITY.maximum_raw_prompt_bytes,
    );
    if (prompt.length === 0)
      throw new Error(`formal_collection_raw_prompt_empty:${invocationId}`);
    await readFreshFormalFile(
      resolveFormalArtifact(resolvedRoot, refs.providerEvent),
      FORMAL_EVIDENCE_CAPACITY.maximum_measurement_record_bytes,
    );
  }
  if (
    scenario.measurement_profile.meters.storage_byte_hour.presence ===
    "required"
  ) {
    const payload = await readFreshFormalFile(
      resolveFormalArtifact(resolvedRoot, refs.statePayload),
      FORMAL_EVIDENCE_CAPACITY.maximum_state_payload_bytes,
    );
    if (payload.length === 0)
      throw new Error(`formal_collection_state_payload_empty:${invocationId}`);
    await readFreshFormalFile(
      resolveFormalArtifact(resolvedRoot, refs.storageLedger),
      FORMAL_EVIDENCE_CAPACITY.maximum_measurement_record_bytes,
    );
  }
}

function formalScenarioArgv({
  collector,
  setup,
  scenario,
  variantId,
  invocationId,
  refs,
  providerArgv,
  stateArgv,
}) {
  return [
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
    ...providerArgv,
    ...stateArgv,
  ];
}
