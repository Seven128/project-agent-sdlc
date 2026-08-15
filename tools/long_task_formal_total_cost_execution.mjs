import {
  FORMAL_EVIDENCE_CAPACITY,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_schema_policy.mjs";
import { assert } from "./long_task_real_process_roi_scoring.mjs";
import { assertExactKeys } from "./long_task_formal_total_cost_shared.mjs";
import {
  deriveFormalExecutionId,
  deriveFormalExecutionRecordSha256,
  deriveFormalInvocationId,
} from "./long_task_formal_execution_identity.mjs";
import { consumeFormalExecutionArtifact } from "./long_task_formal_execution_artifacts.mjs";
import {
  validateFormalCandidateObservation,
  validateFormalClocks,
  validateFormalExactInvocation,
  validateFormalExit,
  validateFormalSensitiveArtifactReference,
} from "./long_task_formal_execution_invocation.mjs";
import {
  validateFormalHumanTrace,
  validateFormalProcessAccounting,
  validateFormalStorageLedger,
} from "./long_task_formal_execution_measurements.mjs";

export {
  deriveFormalExecutionId,
  deriveFormalExecutionRecordSha256,
  deriveFormalInvocationId,
  finalizeFormalExecutionRecord,
} from "./long_task_formal_execution_identity.mjs";

export async function validateFormalExecutionRecord({
  record,
  event,
  scenario,
  collector,
  runBinding,
  setup,
  precollectionIdentity,
  runtimeTcbIdentity,
  accountingPolicy,
  runArtifactIndex,
  consumedArtifacts,
  collectionWindow,
}) {
  assertExactKeys(
    record,
    [
      "attempt",
      "candidate_observation_ref",
      "clocks",
      "exact_invocation",
      "execution_id",
      "execution_record_sha256",
      "exit",
      "invocation_id",
      "measurement_refs",
      "scenario_output_ref",
      "schema_version",
      "streams",
    ],
    `formal_execution_record_fields:${event.run_id}:${event.pair_id}`,
  );
  assert(
    record.schema_version ===
      REAL_PROCESS_SCHEMAS.FORMAL_SCENARIO_EXECUTION_SCHEMA &&
      record.attempt === 1 &&
      record.invocation_id === event.invocation_id,
    `formal_execution_record:${event.run_id}:${event.pair_id}`,
  );
  validateDerivedIdentity({
    record,
    event,
    scenario,
    collector,
    precollectionIdentity,
  });
  const invocation = validateFormalExactInvocation({
    invocation: record.exact_invocation,
    collector,
    runBinding,
    setup,
    scenario,
    record,
    runArtifactIndex,
    runtimeTcbIdentity,
  });
  const clocks = validateFormalClocks(
    record.clocks,
    scenario.clock_policy,
    collectionWindow,
  );
  validateFormalExit(record.exit);
  await validateFormalCandidateObservation({
    reference: record.candidate_observation_ref,
    invocationId: record.invocation_id,
    runBinding,
    runArtifactIndex,
    consumedArtifacts,
  });
  const artifactPrefix = `formal-evidence/${record.invocation_id}`;
  await validateExecutionOutputs({
    record,
    event,
    artifactPrefix,
    runArtifactIndex,
    consumedArtifacts,
  });
  const measurementOptions = {
    invocationId: record.invocation_id,
    clocks,
    runArtifactIndex,
    consumedArtifacts,
  };
  const human = await validateFormalHumanTrace({
    ...measurementOptions,
    reference: record.measurement_refs.human_time,
  });
  const processAccounting = await validateFormalProcessAccounting({
    ...measurementOptions,
    reference: record.measurement_refs.process_accounting,
    required:
      scenario.measurement_profile.meters.compute_ms.presence === "required",
  });
  const storage = await validateFormalStorageLedger({
    ...measurementOptions,
    reference: record.measurement_refs.storage_ledger,
    statePayloadReference: record.measurement_refs.state_payload,
    required:
      scenario.measurement_profile.meters.storage_byte_hour.presence ===
      "required",
    expectedRetention: accountingPolicy.state_storage_retention,
  });
  const rawPrompt = validateFormalSensitiveArtifactReference(
    record.measurement_refs.raw_prompt,
    scenario.measurement_profile.raw_prompt.presence === "required",
    "raw_prompt",
    `${artifactPrefix}/raw-prompt.bin`,
  );
  const providerEvent = validateFormalSensitiveArtifactReference(
    record.measurement_refs.provider_event,
    scenario.measurement_profile.provider_event.presence === "required",
    "provider_event",
    `${artifactPrefix}/provider-event.json`,
  );
  return {
    invocation_id: record.invocation_id,
    clocks,
    human,
    processAccounting,
    storage,
    sensitive_refs: {
      provider_event: providerEvent,
      raw_prompt: rawPrompt,
    },
    provider_bridge: invocation.providerBridge,
  };
}

function validateDerivedIdentity({
  record,
  event,
  scenario,
  collector,
  precollectionIdentity,
}) {
  const projection = {
    schema_version: "formal-invocation-projection-v1",
    run_set_id: event.run_set_id,
    run_id: event.run_id,
    pair_id: event.pair_id,
    variant_id: event.variant_id,
    scenario_id: event.subject.scenario_id,
    collector: {
      collector_id: scenario.collector_id,
      implementation_sha256: collector.implementation_sha256,
    },
    attempt: record.attempt,
    precollection_identity_sha256: precollectionIdentity.identity_sha256,
  };
  assert(
    deriveFormalInvocationId(projection) === record.invocation_id,
    `formal_execution_invocation_derivation:${event.run_id}:${event.pair_id}`,
  );
  assert(
    record.execution_record_sha256 ===
      deriveFormalExecutionRecordSha256(record) &&
      record.execution_id ===
        deriveFormalExecutionId(
          record.invocation_id,
          record.execution_record_sha256,
        ),
    `formal_execution_identity_derivation:${event.run_id}:${event.pair_id}`,
  );
}

async function validateExecutionOutputs({
  record,
  event,
  artifactPrefix,
  runArtifactIndex,
  consumedArtifacts,
}) {
  assertExactKeys(
    record.streams,
    ["stderr_ref", "stdout_ref"],
    `formal_execution_stream_fields:${record.execution_id}`,
  );
  assert(
    record.streams.stdout_ref === `${artifactPrefix}/stdout.log` &&
      record.streams.stderr_ref === `${artifactPrefix}/stderr.log`,
    `formal_execution_stream_refs:${record.execution_id}`,
  );
  await Promise.all([
    consumeFormalExecutionArtifact(
      runArtifactIndex,
      consumedArtifacts,
      record.streams.stdout_ref,
      "formal_stdout",
      FORMAL_EVIDENCE_CAPACITY.maximum_combined_stream_bytes,
    ),
    consumeFormalExecutionArtifact(
      runArtifactIndex,
      consumedArtifacts,
      record.streams.stderr_ref,
      "formal_stderr",
      FORMAL_EVIDENCE_CAPACITY.maximum_combined_stream_bytes,
    ),
  ]);
  const stdoutEntry = runArtifactIndex.get(record.streams.stdout_ref);
  const stderrEntry = runArtifactIndex.get(record.streams.stderr_ref);
  assert(
    stdoutEntry.bytes + stderrEntry.bytes <=
      FORMAL_EVIDENCE_CAPACITY.maximum_combined_stream_bytes,
    `formal_execution_stream_budget:${record.execution_id}`,
  );
  assert(
    record.scenario_output_ref === event.scenario_output_ref &&
      record.scenario_output_ref === `${artifactPrefix}/output.bin`,
    `formal_execution_output_ref:${record.execution_id}`,
  );
  await consumeFormalExecutionArtifact(
    runArtifactIndex,
    consumedArtifacts,
    record.scenario_output_ref,
    "scenario_output",
    FORMAL_EVIDENCE_CAPACITY.maximum_scenario_output_bytes,
  );
  assertExactKeys(
    record.measurement_refs,
    [
      "human_time",
      "process_accounting",
      "provider_event",
      "raw_prompt",
      "state_payload",
      "storage_ledger",
    ],
    `formal_execution_measurement_refs:${record.execution_id}`,
  );
}
