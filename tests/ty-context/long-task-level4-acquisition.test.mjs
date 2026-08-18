import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import {
  assertAuthoritativeFormalAcquisitionRuntime,
  createFormalAcquisitionRuntime,
} from "../../tools/long_task_formal_acquisition_runtime.mjs";
import { collectFormalTotalCostArtifacts } from "../../tools/long_task_formal_total_cost_collection.mjs";
import {
  collectRealProcessRoi,
  validateFormalCollectionRuntimeBoundary,
} from "../../tools/long_task_real_process_roi_runner.mjs";
import { FormalProcessSupervisor } from "../../tools/formal_process_supervisor.mjs";
import { createLevel4FormalEvidenceFixture } from "./helpers/long-task-level4-fixture.mjs";
import { buildLevel4RuntimeTcbIdentity } from "./helpers/long-task-level4-runtime-identity.mjs";
import { runRealChainChild } from "./helpers/long-task-level4-test-utils.mjs";
import {
  assertHelperCrashAndCloseControls,
  assertNestedJobAndBreakawayControls,
  assertSupervisorRuntimeControls,
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
  "[critical:level4-acquisition-runtime-boundary] acquisition authority is private, non-injectable, source-gated, and platform fail-closed",
  async () => {
    const runtimeTcbIdentity = identity ?? fixture.runtimeTcbIdentity;
    assert.throws(
      () => assertAuthoritativeFormalAcquisitionRuntime({}, runtimeTcbIdentity),
      /formal_acquisition_runtime_authority/u,
    );
    assert.throws(
      () =>
        createFormalAcquisitionRuntime({
          formalInteractionStdin: true,
          runtimeTcbIdentity,
          interactionRecorder: {},
        }),
      /formal_acquisition_runtime_options/u,
    );
    const options = {
      runSetRoot: fixture.root,
      runSetId: "fixture-run-set-v4",
      runs: fixture.runs,
      preparedByVariant: fixture.preparedByVariant,
      precollection: fixture.precollection,
      accountingPolicy: fixture.accountingPolicy,
      accountingPolicyIdentity: fixture.accountingPolicyIdentity,
      formalInteractionStdin: true,
      runtimeTcbIdentity,
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

    if (process.platform === "win32") {
      const runtime = createFormalAcquisitionRuntime({
        formalInteractionStdin: true,
        runtimeTcbIdentity,
      });
      assert.equal(
        assertAuthoritativeFormalAcquisitionRuntime(runtime, runtimeTcbIdentity),
        runtime,
      );
      await runtime.close();
      assert.throws(
        () => runtime.runProcess({}),
        /formal_acquisition_runtime_closed/u,
      );
    } else
      assert.throws(
        () =>
          createFormalAcquisitionRuntime({
            formalInteractionStdin: true,
            runtimeTcbIdentity,
          }),
        /formal_process_supervisor_platform_unsupported/u,
      );
  },
);

test(
  "Windows Job supervision preserves argv, child secret exclusion, full-tree cleanup, clocks, CPU, timeout, and overflow",
  { skip: process.platform !== "win32" },
  () => assertSupervisorRuntimeControls(identity),
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
    const sourceDrift = structuredClone(identity);
    sourceDrift.supervisor_entries.find(
      (entry) => entry.path === "tools/formal_process_supervisor.mjs",
    ).sha256 = "0".repeat(64);
    assert.throws(
      () => new FormalProcessSupervisor(sourceDrift),
      /formal_process_supervisor_source_tcb/u,
    );
  },
);

test(
  "formal collection boundary rechecks candidate bytes, executing bytes, and the complete host/runtime TCB",
  { skip: process.platform !== "win32" },
  async () => {
    const current = await buildLevel4RuntimeTcbIdentity(repositoryRoot);
    const frozenConfig = {
      benchmark_implementation_identity:
        current.benchmarkImplementationIdentity,
      formal_runtime_tcb_identity: current.runtimeTcbIdentity,
      environment: current.environment,
    };
    await validateFormalCollectionRuntimeBoundary({
      repositoryRoot,
      frozenConfig,
    });
    const candidateSourceDrift = structuredClone(frozenConfig);
    candidateSourceDrift.benchmark_implementation_identity.entries[0].sha256 =
      "0".repeat(64);
    await assert.rejects(
      () =>
        validateFormalCollectionRuntimeBoundary({
          repositoryRoot,
          frozenConfig: candidateSourceDrift,
        }),
      /formal_collection_candidate_benchmark_identity_changed/u,
    );
    const hostDrift = structuredClone(frozenConfig);
    hostDrift.formal_runtime_tcb_identity.windows.build += 1;
    await assert.rejects(
      () =>
        validateFormalCollectionRuntimeBoundary({
          repositoryRoot,
          frozenConfig: hostDrift,
        }),
      /formal_runtime_tcb_identity/u,
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
