import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

export const execFileAsync = promisify(execFile);
export const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const packagedHelperRoot = path.join(
  repositoryRoot,
  "packages",
  "ty-context",
  "assets",
  "runtime",
  "windows-job-supervisor",
);
export const helperNames = [
  "formal_process_supervisor_native_types.cs",
  "formal_process_supervisor_native_run.cs",
  "formal_process_supervisor_native_helpers.cs",
  "windows_job_process_supervisor.ps1",
];

export function validSupervisorResult(requestId) {
  return {
    AccountingSourceKind: "windows-job-object-accounting-v1",
    ActiveProcessesAtResult: 0,
    CompletedUnixMs: 2,
    DescendantsCleaned: true,
    Error: null,
    ExitCode: 0,
    KernelCpu100Ns: 2,
    MonotonicClockId: "windows-stopwatch-qpc-v1",
    MonotonicCompletedNs: "2",
    MonotonicStartedNs: "1",
    OutputOverflow: false,
    ProcessId: 42,
    RequestId: requestId,
    StartedUnixMs: 1,
    StderrBytes: 0,
    StdoutBytes: 0,
    TimedOut: false,
    TotalCpu100Ns: 3,
    TotalProcesses: 1,
    TotalTerminatedProcesses: 1,
    UserCpu100Ns: 1,
    WallClockId: "unix-epoch-ms-v1",
  };
}

export async function windowsPowerShellExecutable() {
  const windowsRoot = process.env.SystemRoot ?? process.env.WINDIR;
  assert.ok(windowsRoot);
  return realpath(
    path.join(
      windowsRoot,
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe",
    ),
  );
}

export async function optionalPwshExecutable() {
  try {
    const result = await execFileAsync("where.exe", ["pwsh.exe"], {
      encoding: "utf8",
      windowsHide: true,
    });
    const candidate = result.stdout.split(/\r?\n/u).find(Boolean);
    return candidate ? await realpath(candidate.trim()) : null;
  } catch {
    return null;
  }
}

export function runPowerShellHelper(executable, helper, requestLines) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        helper,
      ],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
    );
    const stdout = [];
    const stderr = [];
    let bytes = 0;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("PowerShell helper test timed out"));
    }, 30_000);
    child.stdout.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > 2 * 1024 * 1024) child.kill("SIGKILL");
      else stdout.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      const output = {
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8").trim(),
      };
      if (code === 0) resolve(output);
      else
        reject(
          new Error(
            `PowerShell helper exited ${code}/${signal}: ${output.stderr}`,
          ),
        );
    });
    child.stdin.end(`${requestLines.join("\n")}\n`, "utf8");
  });
}

export async function assertNoProcessCommandLineToken(token) {
  const powershell = await windowsPowerShellExecutable();
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    const result = await execFileAsync(
      powershell,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "$token=$env:TY_CONTEXT_ASSIGN_FAILURE_TOKEN; @((Get-CimInstance Win32_Process) | Where-Object { $_.CommandLine -like ('*' + $token + '*') }).Count",
      ],
      {
        encoding: "utf8",
        windowsHide: true,
        env: { ...process.env, TY_CONTEXT_ASSIGN_FAILURE_TOKEN: token },
      },
    );
    if (Number.parseInt(result.stdout.trim(), 10) === 0) return;
    await delay(50);
  }
  throw new Error("suspended product survived assign failure");
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
