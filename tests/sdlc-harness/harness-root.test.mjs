import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readHarnessRootConfig } from "../../packages/sdlc-harness/dist/lib/harness-root.js";

const root = await mkdtemp(path.join(tmpdir(), "sdlc-harness-root-"));

try {
  assert.deepEqual(await readHarnessRootConfig(root), {
    harnessFolderName: ".agent",
    source: "default"
  });

  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  assert.deepEqual(await readHarnessRootConfig(root), {
    harnessFolderName: ".harness",
    source: "package.json#sdlcHarness"
  });

  await writeFile(
    path.join(root, "sdlc-harness.config.json"),
    JSON.stringify({ harnessFloderName: ".workflow" }, null, 2),
    "utf8"
  );
  assert.deepEqual(await readHarnessRootConfig(root), {
    harnessFolderName: ".workflow",
    source: "sdlc-harness.config.json"
  });
} finally {
  await rm(root, { recursive: true, force: true });
}
