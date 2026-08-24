import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { spawnCommandOnce } from "../../packages/ty-context/dist/lib/long-task-command-process.js";
import { execFileAsync } from "./long-task-windows-job-supervisor-test-support.mjs";

export async function assertWindowsJobRuntimeMatrix() {
  const root = await createRuntimeFixture();
  try {
    const immediate = await runScenario(root, "immediate", 3_000);
    assert.equal(immediate.exit_code, 0);
    assert.equal(immediate.stdout.toString("utf8"), "immediate\n");

    const normal = await runScenario(root, "normal-child", 3_000);
    assert.equal(normal.exit_code, 0);
    assert.equal(normal.stdout.toString("utf8"), "normal:child-ok\n");

    const nonzero = await runScenario(root, "nonzero", 3_000);
    assert.equal(nonzero.exit_code, 7);

    for (const [mode, timeout] of [
      ["short-child", 400],
      ["short-grandchild", 600],
      ["timeout-tree", 600],
    ]) {
      const log = path.join(root, `${mode}.jsonl`);
      await assert.rejects(
        runScenario(root, mode, timeout, log),
        /command_timeout/u,
      );
      await assertLoggedProcessesGone(log);
    }

    const overflowLog = path.join(root, "overflow.jsonl");
    await assert.rejects(
      runScenario(root, "overflow", 5_000, overflowLog),
      /command_output_limit_exceeded/u,
    );
    await assertLoggedProcessesGone(overflowLog);

    const parallelLog = path.join(root, "parallel-overflow.jsonl");
    const [good, bad] = await Promise.allSettled([
      runScenario(root, "parallel-good", 3_000),
      runScenario(root, "overflow", 5_000, parallelLog),
    ]);
    assert.equal(good.status, "fulfilled");
    assert.equal(good.value.stdout.toString("utf8"), "parallel-good\n");
    assert.equal(bad.status, "rejected");
    assert.match(String(bad.reason), /command_output_limit_exceeded/u);
    await assertLoggedProcessesGone(parallelLog);
  } finally {
    await forceTerminateFixtureProcesses(root);
    await rm(root, { recursive: true, force: true });
  }
}

async function createRuntimeFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "windows-job-runtime-"));
  await writeFile(
    path.join(root, "bridge.mjs"),
    `import { spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
const [log, stay] = process.argv.slice(2);
const grandchild = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60_000)"], { detached: true, stdio: "ignore" });
appendFileSync(log, JSON.stringify({ grandchild_pid: grandchild.pid }) + "\\n");
grandchild.unref();
if (stay === "stay") await new Promise(() => {});
`,
    "utf8",
  );
  await writeFile(
    path.join(root, "scenario.mjs"),
    `import { spawn, spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
const [mode, log] = process.argv.slice(2);
if (log) appendFileSync(log, JSON.stringify({ root_pid: process.pid }) + "\\n");
const spawnLong = () => spawn(process.execPath, ["-e", "setTimeout(() => {}, 60_000)"], { detached: true, stdio: "ignore" });
if (mode === "immediate") console.log("immediate");
else if (mode === "normal-child") {
  const child = spawnSync(process.execPath, ["-e", "process.stdout.write('child-ok')"], { encoding: "utf8" });
  if (child.status !== 0) process.exit(child.status ?? 1);
  console.log("normal:" + child.stdout);
} else if (mode === "nonzero") process.exit(7);
else if (mode === "short-child") {
  const child = spawnLong();
  appendFileSync(log, JSON.stringify({ child_pid: child.pid }) + "\\n");
  child.unref();
  console.log("untrusted-short-child");
} else if (mode === "short-grandchild" || mode === "timeout-tree") {
  const child = spawn(process.execPath, ["bridge.mjs", log, mode === "timeout-tree" ? "stay" : "exit"], { cwd: process.cwd(), detached: true, stdio: "ignore" });
  appendFileSync(log, JSON.stringify({ child_pid: child.pid }) + "\\n");
  child.unref();
  if (mode === "timeout-tree") await new Promise(() => {});
} else if (mode === "overflow") {
  const child = spawnLong();
  appendFileSync(log, JSON.stringify({ child_pid: child.pid }) + "\\n");
  child.unref();
  process.stdout.write("x".repeat(2 * 1024 * 1024 + 65536));
  await new Promise(() => {});
} else if (mode === "parallel-good") {
  await new Promise((resolve) => setTimeout(resolve, 600));
  console.log("parallel-good");
}
`,
    "utf8",
  );
  return root;
}

function runScenario(root, mode, timeoutMs, log) {
  return spawnCommandOnce(
    process.execPath,
    [path.join(root, "scenario.mjs"), mode, ...(log ? [log] : [])],
    root,
    timeoutMs,
    process.env,
    true,
  );
}

async function assertLoggedProcessesGone(log) {
  const rows = await waitForLogRows(log, 2);
  const pids = [
    ...new Set(
      rows
        .flatMap((row) => Object.entries(row))
        .filter(([key, value]) => key.endsWith("_pid") && validPid(value))
        .map(([, value]) => value),
    ),
  ];
  assert.ok(pids.length >= 2, `missing process identities in ${log}`);
  for (const pid of pids) await assertProcessGone(pid);
}

async function waitForLogRows(log, minimum) {
  const deadline = Date.now() + 3_000;
  do {
    try {
      const rows = (await readFile(log, "utf8"))
        .trim()
        .split(/\r?\n/u)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      if (rows.length >= minimum) return rows;
    } catch {
      // The contained process may still be writing its first identity row.
    }
    await delay(25);
  } while (Date.now() < deadline);
  throw new Error(`process identity log incomplete: ${log}`);
}

async function assertProcessGone(pid) {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    if (!processExists(pid)) return;
    await delay(25);
  }
  assert.equal(processExists(pid), false, `process ${pid} remains alive`);
}

function processExists(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

async function forceTerminateFixtureProcesses(root) {
  let names = [];
  try {
    names = await readdir(root);
  } catch {
    return;
  }
  const pids = new Set();
  for (const name of names.filter((entry) => entry.endsWith(".jsonl")))
    try {
      const rows = (await readFile(path.join(root, name), "utf8"))
        .split(/\r?\n/u)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      for (const row of rows)
        for (const [key, value] of Object.entries(row))
          if (key.endsWith("_pid") && validPid(value)) pids.add(value);
    } catch {
      // Best-effort test cleanup after an assertion failure.
    }
  for (const pid of pids)
    await execFileAsync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
    }).catch(() => undefined);
}

function validPid(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
