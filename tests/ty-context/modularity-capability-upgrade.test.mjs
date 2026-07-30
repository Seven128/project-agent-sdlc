import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(
  new URL("../../packages/ty-context/dist/cli.js", import.meta.url),
);

test("upgrade removes only obsolete heuristic waivers and sync leaves them unchanged", async () => {
  const root = await createGitFixture();
  try {
    await writeLegacyHeuristicTarget(root, "src/legacy.vue");
    await writeFile(
      path.join(root, "src/large.sql"),
      `${Array.from({ length: 301 }, () => "select 1;").join("\n")}\n`,
      "utf8",
    );
    await writeHarnessConfig(
      root,
      `
modularity:
  limit: 300
  policy: scoped_waivers
  waivers:
    - path: src/legacy.vue
      category: legacy_migration
      owner: harness-maintainers
      introduced_at: "2026-07-30"
      reason: "Legacy JS-token heuristic exceeded its export threshold."
      tracking_issue: "modularity-capability-migration"
      expiry_condition: "Remove when the capability model no longer applies JS metrics to Vue."
    - path: src/large.sql
      category: legacy_migration
      owner: harness-maintainers
      introduced_at: "2026-07-30"
      reason: "The SQL source exceeds the portable physical-line threshold."
      tracking_issue: "split-large-sql"
      expiry_condition: "Remove after the SQL source is split below 300 lines."
`,
    );

    const before = runCli(root, [
      "check-modularity",
      "--config-only",
      "--fail-on-warning",
    ]);
    assert.equal(before.status, 1, output(before));
    assert.match(before.stderr, /src\/legacy\.vue.*obsolete/is);
    assert.match(before.stderr, /run ty-context upgrade/);

    const plan = runCli(root, ["upgrade", "--check", "--json"]);
    assert.equal(plan.status, 1, output(plan));
    assert.ok(
      JSON.parse(plan.stdout).safe_pending.some(
        (entry) => entry.id === "modularity-capability-waiver-cleanup",
      ),
    );

    const sync = runCli(root, ["sync"]);
    assert.equal(sync.status, 0, output(sync));
    const afterSync = await configText(root);
    assert.match(afterSync, /path: src\/legacy\.vue/);
    assert.match(afterSync, /path: src\/large\.sql/);

    const upgrade = runCli(root, ["upgrade"]);
    assert.equal(upgrade.status, 0, output(upgrade));
    const afterUpgrade = await configText(root);
    assert.doesNotMatch(afterUpgrade, /path: src\/legacy\.vue/);
    assert.match(afterUpgrade, /path: src\/large\.sql/);

    const after = runCli(root, [
      "check-modularity",
      "--config-only",
      "--fail-on-warning",
    ]);
    assert.equal(after.status, 0, output(after));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("upgrade preserves lifecycle-invalid heuristic waivers for fail-closed repair", async () => {
  const root = await createGitFixture();
  try {
    await writeLegacyHeuristicTarget(root, "src/invalid.vue");
    await writeHarnessConfig(
      root,
      `
modularity:
  limit: 300
  policy: scoped_waivers
  waivers:
    - path: src/invalid.vue
      category: legacy_migration
      introduced_at: "2026-07-30"
      reason: "This intentionally malformed waiver has no owner."
      tracking_issue: "repair-invalid-waiver"
      expiry_condition: "Repair or remove through an explicit owner decision."
`,
    );

    const plan = runCli(root, ["upgrade", "--check", "--json"]);
    assert.equal(
      JSON.parse(plan.stdout).safe_pending.some(
        (entry) => entry.id === "modularity-capability-waiver-cleanup",
      ),
      false,
    );

    const upgrade = runCli(root, ["upgrade"]);
    assert.equal(upgrade.status, 0, output(upgrade));
    assert.match(await configText(root), /path: src\/invalid\.vue/);

    const check = runCli(root, [
      "check-modularity",
      "--config-only",
      "--fail-on-warning",
    ]);
    assert.equal(check.status, 1, output(check));
    assert.match(check.stderr, /\.owner must be a non-empty string/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("upgrade preserves duplicate normalized waiver targets for fail-closed repair", async () => {
  const root = await createGitFixture();
  try {
    await writeLegacyHeuristicTarget(root, "src/duplicate.vue");
    await writeHarnessConfig(
      root,
      `
modularity:
  limit: 300
  policy: scoped_waivers
  waivers:
    - path: src/duplicate.vue
      category: legacy_migration
      owner: harness-maintainers
      introduced_at: "2026-07-30"
      reason: "First spelling of a duplicated waiver target."
      tracking_issue: "repair-duplicate-waiver"
      expiry_condition: "Remove after repairing the duplicate configuration."
    - path: ./src/duplicate.vue
      category: legacy_migration
      owner: harness-maintainers
      introduced_at: "2026-07-30"
      reason: "Second spelling of a duplicated waiver target."
      tracking_issue: "repair-duplicate-waiver"
      expiry_condition: "Remove after repairing the duplicate configuration."
`,
    );

    const plan = runCli(root, ["upgrade", "--check", "--json"]);
    assert.equal(
      JSON.parse(plan.stdout).safe_pending.some(
        (entry) => entry.id === "modularity-capability-waiver-cleanup",
      ),
      false,
    );

    const upgrade = runCli(root, ["upgrade"]);
    assert.equal(upgrade.status, 0, output(upgrade));
    const afterUpgrade = await configText(root);
    assert.equal(
      [...afterUpgrade.matchAll(/path: (?:\.\/)?src\/duplicate\.vue/g)].length,
      2,
    );

    const check = runCli(root, [
      "check-modularity",
      "--config-only",
      "--fail-on-warning",
    ]);
    assert.equal(check.status, 1, output(check));
    assert.match(check.stderr, /duplicates an existing modularity waiver/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createGitFixture() {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-modularity-upgrade-"),
  );
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeHarnessConfig(root, "");
  run("git", ["init"], root);
  run("git", ["config", "user.name", "Codex"], root);
  run("git", ["config", "user.email", "codex@example.local"], root);
  run("git", ["add", "."], root);
  run("git", ["commit", "-m", "initial"], root);
  return root;
}

async function writeLegacyHeuristicTarget(root, relativePath) {
  const declarations = Array.from(
    { length: 25 },
    (_, index) => `export const legacy_${index} = ${index};`,
  ).join("\n");
  await writeFile(path.join(root, relativePath), `${declarations}\n`, "utf8");
}

async function writeHarnessConfig(root, extraConfig) {
  await mkdir(path.join(root, ".agent"), { recursive: true });
  await writeFile(
    path.join(root, ".agent/config.yaml"),
    `core:
  package: project-tiny-context-harness
  schema_version: "4"
${extraConfig}
`,
    "utf8",
  );
}

function configText(root) {
  return readFile(path.join(root, ".agent/config.yaml"), "utf8");
}

function runCli(cwd, args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, output(result));
}

function output(result) {
  return `${result.stdout}\n${result.stderr}`;
}
