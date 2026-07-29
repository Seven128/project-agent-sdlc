import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFile(path.join(repo, relative), "utf8");
const pointerDirs = [
  ".codex/ty-context-managed/skills/source-plan-authoring",
  ".codex/skills/source-plan-authoring",
  "packages/ty-context/assets/skills/source-plan-authoring",
];
const sourceAuthoringPaths = [
  ".codex/ty-context-managed/skills/long-task-workflow/references/source-authoring.md",
  ".codex/skills/long-task-workflow/references/source-authoring.md",
  "packages/ty-context/assets/skills/long-task-workflow/references/source-authoring.md",
];

test("source-plan-authoring is a byte-identical retired compatibility pointer", async () => {
  const copies = await Promise.all(
    pointerDirs.map((dir) => readFile(path.join(repo, dir, "SKILL.md"), "utf8")),
  );
  assert.equal(copies[1], copies[0]);
  assert.equal(copies[2], copies[0]);
  for (const dir of pointerDirs)
    assert.deepEqual(await readdir(path.join(repo, dir)), ["SKILL.md"]);

  const match = copies[0].match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u);
  assert.ok(match);
  const metadata = YAML.parse(match[1]);
  assert.deepEqual(Object.keys(metadata).sort(), ["description", "name"]);
  assert.equal(metadata.name, "source-plan-authoring");
  assert.match(metadata.description, /Retired compatibility pointer/iu);
  assert.match(metadata.description, /Source-bound Contract Draft loop immediately/iu);
  assert.match(metadata.description, /no.*internal Source-authoring stage/isu);
  assert.match(match[2], /no longer defines a separate handoff/iu);
  assert.match(match[2], /revised proposal, selected immutable design resources/iu);
  assert.match(match[2], /Source-quality synthesis\/refinement/iu);
  assert.match(match[2], /enter the same `delivery-contract\.yaml` Draft immediately/iu);
  assert.match(match[2], /Contract mapping converge in one Goal/iu);
  assert.match(match[2], /current native Goal.*default Workflow Contract/isu);
  assert.match(match[2], /pre-existing Source Plan remains valid ordinary Source/iu);
  assert.match(match[2], /Do not.*create a new Source Plan artifact/isu);
  assert.match(match[2], /second plan, Contract Draft, Preflight, Compile, Receipt, Authority or state/iu);
  assert.doesNotMatch(match[2], /## Intake Modes|## Authoring Workflow|## Completeness Check/iu);
});

test("long-task-workflow owns the former Source-quality authoring semantics", async () => {
  const [refs, longTask, contract, spec, readmes] = await Promise.all([
    Promise.all(sourceAuthoringPaths.map(read)),
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read(".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md"),
    read("PROJECT_SPEC.md"),
    Promise.all([read("README.md"), read("README.zh-CN.md"), read("packages/ty-context/README.md")]).then(
      (items) => items.join("\n"),
    ),
  ]);
  assert.equal(refs[1], refs[0]);
  assert.equal(refs[2], refs[0]);
  const source = refs[0];

  for (const expected of [
    /raw, mixed, attachment-heavy or incomplete inputs/iu,
    /Inputs enter the Draft immediately/iu,
    /neither an earlier Source-authoring phase nor a standalone Source Plan stage/iu,
    /Assign every proposal, selected design resource, screenshot/iu,
    /never silently sample a multi-part artifact/iu,
    /`exact-target`, `constraint` or `inspiration`/iu,
    /provider\/project\/run\/entry provenance and immutable digest/iu,
    /Preference and research gate/iu,
    /fidelity versus cost/iu,
    /current primary\/authoritative evidence/iu,
    /`direct`.*`derived`.*`delegated`.*`evidence-backed`.*`decision_required`/isu,
    /stable semantic lowercase-kebab keys/iu,
    /surface.*region.*control type.*label\/content.*validation.*recovery.*accessibility/isu,
    /exactly one Given\/When\/Then scenario/iu,
    /`data_migration`/u,
    /`critical_user_path` and `weak_observability`/u,
    /`multi_repository_change`/u,
    /Preflight\/Compile convergence audit/iu,
    /ty-source-item:start\/end/iu,
  ]) assert.match(source, expected);

  assert.match(longTask, /references\/source-authoring\.md/iu);
  assert.match(longTask, /external initial proposal, selected design resources/iu);
  assert.match(longTask, /Conversation-only material becomes exactly one project-native Markdown Source/iu);
  assert.match(longTask, /Every input enters.*Draft immediately/iu);
  assert.match(longTask, /Do not create a Source-authoring phase/iu);
  assert.match(contract, /apply `source-authoring\.md` alongside mapping/iu);
  assert.match(contract, /revised initial proposal and selected design resources are parallel Source inputs/iu);
  assert.match(spec, /^## Source-Bound Contract Draft Boundary$/mu);
  assert.match(spec, /Source-quality work is not an earlier lifecycle stage/iu);
  assert.match(spec, /`source-plan-authoring` is a retired explicit-selection compatibility pointer/iu);
  assert.match(readmes, /Retired Source Plan Compatibility/iu);
  assert.match(readmes, /退役 Source Plan 兼容入口/u);
  assert.match(readmes, /Source-bound Contract Draft loop immediately/iu);
  assert.doesNotMatch(readmes, /before Contract mapping/iu);
});

test("profile keeps the pointer only with long-task while one Draft loop owns authoring", async () => {
  const [profile, context, agents, sourceAuthoring] = await Promise.all([
    read("packages/ty-context/src/lib/profiles.ts"),
    read("project_context/areas/harness-package/contracts/package-managed-surfaces.md"),
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/source-authoring.md",
    ),
  ]);
  assert.match(profile, /if \(isProfileEnabled\(config, "long-task"\)\)[\s\S]*names\.add\("long-task-workflow"\)[\s\S]*names\.add\("source-plan-authoring"\)/u);
  assert.match(context, /retired `source-plan-authoring` pointer/iu);
  assert.match(agents, /loaded Skill[\s\S]*own Source\/Contract authoring/iu);
  assert.match(
    sourceAuthoring,
    /neither an earlier Source-authoring phase nor a standalone Source Plan stage/iu,
  );
  assert.match(sourceAuthoring, /pre-existing Source Plan is simply one possible input/iu);
});
