import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

export function validateFormalProcessRequest(value) {
  validateRequestIdentity(value);
  validateRequestPaths(value);
  validateRequestLimits(value);
  validateRequestEnvironment(value.environment);
}

export function normalizeFormalProcessResult(raw, requestId) {
  const result = {
    schema_version: "formal-process-supervisor-result-v1",
    request_id: raw.RequestId,
    process_id: raw.ProcessId,
    exit_code: raw.ExitCode,
    timed_out: raw.TimedOut,
    output_overflow: raw.OutputOverflow,
    descendants_cleaned: raw.DescendantsCleaned,
    stdout_bytes: raw.StdoutBytes,
    stderr_bytes: raw.StderrBytes,
    started_at: raw.StartedAt,
    completed_at: raw.CompletedAt,
    monotonic_started_ns: raw.MonotonicStartedNs,
    monotonic_completed_ns: raw.MonotonicCompletedNs,
    monotonic_clock_id: raw.MonotonicClockId,
    wall_clock_id: raw.WallClockId,
    user_cpu_100ns: raw.UserCpu100Ns,
    kernel_cpu_100ns: raw.KernelCpu100Ns,
    total_cpu_100ns: raw.TotalCpu100Ns,
    total_processes: raw.TotalProcesses,
    active_processes_at_result: raw.ActiveProcessesAtResult,
    total_terminated_processes: raw.TotalTerminatedProcesses,
    accounting_source_kind: raw.AccountingSourceKind,
  };
  validateResultProcess(result, requestId);
  validateResultClocks(result);
  validateResultAccounting(result);
  return result;
}

export async function assertFreshSupervisorTarget(target, label) {
  const parent = path.dirname(target);
  const parentActual = await realpath(parent);
  if (
    normalizeHostPath(parentActual) !== normalizeHostPath(path.resolve(parent))
  )
    throw new Error(`formal_process_supervisor_${label}_parent_reparse`);
  try {
    await lstat(target);
    throw new Error(`formal_process_supervisor_${label}_preexisting`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export async function readFreshSupervisorFile(target, maximumBytes) {
  const before = await lstat(target);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1 ||
    before.size > maximumBytes
  )
    throw new Error("formal_process_supervisor_stream_file");
  const actual = await realpath(target);
  if (normalizeHostPath(actual) !== normalizeHostPath(path.resolve(target)))
    throw new Error("formal_process_supervisor_stream_reparse");
  const handle = await open(target, "r");
  try {
    const opened = await handle.stat();
    assertSameFile(opened, before, "before");
    const bytes = await handle.readFile();
    const after = await handle.stat();
    assertSameFile(after, opened, "after");
    return bytes;
  } finally {
    await handle.close();
  }
}

export function formalProcessDigest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function validateRequestIdentity(value) {
  if (
    typeof value.requestId !== "string" ||
    value.requestId.length === 0 ||
    value.requestId.length > 256 ||
    !Array.isArray(value.argv) ||
    !value.argv.every(
      (item) => typeof item === "string" && !item.includes("\u0000"),
    )
  )
    throw new Error("formal_process_supervisor_request_invalid");
}

function validateRequestPaths(value) {
  const paths = [
    value.executable,
    value.cwd,
    value.stdoutPath,
    value.stderrPath,
  ];
  if (paths.some((item) => typeof item !== "string" || !path.isAbsolute(item)))
    throw new Error("formal_process_supervisor_request_invalid");
}

function validateRequestLimits(value) {
  if (
    !Number.isSafeInteger(value.timeoutMs) ||
    value.timeoutMs <= 0 ||
    !Number.isSafeInteger(value.combinedOutputLimitBytes) ||
    value.combinedOutputLimitBytes <= 0
  )
    throw new Error("formal_process_supervisor_request_invalid");
}

function validateRequestEnvironment(environment) {
  if (
    !environment ||
    typeof environment !== "object" ||
    Array.isArray(environment)
  )
    throw new Error("formal_process_supervisor_request_invalid");
  for (const [key, item] of Object.entries(environment))
    if (
      !isFormalProcessEnvironmentKey(key) ||
      typeof item !== "string" ||
      item.includes("\u0000") ||
      item.includes("\r") ||
      item.includes("\n")
    )
      throw new Error(`formal_process_supervisor_environment:${key}`);
}

export function isFormalProcessEnvironmentKey(value) {
  return typeof value === "string" && /^[A-Za-z_][A-Za-z0-9_()]*$/u.test(value);
}

function validateResultProcess(result, requestId) {
  if (
    result.request_id !== requestId ||
    !Number.isSafeInteger(result.process_id) ||
    result.process_id <= 0 ||
    !Number.isInteger(result.exit_code) ||
    typeof result.timed_out !== "boolean" ||
    typeof result.output_overflow !== "boolean" ||
    result.descendants_cleaned !== true ||
    result.active_processes_at_result !== 0
  )
    throw new Error("formal_process_supervisor_result_invalid");
}

function validateResultClocks(result) {
  if (
    !/^[0-9]+$/u.test(result.monotonic_started_ns ?? "") ||
    !/^[0-9]+$/u.test(result.monotonic_completed_ns ?? "") ||
    BigInt(result.monotonic_completed_ns) <
      BigInt(result.monotonic_started_ns) ||
    result.monotonic_clock_id !== "runner-monotonic-hrtime-v1" ||
    result.wall_clock_id !== "runner-wall-utc-v1"
  )
    throw new Error("formal_process_supervisor_result_invalid");
}

function validateResultAccounting(result) {
  if (
    result.accounting_source_kind !== "windows-job-object-accounting-v1" ||
    !Number.isSafeInteger(result.total_cpu_100ns) ||
    result.total_cpu_100ns < 0 ||
    result.total_cpu_100ns !==
      result.user_cpu_100ns + result.kernel_cpu_100ns ||
    !Number.isSafeInteger(result.total_processes) ||
    result.total_processes < 1
  )
    throw new Error("formal_process_supervisor_result_invalid");
}

function assertSameFile(actual, expected, phase) {
  if (
    !actual.isFile() ||
    actual.size !== expected.size ||
    actual.dev !== expected.dev ||
    actual.ino !== expected.ino
  )
    throw new Error(`formal_process_supervisor_stream_identity_${phase}`);
}

function normalizeHostPath(value) {
  return process.platform === "win32" ? value.toLowerCase() : value;
}
