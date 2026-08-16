import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { formalCollectorEnvironment } from "../../../tools/long_task_formal_collection_io.mjs";
import { FormalProcessSupervisor } from "../../../tools/formal_process_supervisor.mjs";
import {
  assertCanonicalTimestamp,
  assertClosedProcessTree,
} from "./long-task-level4-test-utils.mjs";

const execFileAsync = promisify(execFile);

export async function assertSupervisorRuntimeControls(identity) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-level4-supervisor-"));
  const supervisor = new FormalProcessSupervisor(identity);
  const run = (name, argv, timeoutMs = 10_000, limit = 64 * 1024) =>
    supervisor.run({
      requestId: name,
      executable: process.execPath,
      argv,
      cwd: root,
      stdoutPath: path.join(root, `${name}.stdout.log`),
      stderrPath: path.join(root, `${name}.stderr.log`),
      timeoutMs,
      combinedOutputLimitBytes: limit,
      environment: formalCollectorEnvironment({
        ...process.env,
        OPENAI_API_KEY: "must-not-cross-process-boundary",
      }),
    });
  try {
    const exact = await run("exact-argv", [
      "-e",
      "let x=0;for(let i=0;i<2e7;i++)x+=i;process.stdout.write(JSON.stringify({argv:process.argv.slice(1),secret:process.env.OPENAI_API_KEY??null,x:x>0}))",
      "token with spaces",
      "literal&token",
      'quote"token',
    ]);
    const exactOutput = JSON.parse(
      await readFile(path.join(root, "exact-argv.stdout.log"), "utf8"),
    );
    assert.deepEqual(exactOutput.argv, [
      "token with spaces",
      "literal&token",
      'quote"token',
    ]);
    assert.equal(exactOutput.secret, null);
    assertClosedProcessTree(exact);
    assert.ok(exact.total_cpu_100ns > 0);
    assert.equal(exact.process_monotonic_clock_id, "windows-stopwatch-qpc-v1");
    assert.equal(exact.wall_clock_id, "unix-epoch-ms-v1");
    assert.ok(
      BigInt(exact.process_monotonic_completed_ns) >=
        BigInt(exact.process_monotonic_started_ns),
    );
    assert.ok(Date.parse(exact.completed_at) >= Date.parse(exact.started_at));
    assertCanonicalTimestamp(exact.started_at);
    assertCanonicalTimestamp(exact.completed_at);

    const fastParent = await run("fast-parent-grandchild", [
      "-e",
      "require('node:child_process').spawn(process.execPath,['-e','setTimeout(()=>process.exit(0),150)'],{stdio:'ignore'}).unref()",
    ]);
    assertClosedProcessTree(fastParent, 2);

    const timed = await run(
      "descendant-timeout",
      [
        "-e",
        "require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)']);setInterval(()=>{},1000)",
      ],
      400,
    );
    assert.equal(timed.timed_out, true);
    assertClosedProcessTree(timed, 2);
    assert.ok(timed.total_processes >= 2);

    const overflow = await run(
      "stream-overflow",
      ["-e", "process.stdout.write(Buffer.alloc(65536,120))"],
      10_000,
      1024,
    );
    assert.equal(overflow.output_overflow, true);
    assertClosedProcessTree(overflow);

    const stderrOverflow = await run(
      "stderr-overflow",
      ["-e", "process.stderr.write(Buffer.alloc(65536,120))"],
      10_000,
      1024,
    );
    assert.equal(stderrOverflow.output_overflow, true);
    assertClosedProcessTree(stderrOverflow);

    await writeFile(path.join(root, "preexisting.stdout.log"), "stale");
    await assert.rejects(
      () => run("preexisting", ["-e", "process.exit(0)"]),
      /formal_process_supervisor_stdout_preexisting/u,
    );
  } finally {
    await supervisor.close();
    await rm(root, { recursive: true, force: true });
  }
}

export async function assertNestedJobAndBreakawayControls({
  identity,
  repositoryRoot,
}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-level4-job-probe-"));
  const supervisor = new FormalProcessSupervisor(identity);
  try {
    const result = await supervisor.run({
      requestId: "nested-breakaway-assignment",
      executable: identity.powershell.executable_path,
      argv: [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-File",
        path.join(
          repositoryRoot,
          "tests",
          "ty-context",
          "helpers",
          "long-task-level4-job-probe.ps1",
        ),
        process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe",
      ],
      cwd: root,
      stdoutPath: path.join(root, "probe.stdout.log"),
      stderrPath: path.join(root, "probe.stderr.log"),
      timeoutMs: 30_000,
      combinedOutputLimitBytes: 64 * 1024,
      environment: formalCollectorEnvironment(process.env),
    });
    const probe = JSON.parse(
      await readFile(path.join(root, "probe.stdout.log"), "utf8"),
    );
    assert.equal(probe.in_job, true);
    assert.equal(probe.breakaway_created, false);
    assert.ok(Number.isSafeInteger(probe.breakaway_error));
    assert.ok(probe.breakaway_error > 0);
    assert.equal(probe.incompatible_assignment, false);
    assert.ok(Number.isSafeInteger(probe.assignment_error));
    assert.ok(probe.assignment_error > 0);
    assertClosedProcessTree(result, 2);
  } finally {
    await supervisor.close();
    await rm(root, { recursive: true, force: true });
  }
}

export async function assertHelperCrashAndCloseControls(identity) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-level4-helper-crash-"));
  const pidPath = path.join(root, "product.pid");
  const supervisor = new FormalProcessSupervisor(identity);
  let helperPid = null;
  let productPid = null;
  try {
    const runPromise = supervisor.run({
      requestId: "helper-crash",
      executable: process.execPath,
      argv: [
        "-e",
        "const fs=require('node:fs');fs.writeFileSync(process.argv[1],String(process.pid),{flag:'wx'});process.on('SIGTERM',()=>{});setInterval(()=>{},1000)",
        pidPath,
      ],
      cwd: root,
      stdoutPath: path.join(root, "crash.stdout.log"),
      stderrPath: path.join(root, "crash.stderr.log"),
      timeoutMs: 60_000,
      combinedOutputLimitBytes: 64 * 1024,
      environment: formalCollectorEnvironment(process.env),
    });
    const runFailure = assert.rejects(
      runPromise,
      /formal_process_supervisor_helper_closed/u,
    );
    productPid = Number.parseInt(await waitForFile(pidPath), 10);
    assert.ok(Number.isSafeInteger(productPid) && productPid > 0);
    helperPid = await findSupervisorHelperPid(
      identity.powershell.executable_path,
    );
    await assert.rejects(
      () => supervisor.close(),
      /formal_process_supervisor_close_while_running/u,
    );
    await terminateProcess(helperPid);
    await runFailure;
    await waitForProcessExit(productPid);
    await assert.rejects(
      () => supervisor.close(),
      /formal_process_supervisor_helper_exit/u,
    );
  } finally {
    helperPid ??= await findSupervisorHelperPid(
      identity.powershell.executable_path,
    ).catch(() => null);
    if (helperPid && isProcessAlive(helperPid))
      await terminateProcess(helperPid).catch(() => {});
    await supervisor.close().catch(() => {});
    if (productPid && isProcessAlive(productPid))
      await terminateProcess(productPid).catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
}

export function assertUnsupportedPlatform(identity) {
  const descriptor = Object.getOwnPropertyDescriptor(process, "platform");
  try {
    Object.defineProperty(process, "platform", {
      ...descriptor,
      value: "unsupported-test-platform",
    });
    assert.throws(
      () => new FormalProcessSupervisor(identity),
      /formal_process_supervisor_platform_unsupported/u,
    );
  } finally {
    Object.defineProperty(process, "platform", descriptor);
  }
}

async function findSupervisorHelperPid(powershell) {
  const script = [
    `$parentId=${process.pid}`,
    "$processes=@(Get-CimInstance Win32_Process -Filter \"ParentProcessId = $parentId\" | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*windows_job_process_supervisor.ps1*' })",
    'if($processes.Count -ne 1){throw "helper_count:$($processes.Count)"}',
    "[Console]::Out.WriteLine([string]$processes[0].ProcessId)",
  ].join("\n");
  const { stdout } = await execFileAsync(
    powershell,
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script],
    {
      windowsHide: true,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    },
  );
  const pid = Number.parseInt(stdout.trim(), 10);
  assert.ok(Number.isSafeInteger(pid) && pid > 0);
  return pid;
}

async function waitForFile(target) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    try {
      return await readFile(target, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await delay(50);
    }
  }
  throw new Error("level4_helper_crash_pid_timeout");
}

async function waitForProcessExit(pid) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (!isProcessAlive(pid)) return;
    await delay(25);
  }
  throw new Error(`level4_helper_crash_descendant_alive:${pid}`);
}

async function terminateProcess(pid) {
  await execFileAsync("taskkill.exe", ["/PID", String(pid), "/F"], {
    windowsHide: true,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
