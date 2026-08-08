import { gzipSync, gunzipSync } from "node:zlib";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ADMISSION_EVIDENCE_AGGREGATE_SCHEMA,
  ADMISSION_EVIDENCE_MANIFEST_SCHEMA,
  ADMISSION_EVIDENCE_MAX_UNCOMPRESSED_BYTES,
  ADMISSION_EVIDENCE_MAX_WORKFLOW_INPUT_CHARACTERS,
  ADMISSION_EVIDENCE_PAIR_SCHEMA,
  ADMISSION_EVIDENCE_PAYLOAD_SCHEMA,
} from "./admission-evidence-constants.mjs";
import {
  assertAdmissionEvidencePath,
  assertAdmissionEvidenceRecordSchema,
  assertAdmissionEvidenceSameCandidate,
  assertAdmissionDeterministicEnvironmentBinding,
  assertAdmissionEvidenceSanitizedJson,
  assertAdmissionPairSetMatchesAggregate,
  compareAdmissionPairRecords,
  groupAdmissionPairRecords,
  sameAdmissionEvidenceObject,
  sameAdmissionEvidenceSet,
  uniqueAdmissionRecordsByTrack,
  uniqueAdmissionTrackRows,
} from "./admission-evidence-records.mjs";
import { validateAdmissionEvidencePayload } from "./admission-evidence-validation.mjs";
import { canonicalJson, sha256 } from "./admission-shared.mjs";

export function buildAdmissionEvidencePayload({
  deterministic,
  pairs,
  aggregates,
  attestation,
  candidate,
}) {
  assertAdmissionEvidenceRecordSchema(
    deterministic,
    "tiny-context-admission-deterministic-v3",
    "deterministic",
  );
  assertAdmissionEvidenceRecordSchema(
    attestation,
    "tiny-context-admission-attestation-v2",
    "attestation",
  );
  for (const record of [deterministic, ...pairs, ...aggregates, attestation])
    assertAdmissionEvidenceSanitizedJson(record.path, record.bytes);
  assertAdmissionEvidenceSameCandidate(
    attestation.value.candidate_git,
    candidate,
    "attestation",
  );
  assertAdmissionEvidenceSameCandidate(
    deterministic.value.candidate_git,
    candidate,
    "deterministic",
  );
  const globalSha = attestation.value.global_execution_envelope_sha256;
  const trackConfigSha = attestation.value.track_config_sha256;
  if (deterministic.value.global_execution_envelope_sha256 !== globalSha)
    throw new Error("admission_evidence_deterministic_global_mismatch");
  if (
    !sameAdmissionEvidenceObject(
      deterministic.value.track_config_sha256,
      trackConfigSha,
    )
  )
    throw new Error("admission_evidence_deterministic_track_mismatch");
  assertAdmissionDeterministicEnvironmentBinding(
    deterministic.value,
    attestation.value,
  );

  const aggregateByTrack = uniqueAdmissionRecordsByTrack(
    aggregates,
    "aggregate",
  );
  const attestedTracks = uniqueAdmissionTrackRows(
    attestation.value.tracks,
    "attestation",
  );
  if (!sameAdmissionEvidenceSet(aggregateByTrack.keys(), attestedTracks.keys()))
    throw new Error("admission_evidence_aggregate_track_set_mismatch");

  const pairByTrack = groupAdmissionPairRecords(pairs);
  const files = [evidenceFile("deterministic-report.json", deterministic)];
  for (const track of [...attestedTracks.keys()].sort()) {
    const aggregate = aggregateByTrack.get(track);
    const attested = attestedTracks.get(track);
    assertAdmissionEvidenceRecordSchema(
      aggregate,
      "tiny-context-fresh-agent-aggregate-v3",
      `aggregate:${track}`,
    );
    if (
      aggregate.value.global_execution_envelope_sha256 !== globalSha ||
      aggregate.value.track_config_sha256 !== trackConfigSha[track]
    )
      throw new Error(
        `admission_evidence_aggregate_identity_mismatch:${track}`,
      );
    if (
      attested.artifact_sha256 !== aggregate.sha256 ||
      attested.track_config_sha256 !== trackConfigSha[track]
    )
      throw new Error(
        `admission_evidence_attested_aggregate_mismatch:${track}`,
      );
    const trackPairs = (pairByTrack.get(track) ?? []).sort(
      compareAdmissionPairRecords,
    );
    assertAdmissionPairSetMatchesAggregate(track, trackPairs, aggregate.value);
    for (const pair of trackPairs)
      files.push(
        evidenceJsonFile(
          `tracks/${track}/pairs/${pair.value.pair_id}.json`,
          sanitizedPairEvidence(pair),
        ),
      );
    files.push(
      evidenceJsonFile(
        `tracks/${track}/aggregate-report.json`,
        sanitizedAggregateEvidence(aggregate, trackPairs),
      ),
    );
  }
  if (deterministic.sha256 !== attestation.value.deterministic.artifact_sha256)
    throw new Error("admission_evidence_attested_deterministic_mismatch");
  files.push(evidenceFile("admission-attestation.json", attestation));

  for (const file of files)
    assertAdmissionEvidenceSanitizedJson(file.path, file.bytes);
  const manifest = {
    schema_version: ADMISSION_EVIDENCE_MANIFEST_SCHEMA,
    authority: "none",
    acceptance_result: false,
    sensitive_raw_content_included: false,
    retention_days: 30,
    candidate_git: candidate,
    global_execution_envelope_sha256: globalSha,
    track_config_sha256: trackConfigSha,
    excluded_content_classes: [
      "prompts",
      "raw-model-answers",
      "events.jsonl",
      "stderr",
      "sensitive-source-content",
    ],
    files: files.map(({ path: filePath, sha256: digest }) => ({
      path: filePath,
      sha256: digest,
    })),
  };
  const manifestBytes = jsonBytes(manifest);
  files.push({
    path: "admission-evidence-manifest.json",
    sha256: sha256(manifestBytes),
    bytes: manifestBytes,
  });
  return {
    schema_version: ADMISSION_EVIDENCE_PAYLOAD_SCHEMA,
    candidate_git: candidate,
    global_execution_envelope_sha256: globalSha,
    track_config_sha256: trackConfigSha,
    files: files.map((file) => ({
      path: file.path,
      sha256: file.sha256,
      content_base64: file.bytes.toString("base64"),
    })),
  };
}

export function encodeAdmissionEvidencePayload(payload) {
  validateAdmissionEvidencePayload(payload);
  const encoded = gzipSync(Buffer.from(canonicalJson(payload), "utf8"), {
    level: 9,
  }).toString("base64");
  if (encoded.length > ADMISSION_EVIDENCE_MAX_WORKFLOW_INPUT_CHARACTERS)
    throw new Error(
      `admission_evidence_workflow_input_too_large:${encoded.length}`,
    );
  return encoded;
}

export async function materializeAdmissionEvidencePayload({
  encoded,
  outputDirectory,
  expectedCommit,
  expectedTree,
}) {
  const value = encoded.trim();
  if (
    value.length === 0 ||
    value.length > ADMISSION_EVIDENCE_MAX_WORKFLOW_INPUT_CHARACTERS ||
    !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)
  )
    throw new Error("admission_evidence_payload_encoding_invalid");
  let bytes;
  try {
    bytes = gunzipSync(Buffer.from(value, "base64"), {
      maxOutputLength: ADMISSION_EVIDENCE_MAX_UNCOMPRESSED_BYTES,
    });
  } catch (error) {
    throw new Error(
      `admission_evidence_payload_decode_failed:${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const payload = JSON.parse(bytes.toString("utf8"));
  validateAdmissionEvidencePayload(payload);
  if (
    payload.candidate_git.commit !== expectedCommit ||
    payload.candidate_git.tree !== expectedTree
  )
    throw new Error("admission_evidence_exact_candidate_mismatch");
  await assertNewDirectory(outputDirectory);
  for (const file of payload.files) {
    const target = resolveContained(outputDirectory, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    const content = Buffer.from(file.content_base64, "base64");
    await writeFile(target, content, { flag: "wx" });
    if (sha256(await readFile(target)) !== file.sha256)
      throw new Error(`admission_evidence_readback_mismatch:${file.path}`);
  }
  return {
    schema_version: "tiny-context-admission-evidence-materialization-v1",
    candidate_git: payload.candidate_git,
    file_count: payload.files.length,
    output_directory: outputDirectory,
  };
}

function evidenceFile(filePath, record) {
  return { path: filePath, sha256: record.sha256, bytes: record.bytes };
}

function evidenceJsonFile(filePath, value) {
  const bytes = jsonBytes(value);
  return { path: filePath, sha256: sha256(bytes), bytes };
}

function sanitizedPairEvidence(record) {
  const pair = record.value;
  return {
    schema_version: ADMISSION_EVIDENCE_PAIR_SCHEMA,
    source_schema_version: pair.schema_version,
    source_artifact_sha256: record.sha256,
    global_execution_envelope_sha256: pair.global_execution_envelope_sha256,
    track_config_sha256: pair.track_config_sha256,
    track: pair.track,
    pair_id: pair.pair_id,
    replicate: pair.replicate,
    requested_execution: {
      model: pair.requested_model,
      reasoning_effort: pair.requested_reasoning_effort,
      provider: pair.requested_provider,
    },
    fixture_identity: pair.fixture_identity,
    environment_identity: pair.environment_identity,
    candidate_git: pair.candidate_git,
    baseline: summarizedPairSide(pair.baseline),
    candidate: summarizedPairSide(pair.candidate),
    quality: pair.quality,
    environment_doubt: pair.environment_doubt,
    provenance_doubt_reasons: pair.provenance_doubt_reasons,
    simple_path: summarizedPairSimplePath(pair.simple_path),
    pairwise_win: pair.pairwise_win,
  };
}

function sanitizedAggregateEvidence(record, pairs) {
  const aggregate = record.value;
  return {
    schema_version: ADMISSION_EVIDENCE_AGGREGATE_SCHEMA,
    source_schema_version: aggregate.schema_version,
    source_artifact_sha256: record.sha256,
    global_execution_envelope_sha256:
      aggregate.global_execution_envelope_sha256,
    track_config_sha256: aggregate.track_config_sha256,
    track: aggregate.track,
    evidence_candidate_git: aggregate.candidate_git,
    pair_count: aggregate.pair_count,
    eligible_pair_count: aggregate.eligible_pair_count,
    required_pairs: aggregate.required_pairs,
    expansion_reasons: aggregate.expansion_reasons,
    pairwise_wins: aggregate.pairwise_wins,
    pairwise_wins_required: aggregate.pairwise_wins_required,
    baseline_targeted_defects: aggregate.baseline_targeted_defects,
    candidate_targeted_defects: aggregate.candidate_targeted_defects,
    targeted_defect_reduction: aggregate.targeted_defect_reduction,
    zero_defect_baseline: aggregate.zero_defect_baseline,
    critical_category_regressions: aggregate.critical_category_regressions,
    candidate_must_allow_false_blocking:
      aggregate.candidate_must_allow_false_blocking,
    baseline_other_false_blocking: aggregate.baseline_other_false_blocking,
    candidate_other_false_blocking: aggregate.candidate_other_false_blocking,
    deterministic_hard_gates_passed: aggregate.deterministic_hard_gates_passed,
    provenance_qualification: aggregate.provenance_qualification,
    simple_path: summarizedAggregateSimplePath(aggregate.simple_path),
    quality_thresholds_passed: aggregate.quality_thresholds_passed,
    simple_path_thresholds_passed: aggregate.simple_path_thresholds_passed,
    decision: aggregate.decision,
    pair_records: pairs.map((pair) => ({
      pair_id: pair.value.pair_id,
      replicate: pair.value.replicate,
      source_artifact_sha256: pair.sha256,
    })),
  };
}

function summarizedPairSide(side) {
  if (!side || typeof side !== "object") return null;
  return {
    quality: summarizedInvocation(side.quality),
    simple: summarizedInvocation(side.simple),
  };
}

function summarizedInvocation(invocation) {
  if (!invocation || typeof invocation !== "object") return null;
  const score = invocation.score ?? {};
  return {
    score: {
      hard_gate_passed: score.hard_gate_passed,
      provenance_verified: score.provenance_verified,
      critical_defects: score.critical_defects,
      major_defects: score.major_defects,
      targeted_defects: score.targeted_defects,
      critical_categories: score.critical_categories,
      must_allow_false_blocking: score.must_allow_false_blocking,
      other_false_blocking: score.other_false_blocking,
      failure_count: Array.isArray(score.failures) ? score.failures.length : 0,
    },
    wall_ms: invocation.wall_ms,
    tokens: invocation.tokens,
    tool_calls: invocation.tool_calls,
    trace_identity: invocation.trace_identity,
    requested_execution: invocation.requested_execution,
    effective_execution: summarizedEffectiveExecution(
      invocation.effective_execution,
    ),
    provenance_doubt_reasons: invocation.provenance_doubt_reasons,
  };
}

function summarizedEffectiveExecution(execution) {
  if (!execution || typeof execution !== "object") return null;
  return Object.fromEntries(
    ["model", "reasoning_effort", "provider"].map((key) => [
      key,
      {
        status: execution[key]?.status,
        value: execution[key]?.value,
      },
    ]),
  );
}

function summarizedPairSimplePath(simplePath) {
  if (!simplePath || typeof simplePath !== "object") return null;
  return {
    invocation_order: simplePath.invocation_order,
    baseline_hard_gate_passed: simplePath.baseline_hard_gate_passed,
    candidate_hard_gate_passed: simplePath.candidate_hard_gate_passed,
    baseline_tokens: simplePath.baseline_tokens,
    candidate_tokens: simplePath.candidate_tokens,
    token_overhead: simplePath.token_overhead,
    baseline_wall_ms: simplePath.baseline_wall_ms,
    candidate_wall_ms: simplePath.candidate_wall_ms,
    wall_overhead: simplePath.wall_overhead,
    baseline_tool_calls: simplePath.baseline_tool_calls,
    candidate_tool_calls: simplePath.candidate_tool_calls,
  };
}

function summarizedAggregateSimplePath(simplePath) {
  if (!simplePath || typeof simplePath !== "object") return null;
  return {
    all_candidate_hard_gates_passed: simplePath.all_candidate_hard_gates_passed,
    median_token_overhead: simplePath.median_token_overhead,
    median_wall_overhead: simplePath.median_wall_overhead,
    raw_pair_median_token_overhead: simplePath.raw_pair_median_token_overhead,
    raw_pair_median_wall_overhead: simplePath.raw_pair_median_wall_overhead,
    candidate_tool_calls: simplePath.candidate_tool_calls,
    position_strata: simplePath.position_strata,
  };
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function assertNewDirectory(directory) {
  try {
    await lstat(directory);
    throw new Error(`admission_evidence_output_collision:${directory}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(directory, { recursive: true });
}

function resolveContained(root, relative) {
  assertAdmissionEvidencePath(relative);
  const target = path.resolve(root, ...relative.split("/"));
  const relation = path.relative(root, target);
  if (!relation || relation.startsWith("..") || path.isAbsolute(relation))
    throw new Error(`admission_evidence_path_escape:${relative}`);
  return target;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  materializeAdmissionEvidencePayload({
    encoded: process.env.ADMISSION_EVIDENCE_PAYLOAD ?? "",
    outputDirectory:
      process.env.ADMISSION_EVIDENCE_OUTPUT ??
      path.resolve(".artifacts/mechanism-admission-evidence"),
    expectedCommit: process.env.GITHUB_SHA ?? "",
    expectedTree: process.env.ADMISSION_EXPECTED_TREE ?? "",
  })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
