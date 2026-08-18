export const FORMAL_PROVIDER_PROTOCOL_PATH =
  "tools/long_task_formal_provider_protocol.mjs";
export const FORMAL_PROVIDER_WORKER_PATH =
  "tools/long_task_formal_provider_worker.mjs";
export const FORMAL_PROVIDER_RESPONSE_PATH =
  "tools/long_task_formal_provider_response.mjs";
export const FORMAL_PROVIDER_ENDPOINT =
  "https://api.openai.com/v1/responses";
export const FORMAL_PROVIDER_PROTOCOL_ID =
  "openai-responses-isolated-worker-protocol-v1";
export const FORMAL_PROVIDER_PARSER_ID =
  "openai-responses-usage-created-at-v2";
export const FORMAL_PROVIDER_TRANSPORT_ID = "node-https-bounded-stream-v1";
export const FORMAL_PROVIDER_WORKER_ENVIRONMENT_POLICY =
  "formal-provider-worker-env-allowlist-v1";
export const FORMAL_NODE_LAUNCH_POLICY = "clean-formal-node-launch-v1";
export const FORMAL_PROVIDER_NODE_LAUNCH_PROTOCOL =
  "direct-process-exec-path-bounded-pipes-v1";
export const FORMAL_PROVIDER_LIMITS = Object.freeze({
  maximum_prompt_bytes: 1024 * 1024,
  maximum_provider_request_body_bytes: 8 * 1024 * 1024,
  maximum_response_bytes: 4 * 1024 * 1024,
  maximum_worker_request_bytes: 64 * 1024,
  maximum_worker_result_bytes: 64 * 1024,
  maximum_worker_stdout_bytes: 64 * 1024,
  maximum_worker_stderr_bytes: 64 * 1024,
  provider_request_timeout_ms: 120_000,
  provider_abort_grace_ms: 5_000,
  maximum_output_tokens: 4_096,
});
export const FORMAL_PROVIDER_WORKER_FILES = Object.freeze({
  prompt: "prompt.bin",
  request: "request.json",
  response: "response.bin",
  result: "result.json",
});
export const FORMAL_PROVIDER_WORKER_ENVIRONMENT_KEYS = Object.freeze([
  "OPENAI_API_KEY",
  "SystemRoot",
  "WINDIR",
  "TEMP",
  "TMP",
]);
export const FORMAL_PROVIDER_UNSUPPORTED_ENVIRONMENT_KEYS = Object.freeze([
  "NODE_OPTIONS",
  "NODE_PATH",
  "NODE_REPL_EXTERNAL_MODULE",
  "NODE_INSPECT_RESUME_ON_START",
  "NODE_V8_COVERAGE",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "NODE_EXTRA_CA_CERTS",
]);
export const FORMAL_PROVIDER_WORKER_ERROR_CODES = Object.freeze({
  ARGUMENTS: "formal_provider_worker_arguments",
  ROOT: "formal_provider_worker_root",
  REQUEST_READ: "formal_provider_worker_request_read",
  REQUEST_INVALID: "formal_provider_worker_request_invalid",
  PROMPT_READ: "formal_provider_worker_prompt_read",
  PROMPT_INVALID: "formal_provider_worker_prompt_invalid",
  PROMPT_UTF8: "formal_provider_worker_prompt_utf8",
  REQUEST_TIMEOUT: "formal_provider_worker_request_timeout",
  RESPONSE_STATUS: "formal_provider_worker_response_status",
  RESPONSE_CONTENT_LENGTH: "formal_provider_worker_response_content_length",
  RESPONSE_LIMIT: "formal_provider_worker_response_limit",
  RESPONSE_ENCODING: "formal_provider_worker_response_encoding",
  RESPONSE_JSON: "formal_provider_worker_response_json",
  RESPONSE_IDENTITY_USAGE:
    "formal_provider_worker_response_identity_usage",
  RESPONSE_TIMESTAMP: "formal_provider_worker_response_timestamp",
  RESPONSE_WRITE: "formal_provider_worker_response_write",
  RESULT_WRITE: "formal_provider_worker_result_write",
  ABORTED: "formal_provider_worker_aborted",
  TRANSPORT: "formal_provider_worker_transport",
  INTERNAL: "formal_provider_worker_internal",
});
const requestSchema = "formal-provider-worker-request-v1";
const resultSchema = "formal-provider-worker-result-v1";
const errorSchema = "formal-provider-worker-error-v1";
const shaPattern = /^[a-f0-9]{64}$/u;
export function formalProviderLaunchEnvelopeStatus({
  execArgv = [], // The worker spawn does not inherit parent process.execArgv.
  environment = process.env,
} = {}) {
  const unsupportedEnvironmentKeys = presentEnvironmentKeys(
    environment,
    FORMAL_PROVIDER_UNSUPPORTED_ENVIRONMENT_KEYS,
  );
  const execArgvEmpty = Array.isArray(execArgv) && execArgv.length === 0;
  return Object.freeze({
    exec_argv_empty: execArgvEmpty,
    unsupported_environment_keys_absent:
      unsupportedEnvironmentKeys.length === 0,
    unsupported_environment_keys: Object.freeze(unsupportedEnvironmentKeys),
    supported: execArgvEmpty && unsupportedEnvironmentKeys.length === 0,
  });
}
export function assertFormalProviderLaunchEnvelope(options) {
  const status = formalProviderLaunchEnvelopeStatus(options);
  if (!status.supported)
    throw new Error("formal_provider_launch_envelope_unsupported");
  return status;
}
export function formalProviderWorkerEnvironment(environment = process.env) {
  assertFormalProviderLaunchEnvelope({ environment });
  const result = {};
  for (const canonicalKey of FORMAL_PROVIDER_WORKER_ENVIRONMENT_KEYS) {
    const actualKey = findEnvironmentKey(environment, canonicalKey);
    if (actualKey && typeof environment[actualKey] === "string")
      result[canonicalKey] = environment[actualKey];
  }
  return Object.freeze(result);
}
export function createFormalProviderWorkerRequest({
  invocationId,
  model,
  promptBytes,
  promptSha256,
  requestTimeoutMs,
}) {
  const request = {
    schema_version: requestSchema,
    invocation_id: invocationId,
    model,
    prompt_bytes: promptBytes,
    prompt_sha256: promptSha256,
    request_timeout_ms: requestTimeoutMs,
    maximum_output_tokens: FORMAL_PROVIDER_LIMITS.maximum_output_tokens,
  };
  assertFormalProviderWorkerRequest(request);
  return Object.freeze(request);
}
export function assertFormalProviderWorkerRequest(value) {
  assertExactKeys(
    value,
    [
      "invocation_id",
      "maximum_output_tokens",
      "model",
      "prompt_bytes",
      "prompt_sha256",
      "request_timeout_ms",
      "schema_version",
    ],
    FORMAL_PROVIDER_WORKER_ERROR_CODES.REQUEST_INVALID,
  );
  if (
    value.schema_version !== requestSchema ||
    !shaPattern.test(value.invocation_id) ||
    typeof value.model !== "string" ||
    value.model.length === 0 ||
    value.model.length > 256 ||
    !Number.isSafeInteger(value.prompt_bytes) ||
    value.prompt_bytes <= 0 ||
    value.prompt_bytes > FORMAL_PROVIDER_LIMITS.maximum_prompt_bytes ||
    !shaPattern.test(value.prompt_sha256) ||
    !Number.isSafeInteger(value.request_timeout_ms) ||
    value.request_timeout_ms <= 0 ||
    value.request_timeout_ms >
      FORMAL_PROVIDER_LIMITS.provider_request_timeout_ms ||
    value.maximum_output_tokens !==
      FORMAL_PROVIDER_LIMITS.maximum_output_tokens
  )
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.REQUEST_INVALID);
  return value;
}
export function createFormalProviderWorkerResult({
  request,
  providerRequestOrSessionId,
  providerCreatedUnixMs,
  rawResponseSha256,
  rawResponseBytes,
  usage,
}) {
  const result = {
    schema_version: resultSchema,
    invocation_id: request.invocation_id,
    provider: "openai",
    endpoint: FORMAL_PROVIDER_ENDPOINT,
    model: request.model,
    provider_request_or_session_id: providerRequestOrSessionId,
    provider_created_unix_ms: providerCreatedUnixMs,
    raw_response_sha256: rawResponseSha256,
    raw_response_bytes: rawResponseBytes,
    parser_id: FORMAL_PROVIDER_PARSER_ID,
    transport_id: FORMAL_PROVIDER_TRANSPORT_ID,
    usage,
  };
  assertFormalProviderWorkerResult(result, request);
  return result;
}
export function assertFormalProviderWorkerResult(value, request) {
  assertFormalProviderWorkerRequest(request);
  assertExactKeys(
    value,
    [
      "endpoint",
      "invocation_id",
      "model",
      "parser_id",
      "provider",
      "provider_created_unix_ms",
      "provider_request_or_session_id",
      "raw_response_bytes",
      "raw_response_sha256",
      "schema_version",
      "transport_id",
      "usage",
    ],
    FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_IDENTITY_USAGE,
  );
  assertExactKeys(
    value.usage,
    ["cached_input_tokens", "input_tokens", "output_tokens"],
    FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_IDENTITY_USAGE,
  );
  if (
    value.schema_version !== resultSchema ||
    value.invocation_id !== request.invocation_id ||
    value.provider !== "openai" ||
    value.endpoint !== FORMAL_PROVIDER_ENDPOINT ||
    value.model !== request.model ||
    value.parser_id !== FORMAL_PROVIDER_PARSER_ID ||
    value.transport_id !== FORMAL_PROVIDER_TRANSPORT_ID ||
    typeof value.provider_request_or_session_id !== "string" ||
    value.provider_request_or_session_id.length === 0 ||
    value.provider_request_or_session_id.length > 1024 ||
    !providerTimestampMilliseconds(value.provider_created_unix_ms) ||
    !shaPattern.test(value.raw_response_sha256) ||
    !Number.isSafeInteger(value.raw_response_bytes) ||
    value.raw_response_bytes <= 0 ||
    value.raw_response_bytes >
      FORMAL_PROVIDER_LIMITS.maximum_response_bytes ||
    !positiveInteger(value.usage.input_tokens) ||
    !positiveInteger(value.usage.output_tokens) ||
    value.usage.output_tokens > request.maximum_output_tokens ||
    !nonnegativeInteger(value.usage.cached_input_tokens) ||
    value.usage.cached_input_tokens > value.usage.input_tokens
  )
    throw new Error(
      FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_IDENTITY_USAGE,
    );
  return value;
}

export function formalProviderWorkerErrorRecord(errorCode) {
  const admittedCodes = new Set(
    Object.values(FORMAL_PROVIDER_WORKER_ERROR_CODES),
  );
  return Object.freeze({
    schema_version: errorSchema,
    error_code: admittedCodes.has(errorCode)
      ? errorCode
      : FORMAL_PROVIDER_WORKER_ERROR_CODES.INTERNAL,
  });
}

function assertExactKeys(value, expected, code) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== [...expected].sort().join(",")
  )
    throw new Error(code);
}

function presentEnvironmentKeys(environment, prohibited) {
  const actualKeys = Object.keys(environment ?? {});
  const result = [];
  for (const key of prohibited)
    if (
      actualKeys.some(
        (actual) => actual.toUpperCase() === key.toUpperCase(),
      )
    )
      result.push(key);
  return result;
}

function findEnvironmentKey(environment, requested) {
  return Object.keys(environment ?? {}).find(
    (key) => key.toUpperCase() === requested.toUpperCase(),
  );
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function nonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function providerTimestampMilliseconds(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= 8_640_000_000_000;
}
