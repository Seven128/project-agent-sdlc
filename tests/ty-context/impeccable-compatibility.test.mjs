import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ANTIPATTERNS, detectText } from "impeccable";
import { createDesignMdIfMissing } from "../../packages/ty-context/dist/lib/design-md.js";

const packageEntry = fileURLToPath(import.meta.resolve("impeccable"));
const packageRoot = path.resolve(path.dirname(packageEntry), "../..");
const cliEntry = path.join(packageRoot, "cli", "bin", "cli.js");
const findingSource =
  ".hero { background: linear-gradient(to right, purple, cyan); background-clip: text; color: transparent; }";

test("impeccable exposes the local detector API and CLI required by Tiny Context", async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(packageRoot, "package.json"), "utf8"),
  );

  assert.equal(packageJson.name, "impeccable");
  assert.match(packageJson.version, /^3\./u);
  assert.equal(packageJson.bin.impeccable, "cli/bin/cli.js");
  assert.equal(packageJson.exports["."], "./cli/engine/detect-antipatterns.mjs");
  assert.match(packageJson.engines.node, />=22/u);
  assert.equal(typeof detectText, "function");
  assert.ok(
    ANTIPATTERNS.some((entry) => entry.id === "gradient-text"),
    "the detector registry must retain the workflow's representative rule",
  );
});

test("impeccable findings are deterministic JSON-ready review signals, not authority candidates", () => {
  const first = detectText(findingSource, "fixture.css");
  const second = detectText(findingSource, "fixture.css");

  assert.deepEqual(second, first);
  const finding = first.find((entry) => entry.antipattern === "gradient-text");
  assert.ok(finding);
  assert.equal(finding.file, "fixture.css");
  assert.equal(typeof finding.description, "string");
  assert.equal(typeof finding.severity, "string");
  assert.equal(typeof finding.line, "number");
  assert.doesNotThrow(() => JSON.stringify(first));
  for (const forbidden of [
    "adopted",
    "authority_updated",
    "candidate",
    "provider",
    "provenance",
    "selected",
  ]) {
    assert.equal(forbidden in finding, false);
  }
});

test("impeccable CLI preserves JSON, finding and argument-error exit semantics", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "impeccable-compatibility-"));
  try {
    const findingPath = path.join(root, "finding.css");
    const cleanPath = path.join(root, "clean.css");
    await writeFile(findingPath, findingSource, "utf8");
    await writeFile(cleanPath, ".content { margin: 0; }\n", "utf8");

    const first = runCli(["detect", "--json", "--no-config", findingPath]);
    const second = runCli(["detect", "--json", "--no-config", findingPath]);
    assert.equal(first.status, 2, first.stderr);
    assert.equal(second.status, 2, second.stderr);
    assert.deepEqual(JSON.parse(second.stdout), JSON.parse(first.stdout));
    assert.ok(
      JSON.parse(first.stdout).some(
        (entry) => entry.antipattern === "gradient-text",
      ),
    );

    const clean = runCli(["detect", "--json", "--no-config", cleanPath]);
    assert.equal(clean.status, 0, clean.stderr);
    assert.deepEqual(JSON.parse(clean.stdout), []);

    const invalid = runCli(["detect", "--scope", "not-a-scope", cleanPath]);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /unknown --scope value/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("generated DESIGN guidance keeps Impeccable local and advisory", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "impeccable-design-md-"));
  try {
    assert.equal(await createDesignMdIfMissing(root), true);
    const content = await readFile(path.join(root, "DESIGN.md"), "utf8");
    assert.match(content, /npx impeccable detect <target>/u);
    assert.match(content, /findings as design-review signals/iu);
    assert.doesNotMatch(content, /impeccable.*(?:adopt|authority|provider)/iu);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function runCli(argv) {
  return spawnSync(process.execPath, [cliEntry, ...argv], {
    cwd: packageRoot,
    encoding: "utf8",
    windowsHide: true,
  });
}
