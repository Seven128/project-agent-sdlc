import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

test("shared engineering quality is visible while routing questions stay internal", () => {
  const sources = [
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
    read(".codex/ty-context-managed/skills/context_development_engineer/SKILL.md"),
    read("packages/ty-context/assets/skills/context_development_engineer/SKILL.md")
  ];

  for (const content of sources) {
    assert.match(content, /Architecture Deliberation/);
    assert.match(content, /Architecture Conformance/);
    assert.match(content, /Engineering Quality Conformance/);
    assert.match(content, /quality|质量/iu);
    assert.match(content, /Architecture Context Hit/);
    assert.match(content, /Decision Rationale Hit: existing\|required\|none|Decision Rationale Hit: <existing \| required \| none>/);
    assert.match(content, /Context Delta: none\|required/);
    assert.match(content, /Modularity Check: none\|required\|exception/);
    assert.doesNotMatch(content, /Architecture Delta/);
    assert.doesNotMatch(content, /Rationale Delta/);
  }

  const developmentSkill = sources[2];
  assert.match(developmentSkill, /durable architecture boundary/);
  assert.match(developmentSkill, /API \/ Schema \/ data contract/);
  assert.match(developmentSkill, /state \/ runtime semantics/);
  assert.match(developmentSkill, /dependency direction/);
  assert.match(developmentSkill, /verification \/ deployment semantics/);
  assert.match(developmentSkill, /durable rationale \/ tradeoff/);
  assert.match(
    developmentSkill,
    /每个实现需求都执行一次[\s\S]*small code task[\s\S]*保持现有架构[\s\S]*不能用“无需架构考虑”跳过/,
  );
  assert.match(developmentSkill, /不输出私有思维链/);
  assert.match(developmentSkill, /新增或加重技术债默认阻塞交付/);
  assert.match(developmentSkill, /Implementation Quality Discipline/);
  assert.match(developmentSkill, /performance\/capacity\/cost/);
  assert.match(developmentSkill, /workload.*metric.*environment.*comparator\/tolerance/s);
  assert.match(developmentSkill, /功能 pass.*聚合代替/s);
  assert.match(developmentSkill, /capability-aware/);
  assert.match(developmentSkill, /不支持的指标为 `n\/a`/);
  assert.match(developmentSkill, /普通 `sync` 不做迁移/);
  assert.match(developmentSkill, /lifecycle-complete waiver/);
  assert.match(developmentSkill, /不要创建 `plan\.md`、Task Contract 文件或 Markdown 映射表/);
});

test("templates keep rationale durable, optional and evidence-free", () => {
  const templatePairs = [
    [".codex/ty-context-managed/context_templates/global.md", "packages/ty-context/assets/context_templates/global.md"],
    [".codex/ty-context-managed/context_templates/architecture.md", "packages/ty-context/assets/context_templates/architecture.md"],
    [".codex/ty-context-managed/context_templates/area.md", "packages/ty-context/assets/context_templates/area.md"],
    [
      ".codex/ty-context-managed/context_templates/product-surface-contract.md",
      "packages/ty-context/assets/context_templates/product-surface-contract.md"
    ],
    [
      ".codex/ty-context-managed/context_templates/screen-contract.md",
      "packages/ty-context/assets/context_templates/screen-contract.md"
    ]
  ];

  for (const [managedPath, packagedPath] of templatePairs) {
    for (const content of [read(managedPath), read(packagedPath)]) {
      assert.match(content, /Design Rationale|rationale/);
      assert.match(content, /durable|stable/);
      assert.match(content, /rejected alternative|rejected alternatives/);
      assert.match(content, /tradeoff|tradeoffs/);
      assert.match(content, /Do not invent rationale|Do not update this Context for:/);
      assert.match(content, /implementation summaries|implementation summary|Local implementation summaries/);
      assert.match(content, /command output|Test logs|test result claims/);
    }
  }

  for (const content of [
    read(".codex/ty-context-managed/context_templates/architecture.md"),
    read("packages/ty-context/assets/context_templates/architecture.md"),
  ]) {
    assert.match(content, /engineering-quality constraints and tradeoffs/);
    assert.match(content, /failure\/recovery or resource lifecycle/);
    assert.match(content, /future-change\/load\/failure\/threat scenario/);
    assert.match(content, /type\/compiler\/lint\/architecture\/contract\/behavior\/benchmark\/probe/);
    assert.match(content, /Static shape checks are not runtime-performance proof/);
  }
  for (const content of [
    read(".codex/ty-context-managed/context_templates/verification.md"),
    read("packages/ty-context/assets/context_templates/verification.md"),
  ]) {
    assert.match(content, /what each path can and cannot falsify/);
    assert.match(content, /overall code quality or runtime-performance proof/);
    assert.match(content, /workload\/fixture.*metric.*environment/s);
  }
});

test("public docs and spec frame one shared engineering obligation without a process chain", () => {
  const docs = [read("README.md"), read("packages/ty-context/README.md"), read("packages/ty-context/assets/README.md")];

  for (const content of docs) {
    assert.match(content, /Shared Engineering Quality extends the architecture obligation/);
    assert.match(content, /Every implementation delivery visibly completes `Architecture Deliberation`/);
    assert.match(content, /Engineering Quality Conformance/);
    assert.match(content, /Architecture Conformance/);
    assert.match(content, /Final Gate is the sole Long-Task carrier/);
    assert.match(content, /not overall code quality/);
    assert.match(content, /Goal-owned/);
    assert.match(content, /Semantic Facts/);
    assert.match(content, /workload, metric, baseline or budget, environment, comparator\/tolerance/);
    assert.match(content, /Architecture Context Hit/);
    assert.match(content, /Decision Rationale Hit: existing\|required\|none/);
    assert.match(content, /no Task Contract.*fixed `plan\.md`/si);
    assert.match(
      content,
      /does not expose private chain-of-thought, guarantee the best design or anticipate every unknowable future request/,
    );
    assert.match(content, /Store stable reasons, rejected alternatives or tradeoffs/);
    assert.match(content, /smallest durable Context surface/);
    assert.match(
      content,
      /rather than becoming a language-generic architecture, quality or performance analyzer/,
    );
    assert.match(content, /no quality plan, stage, matrix, second Authority/);
    assert.doesNotMatch(content, /Architecture Delta|Rationale Delta/);
  }

  const spec = read("PROJECT_SPEC.md");
  assert.match(spec, /Every implementation delivery has one thin Shared Engineering Quality Obligation/);
  assert.match(spec, /Applicable Quality Attributes.*Implementation Quality Discipline.*not stages, Gates, states or artifacts/s);
  assert.match(spec, /Exact product, business and technical predicates.*Non-UI Semantic Fact closure/s);
  assert.match(spec, /Final Gate is the sole Long-Task Engineering Quality\/Architecture Conformance carrier/);
  assert.match(spec, /proves only that declared, falsifiable, project-check-bound set—not overall code quality/);
  assert.match(spec, /Architecture Context Hit.*internal routing question/s);
  assert.match(spec, /Decision Rationale Hit: existing\|required\|none.*internal routing question/s);
  assert.match(spec, /not durable facts, roles, validators or artifacts/);
  assert.match(spec, /never creates a rationale delta or required file/);
  assert.match(spec, /Context Delta.*only durable-fact decision point/s);
  assert.match(spec, /two workflow entries are execution carriers, not nested quality workflows/);
  assert.match(spec, /No engineering-quality plan, stage, matrix, ADR, new Contract field\/aspect\/Claim kind\/risk, second Authority, Gate, scheduler, persistent state/);
});

test("Long-Task reuses existing authority and limits its quality claim", () => {
  const sources = [
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read("packages/ty-context/assets/skills/long-task-workflow/SKILL.md"),
    read(".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md"),
    read("packages/ty-context/assets/skills/long-task-workflow/references/contract-authoring.md"),
    read(".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md"),
    read("packages/ty-context/assets/skills/long-task-workflow/references/authority-lifecycle.md")
  ];

  assert.equal(sources[0], sources[1], "Long-Task Skill package drift");
  assert.equal(sources[2], sources[3], "Contract-authoring reference package drift");
  assert.equal(sources[4], sources[5], "Authority-lifecycle reference package drift");
  for (const content of [sources[0], sources[2], sources[4]]) {
    assert.match(content, /Engineering Quality(?: Conformance|\/Architecture Conformance)/);
    assert.match(content, /not overall code quality/);
  }
  const combined = sources.join("\n");
  assert.match(combined, /Source-backed/);
  assert.match(combined, /project-owned[\s\S]{0,100}Checks?/);
  assert.match(combined, /independent Assertion|separate Assertions?/);
  assert.match(combined, /no quality Boolean, matrix, Source aspect, Claim\/risk kind, Contract field, second Gate, state or Receipt/);
  assert.match(combined, /no separate default Contract Conformance closure/);
  assert.match(sources[2], /`quality == true`/);
  assert.match(sources[2], /performance claim.*workload.*metric.*environment.*benchmark\/probe/s);
});

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}
