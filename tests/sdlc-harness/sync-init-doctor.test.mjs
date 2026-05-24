import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runDoctor } from "../../packages/sdlc-harness/dist/lib/doctor.js";
import { runInit } from "../../packages/sdlc-harness/dist/lib/init.js";
import { runSync } from "../../packages/sdlc-harness/dist/lib/sync-engine.js";

const defaultRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-default-"));
const configuredRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-configured-"));
const cliDefaultRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-cli-default-"));
const cliConfiguredRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-cli-configured-"));
const cliExistingConfigRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-cli-existing-"));
const makefileMergeRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-makefile-merge-"));
const brokenMarkerRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-broken-marker-"));
const cliPath = fileURLToPath(new URL("../../packages/sdlc-harness/dist/cli.js", import.meta.url));

try {
  const initReport = await runInit(defaultRoot, { adopt: true, force: false });
  assert.ok(initReport.some((line) => line.includes("created .agent/config.yaml")));

  const defaultConfig = await readFile(path.join(defaultRoot, ".agent/config.yaml"), "utf8");
  assert.match(defaultConfig, /agent-project-sdlc/);
  const defaultLifecycle = await readFile(path.join(defaultRoot, ".agent/state/lifecycle.yaml"), "utf8");
  assert.doesNotMatch(defaultLifecycle, /history:/);
  await assert.rejects(stat(path.join(defaultRoot, ".agent/state/gate_results.log")));

  const defaultAgents = await readFile(path.join(defaultRoot, "AGENTS.md"), "utf8");
  assert.match(defaultAgents, /pjsdlc:sdlc-harness:begin/);
  const defaultMakefile = await readFile(path.join(defaultRoot, "Makefile"), "utf8");
  assert.match(defaultMakefile, /pjsdlc:sdlc-harness:make:begin/);
  assert.match(defaultMakefile, /-include \.agent\/pjsdlc_managed\/make\/sdlc-harness\.mk/);

  const defaultSyncReport = await runSync(defaultRoot);
  assert.equal(defaultSyncReport.blocked.length, 0);
  await stat(path.join(defaultRoot, ".agent/skills/pjsdlc_manager/SKILL.md"));
  await stat(path.join(defaultRoot, ".agent/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml"));
  await stat(path.join(defaultRoot, ".agent/pjsdlc_managed/policies/phase_contracts.yaml"));
  await assert.rejects(stat(path.join(defaultRoot, ".agent/managed/templates/PLAN_TEMPLATE.yaml")));
  await assert.rejects(stat(path.join(defaultRoot, ".agent/managed/policies/phase_contracts.yaml")));
  await assert.rejects(stat(path.join(defaultRoot, ".agent/templates/PLAN_TEMPLATE.yaml")));
  await assert.rejects(stat(path.join(defaultRoot, ".agent/policies/phase_contracts.yaml")));

  const defaultDoctor = await runDoctor(defaultRoot);
  assert.deepEqual(defaultDoctor.errors, []);
  assert.ok(defaultDoctor.info.some((line) => line.includes("harness root: .agent")));
  assert.ok(defaultDoctor.info.some((line) => line.includes("doctor complete")));

  await writeFile(
    path.join(configuredRoot, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  const configuredInitReport = await runInit(configuredRoot, { adopt: true, force: false });
  assert.ok(configuredInitReport.some((line) => line.includes("created .harness/config.yaml")));

  const configuredSyncReport = await runSync(configuredRoot);
  assert.equal(configuredSyncReport.blocked.length, 0);
  const configuredMakefile = await readFile(path.join(configuredRoot, "Makefile"), "utf8");
  assert.match(configuredMakefile, /-include \.harness\/pjsdlc_managed\/make\/sdlc-harness\.mk/);
  await stat(path.join(configuredRoot, ".harness/skills/pjsdlc_manager/SKILL.md"));
  await stat(path.join(configuredRoot, ".harness/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml"));
  await stat(path.join(configuredRoot, ".harness/pjsdlc_managed/policies/phase_contracts.yaml"));
  await assert.rejects(stat(path.join(configuredRoot, ".harness/state/gate_results.log")));
  await assert.rejects(stat(path.join(configuredRoot, ".harness/managed/templates/PLAN_TEMPLATE.yaml")));
  await assert.rejects(stat(path.join(configuredRoot, ".harness/managed/policies/phase_contracts.yaml")));
  await assert.rejects(stat(path.join(configuredRoot, ".harness/templates/PLAN_TEMPLATE.yaml")));
  await assert.rejects(stat(path.join(configuredRoot, ".harness/policies/phase_contracts.yaml")));

  const configuredDoctor = await runDoctor(configuredRoot);
  assert.deepEqual(configuredDoctor.errors, []);
  assert.ok(configuredDoctor.info.some((line) => line.includes("harness root: .harness")));

  const cliDefault = spawnSync(process.execPath, [cliPath, "init", "--adopt"], {
    cwd: cliDefaultRoot,
    encoding: "utf8"
  });
  assert.equal(cliDefault.status, 0, cliDefault.stderr);
  const cliDefaultPackage = JSON.parse(await readFile(path.join(cliDefaultRoot, "package.json"), "utf8"));
  assert.equal(cliDefaultPackage.sdlcHarness.harnessFolderName, ".agent");
  await stat(path.join(cliDefaultRoot, ".agent/config.yaml"));

  const cliConfigured = spawnSync(process.execPath, [cliPath, "init", "--adopt", "--harness-folder", ".harness"], {
    cwd: cliConfiguredRoot,
    encoding: "utf8"
  });
  assert.equal(cliConfigured.status, 0, cliConfigured.stderr);
  const cliConfiguredPackage = JSON.parse(await readFile(path.join(cliConfiguredRoot, "package.json"), "utf8"));
  assert.equal(cliConfiguredPackage.sdlcHarness.harnessFolderName, ".harness");
  await stat(path.join(cliConfiguredRoot, ".harness/config.yaml"));

  await writeFile(
    path.join(cliExistingConfigRoot, "package.json"),
    JSON.stringify({ name: "existing", sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  const cliExisting = spawnSync(process.execPath, [cliPath, "init", "--adopt"], {
    cwd: cliExistingConfigRoot,
    encoding: "utf8"
  });
  assert.equal(cliExisting.status, 0, cliExisting.stderr);
  const cliExistingPackage = JSON.parse(await readFile(path.join(cliExistingConfigRoot, "package.json"), "utf8"));
  assert.equal(cliExistingPackage.sdlcHarness.harnessFolderName, ".harness");
  await stat(path.join(cliExistingConfigRoot, ".harness/config.yaml"));

  await writeFile(
    path.join(makefileMergeRoot, "Makefile"),
    "PROJECT_VAR := 1\n\nlint:\n\t@echo project lint\n",
    "utf8"
  );
  const makefileMergeReport = await runSync(makefileMergeRoot);
  assert.equal(makefileMergeReport.blocked.length, 0);
  const mergedMakefile = await readFile(path.join(makefileMergeRoot, "Makefile"), "utf8");
  assert.ok(mergedMakefile.indexOf("# pjsdlc:sdlc-harness:make:begin") < mergedMakefile.indexOf("PROJECT_VAR := 1"));
  assert.match(mergedMakefile, /-include \.agent\/pjsdlc_managed\/make\/sdlc-harness\.mk/);
  assert.match(mergedMakefile, /PROJECT_VAR := 1/);
  assert.match(mergedMakefile, /lint:\n\t@echo project lint/);
  const projectLint = spawnSync("make", ["lint"], { cwd: makefileMergeRoot, encoding: "utf8" });
  assert.equal(projectLint.status, 0, projectLint.stderr);
  assert.match(projectLint.stdout, /project lint/);

  await writeFile(path.join(brokenMarkerRoot, "AGENTS.md"), "before\n<!-- pjsdlc:sdlc-harness:begin -->\n", "utf8");
  await writeFile(path.join(brokenMarkerRoot, "Makefile"), "# pjsdlc:sdlc-harness:make:end\n", "utf8");
  const brokenMarkerReport = await runSync(brokenMarkerRoot);
  assert.ok(brokenMarkerReport.blocked.some((line) => line.includes("AGENTS.md")));
  assert.ok(brokenMarkerReport.blocked.some((line) => line.includes("Makefile")));

  const legacyMarkerRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-legacy-marker-"));
  try {
    await writeFile(
      path.join(legacyMarkerRoot, "AGENTS.md"),
      "custom before\n<!-- sdlc-harness:begin -->\nlegacy agents\n<!-- sdlc-harness:end -->\ncustom after\n",
      "utf8"
    );
    await writeFile(
      path.join(legacyMarkerRoot, "Makefile"),
      "# sdlc-harness:make:begin\n-include .agent/managed/make/sdlc-harness.mk\n# sdlc-harness:make:end\n\nlint:\n\t@echo project lint\n",
      "utf8"
    );
    const legacyReport = await runSync(legacyMarkerRoot);
    assert.equal(legacyReport.blocked.length, 0);
    const legacyAgents = await readFile(path.join(legacyMarkerRoot, "AGENTS.md"), "utf8");
    assert.match(legacyAgents, /pjsdlc:sdlc-harness:begin/);
    assert.doesNotMatch(legacyAgents, /<!-- sdlc-harness:begin -->/);
    assert.match(legacyAgents, /custom before/);
    assert.match(legacyAgents, /custom after/);
    const legacyMakefile = await readFile(path.join(legacyMarkerRoot, "Makefile"), "utf8");
    assert.match(legacyMakefile, /pjsdlc:sdlc-harness:make:begin/);
    assert.doesNotMatch(legacyMakefile, /# sdlc-harness:make:begin/);
    assert.match(legacyMakefile, /lint:\n\t@echo project lint/);
  } finally {
    await rm(legacyMarkerRoot, { recursive: true, force: true });
  }
} finally {
  await rm(defaultRoot, { recursive: true, force: true });
  await rm(configuredRoot, { recursive: true, force: true });
  await rm(cliDefaultRoot, { recursive: true, force: true });
  await rm(cliConfiguredRoot, { recursive: true, force: true });
  await rm(cliExistingConfigRoot, { recursive: true, force: true });
  await rm(makefileMergeRoot, { recursive: true, force: true });
  await rm(brokenMarkerRoot, { recursive: true, force: true });
}
