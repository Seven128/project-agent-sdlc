import { createHash } from "node:crypto";
import { lstat, realpath, writeFile } from "node:fs/promises";
import { request as httpsRequest } from "node:https";
import path from "node:path";
import { readFreshFormalFile } from "./long_task_formal_collection_io.mjs";
import {
  FORMAL_PROVIDER_ENDPOINT,
  FORMAL_PROVIDER_LIMITS,
  FORMAL_PROVIDER_WORKER_ERROR_CODES,
  FORMAL_PROVIDER_WORKER_FILES,
  assertFormalProviderWorkerRequest,
  createFormalProviderWorkerResult,
  formalProviderWorkerErrorRecord,
} from "./long_task_formal_provider_protocol.mjs";
import {
  parseCanonicalProviderContentLength,
  parseFormalProviderResponse,
} from "./long_task_formal_provider_response.mjs";
import { parseStrictJson } from "./long_task_formal_total_cost_json.mjs";

let activeRequest = null;
let activeResponse = null;
let abortRequested = false;
let abortInputBytes = 0;
let abortInput = "";

const onAbortInput = (chunk) => {
  abortInputBytes += Buffer.byteLength(chunk);
  abortInput += String(chunk);
  if (abortInputBytes > 16 || abortInput.includes("abort")) abortProvider();
};

process.stdin.setEncoding("utf8");
process.stdin.on("data", onAbortInput);

try {
  await runWorker();
} catch (error) {
  const record = formalProviderWorkerErrorRecord(error?.message);
  process.stderr.write(`${JSON.stringify(record)}\n`);
  process.exitCode = 1;
} finally {
  process.stdin.off("data", onAbortInput);
  process.stdin.pause();
  activeResponse?.destroy();
  activeRequest?.destroy();
}

async function runWorker() {
  if (process.argv.length !== 3 || !path.isAbsolute(process.argv[2]))
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.ARGUMENTS);
  const root = path.resolve(process.argv[2]);
  await assertWorkerRoot(root);
  const promptPath = path.join(root, FORMAL_PROVIDER_WORKER_FILES.prompt);
  const requestPath = path.join(root, FORMAL_PROVIDER_WORKER_FILES.request);
  const responsePath = path.join(root, FORMAL_PROVIDER_WORKER_FILES.response);
  const resultPath = path.join(root, FORMAL_PROVIDER_WORKER_FILES.result);
  let requestRecord;
  try {
    const requestBytes = await readFreshFormalFile(
      requestPath,
      FORMAL_PROVIDER_LIMITS.maximum_worker_request_bytes,
    );
    requestRecord = parseStrictJson(
      requestBytes,
      FORMAL_PROVIDER_WORKER_ERROR_CODES.REQUEST_INVALID,
    );
    assertFormalProviderWorkerRequest(requestRecord);
  } catch (error) {
    if (error?.message === FORMAL_PROVIDER_WORKER_ERROR_CODES.REQUEST_INVALID)
      throw error;
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.REQUEST_READ);
  }
  let prompt;
  try {
    prompt = await readFreshFormalFile(
      promptPath,
      FORMAL_PROVIDER_LIMITS.maximum_prompt_bytes,
    );
  } catch {
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.PROMPT_READ);
  }
  if (
    prompt.length !== requestRecord.prompt_bytes ||
    digest(prompt) !== requestRecord.prompt_sha256
  )
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.PROMPT_INVALID);
  let promptText;
  try {
    promptText = new TextDecoder("utf-8", { fatal: true }).decode(prompt);
  } catch {
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.PROMPT_UTF8);
  }
  if (!Buffer.from(promptText, "utf8").equals(prompt))
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.PROMPT_UTF8);
  const response = await invokeProvider(requestRecord, promptText);
  const result = createFormalProviderWorkerResult({
    request: requestRecord,
    providerRequestOrSessionId: response.value.id,
    providerCreatedUnixMs: response.value.created_at * 1000,
    rawResponseSha256: digest(response.bytes),
    rawResponseBytes: response.bytes.length,
    usage: {
      input_tokens: response.value.usage.input_tokens,
      output_tokens: response.value.usage.output_tokens,
      cached_input_tokens:
        response.value.usage.input_tokens_details.cached_tokens,
    },
  });
  const resultBytes = Buffer.from(`${JSON.stringify(result, null, 2)}\n`);
  if (resultBytes.length > FORMAL_PROVIDER_LIMITS.maximum_worker_result_bytes)
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.RESULT_WRITE);
  try {
    await writeFile(responsePath, response.bytes, { flag: "wx" });
  } catch {
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_WRITE);
  }
  try {
    await writeFile(resultPath, resultBytes, { flag: "wx" });
  } catch {
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.RESULT_WRITE);
  }
}

async function assertWorkerRoot(root) {
  try {
    const before = await lstat(root);
    const actual = await realpath(root);
    if (
      !before.isDirectory() ||
      before.isSymbolicLink() ||
      normalizePath(actual) !== normalizePath(root)
    )
      throw new Error();
  } catch {
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.ROOT);
  }
}

function invokeProvider(requestRecord, promptText) {
  if (abortRequested)
    return Promise.reject(
      new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.ABORTED),
    );
  const body = Buffer.from(
    JSON.stringify({
      model: requestRecord.model,
      input: promptText,
      max_output_tokens: requestRecord.maximum_output_tokens,
    }),
  );
  if (
    body.length >
    FORMAL_PROVIDER_LIMITS.maximum_provider_request_body_bytes
  )
    return Promise.reject(
      new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.REQUEST_INVALID),
    );
  const credential = process.env.OPENAI_API_KEY;
  if (typeof credential !== "string" || credential.length === 0)
    return Promise.reject(
      new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.REQUEST_INVALID),
    );
  return new Promise((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    const fail = (code) => {
      if (settled) return;
      settled = true;
      activeResponse?.destroy();
      activeRequest?.destroy();
      reject(new Error(code));
    };
    activeRequest = httpsRequest(
      FORMAL_PROVIDER_ENDPOINT,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${credential}`,
          "content-type": "application/json",
          "content-length": body.length,
          accept: "application/json",
        },
      },
      (response) => {
        activeResponse = response;
        if (
          !Number.isInteger(response.statusCode) ||
          response.statusCode < 200 ||
          response.statusCode >= 300
        ) {
          fail(FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_STATUS);
          return;
        }
        const encoding = response.headers["content-encoding"];
        if (encoding && encoding !== "identity") {
          fail(FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_ENCODING);
          return;
        }
        const contentLength = response.headers["content-length"];
        if (contentLength !== undefined) {
          const parsed = parseCanonicalProviderContentLength(contentLength);
          if (parsed === null) {
            fail(
              FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_CONTENT_LENGTH,
            );
            return;
          }
          if (parsed > FORMAL_PROVIDER_LIMITS.maximum_response_bytes) {
            fail(FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_LIMIT);
            return;
          }
        }
        const chunks = [];
        let receivedBytes = 0;
        response.on("data", (chunk) => {
          if (settled) return;
          const bytes = Buffer.from(chunk);
          receivedBytes += bytes.length;
          if (receivedBytes > FORMAL_PROVIDER_LIMITS.maximum_response_bytes) {
            fail(FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_LIMIT);
            return;
          }
          chunks.push(bytes);
        });
        response.once("aborted", () =>
          fail(
            abortRequested
              ? FORMAL_PROVIDER_WORKER_ERROR_CODES.ABORTED
              : FORMAL_PROVIDER_WORKER_ERROR_CODES.TRANSPORT,
          ),
        );
        response.once("error", () =>
          fail(
            abortRequested
              ? FORMAL_PROVIDER_WORKER_ERROR_CODES.ABORTED
              : FORMAL_PROVIDER_WORKER_ERROR_CODES.TRANSPORT,
          ),
        );
        response.once("end", () => {
          if (settled) return;
          const bytes = Buffer.concat(chunks, receivedBytes);
          let value;
          try {
            value = parseFormalProviderResponse(bytes, requestRecord);
          } catch (error) {
            fail(error?.message ?? FORMAL_PROVIDER_WORKER_ERROR_CODES.INTERNAL);
            return;
          }
          settled = true;
          activeRequest = null;
          activeResponse = null;
          resolve({ bytes, value });
        });
      },
    );
    activeRequest.setTimeout(requestRecord.request_timeout_ms, () => {
      timedOut = true;
      fail(FORMAL_PROVIDER_WORKER_ERROR_CODES.REQUEST_TIMEOUT);
    });
    activeRequest.once("error", () =>
      fail(
        abortRequested
          ? FORMAL_PROVIDER_WORKER_ERROR_CODES.ABORTED
          : timedOut
            ? FORMAL_PROVIDER_WORKER_ERROR_CODES.REQUEST_TIMEOUT
            : FORMAL_PROVIDER_WORKER_ERROR_CODES.TRANSPORT,
      ),
    );
    activeRequest.end(body);
  });
}

function abortProvider() {
  if (abortRequested) return;
  abortRequested = true;
  activeResponse?.destroy(
    new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.ABORTED),
  );
  activeRequest?.destroy(
    new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.ABORTED),
  );
}

function normalizePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
