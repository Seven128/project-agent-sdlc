import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFile(path.join(repo, relative), "utf8");
const roots = [
  ".codex/ty-context-managed/skills/design-system-authoring",
  ".codex/skills/design-system-authoring",
  "packages/ty-context/assets/skills/design-system-authoring",
];
const copies = (relative) => Promise.all(roots.map((root) => read(`${root}/${relative}`)));

test("design-system-authoring has exact managed/generated/package copies", async () => {
  for (const relative of [
    "SKILL.md",
    "agents/openai.yaml",
    "references/open-design-design-system-provider.md",
    "references/authority-adoption.md",
  ]) {
    const values = await copies(relative);
    assert.equal(values[1], values[0], `${relative}: generated drift`);
    assert.equal(values[2], values[0], `${relative}: package drift`);
  }
});

test("design-system-authoring is explicit-only and cannot be inferred from cold start", async () => {
  const [skill, agent] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("agents/openai.yaml").then((items) => items[0]),
  ]);
  const match = skill.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u);
  assert.ok(match);
  const metadata = YAML.parse(match[1]);
  assert.deepEqual(Object.keys(metadata).sort(), ["description", "name"]);
  assert.equal(metadata.name, "design-system-authoring");
  assert.match(metadata.description, /Use only when the user explicitly asks/iu);
  assert.match(metadata.description, /项目设计系统|项目 design system|project design system/iu);
  assert.match(metadata.description, /never runs merely because DESIGN\.md is missing/iu);

  const agentMetadata = YAML.parse(agent);
  assert.equal(agentMetadata.policy.allow_implicit_invocation, false);
  assert.match(agentMetadata.interface.default_prompt, /\$design-system-authoring/u);
  assert.match(match[2], /Never auto-run from `init`, `sync`, the default Workflow, `design-resource-authoring`/iu);
  assert.match(match[2], /combined explicit user request.*authoriz/iu);
});

test("design-system workflow separates provider output, selection, adoption and binding", async () => {
  const [skill, provider, adoption] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/open-design-design-system-provider.md").then((items) => items[0]),
    copies("references/authority-adoption.md").then((items) => items[0]),
  ]);
  for (const expected of [
    /Bootstrap, revise or reconcile/iu,
    /candidate generation, human\/delegated selection, and the later explicit adoption confirmation distinct/iu,
    /Root `DESIGN\.md` is the unique Authority entry and revision owner/iu,
    /supported front matter remains the editable exact Token authority/iu,
    /`design_system\/tokens\.json` is deterministic generated output/iu,
    /sparse `design_system\/authority\.manifest\.json` owns closure membership\/digest only/iu,
    /DRA `authority_delta_candidate` is non-authoritative input[\s\S]*explicitly start `reconcile` mode/iu,
    /Require explicit user\/team selection, or explicit delegated selection/iu,
    /Stop for separate adoption confirmation/iu,
    /new complete closure identity[\s\S]*Rebind affected DRA resources\/handoffs/iu,
    /provider succeeded.*artifact ready.*selected.*authority adopted.*binding verified/isu,
  ]) assert.match(skill, expected);

  assert.match(provider, /Open Design 0\.15\.1.*MCP server 0\.2\.0/isu);
  assert.match(provider, /protocol `2025-06-18`/u);
  assert.match(provider, /152 concrete design-system resources/iu);
  assert.match(provider, /od:\/\/design-systems\/<id>\/DESIGN\.md/u);
  assert.match(provider, /`-32601`[\s\S]*`resources\/templates\/list`/u);
  assert.match(provider, /template enumeration as optional protocol capability/iu);
  assert.match(provider, /`create_project` accepts optional `designSystem`/u);
  assert.match(provider, /no create\/update design-system MCP tool/iu);
  assert.match(provider, /feature-detect future structured methods/iu);
  assert.match(provider, /POST \/api\/design-systems\/generation-jobs/u);
  assert.match(provider, /POST \/api\/design-systems\/<id>\/revision-jobs/u);
  assert.match(provider, /PATCH \/api\/design-systems\/<id>\/revisions\/<revisionId>/u);
  assert.match(provider, /\{"status":"accepted"\}/u);
  assert.match(provider, /get_project\.designSystemId/u);
  assert.match(provider, /same installed Open Design daemon/iu);
  assert.match(provider, /Persistent MCP registration.*require separate authorization/iu);

  assert.match(adoption, /Single-owner writeback/iu);
  assert.match(adoption, /project_context\/\*\*/u);
  assert.match(adoption, /root `DESIGN\.md`/u);
  assert.match(adoption, /sole revision and editable exact-Token owner/iu);
  assert.match(
    adoption,
    /generated `tokens\.json` exactly matches deterministic projection/iu,
  );
  assert.match(
    adoption,
    /sparse manifest contains only complete closure membership\/digest/iu,
  );
  assert.match(adoption, /provider name\/version.*design-system ID.*revision.*SHA-256/isu);
  assert.match(
    adoption,
    /editable upstream owner\/locator\/update\/export route/iu,
  );
  assert.match(adoption, /Context-reachable/iu);
  assert.match(
    adoption,
    /Never overwrite an adopted selected-resource baseline in place[\s\S]*new immutable version\/digest/iu,
  );
  assert.match(adoption, /Project files are canonical/iu);
  assert.match(adoption, /Provider mismatch is synchronization drift/iu);
  assert.match(
    provider,
    /package-local `@google\/design\.md` adapter[\s\S]*not Open Design[\s\S]*does not generate candidates/iu,
  );
});

test("base profile, public docs and owning Context expose the same design-system boundary", async () => {
  const [profile, spec, readmes, contextModel, packageSurface, implementation, verification] = await Promise.all([
    read("packages/ty-context/src/lib/profiles.ts"),
    read("PROJECT_SPEC.md"),
    Promise.all([read("README.md"), read("README.zh-CN.md"), read("packages/ty-context/README.md")]).then(
      (items) => items.join("\n"),
    ),
    read("project_context/areas/harness-package/foundation/context-model.md"),
    read("project_context/areas/harness-package/contracts/package-managed-surfaces.md"),
    read("project_context/areas/harness-package/implementation-index.md"),
    read("project_context/areas/harness-package/verification.md"),
  ]);
  assert.match(profile, /"design-system-authoring"[\s\S]*"design-resource-authoring"/u);
  for (const content of [spec, readmes, packageSurface, implementation, verification]) {
    assert.match(content, /design-system-authoring/u);
    assert.match(content, /Open Design/u);
  }
  assert.match(contextModel, /UI Authority Closure[\s\S]*stable surface\/control\/target keys/iu);
  assert.match(
    contextModel,
    /adopted exact target or constraint[\s\S]*exactly one canonical adoption record/iu,
  );
  assert.match(readmes, /^## Recommended Usage$/mu);
  assert.match(readmes, /^## 推荐用法$/mu);
  assert.match(
    readmes,
    /missing `DESIGN\.md` or ordinary UI work never invokes it automatically/iu,
  );
  assert.match(readmes, /下游 Skill 都不会自动执行/u);
  assert.match(
    readmes,
    /Root `DESIGN\.md` is the unique Authority entry[\s\S]*`design_system\/authority\.manifest\.json`[\s\S]*`design_system\/tokens\.json`/iu,
  );
  assert.match(
    readmes,
    /complete closure digest[\s\S]*separate explicit adoption confirmation/iu,
  );
  assert.match(readmes, /style-bearing/iu);
  assert.match(spec, /provider metadata never becomes a second authority/iu);
});
