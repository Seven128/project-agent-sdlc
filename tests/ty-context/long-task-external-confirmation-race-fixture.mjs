import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  externalConfirmationRecordHash,
  parseExternalConfirmationRecordV1,
  signExternalConfirmationRecordV1,
} from "../../packages/ty-context/dist/index.js";
import { externalConfirmationRecordPath } from "../../packages/ty-context/dist/lib/long-task-external-confirmation-state.js";
import { activeRecordPath } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  pathExists,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);
const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages/ty-context/dist/cli.js");

export async function installSlowOracle(fixture, signal) {
  await mkdir(signal.folder, { recursive: true });
  await writeFile(
    path.join(fixture.root, "tests", "oracle.mjs"),
    `import { appendFileSync, existsSync, readFileSync } from "node:fs";
appendFileSync(${JSON.stringify(signal.started)}, "started\\n");
while (!existsSync(${JSON.stringify(signal.release)})) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
}
let state = {first:false};
try { state = JSON.parse(readFileSync(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const observed = state.first === true;
const assertion = (key) => "assertion.first.first-check." + key;
console.log(JSON.stringify({
  schema_version: "ty-context-product-observation-v1",
  observations: {
    "fact.first.observable": observed,
    [assertion("first-result")]: observed,
    [assertion("first-requirement")]: observed,
    [assertion("first-obligation")]: observed,
    [assertion("first-architecture")]: observed,
    [assertion("first-liveness")]: true,
    [assertion("first-relations-na")]: state.first_relations_applicable === true
  }
}));
`,
  );
}

export function raceSignal(name) {
  const folder = path.join(
    os.tmpdir(),
    `ty-context-${name}-race-${process.pid}-${Date.now()}`,
  );
  return {
    folder,
    started: path.join(folder, "started.txt"),
    release: path.join(folder, "release.txt"),
  };
}

export async function waitForFile(file) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (
      await access(file)
        .then(() => true)
        .catch(() => false)
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`race signal timeout: ${file}`);
}

const FINALIZATION_PHASES = [
  "after_finalization_evaluation",
  "after_receipt_stage",
  "after_receipt_publish",
  "after_authority_clear",
];

export async function finalizationSignal(target) {
  const folder = path.join(
    os.tmpdir(),
    `ty-context-finalization-${target}-${process.pid}-${Date.now()}`,
  );
  await mkdir(folder, { recursive: true });
  for (const phase of FINALIZATION_PHASES)
    if (phase !== target)
      await writeFile(path.join(folder, `${phase}.release`), "release\n");
  return {
    folder,
    started: path.join(folder, `${target}.started`),
    release: path.join(folder, `${target}.release`),
  };
}

export function finalizationSignalEnvironment(signal) {
  return {
    ...process.env,
    NODE_ENV: "test",
    TY_CONTEXT_TEST_FINALIZATION_SIGNAL_DIR: signal.folder,
  };
}

export async function runCliProcess(cwd, args, options = {}) {
  try {
    const result = await exec(process.execPath, [cli, ...args], {
      cwd,
      windowsHide: true,
      ...options,
    });
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      exitCode: error.code ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
    };
  }
}
