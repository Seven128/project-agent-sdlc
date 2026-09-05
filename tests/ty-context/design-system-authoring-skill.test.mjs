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
    "references/system-design-reasoning.md",
    "references/showcase-projection.md",
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
  const [skill, reasoning, showcase, provider, adoption] = await Promise.all([
    copies("SKILL.md").then((items) => items[0]),
    copies("references/system-design-reasoning.md").then((items) => items[0]),
    copies("references/showcase-projection.md").then((items) => items[0]),
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
    /<!-- ty-context-design-authority-format: bundle-v1 -->[\s\S]*first non-empty Markdown body position/iu,
    /DRA `authority_delta_candidate` is non-authoritative input[\s\S]*explicitly start `reconcile` mode/iu,
    /Require explicit user\/team selection, or explicit delegated selection/iu,
    /Stop for separate adoption confirmation/iu,
    /new complete closure identity[\s\S]*Rebind affected DRA resources\/handoffs/iu,
    /provider succeeded.*artifact ready.*selected.*authority adopted.*binding verified/isu,
    /System Design Reasoning Brief[\s\S]*sourceNotes/iu,
    /handbook first[\s\S]*supplemental application scenes last/iu,
    /target-declared viewport[\s\S]*text-scale[\s\S]*long-label[\s\S]*reduced-motion/iu,
    /design-authority inspect --require-showcase/iu,
  ]) assert.match(skill, expected);

  assert.match(reasoning, /candidate input, not private chain-of-thought, Design Authority, Context, workflow state or an adoption record/iu);
  assert.match(reasoning, /accepted preferences, rejected preferences and unresolved choices as three separate sets/iu);
  assert.match(reasoning, /screen\/layout whitespace[\s\S]*inter-group rhythm[\s\S]*component-internal whitespace[\s\S]*visual-weight whitespace/iu);
  assert.match(reasoning, /visible surface versus hit target[\s\S]*internal padding versus type line height[\s\S]*group gap versus item gap/iu);
  assert.match(reasoning, /classified first by user intent, information responsibility and state model, then by appearance/iu);
  assert.match(reasoning, /source principle, project-specific translation and prohibited copying/iu);
  assert.match(reasoning, /design goal[\s\S]*scenario-linked rationale[\s\S]*Token, component, relationship or pattern realization[\s\S]*counterexample[\s\S]*showcase scenario/iu);
  assert.match(reasoning, /primary artifact is an engineering design-system handbook[\s\S]*Application scenes are last[\s\S]*supplemental-validation/iu);
  assert.match(reasoning, /target-declared viewport, text-scale, long-label and reduced-motion[\s\S]*existing reproducible browser\/E2E route[\s\S]*do not introduce a global fixed mobile viewport policy/iu);
  assert.match(reasoning, /cannot establish aesthetic suitability/iu);

  for (const bilingualPair of [
    [/Scope and people/iu, /范围与人群/u],
    [/Purpose and preference state/iu, /目的与偏好状态/u],
    [/Hierarchy, space and visual weight/iu, /层级、留白和视觉重量/u],
    [/Containment and component semantics/iu, /容器与组件语义/u],
    [/Behavior and adaptation/iu, /行为与适配/u],
    [/Reference translation/iu, /参考资料翻译/u],
    [/Decision rows/iu, /决策行/u],
  ]) {
    assert.match(reasoning, bilingualPair[0]);
    assert.match(reasoning, bilingualPair[1]);
  }

  assert.match(showcase, /human-readable handbook[\s\S]*without creating another Design Authority, Context owner, selected-design Fact source, implementation-conformance proof or aesthetic verdict/iu);
  assert.match(showcase, /design-authority-showcase-v1[\s\S]*artifact_category[\s\S]*design_system_handbook/iu);
  assert.match(showcase, /identity[\s\S]*color[\s\S]*typography[\s\S]*supplemental-validation/iu);
  assert.match(showcase, /data-ty-showcase-section[\s\S]*data-ty-showcase-token-family[\s\S]*data-ty-showcase-component[\s\S]*data-ty-showcase-target/iu);
  assert.match(showcase, /Target-condition scenes are descendants of the final supplemental section[\s\S]*never declares a Token family or component/iu);
  assert.match(showcase, /Do not use scripts[\s\S]*CSS imports[\s\S]*undeclared\/unreachable assets/iu);
  assert.match(showcase, /existing reproducible browser\/E2E route[\s\S]*declared viewport, text-scale, long-label, reduced-motion/iu);
  assert.match(showcase, /valid sidecar proves integrity\/category\/coverage only[\s\S]*selection proves suitability/iu);

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
  assert.match(provider, /complete task-local System Design Reasoning Brief[\s\S]*existing `sourceNotes`/iu);
  assert.match(provider, /engineering design-system handbook as the primary artifact[\s\S]*Product-page galleries are supplemental validation only/iu);

  assert.match(adoption, /Single-owner writeback/iu);
  assert.match(adoption, /project_context\/\*\*/u);
  assert.match(adoption, /root `DESIGN\.md`/u);
  assert.match(adoption, /sole revision and editable exact-Token owner/iu);
  assert.match(
    adoption,
    /<!-- ty-context-design-authority-format: bundle-v1 -->[\s\S]*first non-empty Markdown body line/iu,
  );
  assert.match(
    adoption,
    /bundle-to-one-file adoption removes both marker and manifest[\s\S]*explicit Authority Revision/iu,
  );
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
  assert.match(adoption, /ty-context-design-showcase path="docs\/design-system-showcase\/showcase\.manifest\.json"/u);
  assert.match(adoption, /design-authority-showcase-v1[\s\S]*artifact_category: design_system_handbook[\s\S]*status: adopted/iu);
  assert.match(adoption, /outside `design_system\/\*\*` and outside the Authority closure/iu);
  assert.match(adoption, /application scenes occur last under `supplemental-validation`[\s\S]*cannot declare a second component system/iu);
  assert.match(adoption, /design-authority inspect --require-showcase/iu);
  assert.match(adoption, /existing reproducible browser\/E2E route[\s\S]*declared viewport, text-scale, long-label, reduced-motion[\s\S]*do not add a global fixed viewport list/iu);
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
    /ty-context-design-authority-format: bundle-v1[\s\S]*first non-empty Markdown body line/iu,
  );
  assert.match(
    readmes,
    /complete closure digest[\s\S]*separate explicit adoption confirmation/iu,
  );
  assert.match(readmes, /style-bearing/iu);
  assert.match(spec, /provider metadata never becomes a second authority/iu);
});
