import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { sha256Hex } from "../../packages/ty-context/dist/lib/strict-codec.js";
import { synchronizeRepositoryInputDigests } from "../../tools/migrate_long_task_compact_carrier_authority.mjs";

test("repository-input sync updates exact digests without changing compact input population", async () => {
  const repository = await mkdtemp(
    path.join(os.tmpdir(), "compact-repository-input-sync-"),
  );
  try {
    await mkdir(path.join(repository, "project_context"));
    const sourceRef = "project_context/architecture.md";
    const bytes = Buffer.from("# Architecture\n\n- Current owner.\n", "utf8");
    await writeFile(path.join(repository, ...sourceRef.split("/")), bytes);
    const sourceItemDigest = "a".repeat(64);
    const manifest = {
      inputs: [
        {
          key: "input.context.architecture",
          kind: "context",
          source_ref: sourceRef,
          sha256: "0".repeat(64),
        },
        {
          key: "input.source-item.unchanged",
          kind: "source_item",
          source_ref: "source.item",
          sha256: sourceItemDigest,
        },
      ],
    };
    const beforeKeys = manifest.inputs.map((input) => input.key);
    const first = await synchronizeRepositoryInputDigests(
      repository,
      manifest,
    );
    assert.deepEqual(first, { requested: true, manifest_inputs_updated: 1 });
    assert.deepEqual(
      manifest.inputs.map((input) => input.key),
      beforeKeys,
    );
    assert.equal(manifest.inputs[0].sha256, sha256Hex(await readFile(path.join(repository, ...sourceRef.split("/")))));
    assert.equal(manifest.inputs[1].sha256, sourceItemDigest);
    assert.deepEqual(
      await synchronizeRepositoryInputDigests(repository, manifest),
      { requested: true, manifest_inputs_updated: 0 },
    );
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});
