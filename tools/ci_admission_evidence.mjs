#!/usr/bin/env node

import { lstat, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { materializeAdmissionEvidencePayload } from "../examples/delivery-benchmark/mechanism/runner/admission-evidence.mjs";
import { validateAdmissionEvidencePayload } from "../examples/delivery-benchmark/mechanism/runner/admission-evidence-validation.mjs";
import {
  assertAdmissionEvidenceCandidateShape,
  assertAdmissionEvidenceSameCandidate,
  assertAdmissionEvidenceSanitizedJson,
  sameAdmissionEvidenceObject,
} from "../examples/delivery-benchmark/mechanism/runner/admission-evidence-records.mjs";
import {
  canonicalJson,
  sha256,
} from "../examples/delivery-benchmark/mechanism/runner/admission-shared.mjs";

const SUMMARY_SCHEMA = "tiny-context-admission-ci-evidence-summary-v1";

export async function materializeCiAdmissionEvidence({
  encoded,
  outputDirectory,
  deterministicReport,
  expectedCommit,
  expectedTree,
}) {
  const input = encoded.trim();
  const inputPayloadSha256 = sha256(input);
  await materializeAdmissionEvidencePayload({
    encoded: input,
    outputDirectory,
    expectedCommit,
    expectedTree,
  });

  const attestationPath = path.join(
    outputDirectory,
    "admission-attestation.json",
  );
  const deterministicPath = path.join(
    outputDirectory,
    "deterministic-report.json",
  );
  const attestation = JSON.parse(await readFile(attestationPath, "utf8"));
  const deterministicBytes = await readFile(deterministicReport);
  assertAdmissionEvidenceSanitizedJson(
    "deterministic-report.json",
    deterministicBytes,
  );
  const deterministic = JSON.parse(deterministicBytes.toString("utf8"));
  validateCiDeterministic(deterministic, attestation, {
    branch: "main",
    commit: expectedCommit,
    tree: expectedTree,
    main_commit: expectedCommit,
    working_tree_clean: true,
  });
  const deterministicSha256 = sha256(deterministicBytes);
  attestation.deterministic = {
    artifact_path: "deterministic-report.json",
    artifact_sha256: deterministicSha256,
    passed: true,
  };
  await writeFile(deterministicPath, deterministicBytes);
  await writeJson(attestationPath, attestation);

  const manifestPath = path.join(
    outputDirectory,
    "admission-evidence-manifest.json",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.files = await evidenceFileRecords(outputDirectory, {
    exclude: new Set([
      "admission-evidence-manifest.json",
      "ci-evidence-summary.json",
    ]),
  });
  await writeJson(manifestPath, manifest);

  const evidenceFiles = await evidenceFileRecords(outputDirectory, {
    exclude: new Set(["ci-evidence-summary.json"]),
    includeContent: true,
  });
  const reboundPayload = {
    schema_version: "tiny-context-admission-ci-evidence-payload-v1",
    candidate_git: attestation.candidate_git,
    global_execution_envelope_sha256:
      attestation.global_execution_envelope_sha256,
    track_config_sha256: attestation.track_config_sha256,
    files: evidenceFiles.map(({ path: relative, sha256: digest, bytes }) => ({
      path: relative,
      sha256: digest,
      content_base64: bytes.toString("base64"),
    })),
  };
  validateAdmissionEvidencePayload(reboundPayload);

  const materializedJsonSetSha256 = sha256(
    evidenceFiles
      .map((file) => `${file.path}\0${file.sha256}`)
      .sort()
      .join("\n"),
  );
  const provenance = Object.fromEntries(
    [...attestation.tracks]
      .sort((left, right) => left.track.localeCompare(right.track))
      .map((row) => [
        row.track,
        row.provenance_qualification?.status ?? "unverified",
      ]),
  );
  const summary = {
    schema_version: SUMMARY_SCHEMA,
    authority: "none",
    acceptance_result: false,
    input_payload_sha256: inputPayloadSha256,
    materialized_json_set_sha256: materializedJsonSetSha256,
    ci_deterministic_report_sha256: deterministicSha256,
    deterministic_runtime_passed: true,
    fresh_agent_evidence_internally_valid: true,
    fresh_agent_provenance_qualification: {
      status: Object.values(provenance).every((value) => value === "verified")
        ? "verified"
        : "unverified",
      tracks: provenance,
    },
    candidate_git: attestation.candidate_git,
    materialized_json_file_count: evidenceFiles.length,
  };
  await writeJson(path.join(outputDirectory, "ci-evidence-summary.json"), summary);
  return summary;
}

function validateCiDeterministic(deterministic, attestation, candidate) {
  if (deterministic.schema_version !== "tiny-context-admission-deterministic-v2")
    throw new Error("admission_ci_deterministic_schema_unsupported");
  assertAdmissionEvidenceCandidateShape(deterministic.candidate_git);
  assertAdmissionEvidenceSameCandidate(
    deterministic.candidate_git,
    candidate,
    "ci-deterministic",
  );
  if (
    deterministic.global_execution_envelope_sha256 !==
      attestation.global_execution_envelope_sha256 ||
    !sameAdmissionEvidenceObject(
      deterministic.track_config_sha256,
      attestation.track_config_sha256,
    )
  )
    throw new Error("admission_ci_deterministic_identity_mismatch");
  const attestedTracks = new Set(attestation.tracks.map((row) => row.track));
  if (
    Object.keys(deterministic.tracks).length !== attestedTracks.size ||
    [...attestedTracks].some(
      (track) => deterministic.tracks[track]?.passed !== true,
    )
  )
    throw new Error("admission_ci_deterministic_runtime_failed");
}

async function evidenceFileRecords(
  root,
  { exclude = new Set(), includeContent = false } = {},
) {
  const files = await listJsonFiles(root);
  const result = [];
  for (const absolute of files) {
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (exclude.has(relative)) continue;
    const bytes = await readFile(absolute);
    assertAdmissionEvidenceSanitizedJson(relative, bytes);
    result.push({
      path: relative,
      sha256: sha256(bytes),
      ...(includeContent ? { bytes } : {}),
    });
  }
  return result.sort((left, right) => left.path.localeCompare(right.path));
}

async function listJsonFiles(root) {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`admission_ci_evidence_link_forbidden:${entry.name}`);
    if (entry.isDirectory()) result.push(...(await listJsonFiles(absolute)));
    else if (entry.isFile() && entry.name.endsWith(".json")) result.push(absolute);
    else throw new Error(`admission_ci_evidence_file_forbidden:${entry.name}`);
  }
  return result;
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink())
    throw new Error(`admission_ci_evidence_writeback_invalid:${file}`);
}

async function main() {
  const result = await materializeCiAdmissionEvidence({
    encoded: requiredEnv("ADMISSION_EVIDENCE_PAYLOAD"),
    outputDirectory: path.resolve(
      process.env.ADMISSION_EVIDENCE_OUTPUT ??
        ".artifacts/mechanism-admission-evidence",
    ),
    deterministicReport: path.resolve(
      requiredEnv("ADMISSION_CI_DETERMINISTIC_REPORT"),
    ),
    expectedCommit: requiredEnv("GITHUB_SHA"),
    expectedTree: requiredEnv("ADMISSION_EXPECTED_TREE"),
  });
  process.stdout.write(`${canonicalJson(result)}\n`);
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`admission_ci_environment_missing:${name}`);
  return value;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
)
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
