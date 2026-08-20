import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH,
  longTaskCodexAgentProfileBootstrapPaths,
  parseAndValidateLongTaskCodexAgentProfile,
  syncLongTaskCodexAgentProfile,
} from "../../packages/ty-context/dist/lib/long-task-codex-agent-profile.js";
import {
  LONG_TASK_HOOK_TRUST_REVIEW_NOTICE,
  installLongTaskHooks,
  removeManagedHookEntries,
  uninstallLongTaskHooks,
} from "../../packages/ty-context/dist/lib/long-task-hook-install.js";
import { selectedAgentType } from "../../packages/ty-context/dist/lib/long-task-worker-selection.js";
import { activeRecordPath } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  createUpgradePlan,
  runMigrations,
} from "../../packages/ty-context/dist/lib/migrations.js";
import {
  commitCandidate,
  createDeliveryFixture,
  pathExists,
  runCli,
} from "./long-task-delivery-fixtures.mjs";
import {
  assertDisabledHookEvents,
  assertEnabledHookEvents,
  mixedHookConfig,
} from "./long-task-profile-hook-fixture.mjs";
import { assertLongTaskStaticConsistency } from "./long-task-static-consistency.mjs";

const packageHook = fileURLToPath(
  new URL("../../packages/ty-context/dist/long-task-hook.js", import.meta.url),
);
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

test("source workspace version, Hook and manual-only documentation stay consistent", async () => {
  await assertLongTaskStaticConsistency(repoRoot);
});

test("Codex worker profile validator derives one static leaf configuration from canonical TOML", async () => {
  const canonical = await readFile(
    path.join(
      repoRoot,
      ".codex/ty-context-managed/agents/long-task-implementation.toml",
    ),
    "utf8",
  );
  assert.match(canonical, /^description = "Package-owned implementation worker/mu);
  assert.doesNotMatch(canonical, /^description = ".*\bOptional\b/mu);
  const valid = parseAndValidateLongTaskCodexAgentProfile(canonical);
  assert.equal(valid.valid, true, JSON.stringify(valid));
  const currentModel = canonical.match(/^model = "([^"\r\n]+)"$/mu)?.[1];
  const currentEffort = canonical.match(
    /^model_reasoning_effort = "([^"\r\n]+)"$/mu,
  )?.[1];
  assert.ok(currentModel);
  assert.ok(currentEffort);
  assert.equal(valid.profile.model, currentModel);
  assert.equal(valid.profile.model_reasoning_effort, currentEffort);
  assert.equal(valid.profile.agents.enabled, false);

  const alternate = canonical
    .replace(/^model = "[^"\r\n]+"$/mu, 'model = "future-static-model"')
    .replace(
      /^model_reasoning_effort = "[^"\r\n]+"$/mu,
      'model_reasoning_effort = "future-static-effort"',
    );
  const alternateResult = parseAndValidateLongTaskCodexAgentProfile(alternate);
  assert.equal(alternateResult.valid, true, JSON.stringify(alternateResult));
  assert.equal(alternateResult.profile.model, "future-static-model");
  assert.equal(
    alternateResult.profile.model_reasoning_effort,
    "future-static-effort",
  );

  for (const invalid of [
    canonical.replace(/^# ty-context:[^\r\n]+\r?\n/u, ""),
    canonical.replace(/^model = "[^"\r\n]+"$/mu, 'model = "${MODEL}"'),
    canonical.replace(/^model = "[^"\r\n]+"$/mu, 'model = "$MODEL"'),
    canonical.replace(/^model = "[^"\r\n]+"$/mu, 'model = "%MODEL%"'),
    canonical.replace(
      /^model_reasoning_effort = "[^"\r\n]+"$/mu,
      'model_reasoning_effort = "{{ effort }}"',
    ),
    canonical.replace(/\r?\n\[agents\][\s\S]*$/u, "\n"),
    `${canonical}\nmodel_route = "automatic"\n`,
    `${canonical}\n[agents.registry]\nworker = "nested"\n`,
    `${canonical}\nthis = [\n`,
  ]) {
    const result = parseAndValidateLongTaskCodexAgentProfile(invalid);
    assert.equal(result.valid, false, invalid);
  }
});

test("custom-agent selection reads only the official exact agent_type field", async () => {
  assert.equal(
    selectedAgentType({ agent_type: "long_task_implementation" }),
    "long_task_implementation",
  );
  assert.equal(selectedAgentType({ agent_type: "worker" }), "worker");
  for (const input of [
    undefined,
    null,
    "long_task_implementation",
    [],
    {},
    { agent_type: null },
    { agent_type: "" },
    { agent_type: 42 },
    { task_name: "long_task_implementation" },
    { message: "Use long_task_implementation" },
    { model: await currentCanonicalModel() },
  ])
    assert.equal(selectedAgentType(input), null);
});

test("Codex worker profile sync is symlink-safe and never reads an external target", async () => {
  const fixture = await createDeliveryFixture();
  const destination = path.join(
    fixture.root,
    LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH,
  );
  const externalFile = path.join(
    path.dirname(fixture.root),
    `${path.basename(fixture.root)}-external-agent.toml`,
  );
  const externalDirectory = path.join(
    path.dirname(fixture.root),
    `${path.basename(fixture.root)}-external-agents`,
  );
  const canonical = await readFile(
    path.join(
      repoRoot,
      "packages/ty-context/assets/agents/long-task-implementation.toml",
    ),
    "utf8",
  );
  const report = () => ({ changed: [], skipped: [], blocked: [] });
  try {
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(externalFile, canonical);
    await symlink(externalFile, destination, "file");
    const linked = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".codex",
      true,
      linked,
      {
        readFile: async (target, encoding) => {
          assert.notEqual(path.resolve(target), path.resolve(externalFile));
          return readFile(target, encoding);
        },
      },
    );
    assert.match(linked.skipped.join("\n"), /destination_symlink/u);
    assert.equal(await readFile(externalFile, "utf8"), canonical);

    await rm(destination, { force: true });
    await symlink(`${externalFile}.missing`, destination, "file");
    const dangling = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".codex",
      true,
      dangling,
    );
    assert.match(dangling.skipped.join("\n"), /destination_symlink/u);

    await rm(destination, { force: true });
    await rm(path.dirname(destination), { recursive: true, force: true });
    await mkdir(externalDirectory, { recursive: true });
    await symlink(
      externalDirectory,
      path.dirname(destination),
      process.platform === "win32" ? "junction" : "dir",
    );
    const parentLinked = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".codex",
      true,
      parentLinked,
    );
    assert.match(parentLinked.skipped.join("\n"), /parent_symlink:agents/u);
    assert.deepEqual(await readdir(externalDirectory), []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(externalFile, { force: true });
    await rm(externalDirectory, { recursive: true, force: true });
  }
});

test("Codex worker profile publication is atomic, idempotent and optional on failure", async () => {
  const fixture = await createDeliveryFixture();
  const destination = path.join(
    fixture.root,
    LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH,
  );
  const packageAsset = path.join(
    repoRoot,
    "packages/ty-context/assets/agents/long-task-implementation.toml",
  );
  const report = () => ({ changed: [], skipped: [], blocked: [] });
  try {
    const first = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".codex",
      true,
      first,
    );
    assert.deepEqual(first.changed, [
      LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH,
    ]);
    const desired = await readFile(destination, "utf8");
    assert.equal(
      parseAndValidateLongTaskCodexAgentProfile(desired).valid,
      true,
    );

    const second = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".codex",
      true,
      second,
    );
    assert.deepEqual(second.changed, []);
    assert.ok(
      second.skipped.includes(LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH),
    );

    const formerManaged = desired.replace(/\r?\n\[agents\][\s\S]*$/u, "\n");
    assert.equal(
      parseAndValidateLongTaskCodexAgentProfile(formerManaged).valid,
      false,
    );
    await writeFile(destination, formerManaged);
    const refreshedFormerManaged = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".codex",
      true,
      refreshedFormerManaged,
    );
    assert.deepEqual(refreshedFormerManaged.changed, [
      LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH,
    ]);
    assert.equal(await readFile(destination, "utf8"), desired);

    const prior = desired.replace(
      "Package-owned implementation worker",
      "Prior valid package-owned implementation worker",
    );
    assert.equal(
      parseAndValidateLongTaskCodexAgentProfile(prior).valid,
      true,
    );
    await writeFile(destination, prior);
    const writeFailed = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".codex",
      true,
      writeFailed,
      {
        writeFile: async () => {
          throw new Error("injected_write_failure");
        },
      },
    );
    assert.equal(await readFile(destination, "utf8"), prior);
    assert.match(writeFailed.skipped.join("\n"), /injected_write_failure/u);
    assert.equal(
      (await readdir(path.dirname(destination))).some((name) =>
        name.includes(".tmp-"),
      ),
      false,
    );

    const renameFailed = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".codex",
      true,
      renameFailed,
      {
        rename: async () => {
          throw new Error("injected_rename_failure");
        },
      },
    );
    assert.equal(await readFile(destination, "utf8"), prior);
    assert.match(renameFailed.skipped.join("\n"), /injected_rename_failure/u);
    assert.equal(
      (await readdir(path.dirname(destination))).some((name) =>
        name.includes(".tmp-"),
      ),
      false,
    );

    const stale = `${destination}.tmp-stale`;
    await writeFile(stale, "stale\n");
    const recovered = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".codex",
      true,
      recovered,
    );
    assert.equal(await readFile(destination, "utf8"), desired);
    assert.equal(await readFile(stale, "utf8"), "stale\n");

    const missingAssetDisable = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".codex",
      false,
      missingAssetDisable,
      {
        lstat: async (target) => {
          if (path.resolve(target) === path.resolve(packageAsset)) {
            const error = new Error("injected_missing_asset");
            error.code = "ENOENT";
            throw error;
          }
          return lstat(target);
        },
      },
    );
    assert.equal(await readFile(destination, "utf8"), desired);
    assert.match(missingAssetDisable.skipped.join("\n"), /asset unavailable/u);

    const invalidAssetDisable = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".codex",
      false,
      invalidAssetDisable,
      {
        readFile: async (target, encoding) =>
          path.resolve(target) === path.resolve(packageAsset)
            ? "invalid = [\n"
            : readFile(target, encoding),
      },
    );
    assert.equal(await readFile(destination, "utf8"), desired);
    assert.match(invalidAssetDisable.skipped.join("\n"), /asset is invalid/u);
    assert.deepEqual(
      await longTaskCodexAgentProfileBootstrapPaths(
        fixture.root,
        ".codex",
        true,
        {
          readFile: async (target, encoding) =>
            path.resolve(target) === path.resolve(packageAsset)
              ? "invalid = [\n"
              : readFile(target, encoding),
        },
      ),
      [],
    );
    assert.deepEqual(
      await longTaskCodexAgentProfileBootstrapPaths(
        fixture.root,
        ".codex",
        true,
        {
          lstat: async (target) => {
            if (path.resolve(target) === path.resolve(packageAsset)) {
              const error = new Error("injected_missing_asset");
              error.code = "ENOENT";
              throw error;
            }
            return lstat(target);
          },
        },
      ),
      [],
    );

    const disabled = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".codex",
      false,
      disabled,
    );
    assert.equal(await pathExists(destination), false);

    const portable = report();
    await syncLongTaskCodexAgentProfile(
      fixture.root,
      ".agent",
      true,
      portable,
    );
    assert.deepEqual(portable, { changed: [], skipped: [], blocked: [] });
    assert.equal(await pathExists(destination), false);
    assert.equal((await lstat(stale)).isFile(), true);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Hook config install blocks invalid JSON and link traversal", async () => {
  const invalid = await createDeliveryFixture();
  const linkedTarget = await createDeliveryFixture();
  const linkedParent = await createDeliveryFixture();
  const legacyParent = await createDeliveryFixture();
  const externalFile = path.join(
    path.dirname(linkedTarget.root),
    `${path.basename(linkedTarget.root)}-external-hooks.json`,
  );
  const externalCodex = path.join(
    path.dirname(linkedParent.root),
    `${path.basename(linkedParent.root)}-external-codex`,
  );
  const externalLegacy = path.join(
    path.dirname(legacyParent.root),
    `${path.basename(legacyParent.root)}-external-hooks`,
  );
  try {
    const invalidFile = path.join(invalid.root, ".codex/hooks.json");
    await mkdir(path.dirname(invalidFile), { recursive: true });
    await writeFile(invalidFile, "{ invalid\n");
    const invalidReport = freshSyncReport();
    await installLongTaskHooks(invalid.root, invalidReport);
    assert.match(invalidReport.blocked.join("\n"), /invalid JSON/u);
    assert.equal(await readFile(invalidFile, "utf8"), "{ invalid\n");

    const linkedFile = path.join(linkedTarget.root, ".codex/hooks.json");
    const externalContent = '{"external":true}\n';
    await mkdir(path.dirname(linkedFile), { recursive: true });
    await writeFile(externalFile, externalContent);
    await symlink(externalFile, linkedFile, "file");
    const linkedReport = freshSyncReport();
    await installLongTaskHooks(linkedTarget.root, linkedReport);
    assert.match(linkedReport.blocked.join("\n"), /destination_symlink/u);
    assert.equal(await readFile(externalFile, "utf8"), externalContent);

    await rm(path.join(linkedParent.root, ".codex"), {
      recursive: true,
      force: true,
    });
    await mkdir(externalCodex, { recursive: true });
    await symlink(
      externalCodex,
      path.join(linkedParent.root, ".codex"),
      process.platform === "win32" ? "junction" : "dir",
    );
    const parentReport = freshSyncReport();
    await installLongTaskHooks(linkedParent.root, parentReport);
    assert.match(parentReport.blocked.join("\n"), /parent_symlink_or_junction/u);
    assert.deepEqual(await readdir(externalCodex), []);

    const legacyDirectory = path.join(legacyParent.root, ".codex/hooks");
    await mkdir(path.join(legacyParent.root, ".codex"), { recursive: true });
    await rm(legacyDirectory, { recursive: true, force: true });
    await mkdir(externalLegacy, { recursive: true });
    await symlink(
      externalLegacy,
      legacyDirectory,
      process.platform === "win32" ? "junction" : "dir",
    );
    const legacyReport = freshSyncReport();
    await installLongTaskHooks(legacyParent.root, legacyReport);
    assert.match(legacyReport.blocked.join("\n"), /legacy_parent_symlink/u);
    assert.deepEqual(await readdir(externalLegacy), []);
  } finally {
    for (const fixture of [invalid, linkedTarget, linkedParent, legacyParent])
      await rm(fixture.root, { recursive: true, force: true });
    await rm(externalFile, { force: true });
    await rm(externalCodex, { recursive: true, force: true });
    await rm(externalLegacy, { recursive: true, force: true });
  }
});

test("Hook config publication is atomic, concurrent-change safe and idempotent", async () => {
  const fixture = await createDeliveryFixture();
  const configFile = path.join(fixture.root, ".codex/hooks.json");
  const userConfig = {
    projectMetadata: { preserve: true },
    hooks: {
      UserEvent: [
        {
          matcher: "user",
          metadata: { preserve: true },
          hooks: [{ type: "command", command: "node user-hook.mjs" }],
        },
      ],
    },
  };
  try {
    await mkdir(path.dirname(configFile), { recursive: true });
    await writeFile(configFile, `${JSON.stringify(userConfig, null, 2)}\n`);
    const installed = freshSyncReport();
    await installLongTaskHooks(fixture.root, installed);
    assert.deepEqual(installed.notices, [LONG_TASK_HOOK_TRUST_REVIEW_NOTICE]);
    const installedContent = await readFile(configFile, "utf8");
    const installedJson = JSON.parse(installedContent);
    assert.deepEqual(installedJson.projectMetadata, { preserve: true });
    assert.deepEqual(installedJson.hooks.UserEvent, userConfig.hooks.UserEvent);
    assertEnabledHookEventsForDirectInstall(installedJson);

    const repeated = freshSyncReport();
    await installLongTaskHooks(fixture.root, repeated);
    assert.equal(await readFile(configFile, "utf8"), installedContent);
    assert.equal(repeated.notices, undefined);

    const concurrentBase = `${JSON.stringify(userConfig, null, 2)}\n`;
    const concurrentContent = `${JSON.stringify(
      { ...userConfig, concurrent: true },
      null,
      2,
    )}\n`;
    await writeFile(configFile, concurrentBase);
    let configReads = 0;
    const concurrent = freshSyncReport();
    await installLongTaskHooks(fixture.root, concurrent, {
      readFile: async (target, encoding) => {
        if (path.resolve(target) === path.resolve(configFile)) {
          configReads += 1;
          if (configReads === 2) await writeFile(configFile, concurrentContent);
        }
        return readFile(target, encoding);
      },
    });
    assert.match(concurrent.blocked.join("\n"), /concurrent change/u);
    assert.equal(await readFile(configFile, "utf8"), concurrentContent);
    await assertNoHookTemps(fixture.root);

    await writeFile(configFile, concurrentBase);
    const writeFailed = freshSyncReport();
    await installLongTaskHooks(fixture.root, writeFailed, {
      writeFile: async () => {
        throw new Error("injected_hook_write_failure");
      },
    });
    assert.match(writeFailed.blocked.join("\n"), /injected_hook_write_failure/u);
    assert.equal(await readFile(configFile, "utf8"), concurrentBase);
    await assertNoHookTemps(fixture.root);

    const renameFailed = freshSyncReport();
    await installLongTaskHooks(fixture.root, renameFailed, {
      rename: async () => {
        throw new Error("injected_hook_rename_failure");
      },
    });
    assert.match(
      renameFailed.blocked.join("\n"),
      /injected_hook_rename_failure/u,
    );
    assert.equal(await readFile(configFile, "utf8"), concurrentBase);
    await assertNoHookTemps(fixture.root);

    await installLongTaskHooks(fixture.root, freshSyncReport());
    const disabled = freshSyncReport();
    await uninstallLongTaskHooks(fixture.root, disabled);
    const retained = JSON.parse(await readFile(configFile, "utf8"));
    assert.deepEqual(retained.projectMetadata, { preserve: true });
    assert.deepEqual(retained.hooks, userConfig.hooks);
    const disabledAgain = freshSyncReport();
    await uninstallLongTaskHooks(fixture.root, disabledAgain);
    assert.deepEqual(disabledAgain.changed, []);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("enable/disable owns one package-owned Hook per event and preserves user Hooks", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const hookFixture = mixedHookConfig(packageHook);
    await mkdir(path.join(fixture.root, ".codex/hooks"), { recursive: true });
    await writeFile(
      path.join(fixture.root, ".codex/hooks/long-task-hook.mjs"),
      "// retired repo-local hook\n",
    );
    await writeFile(
      path.join(fixture.root, ".codex/hooks.json"),
      `${JSON.stringify(hookFixture.config, null, 2)}\n`,
    );
    const enabled = await runCli(fixture.root, ["enable", "long-task"]);
    assert.ok(enabled.text.includes(LONG_TASK_HOOK_TRUST_REVIEW_NOTICE));
    assert.equal(
      await pathExists(
        path.join(
          fixture.root,
          ".codex/skills/design-system-authoring/SKILL.md",
        ),
      ),
      true,
    );
    assert.equal(
      await pathExists(
        path.join(
          fixture.root,
          ".codex/skills/design-resource-authoring/SKILL.md",
        ),
      ),
      true,
    );
    assert.equal(
      await pathExists(
        path.join(fixture.root, ".codex/skills/long-task-workflow/SKILL.md"),
      ),
      true,
    );
    assert.equal(
      await pathExists(
        path.join(fixture.root, ".codex/skills/source-plan-authoring/SKILL.md"),
      ),
      false,
    );
    assert.equal(
      await pathExists(
        path.join(
          fixture.root,
          ".codex/agents/long-task-implementation.toml",
        ),
      ),
      true,
    );
    assert.equal(
      await pathExists(
        path.join(fixture.root, ".codex/hooks/long-task-hook.mjs"),
      ),
      false,
    );
    const config = YAML.parse(
      await readFile(path.join(fixture.root, ".codex/config.yaml"), "utf8"),
    );
    assert.ok(config.profiles.enabled.includes("long-task"));

    const hooksFile = path.join(fixture.root, ".codex/hooks.json");
    const hooks = JSON.parse(await readFile(hooksFile, "utf8"));
    assertEnabledHookEvents(hooks, hookFixture.userOnlyGroup);
    const firstEnabledHooks = await readFile(hooksFile, "utf8");
    const repeatedSync = await runCli(fixture.root, ["sync"]);
    assert.equal(
      repeatedSync.text.includes(LONG_TASK_HOOK_TRUST_REVIEW_NOTICE),
      false,
    );
    assert.equal(await readFile(hooksFile, "utf8"), firstEnabledHooks);
    assert.equal(
      hooks.hooks.PreToolUse.filter(
        (group) => group.matcher === "^(spawn_agent|Agent)$",
      ).length,
      1,
    );
    assert.equal(
      hooks.hooks.SubagentStart.filter(
        (group) => group.matcher === "^long_task_implementation$",
      ).length,
      1,
    );
    assert.equal(
      hooks.hooks.SubagentStart.filter(
        (group) =>
          Object.keys(group).length === 1 &&
          Array.isArray(group.hooks) &&
          group.hooks.length === 0,
      ).length,
      0,
    );
    await writeFile(hooksFile, `${JSON.stringify(hooks, null, 2)}\n`);
    await mkdir(path.join(fixture.root, ".codex/skills/user-local"), {
      recursive: true,
    });
    await writeFile(
      path.join(fixture.root, ".codex/skills/user-local/SKILL.md"),
      "# User local\n",
    );

    await runCli(fixture.root, ["disable", "long-task"]);
    assert.equal(
      await pathExists(
        path.join(fixture.root, ".codex/skills/long-task-workflow"),
      ),
      false,
    );
    assert.equal(
      await pathExists(
        path.join(fixture.root, ".codex/skills/source-plan-authoring"),
      ),
      false,
    );
    assert.equal(
      await pathExists(
        path.join(
          fixture.root,
          ".codex/agents/long-task-implementation.toml",
        ),
      ),
      false,
    );
    assert.equal(
      await pathExists(
        path.join(fixture.root, ".codex/skills/user-local/SKILL.md"),
      ),
      true,
    );
    assert.equal(
      await pathExists(
        path.join(
          fixture.root,
          ".codex/skills/design-system-authoring/SKILL.md",
        ),
      ),
      true,
    );
    assert.equal(
      await pathExists(
        path.join(
          fixture.root,
          ".codex/skills/design-resource-authoring/SKILL.md",
        ),
      ),
      true,
    );
    const retained = JSON.parse(await readFile(hooksFile, "utf8"));
    assertDisabledHookEvents(retained, hookFixture.userOnlyGroup);
    assert.equal(await pathExists(hooksFile), true);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("non-Codex long-task root omits the worker without changing formal acceptance", async () => {
  const fixture = await createDeliveryFixture();
  const packageFile = path.join(fixture.root, "package.json");
  try {
    const packageJson = JSON.parse(await readFile(packageFile, "utf8"));
    packageJson.tyContext.harnessFolderName = ".agent";
    await writeFile(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`);
    await commitCandidate(fixture.root);

    await runCli(fixture.root, ["enable", "long-task"]);
    assert.equal(
      await pathExists(
        path.join(
          fixture.root,
          ".codex/agents/long-task-implementation.toml",
        ),
      ),
      false,
    );
    assert.equal(
      await pathExists(
        path.join(fixture.root, ".agent/skills/long-task-workflow/SKILL.md"),
      ),
      true,
    );
    assert.equal(
      await pathExists(path.join(fixture.root, "project_context/global.md")),
      true,
    );

    const compiled = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.equal(compiled.execution_model_checkpoint.required, true);
    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    const accepted = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");

    await runCli(fixture.root, ["disable", "long-task"]);
    await runCli(fixture.root, ["disable", "long-task"]);
    assert.equal(
      await pathExists(
        path.join(
          fixture.root,
          ".codex/agents/long-task-implementation.toml",
        ),
      ),
      false,
    );
    assert.equal(
      await pathExists(
        path.join(fixture.root, ".agent/skills/context_product_plan/SKILL.md"),
      ),
      true,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("custom Codex agent collision is preserved and never enters formal acceptance", async () => {
  const fixture = await createDeliveryFixture();
  const agentFile = path.join(
    fixture.root,
    ".codex/agents/long-task-implementation.toml",
  );
  const customized = `name = "user_long_task_implementation"
description = "User-owned same-path custom agent."
developer_instructions = "Remain user owned."
model = "gpt-5.6-terra"
`;
  try {
    await mkdir(path.dirname(agentFile), { recursive: true });
    await writeFile(agentFile, customized);
    await commitCandidate(fixture.root);

    await runCli(fixture.root, ["enable", "long-task"]);
    assert.equal(await readFile(agentFile, "utf8"), customized);

    const compiled = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.equal(compiled.execution_model_checkpoint.required, true);
    const accepted = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");

    await runCli(fixture.root, ["disable", "long-task"]);
    assert.equal(await readFile(agentFile, "utf8"), customized);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("entry cleanup drops only empty managed-only groups and preserves configured groups", () => {
  const managed = {
    type: "command",
    command: "node .codex/hooks/long-task-hook.mjs",
  };
  const userOnly = {
    matcher: "user",
    hooks: [{ type: "command", command: "node user-hook.mjs" }],
  };
  const cleaned = removeManagedHookEntries([
    { hooks: [managed] },
    { matcher: "configured", metadata: { keep: true }, hooks: [managed] },
    { matcher: "^long_task_implementation$", hooks: [managed] },
    userOnly,
  ]);
  assert.equal(cleaned.removed, 3);
  assert.deepEqual(cleaned.groups, [
    {
      matcher: "configured",
      metadata: { keep: true },
      hooks: [],
    },
    userOnly,
  ]);
});

test("Hook relocation removes only known package-owned absolute commands", () => {
  const currentCommand = `node "${path.resolve(packageHook)}"`;
  const oldNodeModules =
    'node "C:\\old\\node_modules\\project-tiny-context-harness\\dist\\long-task-hook.js"';
  const oldPnpm =
    'node "C:\\old\\.pnpm\\project-tiny-context-harness@0.5.0\\node_modules\\project-tiny-context-harness\\dist\\long-task-hook.js"';
  const oldWorkspace =
    'node "C:\\repo\\packages\\ty-context\\dist\\long-task-hook.js"';
  const userCustom = 'node "/user/project/dist/long-task-hook.js"';
  const noStatusPackage =
    'node "/old/node_modules/project-tiny-context-harness/dist/long-task-hook.js"';
  const compositeUser = "node user-composite-long-task-hook.js";
  const cleaned = removeManagedHookEntries(
    [
      {
        matcher: "mixed",
        hooks: [
          ...[oldNodeModules, oldPnpm, oldWorkspace, currentCommand].map(
            (command) => ({
              type: "command",
              command,
              statusMessage: "Tiny Context long-task live authority gate",
            }),
          ),
          {
            type: "command",
            command: userCustom,
            statusMessage: "Tiny Context long-task live authority gate",
          },
          { type: "command", command: noStatusPackage },
          {
            type: "command",
            command: compositeUser,
            statusMessage: "Tiny Context long-task live authority gate",
          },
        ],
      },
    ],
    currentCommand,
  );
  assert.equal(cleaned.removed, 4);
  const retained = cleaned.groups[0].hooks.map((entry) => entry.command);
  assert.deepEqual(retained, [userCustom, noStatusPackage, compositeUser]);
});

test("package-owned Hook resumes from common-dir and Stop runs the Live Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const profileDestination = path.join(
      fixture.root,
      LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH,
    );
    const profileTarget = path.join(fixture.root, "worker-profile-target.toml");
    const canonicalProfile = await readFile(
      path.join(
        repoRoot,
        "packages/ty-context/assets/agents/long-task-implementation.toml",
      ),
      "utf8",
    );
    const restoreProfile = async () => {
      await rm(profileDestination, { recursive: true, force: true });
      await mkdir(path.dirname(profileDestination), { recursive: true });
      await writeFile(profileDestination, canonicalProfile);
    };
    const spawnExact = () =>
      invokeHook(fixture.root, "PreToolUse", {
        tool_name: "spawn_agent",
        tool_input: { agent_type: "long_task_implementation" },
      });
    assert.deepEqual(await invokeHook(fixture.root, "Stop"), {});
    for (const agentType of ["worker", "long_task_implementation"])
      assert.deepEqual(
        await invokeHook(fixture.root, "PreToolUse", {
          tool_name: "spawn_agent",
          tool_input: { agent_type: agentType },
        }),
        {},
      );
    await rm(profileDestination);
    assert.deepEqual(await spawnExact(), {});
    await restoreProfile();

    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const record = await activeRecordPath(fixture.root);
    assert.equal(await pathExists(record), true);
    assert.match(
      record.replace(/\\/gu, "/"),
      /\.git\/ty-context\/long-task\/worktrees\//u,
    );
    const session = await invokeHook(fixture.root, "SessionStart");
    assert.match(
      session.hookSpecificOutput.additionalContext,
      /Active Single-Goal Long-Task Workflow V2/,
    );
    assert.match(
      session.hookSpecificOutput.additionalContext,
      /long-task resume/,
    );
    assert.deepEqual(await spawnExact(), {});
    assert.deepEqual(
      await invokeHook(fixture.root, "PreToolUse", {
        tool_name: "Agent",
        tool_input: { agent_type: "long_task_implementation" },
      }),
      {},
    );
    assert.deepEqual(
      await invokeHook(fixture.root, "PreToolUse", {
        tool_name: "write_file",
        tool_input: { agent_type: "worker" },
      }),
      {},
    );
    const recordBeforeDeniedSpawns = await readFile(record, "utf8");
    for (const toolInput of [
      undefined,
      null,
      "malformed",
      {},
      { agent_type: null },
      { agent_type: "worker" },
      { agent_type: "default" },
      { agent_type: "explorer" },
      { agent_type: "another_custom_agent" },
      { task_name: "long_task_implementation" },
      { message: "Use long_task_implementation" },
      { model: await currentCanonicalModel() },
    ]) {
      const denied = await invokeHook(fixture.root, "PreToolUse", {
        tool_name: "spawn_agent",
        tool_input: toolInput,
      });
      assert.deepEqual(denied, {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            "Active Tiny Context Long-Task permits delegation only to the exact custom agent long_task_implementation. The current host request does not explicitly select it. Do not substitute a generic worker; complete this packet in the parent Goal.",
        },
      });
    }
    assert.equal(await readFile(record, "utf8"), recordBeforeDeniedSpawns);
    await writeFile(profileTarget, canonicalProfile);
    const profileCases = [
      ["missing", () => rm(profileDestination)],
      ["invalid", () => writeFile(profileDestination, "bad = [\n")],
      [
        "outdated",
        () =>
          writeFile(
            profileDestination,
            canonicalProfile.replace(
              /^model = "[^"\r\n]+"$/mu,
              'model = "future-static-model"',
            ),
          ),
      ],
      [
        "symlink",
        async () => {
          await rm(profileDestination);
          await symlink(profileTarget, profileDestination, "file");
        },
      ],
      [
        "non-regular",
        async () => {
          await rm(profileDestination);
          await mkdir(profileDestination);
        },
      ],
    ];
    for (const [label, mutate] of profileCases) {
      await restoreProfile();
      await mutate();
      assertProfileUnavailableSpawnDenied(await spawnExact(), label);
    }
    await restoreProfile();
    await rm(profileTarget);
    assert.deepEqual(await spawnExact(), {});
    const worker = await invokeHook(fixture.root, "SubagentStart", {
      agent_type: "long_task_implementation",
      agent_id: "agent-fixture",
    });
    assert.equal(worker.hookSpecificOutput.hookEventName, "SubagentStart");
    assert.match(
      worker.hookSpecificOutput.additionalContext,
      /delegated rolling implementation worker, not the parent Long-Task Goal/iu,
    );
    assert.match(worker.hookSpecificOutput.additionalContext, /bounded packet/iu);
    assert.match(
      worker.hookSpecificOutput.additionalContext,
      /Do not run long-task resume, Preflight, Compile, Authority Revision/iu,
    );
    assert.match(
      worker.hookSpecificOutput.additionalContext,
      /parent Goal owns Source, Contract, Authority, Context writeback, integration and formal acceptance/iu,
    );
    assert.match(
      worker.hookSpecificOutput.additionalContext,
      /not Progress, Evidence or acceptance/iu,
    );
    assert.deepEqual(
      await invokeHook(fixture.root, "SubagentStart", {
        agent_type: "explorer",
        agent_id: "agent-other",
      }),
      {},
    );
    assert.deepEqual(
      await invokeHook(fixture.root, "SubagentStop", {
        agent_type: "long_task_implementation",
        agent_id: "agent-fixture",
      }),
      {},
    );
    assert.doesNotMatch(await readFile(record, "utf8"), /agent-fixture/u);
    const blocked = await invokeHook(fixture.root, "Stop");
    assert.equal(blocked.decision, "block");

    await commitCandidate(fixture.root);
    const accepted = await invokeHook(fixture.root, "Stop");
    assert.equal(
      Object.hasOwn(accepted, "decision"),
      false,
      JSON.stringify(accepted),
    );
    assert.match(accepted.systemMessage, /platform-native Goal/iu);
    assert.match(accepted.systemMessage, /Declared machine Authority/iu);
    assert.equal(await pathExists(record), false);
    assert.deepEqual(await invokeHook(fixture.root, "Stop"), {});
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Agent spawn Hook fails closed on corrupt active state without gating unrelated tools", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const record = await activeRecordPath(fixture.root);
    const validRecord = await readFile(record, "utf8");

    await rm(record);
    for (const agentType of ["worker", "long_task_implementation"])
      assertCorruptSpawnDenied(
        await invokeHook(fixture.root, "PreToolUse", {
          tool_name: "spawn_agent",
          tool_input: { agent_type: agentType },
        }),
      );
    assert.equal(await pathExists(record), false);
    assert.deepEqual(
      await invokeHook(fixture.root, "PreToolUse", {
        tool_name: "write_file",
        tool_input: {},
      }),
      {},
    );
    assert.equal(await pathExists(record), false);

    const invalidSnapshotHash = JSON.parse(validRecord);
    invalidSnapshotHash.authority_snapshot_sha256 = "0".repeat(64);
    const corruptRecord = `${JSON.stringify(invalidSnapshotHash)}\n`;
    await writeFile(record, corruptRecord);
    const deniedInvalidSnapshot = await invokeHook(
      fixture.root,
      "PreToolUse",
      {
        tool_name: "Agent",
        tool_input: { agent_type: "worker" },
      },
    );
    assertCorruptSpawnDenied(deniedInvalidSnapshot);
    assert.match(
      deniedInvalidSnapshot.hookSpecificOutput.permissionDecisionReason,
      /snapshot_hash/iu,
    );
    assert.equal(await readFile(record, "utf8"), corruptRecord);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Stop Hook preserves external pending as a non-blocking system message", async () => {
  const fixture = await createDeliveryFixture({ externalConfirmation: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    assert.equal(
      await pathExists(
        path.join(
          fixture.root,
          ".codex/skills/design-resource-authoring/SKILL.md",
        ),
      ),
      true,
    );
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await commitCandidate(fixture.root);
    const record = await activeRecordPath(fixture.root);
    const result = await invokeHook(fixture.root, "Stop");
    assert.equal(Object.hasOwn(result, "decision"), false);
    assert.match(result.systemMessage, /fixture-external/iu);
    assert.match(
      result.systemMessage,
      /complete external delivery remains pending/iu,
    );
    assert.match(result.systemMessage, /platform-native Goal/iu);
    assert.equal(await pathExists(record), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("[critical:verifier-integrity] active record cannot redirect or weaken the current package verifier", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await commitCandidate(fixture.root);
    const recordFile = await activeRecordPath(fixture.root);
    const active = JSON.parse(await readFile(recordFile, "utf8"));
    active.verifier_identity.package_root = fixture.root;
    active.verifier_identity.bundle_sha256 = "0".repeat(64);
    await writeFile(recordFile, `${JSON.stringify(active)}\n`);
    const tampered = await invokeHook(fixture.root, "Stop");
    assert.equal(tampered.decision, "block");
    assert.match(tampered.reason, /identity|verifier|authority/iu);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("upgrade still preserves historical Campaign files", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const configFile = path.join(fixture.root, ".codex/config.yaml");
    const raw = await readFile(configFile, "utf8");
    await writeFile(
      configFile,
      raw.replace(/- long-task/u, "- composite-codex"),
    );
    const hooksFile = path.join(fixture.root, ".codex/hooks.json");
    const hooks = JSON.parse(await readFile(hooksFile, "utf8"));
    hooks.hooks.Stop[0].hooks.push(
      {
        type: "command",
        command:
          'node "$(git rev-parse --show-toplevel)/.codex/hooks/long-task-hook.mjs"',
        statusMessage: "Tiny Context composite completion gate",
      },
      {
        type: "command",
        command: "node user-composite-hook.mjs",
        user: true,
      },
    );
    await writeFile(hooksFile, `${JSON.stringify(hooks, null, 2)}\n`);
    const historical = path.join(fixture.root, "history/campaign-v6.json");
    await mkdir(path.dirname(historical), { recursive: true });
    await writeFile(historical, '{"user":"history"}\n');
    await runCli(fixture.root, ["upgrade", "--json"]);
    const migrated = YAML.parse(await readFile(configFile, "utf8"));
    assert.ok(migrated.profiles.enabled.includes("long-task"));
    assert.equal(await pathExists(historical), true);
    const upgradedHooks = JSON.parse(await readFile(hooksFile, "utf8"));
    const stopEntries = upgradedHooks.hooks.Stop.flatMap(
      (group) => group.hooks,
    );
    assert.equal(
      stopEntries.filter((entry) =>
        String(entry.command ?? "").includes("dist"),
      ).length,
      1,
    );
    assert.ok(
      stopEntries.some(
        (entry) => entry.command === "node user-composite-hook.mjs",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("V1 retirement migration removes the repo-local Hook and reports active V1 state", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const hook = path.join(fixture.root, ".codex/hooks/long-task-hook.mjs");
    const projection = path.join(
      fixture.root,
      ".codex/ty-context-active-long-task.json",
    );
    await mkdir(path.dirname(hook), { recursive: true });
    await writeFile(hook, "// V1 hook\n");
    await writeFile(projection, '{"schema_version":"active-long-task-v1"}\n');
    const plan = await createUpgradePlan(fixture.root);
    assert.ok(
      plan.safe_pending.some((item) => item.id === "long-task-v1-retirement"),
    );
    assert.ok(
      plan.manual_required.some(
        (item) => item.id === "long-task-v1-retirement",
      ),
    );
    const report = await runMigrations(fixture.root, plan);
    assert.equal(await pathExists(hook), false);
    assert.equal(await pathExists(projection), true);
    assert.ok(
      report.manualRequired.some(
        (item) => item.id === "long-task-v1-retirement",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function freshSyncReport() {
  return { changed: [], skipped: [], blocked: [] };
}

function assertCorruptSpawnDenied(result) {
  assert.deepEqual(Object.keys(result), ["hookSpecificOutput"]);
  assert.equal(result.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(result.hookSpecificOutput.permissionDecision, "deny");
  assert.match(
    result.hookSpecificOutput.permissionDecisionReason,
    /failed closed/iu,
  );
  assert.match(
    result.hookSpecificOutput.permissionDecisionReason,
    /parent Goal/iu,
  );
  assert.equal(Object.hasOwn(result, "continue"), false);
  assert.equal(Object.hasOwn(result, "stopReason"), false);
}

function assertProfileUnavailableSpawnDenied(result, label) {
  assert.equal(result.hookSpecificOutput.hookEventName, "PreToolUse", label);
  assert.equal(result.hookSpecificOutput.permissionDecision, "deny", label);
  assert.match(
    result.hookSpecificOutput.permissionDecisionReason,
    /profile is unavailable, invalid, outdated or conflicting[\s\S]*Do not spawn a substitute agent[\s\S]*parent Goal/iu,
    label,
  );
}

function assertEnabledHookEventsForDirectInstall(config) {
  for (const event of [
    "PreToolUse",
    "SessionStart",
    "PostCompact",
    "Stop",
    "SubagentStart",
  ]) {
    const groups = config.hooks[event];
    const managed = groups.flatMap((group) => group.hooks).filter((hook) =>
      String(hook.command ?? "").includes("long-task-hook.js"),
    );
    assert.equal(managed.length, 1, event);
    const group = groups.find((candidate) =>
      candidate.hooks.includes(managed[0]),
    );
    if (event === "PreToolUse")
      assert.equal(group.matcher, "^(spawn_agent|Agent)$");
    else if (event === "SubagentStart")
      assert.equal(group.matcher, "^long_task_implementation$");
    else assert.equal(Object.hasOwn(group, "matcher"), false);
  }
}

async function assertNoHookTemps(root) {
  const names = await readdir(path.join(root, ".codex"));
  assert.equal(names.some((name) => name.startsWith("hooks.json.tmp-")), false);
}

async function currentCanonicalModel() {
  const canonical = await readFile(
    path.join(
      repoRoot,
      ".codex/ty-context-managed/agents/long-task-implementation.toml",
    ),
    "utf8",
  );
  const model = canonical.match(/^model = "([^"\r\n]+)"$/mu)?.[1];
  assert.ok(model);
  return model;
}

async function invokeHook(cwd, hookEventName, extra = {}) {
  const input = JSON.stringify({
    cwd,
    hook_event_name: hookEventName,
    last_assistant_message: "attempt completion",
    ...extra,
  });
  const stdout = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [packageHook], {
      cwd,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const out = [];
    const error = [];
    child.stdout.on("data", (chunk) => out.push(chunk));
    child.stderr.on("data", (chunk) => error.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(out).toString("utf8"));
      else reject(new Error(Buffer.concat(error).toString("utf8")));
    });
    child.stdin.end(input);
  });
  return JSON.parse(stdout.trim());
}
