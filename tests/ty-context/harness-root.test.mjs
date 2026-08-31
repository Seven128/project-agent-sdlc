import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readHarnessRootConfig } from "../../packages/ty-context/dist/lib/harness-root.js";

const root = await mkdtemp(path.join(tmpdir(), "ty-context-root-"));

try {
  assert.deepEqual(await readHarnessRootConfig(root), {
    harnessFolderName: ".agent",
    source: "default"
  });

  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify(
      {
        tyContext: { harnessFolderName: ".harness" },
        sdlcHarness: { harnessFolderName: ".legacy" }
      },
      null,
      2
    ),
    "utf8"
  );
  assert.deepEqual(await readHarnessRootConfig(root), {
    harnessFolderName: ".harness",
    source: "package.json#tyContext"
  });

  await writeFile(
    path.join(root, "ty-context.config.json"),
    JSON.stringify({ harnessFloderName: ".workflow" }, null, 2),
    "utf8"
  );
  assert.deepEqual(await readHarnessRootConfig(root), {
    harnessFolderName: ".harness",
    source: "package.json#tyContext"
  });

  await rm(path.join(root, "package.json"), { force: true });
  assert.deepEqual(await readHarnessRootConfig(root), {
    harnessFolderName: ".workflow",
    source: "ty-context.config.json"
  });

  await rm(path.join(root, "ty-context.config.json"), { force: true });
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".codex" } }, null, 2),
    "utf8"
  );
  assert.deepEqual(await readHarnessRootConfig(root), {
    harnessFolderName: ".codex",
    source: "package.json#sdlcHarness"
  });

  await writeFile(
    path.join(root, "sdlc-harness.config.json"),
    JSON.stringify({ harnessFolderName: ".harness" }, null, 2),
    "utf8"
  );
  assert.deepEqual(await readHarnessRootConfig(root), {
    harnessFolderName: ".codex",
    source: "package.json#sdlcHarness"
  });

  await rm(path.join(root, "package.json"), { force: true });
  assert.deepEqual(await readHarnessRootConfig(root), {
    harnessFolderName: ".harness",
    source: "sdlc-harness.config.json"
  });
} finally {
  await rm(root, { recursive: true, force: true });
}

test("top-level script assertions completed", () => {});
