import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";
import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_schema_policy.mjs";
import { readFreshFormalFile } from "./long_task_formal_collection_io.mjs";
import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";

export const FORMAL_PROVIDER_ADAPTER_ID = "openai-responses-loopback-v1";
export const FORMAL_PROVIDER_ADAPTER_PATH =
  "tools/long_task_formal_provider_capture.mjs";
const endpoint = "https://api.openai.com/v1/responses";

export function deriveFormalProviderAdapterIdentity({
  benchmarkImplementationIdentity,
  environment = process.env,
}) {
  const implementation = benchmarkImplementationIdentity.entries?.find(
    (entry) => entry.path === FORMAL_PROVIDER_ADAPTER_PATH,
  );
  assert(
    implementation && /^[a-f0-9]{64}$/u.test(implementation.sha256),
    "formal_provider_adapter_implementation",
  );
  const model = environment.TY_CONTEXT_FORMAL_OPENAI_MODEL ?? null;
  const projection = {
    schema_version: "formal-provider-adapter-identity-v1",
    adapter_id: FORMAL_PROVIDER_ADAPTER_ID,
    protocol: "one-shot-loopback-raw-prompt-v1",
    provider: "openai",
    endpoint,
    model,
    implementation: {
      path: implementation.path,
      bytes: implementation.bytes,
      sha256: implementation.sha256,
    },
    parser: "openai-responses-usage-v1",
    runtime: { node: process.version },
    support: {
      model_configured: typeof model === "string" && model.length > 0,
    },
    external_tcb: "openai-provider-service",
  };
  return Object.freeze({
    ...projection,
    identity_sha256: sha256(canonical(projection)),
  });
}

export class FormalProviderCaptureAdapter {
  #identity;
  #credential;

  constructor(identity) {
    assertProviderIdentity(identity);
    this.#identity = identity;
    this.#credential = process.env.OPENAI_API_KEY ?? null;
  }

  get identity() {
    return this.#identity;
  }

  assertAvailable() {
    if (
      this.#identity.support.model_configured !== true ||
      typeof this.#credential !== "string" ||
      this.#credential.length === 0
    )
      throw new Error("formal_provider_source_unavailable");
  }

  async openOneShotBridge({ invocationId }) {
    this.assertAvailable();
    assert(/^[a-f0-9]{64}$/u.test(invocationId), "formal_provider_invocation");
    const identity = this.#identity;
    const token = randomBytes(32).toString("hex");
    let requestCount = 0;
    let capture = null;
    let failure = null;
    const server = createServer(async (request, response) => {
      try {
        if (
          request.method !== "POST" ||
          request.url !== "/invoke" ||
          request.headers.authorization !== `Bearer ${token}` ||
          requestCount !== 0
        )
          throw new Error("formal_provider_bridge_request");
        requestCount += 1;
        const prompt = await readBoundedRequest(request, 1024 * 1024);
        const invoked = await this.#invoke(prompt);
        capture = { prompt, ...invoked };
        response.writeHead(200, {
          "content-type": "application/json",
          "content-length": capture.response.length,
        });
        response.end(capture.response);
      } catch (error) {
        failure = error;
        response.writeHead(502, { "content-type": "text/plain" });
        response.end("formal_provider_bridge_failed");
      }
    });
    await listenLoopback(server);
    const address = server.address();
    const bridgeEndpoint = `http://127.0.0.1:${address.port}/invoke`;
    const bridgeSessionSha256 = sha256(
      canonical({
        invocation_id: invocationId,
        endpoint: bridgeEndpoint,
        token_sha256: digest(token),
      }),
    );
    return Object.freeze({
      argv: Object.freeze([
        "--provider-bridge",
        bridgeEndpoint,
        "--provider-bridge-token",
        token,
      ]),
      async closeAndPersist({ rawPromptPath, providerEventPath }) {
        await closeServer(server);
        if (failure) throw failure;
        if (requestCount !== 1 || !capture)
          throw new Error("formal_provider_bridge_exactly_one_request");
        const event = {
          schema_version:
            REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA,
          invocation_id: invocationId,
          adapter_id: FORMAL_PROVIDER_ADAPTER_ID,
          adapter_identity_sha256: identity.identity_sha256,
          bridge_session_sha256: bridgeSessionSha256,
          provider: "openai",
          model: capture.model,
          provider_request_or_session_id: capture.providerId,
          recorded_at: new Date(capture.recordedUnixMs).toISOString(),
          clock_id: "provider-unix-epoch-ms-v1:openai",
          raw_prompt_sha256: digest(capture.prompt),
          raw_response_sha256: digest(capture.response),
          usage: capture.usage,
        };
        const eventBytes = Buffer.from(`${JSON.stringify(event, null, 2)}\n`);
        await Promise.all([
          writeFile(rawPromptPath, capture.prompt, { flag: "wx" }),
          writeFile(providerEventPath, eventBytes, { flag: "wx" }),
        ]);
        const [promptReadback, eventReadback] = await Promise.all([
          readFreshFormalFile(rawPromptPath, 1024 * 1024),
          readFreshFormalFile(providerEventPath, 64 * 1024),
        ]);
        if (
          digest(promptReadback) !== digest(capture.prompt) ||
          digest(eventReadback) !== digest(eventBytes)
        )
          throw new Error("formal_provider_artifact_readback");
        return Object.freeze({
          raw_prompt_sha256: digest(promptReadback),
          provider_event_sha256: digest(eventReadback),
          provider_request_or_session_id: capture.providerId,
        });
      },
      async abort() {
        await closeServer(server);
      },
    });
  }

  async #invoke(prompt) {
    if (prompt.length === 0)
      throw new Error("formal_provider_prompt_empty");
    let promptText;
    try {
      promptText = new TextDecoder("utf-8", { fatal: true }).decode(prompt);
    } catch (error) {
      throw new Error("formal_provider_prompt_utf8", { cause: error });
    }
    if (!Buffer.from(promptText, "utf8").equals(prompt))
      throw new Error("formal_provider_prompt_roundtrip");
    const body = Buffer.from(
      JSON.stringify({
        model: this.#identity.model,
        input: promptText,
      }),
    );
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.#credential}`,
        "content-type": "application/json",
      },
      body,
    });
    const responseBytes = Buffer.from(await response.arrayBuffer());
    if (!response.ok)
      throw new Error(`formal_provider_http_status:${response.status}`);
    let value;
    try {
      value = JSON.parse(responseBytes.toString("utf8"));
    } catch (error) {
      throw new Error("formal_provider_response_json", { cause: error });
    }
    const cached = value.usage?.input_tokens_details?.cached_tokens;
    if (
      typeof value.id !== "string" ||
      value.id.length === 0 ||
      value.model !== this.#identity.model ||
      !positiveInteger(value.usage?.input_tokens) ||
      !positiveInteger(value.usage?.output_tokens) ||
      !nonnegativeInteger(cached)
    )
      throw new Error("formal_provider_response_identity_usage");
    return {
      response: responseBytes,
      providerId: value.id,
      model: value.model,
      recordedUnixMs: Date.now(),
      usage: {
        input_tokens: value.usage.input_tokens,
        output_tokens: value.usage.output_tokens,
        cached_input_tokens: cached,
      },
    };
  }
}

function assertProviderIdentity(identity) {
  assert(
    identity?.adapter_id === FORMAL_PROVIDER_ADAPTER_ID &&
      identity.provider === "openai" &&
      identity.endpoint === endpoint &&
      /^[a-f0-9]{64}$/u.test(identity.identity_sha256 ?? ""),
    "formal_provider_adapter_identity",
  );
}

async function readBoundedRequest(request, maximum) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maximum) throw new Error("formal_provider_prompt_limit");
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function listenLoopback(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    if (!server.listening) return resolve();
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function nonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
