import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sampleRoot = path.join(repoRoot, "examples/minimal-context-sample");

for (const [name, args] of [
  ["sample tests", ["--test", "tests/label-routing.test.mjs"]],
  ["sample Context validation", [path.join(repoRoot, "packages/ty-context/dist/cli.js"), "validate-context"]]
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: sampleRoot,
    encoding: "utf8",
    timeout: 60_000
  });

  assert.equal(result.status, 0, `${name} failed\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
}

test("top-level script assertions completed", () => {});
