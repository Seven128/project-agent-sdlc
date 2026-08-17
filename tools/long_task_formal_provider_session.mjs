import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { performance } from "node:perf_hooks";
import { finished } from "node:stream/promises";
import {
  FORMAL_PROVIDER_LIMITS,
} from "./long_task_formal_provider_protocol.mjs";
import {
  closeProviderServer,
  listenProviderLoopback,
  persistProviderCaptureArtifacts,
  readBoundedProviderRequest,
} from "./long_task_formal_provider_capture_io.mjs";
import { FormalProviderWorkerHost } from "./long_task_formal_provider_worker_host.mjs";
import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_schema_policy.mjs";
import {
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";

export async function openFormalProviderCaptureSession(options) {
  const session = new FormalProviderCaptureSession(options);
  await session.listen();
  return session.publicBridge();
}

class FormalProviderCaptureSession {
  #identity;
  #invocationId;
  #scenarioDeadline;
  #token;
  #server;
  #workerHost;
  #sockets = new Set();
  #requestCount = 0;
  #capture = null;
  #failure = null;
  #activeBridgeRequest = null;
  #activeBridgeResponse = null;
  #abortPromise = null;
  #aborted = false;
  #closed = false;
  #bridgeEndpoint = null;
  #bridgeSessionSha256 = null;

  constructor({ identity, invocationId, scenarioTimeoutMs }) {
    this.#identity = identity;
    this.#invocationId = invocationId;
    this.#scenarioDeadline = performance.now() + scenarioTimeoutMs;
    this.#token = randomBytes(32).toString("hex");
    this.#workerHost = new FormalProviderWorkerHost({ identity, invocationId });
    this.#server = createServer((request, response) => {
      void this.#handleRequest(request, response);
    });
    this.#server.maxConnections = 1;
    this.#server.maxHeadersCount = 16;
    this.#server.requestTimeout = scenarioTimeoutMs;
    this.#server.headersTimeout = Math.min(scenarioTimeoutMs, 30_000);
    this.#server.keepAliveTimeout = 1_000;
    this.#server.on("connection", (socket) => {
      this.#sockets.add(socket);
      socket.once("close", () => this.#sockets.delete(socket));
    });
    this.#server.on("clientError", (_error, socket) => {
      this.#setFailure(new Error("formal_provider_bridge_client_error"));
      socket.destroy();
    });
  }

  async listen() {
    await listenProviderLoopback(this.#server);
    const address = this.#server.address();
    if (!address || typeof address === "string")
      throw new Error("formal_provider_bridge_address");
    this.#bridgeEndpoint = `http://127.0.0.1:${address.port}/invoke`;
    this.#bridgeSessionSha256 = sha256(
      canonical({
        invocation_id: this.#invocationId,
        endpoint: this.#bridgeEndpoint,
        token_sha256: sha256(this.#token),
      }),
    );
  }

  publicBridge() {
    return Object.freeze({
      argv: Object.freeze([
        "--provider-bridge",
        this.#bridgeEndpoint,
        "--provider-bridge-token",
        this.#token,
      ]),
      closeAndPersist: (paths) => this.#closeAndPersist(paths),
      abort: () => this.#abort(),
    });
  }

  async #handleRequest(request, response) {
    let responseCompleted = false;
    const disconnect = () => {
      if (responseCompleted || this.#closed || this.#aborted) return;
      const error = new Error("formal_provider_collector_disconnected");
      this.#setFailure(error);
      void this.#abortInternal(error).catch((abortError) => {
        this.#setFailure(abortError);
      });
    };
    request.once("aborted", disconnect);
    response.once("finish", () => {
      responseCompleted = true;
    });
    response.once("close", disconnect);
    try {
      if (
        request.method !== "POST" ||
        request.url !== "/invoke" ||
        request.headers.authorization !== `Bearer ${this.#token}` ||
        this.#requestCount !== 0 ||
        this.#aborted
      )
        throw new Error("formal_provider_bridge_request");
      this.#requestCount += 1;
      this.#activeBridgeRequest = request;
      this.#activeBridgeResponse = response;
      const remaining = Math.floor(this.#scenarioDeadline - performance.now());
      if (remaining <= 0)
        throw new Error("formal_provider_scenario_deadline");
      request.setTimeout(remaining, () => request.destroy());
      const prompt = await readBoundedProviderRequest(request);
      const requestTimeoutMs = Math.min(
        FORMAL_PROVIDER_LIMITS.provider_request_timeout_ms,
        Math.floor(this.#scenarioDeadline - performance.now()),
      );
      if (requestTimeoutMs <= 0)
        throw new Error("formal_provider_scenario_deadline");
      let invoked;
      try {
        invoked = await this.#workerHost.invoke(prompt, requestTimeoutMs);
      } catch (error) {
        this.#setFailure(error);
        await this.#abortInternal(error);
        throw error;
      }
      if (this.#aborted)
        throw new Error("formal_provider_capture_aborted");
      this.#capture = Object.freeze({ prompt, ...invoked });
      response.writeHead(200, {
        "content-type": "application/json",
        "content-length": this.#capture.response.length,
        connection: "close",
      });
      response.end(this.#capture.response);
      await finished(response);
      responseCompleted = true;
    } catch (error) {
      this.#setFailure(error);
      if (!response.destroyed && !response.headersSent) {
        response.writeHead(502, {
          "content-type": "text/plain",
          connection: "close",
        });
        response.end("formal_provider_bridge_failed");
      } else if (!response.destroyed) response.destroy();
    } finally {
      request.off("aborted", disconnect);
      response.off("close", disconnect);
      if (this.#activeBridgeRequest === request)
        this.#activeBridgeRequest = null;
      if (this.#activeBridgeResponse === response)
        this.#activeBridgeResponse = null;
    }
  }

  async #closeAndPersist({ rawPromptPath, providerEventPath }) {
    if (this.#closed) throw new Error("formal_provider_capture_closed");
    this.#closed = true;
    try {
      await closeProviderServer({
        server: this.#server,
        sockets: this.#sockets,
        destroyConnections: false,
      });
    } catch (error) {
      this.#setFailure(error);
      await this.#abortInternal(error);
      throw error;
    }
    if (this.#abortPromise) await this.#abortPromise;
    if (this.#failure) throw this.#failure;
    if (this.#requestCount !== 1 || !this.#capture)
      throw new Error("formal_provider_bridge_exactly_one_request");
    const { prompt, response, result } = this.#capture;
    const event = {
      schema_version:
        REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA,
      invocation_id: this.#invocationId,
      adapter_id: this.#identity.adapter_id,
      adapter_identity_sha256: this.#identity.identity_sha256,
      bridge_session_sha256: this.#bridgeSessionSha256,
      provider: "openai",
      model: result.model,
      provider_request_or_session_id:
        result.provider_request_or_session_id,
      recorded_at: new Date(result.provider_created_unix_ms).toISOString(),
      clock_id: "provider-unix-epoch-ms-v1:openai",
      raw_prompt_sha256: sha256(prompt),
      raw_response_sha256: sha256(response),
      parser_id: result.parser_id,
      worker_identity_sha256: this.#identity.worker_identity_sha256,
      usage: result.usage,
    };
    const eventBytes = Buffer.from(`${JSON.stringify(event, null, 2)}\n`);
    const persisted = await persistProviderCaptureArtifacts({
      rawPromptPath,
      providerEventPath,
      prompt,
      eventBytes,
    });
    return Object.freeze({
      raw_prompt_sha256: sha256(persisted.promptReadback),
      provider_event_sha256: sha256(persisted.eventReadback),
      provider_request_or_session_id: result.provider_request_or_session_id,
    });
  }

  async #abort() {
    await this.#abortInternal(new Error("formal_provider_capture_aborted"));
  }

  #abortInternal(reason) {
    if (this.#abortPromise) return this.#abortPromise;
    this.#abortPromise = this.#performAbort(reason);
    return this.#abortPromise;
  }

  async #performAbort(reason) {
    this.#aborted = true;
    this.#setFailure(reason);
    this.#workerHost.signalAbort();
    this.#activeBridgeRequest?.destroy();
    this.#activeBridgeResponse?.destroy();
    this.#workerHost.terminateWorker();
    for (const socket of this.#sockets) socket.destroy();
    this.#server.closeAllConnections?.();
    let serverError = null;
    try {
      await closeProviderServer({
        server: this.#server,
        sockets: this.#sockets,
        destroyConnections: true,
      });
    } catch (error) {
      serverError = error;
    }
    await this.#workerHost.finishAbort();
    if (serverError) throw serverError;
  }

  #setFailure(error) {
    this.#failure ??= error instanceof Error ? error : new Error(String(error));
  }
}
