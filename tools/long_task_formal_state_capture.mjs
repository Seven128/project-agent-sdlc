import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { FORMAL_EVIDENCE_CAPACITY, REAL_PROCESS_SCHEMAS } from "./long_task_real_process_schema_policy.mjs";
import {
  readFreshFormalFile,
  writeFormalJson,
} from "./long_task_formal_collection_io.mjs";

export class FormalStateCapture {
  #executionRoot;
  #invocationId;
  #stateRoot;
  #closed = false;

  static async create({ executionRoot, invocationId }) {
    assertInvocationId(invocationId);
    const resolvedExecutionRoot = path.resolve(executionRoot);
    const stateRoot = path.join(resolvedExecutionRoot, "state-root");
    assertDirectChild(resolvedExecutionRoot, stateRoot);
    await mkdir(stateRoot, { recursive: false });
    await assertOrdinaryDirectory(stateRoot, "formal_state_root");
    return new FormalStateCapture(
      resolvedExecutionRoot,
      invocationId,
      stateRoot,
    );
  }

  constructor(executionRoot, invocationId, stateRoot) {
    this.#executionRoot = executionRoot;
    this.#invocationId = invocationId;
    this.#stateRoot = stateRoot;
  }

  get root() {
    this.#assertOpen();
    return this.#stateRoot;
  }

  async finalize({ payloadPath, ledgerPath, retention }) {
    this.#assertOpen();
    validateRetention(retention);
    assertDirectChild(this.#executionRoot, payloadPath);
    assertDirectChild(this.#executionRoot, ledgerPath);
    await assertOrdinaryDirectory(this.#stateRoot, "formal_state_root_closed");
    const sources = await enumerateStateFiles(this.#stateRoot);
    if (sources.length === 0)
      throw new Error("formal_state_payload_empty_file_set");
    let offset = 0;
    const payloadChunks = [];
    const entries = [];
    for (const source of sources) {
      const bytes = await readFreshFormalFile(
        source.absolute,
        FORMAL_EVIDENCE_CAPACITY.maximum_state_payload_bytes,
      );
      if (
        offset + bytes.length >
        FORMAL_EVIDENCE_CAPACITY.maximum_state_payload_bytes
      )
        throw new Error("formal_state_payload_budget");
      entries.push({
        path: source.relative,
        offset,
        bytes: bytes.length,
        sha256: digest(bytes),
      });
      payloadChunks.push(bytes);
      offset += bytes.length;
    }
    if (offset === 0) throw new Error("formal_state_payload_empty");
    const payload = Buffer.concat(payloadChunks, offset);
    await writeFile(payloadPath, payload, { flag: "wx" });
    const payloadReadback = await readFreshFormalFile(
      payloadPath,
      FORMAL_EVIDENCE_CAPACITY.maximum_state_payload_bytes,
    );
    if (!payloadReadback.equals(payload))
      throw new Error("formal_state_payload_readback");
    await writeFormalJson(ledgerPath, {
      schema_version: REAL_PROCESS_SCHEMAS.FORMAL_STORAGE_LEDGER_SCHEMA,
      invocation_id: this.#invocationId,
      source_kind: "runner-exact-state-payload-retention-v1",
      state_payload_ref: toExecutionRelative(
        this.#executionRoot,
        payloadPath,
        this.#invocationId,
      ),
      state_payload_sha256: digest(payload),
      payload_bytes: payload.length,
      retention_hours: retention.retention_hours,
      retention_basis: retention.basis,
      retention_source_sha256: retention.source_sha256,
      entries,
    });
    this.#closed = true;
    await removeOwnedStateRoot(this.#executionRoot, this.#stateRoot);
    return Object.freeze({
      payload_bytes: payload.length,
      state_payload_sha256: digest(payload),
      entry_count: entries.length,
    });
  }

  async abort() {
    if (this.#closed) return;
    this.#closed = true;
    await removeOwnedStateRoot(this.#executionRoot, this.#stateRoot);
  }

  #assertOpen() {
    if (this.#closed) throw new Error("formal_state_capture_closed");
  }
}

async function enumerateStateFiles(root) {
  const files = [];
  async function walk(current, prefix) {
    const children = (await readdir(current, { withFileTypes: true })).sort(
      (left, right) => left.name.localeCompare(right.name),
    );
    for (const child of children) {
      const relative = prefix ? `${prefix}/${child.name}` : child.name;
      if (relative.length > 1024 || relative.includes("\\"))
        throw new Error(`formal_state_path:${relative}`);
      const absolute = path.join(current, child.name);
      const info = await lstat(absolute);
      if (info.isSymbolicLink())
        throw new Error(`formal_state_link:${relative}`);
      await assertRealPath(absolute, `formal_state_reparse:${relative}`);
      if (info.isDirectory()) {
        await walk(absolute, relative);
        continue;
      }
      if (!info.isFile() || info.nlink !== 1)
        throw new Error(`formal_state_not_regular:${relative}`);
      files.push({ absolute, relative });
      if (files.length > FORMAL_EVIDENCE_CAPACITY.maximum_state_source_files)
        throw new Error("formal_state_source_file_budget");
    }
  }
  await walk(root, "");
  return files.sort((left, right) =>
    left.relative.localeCompare(right.relative),
  );
}

async function assertOrdinaryDirectory(target, code) {
  const info = await lstat(target);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(code);
  await assertRealPath(target, `${code}_reparse`);
}

async function assertRealPath(target, code) {
  const actual = await realpath(target);
  if (normalize(actual) !== normalize(path.resolve(target)))
    throw new Error(code);
}

async function removeOwnedStateRoot(executionRoot, stateRoot) {
  assertDirectChild(executionRoot, stateRoot);
  if (path.basename(stateRoot) !== "state-root")
    throw new Error("formal_state_cleanup_target");
  await rm(stateRoot, { recursive: true, force: false });
}

function assertDirectChild(parent, child) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  if (!relative || relative.includes(path.sep) || path.isAbsolute(relative))
    throw new Error("formal_state_owned_path");
}

function toExecutionRelative(executionRoot, target, invocationId) {
  const name = path.relative(executionRoot, path.resolve(target));
  if (!name || name.includes(path.sep) || path.isAbsolute(name))
    throw new Error("formal_state_artifact_path");
  return `formal-evidence/${invocationId}/${name}`;
}

function validateRetention(value) {
  if (
    value?.status !== "frozen_supported" ||
    !Number.isSafeInteger(value.retention_hours) ||
    value.retention_hours <= 0 ||
    value.retention_hours >
      Math.floor(
        Number.MAX_SAFE_INTEGER /
          FORMAL_EVIDENCE_CAPACITY.maximum_state_payload_bytes,
      ) ||
    typeof value.basis !== "string" ||
    value.basis.length === 0 ||
    !/^[a-f0-9]{64}$/u.test(value.source_sha256 ?? "")
  )
    throw new Error("formal_state_retention_unavailable");
}

function assertInvocationId(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value))
    throw new Error("formal_state_invocation_id");
}

function normalize(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
