import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { isFormalProcessEnvironmentKey } from "./formal_process_supervisor_protocol.mjs";
import { pairIds } from "./long_task_formal_total_cost_shared.mjs";

const execFileAsync = promisify(execFile);
const formalEnvironmentAllowlist = new Set(
  [
    "CI",
    "COMSPEC",
    "LANG",
    "LC_ALL",
    "NUMBER_OF_PROCESSORS",
    "OS",
    "PATH",
    "PATHEXT",
    "PROCESSOR_ARCHITECTURE",
    "SYSTEMDRIVE",
    "SYSTEMROOT",
    "TEMP",
    "TMP",
    "WINDIR",
  ].map((value) => value.toUpperCase()),
);

export function formalArtifactRefs(invocationId) {
  const prefix = `formal-evidence/${invocationId}`;
  return {
    event: `${prefix}/event.json`,
    output: `${prefix}/output.bin`,
    stdout: `${prefix}/stdout.log`,
    stderr: `${prefix}/stderr.log`,
    human: `${prefix}/human.json`,
    candidateObservation: `${prefix}/candidate-observation.json`,
    processAccounting: `${prefix}/process-accounting.json`,
    stateRoot: `${prefix}/state-root`,
    statePayload: `${prefix}/state-payload.bin`,
    storageLedger: `${prefix}/storage-ledger.json`,
    rawPrompt: `${prefix}/raw-prompt.bin`,
    providerEvent: `${prefix}/provider-event.json`,
  };
}

export function sensitiveFormalArtifactRef(artifactRef) {
  return {
    artifact_ref: artifactRef,
    disposition: "retained",
    redaction_rule_ref: null,
  };
}

export async function formalCandidateSnapshot(checkout, invocationId) {
  const [commit, tree, status] = await Promise.all([
    gitBytes(checkout, ["rev-parse", "HEAD"]),
    gitBytes(checkout, ["rev-parse", "HEAD^{tree}"]),
    gitBytes(checkout, [
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
    ]),
  ]);
  return {
    invocation_id: invocationId,
    commit: commit.toString("utf8").trim(),
    tree: tree.toString("utf8").trim(),
    status_bytes: status.length,
    status_sha256: formalCollectionDigest(status),
  };
}

export function assertFormalCandidateUnchanged(before, after, setup) {
  const emptySha = formalCollectionDigest(Buffer.alloc(0));
  if (
    before.commit !== setup.commit ||
    before.tree !== setup.tree ||
    before.status_bytes !== 0 ||
    before.status_sha256 !== emptySha ||
    JSON.stringify(before) !== JSON.stringify(after)
  )
    throw new Error(
      `formal_collection_candidate_changed:${before.invocation_id}`,
    );
}

export function formalCollectorEnvironment(environment = process.env) {
  return Object.fromEntries(
    Object.entries(environment).filter(
      ([key, value]) =>
        typeof value === "string" &&
        isFormalProcessEnvironmentKey(key) &&
        formalEnvironmentAllowlist.has(key.toUpperCase()),
    ),
  );
}

export async function readFreshFormalFile(target, maximumBytes) {
  const before = await lstat(target);
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1 ||
    before.size > maximumBytes
  )
    throw new Error(`formal_collection_regular_file:${target}`);
  const actual = await realpath(target);
  if (normalizePath(actual) !== normalizePath(path.resolve(target)))
    throw new Error(`formal_collection_reparse:${target}`);
  const handle = await open(
    target,
    fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0),
  );
  try {
    const opened = await handle.stat();
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (!sameFile(before, opened) || !sameFile(opened, after))
      throw new Error(`formal_collection_file_identity:${target}`);
    return bytes;
  } finally {
    await handle.close();
  }
}

export function resolveFormalArtifact(root, relative) {
  const resolved = path.resolve(root, ...relative.split("/"));
  const back = path.relative(root, resolved);
  if (
    back === ".." ||
    back.startsWith(`..${path.sep}`) ||
    path.isAbsolute(back)
  )
    throw new Error(`formal_collection_artifact_escape:${relative}`);
  return resolved;
}

export function formalPairRepeat(pairId) {
  if (pairId === "once") return 1;
  if (!pairIds.includes(pairId))
    throw new Error(`formal_collection_pair:${pairId}`);
  return Number.parseInt(pairId.slice(-2), 10);
}

export function minimumFormalTimestamp(current, candidate) {
  return current === null || Date.parse(candidate) < Date.parse(current)
    ? candidate
    : current;
}

export function maximumFormalTimestamp(current, candidate) {
  return current === null || Date.parse(candidate) > Date.parse(current)
    ? candidate
    : current;
}

export async function writeFormalJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

function sameFile(left, right) {
  return (
    right.isFile() &&
    right.size === left.size &&
    right.dev === left.dev &&
    right.ino === left.ino
  );
}

async function gitBytes(cwd, args) {
  const result = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    encoding: "buffer",
    maxBuffer: 1024 * 1024,
    timeout: 30_000,
  });
  if (result.stderr.length !== 0)
    throw new Error(`formal_collection_git_stderr:${args[0]}`);
  return Buffer.from(result.stdout);
}

function normalizePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function formalCollectionDigest(value) {
  return createHash("sha256").update(value).digest("hex");
}
