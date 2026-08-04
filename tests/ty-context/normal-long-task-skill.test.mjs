import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import {
  createUpgradePlan,
  runMigrations,
} from "../../packages/ty-context/dist/lib/migrations.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => readFile(path.join(root, file), "utf8");
const exists = (file) =>
  stat(file).then(
    () => true,
    () => false,
  );
const legacySkill = `---
name: normal-long-task
description: Retired compatibility pointer for users who explicitly invoke /normal-long-task. Direct them to /long-task-workflow and do not create legacy checklist, prompt, audit, matrix, verdict, or plan artifacts.
---

# Retired: Normal Long Task

\`/normal-long-task\` no longer defines a second long-task artifact workflow.

Use \`/long-task-workflow\` for one Canonical Delivery Contract, the current platform-native Goal, rolling implementation in the current workspace, targeted repair verification, a same-snapshot Final Gate and Stop freshness.

Do not create a preserved-source/checklist pair, target-mode prompt, Local Audit, matrix, verdict or second plan from this compatibility invocation.
`;

test("normal-long-task is absent and public guidance separates design authoring from Long-Task", async () => {
  for (const relative of [
    ".codex/ty-context-managed/skills/normal-long-task/SKILL.md",
    ".codex/skills/normal-long-task/SKILL.md",
    "packages/ty-context/assets/skills/normal-long-task/SKILL.md",
  ]) {
    assert.equal(await exists(path.join(root, relative)), false, relative);
  }

  const [readme, chinese, packageReadme, agents, workflow, profiles] =
    await Promise.all([
      read("README.md"),
      read("README.zh-CN.md"),
      read("packages/ty-context/README.md"),
      read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
      read(
        "project_context/areas/harness-package/contracts/workflow-contract.md",
      ),
      read("packages/ty-context/src/lib/profiles.ts"),
    ]);
  for (const content of [readme, chinese, packageReadme]) {
    assert.match(content, /Minimal Context/);
    assert.match(content, /Workflow Contract/);
    assert.match(content, /Long-Task Workflow/);
    assert.match(
      content,
      /optional upstream|独立、可选的上游|independent optional upstream/i,
    );
    assert.match(
      content,
      /only active long-task execution Skill|唯一活跃的长程执行 Skill|Long-Task uses .* as its sole execution and completion carrier/is,
    );
    assert.doesNotMatch(content, /\/normal-long-task/);
  }
  assert.doesNotMatch(agents, /\/normal-long-task/);
  assert.doesNotMatch(workflow, /\/normal-long-task/);
  assert.doesNotMatch(profiles, /names\.add\("normal-long-task"\)/);
});

test("upgrade removes only the exact legacy package-owned Skill", async () => {
  const exactRoot = await initializedProject("exact");
  const modifiedRoot = await initializedProject("modified");
  try {
    const exactSkill = await writeLegacySkill(exactRoot, legacySkill);
    const exactPlan = await createUpgradePlan(exactRoot);
    assert.ok(
      exactPlan.safe_pending.some(
        (entry) => entry.id === "remove-normal-long-task-skill",
      ),
    );
    const exactReport = await runMigrations(exactRoot, exactPlan);
    assert.equal(await exists(path.dirname(exactSkill)), false);
    assert.ok(
      exactReport.changed.some((entry) =>
        entry.endsWith("skills/normal-long-task"),
      ),
    );
    const secondPlan = await createUpgradePlan(exactRoot);
    assert.equal(
      secondPlan.safe_pending.some(
        (entry) => entry.id === "remove-normal-long-task-skill",
      ),
      false,
    );

    const modifiedSkill = await writeLegacySkill(
      modifiedRoot,
      `${legacySkill}\nUser-authored addition.\n`,
    );
    const modifiedPlan = await createUpgradePlan(modifiedRoot);
    assert.ok(
      modifiedPlan.manual_required.some(
        (entry) => entry.id === "remove-normal-long-task-skill",
      ),
    );
    const before = await readFile(modifiedSkill, "utf8");
    const modifiedReport = await runMigrations(modifiedRoot, modifiedPlan);
    assert.ok(
      modifiedReport.manualRequired.some(
        (entry) => entry.id === "remove-normal-long-task-skill",
      ),
    );
    assert.equal(await readFile(modifiedSkill, "utf8"), before);
  } finally {
    await rm(exactRoot, { recursive: true, force: true });
    await rm(modifiedRoot, { recursive: true, force: true });
  }
});

async function initializedProject(label) {
  const project = await mkdtemp(
    path.join(os.tmpdir(), `ty-context-normal-long-task-${label}-`),
  );
  await writeFile(
    path.join(project, "package.json"),
    JSON.stringify(
      { tyContext: { harnessFolderName: ".harness" } },
      null,
      2,
    ),
    "utf8",
  );
  await runInit(project, { adopt: true, force: false });
  assert.equal(
    await exists(
      path.join(
        project,
        ".harness",
        "skills",
        "normal-long-task",
        "SKILL.md",
      ),
    ),
    false,
  );
  return project;
}

async function writeLegacySkill(project, content) {
  const file = path.join(
    project,
    ".harness",
    "skills",
    "normal-long-task",
    "SKILL.md",
  );
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
  return file;
}
