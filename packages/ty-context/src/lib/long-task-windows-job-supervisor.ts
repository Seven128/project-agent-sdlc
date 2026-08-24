import { randomUUID } from "node:crypto";
import { lstat, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { SpawnedCommandExecution } from "./long-task-command-process.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { runOneWindowsJobHelperRequest } from "./long-task-windows-job-supervisor-helper.js";
import {
  assertFreshWindowsJobStreamTarget,
  createWindowsJobSupervisorRequest,
  parseWindowsJobSupervisorResult,
  readWindowsJobStream,
  WINDOWS_JOB_SUPERVISOR_ASSET_RELATIVE_FILES,
} from "./long-task-windows-job-supervisor-protocol.js";

const HELPER_CLOSE_GRACE_MS = 10_000;

export async function spawnWindowsJobCommandOnce(
  executable: string,
  argv: string[],
  cwd: string,
  timeoutMs: number,
  environment: NodeJS.ProcessEnv,
  combinedOutputLimitBytes: number,
): Promise<SpawnedCommandExecution> {
  if (process.platform !== "win32")
    throw new Error("process_observer_windows_job_unavailable:platform");
  const helper = await packageSupervisorHelper();
  const powershell = await windowsPowerShellExecutable();
  const createdTemporaryRoot = await mkdtemp(
    path.join(tmpdir(), "ty-context-windows-job-"),
  );
  const temporaryRoot = await assertPrivateTemporaryRoot(createdTemporaryRoot);
  let execution: SpawnedCommandExecution | undefined;
  let failure: unknown;
  try {
    const stdoutPath = path.join(temporaryRoot, "stdout.bin");
    const stderrPath = path.join(temporaryRoot, "stderr.bin");
    await Promise.all([
      assertFreshWindowsJobStreamTarget(stdoutPath),
      assertFreshWindowsJobStreamTarget(stderrPath),
    ]);
    const request = createWindowsJobSupervisorRequest({
      requestId: randomUUID(),
      executable,
      argv,
      cwd,
      stdoutPath,
      stderrPath,
      timeoutMs,
      combinedOutputLimitBytes,
      environment,
    });
    const response = await runOneWindowsJobHelperRequest(
      powershell,
      helper,
      JSON.stringify(request),
      timeoutMs + HELPER_CLOSE_GRACE_MS,
    );
    const result = parseWindowsJobSupervisorResult(
      response,
      request.request_id,
    );
    const [stdout, stderr] = await Promise.all([
      readWindowsJobStream(
        stdoutPath,
        result.stdout_bytes,
        combinedOutputLimitBytes,
      ),
      readWindowsJobStream(
        stderrPath,
        result.stderr_bytes,
        combinedOutputLimitBytes,
      ),
    ]);
    if (stdout.length + stderr.length > combinedOutputLimitBytes)
      throw new Error(
        "process_observer_windows_job_result_invalid:stream_limit",
      );
    if (result.timed_out) throw new Error("command_timeout");
    if (result.output_overflow)
      throw new Error("command_output_limit_exceeded");
    execution = {
      exit_code: result.exit_code,
      stdout,
      stderr,
      pid: result.process_id,
      started_at: result.started_at,
      completed_at: result.completed_at,
    };
  } catch (error) {
    failure = error;
  }
  try {
    await removePrivateTemporaryRoot(temporaryRoot);
  } catch (error) {
    failure ??= new Error(
      `process_observer_windows_job_unavailable:cleanup:${message(error)}`,
    );
  }
  if (failure) throw failure;
  return execution!;
}

async function packageSupervisorHelper(): Promise<string> {
  const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
  let helper = "";
  try {
    for (const relative of WINDOWS_JOB_SUPERVISOR_ASSET_RELATIVE_FILES) {
      const file = await assertProtectedRepositoryFile(
        packageRoot,
        path.join(packageRoot, ...relative.split("/")),
        `windows_job_supervisor_asset:${relative}`,
      );
      if (relative.endsWith("/windows_job_process_supervisor.ps1"))
        helper = file;
    }
  } catch (error) {
    throw new Error(
      `process_observer_windows_job_unavailable:assets:${message(error)}`,
    );
  }
  return helper;
}

async function windowsPowerShellExecutable(): Promise<string> {
  const windowsRoot = process.env.SystemRoot ?? process.env.WINDIR;
  if (!windowsRoot || !path.isAbsolute(windowsRoot))
    throw new Error("process_observer_windows_job_unavailable:powershell");
  const executable = path.join(
    windowsRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
  try {
    const status = await lstat(executable);
    if (!status.isFile() || status.isSymbolicLink()) throw new Error();
    return await realpath(executable);
  } catch {
    throw new Error("process_observer_windows_job_unavailable:powershell");
  }
}

async function assertPrivateTemporaryRoot(created: string): Promise<string> {
  const status = await lstat(created);
  if (!status.isDirectory() || status.isSymbolicLink())
    throw new Error(
      "process_observer_windows_job_unavailable:temporary_root_identity",
    );
  return realpath(created);
}

async function removePrivateTemporaryRoot(target: string): Promise<void> {
  const status = await lstat(target);
  if (
    !status.isDirectory() ||
    status.isSymbolicLink() ||
    normalizeHostPath(await realpath(target)) !==
      normalizeHostPath(path.resolve(target))
  )
    throw new Error("temporary_root_identity");
  await rm(target, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
}

function normalizeHostPath(value: string): string {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
