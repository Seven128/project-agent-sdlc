import assert from "node:assert/strict";
import {
  createProcessTreeController,
} from "../../../packages/ty-context/dist/lib/long-task-process-tree.js";
import {
  windowsTaskkillArguments,
} from "../../../packages/ty-context/dist/lib/long-task-process-tree-runtime.js";

export async function assertProcessTreeIdentityControls() {
  assert.deepEqual(windowsTaskkillArguments(41), ["/PID", "41", "/F"]);
  await assertStaleParentAndRootReuseAllowed();
  await assertUnobservedOldChildUnderReusedRootBlocks();
  await assertUnboundRootReuseClassifiedByCreation();
  await assertChildPidReuseAllowed();
  await assertReuseBetweenLivenessAndKillAllowed();
  await assertBoundChildPostCloseDescendantKilled();
  await assertLiveTreeKilledDeepestFirst();
  await assertIdentityAmbiguityBlocksWithoutKill();
  await assertInspectionFailureBlocksWithoutKill();
}

async function assertStaleParentAndRootReuseAllowed() {
  const fixture = fakeWindowsRuntime([
    row(10, 1, 1050),
    row(20, 10, 1040),
  ]);
  const controller = createController(fixture);
  await controller.observeUntil(() => true);
  fixture.rootOpen = false;
  fixture.rows = [row(10, 1, 1200), row(20, 10, 1201)];
  await controller.assertQuiescent(1300);
  assert.deepEqual(fixture.kills, []);
  assert.deepEqual(fixture.rootKills, []);
}

async function assertUnobservedOldChildUnderReusedRootBlocks() {
  const fixture = fakeWindowsRuntime([row(10, 1, 1050)]);
  const controller = createController(fixture);
  await controller.observeUntil(() => true);
  fixture.rootOpen = false;
  fixture.rows = [row(10, 1, 1200), row(20, 10, 1100)];
  await assert.rejects(
    controller.assertQuiescent(1150),
    /process_observer_process_tree_identity_ambiguous/u,
  );
  assert.deepEqual(fixture.kills, []);
  assert.deepEqual(fixture.rootKills, []);
}

async function assertUnboundRootReuseClassifiedByCreation() {
  const oldChild = fakeWindowsRuntime([
    row(10, 1, 1200),
    row(20, 10, 1100),
  ]);
  oldChild.rootOpen = false;
  await assert.rejects(
    createController(oldChild).assertQuiescent(1300),
    /process_observer_process_tree_identity_ambiguous/u,
  );
  assert.deepEqual(oldChild.kills, []);

  const newChild = fakeWindowsRuntime([
    row(10, 1, 1200),
    row(20, 10, 1201),
  ]);
  newChild.rootOpen = false;
  await createController(newChild).assertQuiescent(1300);
  assert.deepEqual(newChild.kills, []);
}

async function assertChildPidReuseAllowed() {
  const fixture = fakeWindowsRuntime([row(10, 1, 1050), row(20, 10, 1060)]);
  const controller = createController(fixture);
  await controller.observeUntil(() => true);
  fixture.rootOpen = false;
  fixture.rows = [row(20, 99, 1200)];
  await controller.assertQuiescent(1150);
  assert.deepEqual(fixture.kills, []);
}

async function assertReuseBetweenLivenessAndKillAllowed() {
  const fixture = fakeWindowsRuntime([row(10, 1, 1050), row(20, 10, 1060)]);
  const controller = createController(fixture);
  await controller.observeUntil(() => true);
  fixture.rootOpen = false;
  fixture.rows = [row(20, 10, 1060)];
  let snapshots = 0;
  fixture.runtime.snapshot = async () => {
    snapshots += 1;
    if (snapshots === 4) fixture.rows = [row(20, 99, 1200)];
    return structuredClone(fixture.rows);
  };
  await assert.rejects(
    controller.assertQuiescent(1150),
    /process_observer_descendant_process_alive/u,
  );
  assert.deepEqual(fixture.kills, []);
}

async function assertBoundChildPostCloseDescendantKilled() {
  const fixture = fakeWindowsRuntime([row(10, 1, 1050), row(20, 10, 1060)]);
  const controller = createController(fixture);
  await controller.observeUntil(() => true);
  fixture.rootOpen = false;
  fixture.rows = [row(20, 10, 1060), row(30, 20, 1160)];
  await assert.rejects(
    controller.assertQuiescent(1150),
    /process_observer_descendant_process_alive/u,
  );
  assert.deepEqual(
    fixture.kills.map(({ pid }) => pid),
    [30, 20],
  );
}

async function assertLiveTreeKilledDeepestFirst() {
  const fixture = fakeWindowsRuntime([
    row(10, 1, 1050),
    row(20, 10, 1060),
    row(30, 20, 1070),
  ]);
  const controller = createController(fixture);
  await controller.observeUntil(() => true);
  fixture.rootOpen = false;
  fixture.rows = [row(20, 10, 1060), row(30, 20, 1070)];
  await assert.rejects(
    controller.assertQuiescent(1150),
    /process_observer_descendant_process_alive/u,
  );
  assert.deepEqual(
    fixture.kills.map(({ pid }) => pid),
    [30, 20],
  );
  assert.deepEqual(fixture.rootKills, []);
}

async function assertIdentityAmbiguityBlocksWithoutKill() {
  const fixture = fakeWindowsRuntime([
    { pid: 10, parent_pid: 1, creation_filetime_utc: null },
  ]);
  const controller = createController(fixture);
  await controller.observeUntil(() => true);
  await assert.rejects(
    controller.assertQuiescent(1150),
    /process_observer_process_tree_identity_ambiguous/u,
  );
  assert.deepEqual(fixture.kills, []);
  assert.deepEqual(fixture.rootKills, []);
}

async function assertInspectionFailureBlocksWithoutKill() {
  const fixture = fakeWindowsRuntime([]);
  fixture.runtime.snapshot = async () => {
    throw new Error("process_observer_process_tree_inspection_unavailable:test");
  };
  await assert.rejects(
    createController(fixture).assertQuiescent(1150),
    /process_observer_process_tree_inspection_unavailable:test/u,
  );
  assert.deepEqual(fixture.kills, []);
  assert.deepEqual(fixture.rootKills, []);
}

function createController(fixture) {
  return createProcessTreeController(
    {
      rootPid: 10,
      spawnedAtMs: 1000,
      rootIsOpen: () => fixture.rootOpen,
      terminateRoot: (force) => fixture.rootKills.push(force),
    },
    fixture.runtime,
  );
}

function fakeWindowsRuntime(initialRows) {
  const fixture = {
    clock: 2000,
    rootOpen: true,
    rows: structuredClone(initialRows),
    kills: [],
    rootKills: [],
    runtime: null,
  };
  fixture.runtime = {
    kind: "windows",
    now: () => fixture.clock,
    sleep: async (milliseconds) => {
      fixture.clock += milliseconds;
    },
    snapshot: async () => structuredClone(fixture.rows),
    terminatePid: async (pid, force) => {
      fixture.kills.push({ pid, force });
      fixture.rows = fixture.rows.filter((item) => item.pid !== pid);
    },
    terminateGroup: async () => assert.fail("Windows must not signal a group"),
    processIdExists: () => false,
    processGroupExists: () => false,
  };
  return fixture;
}

function row(pid, parentPid, createdAtMs) {
  return {
    pid,
    parent_pid: parentPid,
    creation_filetime_utc: filetime(createdAtMs),
  };
}

function filetime(milliseconds) {
  return ((BigInt(milliseconds) + 11_644_473_600_000n) * 10_000n).toString();
}
