import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
import { collectRealProcessRoi } from "../../tools/long_task_real_process_roi_runner.mjs";
import { FormalProcessSupervisor } from "../../tools/formal_process_supervisor.mjs";
import { createLevel4FormalEvidenceFixture } from "./helpers/long-task-level4-fixture.mjs";
import { buildLevel4RuntimeTcbIdentity } from "./helpers/long-task-level4-runtime-identity.mjs";
import {
  assertCanonicalTimestamp,
  assertClosedProcessTree,
  runRealChainChild,
} from "./helpers/long-task-level4-test-utils.mjs";
import {
  assertHelperCrashAndCloseControls,
  assertNestedJobAndBreakawayControls,
  assertUnsupportedPlatform,
} from "./helpers/long-task-level4-supervisor-controls.mjs";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
let identity;
let fixture;
before(async () => {
  if (process.platform === "win32")
    identity = (await buildLevel4RuntimeTcbIdentity(repositoryRoot))
      .runtimeTcbIdentity;
  fixture = await createLevel4FormalEvidenceFixture(repositoryRoot);
});
after(async () => fixture?.remove());

test(
  "[critical:level4-acquisition-runtime-boundary] acquisition authority is private, branded, and non-injectable",
  { skip: process.platform !== "win32" },
  async () => {
    assert.throws(
      () => assertAuthoritativeFormalAcquisitionRuntime({}, identity),
      /formal_acquisition_runtime_authority/u,
    );
    assert.throws(
      () =>
        createFormalAcquisitionRuntime({
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
    assert.equal(
      assertAuthoritativeFormalAcquisitionRuntime(runtime, identity),
      runtime,
    );
    await runtime.close();
    assert.throws(
      () => runtime.runProcess({}),
      /formal_acquisition_runtime_closed/u,
    );
  },
);

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
    () =>
      collectFormalTotalCostArtifacts({ ...options, interactionRecorder: {} }),
    /formal_collection_options/u,
  );
  await assert.rejects(
    () =>
      collectFormalTotalCostArtifacts({ ...options, processSupervisor: {} }),
    /formal_collection_options/u,
  );
  for (const injected of [
    { interactionRecorder: {} },
    { supervisorFactory: () => ({}) },
  ])
    await assert.rejects(
      () => collectRealProcessRoi({ candidate: "HEAD", ...injected }),
      /real_process_roi_collection_options/u,
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

test(
  "Windows Job supervision preserves argv, child secret exclusion, full-tree cleanup, clocks, CPU, timeout, and overflow",
  { skip: process.platform !== "win32" },
  async () => {
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
      assert.equal(
        exact.process_monotonic_clock_id,
        "windows-stopwatch-qpc-v1",
      );
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
  },
);

test(
  "runtime TCB path and executable digest drift fail before supervisor use",
  { skip: process.platform !== "win32" },
  () => {
    const pathDrift = structuredClone(identity);
    pathDrift.runtime.node_exec_path = path.join(
      path.dirname(process.execPath),
      "other-node.exe",
    );
    assert.throws(
      () => new FormalProcessSupervisor(pathDrift),
      /formal_process_supervisor_runtime_tcb/u,
    );
    const digestDrift = structuredClone(identity);
    digestDrift.powershell.executable_sha256 = "0".repeat(64);
    assert.throws(
      () => new FormalProcessSupervisor(digestDrift),
      /formal_process_supervisor_runtime_tcb/u,
    );
  },
);

test(
  "Windows Job rejects nested breakaway and assignment attacks",
  { skip: process.platform !== "win32", timeout: 60_000 },
  async () => {
    await assertNestedJobAndBreakawayControls({ identity, repositoryRoot });
  },
);

test(
  "Windows Job close kills an ignore-terminate descendant when the helper crashes",
  { skip: process.platform !== "win32", timeout: 60_000 },
  async () => {
    await assertHelperCrashAndCloseControls(identity);
  },
);

test(
  "formal supervisor rejects an unsupported platform before helper launch",
  { skip: process.platform !== "win32" },
  () => assertUnsupportedPlatform(identity),
);

test(
  "real Windows Job execution reaches event, manifest v2, immutable index, execution validation, and an external-pending evaluator result",
  { skip: process.platform !== "win32", timeout: 180_000 },
  async () => {
    const helper = path.join(
      repositoryRoot,
      "tests",
      "ty-context",
      "helpers",
      "long-task-level4-real-chain-child.mjs",
    );
    const result = await runRealChainChild(helper, repositoryRoot);
    assert.match(
      result.event_path,
      /^formal-evidence\/[a-f0-9]{64}\/event\.json$/u,
    );
    assert.equal(
      result.manifest_schema,
      "long-task-real-process-roi-manifest-v2",
    );
    assert.ok(result.indexed_files >= 586);
    assert.match(result.execution_id, /^[a-f0-9]{64}$/u);
    assert.match(result.runtime_tcb_identity_sha256, /^[a-f0-9]{64}$/u);
    assert.equal(result.admitted, true);
    assert.equal(result.support_complete, false);
    assert.deepEqual(result.blockers, ["controlled_incident_external_pending"]);
  },
);
