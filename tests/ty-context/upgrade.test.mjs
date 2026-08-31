import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import { runSync } from "../../packages/ty-context/dist/lib/sync-engine.js";
import { runUpgrade } from "../../packages/ty-context/dist/lib/upgrade.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const cliPath = path.join(repoRoot, "packages/ty-context/dist/cli.js");
const root = await mkdtemp(path.join(tmpdir(), "ty-context-upgrade-minimal-"));
const existingManifestRoot = await mkdtemp(
  path.join(tmpdir(), "ty-context-upgrade-existing-manifest-"),
);
const missingSectionsRoot = await mkdtemp(
  path.join(tmpdir(), "ty-context-upgrade-missing-sections-"),
);
const futureSchemaRoot = await mkdtemp(
  path.join(tmpdir(), "ty-context-upgrade-future-schema-"),
);
const manualRoot = await mkdtemp(
  path.join(tmpdir(), "ty-context-upgrade-manual-"),
);
const blockedRoot = await mkdtemp(
  path.join(tmpdir(), "ty-context-upgrade-blocked-"),
);
const retiredSourcePlanSkill = path.join(
  root,
  ".harness/skills/source-plan-authoring/SKILL.md",
);

try {
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }, null, 2),
    "utf8",
  );
  await runInit(root, { adopt: true, force: false });
  await mkdir(path.dirname(retiredSourcePlanSkill), { recursive: true });
  await writeFile(
    retiredSourcePlanSkill,
    await readFile(
      path.join(
        repoRoot,
        "tests/ty-context/fixtures/removed-source-plan-authoring-SKILL.md",
      ),
      "utf8",
    ),
    "utf8",
  );
  await rm(path.join(root, "DESIGN.md"), { force: true });
  await rm(path.join(root, "project_context/context.toml"), { force: true });
  await rm(path.join(root, "project_context/global.md"), { force: true });
  await rm(path.join(root, "project_context/architecture.md"), { force: true });
  await rm(path.join(root, "project_context/modules/main.md"), { force: true });
  await mkdir(path.join(root, "project_context/modules/analytics"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, "project_context/modules/analytics/reporting.md"),
    `# Module Context: reporting

## Responsibility

- Summarize reporting behavior.

## User / System Contract

- Users can inspect reporting outputs.

## Core Data / API / State

- Reporting reads project data and emits summaries.

## Key Constraints

- Keep reporting facts compact.

## Code Entry Points

- src/reporting

## Test Entry Points

- npm test

## Open Risks

- Reporting context may need later role refinement.
`,
    "utf8",
  );

  await mkdir(path.join(root, ".work_products/01_product"), {
    recursive: true,
  });
  await mkdir(path.join(root, ".harness/state"), { recursive: true });
  await writeFile(
    path.join(root, ".work_products/01_product/prd.md"),
    "# Legacy PRD\n",
    "utf8",
  );
  await writeFile(
    path.join(root, ".harness/state/lifecycle.yaml"),
    'current_phase: "SPRINTING"\n',
    "utf8",
  );
  await writeFile(
    path.join(root, ".harness/config.yaml"),
    `core:
  package: "project-tiny-context-harness"
  schema_version: "1"
managed_files:
  - path: "AGENTS.md"
    strategy: "merge-block"
  - path: ".harness/skills"
    strategy: "managed"
  - path: ".harness/ty-context-managed/templates"
    strategy: "managed"
never_overwrite:
  - ".work_products/**"
  - ".harness/state/**"
`,
    "utf8",
  );

  const checkBefore = spawnSync(
    process.execPath,
    [cliPath, "upgrade", "--check", "--json"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
  assert.equal(checkBefore.status, 1, checkBefore.stdout + checkBefore.stderr);
  const checkBeforeJson = JSON.parse(checkBefore.stdout);
  assert.equal(checkBeforeJson.mode, "upgrade-required");
  assert.ok(
    checkBeforeJson.safe_pending.some(
      (entry) => entry.id === "legacy-modules-to-areas",
    ),
  );
  assert.ok(
    checkBeforeJson.safe_pending.some(
      (entry) => entry.id === "context-manifest-baseline",
    ),
  );
  assert.ok(
    checkBeforeJson.safe_pending.some(
      (entry) => entry.id === "remove-source-plan-authoring-skill",
    ),
  );
  await stat(path.join(root, "project_context/modules/analytics/reporting.md"));
  const configBeforeUpgrade = await readFile(
    path.join(root, ".harness/config.yaml"),
    "utf8",
  );
  assert.match(configBeforeUpgrade, /schema_version: "1"/);

  const report = await runUpgrade(root);
  assert.ok(report.some((line) => line.startsWith("migrations changed=")));
  assert.ok(
    report.some((line) => line.includes("manual_required=0 blocked=0")),
  );
  assert.ok(report.some((line) => line.startsWith("sync changed=")));
  assert.ok(!report.some((line) => line.includes("migrate-context")));
  await assert.rejects(stat(retiredSourcePlanSkill));

  await stat(path.join(root, "project_context/global.md"));
  await stat(path.join(root, "project_context/context.toml"));
  await stat(path.join(root, "project_context/architecture.md"));
  await stat(path.join(root, "project_context/areas/main.md"));
  await stat(path.join(root, "project_context/areas/main/verification.md"));
  await stat(path.join(root, "project_context/areas/analytics/reporting.md"));
  await assert.rejects(
    stat(path.join(root, "project_context/modules/analytics/reporting.md")),
  );
  await stat(path.join(root, "DESIGN.md"));
  await stat(path.join(root, ".work_products/01_product/prd.md"));
  await stat(path.join(root, ".harness/state/lifecycle.yaml"));

  const config = await readFile(
    path.join(root, ".harness/config.yaml"),
    "utf8",
  );
  assert.match(config, /schema_version: "4"/);
  assert.match(config, /\.harness\/ty-context-managed\/context_templates/);
  assert.match(config, /\.harness\/skills/);
  assert.match(config, /project_context\/\*\*/);
  assert.match(config, /DESIGN\.md/);
  assert.doesNotMatch(config, /\.harness\/ty-context-managed\/templates/);

  const migratedManifest = await readFile(
    path.join(root, "project_context/context.toml"),
    "utf8",
  );
  assert.match(migratedManifest, /Auto-created by upgrade/);
  assert.match(migratedManifest, /Review deep or non-area context/);
  assert.match(
    migratedManifest,
    /subdomain, contract, foundation, verification, deployment/,
  );
  assert.match(migratedManifest, /id = "main"/);
  assert.match(
    migratedManifest,
    /context = "project_context\/areas\/main\.md"/,
  );
  assert.match(
    migratedManifest,
    /path = "project_context\/areas\/main\/verification\.md"/,
  );
  assert.match(migratedManifest, /role = "verification"/);
  assert.match(migratedManifest, /id = "analytics-reporting"/);
  assert.match(
    migratedManifest,
    /context = "project_context\/areas\/analytics\/reporting\.md"/,
  );

  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /Minimal Context Harness/);
  const makefile = await readFile(path.join(root, "Makefile"), "utf8");
  assert.match(
    makefile,
    /-include \.harness\/ty-context-managed\/make\/ty-context\.mk/,
  );
  await stat(path.join(root, ".harness/skills/context_product_plan/SKILL.md"));
  await stat(path.join(root, ".harness/skills/context_uiux_design/SKILL.md"));
  await stat(
    path.join(root, ".harness/skills/design-resource-authoring/SKILL.md"),
  );
  await stat(
    path.join(root, ".harness/skills/context_development_engineer/SKILL.md"),
  );
  await stat(
    path.join(root, ".harness/ty-context-managed/context_templates/global.md"),
  );

  await writeFile(
    path.join(existingManifestRoot, "package.json"),
    JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }, null, 2),
    "utf8",
  );
  await runInit(existingManifestRoot, { adopt: true, force: false });
  await rm(path.join(existingManifestRoot, "project_context/areas/main.md"), {
    force: true,
  });
  await rm(path.join(existingManifestRoot, "project_context/areas/main"), {
    recursive: true,
    force: true,
  });
  await writeFile(
    path.join(existingManifestRoot, "project_context/areas/custom.md"),
    "# Custom Area\n",
    "utf8",
  );
  const customManifest = `# Custom manifest

[[areas]]
id = "custom"
root = "."
context = "project_context/areas/custom.md"
kind = "app"
default = true
`;
  await writeFile(
    path.join(existingManifestRoot, "project_context/context.toml"),
    customManifest,
    "utf8",
  );
  await runUpgrade(existingManifestRoot);
  const keptManifest = await readFile(
    path.join(existingManifestRoot, "project_context/context.toml"),
    "utf8",
  );
  assert.equal(keptManifest, customManifest);
  await assert.rejects(
    stat(path.join(existingManifestRoot, "project_context/areas/main.md")),
  );
  await assert.rejects(
    stat(
      path.join(
        existingManifestRoot,
        "project_context/areas/main/verification.md",
      ),
    ),
  );

  await writeFile(
    path.join(missingSectionsRoot, "package.json"),
    JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }, null, 2),
    "utf8",
  );
  await runInit(missingSectionsRoot, { adopt: true, force: false });
  await writeFile(
    path.join(missingSectionsRoot, "project_context/global.md"),
    `# Project / Delivery Context

## Project Goal

- Keep a small context.

## Non-goals / Boundaries

- Do not replace tests.

## Background

- Old context predates architecture context.

## Design Rationale

- Preserve existing content.

## Verification Entry Points

- npm test

## Current State

- Migrating.

## Next Safe Action

- Run upgrade.

## Module Index

- [main](modules/main.md)
`,
    "utf8",
  );
  await runUpgrade(missingSectionsRoot);
  const migratedGlobal = await readFile(
    path.join(missingSectionsRoot, "project_context/global.md"),
    "utf8",
  );
  assert.match(migratedGlobal, /## Architecture Context/);
  assert.match(migratedGlobal, /## Context Graph/);
  assert.match(migratedGlobal, /## Context Index/);
  assert.match(migratedGlobal, /\(areas\/main\.md\)/);

  await writeFile(
    path.join(manualRoot, "package.json"),
    JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }, null, 2),
    "utf8",
  );
  await runInit(manualRoot, { adopt: true, force: false });
  await rm(path.join(manualRoot, "project_context/context.toml"), {
    force: true,
  });
  await mkdir(path.join(manualRoot, "project_context/areas/payment"), {
    recursive: true,
  });
  await writeFile(
    path.join(manualRoot, "project_context/areas/payment/api.md"),
    "# Payment API\n",
    "utf8",
  );
  const manualCheck = spawnSync(
    process.execPath,
    [cliPath, "upgrade", "--check", "--json"],
    {
      cwd: manualRoot,
      encoding: "utf8",
    },
  );
  assert.equal(manualCheck.status, 1, manualCheck.stdout + manualCheck.stderr);
  const manualPlan = JSON.parse(manualCheck.stdout);
  assert.equal(manualPlan.mode, "manual-required");
  assert.ok(
    manualPlan.safe_pending.some(
      (entry) => entry.id === "context-manifest-baseline",
    ),
  );
  assert.ok(
    manualPlan.manual_required.some(
      (entry) => entry.path === "project_context/areas/payment/api.md",
    ),
  );
  await assert.rejects(
    () => runUpgrade(manualRoot),
    /upgrade completed with blockers/,
  );
  await stat(path.join(manualRoot, "project_context/context.toml"));

  await writeFile(
    path.join(blockedRoot, "package.json"),
    JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }, null, 2),
    "utf8",
  );
  await runInit(blockedRoot, { adopt: true, force: false });
  const blockedConfigPath = path.join(blockedRoot, ".harness/config.yaml");
  await writeFile(
    blockedConfigPath,
    (await readFile(blockedConfigPath, "utf8")).replace(
      'schema_version: "4"',
      'schema_version: "1"',
    ),
    "utf8",
  );
  await mkdir(path.join(blockedRoot, "project_context/modules"), {
    recursive: true,
  });
  await writeFile(
    path.join(blockedRoot, "project_context/modules/main.md"),
    "# Legacy Main\n",
    "utf8",
  );
  const blockedCheck = spawnSync(
    process.execPath,
    [cliPath, "upgrade", "--check", "--json"],
    {
      cwd: blockedRoot,
      encoding: "utf8",
    },
  );
  assert.equal(
    blockedCheck.status,
    1,
    blockedCheck.stdout + blockedCheck.stderr,
  );
  const blockedPlan = JSON.parse(blockedCheck.stdout);
  assert.equal(blockedPlan.mode, "manual-required");
  assert.ok(
    blockedPlan.blocked.some((entry) => entry.id === "legacy-modules-to-areas"),
  );
  const blockedUpgrade = spawnSync(process.execPath, [cliPath, "upgrade"], {
    cwd: blockedRoot,
    encoding: "utf8",
  });
  assert.equal(
    blockedUpgrade.status,
    1,
    blockedUpgrade.stdout + blockedUpgrade.stderr,
  );
  assert.match(blockedUpgrade.stdout, /upgrade plan mode=manual-required/);
  assert.match(blockedUpgrade.stdout, /blocked: legacy-modules-to-areas/);
  assert.match(
    blockedUpgrade.stdout,
    /upgrade blocked: resolve blocked migration items/,
  );
  assert.match(
    await readFile(blockedConfigPath, "utf8"),
    /schema_version: "1"/,
  );
  await assert.rejects(
    () => runUpgrade(blockedRoot),
    /upgrade completed with blockers/,
  );
  await stat(path.join(blockedRoot, "project_context/modules/main.md"));

  await mkdir(path.join(futureSchemaRoot, ".agent"), { recursive: true });
  await writeFile(
    path.join(futureSchemaRoot, ".agent/config.yaml"),
    `core:
  package: "project-tiny-context-harness"
  schema_version: "5"
`,
    "utf8",
  );
  await assert.rejects(
    () => runSync(futureSchemaRoot),
    /unsupported Harness schema version 5/,
  );
  await assert.rejects(
    () => runUpgrade(futureSchemaRoot),
    /unsupported Harness schema version 5/,
  );
  await assert.rejects(stat(path.join(futureSchemaRoot, "AGENTS.md")));
  await assert.rejects(stat(path.join(futureSchemaRoot, "project_context")));
} finally {
  await rm(root, { recursive: true, force: true });
  await rm(existingManifestRoot, { recursive: true, force: true });
  await rm(missingSectionsRoot, { recursive: true, force: true });
  await rm(futureSchemaRoot, { recursive: true, force: true });
  await rm(manualRoot, { recursive: true, force: true });
  await rm(blockedRoot, { recursive: true, force: true });
}

test("top-level script assertions completed", () => {});
