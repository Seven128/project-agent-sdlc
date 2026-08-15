import {
  FORMAL_EVIDENCE_CAPACITY,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_schema_policy.mjs";
import { finalizeFormalExecutionRecord } from "./long_task_formal_total_cost_execution.mjs";
import { formalEvidenceKey } from "./long_task_formal_total_cost_events.mjs";
import {
  readFreshFormalFile,
  resolveFormalArtifact,
  sensitiveFormalArtifactRef,
  writeFormalJson,
} from "./long_task_formal_collection_io.mjs";

export async function writeFormalScenarioRecords(options) {
  const {
    resolvedRoot,
    runSetId,
    run,
    setup,
    scenario,
    pairId,
    variantId,
    invocationId,
    refs,
    argv,
    supervised,
    humanTrace,
    before,
    after,
  } = options;
  await Promise.all([
    writeFormalJson(
      resolveFormalArtifact(resolvedRoot, refs.human),
      humanTrace,
    ),
    writeFormalJson(
      resolveFormalArtifact(resolvedRoot, refs.candidateObservation),
      {
        schema_version: "formal-candidate-observation-v1",
        invocation_id: invocationId,
        before,
        after,
      },
    ),
  ]);
  const measurementFlags = await writeMeasurementRecords(options);
  const execution = buildExecutionRecord({
    resolvedRoot,
    scenario,
    invocationId,
    refs,
    argv,
    supervised,
    ...measurementFlags,
  });
  const event = {
    schema_version: REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA,
    run_set_id: runSetId,
    run_id: run.run_id,
    pair_id: pairId,
    variant_id: variantId,
    invocation_id: invocationId,
    observed_at: supervised.completed_at,
    subject: formalScenarioSubject(scenario),
    scenario_output_ref: refs.output,
    execution_record: execution,
  };
  await writeFormalJson(resolveFormalArtifact(resolvedRoot, refs.event), event);
  return {
    evidence_key: formalEvidenceKey({
      kind: scenario.kind,
      category: scenario.category,
      scenarioId: scenario.scenario_id,
      pairId,
      variantId,
    }),
    event_path: refs.event,
    started_at: supervised.started_at,
    completed_at: supervised.completed_at,
  };
}

async function writeMeasurementRecords(options) {
  const { resolvedRoot, scenario, invocationId, refs, supervised } = options;
  const processAccountingRequired =
    scenario.measurement_profile.meters.compute_ms.presence === "required";
  if (processAccountingRequired)
    await writeFormalJson(
      resolveFormalArtifact(resolvedRoot, refs.processAccounting),
      {
        schema_version: REAL_PROCESS_SCHEMAS.FORMAL_PROCESS_ACCOUNTING_SCHEMA,
        invocation_id: invocationId,
        source_kind: supervised.accounting_source_kind,
        clock_id: supervised.monotonic_clock_id,
        started_ns: supervised.monotonic_started_ns,
        completed_ns: supervised.monotonic_completed_ns,
        user_cpu_100ns: supervised.user_cpu_100ns,
        kernel_cpu_100ns: supervised.kernel_cpu_100ns,
        total_cpu_100ns: supervised.total_cpu_100ns,
        total_processes: supervised.total_processes,
        active_processes_at_result: supervised.active_processes_at_result,
      },
    );
  const storageRequired =
    scenario.measurement_profile.meters.storage_byte_hour.presence ===
    "required";
  if (storageRequired) await writeStorageRecord(options);
  return { processAccountingRequired, storageRequired };
}

async function writeStorageRecord(options) {
  const { resolvedRoot, setup, variantId, invocationId, refs, supervised } =
    options;
  const packageRef = `setup/${variantId}/${setup.record.package_path}`;
  const packageBytes = await readFreshFormalFile(
    resolveFormalArtifact(resolvedRoot, packageRef),
    FORMAL_EVIDENCE_CAPACITY.maximum_lifecycle_file_bytes,
  );
  await writeFormalJson(
    resolveFormalArtifact(resolvedRoot, refs.storageLedger),
    {
      schema_version: REAL_PROCESS_SCHEMAS.FORMAL_STORAGE_LEDGER_SCHEMA,
      invocation_id: invocationId,
      source_kind: "runner-exact-byte-duration-v1",
      clock_id: supervised.monotonic_clock_id,
      started_ns: supervised.monotonic_started_ns,
      completed_ns: supervised.monotonic_completed_ns,
      scope_ref: packageRef,
      events: [
        {
          at_ns: supervised.monotonic_started_ns,
          bytes: packageBytes.length,
        },
      ],
    },
  );
}

function buildExecutionRecord(options) {
  const {
    resolvedRoot,
    scenario,
    invocationId,
    refs,
    argv,
    supervised,
    processAccountingRequired,
    storageRequired,
  } = options;
  return finalizeFormalExecutionRecord({
    schema_version: REAL_PROCESS_SCHEMAS.FORMAL_SCENARIO_EXECUTION_SCHEMA,
    invocation_id: invocationId,
    attempt: 1,
    exact_invocation: {
      executable: process.execPath,
      argv,
      cwd: resolvedRoot,
      shell: false,
    },
    clocks: {
      monotonic_clock_id: supervised.monotonic_clock_id,
      monotonic_started_ns: supervised.monotonic_started_ns,
      monotonic_completed_ns: supervised.monotonic_completed_ns,
      wall_clock_id: supervised.wall_clock_id,
      started_at: supervised.started_at,
      completed_at: supervised.completed_at,
    },
    exit: {
      exit_code: supervised.exit_code,
      timed_out: supervised.timed_out,
      output_overflow: supervised.output_overflow,
      descendants_cleaned: supervised.descendants_cleaned,
      total_processes: supervised.total_processes,
      active_processes_at_result: supervised.active_processes_at_result,
    },
    streams: {
      stdout_ref: refs.stdout,
      stderr_ref: refs.stderr,
    },
    scenario_output_ref: refs.output,
    candidate_observation_ref: refs.candidateObservation,
    measurement_refs: {
      human_time: refs.human,
      process_accounting: processAccountingRequired
        ? refs.processAccounting
        : null,
      storage_ledger: storageRequired ? refs.storageLedger : null,
      raw_prompt:
        scenario.measurement_profile.raw_prompt.presence === "required"
          ? sensitiveFormalArtifactRef(refs.rawPrompt)
          : null,
      provider_event:
        scenario.measurement_profile.provider_event.presence === "required"
          ? sensitiveFormalArtifactRef(refs.providerEvent)
          : null,
    },
  });
}

function formalScenarioSubject(scenario) {
  return scenario.kind === "cost"
    ? {
        kind: "cost",
        category: scenario.category,
        stratum: scenario.stratum,
        scenario_id: scenario.scenario_id,
      }
    : {
        kind: "purpose_benefit",
        stratum: scenario.stratum,
        scenario_id: scenario.scenario_id,
      };
}
