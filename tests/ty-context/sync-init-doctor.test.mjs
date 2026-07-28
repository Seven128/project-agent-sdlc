import assert from "node:assert/strict";
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
import test from "node:test";
import { fileURLToPath } from "node:url";
import { resolveAgentHarnessFolderName } from "../../packages/ty-context/dist/commands/init.js";
import { runDoctor } from "../../packages/ty-context/dist/lib/doctor.js";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import { captureContextGraphSnapshot } from "../../packages/ty-context/dist/lib/context-graph-snapshot.js";
import {
  disableHarnessProfile,
  enableHarnessProfile,
} from "../../packages/ty-context/dist/lib/profiles.js";
import { runSync } from "../../packages/ty-context/dist/lib/sync-engine.js";

const cliPath = fileURLToPath(
  new URL("../../packages/ty-context/dist/cli.js", import.meta.url),
);

test("agent harness folder aliases remain portable", () => {
  assert.equal(resolveAgentHarnessFolderName(""), ".codex");
  assert.equal(resolveAgentHarnessFolderName("2"), ".claude");
  assert.equal(resolveAgentHarnessFolderName("cursor"), ".cursor");
  assert.equal(resolveAgentHarnessFolderName("other"), ".agent");
  assert.equal(
    resolveAgentHarnessFolderName("other", ".workflow"),
    ".workflow",
  );
});

test("default Context byte budgets remain advisory when genuine recovery facts exceed them", async () => {
  await withTemp("ty-context-footprint-advisory-", async (root) => {
    await runInit(root, { adopt: false, force: false });
    const globalPath = path.join(root, "project_context/global.md");
    const globalContext = await readFile(globalPath, "utf8");
    await writeFile(
      globalPath,
      `${globalContext}\n${"necessary recovery fact ".repeat(4096)}\n`,
      "utf8",
    );

    const doctor = await runDoctor(root);
    assert.deepEqual(doctor.errors, []);
    assert.ok(
      doctor.warnings.some(
        (line) =>
          line.includes("default Context read path is") &&
          line.includes("soft budget") &&
          line.includes("required near-universal facts take precedence"),
      ),
    );
    assert.ok(
      doctor.warnings.some(
        (line) =>
          line.includes("project_context/global.md") &&
          line.includes("per-file soft budget") &&
          line.includes("required readable facts take precedence"),
      ),
    );
  });
});

test("non_codex_sync_does_not_install_codex_hooks", async () => {
  await withTemp("ty-context-default-", async (root) => {
    const report = await runInit(root, { adopt: false, force: false });
    assert.ok(
      report.some((line) => line.includes("created .agent/config.yaml")),
    );

    for (const file of [
      "project_context/context.toml",
      "project_context/global.md",
      "project_context/architecture.md",
      "project_context/areas/main.md",
      "project_context/areas/main/verification.md",
      "DESIGN.md",
      "AGENTS.md",
      "Makefile",
      ".agent/skills/context_product_plan/SKILL.md",
      ".agent/skills/context_uiux_design/SKILL.md",
      ".agent/skills/context_development_engineer/SKILL.md",
      ".agent/skills/context_surface_contract/SKILL.md",
      ".agent/skills/context_full_project_export/SKILL.md",
      ".agent/skills/context_harness_upgrade/SKILL.md",
      ".agent/skills/design-system-authoring/SKILL.md",
      ".agent/skills/design-resource-authoring/SKILL.md",
    ]) {
      await stat(path.join(root, file));
    }

    for (const absent of [
      "plan.md",
      ".agent/state/plan.yaml",
      ".agent/state/lifecycle.yaml",
      ".agent/skills/source-plan-authoring/SKILL.md",
      ".agent/skills/prepare-composite-long-task/SKILL.md",
      ".agent/skills/composite-long-task-workflow/SKILL.md",
      ".agent/composite-long-task/campaigns",
      ".codex/hooks.json",
      ".codex/hooks/long-task-hook.mjs",
      ".work_products/INDEX.md",
    ]) {
      assert.equal(await exists(path.join(root, absent)), false, absent);
    }

    const config = await readFile(
      path.join(root, ".agent/config.yaml"),
      "utf8",
    );
    assert.match(config, /schema_version: "4"/);
    assert.match(
      config,
      /profiles:[\s\S]*core-portable[\s\S]*workflow-default/,
    );
    assert.doesNotMatch(config, /long-task/);
    assert.match(config, /policy: strict_except_generated/);

    const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
    assert.match(agents, /Minimal Context Harness Protocol/);
    assert.match(agents, /agent\/platform internal plan/);
    assert.match(agents, /never requires a plan artifact/);
    assert.match(
      agents,
      /Otherwise remain on the default Workflow Contract, even when work appears long/,
    );
    assert.match(agents, /Context Delta: none\|required/);
    assert.match(agents, /Contract Conformance/);
    assert.match(agents, /Context drift check/);
    assert.match(agents, /Context: no durable fact change/);
    assert.match(
      agents,
      /For material UI, reconcile affected stable surface\/control\/target keys/iu,
    );

    const design = await readFile(path.join(root, "DESIGN.md"), "utf8");
    assert.match(design, /name: "Unconfigured Project Design"/u);
    assert.match(design, /Design authority status: `unconfigured`/u);
    assert.match(design, /^### Design Authority Index$/mu);
    assert.match(design, /`exact-target`, `constraint` or `inspiration`/u);
    assert.match(design, /readable immutable adopted path\/URI plus digest/iu);
    assert.match(design, /editable upstream owner\/locator\/update route/iu);
    assert.match(design, /Every adopted target has exactly one canonical record/iu);
    assert.match(design, /screen-specific target[\s\S]*owning Screen Contract anchor/iu);
    assert.match(design, /Do not duplicate that metadata/iu);
    assert.match(
      design,
      /must open affected selected exact targets\/constraints/iu,
    );
    assert.match(design, /new immutable version\/digest/iu);
    assert.match(design, /never overwrite the adopted baseline/iu);
    assert.doesNotMatch(design, /name: "Starter Design System"/u);
    assert.doesNotMatch(design, /surface-card/u);

    const manifest = await readFile(
      path.join(root, "project_context/context.toml"),
      "utf8",
    );
    assert.match(manifest, /\[\[areas\]\][\s\S]*id = "main"/);
    assert.match(manifest, /\[\[context\]\][\s\S]*role = "verification"/);

    const snapshot = await captureContextGraphSnapshot(
      root,
      ["project_context/areas/main/verification.md"],
      "referenced",
    );
    assert.match(snapshot.topology_sha256, /^[a-f0-9]{64}$/);
    assert.ok(
      snapshot.files.includes("project_context/areas/main/verification.md"),
    );

    const workflow = await readFile(
      path.join(root, ".github/workflows/harness.yml"),
      "utf8",
    );
    assert.match(workflow, /validate-context/);
    assert.match(workflow, /validate-code-modularity/);
    assert.match(workflow, /validate-harness/);
    assert.doesNotMatch(
      workflow,
      /npm test --workspace project-tiny-context-harness/,
    );

    const doctor = await runDoctor(root);
    assert.deepEqual(doctor.errors, []);
    assert.ok(
      doctor.info.some((line) => line.includes("harness root: .agent")),
    );
    assert.ok(
      doctor.info.some((line) => line.includes("default Context read path:")),
    );
    assert.ok(
      doctor.info.some((line) =>
        line.includes("design authority: unconfigured"),
      ),
    );
    assert.equal(
      doctor.warnings.some(
        (line) => line.includes("above the") && line.includes("soft budget"),
      ),
      false,
    );

    await writeFile(
      path.join(root, "DESIGN.md"),
      design.replace(
        "Design authority status: `unconfigured`",
        "Design authority status: `configured`",
      ),
      "utf8",
    );
    const configuredDoctor = await runDoctor(root);
    assert.ok(
      configuredDoctor.info.some((line) =>
        line.includes("design authority: configured"),
      ),
    );
    assert.ok(
      configuredDoctor.info.some((line) =>
        line.includes("project-level visual-system configuration only"),
      ),
    );
    assert.ok(
      configuredDoctor.info.some((line) =>
        line.includes("surface implementation readiness: not inferred"),
      ),
    );
    assert.ok(
      configuredDoctor.info.some((line) =>
        line.includes(
          "index=present, token_source=missing-or-unselected, classified_references=0",
        ),
      ),
    );
    assert.ok(
      configuredDoctor.warnings.some((line) =>
        line.includes("no selected authored token source"),
      ),
    );

    await writeFile(
      path.join(root, "DESIGN.md"),
      `---\nname: "Custom System"\n---\n\n# Design Authority\n\nCustom visual system.\n`,
      "utf8",
    );
    const systemOnlyDoctor = await runDoctor(root);
    assert.ok(
      systemOnlyDoctor.warnings.some((line) =>
        line.includes("has no Design Authority Index"),
      ),
    );

    await writeFile(
      path.join(root, "DESIGN.md"),
      `---\nname: "Ready System"\n---\n\n# Design Authority\n\n### Design Authority Index\n\n- Authored exact-value token source: src/theme/tokens.ts.\n- Reference screen.settings.default: exact-target at design/settings.png.\n\n## Colors\n`,
      "utf8",
    );
    const indexedDoctor = await runDoctor(root);
    assert.ok(
      indexedDoctor.info.some((line) =>
        line.includes(
          "index=present, token_source=selected, classified_references=1",
        ),
      ),
    );
    assert.equal(
      indexedDoctor.warnings.some((line) =>
        line.includes("Design Authority Index"),
      ),
      false,
    );

    await writeFile(
      path.join(root, "DESIGN.md"),
      `---\nname: "Starter Design System"\ndescription: "Neutral baseline design guidance for projects that have not defined their own visual system."\n---\n`,
      "utf8",
    );
    const legacyStarterDoctor = await runDoctor(root);
    assert.ok(
      legacyStarterDoctor.info.some((line) =>
        line.includes("design authority: unconfigured"),
      ),
    );
  });
});

test("long_task_enable_installs_source_plan_and_workflow_Skills_with_Hooks", async () => {
  await withTemp("ty-context-long-task-", async (root) => {
    await runInit(root, { adopt: false, force: false });
    const enabled = await enableHarnessProfile(root, "long-task");
    assert.equal(enabled.changed, true);
    assert.ok(enabled.config.profiles.enabled.includes("long-task"));

    const sync = await runSync(root);
    assert.deepEqual(sync.blocked, []);
    for (const file of [
      ".agent/skills/source-plan-authoring/SKILL.md",
      ".agent/skills/long-task-workflow/SKILL.md",
      ".codex/hooks.json",
    ]) {
      await stat(path.join(root, file));
    }
    assert.equal(
      await exists(path.join(root, ".codex/hooks/long-task-hook.mjs")),
      false,
    );
    const hooks = await readFile(path.join(root, ".codex/hooks.json"), "utf8");
    assert.match(hooks, /Tiny Context long-task live authority gate/);
    const parsedHooks = JSON.parse(hooks);
    assert.match(
      parsedHooks.hooks.Stop[0].hooks[0].command,
      /dist[\\/]long-task-hook\.js/,
    );
    assert.equal((hooks.match(/"SessionStart"/g) ?? []).length, 1);
    assert.equal((hooks.match(/"PostCompact"/g) ?? []).length, 1);
    assert.equal((hooks.match(/"Stop"/g) ?? []).length, 1);

    const second = await runSync(root);
    assert.deepEqual(second.blocked, []);
    assert.ok(second.skipped.length > 0);
  });
});

test("long_task_disable_removes_only_owned_hooks_and_Skills", async () => {
  await withTemp("ty-context-disable-long-task-", async (root) => {
    await runInit(root, { adopt: false, force: false });
    await mkdir(path.join(root, ".codex"), { recursive: true });
    await writeFile(
      path.join(root, ".codex", "hooks.json"),
      JSON.stringify({
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command: "node user-hook.mjs",
                  custom: true,
                },
              ],
            },
          ],
        },
        user_setting: "preserve",
      }),
    );
    await enableHarnessProfile(root, "long-task");
    await runSync(root);
    const disabled = await disableHarnessProfile(root, "long-task");
    assert.equal(disabled.changed, true);
    assert.ok(!disabled.config.profiles.enabled.includes("long-task"));
    const sync = await runSync(root);
    assert.deepEqual(sync.blocked, []);
    const hooks = JSON.parse(
      await readFile(path.join(root, ".codex", "hooks.json"), "utf8"),
    );
    assert.equal(hooks.user_setting, "preserve");
    assert.equal(hooks.hooks.Stop.length, 1);
    assert.equal(hooks.hooks.Stop[0].hooks[0].custom, true);
    assert.doesNotMatch(
      JSON.stringify(hooks),
      /Tiny Context long-task completion gate/,
    );
    assert.equal(
      await exists(path.join(root, ".codex", "hooks", "long-task-hook.mjs")),
      false,
    );
    assert.equal(
      await exists(
        path.join(root, ".agent", "skills", "long-task-workflow", "SKILL.md"),
      ),
      false,
    );
    assert.equal(
      await exists(
        path.join(
          root,
          ".agent",
          "skills",
          "source-plan-authoring",
          "SKILL.md",
        ),
      ),
      false,
    );
    assert.equal(
      await exists(
        path.join(
          root,
          ".agent",
          "skills",
          "design-resource-authoring",
          "SKILL.md",
        ),
      ),
      true,
    );
  });
});

test("sync preserves durable Context and project-local Skills while refreshing managed Skills", async () => {
  await withTemp("ty-context-sync-", async (root) => {
    await runInit(root, { adopt: false, force: false });
    const globalPath = path.join(root, "project_context/global.md");
    await writeFile(
      globalPath,
      `${await readFile(globalPath, "utf8")}\n## User Notes\n\n- Keep this user-authored note.\n`,
      "utf8",
    );

    const managed = path.join(
      root,
      ".agent/skills/context_product_plan/SKILL.md",
    );
    const local = path.join(root, ".agent/skills/product_plan/SKILL.md");
    await writeFile(managed, "managed edit must be replaced\n", "utf8");
    await mkdir(path.dirname(local), { recursive: true });
    await writeFile(local, "# Project-local Product Plan\n", "utf8");

    const report = await runSync(root);
    assert.deepEqual(report.blocked, []);
    assert.match(
      await readFile(globalPath, "utf8"),
      /Keep this user-authored note/,
    );
    assert.match(await readFile(managed, "utf8"), /name: context_product_plan/);
    assert.equal(
      await readFile(local, "utf8"),
      "# Project-local Product Plan\n",
    );
  });
});

test("deprecated override directories fail closed before managed refresh", async () => {
  await withTemp("ty-context-override-", async (root) => {
    await runInit(root, { adopt: false, force: false });
    const directory = path.join(
      root,
      ".agent/ty-context-managed/override_skills",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, "context_product_plan.md"),
      "legacy override\n",
      "utf8",
    );
    const report = await runSync(root);
    assert.equal(report.blocked.length, 1);
    assert.match(report.blocked[0], /deprecated Skill overrides block sync/);
  });
});

test("configured non-Codex harness root remains portable by default", async () => {
  await withTemp("ty-context-configured-", async (root) => {
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({ tyContext: { harnessFolderName: ".harness" } }, null, 2),
      "utf8",
    );
    await runInit(root, { adopt: true, force: false });
    assert.equal(
      await exists(
        path.join(root, ".harness/skills/normal-long-task/SKILL.md"),
      ),
      false,
    );
    assert.equal(
      await exists(
        path.join(
          root,
          ".harness/skills/composite-long-task-workflow/SKILL.md",
        ),
      ),
      false,
    );
    assert.equal(await exists(path.join(root, ".codex/hooks.json")), false);
    assert.match(
      await readFile(path.join(root, "Makefile"), "utf8"),
      /\.harness\/ty-context-managed\/make\/ty-context\.mk/,
    );
  });
});

test("CLI init keeps portable defaults and explicit enable activates long-task", async () => {
  await withTemp("ty-context-cli-", async (root) => {
    const init = spawnSync(process.execPath, [cliPath, "init"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(init.status, 0, `${init.stdout}\n${init.stderr}`);
    assert.equal(await exists(path.join(root, ".codex/hooks.json")), false);

    const longTaskBeforeEnable = spawnSync(
      process.execPath,
      [cliPath, "long-task", "status", "task"],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(longTaskBeforeEnable.status, 0);
    assert.match(
      longTaskBeforeEnable.stderr,
      /profile long-task is not enabled/,
    );

    for (const command of [
      ["doctor"],
      ["validate-context"],
      ["validate-harness"],
    ]) {
      const result = spawnSync(process.execPath, [cliPath, ...command], {
        cwd: root,
        encoding: "utf8",
      });
      assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    }

    const enable = spawnSync(
      process.execPath,
      [cliPath, "enable", "long-task"],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(enable.status, 0, `${enable.stdout}\n${enable.stderr}`);
    assert.match(enable.stdout, /enabled profile long-task/);
    await stat(path.join(root, ".codex/hooks.json"));
    await stat(
      path.join(root, ".codex/skills/design-resource-authoring/SKILL.md"),
    );
    await stat(path.join(root, ".codex/skills/long-task-workflow/SKILL.md"));
    await stat(path.join(root, ".codex/skills/source-plan-authoring/SKILL.md"));

    const longTaskAfterEnable = spawnSync(
      process.execPath,
      [cliPath, "long-task", "status", "missing-task"],
      { cwd: root, encoding: "utf8" },
    );
    assert.notEqual(longTaskAfterEnable.status, 0);
    assert.doesNotMatch(
      longTaskAfterEnable.stderr,
      /profile long-task is not enabled/,
    );
  });
});

async function withTemp(prefix, action) {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  try {
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}
