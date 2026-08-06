#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { aggregateAdmissionPairs, compareAdmissionPair } from "./admission-aggregate.mjs";
import { runDeterministicAdmissionChecks } from "./admission-deterministic.mjs";
import { runAdmissionPair } from "./admission-execute.mjs";
import {
  createArtifactDirectory,
  loadAdmissionConfig,
  resolveArtifactFile,
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
  const { config, config_sha256: configSha } = await loadAdmissionConfig();
  const freeze = await verifyFrozenAdmission(config);
  if (options.command === "freeze-check") {
    console.log(
      JSON.stringify(
        { schema_version: config.schema_version, config_sha256: configSha, ...freeze },
        null,
        2,
      ),
    );
    return;
  }
  if (options.command === "deterministic") {
    const directory = await createArtifactDirectory(required(options.artifact, "--artifact"));
    const report = runDeterministicAdmissionChecks(config, configSha);
    await writeJson(path.join(directory, "deterministic-report.json"), report);
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (options.command === "run-pair") {
    const track = required(options.track, "--track");
    const directory = await createArtifactDirectory(required(options.artifact, "--artifact"));
    const pair = await runAdmissionPair({
      trackId: track,
      pairId: required(options.pairId, "--pair-id"),
      replicate: options.replicate,
      artifactDirectory: directory,
      config,
      configSha,
    });
    const report = compareAdmissionPair(track, pair, configSha);
    await writeJson(path.join(directory, "pair-report.json"), report);
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (options.command === "aggregate") {
    const track = required(options.track, "--track");
    const directory = await createArtifactDirectory(required(options.artifact, "--artifact"));
    const reports = await Promise.all(
      options.pairs.map((file) => readArtifactJson(file)),
    );
    const deterministic = await readArtifactJson(
      required(options.deterministic, "--deterministic"),
    );
    if (deterministic.config_sha256 !== configSha)
      throw new Error("admission_deterministic_config_mismatch");
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
  throw new Error(`admission_command_unknown:${options.command}`);
}

function parseArgs(argv) {
  const options = { command: argv[0], pairs: [] };
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--track") options.track = argv[++index];
    else if (flag === "--pair-id") options.pairId = argv[++index];
    else if (flag === "--replicate") options.replicate = Number(argv[++index]);
    else if (flag === "--artifact") options.artifact = argv[++index];
    else if (flag === "--pair") options.pairs.push(argv[++index]);
    else if (flag === "--deterministic") options.deterministic = argv[++index];
    else if (flag === "--help" || flag === "-h") options.help = true;
    else throw new Error(`admission_argument_unknown:${flag}`);
  }
  return options;
}

async function readArtifactJson(relative) {
  return JSON.parse(await readFile(resolveArtifactFile(relative), "utf8"));
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
  run-pair --track <dra-semantic-recovery|build-reuse-buy> --pair-id <id> --replicate <n> --artifact <relative-output-directory>
  aggregate --track <id> --deterministic <relative-report.json> --pair <relative-pair-report.json>... --artifact <relative-output-directory>`);
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
