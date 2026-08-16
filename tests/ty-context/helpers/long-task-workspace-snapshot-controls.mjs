import assert from "node:assert/strict";
import childProcess, { execFile } from "node:child_process";
import { EventEmitter } from "node:events";
import { readFile, rm, stat, writeFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { PassThrough } from "node:stream";
import { promisify } from "node:util";
import { createWorkspaceSnapshot } from "../../../packages/ty-context/dist/lib/long-task-workspace.js";
import { createDeliveryFixture } from "../long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);

export async function assertWorkspaceSnapshotExtractionControls(t) {
  const fixture = await createDeliveryFixture();
  let snapshot = null;
  let restoreSpawn = null;
  try {
    await exec("git", ["update-index", "--skip-worktree", "src/state.json"], {
      cwd: fixture.root,
    });
    const transient = interceptCheckoutIndex(t, {
      failCount: 1,
      stderr: "",
    });
    restoreSpawn = transient.restore;
    try {
      snapshot = await createWorkspaceSnapshot(
        fixture.root,
        fixture.workdir,
        "transient-checkout-control",
      );
    } finally {
      restoreSpawn();
      restoreSpawn = null;
    }

    assert.equal(transient.calls.length, 2);
    assert.equal(
      new Set(transient.calls.map(checkoutPrefix)).size,
      2,
      "a replay must use a fresh destination instead of a partial root",
    );
    const discardedRoot = checkoutRoot(transient.calls[0]);
    assert.equal(
      await stat(discardedRoot).catch(() => null),
      null,
      "the partial destination must be gone before replay",
    );
    for (const argv of transient.calls)
      assert.equal(argv.includes("--ignore-skip-worktree-bits"), true);
    assert.deepEqual(
      await readFile(path.join(snapshot.root, "src", "state.json")),
      await readFile(path.join(fixture.root, "src", "state.json")),
      "the manifest and materialized snapshot must include skip-worktree files",
    );
    await snapshot.dispose();
    snapshot = null;

    const exhausted = interceptCheckoutIndex(t, {
      failCount: Number.POSITIVE_INFINITY,
      stderr: "",
    });
    restoreSpawn = exhausted.restore;
    try {
      await assert.rejects(
        createWorkspaceSnapshot(
          fixture.root,
          fixture.workdir,
          "exhausted-checkout-control",
        ),
        /git_exit:1:checkout-index[\s\S]*stdout_bytes=0:stderr=$/u,
      );
    } finally {
      restoreSpawn();
      restoreSpawn = null;
    }
    assert.equal(
      exhausted.calls.length,
      2,
      "a second no-diagnostic failure must remain terminal",
    );

    const sourcePath = path.join(fixture.root, "source.md");
    const sourceBefore = await readFile(sourcePath);
    const drifting = interceptCheckoutIndex(t, {
      failCount: 1,
      stderr: "",
      beforeClose: () =>
        writeFile(
          sourcePath,
          Buffer.concat([sourceBefore, Buffer.from("\ndrift\n")]),
        ),
    });
    restoreSpawn = drifting.restore;
    try {
      await assert.rejects(
        createWorkspaceSnapshot(
          fixture.root,
          fixture.workdir,
          "drifting-checkout-control",
        ),
        /workspace_changed_during_snapshot/u,
      );
    } finally {
      restoreSpawn();
      restoreSpawn = null;
      await writeFile(sourcePath, sourceBefore);
    }
    assert.equal(
      drifting.calls.length,
      1,
      "candidate drift must prevent replay",
    );

    const diagnosed = interceptCheckoutIndex(t, {
      failCount: Number.POSITIVE_INFINITY,
      stderr: "fatal: Unable to create '.git/index.lock': File exists.\n",
    });
    restoreSpawn = diagnosed.restore;
    try {
      await assert.rejects(
        createWorkspaceSnapshot(
          fixture.root,
          fixture.workdir,
          "diagnosed-checkout-control",
        ),
        /git_exit:1:checkout-index[\s\S]*stdout_bytes=0:stderr=fatal: Unable to create '.git\/index\.lock': File exists\./u,
      );
    } finally {
      restoreSpawn();
      restoreSpawn = null;
    }
    assert.equal(
      diagnosed.calls.length,
      1,
      "a diagnosed extraction failure must fail closed without replay",
    );
  } finally {
    if (restoreSpawn) restoreSpawn();
    if (snapshot) await snapshot.dispose();
    await rm(fixture.root, { recursive: true, force: true });
  }
}

function interceptCheckoutIndex(t, { failCount, stderr, beforeClose }) {
  const realSpawn = childProcess.spawn;
  const calls = [];
  t.mock.method(childProcess, "spawn", (command, argv = [], options) => {
    if (command === "git" && argv[0] === "checkout-index") {
      calls.push([...argv]);
      if (calls.length <= failCount) return failedGitChild(stderr, beforeClose);
    }
    return realSpawn(command, argv, options);
  });
  syncBuiltinESMExports();
  let restored = false;
  return {
    calls,
    restore() {
      if (restored) return;
      restored = true;
      t.mock.restoreAll();
      syncBuiltinESMExports();
    },
  };
}

function failedGitChild(stderrText, beforeClose) {
  const child = new EventEmitter();
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  setImmediate(async () => {
    try {
      await beforeClose?.();
      if (stderrText) child.stderr.write(stderrText);
      child.stdout.end();
      child.stderr.end();
      child.emit("close", 1, null);
    } catch (error) {
      child.emit("error", error);
    }
  });
  return child;
}

function checkoutPrefix(argv) {
  return argv.find((value) => value.startsWith("--prefix="));
}

function checkoutRoot(argv) {
  return checkoutPrefix(argv).slice("--prefix=".length).replace(/\/$/u, "");
}
