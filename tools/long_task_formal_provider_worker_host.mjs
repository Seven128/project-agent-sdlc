import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFreshFormalFile } from "./long_task_formal_collection_io.mjs";
import {
  FORMAL_PROVIDER_LIMITS,
  FORMAL_PROVIDER_PROTOCOL_PATH,
  FORMAL_PROVIDER_RESPONSE_PATH,
  FORMAL_PROVIDER_WORKER_FILES,
  FORMAL_PROVIDER_WORKER_PATH,
  assertFormalProviderWorkerResult,
  createFormalProviderWorkerRequest,
  formalProviderWorkerEnvironment,
} from "./long_task_formal_provider_protocol.mjs";
import { settleWithin } from "./long_task_formal_provider_capture_io.mjs";
import { parseStrictJson } from "./long_task_formal_total_cost_json.mjs";
import { sha256 } from "./long_task_real_process_roi_scoring.mjs";
import {
  captureBoundedProviderWorkerStream,
  finishFormalProviderWorkerAbort,
  formalProviderChildOutcome,
  formalProviderWorkerErrorCode,
} from "./long_task_formal_provider_worker_host_io.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const sourcePaths = Object.freeze({
  worker: resolveSource(FORMAL_PROVIDER_WORKER_PATH),
  response: resolveSource(FORMAL_PROVIDER_RESPONSE_PATH),
  protocol: resolveSource(FORMAL_PROVIDER_PROTOCOL_PATH),
});

export class FormalProviderWorkerHost {
  #identity;
  #invocationId;
  #activeWorker = null;
  #activeWorkerClosed = null;
  #temporaryRoot = null;
  #cleanupPromise = null;
  #aborting = false;
  #invocationSettled = null;

  constructor({ identity, invocationId }) {
    this.#identity = identity;
    this.#invocationId = invocationId;
  }

  invoke(prompt, requestTimeoutMs) {
    if (this.#invocationSettled)
      throw new Error("formal_provider_worker_duplicate_invoke");
    let settleInvocation;
    this.#invocationSettled = new Promise((resolve) => {
      settleInvocation = resolve;
    });
    return this.#invoke(prompt, requestTimeoutMs).finally(settleInvocation);
  }

  async #invoke(prompt, requestTimeoutMs) {
    if (prompt.length === 0)
      throw new Error("formal_provider_prompt_empty");
    let primaryError = null;
    let result = null;
    try {
      this.#assertNotAborting();
      await this.#assertWorkerSources();
      this.#assertNotAborting();
      const workerEnvironment = formalProviderWorkerEnvironment();
      this.#temporaryRoot = await mkdtemp(
        path.join(os.tmpdir(), "ty-context-formal-provider-"),
      );
      this.#assertNotAborting();
      result = await this.#runWorker(prompt, requestTimeoutMs, workerEnvironment);
    } catch (error) {
      primaryError = error;
    } finally {
      if (!this.#activeWorker)
        try {
          await this.#cleanupTemporaryRoot();
        } catch (error) {
          primaryError = error;
        }
    }
    if (primaryError) throw primaryError;
    return result;
  }

  signalAbort() {
    this.#aborting = true;
    const child = this.#activeWorker;
    if (child && !child.killed)
      try {
        child.stdin.write("abort\n");
      } catch {}
  }

  terminateWorker() {
    try {
      this.#activeWorker?.kill("SIGTERM");
    } catch {}
  }

  async finishAbort() {
    const forced = await finishFormalProviderWorkerAbort({
      active: () => ({
        child: this.#activeWorker,
        closed: this.#activeWorkerClosed,
      }),
      invocationSettled: this.#invocationSettled,
    });
    this.#activeWorker = null;
    this.#activeWorkerClosed = null;
    await this.#cleanupTemporaryRoot();
    if (forced)
      throw new Error("formal_provider_worker_abort_timeout");
  }

  async #runWorker(prompt, requestTimeoutMs, workerEnvironment) {
    const paths = Object.fromEntries(
      Object.entries(FORMAL_PROVIDER_WORKER_FILES).map(([key, value]) => [
        key,
        path.join(this.#temporaryRoot, value),
      ]),
    );
    const requestRecord = createFormalProviderWorkerRequest({
      invocationId: this.#invocationId,
      model: this.#identity.model,
      promptBytes: prompt.length,
      promptSha256: sha256(prompt),
      requestTimeoutMs,
    });
    const requestBytes = Buffer.from(
      `${JSON.stringify(requestRecord, null, 2)}\n`,
    );
    if (requestBytes.length > FORMAL_PROVIDER_LIMITS.maximum_worker_request_bytes)
      throw new Error("formal_provider_worker_request_limit");
    const writes = await Promise.allSettled([
      writeFile(paths.prompt, prompt, { flag: "wx" }),
      writeFile(paths.request, requestBytes, { flag: "wx" }),
    ]);
    const failedWrite = writes.find((result) => result.status === "rejected");
    if (failedWrite) throw failedWrite.reason;
    this.#assertNotAborting();
    const child = spawn(
      process.execPath,
      [sourcePaths.worker, this.#temporaryRoot],
      {
        cwd: repositoryRoot,
        env: workerEnvironment,
        shell: false,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    this.#activeWorker = child;
    this.#activeWorkerClosed = formalProviderChildOutcome(child);
    child.stdin.on("error", () => {});
    if (this.#aborting) {
      this.signalAbort();
      this.terminateWorker();
    }
    let raceFailure = null;
    let resolveRaceFailure;
    const failureOutcome = new Promise((resolve) => {
      resolveRaceFailure = resolve;
    });
    const signalRaceFailure = (error) => {
      if (raceFailure) return;
      raceFailure = error;
      resolveRaceFailure({ kind: "failure", error });
    };
    child.once("error", () =>
      signalRaceFailure(new Error("formal_provider_worker_spawn")),
    );
    const stdout = captureBoundedProviderWorkerStream(
      child.stdout,
      FORMAL_PROVIDER_LIMITS.maximum_worker_stdout_bytes,
      () => signalRaceFailure(new Error("formal_provider_worker_stdout_overflow")),
    );
    const stderr = captureBoundedProviderWorkerStream(
      child.stderr,
      FORMAL_PROVIDER_LIMITS.maximum_worker_stderr_bytes,
      () => signalRaceFailure(new Error("formal_provider_worker_stderr_overflow")),
    );
    let timeoutId;
    const timeoutOutcome = new Promise((resolve) => {
      timeoutId = setTimeout(
        () =>
          resolve({
            kind: "failure",
            error: new Error("formal_provider_request_timeout"),
          }),
        requestTimeoutMs,
      );
    });
    const outcome = await Promise.race([
      this.#activeWorkerClosed.then((value) => ({ kind: "close", value })),
      failureOutcome,
      timeoutOutcome,
    ]);
    clearTimeout(timeoutId);
    if (outcome.kind === "failure") throw outcome.error;
    this.#activeWorker = null;
    this.#activeWorkerClosed = null;
    if (this.#aborting)
      throw new Error("formal_provider_capture_aborted");
    const stdoutBytes = stdout.bytes();
    const stderrBytes = stderr.bytes();
    if (
      outcome.value.spawnError ||
      outcome.value.status !== 0 ||
      outcome.value.signal !== null
    )
      throw new Error(formalProviderWorkerErrorCode(stderrBytes));
    if (stdoutBytes.length !== 0 || stderrBytes.length !== 0)
      throw new Error("formal_provider_worker_unexpected_diagnostics");
    const [response, resultBytes] = await Promise.all([
      readFreshFormalFile(
        paths.response,
        FORMAL_PROVIDER_LIMITS.maximum_response_bytes,
      ),
      readFreshFormalFile(
        paths.result,
        FORMAL_PROVIDER_LIMITS.maximum_worker_result_bytes,
      ),
    ]);
    if (response.length === 0)
      throw new Error("formal_provider_worker_response_empty");
    const result = parseStrictJson(
      resultBytes,
      "formal_provider_worker_result_json",
    );
    assertFormalProviderWorkerResult(result, requestRecord);
    if (
      result.raw_response_bytes !== response.length ||
      result.raw_response_sha256 !== sha256(response)
    )
      throw new Error("formal_provider_worker_response_identity");
    return Object.freeze({ response, result });
  }

  async #assertWorkerSources() {
    const names = ["worker", "response", "protocol"];
    const bytes = await Promise.all(
      names.map((name) => readFreshFormalFile(sourcePaths[name], 1024 * 1024)),
    );
    if (
      names.some((name, index) => {
        const expected = this.#identity.implementation[name];
        return (
          bytes[index].length !== expected.bytes ||
          sha256(bytes[index]) !== expected.sha256
        );
      })
    )
      throw new Error("formal_provider_worker_source_identity");
  }

  #cleanupTemporaryRoot() {
    if (this.#cleanupPromise) return this.#cleanupPromise;
    if (!this.#temporaryRoot) return Promise.resolve();
    const target = this.#temporaryRoot;
    this.#cleanupPromise = (async () => {
      try {
        await rm(target, { recursive: true, force: false, maxRetries: 0 });
      } catch {
        throw new Error("formal_provider_temporary_cleanup");
      } finally {
        this.#temporaryRoot = null;
      }
    })();
    return this.#cleanupPromise;
  }

  #assertNotAborting() {
    if (this.#aborting)
      throw new Error("formal_provider_capture_aborted");
  }
}

function resolveSource(repositoryPath) {
  return path.resolve(repositoryRoot, ...repositoryPath.split("/"));
}
