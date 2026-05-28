import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAgentHarnessFolderName } from "../../packages/sdlc-harness/dist/commands/init.js";
import { runDoctor } from "../../packages/sdlc-harness/dist/lib/doctor.js";
import { runInit } from "../../packages/sdlc-harness/dist/lib/init.js";
import { runSync } from "../../packages/sdlc-harness/dist/lib/sync-engine.js";

const defaultRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-default-"));
const configuredRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-configured-"));
const cliDefaultRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-cli-default-"));
const cliConfiguredRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-cli-configured-"));
const cliConfiguredCamelRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-cli-configured-camel-"));
const cliExistingConfigRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-cli-existing-"));
const makefileMergeRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-makefile-merge-"));
const brokenMarkerRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-broken-marker-"));
const unknownSkillOverrideRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-unknown-skill-override-"));
const fullSkillOverrideRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-full-skill-override-"));
const mismatchedSkillOverrideRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-mismatched-skill-override-"));
const cliPath = fileURLToPath(new URL("../../packages/sdlc-harness/dist/cli.js", import.meta.url));

try {
  const initReport = await runInit(defaultRoot, { adopt: true, force: false });
  assert.ok(initReport.some((line) => line.includes("created .agent/config.yaml")));
  assert.equal(resolveAgentHarnessFolderName(""), ".codex");
  assert.equal(resolveAgentHarnessFolderName("2"), ".claude");
  assert.equal(resolveAgentHarnessFolderName("cursor"), ".cursor");
  assert.equal(resolveAgentHarnessFolderName("other"), ".agent");
  assert.equal(resolveAgentHarnessFolderName("other", ".workflow"), ".workflow");

  const defaultConfig = await readFile(path.join(defaultRoot, ".agent/config.yaml"), "utf8");
  assert.match(defaultConfig, /agent-project-sdlc/);
  assert.match(defaultConfig, /\.agent\/pjsdlc_managed\/override_skills\/\*\.md/);
  assert.doesNotMatch(defaultConfig, /\.agent\/overrides\/\*\*/);
  const packageMetadata = JSON.parse(await readFile(path.join(path.dirname(cliPath), "..", "package.json"), "utf8"));
  assert.match(defaultConfig, new RegExp(`version: "?${packageMetadata.version}"?`));
  const defaultLifecycle = await readFile(path.join(defaultRoot, ".agent/state/lifecycle.yaml"), "utf8");
  assert.match(defaultLifecycle, /current_phase: "SPRINTING"/);
  assert.match(defaultLifecycle, /active_role: "developer"/);
  assert.match(defaultLifecycle, /active_skill: "pjsdlc_dev_sprint"/);
  assert.match(defaultLifecycle, /  - "REVIEWING"/);
  assert.doesNotMatch(defaultLifecycle, /history:/);
  const defaultPlan = await readFile(path.join(defaultRoot, ".agent/state/plan.yaml"), "utf8");
  assert.doesNotMatch(defaultPlan, /current_phase/);
  assert.match(defaultPlan, /current_task_id: ""/);
  const defaultDraft = await readFile(path.join(defaultRoot, ".agent/state/plan.draft.yaml"), "utf8");
  assert.doesNotMatch(defaultDraft, /current_phase/);
  assert.doesNotMatch(defaultDraft, /current_task_id/);
  const defaultMemory = await readFile(path.join(defaultRoot, ".agent/state/memory.md"), "utf8");
  assert.match(defaultMemory, /简短摘要和链接/);
  assert.match(defaultMemory, /\.docs\/05_decisions\//);
  assert.match(defaultMemory, /正式事实源/);
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

  await mkdir(path.join(defaultRoot, ".agent/pjsdlc_managed/override_skills"), { recursive: true });
  await writeFile(
    path.join(defaultRoot, ".agent/pjsdlc_managed/override_skills/pjsdlc_dev_sprint.md"),
    "项目开发阶段必须优先检查本地业务约束。\n",
    "utf8"
  );
  const overrideSyncReport = await runSync(defaultRoot);
  assert.equal(overrideSyncReport.blocked.length, 0);
  const overriddenDevSkill = await readFile(path.join(defaultRoot, ".agent/skills/pjsdlc_dev_sprint/SKILL.md"), "utf8");
  assert.match(overriddenDevSkill, /# Dev Sprint Skill/);
  assert.match(overriddenDevSkill, /## Local Override/);
  assert.match(overriddenDevSkill, /\.agent\/pjsdlc_managed\/override_skills\/pjsdlc_dev_sprint\.md/);
  assert.match(overriddenDevSkill, /project-local snippet/);
  assert.match(overriddenDevSkill, /review the merged Skill for semantic conflicts/);
  assert.match(overriddenDevSkill, /项目开发阶段必须优先检查本地业务约束。/);
  const secondOverrideSyncReport = await runSync(defaultRoot);
  assert.equal(secondOverrideSyncReport.blocked.length, 0);
  const idempotentDevSkill = await readFile(path.join(defaultRoot, ".agent/skills/pjsdlc_dev_sprint/SKILL.md"), "utf8");
  assert.equal(idempotentDevSkill.match(/## Local Override/g).length, 1);

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
  await mkdir(path.join(configuredRoot, ".harness/pjsdlc_managed/override_skills"), { recursive: true });
  await writeFile(
    path.join(configuredRoot, ".harness/pjsdlc_managed/override_skills/pjsdlc_manager.md"),
    "项目管理阶段必须用本项目的交接口径报告状态。\n",
    "utf8"
  );

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
  const configuredManagerSkill = await readFile(path.join(configuredRoot, ".harness/skills/pjsdlc_manager/SKILL.md"), "utf8");
  assert.match(configuredManagerSkill, /\.harness\/pjsdlc_managed\/override_skills\/pjsdlc_manager\.md/);
  assert.match(configuredManagerSkill, /项目管理阶段必须用本项目的交接口径报告状态。/);

  const configuredDoctor = await runDoctor(configuredRoot);
  assert.deepEqual(configuredDoctor.errors, []);
  assert.ok(configuredDoctor.info.some((line) => line.includes("harness root: .harness")));

  const cliDefault = spawnSync(process.execPath, [cliPath, "init", "--adopt"], {
    cwd: cliDefaultRoot,
    encoding: "utf8"
  });
  assert.equal(cliDefault.status, 0, cliDefault.stderr);
  const cliDefaultPackage = JSON.parse(await readFile(path.join(cliDefaultRoot, "package.json"), "utf8"));
  assert.equal(cliDefaultPackage.sdlcHarness.harnessFolderName, ".codex");
  await stat(path.join(cliDefaultRoot, ".codex/config.yaml"));

  const cliConfigured = spawnSync(process.execPath, [cliPath, "init", "--adopt", "--harness-folder", ".harness"], {
    cwd: cliConfiguredRoot,
    encoding: "utf8"
  });
  assert.equal(cliConfigured.status, 0, cliConfigured.stderr);
  const cliConfiguredPackage = JSON.parse(await readFile(path.join(cliConfiguredRoot, "package.json"), "utf8"));
  assert.equal(cliConfiguredPackage.sdlcHarness.harnessFolderName, ".harness");
  await stat(path.join(cliConfiguredRoot, ".harness/config.yaml"));

  const cliConfiguredCamel = spawnSync(process.execPath, [cliPath, "init", "--adopt", "--harnessFolderName", ".workflow"], {
    cwd: cliConfiguredCamelRoot,
    encoding: "utf8"
  });
  assert.equal(cliConfiguredCamel.status, 0, cliConfiguredCamel.stderr);
  const cliConfiguredCamelPackage = JSON.parse(await readFile(path.join(cliConfiguredCamelRoot, "package.json"), "utf8"));
  assert.equal(cliConfiguredCamelPackage.sdlcHarness.harnessFolderName, ".workflow");
  await stat(path.join(cliConfiguredCamelRoot, ".workflow/config.yaml"));

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

  await runInit(unknownSkillOverrideRoot, { adopt: true, force: false });
  await mkdir(path.join(unknownSkillOverrideRoot, ".agent/pjsdlc_managed/override_skills"), { recursive: true });
  await writeFile(path.join(unknownSkillOverrideRoot, ".agent/pjsdlc_managed/override_skills/pjsdlc_unknown.md"), "unknown\n", "utf8");
  const unknownSkillOverrideReport = await runSync(unknownSkillOverrideRoot);
  assert.ok(
    unknownSkillOverrideReport.blocked.some((line) =>
      line.includes("unknown skill override: .agent/pjsdlc_managed/override_skills/pjsdlc_unknown.md")
    )
  );

  await runInit(fullSkillOverrideRoot, { adopt: true, force: false });
  await mkdir(path.join(fullSkillOverrideRoot, ".agent/pjsdlc_managed/override_skills"), { recursive: true });
  await writeFile(
    path.join(fullSkillOverrideRoot, ".agent/pjsdlc_managed/override_skills/pjsdlc_pm_prd.md"),
    [
      "---",
      "name: pjsdlc_pm_prd",
      "description: Use during REQUIREMENT_GATHERING for project-local complete PRD role.",
      "---",
      "",
      "# Project PM PRD Skill",
      "",
      "## 目的",
      "",
      "项目 PRD 必须体现本地业务对象。",
      "",
      "## 完成检查",
      "",
      "- [ ] 本地业务验收标准已覆盖。"
    ].join("\n"),
    "utf8"
  );
  const fullSkillOverrideReport = await runSync(fullSkillOverrideRoot);
  assert.equal(fullSkillOverrideReport.blocked.length, 0);
  const fullSkill = await readFile(path.join(fullSkillOverrideRoot, ".agent/skills/pjsdlc_pm_prd/SKILL.md"), "utf8");
  assert.match(fullSkill, /Use during REQUIREMENT_GATHERING to turn raw input into PRD slices with acceptance criteria and boundaries\. Project override: Use during REQUIREMENT_GATHERING for project-local complete PRD role\./);
  assert.match(fullSkill, /full Skill extension/);
  assert.match(fullSkill, /frontmatter has been merged into the generated Skill metadata/);
  assert.match(fullSkill, /review the merged Skill for semantic conflicts/);
  assert.match(fullSkill, /# Project PM PRD Skill/);
  assert.match(fullSkill, /项目 PRD 必须体现本地业务对象。/);
  assert.match(fullSkill, /- \[ \] 本地业务验收标准已覆盖。/);
  assert.equal(fullSkill.match(/^---$/gm)?.length, 2);

  await runInit(mismatchedSkillOverrideRoot, { adopt: true, force: false });
  await mkdir(path.join(mismatchedSkillOverrideRoot, ".agent/pjsdlc_managed/override_skills"), { recursive: true });
  await writeFile(
    path.join(mismatchedSkillOverrideRoot, ".agent/pjsdlc_managed/override_skills/pjsdlc_pm_prd.md"),
    "---\nname: pjsdlc_dev_sprint\ndescription: Wrong skill name.\n---\n\n# Wrong Skill\n",
    "utf8"
  );
  const mismatchedSkillOverrideReport = await runSync(mismatchedSkillOverrideRoot);
  assert.ok(
    mismatchedSkillOverrideReport.blocked.some((line) =>
      line.includes("skill override name mismatch: .agent/pjsdlc_managed/override_skills/pjsdlc_pm_prd.md declares name pjsdlc_dev_sprint")
    )
  );

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
  await rm(cliConfiguredCamelRoot, { recursive: true, force: true });
  await rm(cliExistingConfigRoot, { recursive: true, force: true });
  await rm(makefileMergeRoot, { recursive: true, force: true });
  await rm(brokenMarkerRoot, { recursive: true, force: true });
  await rm(unknownSkillOverrideRoot, { recursive: true, force: true });
  await rm(fullSkillOverrideRoot, { recursive: true, force: true });
  await rm(mismatchedSkillOverrideRoot, { recursive: true, force: true });
}
