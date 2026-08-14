import { assert } from "./long_task_real_process_roi_scoring.mjs";
import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_roi_policy.mjs";
import {
  assertExactKeys,
  assertTimestamp,
  parseJson,
} from "./long_task_formal_total_cost_shared.mjs";

const { FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA } = REAL_PROCESS_SCHEMAS;

export function validateFormalEventProvenance(options) {
  const { provenance, subject, sourcePath, bundle } = options;
  assertExactKeys(
    provenance,
    ["provider_event", "raw_prompt"],
    `raw_event_provenance_fields:${sourcePath}`,
  );
  const rawPrompt = validateRetentionDisposition({
    ...options,
    value: provenance.raw_prompt,
    role: "raw_prompt",
    label: `${sourcePath}:raw_prompt`,
  });
  const providerEvent = validateRetentionDisposition({
    ...options,
    value: provenance.provider_event,
    role: "provider_event",
    label: `${sourcePath}:provider_event`,
  });
  const providerRecord =
    providerEvent.disposition === "not_applicable"
      ? null
      : validateProviderEventRecord({
          source: bundle.files.get(providerEvent.source_ref),
          invocationId: options.invocationId,
          observedAt: options.observedAt,
          sourcePath: providerEvent.source_ref,
        });
  if (subject.kind === "cost" && subject.category === "authoring")
    assert(
      rawPrompt.disposition !== "not_applicable",
      `raw_event_authoring_prompt:${sourcePath}`,
    );
  return { rawPrompt, providerEvent, providerRecord };
}

function validateProviderEventRecord({
  source,
  invocationId,
  observedAt,
  sourcePath,
}) {
  const record = parseJson(source.bytes, `provider_event_json:${sourcePath}`);
  assertExactKeys(
    record,
    [
      "invocation_id",
      "model",
      "provider",
      "recorded_at",
      "schema_version",
      "usage",
    ],
    `provider_event_fields:${sourcePath}`,
  );
  assertExactKeys(
    record.usage,
    ["cached_input_tokens", "input_tokens", "output_tokens"],
    `provider_event_usage_fields:${sourcePath}`,
  );
  assert(
    record.schema_version === FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA &&
      record.invocation_id === invocationId &&
      typeof record.provider === "string" &&
      record.provider.length > 0 &&
      typeof record.model === "string" &&
      record.model.length > 0,
    `provider_event_identity:${sourcePath}`,
  );
  assert(
    assertTimestamp(record.recorded_at, `provider_event_time:${sourcePath}`) ===
      observedAt,
    `provider_event_time_binding:${sourcePath}`,
  );
  for (const [field, value] of Object.entries(record.usage))
    assert(
      Number.isSafeInteger(value) && value >= 0,
      `provider_event_usage:${sourcePath}:${field}`,
    );
  return record;
}

export function assertFormalSensitiveSourcesConsumed(options) {
  const { bundle, usedSensitiveSources, usedRedactionRules } = options;
  for (const [sourcePath, source] of bundle.files) {
    if (["raw_prompt", "provider_event"].includes(source.entry.role))
      assert(
        usedSensitiveSources.has(sourcePath),
        `formal_evidence_sensitive_source_unused:${sourcePath}`,
      );
    if (source.entry.role === "redaction_rule")
      assert(
        usedRedactionRules.has(sourcePath),
        `formal_evidence_redaction_rule_unused:${sourcePath}`,
      );
  }
}

function validateRetentionDisposition(options) {
  const {
    value,
    role,
    bundle,
    redactionRules,
    usedSensitiveSources,
    usedRedactionRules,
    label,
  } = options;
  assertExactKeys(
    value,
    ["disposition", "redaction_rule_ref", "source_ref"],
    `retention_disposition_fields:${label}`,
  );
  assert(
    ["not_applicable", "redacted", "retained"].includes(value.disposition),
    `retention_disposition:${label}`,
  );
  if (value.disposition === "not_applicable") {
    assert(
      value.source_ref === null && value.redaction_rule_ref === null,
      `retention_not_applicable:${label}`,
    );
    return value;
  }
  const source = bundle.files.get(value.source_ref);
  assert(
    source?.entry.role === role && !usedSensitiveSources.has(value.source_ref),
    `retention_source_ref:${label}`,
  );
  usedSensitiveSources.add(value.source_ref);
  if (value.disposition === "retained") {
    assert(value.redaction_rule_ref === null, `retention_retained_rule:${label}`);
    return value;
  }
  assert(
    redactionRules.has(value.redaction_rule_ref),
    `retention_redaction_rule:${label}`,
  );
  usedRedactionRules.add(value.redaction_rule_ref);
  return value;
}
