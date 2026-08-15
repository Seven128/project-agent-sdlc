import {
  FORMAL_EVIDENCE_CAPACITY,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_schema_policy.mjs";
import { assert, sha256 } from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  assertSafeRelativePath,
  parseJson,
} from "./long_task_formal_total_cost_shared.mjs";
import { consumeFormalExecutionArtifact } from "./long_task_formal_execution_artifacts.mjs";

export async function validateFormalHumanTrace(options) {
  const {
    reference,
    invocationId,
    clocks,
    runArtifactIndex,
    consumedArtifacts,
  } = options;
  assert(
    reference === `formal-evidence/${invocationId}/human.json`,
    "formal_human_trace_ref",
  );
  const trace = parseJson(
    await consumeMeasurement(
      options,
      "human_interaction_trace",
      "formal_human_trace_json",
    ),
    `formal_human_trace_json:${reference}`,
  );
  assertExactKeys(
    trace,
    [
      "clock_id",
      "completed_at",
      "invocation_id",
      "monotonic_completed_ns",
      "monotonic_started_ns",
      "records",
      "schema_version",
      "source_kind",
      "started_at",
    ],
    `formal_human_trace_fields:${reference}`,
  );
  assert(
    trace.schema_version ===
      REAL_PROCESS_SCHEMAS.FORMAL_HUMAN_INTERACTION_TRACE_SCHEMA &&
      trace.source_kind === "runner-interaction-recorder-v1" &&
      trace.invocation_id === invocationId &&
      trace.clock_id === clocks.human_monotonic_clock_id &&
      trace.monotonic_started_ns === clocks.human_monotonic_started_ns &&
      trace.monotonic_completed_ns === clocks.human_monotonic_completed_ns &&
      trace.started_at === clocks.human_started_at &&
      trace.completed_at === clocks.human_completed_at &&
      Array.isArray(trace.records) &&
      trace.records.length > 0 &&
      trace.records.length <= 1024,
    `formal_human_trace:${reference}`,
  );
  let activeNs = 0n;
  let waitNs = 0n;
  let previous = clocks.humanStartedNs;
  for (const [index, interval] of trace.records.entries()) {
    const measured = validateHumanInterval(
      interval,
      index,
      reference,
      previous,
      clocks,
    );
    if (interval.state === "active") activeNs += measured.duration;
    else waitNs += measured.duration;
    previous = measured.completed;
  }
  assert(
    previous === clocks.humanCompletedNs &&
      activeNs + waitNs === clocks.humanDurationNs &&
      activeNs > 0n,
    `formal_human_trace_coverage:${reference}`,
  );
  return {
    active_ms: Number(activeNs) / 1_000_000,
    wait_ms: Number(waitNs) / 1_000_000,
  };
}

export async function validateFormalProcessAccounting(options) {
  const { reference, required, invocationId, clocks } = options;
  if (!required) {
    assert(reference === null, "formal_process_accounting_forbidden");
    return null;
  }
  assert(
    reference === `formal-evidence/${invocationId}/process-accounting.json`,
    "formal_process_accounting_ref",
  );
  const record = parseJson(
    await consumeMeasurement(options, "process_accounting"),
    `formal_process_accounting_json:${reference}`,
  );
  assertExactKeys(
    record,
    [
      "active_processes_at_result",
      "clock_id",
      "completed_ns",
      "invocation_id",
      "kernel_cpu_100ns",
      "schema_version",
      "source_kind",
      "started_ns",
      "total_cpu_100ns",
      "total_processes",
      "user_cpu_100ns",
    ],
    `formal_process_accounting_fields:${reference}`,
  );
  assert(
    record.schema_version ===
      REAL_PROCESS_SCHEMAS.FORMAL_PROCESS_ACCOUNTING_SCHEMA &&
      record.source_kind === "windows-job-object-accounting-v1" &&
      record.invocation_id === invocationId &&
      record.clock_id === clocks.process_monotonic_clock_id &&
      record.started_ns === clocks.process_monotonic_started_ns &&
      record.completed_ns === clocks.process_monotonic_completed_ns &&
      record.active_processes_at_result === 0 &&
      Number.isSafeInteger(record.total_processes) &&
      record.total_processes >= 1 &&
      Number.isSafeInteger(record.user_cpu_100ns) &&
      record.user_cpu_100ns >= 0 &&
      Number.isSafeInteger(record.kernel_cpu_100ns) &&
      record.kernel_cpu_100ns >= 0 &&
      record.total_cpu_100ns ===
        record.user_cpu_100ns + record.kernel_cpu_100ns &&
      record.total_cpu_100ns > 0,
    `formal_process_accounting:${reference}`,
  );
  return { compute_ms: record.total_cpu_100ns / 10_000 };
}

export async function validateFormalStorageLedger(options) {
  const {
    reference,
    statePayloadReference,
    required,
    invocationId,
    expectedRetention,
  } = options;
  if (!required) {
    assert(
      reference === null && statePayloadReference === null,
      "formal_storage_ledger_forbidden",
    );
    return null;
  }
  assert(
    reference === `formal-evidence/${invocationId}/storage-ledger.json`,
    "formal_storage_ledger_ref",
  );
  assert(
    statePayloadReference ===
      `formal-evidence/${invocationId}/state-payload.bin`,
    "formal_state_payload_ref",
  );
  const ledger = parseJson(
    await consumeMeasurement(options, "storage_ledger"),
    `formal_storage_ledger_json:${reference}`,
  );
  const payload = await consumeFormalExecutionArtifact(
    options.runArtifactIndex,
    options.consumedArtifacts,
    statePayloadReference,
    "state_payload",
    FORMAL_EVIDENCE_CAPACITY.maximum_state_payload_bytes,
  );
  validateStorageLedgerShape(
    ledger,
    options,
    statePayloadReference,
    expectedRetention,
    payload,
  );
  const quantity = payload.length * expectedRetention.retention_hours;
  assert(
    Number.isSafeInteger(quantity) && quantity > 0,
    `formal_storage_quantity:${reference}`,
  );
  return {
    storage_byte_hour: quantity,
  };
}

function validateHumanInterval(interval, index, reference, previous, clocks) {
  assertExactKeys(
    interval,
    ["completed_ns", "started_ns", "state"],
    `formal_human_interval_fields:${reference}:${index}`,
  );
  const started = decimalBigInt(
    interval.started_ns,
    `formal_human_interval_start:${reference}:${index}`,
  );
  const completed = decimalBigInt(
    interval.completed_ns,
    `formal_human_interval_completed:${reference}:${index}`,
  );
  assert(
    ["active", "wait"].includes(interval.state) &&
      started === previous &&
      completed > started &&
      completed <= clocks.humanCompletedNs,
    `formal_human_interval:${reference}:${index}`,
  );
  return { completed, duration: completed - started };
}

function validateStorageLedgerShape(
  ledger,
  options,
  expectedPayloadRef,
  expectedRetention,
  payload,
) {
  const { reference, invocationId } = options;
  assertExactKeys(
    ledger,
    [
      "entries",
      "invocation_id",
      "payload_bytes",
      "retention_basis",
      "retention_hours",
      "retention_source_sha256",
      "schema_version",
      "source_kind",
      "state_payload_ref",
      "state_payload_sha256",
    ],
    `formal_storage_ledger_fields:${reference}`,
  );
  assert(
    ledger.schema_version ===
      REAL_PROCESS_SCHEMAS.FORMAL_STORAGE_LEDGER_SCHEMA &&
      ledger.source_kind ===
        "runner-exact-state-payload-retention-v1" &&
      ledger.invocation_id === invocationId &&
      ledger.state_payload_ref === expectedPayloadRef &&
      ledger.state_payload_sha256 === sha256(payload) &&
      ledger.payload_bytes === payload.length &&
      payload.length > 0 &&
      expectedRetention?.status === "frozen_supported" &&
      ledger.retention_hours === expectedRetention.retention_hours &&
      ledger.retention_basis === expectedRetention.basis &&
      ledger.retention_source_sha256 === expectedRetention.source_sha256 &&
      Array.isArray(ledger.entries) &&
      ledger.entries.length > 0 &&
      ledger.entries.length <=
        FORMAL_EVIDENCE_CAPACITY.maximum_state_source_files,
    `formal_storage_ledger:${reference}`,
  );
  const paths = new Set();
  let offset = 0;
  for (const [index, event] of ledger.entries.entries()) {
    assertExactKeys(
      event,
      ["bytes", "offset", "path", "sha256"],
      `formal_storage_event_fields:${reference}:${index}`,
    );
    assertSafeRelativePath(
      event.path,
      `formal_storage_event_path:${reference}:${index}`,
    );
    assert(
      !paths.has(event.path) &&
        event.offset === offset &&
        Number.isSafeInteger(event.bytes) &&
        event.bytes >= 0 &&
        offset + event.bytes <= payload.length &&
        event.sha256 ===
          sha256(payload.subarray(offset, offset + event.bytes)),
      `formal_storage_event:${reference}:${index}`,
    );
    paths.add(event.path);
    offset += event.bytes;
  }
  assert(offset === payload.length, `formal_storage_payload_coverage:${reference}`);
}

async function consumeMeasurement(options, role) {
  return consumeFormalExecutionArtifact(
    options.runArtifactIndex,
    options.consumedArtifacts,
    options.reference,
    role,
    FORMAL_EVIDENCE_CAPACITY.maximum_measurement_record_bytes,
  );
}

function decimalBigInt(value, code) {
  assert(typeof value === "string" && /^[0-9]+$/u.test(value), code);
  return BigInt(value);
}
