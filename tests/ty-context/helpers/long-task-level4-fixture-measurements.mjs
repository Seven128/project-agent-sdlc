import { REAL_PROCESS_SCHEMAS } from "../../../tools/long_task_real_process_schema_policy.mjs";
import { finalizeFormalExecutionRecord } from "../../../tools/long_task_formal_total_cost_execution.mjs";
import {
  cleanCandidateObservation,
  digest,
  sensitiveRef,
  writeArtifact,
} from "./long-task-level4-test-utils.mjs";

const humanStartedAt = "2026-08-16T01:00:00.000Z";
const humanCompletedAt = "2026-08-16T01:00:01.000Z";
const processStartedAt = "2026-08-16T01:00:00.100Z";
export const fixtureProcessCompletedAt = "2026-08-16T01:00:00.900Z";
const humanStartedNs = "1000000000";
const humanCompletedNs = "2000000000";
const processStartedNs = "1100000000";
const processCompletedNs = "1900000000";

export function fixtureRuntimeTcbIdentity() {
  return {
    runtime: { node_exec_path: process.execPath },
    provider_adapter: {
      adapter_id: "openai-responses-loopback-v1",
      identity_sha256: "4".repeat(64),
      provider: "openai",
      model: "fixture-model",
    },
  };
}

export async function writeFixtureBaseArtifacts(
  root,
  refs,
  { invocationId, setup, output },
) {
  await Promise.all([
    writeArtifact(root, refs.output, output),
    writeArtifact(root, refs.stdout, Buffer.alloc(0)),
    writeArtifact(root, refs.stderr, Buffer.alloc(0)),
    writeArtifact(root, refs.human, {
      schema_version: REAL_PROCESS_SCHEMAS.FORMAL_HUMAN_INTERACTION_TRACE_SCHEMA,
      invocation_id: invocationId,
      source_kind: "runner-interaction-recorder-v1",
      clock_id: "node-hrtime-v1",
      started_at: humanStartedAt,
      completed_at: humanCompletedAt,
      monotonic_started_ns: humanStartedNs,
      monotonic_completed_ns: humanCompletedNs,
      records: [
        {
          state: "active",
          started_ns: humanStartedNs,
          completed_ns: humanCompletedNs,
        },
      ],
    }),
    writeArtifact(root, refs.candidateObservation, {
      schema_version: "formal-candidate-observation-v1",
      invocation_id: invocationId,
      before: cleanCandidateObservation(invocationId, setup.commit, setup.tree),
      after: cleanCandidateObservation(invocationId, setup.commit, setup.tree),
    }),
  ]);
}

export async function writeFixtureProcessAccounting(
  root,
  refs,
  invocationId,
  variantId,
) {
  const user = variantId === "b" ? 100_000 : 150_000;
  await writeArtifact(root, refs.processAccounting, {
    schema_version: REAL_PROCESS_SCHEMAS.FORMAL_PROCESS_ACCOUNTING_SCHEMA,
    invocation_id: invocationId,
    source_kind: "windows-job-object-accounting-v1",
    clock_id: "windows-stopwatch-qpc-v1",
    started_ns: processStartedNs,
    completed_ns: processCompletedNs,
    user_cpu_100ns: user,
    kernel_cpu_100ns: 50_000,
    total_cpu_100ns: user + 50_000,
    total_processes: 2,
    active_processes_at_result: 0,
  });
}

export async function writeFixtureStateArtifacts(root, refs, context) {
  const payload = Buffer.from(`state:${context.variantId}:${context.pairId}\n`);
  await writeArtifact(root, refs.statePayload, payload);
  await writeArtifact(root, refs.storageLedger, {
    schema_version: REAL_PROCESS_SCHEMAS.FORMAL_STORAGE_LEDGER_SCHEMA,
    invocation_id: context.invocationId,
    source_kind: "runner-exact-state-payload-retention-v1",
    state_payload_ref: refs.statePayload,
    state_payload_sha256: digest(payload),
    payload_bytes: payload.length,
    retention_hours: context.retention.retention_hours,
    retention_basis: context.retention.basis,
    retention_source_sha256: context.retention.source_sha256,
    entries: [
      {
        path: "state.bin",
        offset: 0,
        bytes: payload.length,
        sha256: digest(payload),
      },
    ],
  });
}

export async function writeFixtureProviderArtifacts(root, refs, context) {
  const prompt = Buffer.from(`prompt:${context.invocationId}\n`);
  await writeArtifact(root, refs.rawPrompt, prompt);
  await writeArtifact(root, refs.providerEvent, {
    schema_version: REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA,
    invocation_id: context.invocationId,
    adapter_id: context.runtimeTcbIdentity.provider_adapter.adapter_id,
    adapter_identity_sha256:
      context.runtimeTcbIdentity.provider_adapter.identity_sha256,
    bridge_session_sha256: context.bridgeSessionSha256,
    provider: "openai",
    model: "fixture-model",
    provider_request_or_session_id: `response-${context.invocationId}`,
    recorded_at: "2026-08-16T01:00:00.500Z",
    clock_id: "provider-unix-epoch-ms-v1:openai",
    raw_prompt_sha256: digest(prompt),
    raw_response_sha256: digest(`response:${context.invocationId}`),
    usage: {
      input_tokens: 1000,
      output_tokens: 100,
      cached_input_tokens: 0,
    },
  });
}

export function buildFixtureExecution(context) {
  const { scenario, invocationId, refs, argv, flags } = context;
  return finalizeFormalExecutionRecord({
    schema_version: REAL_PROCESS_SCHEMAS.FORMAL_SCENARIO_EXECUTION_SCHEMA,
    invocation_id: invocationId,
    attempt: 1,
    exact_invocation: {
      executable: context.runtimeTcbIdentity.runtime.node_exec_path,
      argv,
      cwd: context.root,
      shell: false,
    },
    clocks: {
      human_monotonic_clock_id: "node-hrtime-v1",
      human_monotonic_started_ns: humanStartedNs,
      human_monotonic_completed_ns: humanCompletedNs,
      human_started_at: humanStartedAt,
      human_completed_at: humanCompletedAt,
      process_monotonic_clock_id: "windows-stopwatch-qpc-v1",
      process_monotonic_started_ns: processStartedNs,
      process_monotonic_completed_ns: processCompletedNs,
      process_started_at: processStartedAt,
      process_completed_at: fixtureProcessCompletedAt,
      wall_clock_id: "unix-epoch-ms-v1",
    },
    exit: {
      exit_code: 0,
      timed_out: false,
      output_overflow: false,
      descendants_cleaned: true,
      total_processes: flags.process ? 2 : 1,
      active_processes_at_result: 0,
    },
    streams: { stdout_ref: refs.stdout, stderr_ref: refs.stderr },
    scenario_output_ref: refs.output,
    candidate_observation_ref: refs.candidateObservation,
    measurement_refs: {
      human_time: refs.human,
      process_accounting: flags.process ? refs.processAccounting : null,
      storage_ledger: flags.state ? refs.storageLedger : null,
      state_payload: flags.state ? refs.statePayload : null,
      raw_prompt: flags.provider ? sensitiveRef(refs.rawPrompt) : null,
      provider_event: flags.provider ? sensitiveRef(refs.providerEvent) : null,
    },
  });
}
