import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";
import { FORMAL_EVIDENCE_CAPACITY } from "./long_task_real_process_schema_policy.mjs";

const execFileAsync = promisify(execFile);
const maximumCommandOutputBytes =
  FORMAL_EVIDENCE_CAPACITY.maximum_materialization_command_output_bytes;

export async function recordedGitText(
  cwd,
  args,
  outputDir,
  label,
  commandRecords,
) {
  return recordedText(
    { command: "git", args },
    cwd,
    outputDir,
    label,
    commandRecords,
  );
}

export async function recordedText(
  spec,
  cwd,
  outputDir,
  label,
  commandRecords,
) {
  const record = await runMaterializationCommand({
    ...spec,
    cwd,
    outputDir,
    label,
    timeout: 120_000,
  });
  commandRecords.push(record);
  requireMaterializationSuccess(record, label);
  return (
    await readFile(path.join(outputDir, `${label}.stdout.log`), "utf8")
  ).trim();
}

export async function runMaterializationCommand({
  command,
  args,
  cwd,
  outputDir,
  label,
  timeout,
}) {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  let status = 0;
  let signal = null;
  let spawnError = null;
  try {
    const result = await execFileAsync(
      command,
      args,
      materializationCommandOptions(cwd, timeout),
    );
    stdout = Buffer.from(result.stdout);
    stderr = Buffer.from(result.stderr);
  } catch (error) {
    stdout = Buffer.from(error?.stdout ?? Buffer.alloc(0));
    stderr = Buffer.from(error?.stderr ?? Buffer.alloc(0));
    status = Number.isInteger(error?.code) ? error.code : null;
    signal = error?.signal ?? null;
    spawnError = error instanceof Error ? error.message : String(error);
  }
  if (stdout.length + stderr.length > maximumCommandOutputBytes)
    throw new Error(`long_task_package_materialization_output_overflow:${label}`);
  const record = {
    schema_version: "long-task-package-materialization-command-v1",
    label,
    argv: [command, ...args],
    cwd,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    duration_ms: Math.round((performance.now() - started) * 10_000) / 10_000,
    status,
    signal,
    spawn_error: spawnError,
    stdout_bytes: stdout.length,
    stderr_bytes: stderr.length,
    stdout_sha256: digest(stdout),
    stderr_sha256: digest(stderr),
  };
  await Promise.all([
    writeFile(path.join(outputDir, `${label}.stdout.log`), stdout, {
      flag: "wx",
    }),
    writeFile(path.join(outputDir, `${label}.stderr.log`), stderr, {
      flag: "wx",
    }),
    writeFile(
      path.join(outputDir, `${label}.command.json`),
      `${JSON.stringify(record, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    ),
  ]);
  return record;
}

export async function rawGitText(cwd, args) {
  const result = await execFileAsync(
    "git",
    args,
    materializationCommandOptions(cwd, 30_000),
  );
  return Buffer.from(result.stdout).toString("utf8").trim();
}

export async function removeGitWorktree(repositoryRoot, checkout) {
  await execFileAsync(
    "git",
    ["worktree", "remove", "--force", checkout],
    materializationCommandOptions(repositoryRoot, 120_000),
  );
}

export function requireMaterializationSuccess(record, operation) {
  if (
    record.status !== 0 ||
    record.signal !== null ||
    record.spawn_error !== null
  )
    throw new Error(`long_task_package_materialization_${operation}_failed`);
}

export function materializationCommandOptions(cwd, timeout) {
  return {
    cwd,
    timeout,
    windowsHide: true,
    encoding: "buffer",
    maxBuffer: maximumCommandOutputBytes,
  };
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
