import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  link,
  mkdir,
  mkdtemp,
  rename,
  rm,
  symlink,
  unlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  StaticObservationFreezeError,
  createObservationInputFreezeBudget,
  freezeObservationInputFile,
  freezeStaticObservationCarrier,
} from "../../packages/ty-context/dist/lib/long-task-static-observation-freeze.js";
import { createJsonPointerExactBudget } from "../../packages/ty-context/dist/lib/long-task-json-pointer-observation.js";

const regularMode = 0o100644;

test("static observation freezes pre-run bytes independently from manifest object identity", async () => {
  await withRoot(async (root) => {
    const artifactPath = "generated/runtime-config.json";
    const bytes = Buffer.from(
      JSON.stringify({ observations: { "fact.static": { enabled: true } } }),
    );
    await mkdir(path.join(root, "generated"));
    await writeFile(path.join(root, ...artifactPath.split("/")), bytes);
    const budget = createJsonPointerExactBudget();
    const frozen = await freezeStaticObservationCarrier({
      snapshot_root: root,
      workspace_manifest: manifest(artifactPath, "git:not-a-content-digest"),
      artifact_path: artifactPath,
      budget,
    });

    assert.equal(
      frozen.manifest_membership.manifest_object_identity,
      "git:not-a-content-digest",
    );
    assert.equal(
      frozen.pre_run_identity.content_sha256,
      createHash("sha256").update(bytes).digest("hex"),
    );
    assert.notEqual(
      frozen.pre_run_identity.content_sha256,
      frozen.manifest_membership.manifest_object_identity,
    );
    assert.equal(budget.total_artifact_bytes, bytes.byteLength);

    const verified = await frozen.verifyPostRun();
    assert.deepEqual(verified.post_run_identity, verified.pre_run_identity);
    const externalCopy = verified.copyFrozenBytes();
    externalCopy[0] = 0;
    const extracted = verified.extractJsonPointerExactValue({
      locator: {
        kind: "json_pointer",
        value: "/observations/fact.static",
      },
      sensitivity: "plain",
      budget,
    });
    assert.deepEqual(extracted.raw_value, { enabled: true });
    extracted.raw_value.enabled = false;
    assert.deepEqual(
      verified.extractJsonPointerExactValue({
        locator: {
          kind: "json_pointer",
          value: "/observations/fact.static",
        },
        sensitivity: "plain",
        budget,
      }).raw_value,
      { enabled: true },
    );
    assert.equal(
      extracted.observation.value_sha256,
      createHash("sha256")
        .update(JSON.stringify({ enabled: true }))
        .digest("hex"),
    );
    assert.equal(budget.total_artifact_bytes, bytes.byteLength);
  });
});

test("static observation requires exact pre-run manifest membership", async () => {
  await withRoot(async (root) => {
    await writeFile(path.join(root, "runner-created.json"), "{}", "utf8");
    await assertFreezeError(
      () =>
        freezeStaticObservationCarrier({
          snapshot_root: root,
          workspace_manifest: manifest(),
          artifact_path: "runner-created.json",
        }),
      "static_observation_not_in_pre_run_snapshot",
    );
    await assertFreezeError(
      () =>
        freezeStaticObservationCarrier({
          snapshot_root: root,
          workspace_manifest: manifest("missing.json"),
          artifact_path: "missing.json",
        }),
      "static_observation_not_in_pre_run_snapshot",
    );
    await assertFreezeError(
      () =>
        freezeStaticObservationCarrier({
          snapshot_root: root,
          workspace_manifest: manifest("../outside.json"),
          artifact_path: "../outside.json",
        }),
      "static_observation_path_escape",
    );
  });
});

test("static observation rejects duplicate or non-file manifest membership", async () => {
  await withRoot(async (root) => {
    await writeFile(path.join(root, "duplicate.json"), "{}", "utf8");
    const duplicate = manifest("duplicate.json");
    duplicate.files.push({ ...duplicate.files[0] });
    await assertFreezeError(
      () =>
        freezeStaticObservationCarrier({
          snapshot_root: root,
          workspace_manifest: duplicate,
          artifact_path: "duplicate.json",
        }),
      "static_observation_manifest_invalid",
    );
    const symbolic = manifest("duplicate.json");
    symbolic.files[0].mode = 0o120000;
    await assertFreezeError(
      () =>
        freezeStaticObservationCarrier({
          snapshot_root: root,
          workspace_manifest: symbolic,
          artifact_path: "duplicate.json",
        }),
      "static_observation_not_regular_file",
    );
  });
});

test("static observation detects runner content mutation", async () => {
  await withRoot(async (root) => {
    const artifactPath = "carrier.json";
    await writeFile(path.join(root, artifactPath), '{"value":"before"}');
    const frozen = await freezeStaticObservationCarrier({
      snapshot_root: root,
      workspace_manifest: manifest(artifactPath),
      artifact_path: artifactPath,
    });
    await writeFile(path.join(root, artifactPath), '{"value":"after!"}');
    await assertFreezeError(
      () => frozen.verifyPostRun(),
      "static_observation_changed_by_runner",
    );
  });
});

test("static observation detects runner replacement even when bytes are restored", async () => {
  await withRoot(async (root) => {
    const artifactPath = "carrier.json";
    const absolute = path.join(root, artifactPath);
    const bytes = '{"value":"same"}';
    await writeFile(absolute, bytes);
    const frozen = await freezeStaticObservationCarrier({
      snapshot_root: root,
      workspace_manifest: manifest(artifactPath),
      artifact_path: artifactPath,
    });
    await unlink(absolute);
    await writeFile(absolute, bytes);
    await assertFreezeError(
      () => frozen.verifyPostRun(),
      "static_observation_changed_by_runner",
    );
  });
});

test("static observation detects a transient replacement restored before post-run verification", async () => {
  await withRoot(async (root) => {
    const artifactPath = "carrier.json";
    const absolute = path.join(root, artifactPath);
    const backup = path.join(root, "carrier.original.json");
    const bytes = '{"value":"same"}';
    await writeFile(absolute, bytes);
    const frozen = await freezeStaticObservationCarrier({
      snapshot_root: root,
      workspace_manifest: manifest(artifactPath),
      artifact_path: artifactPath,
    });

    await rename(absolute, backup);
    await writeFile(absolute, '{"value":"forged"}');
    await unlink(absolute);
    await rename(backup, absolute);

    await assertFreezeError(
      () => frozen.verifyPostRun(),
      "static_observation_changed_by_runner",
    );
  });
});

test("static observation detects runner metadata identity mutation", async () => {
  await withRoot(async (root) => {
    const artifactPath = "carrier.json";
    const absolute = path.join(root, artifactPath);
    await writeFile(absolute, "{}", "utf8");
    const frozen = await freezeStaticObservationCarrier({
      snapshot_root: root,
      workspace_manifest: manifest(artifactPath),
      artifact_path: artifactPath,
    });
    const changedTime = new Date(Date.now() + 60_000);
    await utimes(absolute, changedTime, changedTime);
    await assertFreezeError(
      () => frozen.verifyPostRun(),
      "static_observation_changed_by_runner",
    );
  });
});

test("static observation rejects directories and symbolic paths", async () => {
  await withRoot(async (root) => {
    await mkdir(path.join(root, "directory"));
    await assertFreezeError(
      () =>
        freezeStaticObservationCarrier({
          snapshot_root: root,
          workspace_manifest: manifest("directory"),
          artifact_path: "directory",
        }),
      "static_observation_not_regular_file",
    );

    const target = path.join(root, "target.json");
    const link = path.join(root, "linked.json");
    await writeFile(target, "{}", "utf8");
    try {
      await symlink(target, link, "file");
    } catch (error) {
      if (error?.code === "EPERM") return;
      throw error;
    }
    await assertFreezeError(
      () =>
        freezeStaticObservationCarrier({
          snapshot_root: root,
          workspace_manifest: manifest("linked.json"),
          artifact_path: "linked.json",
        }),
      "static_observation_symlink_not_allowed",
    );
  });
});

test("static observation rejects hard-linked carriers", async () => {
  await withRoot(async (root) => {
    const target = path.join(root, "target.json");
    const linked = path.join(root, "linked.json");
    await writeFile(target, "{}", "utf8");
    await link(target, linked);
    await assertFreezeError(
      () =>
        freezeStaticObservationCarrier({
          snapshot_root: root,
          workspace_manifest: manifest("linked.json"),
          artifact_path: "linked.json",
        }),
      "static_observation_hardlink_not_allowed",
    );
  });
});

test("static observation maps a runner symlink switch to carrier change", async () => {
  await withRoot(async (root) => {
    const artifactPath = "carrier.json";
    const absolute = path.join(root, artifactPath);
    const replacement = path.join(root, "replacement.json");
    await writeFile(absolute, '{"value":"before"}', "utf8");
    await writeFile(replacement, '{"value":"after"}', "utf8");
    const frozen = await freezeStaticObservationCarrier({
      snapshot_root: root,
      workspace_manifest: manifest(artifactPath),
      artifact_path: artifactPath,
    });
    await unlink(absolute);
    try {
      await symlink(replacement, absolute, "file");
    } catch (error) {
      if (error?.code === "EPERM") return;
      throw error;
    }
    await assertFreezeError(
      () => frozen.verifyPostRun(),
      "static_observation_changed_by_runner",
    );
  });
});

test("static observation rejects a parent symlink that escapes the snapshot", async () => {
  const outside = await mkdtemp(path.join(os.tmpdir(), "ty-static-outside-"));
  try {
    await writeFile(path.join(outside, "carrier.json"), "{}", "utf8");
    await withRoot(async (root) => {
      try {
        await symlink(
          outside,
          path.join(root, "linked-parent"),
          process.platform === "win32" ? "junction" : "dir",
        );
      } catch (error) {
        if (error?.code === "EPERM") return;
        throw error;
      }
      await assertFreezeError(
        () =>
          freezeStaticObservationCarrier({
            snapshot_root: root,
            workspace_manifest: manifest("linked-parent/carrier.json"),
            artifact_path: "linked-parent/carrier.json",
          }),
        "static_observation_symlink_not_allowed",
      );
    });
  } finally {
    await rm(outside, { recursive: true, force: true });
  }
});

test("static observation enforces the shared exact JSON byte limit", async () => {
  await withRoot(async (root) => {
    const artifactPath = "large.json";
    await writeFile(
      path.join(root, artifactPath),
      Buffer.alloc(1_048_577, 0x20),
    );
    await assertFreezeError(
      () =>
        freezeStaticObservationCarrier({
          snapshot_root: root,
          workspace_manifest: manifest(artifactPath),
          artifact_path: artifactPath,
        }),
      "static_observation_size_limit",
    );
  });
});

test("content freeze admits a product executable beyond the exact JSON byte limit", async () => {
  await withRoot(async (root) => {
    const artifactPath = "bin/product.exe";
    const bytes = Buffer.alloc(1_048_577, 0x5a);
    await mkdir(path.join(root, "bin"));
    await writeFile(path.join(root, ...artifactPath.split("/")), bytes);
    const budget = createObservationInputFreezeBudget({
      max_artifacts: 4,
      max_total_artifact_bytes: 2_097_152,
    });
    const frozen = await freezeObservationInputFile({
      snapshot_root: root,
      workspace_manifest: manifest(artifactPath),
      artifact_path: artifactPath,
      max_file_bytes: 2_097_152,
      budget,
    });

    assert.equal(frozen.pre_run_identity.size, bytes.byteLength);
    assert.equal(budget.total_artifact_bytes, bytes.byteLength);
    const verified = await frozen.verifyPostRun();
    assert.deepEqual(verified.post_run_identity, frozen.pre_run_identity);
    assert.equal("copyFrozenBytes" in verified, false);
  });
});

function manifest(artifactPath, objectIdentity = "git:fixture-object") {
  const files = artifactPath
    ? [
        {
          path: artifactPath,
          mode: regularMode,
          size: 0,
          sha256: objectIdentity,
        },
      ]
    : [];
  return {
    repository_root: "fixture",
    git_head: "fixture-head",
    files,
    fingerprint: {
      head: "fixture-head",
      head_tree: "fixture-tree",
      index_tree: "fixture-tree",
      staged_diff_sha256: "0".repeat(64),
      unstaged_diff_sha256: "0".repeat(64),
      untracked_sha256: "0".repeat(64),
      status_sha256: "0".repeat(64),
      identity: "1".repeat(64),
    },
    snapshot_sha256: "1".repeat(64),
  };
}

async function assertFreezeError(action, code) {
  await assert.rejects(action, (error) => {
    assert.ok(error instanceof StaticObservationFreezeError);
    assert.equal(error.code, code);
    return true;
  });
}

async function withRoot(action) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-static-freeze-"));
  try {
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
