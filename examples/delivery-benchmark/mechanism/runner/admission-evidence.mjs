import { gzipSync, gunzipSync } from "node:zlib";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ADMISSION_EVIDENCE_MANIFEST_SCHEMA,
  ADMISSION_EVIDENCE_MAX_UNCOMPRESSED_BYTES,
  ADMISSION_EVIDENCE_MAX_WORKFLOW_INPUT_CHARACTERS,
  ADMISSION_EVIDENCE_PAYLOAD_SCHEMA,
} from "./admission-evidence-constants.mjs";
import {
  assertAdmissionEvidencePath,
  assertAdmissionEvidenceRecordSchema,
  assertAdmissionEvidenceSameCandidate,
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
    "tiny-context-admission-deterministic-v2",
    "deterministic",
  );
  assertAdmissionEvidenceRecordSchema(
    attestation,
    "tiny-context-admission-attestation-v2",
    "attestation",
  );
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
    const trackPairs = pairByTrack.get(track) ?? [];
    assertAdmissionPairSetMatchesAggregate(track, trackPairs, aggregate.value);
    for (const pair of trackPairs.sort(compareAdmissionPairRecords))
      files.push(
        evidenceFile(`tracks/${track}/pairs/${pair.value.pair_id}.json`, pair),
      );
    files.push(
      evidenceFile(`tracks/${track}/aggregate-report.json`, aggregate),
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
