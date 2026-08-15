import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  buildImmutableRunArtifactIndex,
  buildRealProcessArtifactManifest,
} from "../../../tools/long_task_real_process_artifacts.mjs";

const execFileAsync = promisify(execFile);

export function formalRefs(prefix) {
  return {
    event: `${prefix}/event.json`,
    output: `${prefix}/output.bin`,
    stdout: `${prefix}/stdout.log`,
    stderr: `${prefix}/stderr.log`,
    human: `${prefix}/human.json`,
    candidateObservation: `${prefix}/candidate-observation.json`,
    processAccounting: `${prefix}/process-accounting.json`,
    storageLedger: `${prefix}/storage-ledger.json`,
    statePayload: `${prefix}/state-payload.bin`,
    rawPrompt: `${prefix}/raw-prompt.bin`,
    providerEvent: `${prefix}/provider-event.json`,
  };
}

export function cleanCandidateObservation(invocationId, commit, tree) {
  return {
    invocation_id: invocationId,
    commit,
    tree,
    status_bytes: 0,
    status_sha256: digest(Buffer.alloc(0)),
  };
}

export function sensitiveRef(artifactRef) {
  return {
    artifact_ref: artifactRef,
    disposition: "retained",
    redaction_rule_ref: null,
  };
}

export function withoutDerivedExecutionFields(record) {
  const projected = structuredClone(record);
  delete projected.execution_record_sha256;
  delete projected.execution_id;
  return projected;
}

export async function writeArtifact(root, relative, value) {
  const target = path.join(root, ...relative.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, toBytes(value));
}

export async function rebuildFixtureIndex(fixture) {
  const manifest = await buildRealProcessArtifactManifest(fixture.root);
  const index = await buildImmutableRunArtifactIndex({
    runSetRoot: fixture.root,
    manifest,
  });
  return { manifest, index };
}

export async function assertJsonMutationRejected(
  fixture,
  relative,
  mutate,
  pattern,
) {
  const target = path.join(fixture.root, ...relative.split("/"));
  const original = await readFile(target);
  const value = JSON.parse(original.toString("utf8"));
  mutate(value);
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
  try {
    const { index } = await rebuildFixtureIndex(fixture);
    await assert.rejects(() => fixture.evaluate(index), pattern);
  } finally {
    await writeFile(target, original);
  }
}

export async function assertByteMutationRejected(
  fixture,
  relative,
  bytes,
  pattern,
) {
  const target = path.join(fixture.root, ...relative.split("/"));
  const original = await readFile(target);
  await writeFile(target, bytes);
  try {
    const { index } = await rebuildFixtureIndex(fixture);
    await assert.rejects(() => fixture.evaluate(index), pattern);
  } finally {
    await writeFile(target, original);
  }
}

export async function git(cwd, args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    encoding: "utf8",
  });
  return stdout.trim();
}

export function toBytes(value) {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "string") return Buffer.from(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

export function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
