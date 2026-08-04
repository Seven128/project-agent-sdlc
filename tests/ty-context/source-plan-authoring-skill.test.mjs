import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createUpgradePlan,
  runMigrations,
} from "../../packages/ty-context/dist/lib/migrations.js";
import {
  createDeliveryFixture,
  runCli,
} from "./long-task-delivery-fixtures.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFile(path.join(repo, relative), "utf8");
const retiredPointerPaths = [
  ".codex/ty-context-managed/skills/source-plan-authoring/SKILL.md",
  ".codex/skills/source-plan-authoring/SKILL.md",
  "packages/ty-context/assets/skills/source-plan-authoring/SKILL.md",
];

test("source-plan-authoring is absent while its useful semantics stay in one Draft loop", async () => {
  for (const relative of retiredPointerPaths)
    await assert.rejects(access(path.join(repo, relative)));

  const [profile, sourceAuthoring, longTask, spec, context, readmes, cli] =
    await Promise.all([
      read("packages/ty-context/src/lib/profiles.ts"),
      read(
        ".codex/ty-context-managed/skills/long-task-workflow/references/source-authoring.md",
      ),
      read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
      read("PROJECT_SPEC.md"),
      read(
        "project_context/areas/harness-package/contracts/package-managed-surfaces.md",
      ),
      Promise.all([
        read("README.md"),
        read("README.zh-CN.md"),
        read("packages/ty-context/README.md"),
      ]).then((items) => items.join("\n")),
      read("packages/ty-context/src/commands/index.ts"),
    ]);
  assert.doesNotMatch(profile, /names\.add\("source-plan-authoring"\)/u);
  assert.match(sourceAuthoring, /pre-existing Source Plan is simply one possible input/iu);
  assert.match(sourceAuthoring, /neither an earlier Source-authoring phase nor a standalone Source Plan stage/iu);
  assert.match(longTask, /legacy Source Plan.*same non-authoritative.*Draft/isu);
  assert.match(spec, /source-plan-authoring.*retired from package management/iu);
  assert.match(context, /ordinary sync.*no deleted-Skill registry/iu);
  assert.match(readmes, /legacy Source Plans?(?: documents)? remain.*ordinary Source/iu);
  assert.match(readmes, /machine.*assurance.*long-task-workflow/isu);
  assert.match(readmes, /default Workflow Contract/iu);
  assert.doesNotMatch(cli, /Install Long-Task Skill, Source Plan pointer/iu);
});

test("upgrade removes only the exact former package pointer", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "ty-context-source-plan-retire-"));
  const skill = path.join(root, ".codex/skills/source-plan-authoring");
  const former = await read(
    "tests/ty-context/fixtures/removed-source-plan-authoring-SKILL.md",
  );
  try {
    await mkdir(skill, { recursive: true });
    await writeFile(
      path.join(root, "package.json"),
      `${JSON.stringify({ tyContext: { harnessFolderName: ".codex" } }, null, 2)}\n`,
    );
    await writeFile(path.join(skill, "SKILL.md"), former);
    const plan = await createUpgradePlan(root);
    assert.ok(
      plan.safe_pending.some(
        (item) => item.id === "remove-source-plan-authoring-skill",
      ),
    );
    const report = await runMigrations(root, plan);
    assert.ok(
      report.changed.some((item) =>
        item.endsWith("skills/source-plan-authoring"),
      ),
    );
    await assert.rejects(access(skill));

    await mkdir(skill, { recursive: true });
    await writeFile(path.join(skill, "SKILL.md"), `${former}\nUser change.\n`);
    const modifiedPlan = await createUpgradePlan(root);
    assert.ok(
      modifiedPlan.manual_required.some(
        (item) => item.id === "remove-source-plan-authoring-skill",
      ),
    );
    const modifiedReport = await runMigrations(root, modifiedPlan);
    assert.ok(
      modifiedReport.manualRequired.some(
        (item) => item.id === "remove-source-plan-authoring-skill",
      ),
    );
    assert.match(await readFile(path.join(skill, "SKILL.md"), "utf8"), /User change/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ordinary sync preserves a modified retired same-name Skill", async () => {
  const fixture = await createDeliveryFixture();
  const skill = path.join(
    fixture.root,
    ".codex/skills/source-plan-authoring/SKILL.md",
  );
  try {
    await mkdir(path.dirname(skill), { recursive: true });
    await writeFile(skill, "# User-owned source-plan-authoring\n");
    await runCli(fixture.root, ["enable", "long-task"]);
    assert.equal(
      await readFile(skill, "utf8"),
      "# User-owned source-plan-authoring\n",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
