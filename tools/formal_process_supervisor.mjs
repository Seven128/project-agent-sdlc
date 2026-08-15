import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import {
  assertFreshSupervisorTarget,
  formalProcessDigest,
  normalizeFormalProcessResult,
  readFreshSupervisorFile,
  validateFormalProcessRequest,
} from "./formal_process_supervisor_protocol.mjs";

const helperPath = fileURLToPath(
  new URL("./windows_job_process_supervisor.ps1", import.meta.url),
);
const helperDiagnosticLimit = 1024 * 1024;

export class FormalProcessSupervisor {
  #child;
  #lines;
  #pending = null;
  #helperStderr = [];
  #helperStderrBytes = 0;
  #closed;
  #exited = null;

  constructor({ powershell = "pwsh.exe" } = {}) {
    if (process.platform !== "win32")
      throw new Error("formal_process_supervisor_platform_unsupported");
    this.#child = spawn(
      powershell,
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-File", helperPath],
      {
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    this.#lines = createInterface({
      input: this.#child.stdout,
      crlfDelay: Infinity,
    });
    this.#lines.on("line", (line) => this.#acceptLine(line));
    this.#child.stderr.on("data", (chunk) => this.#captureHelperStderr(chunk));
    this.#closed = new Promise((resolve) => {
      this.#child.once("close", (status, signal) => {
        this.#exited = { status, signal };
        if (this.#pending) {
          const pending = this.#pending;
          this.#pending = null;
          pending.reject(
            new Error(
              `formal_process_supervisor_helper_closed:${status}:${signal}:${this.#diagnostic()}`,
            ),
          );
        }
        resolve({ status, signal });
      });
    });
    this.#child.once("error", (error) => {
      if (!this.#pending) return;
      const pending = this.#pending;
      this.#pending = null;
      pending.reject(
        new Error(`formal_process_supervisor_helper_error:${message(error)}`),
      );
    });
  }

  async run({
    requestId,
    executable,
    argv,
    cwd,
    stdoutPath,
    stderrPath,
    timeoutMs,
    combinedOutputLimitBytes,
    environment,
  }) {
    if (this.#pending)
      throw new Error("formal_process_supervisor_concurrent_request");
    if (this.#exited)
      throw new Error("formal_process_supervisor_helper_unavailable");
    validateFormalProcessRequest({
      requestId,
      executable,
      argv,
      cwd,
      stdoutPath,
      stderrPath,
      timeoutMs,
      combinedOutputLimitBytes,
      environment,
    });
    await Promise.all([
      assertFreshSupervisorTarget(stdoutPath, "stdout"),
      assertFreshSupervisorTarget(stderrPath, "stderr"),
    ]);
    const response = new Promise((resolve, reject) => {
      this.#pending = { requestId, resolve, reject };
    });
    const request = {
      schema_version: "formal-process-supervisor-request-v1",
      request_id: requestId,
      executable,
      argv,
      cwd,
      stdout_path: stdoutPath,
      stderr_path: stderrPath,
      timeout_ms: timeoutMs,
      combined_output_limit_bytes: combinedOutputLimitBytes,
      environment,
    };
    this.#child.stdin.write(`${JSON.stringify(request)}\n`, "utf8", (error) => {
      if (!error || !this.#pending) return;
      const pending = this.#pending;
      this.#pending = null;
      pending.reject(
        new Error(`formal_process_supervisor_request_write:${message(error)}`),
      );
    });
    const raw = await response;
    if (raw.Error)
      throw new Error(`formal_process_supervisor_helper:${raw.Error}`);
    const result = normalizeFormalProcessResult(raw, requestId);
    const [stdout, stderr] = await Promise.all([
      readFreshSupervisorFile(stdoutPath, combinedOutputLimitBytes),
      readFreshSupervisorFile(stderrPath, combinedOutputLimitBytes),
    ]);
    if (
      stdout.length !== result.stdout_bytes ||
      stderr.length !== result.stderr_bytes ||
      stdout.length + stderr.length > combinedOutputLimitBytes
    )
      throw new Error("formal_process_supervisor_stream_identity");
    return {
      ...result,
      stdout_sha256: formalProcessDigest(stdout),
      stderr_sha256: formalProcessDigest(stderr),
    };
  }

  async close() {
    if (this.#pending)
      throw new Error("formal_process_supervisor_close_while_running");
    if (!this.#exited) this.#child.stdin.end();
    const closed = await this.#closed;
    if (closed.status !== 0)
      throw new Error(
        `formal_process_supervisor_helper_exit:${closed.status}:${closed.signal}:${this.#diagnostic()}`,
      );
  }

  #acceptLine(line) {
    if (!this.#pending) {
      this.#child.kill();
      return;
    }
    if (Buffer.byteLength(line, "utf8") > 64 * 1024) {
      const pending = this.#pending;
      this.#pending = null;
      this.#child.kill();
      pending.reject(new Error("formal_process_supervisor_response_limit"));
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      const pending = this.#pending;
      this.#pending = null;
      this.#child.kill();
      pending.reject(new Error("formal_process_supervisor_response_json"));
      return;
    }
    const pending = this.#pending;
    this.#pending = null;
    if (parsed.RequestId !== pending.requestId)
      pending.reject(new Error("formal_process_supervisor_response_identity"));
    else pending.resolve(parsed);
  }

  #captureHelperStderr(chunk) {
    const bytes = Buffer.from(chunk);
    const remaining = helperDiagnosticLimit - this.#helperStderrBytes;
    if (remaining <= 0) return;
    const retained = bytes.subarray(0, remaining);
    this.#helperStderr.push(retained);
    this.#helperStderrBytes += retained.length;
  }

  #diagnostic() {
    return Buffer.concat(this.#helperStderr).toString("utf8").trim();
  }
}

export async function superviseFormalProcess(options) {
  const supervisor = new FormalProcessSupervisor(options.supervisorOptions);
  let primary = null;
  try {
    return await supervisor.run(options);
  } catch (error) {
    primary = error;
    throw error;
  } finally {
    try {
      await supervisor.close();
    } catch (error) {
      if (primary) primary.cause ??= error;
      else throw error;
    }
  }
}

function message(error) {
  return error instanceof Error ? error.message : String(error);
}
