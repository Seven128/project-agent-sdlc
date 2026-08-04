import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath) => readFile(path.join(repoRoot, relativePath), "utf8");

test("context development Skill is a narrow engineering-design adapter", async () => {
  const [source, generated, packaged] = await Promise.all([
    read(".codex/ty-context-managed/skills/context_development_engineer/SKILL.md"),
    read(".codex/skills/context_development_engineer/SKILL.md"),
    read("packages/ty-context/assets/skills/context_development_engineer/SKILL.md"),
  ]);
  assert.equal(generated, source);
  assert.equal(packaged, source);

  const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(source);
  assert.ok(frontMatter);
  const description = YAML.parse(frontMatter[1]).description;
  const [positive = "", negative = ""] = description.split("Do not trigger");
  assert.match(positive, /architecture or engineering design/iu);
  assert.match(positive, /technical design\/plan/iu);
  assert.match(positive, /complex implementation design/iu);
  assert.match(positive, /high-level engineering assessment/iu);
  assert.match(positive, /架构方案/u);
  assert.doesNotMatch(
    positive,
    /multi-agent|subagent|software engineer|开发工程师|generic implementation plan/iu,
  );
  assert.match(negative, /routine coding/iu);
  assert.match(negative, /generic requests to implement\/build\/change code/iu);
  assert.match(negative, /generic implementation plan/iu);
  assert.match(negative, /role-only mentions/iu);
  assert.match(negative, /multi-agent, subagent/iu);

  assert.match(source, /default Workflow Contract/iu);
  assert.match(source, /not the default implementation workflow/iu);
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
});
