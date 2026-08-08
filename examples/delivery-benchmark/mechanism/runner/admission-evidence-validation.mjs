import {
  ADMISSION_EVIDENCE_AGGREGATE_SCHEMA,
  ADMISSION_EVIDENCE_MANIFEST_SCHEMA,
  ADMISSION_EVIDENCE_PAYLOAD_SCHEMA,
} from "./admission-evidence-constants.mjs";
import {
  assertAdmissionEvidenceCandidateShape,
  assertAdmissionEvidencePath,
  assertAdmissionEvidenceRecordSchema,
  assertAdmissionEvidenceSameCandidate,
  assertAdmissionDeterministicEnvironmentBinding,
  assertAdmissionEvidenceSanitizedJson,
  assertSanitizedAdmissionPairSetMatchesAggregate,
  groupAdmissionPairRecords,
  sameAdmissionEvidenceObject,
  sameAdmissionEvidenceSet,
  uniqueAdmissionRecordsByTrack,
  uniqueAdmissionTrackRows,
} from "./admission-evidence-records.mjs";
import { sha256 } from "./admission-shared.mjs";

export function validateAdmissionEvidencePayload(payload) {
  validateEnvelope(payload);
  const seen = validateFiles(payload.files);
  const required = [
    "deterministic-report.json",
    "admission-attestation.json",
    "admission-evidence-manifest.json",
  ];
  if (required.some((file) => !seen.has(file)))
    throw new Error("admission_evidence_required_file_missing");
  validatePayloadEvidenceSet(payload);
}

function validateEnvelope(payload) {
  if (payload?.schema_version !== ADMISSION_EVIDENCE_PAYLOAD_SCHEMA)
    throw new Error("admission_evidence_payload_schema_unsupported");
  assertAdmissionEvidenceCandidateShape(payload.candidate_git);
  if (!/^[0-9a-f]{64}$/u.test(payload.global_execution_envelope_sha256))
    throw new Error("admission_evidence_global_digest_invalid");
  const entries = Object.entries(payload.track_config_sha256 ?? {});
  if (entries.length === 0)
    throw new Error("admission_evidence_track_digest_set_empty");
  for (const [track, digest] of entries)
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(track) || !/^[0-9a-f]{64}$/u.test(digest))
      throw new Error(`admission_evidence_track_digest_invalid:${track}`);
}

function validateFiles(files) {
  if (!Array.isArray(files) || files.length === 0)
    throw new Error("admission_evidence_file_set_empty");
  const seen = new Set();
  for (const file of files) {
    if (seen.has(file.path))
      throw new Error(`admission_evidence_duplicate_path:${file.path}`);
    seen.add(file.path);
    assertAdmissionEvidencePath(file.path);
    if (
      !/^[0-9a-f]{64}$/u.test(file.sha256) ||
      typeof file.content_base64 !== "string" ||
      !/^[A-Za-z0-9+/]+={0,2}$/u.test(file.content_base64)
    )
      throw new Error(`admission_evidence_file_encoding_invalid:${file.path}`);
    const bytes = Buffer.from(file.content_base64, "base64");
    if (sha256(bytes) !== file.sha256)
      throw new Error(`admission_evidence_file_digest_mismatch:${file.path}`);
    assertAdmissionEvidenceSanitizedJson(file.path, bytes);
  }
  return seen;
}

function validatePayloadEvidenceSet(payload) {
  const records = payloadRecords(payload.files);
  const core = coreRecords(records);
  validateCoreIdentities(core, payload);
  const tracks = collectTrackRecords(records);
  validateTrackSets(tracks, core.attestation.value, payload);
  validateTrackRecords(tracks, core.attestation.value, payload);
  if (
    core.attestation.value.deterministic.artifact_sha256 !==
    core.deterministic.sha256
  )
    throw new Error("admission_evidence_payload_deterministic_mismatch");
  validateManifestFiles(core.manifest.value, records);
}

function payloadRecords(files) {
  return new Map(
    files.map((file) => {
      const bytes = Buffer.from(file.content_base64, "base64");
      return [
        file.path,
        {
          path: file.path,
          sha256: file.sha256,
          bytes,
          value: JSON.parse(bytes.toString("utf8")),
        },
      ];
    }),
  );
}

function coreRecords(records) {
  const deterministic = records.get("deterministic-report.json");
  const attestation = records.get("admission-attestation.json");
  const manifest = records.get("admission-evidence-manifest.json");
  assertAdmissionEvidenceRecordSchema(
    deterministic,
    "tiny-context-admission-deterministic-v3",
    "payload-deterministic",
  );
  assertAdmissionEvidenceRecordSchema(
    attestation,
    "tiny-context-admission-attestation-v2",
    "payload-attestation",
  );
  assertAdmissionEvidenceRecordSchema(
    manifest,
    ADMISSION_EVIDENCE_MANIFEST_SCHEMA,
    "payload-manifest",
  );
  return { deterministic, attestation, manifest };
}

function validateCoreIdentities(core, payload) {
  for (const [label, value] of [
    ["deterministic", core.deterministic.value],
    ["attestation", core.attestation.value],
    ["manifest", core.manifest.value],
  ]) {
    if (
      value.global_execution_envelope_sha256 !==
        payload.global_execution_envelope_sha256 ||
      !sameAdmissionEvidenceObject(
        value.track_config_sha256,
        payload.track_config_sha256,
      )
    )
      throw new Error(`admission_evidence_payload_identity_mismatch:${label}`);
    assertAdmissionEvidenceSameCandidate(
      value.candidate_git,
      payload.candidate_git,
      label,
    );
  }
  assertAdmissionDeterministicEnvironmentBinding(
    core.deterministic.value,
    core.attestation.value,
  );
  const manifest = core.manifest.value;
  if (
    manifest.retention_days !== 30 ||
    manifest.sensitive_raw_content_included !== false ||
    manifest.authority !== "none" ||
    manifest.acceptance_result !== false
  )
    throw new Error("admission_evidence_manifest_boundary_invalid");
}

function collectTrackRecords(records) {
  const aggregates = [];
  const pairs = [];
  for (const [filePath, record] of records) {
    const aggregate = /^tracks\/([^/]+)\/aggregate-report\.json$/u.exec(
      filePath,
    );
    const pair = /^tracks\/([^/]+)\/pairs\/([^/]+)\.json$/u.exec(filePath);
    if (aggregate) {
      if (record.value.track !== aggregate[1])
        throw new Error(`admission_evidence_path_track_mismatch:${filePath}`);
      aggregates.push(record);
    } else if (pair) {
      if (record.value.track !== pair[1] || record.value.pair_id !== pair[2])
        throw new Error(`admission_evidence_path_pair_mismatch:${filePath}`);
      pairs.push(record);
    }
  }
  return {
    aggregateByTrack: uniqueAdmissionRecordsByTrack(
      aggregates,
      "payload-aggregate",
    ),
    pairByTrack: groupAdmissionPairRecords(pairs),
  };
}

function validateTrackSets(tracks, attestation, payload) {
  const attestedTracks = uniqueAdmissionTrackRows(
    attestation.tracks,
    "payload-attestation",
  );
  if (
    !sameAdmissionEvidenceSet(
      tracks.aggregateByTrack.keys(),
      attestedTracks.keys(),
    ) ||
    !sameAdmissionEvidenceSet(
      tracks.aggregateByTrack.keys(),
      Object.keys(payload.track_config_sha256),
    )
  )
    throw new Error("admission_evidence_payload_track_set_mismatch");
  tracks.attestedTracks = attestedTracks;
}

function validateTrackRecords(tracks, attestation, payload) {
  for (const [track, aggregate] of tracks.aggregateByTrack) {
    assertAdmissionEvidenceRecordSchema(
      aggregate,
      ADMISSION_EVIDENCE_AGGREGATE_SCHEMA,
      `payload-aggregate:${track}`,
    );
    if (
      aggregate.value.source_schema_version !==
        "tiny-context-fresh-agent-aggregate-v3" ||
      !/^[0-9a-f]{64}$/u.test(aggregate.value.source_artifact_sha256) ||
      aggregate.value.global_execution_envelope_sha256 !==
        payload.global_execution_envelope_sha256 ||
      aggregate.value.track_config_sha256 !== payload.track_config_sha256[track]
    )
      throw new Error(`admission_evidence_payload_aggregate_mismatch:${track}`);
    const attested = tracks.attestedTracks.get(track);
    if (
      attested.artifact_sha256 !== aggregate.value.source_artifact_sha256 ||
      attested.track_config_sha256 !== payload.track_config_sha256[track]
    )
      throw new Error(
        `admission_evidence_payload_attestation_mismatch:${track}`,
      );
    assertAdmissionEvidenceSameCandidate(
      aggregate.value.evidence_candidate_git,
      attested.evidence_candidate_git,
      `aggregate:${track}`,
    );
    assertSanitizedAdmissionPairSetMatchesAggregate(
      track,
      tracks.pairByTrack.get(track) ?? [],
      aggregate.value,
    );
  }
  if (attestation.tracks.length !== tracks.aggregateByTrack.size)
    throw new Error("admission_evidence_payload_track_set_mismatch");
}

function validateManifestFiles(manifest, records) {
  const manifestFiles = new Map();
  for (const file of manifest.files ?? []) {
    if (manifestFiles.has(file.path))
      throw new Error(`admission_evidence_manifest_duplicate:${file.path}`);
    manifestFiles.set(file.path, file.sha256);
  }
  const expected = [...records.values()].filter(
    (record) => record.path !== "admission-evidence-manifest.json",
  );
  if (
    manifestFiles.size !== expected.length ||
    expected.some((record) => manifestFiles.get(record.path) !== record.sha256)
  )
    throw new Error("admission_evidence_manifest_file_set_mismatch");
}
