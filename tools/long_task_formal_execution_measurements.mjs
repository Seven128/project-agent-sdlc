import {
  FORMAL_EVIDENCE_CAPACITY,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_schema_policy.mjs";
import { assert } from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
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
    ["clock_id", "invocation_id", "records", "schema_version", "source_kind"],
    `formal_human_trace_fields:${reference}`,
  );
  assert(
    trace.schema_version ===
      REAL_PROCESS_SCHEMAS.FORMAL_HUMAN_INTERACTION_TRACE_SCHEMA &&
      trace.source_kind === "runner-interaction-recorder-v1" &&
      trace.invocation_id === invocationId &&
      trace.clock_id === clocks.monotonic_clock_id &&
      Array.isArray(trace.records) &&
      trace.records.length > 0 &&
      trace.records.length <= 1024,
    `formal_human_trace:${reference}`,
  );
  let activeNs = 0n;
  let waitNs = 0n;
  let previous = clocks.startedNs;
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
    previous === clocks.completedNs && activeNs + waitNs === clocks.durationNs,
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
      record.clock_id === clocks.monotonic_clock_id &&
      record.started_ns === clocks.monotonic_started_ns &&
      record.completed_ns === clocks.monotonic_completed_ns &&
      record.active_processes_at_result === 0 &&
      Number.isSafeInteger(record.total_processes) &&
      record.total_processes >= 1 &&
      Number.isSafeInteger(record.user_cpu_100ns) &&
      record.user_cpu_100ns >= 0 &&
      Number.isSafeInteger(record.kernel_cpu_100ns) &&
      record.kernel_cpu_100ns >= 0 &&
      record.total_cpu_100ns ===
        record.user_cpu_100ns + record.kernel_cpu_100ns,
    `formal_process_accounting:${reference}`,
  );
  return { compute_ms: record.total_cpu_100ns / 10_000 };
}

export async function validateFormalStorageLedger(options) {
  const { reference, required, invocationId, clocks, expectedScopeRef } =
    options;
  if (!required) {
    assert(reference === null, "formal_storage_ledger_forbidden");
    return null;
  }
  assert(
    reference === `formal-evidence/${invocationId}/storage-ledger.json`,
    "formal_storage_ledger_ref",
  );
  const ledger = parseJson(
    await consumeMeasurement(options, "storage_ledger"),
    `formal_storage_ledger_json:${reference}`,
  );
  validateStorageLedgerShape(ledger, options, expectedScopeRef);
  return {
    storage_byte_hour: storageByteHours(ledger, options),
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
      completed <= clocks.completedNs,
    `formal_human_interval:${reference}:${index}`,
  );
  return { completed, duration: completed - started };
}

function validateStorageLedgerShape(ledger, options, expectedScopeRef) {
  const { reference, invocationId, clocks, runArtifactIndex } = options;
  assertExactKeys(
    ledger,
    [
      "clock_id",
      "completed_ns",
      "events",
      "invocation_id",
      "schema_version",
      "scope_ref",
      "source_kind",
      "started_ns",
    ],
    `formal_storage_ledger_fields:${reference}`,
  );
  assert(
    ledger.schema_version ===
      REAL_PROCESS_SCHEMAS.FORMAL_STORAGE_LEDGER_SCHEMA &&
      ledger.source_kind === "runner-exact-byte-duration-v1" &&
      ledger.invocation_id === invocationId &&
      ledger.clock_id === clocks.monotonic_clock_id &&
      ledger.started_ns === clocks.monotonic_started_ns &&
      ledger.completed_ns === clocks.monotonic_completed_ns &&
      ledger.scope_ref === expectedScopeRef &&
      runArtifactIndex.get(ledger.scope_ref)?.role === "package_tarball" &&
      Array.isArray(ledger.events) &&
      ledger.events.length === 1,
    `formal_storage_ledger:${reference}`,
  );
}

function storageByteHours(ledger, options) {
  const { reference, clocks, runArtifactIndex } = options;
  let previous = clocks.startedNs;
  let previousBytes = null;
  let byteNanoseconds = 0n;
  for (const [index, event] of ledger.events.entries()) {
    assertExactKeys(
      event,
      ["at_ns", "bytes"],
      `formal_storage_event_fields:${reference}:${index}`,
    );
    const at = decimalBigInt(
      event.at_ns,
      `formal_storage_event_time:${reference}:${index}`,
    );
    assert(
      at >= previous &&
        at < clocks.completedNs &&
        Number.isSafeInteger(event.bytes) &&
        event.bytes >= 0,
      `formal_storage_event:${reference}:${index}`,
    );
    if (index === 0)
      assert(
        at === clocks.startedNs &&
          event.bytes === runArtifactIndex.get(ledger.scope_ref).bytes,
        `formal_storage_start:${reference}`,
      );
    else byteNanoseconds += BigInt(previousBytes) * (at - previous);
    previous = at;
    previousBytes = event.bytes;
  }
  byteNanoseconds += BigInt(previousBytes) * (clocks.completedNs - previous);
  return Number(byteNanoseconds) / 3_600_000_000_000;
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
