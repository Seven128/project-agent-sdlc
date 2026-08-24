import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";

export {
  parseWindowsJobSupervisorResult,
  type WindowsJobSupervisorResult,
} from "./long-task-windows-job-supervisor-result.js";

export const WINDOWS_JOB_SUPERVISOR_REQUEST_SCHEMA =
  "formal-process-supervisor-request-v1";

export const WINDOWS_JOB_SUPERVISOR_ASSET_RELATIVE_FILES = [
  "assets/runtime/windows-job-supervisor/formal_process_supervisor_native_types.cs",
  "assets/runtime/windows-job-supervisor/formal_process_supervisor_native_run.cs",
  "assets/runtime/windows-job-supervisor/formal_process_supervisor_native_helpers.cs",
  "assets/runtime/windows-job-supervisor/windows_job_process_supervisor.ps1",
] as const;

export interface WindowsJobSupervisorRequest {
  schema_version: typeof WINDOWS_JOB_SUPERVISOR_REQUEST_SCHEMA;
  request_id: string;
  executable: string;
  argv: string[];
  cwd: string;
  stdout_path: string;
  stderr_path: string;
  timeout_ms: number;
  combined_output_limit_bytes: number;
  environment: Record<string, string>;
}

export function createWindowsJobSupervisorRequest(input: {
  requestId: string;
  executable: string;
  argv: readonly string[];
  cwd: string;
  stdoutPath: string;
  stderrPath: string;
  timeoutMs: number;
  combinedOutputLimitBytes: number;
  environment: NodeJS.ProcessEnv;
}): WindowsJobSupervisorRequest {
  if (
    !validIdentity(input.requestId) ||
    !validAbsolutePath(input.executable) ||
    !validAbsolutePath(input.cwd) ||
    !validAbsolutePath(input.stdoutPath) ||
    !validAbsolutePath(input.stderrPath) ||
    !Number.isSafeInteger(input.timeoutMs) ||
    input.timeoutMs <= 0 ||
    input.timeoutMs > 2_147_483_647 ||
    !Number.isSafeInteger(input.combinedOutputLimitBytes) ||
    input.combinedOutputLimitBytes <= 0 ||
    !input.argv.every(validString)
  )
    invalidResult("request_invalid");
  const environment: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.environment)) {
    if (value === undefined) continue;
    if (
      !validEnvironmentKey(key) ||
      !validString(value) ||
      value.includes("\r") ||
      value.includes("\n")
    )
      invalidResult(`environment_invalid:${key}`);
    environment[key] = value;
  }
  return {
    schema_version: WINDOWS_JOB_SUPERVISOR_REQUEST_SCHEMA,
    request_id: input.requestId,
    executable: input.executable,
    argv: [...input.argv],
    cwd: input.cwd,
    stdout_path: input.stdoutPath,
    stderr_path: input.stderrPath,
    timeout_ms: input.timeoutMs,
    combined_output_limit_bytes: input.combinedOutputLimitBytes,
    environment,
  };
}

export async function assertFreshWindowsJobStreamTarget(
  target: string,
): Promise<void> {
  try {
    await lstat(target);
    invalidResult("stream_preexisting");
  } catch (error) {
    if (nodeErrorCode(error) !== "ENOENT") throw error;
  }
}

export async function readWindowsJobStream(
  target: string,
  expectedBytes: number,
  maximumBytes: number,
): Promise<Buffer> {
  if (
    !nonnegativeSafeInteger(expectedBytes) ||
    !nonnegativeSafeInteger(maximumBytes) ||
    expectedBytes > maximumBytes
  )
    invalidResult("stream_bounds");
  const before = await lstat(target).catch(() =>
    invalidResult("stream_missing"),
  );
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1 ||
    before.size !== expectedBytes ||
    before.size > maximumBytes
  )
    invalidResult("stream_identity");
  if (
    normalizeHostPath(await realpath(target)) !==
    normalizeHostPath(path.resolve(target))
  )
    invalidResult("stream_reparse");
  const handle = await open(target, "r");
  try {
    const opened = await handle.stat();
    assertSameFile(opened, before);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    assertSameFile(after, opened);
    if (bytes.length !== expectedBytes) invalidResult("stream_identity");
    return bytes;
  } finally {
    await handle.close();
  }
}

function assertSameFile(
  actual: Awaited<ReturnType<typeof lstat>>,
  expected: Awaited<ReturnType<typeof lstat>>,
): void {
  if (
    !actual.isFile() ||
    actual.size !== expected.size ||
    actual.dev !== expected.dev ||
    actual.ino !== expected.ino
  )
    invalidResult("stream_identity");
}

function nonnegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function validIdentity(value: unknown): value is string {
  return validString(value) && value.length > 0 && value.length <= 256;
}

function validString(value: unknown): value is string {
  return typeof value === "string" && !value.includes("\u0000");
}

function validAbsolutePath(value: unknown): value is string {
  return validString(value) && path.isAbsolute(value);
}

function validEnvironmentKey(value: unknown): value is string {
  return (
    validString(value) &&
    value.length > 0 &&
    !value.includes("=") &&
    !value.includes("\r") &&
    !value.includes("\n")
  );
}

function normalizeHostPath(value: string): string {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function nodeErrorCode(error: unknown): string | null {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : null;
}

function invalidResult(detail: string): never {
  throw new Error(`process_observer_windows_job_result_invalid:${detail}`);
}
