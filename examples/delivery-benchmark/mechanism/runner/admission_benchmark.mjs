#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  aggregateAdmissionPairs,
  compareAdmissionPair,
} from "./admission-aggregate.mjs";
import {
  buildAdmissionAttestation,
  currentExactMainCandidate,
} from "./admission-attestation.mjs";
import { runDeterministicAdmissionChecks } from "./admission-deterministic.mjs";
import { runAdmissionPair } from "./admission-execute.mjs";
import {
  buildAdmissionEvidencePayload,
  encodeAdmissionEvidencePayload,
  materializeAdmissionEvidencePayload,
} from "./admission-evidence.mjs";
import {
  REPO_ROOT,
  createArtifactDirectory,
  loadAdmissionConfig,
  resolveArtifactFile,
  sha256,
  verifyFrozenAdmission,
  writeJson,
} from "./admission-shared.mjs";

export {
  aggregateAdmissionPairs,
  compareAdmissionPair,
  runAdmissionPair,
  runDeterministicAdmissionChecks,
};

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (!options.command || options.help) return printHelp();
  const {
    config,
    global_execution_envelope_sha256: globalExecutionEnvelopeSha,
    track_config_sha256: trackConfigSha,
  } = await loadAdmissionConfig();
  const freeze = await verifyFrozenAdmission(config);
  if (options.command === "freeze-check") {
    console.log(
      JSON.stringify(
        {
          schema_version: config.schema_version,
          global_execution_envelope_sha256: globalExecutionEnvelopeSha,
          track_config_sha256: trackConfigSha,
          ...freeze,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (options.command === "deterministic") {
    const directory = await createArtifactDirectory(
      required(options.artifact, "--artifact"),
    );
    const report = runDeterministicAdmissionChecks(
      config,
      globalExecutionEnvelopeSha,
      trackConfigSha,
    );
    await writeJson(path.join(directory, "deterministic-report.json"), report);
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (options.command === "run-pair") {
    const track = required(options.track, "--track");
    const directory = await createArtifactDirectory(
      required(options.artifact, "--artifact"),
    );
    const pair = await runAdmissionPair({
      trackId: track,
      pairId: required(options.pairId, "--pair-id"),
      replicate: options.replicate,
      artifactDirectory: directory,
      config,
      globalExecutionEnvelopeSha,
      trackConfigSha: trackConfigSha[track],
    });
    const report = compareAdmissionPair(
      track,
      pair,
      globalExecutionEnvelopeSha,
      trackConfigSha[track],
    );
    await writeJson(path.join(directory, "pair-report.json"), report);
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (options.command === "aggregate") {
    const track = required(options.track, "--track");
    const directory = await createArtifactDirectory(
      required(options.artifact, "--artifact"),
    );
    const reports = await Promise.all(
      options.pairs.map((file) => readArtifactJson(file)),
    );
    const deterministic = await readArtifactJson(
      required(options.deterministic, "--deterministic"),
    );
    const report = aggregateAdmissionPairs(
      track,
      reports,
      config.tracks[track],
      deterministic,
    );
    await writeJson(path.join(directory, "aggregate-report.json"), report);
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (options.command === "attest") {
    const directory = await createArtifactDirectory(
      required(options.artifact, "--artifact"),
    );
    const deterministicArtifact = await readArtifactRecord(
      required(options.deterministic, "--deterministic"),
    );
    const aggregates = await Promise.all(
      options.aggregates.map((file) => readArtifactRecord(file)),
    );
    const attestation = buildAdmissionAttestation({
      globalExecutionEnvelopeSha,
      trackConfigSha,
      deterministic: deterministicArtifact,
      aggregates,
      candidate: currentExactMainCandidate(),
      expectedTracks: Object.keys(config.tracks),
    });
    await writeJson(
      path.join(directory, "admission-attestation.json"),
      attestation,
    );
    console.log(JSON.stringify(attestation, null, 2));
    return;
  }
  if (options.command === "sanitize-evidence") {
    const directory = await createArtifactDirectory(
      required(options.artifact, "--artifact"),
    );
    const deterministic = await readArtifactRecord(
      required(options.deterministic, "--deterministic"),
    );
    const pairs = await Promise.all(
      options.pairs.map((file) => readArtifactRecord(file)),
    );
    const aggregates = await Promise.all(
      options.aggregates.map((file) => readArtifactRecord(file)),
    );
    const attestation = await readArtifactRecord(
      required(options.attestation, "--attestation"),
    );
    const candidate = currentExactMainCandidate();
    const payload = buildAdmissionEvidencePayload({
      deterministic,
      pairs,
      aggregates,
      attestation,
      candidate,
    });
    const encoded = encodeAdmissionEvidencePayload(payload);
    const bundle = path.join(directory, "bundle");
    const payloadFile = path.join(directory, "workflow-payload-base64.txt");
    await materializeAdmissionEvidencePayload({
      encoded,
      outputDirectory: bundle,
      expectedCommit: candidate.commit,
      expectedTree: candidate.tree,
    });
    await writeFile(payloadFile, `${encoded}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    const report = {
      schema_version: "tiny-context-admission-sanitized-evidence-v1",
      candidate_git: candidate,
      global_execution_envelope_sha256: globalExecutionEnvelopeSha,
      track_config_sha256: trackConfigSha,
      payload_sha256: sha256(encoded),
      workflow_input_characters: encoded.length,
      bundle_path: path.relative(REPO_ROOT, bundle).replaceAll("\\", "/"),
      payload_path: path.relative(REPO_ROOT, payloadFile).replaceAll("\\", "/"),
    };
    await writeJson(
      path.join(directory, "sanitized-evidence-report.json"),
      report,
    );
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  throw new Error(`admission_command_unknown:${options.command}`);
}

function parseArgs(argv) {
  const options = { command: argv[0], pairs: [], aggregates: [] };
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--track") options.track = argv[++index];
    else if (flag === "--pair-id") options.pairId = argv[++index];
    else if (flag === "--replicate") options.replicate = Number(argv[++index]);
    else if (flag === "--artifact") options.artifact = argv[++index];
    else if (flag === "--pair") options.pairs.push(argv[++index]);
    else if (flag === "--aggregate") options.aggregates.push(argv[++index]);
    else if (flag === "--deterministic") options.deterministic = argv[++index];
    else if (flag === "--attestation") options.attestation = argv[++index];
    else if (flag === "--help" || flag === "-h") options.help = true;
    else throw new Error(`admission_argument_unknown:${flag}`);
  }
  return options;
}

async function readArtifactJson(relative) {
  return JSON.parse(await readFile(resolveArtifactFile(relative), "utf8"));
}

async function readArtifactRecord(relative) {
  const file = resolveArtifactFile(relative);
  const bytes = await readFile(file);
  return {
    path: relative,
    sha256: sha256(bytes),
    bytes,
    value: JSON.parse(bytes.toString("utf8")),
  };
}

function required(value, flag) {
  if (!value) throw new Error(`admission_argument_required:${flag}`);
  return value;
}

function printHelp() {
  console.log(`admission_benchmark.mjs

Commands:
  freeze-check
  deterministic --artifact <relative-output-directory>
  run-pair --track <dra-semantic-recovery|build-reuse-buy|dsa-artifact-category> --pair-id <id> --replicate <n> --artifact <relative-output-directory>
  aggregate --track <id> --deterministic <relative-report.json> --pair <relative-pair-report.json>... --artifact <relative-output-directory>
  attest --deterministic <relative-report.json> --aggregate <relative-aggregate-report.json>... --artifact <relative-output-directory>
  sanitize-evidence --deterministic <relative-report.json> --pair <relative-pair-report.json>... --aggregate <relative-aggregate-report.json>... --attestation <relative-attestation.json> --artifact <relative-output-directory>`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
