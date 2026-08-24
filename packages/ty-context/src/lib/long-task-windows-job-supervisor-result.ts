import { parseStrictYaml } from "./strict-codec.js";

const RESULT_FIELDS = [
  "AccountingSourceKind",
  "ActiveProcessesAtResult",
  "CompletedUnixMs",
  "DescendantsCleaned",
  "Error",
  "ExitCode",
  "KernelCpu100Ns",
  "MonotonicClockId",
  "MonotonicCompletedNs",
  "MonotonicStartedNs",
  "OutputOverflow",
  "ProcessId",
  "RequestId",
  "StartedUnixMs",
  "StderrBytes",
  "StdoutBytes",
  "TimedOut",
  "TotalCpu100Ns",
  "TotalProcesses",
  "TotalTerminatedProcesses",
  "UserCpu100Ns",
  "WallClockId",
] as const;

const FAILURE_FIELDS = ["Error", "RequestId"] as const;

interface ValidatedWindowsJobResult {
  AccountingSourceKind: "windows-job-object-accounting-v1";
  ActiveProcessesAtResult: number;
  CompletedUnixMs: number;
  DescendantsCleaned: boolean;
  Error: null;
  ExitCode: number;
  KernelCpu100Ns: number;
  MonotonicClockId: "windows-stopwatch-qpc-v1";
  MonotonicCompletedNs: string;
  MonotonicStartedNs: string;
  OutputOverflow: boolean;
  ProcessId: number;
  RequestId: string;
  StartedUnixMs: number;
  StderrBytes: number;
  StdoutBytes: number;
  TimedOut: boolean;
  TotalCpu100Ns: number;
  TotalProcesses: number;
  TotalTerminatedProcesses: number;
  UserCpu100Ns: number;
  WallClockId: "unix-epoch-ms-v1";
}

export interface WindowsJobSupervisorResult {
  process_id: number;
  exit_code: number;
  timed_out: boolean;
  output_overflow: boolean;
  stdout_bytes: number;
  stderr_bytes: number;
  started_at: string;
  completed_at: string;
}

export function parseWindowsJobSupervisorResult(
  line: string,
  requestId: string,
): WindowsJobSupervisorResult {
  const response = parseResponse(line);
  if (sameFields(response, FAILURE_FIELDS)) handleFailure(response, requestId);
  assertFields(response, RESULT_FIELDS);
  assertResultShape(response);
  if (response.RequestId !== requestId) invalidResult("response_identity");
  if (
    response.ActiveProcessesAtResult !== 0 ||
    response.DescendantsCleaned !== true
  )
    throw new Error("process_observer_descendant_process_alive");
  return {
    process_id: response.ProcessId,
    exit_code: response.ExitCode,
    timed_out: response.TimedOut,
    output_overflow: response.OutputOverflow,
    stdout_bytes: response.StdoutBytes,
    stderr_bytes: response.StderrBytes,
    started_at: new Date(response.StartedUnixMs).toISOString(),
    completed_at: new Date(response.CompletedUnixMs).toISOString(),
  };
}

function parseResponse(line: string): Record<string, unknown> {
  try {
    if (!line.startsWith("{") || !line.endsWith("}")) throw new Error();
    return record(parseStrictYaml(line));
  } catch {
    invalidResult("response_json");
  }
}

function handleFailure(
  response: Record<string, unknown>,
  requestId: string,
): never {
  if (response.RequestId !== requestId) invalidResult("response_identity");
  if (!validDiagnostic(response.Error)) invalidResult("failure_shape");
  if (response.Error.includes("descendants_alive"))
    throw new Error("process_observer_descendant_process_alive");
  throw new Error(`process_observer_windows_job_unavailable:${response.Error}`);
}

function assertResultShape(
  response: Record<string, unknown>,
): asserts response is Record<string, unknown> & ValidatedWindowsJobResult {
  assertCoreResult(response);
  assertClockResult(response);
  assertAccountingResult(response);
}

function assertCoreResult(response: Record<string, unknown>): void {
  if (
    response.Error !== null ||
    !positiveSafeInteger(response.ProcessId) ||
    !signedInt32(response.ExitCode) ||
    typeof response.TimedOut !== "boolean" ||
    typeof response.OutputOverflow !== "boolean" ||
    typeof response.DescendantsCleaned !== "boolean" ||
    !nonnegativeSafeInteger(response.StdoutBytes) ||
    !nonnegativeSafeInteger(response.StderrBytes) ||
    !Number.isSafeInteger(response.StdoutBytes + response.StderrBytes)
  )
    invalidResult("result_shape");
}

function assertClockResult(response: Record<string, unknown>): void {
  if (
    !validUnixMilliseconds(response.StartedUnixMs) ||
    !validUnixMilliseconds(response.CompletedUnixMs) ||
    response.CompletedUnixMs < response.StartedUnixMs ||
    !decimalString(response.MonotonicStartedNs) ||
    !decimalString(response.MonotonicCompletedNs) ||
    BigInt(response.MonotonicCompletedNs) <
      BigInt(response.MonotonicStartedNs) ||
    response.MonotonicClockId !== "windows-stopwatch-qpc-v1" ||
    response.WallClockId !== "unix-epoch-ms-v1"
  )
    invalidResult("result_shape");
}

function assertAccountingResult(response: Record<string, unknown>): void {
  if (
    !nonnegativeSafeInteger(response.UserCpu100Ns) ||
    !nonnegativeSafeInteger(response.KernelCpu100Ns) ||
    !nonnegativeSafeInteger(response.TotalCpu100Ns) ||
    response.TotalCpu100Ns !==
      response.UserCpu100Ns + response.KernelCpu100Ns ||
    !positiveSafeInteger(response.TotalProcesses) ||
    !nonnegativeSafeInteger(response.ActiveProcessesAtResult) ||
    !nonnegativeSafeInteger(response.TotalTerminatedProcesses) ||
    response.TotalTerminatedProcesses > response.TotalProcesses ||
    response.AccountingSourceKind !== "windows-job-object-accounting-v1"
  )
    invalidResult("result_shape");
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalidResult("response_shape");
  return value as Record<string, unknown>;
}

function sameFields(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((field, index) => field === sortedExpected[index])
  );
}

function assertFields(
  value: Record<string, unknown>,
  expected: readonly string[],
): void {
  if (!sameFields(value, expected)) invalidResult("response_fields");
}

function positiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function nonnegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function signedInt32(value: unknown): value is number {
  return (
    Number.isSafeInteger(value) &&
    Number(value) >= -2_147_483_648 &&
    Number(value) <= 2_147_483_647
  );
}

function validUnixMilliseconds(value: unknown): value is number {
  return nonnegativeSafeInteger(value) && value <= 8_640_000_000_000_000;
}

function decimalString(value: unknown): value is string {
  return typeof value === "string" && /^[0-9]+$/u.test(value);
}

function validDiagnostic(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !value.includes("\u0000") &&
    value.length > 0 &&
    value.length <= 16_384 &&
    !value.includes("\r") &&
    !value.includes("\n")
  );
}

function invalidResult(detail: string): never {
  throw new Error(`process_observer_windows_job_result_invalid:${detail}`);
}
