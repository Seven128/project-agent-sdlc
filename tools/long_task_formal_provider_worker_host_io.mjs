import {
  FORMAL_PROVIDER_LIMITS,
  FORMAL_PROVIDER_WORKER_ERROR_CODES,
} from "./long_task_formal_provider_protocol.mjs";
import { settleWithin } from "./long_task_formal_provider_capture_io.mjs";
import { parseStrictJson } from "./long_task_formal_total_cost_json.mjs";

const workerErrorCodes = new Set(
  Object.values(FORMAL_PROVIDER_WORKER_ERROR_CODES),
);

export function formalProviderChildOutcome(child) {
  return new Promise((resolve) => {
    let settled = false;
    let spawned = false;
    let spawnError = null;
    const complete = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    child.once("spawn", () => {
      spawned = true;
    });
    child.on("error", (error) => {
      spawnError ??= error;
      if (!spawned) complete({ status: null, signal: null, spawnError });
    });
    child.once("close", (status, signal) =>
      complete({ status, signal, spawnError }),
    );
  });
}

export function captureBoundedProviderWorkerStream(
  stream,
  maximumBytes,
  onOverflow,
) {
  const chunks = [];
  let total = 0;
  let overflowed = false;
  stream.on("data", (chunk) => {
    const bytes = Buffer.from(chunk);
    const remaining = maximumBytes - total;
    if (remaining > 0) {
      const retained = bytes.subarray(0, remaining);
      chunks.push(retained);
      total += retained.length;
    }
    if (!overflowed && bytes.length > remaining) {
      overflowed = true;
      onOverflow();
    }
  });
  return Object.freeze({ bytes: () => Buffer.concat(chunks, total) });
}

export function formalProviderWorkerErrorCode(bytes) {
  try {
    const record = parseStrictJson(bytes, "formal_provider_worker_error_json");
    if (
      record &&
      Object.keys(record).sort().join(",") === "error_code,schema_version" &&
      record.schema_version === "formal-provider-worker-error-v1" &&
      workerErrorCodes.has(record.error_code)
    )
      return record.error_code;
  } catch {}
  return "formal_provider_worker_failed";
}

export async function finishFormalProviderWorkerAbort({
  active,
  invocationSettled,
}) {
  let forced = false;
  const initial = active();
  if (initial.closed) {
    const closed = await settleWithin(
      initial.closed,
      FORMAL_PROVIDER_LIMITS.provider_abort_grace_ms,
    );
    if (!closed.settled) {
      forced = true;
      killWorker(initial.child);
      awaitForcedClose(initial.closed);
    }
  }
  if (invocationSettled) {
    let invocation = await settleWithin(
      invocationSettled,
      FORMAL_PROVIDER_LIMITS.provider_abort_grace_ms,
    );
    if (!invocation.settled) {
      const late = active();
      if (!late.closed)
        throw new Error("formal_provider_worker_abort_timeout");
      forced = true;
      killWorker(late.child);
      awaitForcedClose(late.closed);
      invocation = await settleWithin(
        invocationSettled,
        FORMAL_PROVIDER_LIMITS.provider_abort_grace_ms,
      );
      if (!invocation.settled)
        throw new Error("formal_provider_worker_abort_timeout");
    }
  }
  const final = active();
  if (final.closed) {
    const closed = await settleWithin(
      final.closed,
      FORMAL_PROVIDER_LIMITS.provider_abort_grace_ms,
    );
    if (!closed.settled) {
      forced = true;
      killWorker(final.child);
      awaitForcedClose(final.closed);
    }
  }
  return forced;
}

async function awaitForcedClose(closed) {
  const outcome = await settleWithin(
    closed,
    FORMAL_PROVIDER_LIMITS.provider_abort_grace_ms,
  );
  if (!outcome.settled)
    throw new Error("formal_provider_worker_abort_timeout");
}

function killWorker(child) {
  try {
    child?.kill("SIGKILL");
  } catch {}
}
