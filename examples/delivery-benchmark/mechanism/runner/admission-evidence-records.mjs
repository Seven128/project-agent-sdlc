import { canonicalJson, sha256 } from "./admission-shared.mjs";
import {
  ADMISSION_EVIDENCE_AGGREGATE_SCHEMA,
  ADMISSION_EVIDENCE_PAIR_SCHEMA,
} from "./admission-evidence-constants.mjs";

const FORBIDDEN_RAW_KEYS = new Set([
  "prompt",
  "prompts",
  "model_output",
  "model_outputs",
  "raw_model_answer",
  "raw_model_response",
  "events",
  "events_jsonl",
  "stderr",
  "sensitive_source",
  "sensitive_source_content",
]);

export function assertAdmissionPairSetMatchesAggregate(
  track,
  pairs,
  aggregate,
) {
  if (pairs.length !== aggregate.pair_count)
    throw new Error(`admission_evidence_pair_count_mismatch:${track}`);
  const byId = new Map();
  for (const pair of pairs) {
    assertAdmissionEvidenceRecordSchema(
      pair,
      "tiny-context-fresh-agent-pair-v3",
      `pair:${track}`,
    );
    if (
      pair.value.track !== track ||
      pair.value.global_execution_envelope_sha256 !==
        aggregate.global_execution_envelope_sha256 ||
      pair.value.track_config_sha256 !== aggregate.track_config_sha256
    )
      throw new Error(`admission_evidence_pair_identity_mismatch:${track}`);
    const key = `${pair.value.pair_id}\0${pair.value.replicate}`;
    if (byId.has(key))
      throw new Error(`admission_evidence_pair_duplicate:${track}:${key}`);
    byId.set(key, canonicalJson(pair.value));
  }
  for (const report of aggregate.reports) {
    const key = `${report.pair_id}\0${report.replicate}`;
    if (byId.get(key) !== canonicalJson(report))
      throw new Error(
        `admission_evidence_pair_aggregate_mismatch:${track}:${key}`,
      );
    byId.delete(key);
  }
  if (byId.size) throw new Error(`admission_evidence_pair_extra:${track}`);
}

export function assertSanitizedAdmissionPairSetMatchesAggregate(
  track,
  pairs,
  aggregate,
) {
  if (pairs.length !== aggregate.pair_count)
    throw new Error(`admission_evidence_pair_count_mismatch:${track}`);
  const expectedCandidate = aggregate.evidence_candidate_git;
  const byId = new Map();
  for (const pair of pairs) {
    assertAdmissionEvidenceRecordSchema(
      pair,
      ADMISSION_EVIDENCE_PAIR_SCHEMA,
      `sanitized-pair:${track}`,
    );
    if (
      pair.value.track !== track ||
      pair.value.source_schema_version !== "tiny-context-fresh-agent-pair-v3" ||
      !/^[0-9a-f]{64}$/u.test(pair.value.source_artifact_sha256) ||
      pair.value.global_execution_envelope_sha256 !==
        aggregate.global_execution_envelope_sha256 ||
      pair.value.track_config_sha256 !== aggregate.track_config_sha256 ||
      !sameAdmissionEvidenceObject(pair.value.candidate_git, expectedCandidate)
    )
      throw new Error(`admission_evidence_pair_identity_mismatch:${track}`);
    const key = `${pair.value.pair_id}\0${pair.value.replicate}`;
    if (byId.has(key))
      throw new Error(`admission_evidence_pair_duplicate:${track}:${key}`);
    byId.set(key, pair.value.source_artifact_sha256);
  }
  for (const record of aggregate.pair_records ?? []) {
    const key = `${record.pair_id}\0${record.replicate}`;
    if (byId.get(key) !== record.source_artifact_sha256)
      throw new Error(
        `admission_evidence_pair_aggregate_mismatch:${track}:${key}`,
      );
    byId.delete(key);
  }
  if (
    (aggregate.pair_records ?? []).length !== aggregate.pair_count ||
    byId.size
  )
    throw new Error(`admission_evidence_pair_extra:${track}`);
}

export function groupAdmissionPairRecords(records) {
  const result = new Map();
  for (const record of records) {
    const track = record.value?.track;
    if (typeof track !== "string")
      throw new Error("admission_evidence_pair_track_missing");
    const rows = result.get(track) ?? [];
    rows.push(record);
    result.set(track, rows);
  }
  return result;
}

export function uniqueAdmissionRecordsByTrack(records, label) {
  const result = new Map();
  for (const record of records) {
    const track = record.value?.track;
    if (typeof track !== "string" || result.has(track))
      throw new Error(`admission_evidence_${label}_track_invalid:${track}`);
    result.set(track, record);
  }
  return result;
}

export function uniqueAdmissionTrackRows(rows, label) {
  const result = new Map();
  for (const row of rows ?? []) {
    if (typeof row.track !== "string" || result.has(row.track))
      throw new Error(`admission_evidence_${label}_track_invalid:${row.track}`);
    result.set(row.track, row);
  }
  return result;
}

export function assertAdmissionEvidenceRecordSchema(record, schema, label) {
  if (
    !record ||
    !Buffer.isBuffer(record.bytes) ||
    sha256(record.bytes) !== record.sha256 ||
    record.value?.schema_version !== schema
  )
    throw new Error(`admission_evidence_record_invalid:${label}`);
}

export function assertAdmissionEvidenceSanitizedJson(filePath, bytes) {
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`admission_evidence_json_invalid:${filePath}`);
  }
  walkSanitized(value, filePath);
}

export function assertAdmissionEvidenceCandidateShape(candidate) {
  if (
    candidate?.branch !== "main" ||
    candidate.commit !== candidate.main_commit ||
    candidate.working_tree_clean !== true ||
    !/^[0-9a-f]{40}$/u.test(candidate.commit) ||
    !/^[0-9a-f]{40}$/u.test(candidate.tree)
  )
    throw new Error("admission_evidence_candidate_invalid");
}

export function assertAdmissionEvidenceSameCandidate(actual, expected, label) {
  assertAdmissionEvidenceCandidateShape(actual);
  assertAdmissionEvidenceCandidateShape(expected);
  if (!sameAdmissionEvidenceObject(actual, expected))
    throw new Error(`admission_evidence_candidate_mismatch:${label}`);
}

export function assertAdmissionDeterministicEnvironmentBinding(
  deterministic,
  attestation,
) {
  const benchmark = deterministic?.benchmark_execution_environment;
  const runtime = deterministic?.deterministic_runtime_environment;
  if (
    deterministic?.schema_version !==
      "tiny-context-admission-deterministic-v3" ||
    deterministic.deterministic_runtime_passed !== true ||
    benchmark?.provenance !== "frozen-track-input" ||
    typeof benchmark.identity !== "string" ||
    runtime?.observed !== true ||
    typeof runtime.platform !== "string" ||
    typeof runtime.arch !== "string" ||
    !/^v\d+\.\d+\.\d+$/u.test(runtime.node_version) ||
    !Number.isInteger(runtime.node_major) ||
    !["local", "github-hosted", "github-actions"].includes(runtime.runner) ||
    typeof runtime.package_engine !== "string" ||
    runtime.node_engine_conformant !== true ||
    runtime.engine_failure !== null ||
    attestation?.deterministic?.passed !== true ||
    !sameAdmissionEvidenceObject(
      attestation.deterministic.benchmark_execution_environment,
      benchmark,
    ) ||
    !sameAdmissionEvidenceObject(
      attestation.deterministic.deterministic_runtime_environment,
      runtime,
    )
  )
    throw new Error("admission_evidence_deterministic_environment_invalid");
}

export function sameAdmissionEvidenceObject(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

export function sameAdmissionEvidenceSet(left, right) {
  return [...left].sort().join("\0") === [...right].sort().join("\0");
}

export function compareAdmissionPairRecords(left, right) {
  return (
    left.value.replicate - right.value.replicate ||
    left.value.pair_id.localeCompare(right.value.pair_id)
  );
}

export function assertAdmissionEvidencePath(relative) {
  const allowed =
    relative === "deterministic-report.json" ||
    relative === "admission-attestation.json" ||
    relative === "admission-evidence-manifest.json" ||
    /^tracks\/[a-z0-9][a-z0-9-]*\/aggregate-report\.json$/u.test(relative) ||
    /^tracks\/[a-z0-9][a-z0-9-]*\/pairs\/[a-z0-9][a-z0-9-]*\.json$/u.test(
      relative,
    );
  if (!allowed || relative.includes(".."))
    throw new Error(`admission_evidence_path_invalid:${relative}`);
}

function walkSanitized(value, location) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walkSanitized(item, `${location}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_RAW_KEYS.has(key))
      throw new Error(
        `admission_evidence_forbidden_raw_key:${location}:${key}`,
      );
    walkSanitized(child, `${location}.${key}`);
  }
}
