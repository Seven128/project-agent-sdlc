import { rm, writeFile } from "node:fs/promises";
import { FORMAL_PROVIDER_LIMITS } from "./long_task_formal_provider_protocol.mjs";
import { readFreshFormalFile } from "./long_task_formal_collection_io.mjs";
import { FORMAL_EVIDENCE_CAPACITY } from "./long_task_real_process_schema_policy.mjs";
import { sha256 } from "./long_task_real_process_roi_scoring.mjs";

export async function readBoundedProviderRequest(request) {
  const maximum = FORMAL_PROVIDER_LIMITS.maximum_prompt_bytes;
  const declared = request.headers["content-length"];
  if (declared !== undefined) {
    if (Array.isArray(declared) || !/^(?:0|[1-9][0-9]*)$/u.test(declared))
      throw new Error("formal_provider_prompt_content_length");
    const parsed = Number(declared);
    if (!Number.isSafeInteger(parsed) || parsed > maximum)
      throw new Error("formal_provider_prompt_limit");
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    const value = Buffer.from(chunk);
    bytes += value.length;
    if (bytes > maximum) {
      request.destroy();
      throw new Error("formal_provider_prompt_limit");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, bytes);
}

export function listenProviderLoopback(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

export async function closeProviderServer({
  server,
  sockets,
  destroyConnections,
}) {
  if (!server.listening) return;
  if (destroyConnections) {
    for (const socket of sockets) socket.destroy();
    server.closeAllConnections?.();
  } else server.closeIdleConnections?.();
  const closed = new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  const outcome = await settleWithin(
    closed,
    FORMAL_PROVIDER_LIMITS.provider_abort_grace_ms,
  );
  if (!outcome.settled) {
    server.closeAllConnections?.();
    const forced = await settleWithin(
      closed,
      FORMAL_PROVIDER_LIMITS.provider_abort_grace_ms,
    );
    if (!forced.settled)
      throw new Error("formal_provider_server_close_timeout");
    if (forced.error) throw forced.error;
    throw new Error("formal_provider_server_close_timeout");
  }
  if (outcome.error) throw outcome.error;
}

export async function persistProviderCaptureArtifacts({
  rawPromptPath,
  providerEventPath,
  prompt,
  eventBytes,
}) {
  const created = new Set();
  try {
    const writes = await Promise.allSettled([
      writeFile(rawPromptPath, prompt, { flag: "wx" }),
      writeFile(providerEventPath, eventBytes, { flag: "wx" }),
    ]);
    if (writes[0].status === "fulfilled") created.add(rawPromptPath);
    if (writes[1].status === "fulfilled") created.add(providerEventPath);
    const failed = writes.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
    const [promptReadback, eventReadback] = await Promise.all([
      readFreshFormalFile(
        rawPromptPath,
        FORMAL_PROVIDER_LIMITS.maximum_prompt_bytes,
      ),
      readFreshFormalFile(
        providerEventPath,
        FORMAL_EVIDENCE_CAPACITY.maximum_measurement_record_bytes,
      ),
    ]);
    if (
      sha256(promptReadback) !== sha256(prompt) ||
      sha256(eventReadback) !== sha256(eventBytes)
    )
      throw new Error("formal_provider_artifact_readback");
    return Object.freeze({ promptReadback, eventReadback });
  } catch (error) {
    const cleanup = await Promise.allSettled(
      [...created].map((target) => rm(target, { force: true })),
    );
    if (cleanup.some((result) => result.status === "rejected"))
      throw new Error("formal_provider_artifact_cleanup");
    throw error;
  }
}

export function settleWithin(promise, timeoutMs) {
  let timeoutId;
  return Promise.race([
    promise.then(
      (value) => ({ settled: true, value, error: null }),
      (error) => ({ settled: true, value: null, error }),
    ),
    new Promise((resolve) => {
      timeoutId = setTimeout(
        () => resolve({ settled: false, value: null, error: null }),
        timeoutMs,
      );
    }),
  ]).finally(() => clearTimeout(timeoutId));
}
