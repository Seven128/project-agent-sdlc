import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");

test("context development Skill is a content-sensitive engineering-design adapter", async () => {
  const [source, generated, packaged, reasoning, generatedReasoning, packagedReasoning, contextManifest] = await Promise.all([
    read(".codex/ty-context-managed/skills/context_development_engineer/SKILL.md"),
    read(".codex/skills/context_development_engineer/SKILL.md"),
    read("packages/ty-context/assets/skills/context_development_engineer/SKILL.md"),
    read(".codex/ty-context-managed/skills/context_development_engineer/references/engineering-design-reasoning.md"),
    read(".codex/skills/context_development_engineer/references/engineering-design-reasoning.md"),
    read("packages/ty-context/assets/skills/context_development_engineer/references/engineering-design-reasoning.md"),
    read("project_context/context.toml"),
  ]);
  assert.equal(generated, source);
  assert.equal(packaged, source);
  assert.equal(generatedReasoning, reasoning);
  assert.equal(packagedReasoning, reasoning);

  const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(source);
  assert.ok(frontMatter);
  const description = YAML.parse(frontMatter[1]).description;
  const [positive = "", negative = ""] = description.split("Do not trigger");
  assert.match(positive, /architecture or engineering design/iu);
  assert.match(positive, /technical design\/plan/iu);
  assert.match(positive, /complex implementation design/iu);
  assert.match(positive, /high-level engineering assessment/iu);
  assert.match(positive, /actual task content materially requires/iu);
  assert.match(positive, /owner\/source-of-truth/iu);
  assert.match(positive, /concurrency\/recovery/iu);
  assert.match(positive, /external-integration\/shared-abstraction/iu);
  assert.match(positive, /performance, security, compatibility\/migration/iu);
  assert.match(positive, /architecture-audit judgment/iu);
  assert.match(positive, /架构方案/u);
  assert.doesNotMatch(
    positive,
    /multi-agent|subagent|software engineer|开发工程师|generic implementation plan/iu,
  );
  assert.match(negative, /routine coding/iu);
  assert.match(negative, /local bug fixes/iu);
  assert.match(negative, /tests, documentation, styling/iu);
  assert.match(negative, /generic requests to implement\/build\/change code/iu);
  assert.match(negative, /generic implementation plan/iu);
  assert.match(negative, /role-only mentions/iu);
  assert.match(negative, /multi-agent, subagent/iu);

  assert.match(source, /default Workflow Contract/iu);
  assert.match(source, /not the default implementation workflow/iu);
  assert.match(source, /engineering-design-reasoning\.md/iu);
  assert.match(source, /apply only the methods triggered/iu);
  assert.match(source, /Architecture Deliberation/iu);
  assert.match(source, /Context Delta: none\|required/u);
  assert.match(source, /source of truth and extension point/iu);
  assert.match(source, /future-change/iu);
  assert.match(source, /technical debt/iu);
  assert.match(source, /capability scope/iu);
  assert.match(source, /representative sample validation/iu);
  assert.match(source, /full-population operation/iu);
  assert.match(source, /all-provider\/all-interface\/all-platform/iu);
  assert.match(source, /context_product_plan/iu);
  assert.match(source, /context_surface_contract/iu);
  assert.match(source, /context_uiux_design/iu);
  assert.match(source, /design-resource-authoring/iu);
  assert.match(source, /no second plan, stage, delegation policy\/state or acceptance path/iu);

  assert.match(reasoning, /facts.*constraints.*assumptions.*unknowns/isu);
  assert.match(reasoning, /drivers and path dependence/iu);
  assert.match(reasoning, /smallest material alternative set/iu);
  assert.match(reasoning, /Steelman every material alternative/iu);
  assert.match(reasoning, /counterfactuals and failure paths/iu);
  assert.match(reasoning, /risk-triggered methods/iu);
  assert.match(reasoning, /minimum architecture experiment/iu);
  assert.match(reasoning, /owning modules, paths and symbols/iu);
  assert.match(reasoning, /public\/internal interfaces/iu);
  assert.match(reasoning, /data and state owner/iu);
  assert.match(reasoning, /runtime\/resource lifecycle/iu);
  assert.match(reasoning, /Architecture audit route/iu);
  assert.match(reasoning, /never run all of them by default/iu);
  assert.match(reasoning, /representative input proves only its declared scope/iu);

  const architectureTriggers = contextManifest
    .split(/\r?\n/u)
    .find((line) => line.includes('"engineering design assumption"'));
  assert.ok(architectureTriggers);
  for (const trigger of [
    "engineering design assumption",
    "architecture path dependence",
    "architecture alternative analysis",
    "architecture audit",
    "implementation tradeoff",
    "minimum architecture experiment",
  ])
    assert.match(architectureTriggers, new RegExp(`"${trigger}"`, "u"));

  const uiuxTriggers = contextManifest
    .split(/\r?\n/u)
    .find((line) => line.includes('"task-centered UI analysis"'));
  assert.ok(uiuxTriggers);
  for (const trigger of [
    "task-centered UI analysis",
    "primary work object",
    "operation feedback relationship",
    "repeated-scroll UX",
    "interaction topology",
    "client-specific UI structure",
    "mobile editing workflow",
  ])
    assert.match(uiuxTriggers, new RegExp(`"${trigger}"`, "u"));
  for (const generic of ["target user", "primary task", "robustness", "performance", "UI"])
    assert.doesNotMatch(`${architectureTriggers}\n${uiuxTriggers}`, new RegExp(`"${generic}"`, "u"));
});
