import assert from "node:assert/strict";
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import {
  assertAuthoritativeFormalAcquisitionRuntime,
  createFormalAcquisitionRuntime,
} from "../../tools/long_task_formal_acquisition_runtime.mjs";
import { formalCollectorEnvironment } from "../../tools/long_task_formal_collection_io.mjs";
import { collectFormalTotalCostArtifacts } from "../../tools/long_task_formal_total_cost_collection.mjs";
import { FormalProviderCaptureAdapter } from "../../tools/long_task_formal_provider_capture.mjs";
import { FormalStateCapture } from "../../tools/long_task_formal_state_capture.mjs";
import { FormalProcessSupervisor } from "../../tools/formal_process_supervisor.mjs";
import { createLevel4FormalEvidenceFixture } from "./helpers/long-task-level4-fixture.mjs";
import { buildLevel4RuntimeTcbIdentity } from "./helpers/long-task-level4-runtime-identity.mjs";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const invocationId = "a".repeat(64);
let identity;
let fixture;
before(async () => {
  if (process.platform === "win32")
    identity = (await buildLevel4RuntimeTcbIdentity(repositoryRoot)).runtimeTcbIdentity;
  fixture = await createLevel4FormalEvidenceFixture(repositoryRoot);
});
after(async () => fixture?.remove());

test("[critical:level4-acquisition-runtime-boundary] acquisition authority is private, branded, and non-injectable", { skip: process.platform !== "win32" }, async () => {
  assert.throws(
    () => assertAuthoritativeFormalAcquisitionRuntime({}, identity),
    /formal_acquisition_runtime_authority/u,
  );
  assert.throws(
    () => createFormalAcquisitionRuntime({
      formalInteractionStdin: true,
      runtimeTcbIdentity: identity,
      interactionRecorder: {},
    }),
    /formal_acquisition_runtime_options/u,
  );
  const runtime = createFormalAcquisitionRuntime({
    formalInteractionStdin: true,
    runtimeTcbIdentity: identity,
  });
  assert.equal(assertAuthoritativeFormalAcquisitionRuntime(runtime, identity), runtime);
  await runtime.close();
  assert.throws(
    () => runtime.runProcess({}),
    /formal_acquisition_runtime_closed/u,
  );
});

test("formal collection rejects fake recorder/supervisor injection and external-pending incident input", async () => {
  const options = {
    runSetRoot: fixture.root,
    runSetId: "fixture-run-set-v4",
    runs: fixture.runs,
    preparedByVariant: fixture.preparedByVariant,
    precollection: fixture.precollection,
    accountingPolicy: fixture.accountingPolicy,
    accountingPolicyIdentity: fixture.accountingPolicyIdentity,
    formalInteractionStdin: true,
    runtimeTcbIdentity: identity ?? fixture.runtimeTcbIdentity,
  };
  await assert.rejects(
    () => collectFormalTotalCostArtifacts({ ...options, interactionRecorder: {} }),
    /formal_collection_options/u,
  );
  await assert.rejects(
    () => collectFormalTotalCostArtifacts({ ...options, processSupervisor: {} }),
    /formal_collection_options/u,
  );
  const realNow = Date.now;
  Date.now = () => Date.parse("2026-08-16T04:00:00.000Z");
  try {
    await assert.rejects(
      () => collectFormalTotalCostArtifacts(options),
      /formal_collection_controlled_incident_external_pending/u,
    );
  } finally {
    Date.now = realNow;
  }
});

test("Windows Job supervision preserves argv, child secret exclusion, full-tree cleanup, clocks, CPU, timeout, and overflow", { skip: process.platform !== "win32" }, async () => {
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
      "token with spaces", "literal&token", 'quote"token',
    ]);
    const exactOutput = JSON.parse(await readFile(path.join(root, "exact-argv.stdout.log"), "utf8"));
    assert.deepEqual(exactOutput.argv, ["token with spaces", "literal&token", 'quote"token']);
    assert.equal(exactOutput.secret, null);
    assert.equal(exact.descendants_cleaned, true);
    assert.equal(exact.active_processes_at_result, 0);
    assert.ok(exact.total_cpu_100ns > 0);
    assert.equal(exact.process_monotonic_clock_id, "windows-stopwatch-qpc-v1");
    assert.equal(exact.wall_clock_id, "unix-epoch-ms-v1");
    assert.ok(BigInt(exact.process_monotonic_completed_ns) >= BigInt(exact.process_monotonic_started_ns));
    assert.ok(Date.parse(exact.completed_at) >= Date.parse(exact.started_at));

    const timed = await run("descendant-timeout", [
      "-e",
      "require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)']);setInterval(()=>{},1000)",
    ], 400);
    assert.equal(timed.timed_out, true);
    assert.equal(timed.descendants_cleaned, true);
    assert.equal(timed.active_processes_at_result, 0);
    assert.ok(timed.total_processes >= 2);

    const overflow = await run("stream-overflow", [
      "-e", "process.stdout.write(Buffer.alloc(65536,120))",
    ], 10_000, 1024);
    assert.equal(overflow.output_overflow, true);
    assert.equal(overflow.descendants_cleaned, true);
    assert.equal(overflow.active_processes_at_result, 0);

    await writeFile(path.join(root, "preexisting.stdout.log"), "stale");
    await assert.rejects(
      () => run("preexisting", ["-e", "process.exit(0)"]),
      /formal_process_supervisor_stdout_preexisting/u,
    );
  } finally {
    await supervisor.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("runtime TCB path and executable digest drift fail before supervisor use", { skip: process.platform !== "win32" }, () => {
  const pathDrift = structuredClone(identity);
  pathDrift.runtime.node_exec_path = path.join(path.dirname(process.execPath), "other-node.exe");
  assert.throws(() => new FormalProcessSupervisor(pathDrift), /formal_process_supervisor_runtime_tcb/u);
  const digestDrift = structuredClone(identity);
  digestDrift.powershell.executable_sha256 = "0".repeat(64);
  assert.throws(() => new FormalProcessSupervisor(digestDrift), /formal_process_supervisor_runtime_tcb/u);
});

test("runner-owned State payload is sorted, exact, retained, and package-proxy/hardlink/empty sources fail closed", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-level4-state-"));
  const executionRoot = path.join(root, "formal-evidence", invocationId);
  const retention = {
    status: "frozen_supported", retention_hours: 24,
    basis: "test-contract", source_sha256: "b".repeat(64),
  };
  await mkdir(executionRoot, { recursive: true });
  try {
    const capture = await FormalStateCapture.create({ executionRoot, invocationId });
    await mkdir(path.join(capture.root, "nested"));
    await writeFile(path.join(capture.root, "b.bin"), "beta");
    await writeFile(path.join(capture.root, "nested", "a.bin"), "alpha");
    const payloadPath = path.join(executionRoot, "state-payload.bin");
    const ledgerPath = path.join(executionRoot, "storage-ledger.json");
    const result = await capture.finalize({ payloadPath, ledgerPath, retention });
    assert.equal((await readFile(payloadPath, "utf8")), "betaalpha");
    assert.equal(result.payload_bytes, 9);
    const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
    assert.deepEqual(ledger.entries.map((entry) => entry.path), ["b.bin", "nested/a.bin"]);
    assert.equal(ledger.retention_hours, 24);

    const empty = await FormalStateCapture.create({ executionRoot, invocationId });
    await assert.rejects(
      () => empty.finalize({ payloadPath: path.join(executionRoot, "empty-payload.bin"), ledgerPath: path.join(executionRoot, "empty-ledger.json"), retention }),
      /formal_state_payload_empty_file_set/u,
    );
    await empty.abort();

    const proxy = await FormalStateCapture.create({ executionRoot, invocationId });
    const packagePath = path.join(root, "candidate.tgz");
    await writeFile(packagePath, "package-is-not-state");
    await link(packagePath, path.join(proxy.root, "candidate.tgz"));
    await assert.rejects(
      () => proxy.finalize({ payloadPath: path.join(executionRoot, "proxy-payload.bin"), ledgerPath: path.join(executionRoot, "proxy-ledger.json"), retention }),
      /formal_state_not_regular/u,
    );
    await proxy.abort();

    const linked = await FormalStateCapture.create({ executionRoot, invocationId });
    try {
      await symlink(packagePath, path.join(linked.root, "linked.bin"), "file");
      await assert.rejects(
        () => linked.finalize({ payloadPath: path.join(executionRoot, "link-payload.bin"), ledgerPath: path.join(executionRoot, "link-ledger.json"), retention }),
        /formal_state_link/u,
      );
    } catch (error) {
      if (!["EPERM", "EACCES"].includes(error?.code)) throw error;
      t.diagnostic("file symlink creation unavailable; hardlink rejection remained exercised");
    } finally {
      await linked.abort();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fixed Provider adapter is invocation-bound and fails closed when model or parent credential is unavailable", async () => {
  const adapterIdentity = identity?.provider_adapter ?? {
    adapter_id: "openai-responses-loopback-v1",
    provider: "openai",
    endpoint: "https://api.openai.com/v1/responses",
    identity_sha256: "c".repeat(64),
    support: { model_configured: false },
  };
  const adapter = new FormalProviderCaptureAdapter(adapterIdentity);
  assert.throws(() => adapter.assertAvailable(), /formal_provider_source_unavailable/u);
  await assert.rejects(
    () => adapter.openOneShotBridge({ invocationId }),
    /formal_provider_source_unavailable/u,
  );
});
