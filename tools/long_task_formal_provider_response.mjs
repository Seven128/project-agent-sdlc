import {
  FORMAL_PROVIDER_WORKER_ERROR_CODES,
} from "./long_task_formal_provider_protocol.mjs";
import { parseStrictJson } from "./long_task_formal_total_cost_json.mjs";

export function parseFormalProviderResponse(bytes, requestRecord) {
  let value;
  try {
    value = parseStrictJson(
      bytes,
      FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_JSON,
    );
  } catch {
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_JSON);
  }
  if (!validProviderResponse(value, requestRecord))
    throw new Error(
      FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_IDENTITY_USAGE,
    );
  if (!providerTimestampSeconds(value.created_at))
    throw new Error(FORMAL_PROVIDER_WORKER_ERROR_CODES.RESPONSE_TIMESTAMP);
  return value;
}

export function parseCanonicalProviderContentLength(value) {
  if (Array.isArray(value) || !/^(?:0|[1-9][0-9]*)$/u.test(value))
    return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function validProviderResponse(value, requestRecord) {
  const usage = value?.usage;
  const cached = usage?.input_tokens_details?.cached_tokens;
  return (
    typeof value?.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 1024 &&
    value.model === requestRecord.model &&
    positiveInteger(usage?.input_tokens) &&
    positiveInteger(usage?.output_tokens) &&
    usage.output_tokens <= requestRecord.maximum_output_tokens &&
    nonnegativeInteger(cached) &&
    cached <= usage.input_tokens
  );
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function nonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function providerTimestampSeconds(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= 8_640_000_000;
}
