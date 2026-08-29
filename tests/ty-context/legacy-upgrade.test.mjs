import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runUpgrade } from "../../packages/ty-context/dist/lib/upgrade.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cliPath = path.join(repoRoot, "packages/ty-context/dist/cli.js");
const safeRoot = await mkdtemp(path.join(tmpdir(), "ty-context-legacy-safe-"));
const conflictRoot = await mkdtemp(path.join(tmpdir(), "ty-context-legacy-conflict-"));
const manualRoot = await mkdtemp(path.join(tmpdir(), "ty-context-legacy-manual-"));

try {
  await createLegacyProject(safeRoot);
  await writeFile(
    path.join(safeRoot, "package.json"),
    JSON.stringify({ name: "legacy-safe", sdlcHarness: { harnessFolderName: ".codex", note: "keep" } }, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(safeRoot, "sdlc-harness.config.json"),
    `${JSON.stringify({ harnessFolderName: ".codex", note: "copy" }, null, 2)}\n`,
    "utf8"
  );
  await writeLegacyManagedFiles(safeRoot);
  await writeOldManagedMarkers(safeRoot);

  const packageBefore = await readFile(path.join(safeRoot, "package.json"), "utf8");
  const configBefore = await readFile(path.join(safeRoot, ".codex/config.yaml"), "utf8");
  const check = runCheck(safeRoot);
  assert.equal(check.status, 1, check.stdout + check.stderr);
  const plan = JSON.parse(check.stdout);
  assert.equal(plan.mode, "upgrade-required");
  assert.ok(plan.safe_pending.some((entry) => entry.id === "legacy-sdlc-harness-rename"));
  assert.equal(await readFile(path.join(safeRoot, "package.json"), "utf8"), packageBefore);
  assert.equal(await readFile(path.join(safeRoot, ".codex/config.yaml"), "utf8"), configBefore);
  await assert.rejects(stat(path.join(safeRoot, "ty-context.config.json")));

  const report = await runUpgrade(safeRoot);
  assert.ok(report.some((line) => line.startsWith("migrations changed=")));
  assert.ok(report.some((line) => line.includes("manual_required=0 blocked=0")));
  assert.ok(report.some((line) => line.startsWith("sync changed=")));
  const migratedManifest = await readFile(
    path.join(safeRoot, "project_context/context.toml"),
    "utf8",
  );
  assert.match(migratedManifest, /\[\[context\]\]/u);
  assert.doesNotMatch(migratedManifest, /\[\[context_units\]\]/u);
  assert.doesNotMatch(migratedManifest, /^id = "main-verification"$/mu);
  assert.doesNotMatch(migratedManifest, /^area = "main"$/mu);

  const migratedPackage = JSON.parse(await readFile(path.join(safeRoot, "package.json"), "utf8"));
  assert.equal(migratedPackage.tyContext.harnessFolderName, ".codex");
  assert.equal(migratedPackage.tyContext.note, "keep");
  assert.equal(migratedPackage.sdlcHarness.harnessFolderName, ".codex");
  assert.equal(
    await readFile(path.join(safeRoot, "ty-context.config.json"), "utf8"),
    await readFile(path.join(safeRoot, "sdlc-harness.config.json"), "utf8")
  );

  const migratedConfig = await readFile(path.join(safeRoot, ".codex/config.yaml"), "utf8");
  assert.match(migratedConfig, /\.codex\/ty-context-managed\/context_templates/);
  assert.match(migratedConfig, /\.codex\/ty-context-managed\/make\/ty-context\.mk/);
  assert.doesNotMatch(migratedConfig, /pjsdlc_managed|sdlc-harness\.mk/);
  await stat(path.join(safeRoot, ".codex/skills/context_product_plan/SKILL.md"));
  await stat(path.join(safeRoot, ".codex/ty-context-managed/context_templates/global.md"));
  await stat(path.join(safeRoot, ".codex/pjsdlc_managed/context_templates/global.md"));
  await assert.rejects(stat(path.join(safeRoot, ".agent/skills/context_product_plan/SKILL.md")));

  const agents = await readFile(path.join(safeRoot, "AGENTS.md"), "utf8");
  assert.equal(count(agents, "<!-- ty-context:managed:begin -->"), 1);
  assert.equal(count(agents, "pjsdlc:sdlc-harness"), 0);
  const makefile = await readFile(path.join(safeRoot, "Makefile"), "utf8");
  assert.equal(count(makefile, "# ty-context:make:begin"), 1);
  assert.match(makefile, /-include \.codex\/ty-context-managed\/make\/ty-context\.mk/);
  assert.equal(count(makefile, "sdlc-harness:make"), 0);
  const workflow = await readFile(path.join(safeRoot, ".github/workflows/harness.yml"), "utf8");
  assert.equal(count(workflow, "# ty-context:github-workflow:begin"), 1);
  assert.equal(count(workflow, "pjsdlc:sdlc-harness"), 0);

  await createLegacyProject(conflictRoot);
  await writeFile(
    path.join(conflictRoot, "package.json"),
    JSON.stringify(
      {
        name: "legacy-conflict",
        tyContext: { harnessFolderName: ".codex" },
        sdlcHarness: { harnessFolderName: ".harness" }
      },
      null,
      2
    ),
    "utf8"
  );
  const conflictPackageBefore = await readFile(path.join(conflictRoot, "package.json"), "utf8");
  const conflict = runCheck(conflictRoot);
  assert.equal(conflict.status, 1, conflict.stdout + conflict.stderr);
  const conflictPlan = JSON.parse(conflict.stdout);
  assert.equal(conflictPlan.mode, "manual-required");
  assert.ok(conflictPlan.blocked.some((entry) => entry.id === "legacy-sdlc-harness-rename"));
  const conflictUpgrade = spawnSync(process.execPath, [cliPath, "upgrade"], { cwd: conflictRoot, encoding: "utf8" });
  assert.equal(conflictUpgrade.status, 1, conflictUpgrade.stdout + conflictUpgrade.stderr);
  assert.match(conflictUpgrade.stdout, /blocked: legacy-sdlc-harness-rename/);
  assert.equal(await readFile(path.join(conflictRoot, "package.json"), "utf8"), conflictPackageBefore);
  await assert.rejects(stat(path.join(conflictRoot, "ty-context.config.json")));

  await createLegacyProject(manualRoot);
  await writeFile(
    path.join(manualRoot, "package.json"),
    JSON.stringify({ name: "legacy-manual", sdlcHarness: { harnessFolderName: ".codex" } }, null, 2),
    "utf8"
  );
  await writeLegacyManagedFiles(manualRoot);
  await mkdir(path.join(manualRoot, ".codex/pjsdlc_managed/override_skills"), { recursive: true });
  await writeFile(path.join(manualRoot, ".codex/pjsdlc_managed/override_skills/product.md"), "legacy local rule\n", "utf8");
  await mkdir(path.join(manualRoot, ".codex/ty-context-managed/override_skills"), { recursive: true });
  await writeFile(path.join(manualRoot, ".codex/ty-context-managed/override_skills/ui.md"), "new local rule\n", "utf8");
  await writeFile(path.join(manualRoot, ".codex/pjsdlc_managed/custom.txt"), "unknown\n", "utf8");
  await mkdir(path.join(manualRoot, ".codex/ty-context-managed/context_templates"), { recursive: true });
  await writeFile(path.join(manualRoot, ".codex/ty-context-managed/context_templates/global.md"), "# User content\n", "utf8");
  const manual = runCheck(manualRoot);
  assert.equal(manual.status, 1, manual.stdout + manual.stderr);
  const manualPlan = JSON.parse(manual.stdout);
  assert.equal(manualPlan.mode, "manual-required");
  assert.ok(manualPlan.manual_required.some((entry) => entry.path.endsWith("pjsdlc_managed/override_skills/product.md")));
  assert.ok(manualPlan.manual_required.some((entry) => entry.id === "deprecated-skill-overrides"));
  assert.ok(manualPlan.manual_required.some((entry) => entry.path.endsWith("pjsdlc_managed/custom.txt")));
  assert.ok(manualPlan.blocked.some((entry) => entry.path.endsWith("ty-context-managed/context_templates/global.md")));
} finally {
  await rm(safeRoot, { recursive: true, force: true });
  await rm(conflictRoot, { recursive: true, force: true });
  await rm(manualRoot, { recursive: true, force: true });
}

function runCheck(cwd) {
  return spawnSync(process.execPath, [cliPath, "upgrade", "--check", "--json"], { cwd, encoding: "utf8" });
}

async function createLegacyProject(root) {
  await mkdir(path.join(root, ".codex"), { recursive: true });
  await mkdir(path.join(root, "project_context/areas/main"), { recursive: true });
  await mkdir(path.join(root, ".github/workflows"), { recursive: true });
  await writeFile(path.join(root, "DESIGN.md"), "# Design System\n", "utf8");
  await writeFile(path.join(root, "project_context/global.md"), "# Project / Delivery Context\n", "utf8");
  await writeFile(path.join(root, "project_context/architecture.md"), "# Architecture Context\n", "utf8");
  await writeFile(path.join(root, "project_context/areas/main.md"), "# Area Context: main\n", "utf8");
  await writeFile(path.join(root, "project_context/areas/main/verification.md"), "# Verification Context\n", "utf8");
  await writeFile(
    path.join(root, "project_context/context.toml"),
    `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true

[[context_units]]
id = "main-verification"
path = "project_context/areas/main/verification.md"
role = "verification"
area = "main"
`,
    "utf8"
  );
  await writeFile(
    path.join(root, ".codex/config.yaml"),
    `core:
  package: project-tiny-context-harness
  schema_version: "4"
managed_files:
  - path: AGENTS.md
    strategy: merge-block
  - path: Makefile
    strategy: merge-block
  - path: .codex/skills
    strategy: managed
  - path: .codex/pjsdlc_managed/context_templates
    strategy: managed
  - path: .codex/pjsdlc_managed/make/sdlc-harness.mk
    strategy: managed
  - path: tools
    strategy: managed
  - path: .github/workflows/harness.yml
    strategy: create-if-missing
never_overwrite:
  - project_context/**
`,
    "utf8"
  );
}

async function writeLegacyManagedFiles(root) {
  await mkdir(path.join(root, ".codex/pjsdlc_managed/context_templates"), { recursive: true });
  await mkdir(path.join(root, ".codex/pjsdlc_managed/make"), { recursive: true });
  await writeFile(path.join(root, ".codex/pjsdlc_managed/context_templates/global.md"), "# Old generated global\n", "utf8");
  await writeFile(path.join(root, ".codex/pjsdlc_managed/make/sdlc-harness.mk"), "validate-context:\n\t@echo old\n", "utf8");
}

async function writeOldManagedMarkers(root) {
  await writeFile(
    path.join(root, "AGENTS.md"),
    `# Local Rules

<!-- pjsdlc:sdlc-harness:begin -->
old agents block
<!-- pjsdlc:sdlc-harness:end -->
`,
    "utf8"
  );
  await writeFile(
    path.join(root, "Makefile"),
    `# sdlc-harness:make:begin
-include .codex/pjsdlc_managed/make/sdlc-harness.mk
# sdlc-harness:make:end

test:
\t@echo test
`,
    "utf8"
  );
  await writeFile(
    path.join(root, ".github/workflows/harness.yml"),
    `# pjsdlc:sdlc-harness:github-workflow:begin
name: Old Harness
on: [push]
jobs:
  old:
    runs-on: ubuntu-latest
    steps:
      - run: echo old
# pjsdlc:sdlc-harness:github-workflow:end
`,
    "utf8"
  );
}

function count(content, needle) {
  return content.split(needle).length - 1;
}
