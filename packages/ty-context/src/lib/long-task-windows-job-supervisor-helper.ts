import { spawn } from "node:child_process";

const HELPER_RESPONSE_LIMIT = 64 * 1024;
const HELPER_DIAGNOSTIC_LIMIT = 1024 * 1024;
const HELPER_TERMINATION_GRACE_MS = 5_000;

export function runOneWindowsJobHelperRequest(
  powershell: string,
  helper: string,
  request: string,
  helperTimeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      powershell,
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        helper,
      ],
      {
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let settled = false;
    let pendingError: Error | null = null;
    let terminationTimer: NodeJS.Timeout | null = null;
    const timer = setTimeout(() => {
      stopHelper(
        new Error("process_observer_windows_job_unavailable:helper_timeout"),
      );
    }, helperTimeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > HELPER_RESPONSE_LIMIT) {
        stopHelper(
          new Error(
            "process_observer_windows_job_result_invalid:response_limit",
          ),
        );
        return;
      }
      stdout.push(Buffer.from(chunk));
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const remaining = HELPER_DIAGNOSTIC_LIMIT - stderrBytes;
      if (remaining <= 0) return;
      const retained = Buffer.from(chunk).subarray(0, remaining);
      stderr.push(retained);
      stderrBytes += retained.length;
    });
    child.stdin.once("error", (error) =>
      stopHelper(
        new Error(
          `process_observer_windows_job_unavailable:request_write:${message(error)}`,
        ),
      ),
    );
    child.once("error", (error) => {
      const helperError = new Error(
        `process_observer_windows_job_unavailable:helper_spawn:${message(error)}`,
      );
      if (child.pid) stopHelper(helperError);
      else finish(helperError);
    });
    child.once("close", (status, signal) => {
      if (pendingError) {
        finish(pendingError);
        return;
      }
      if (status !== 0) {
        const diagnostic = Buffer.concat(stderr)
          .toString("utf8")
          .trim()
          .slice(0, 16_384)
          .replace(/[\r\n]+/gu, " ");
        finish(
          new Error(
            `process_observer_windows_job_unavailable:helper_exit:${status}:${signal}:${diagnostic}`,
          ),
        );
        return;
      }
      const response = Buffer.concat(stdout).toString("utf8");
      if (!/^[^\r\n]+(?:\r?\n)?$/u.test(response)) {
        finish(
          new Error(
            "process_observer_windows_job_result_invalid:response_lines",
          ),
        );
        return;
      }
      finish(undefined, response.replace(/\r?\n$/u, ""));
    });
    child.stdin.end(`${request}\n`, "utf8");

    function stopHelper(error: Error): void {
      if (settled) return;
      pendingError ??= error;
      child.stdin.destroy();
      if (!child.pid) {
        finish(pendingError);
        return;
      }
      child.kill("SIGKILL");
      terminationTimer ??= setTimeout(
        () => finish(pendingError!),
        HELPER_TERMINATION_GRACE_MS,
      );
    }

    function finish(error?: Error, response?: string): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (terminationTimer) clearTimeout(terminationTimer);
      if (error) reject(error);
      else resolve(response!);
    }
  });
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
