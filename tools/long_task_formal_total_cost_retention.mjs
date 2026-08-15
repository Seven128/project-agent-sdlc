import { assert } from "./long_task_real_process_roi_scoring.mjs";
import {
  FORMAL_EVIDENCE_CAPACITY,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_schema_policy.mjs";
import {
  assertExactKeys,
  assertTimestamp,
  parseJson,
} from "./long_task_formal_total_cost_shared.mjs";

const { FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA } = REAL_PROCESS_SCHEMAS;

export async function validateFormalExecutionProvenance({
  execution,
  scenario,
  runArtifactIndex,
  consumedArtifacts,
  redactionRules,
  usedRedactionRules,
  sourcePath,
}) {
  const rawPrompt = await consumeSensitiveArtifact({
    reference: execution.sensitive_refs.raw_prompt,
    required: scenario.measurement_profile.raw_prompt.presence === "required",
    role: "raw_prompt",
    runArtifactIndex,
    consumedArtifacts,
    redactionRules,
    usedRedactionRules,
    sourcePath,
  });
  const providerSource = await consumeSensitiveArtifact({
    reference: execution.sensitive_refs.provider_event,
    required:
      scenario.measurement_profile.provider_event.presence === "required",
    role: "provider_event",
    runArtifactIndex,
    consumedArtifacts,
    redactionRules,
    usedRedactionRules,
    sourcePath,
  });
  const providerRecord = providerSource
    ? validateProviderEventRecord({
        bytes: providerSource,
        invocationId: execution.invocation_id,
        clocks: execution.clocks,
        clockPolicy: scenario.clock_policy,
        sourcePath: execution.sensitive_refs.provider_event.artifact_ref,
      })
    : null;
  return { rawPrompt, providerRecord };
}

export function assertFormalRedactionRulesConsumed({
  bundle,
  usedRedactionRules,
}) {
  for (const [sourcePath, source] of bundle.files)
    if (source.entry.role === "redaction_rule")
      assert(
        usedRedactionRules.has(sourcePath),
        `formal_evidence_redaction_rule_unused:${sourcePath}`,
      );
}

async function consumeSensitiveArtifact(options) {
  const {
    reference,
    required,
    role,
    runArtifactIndex,
    consumedArtifacts,
    redactionRules,
    usedRedactionRules,
    sourcePath,
  } = options;
  if (!required) {
    assert(reference === null, `formal_${role}_forbidden:${sourcePath}`);
    return null;
  }
  assert(reference, `formal_${role}_required:${sourcePath}`);
  const artifactPath = reference.artifact_ref;
  assert(
    !consumedArtifacts.has(artifactPath),
    `formal_execution_artifact_ref:${artifactPath}`,
  );
  const bytes = await runArtifactIndex.read(
    artifactPath,
    role,
    role === "raw_prompt"
      ? FORMAL_EVIDENCE_CAPACITY.maximum_raw_prompt_bytes
      : FORMAL_EVIDENCE_CAPACITY.maximum_measurement_record_bytes,
  );
  consumedArtifacts.add(artifactPath);
  if (reference.disposition === "redacted") {
    assert(
      redactionRules.has(reference.redaction_rule_ref),
      `formal_${role}_redaction_rule:${sourcePath}`,
    );
    usedRedactionRules.add(reference.redaction_rule_ref);
  } else
    assert(
      reference.redaction_rule_ref === null,
      `formal_${role}_retained_rule:${sourcePath}`,
    );
  return bytes;
}

function validateProviderEventRecord({
  bytes,
  invocationId,
  clocks,
  clockPolicy,
  sourcePath,
}) {
  const record = parseJson(bytes, `provider_event_json:${sourcePath}`);
  assertExactKeys(
    record,
    [
      "clock_id",
      "invocation_id",
      "model",
      "provider",
      "provider_request_id",
      "provider_response_id",
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
      record.model.length > 0 &&
      typeof record.provider_request_id === "string" &&
      record.provider_request_id.length > 0 &&
      typeof record.provider_response_id === "string" &&
      record.provider_response_id.length > 0 &&
      record.provider_response_id !== record.provider_request_id &&
      record.clock_id ===
        `${clockPolicy.provider_clock_id_prefix}${record.provider}`,
    `provider_event_identity:${sourcePath}`,
  );
  const recordedAt = assertTimestamp(
    record.recorded_at,
    `provider_event_time:${sourcePath}`,
  );
  assert(
    recordedAt >=
      clocks.startedWall - clockPolicy.provider_wall_window_tolerance_ms &&
      recordedAt <=
        clocks.completedWall + clockPolicy.provider_wall_window_tolerance_ms,
    `provider_event_time_binding:${sourcePath}`,
  );
  for (const [field, value] of Object.entries(record.usage))
    assert(
      Number.isSafeInteger(value) && value >= 0,
      `provider_event_usage:${sourcePath}:${field}`,
    );
  return record;
}
