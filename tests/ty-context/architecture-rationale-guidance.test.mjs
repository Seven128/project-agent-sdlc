import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

test("shared engineering quality is visible while routing questions stay internal", () => {
  const agents = read(".codex/ty-context-managed/agents/AGENTS_CORE.md");
  const packagedAgents = read(
    "packages/ty-context/assets/agents/AGENTS_CORE.md",
  );
  const developmentSkill = read(
    ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
  );
  const packagedDevelopment = read(
    "packages/ty-context/assets/skills/context_development_engineer/SKILL.md",
  );
  assert.equal(packagedAgents, agents);
  assert.equal(packagedDevelopment, developmentSkill);

  for (const content of [agents, packagedAgents]) {
    assert.match(content, /Architecture Deliberation/);
    assert.match(content, /Architecture Conformance/);
    assert.match(content, /Engineering Quality Conformance/);
    assert.match(content, /quality|质量/iu);
    assert.match(content, /Architecture Context Hit/);
    assert.match(
      content,
      /Decision Rationale Hit: existing\|required\|none|Decision Rationale Hit: <existing \| required \| none>/,
    );
    assert.match(content, /Context Delta: none\|required/);
    assert.match(content, /Modularity Check: none\|required\|exception/);
    assert.doesNotMatch(content, /Architecture Delta/);
    assert.doesNotMatch(content, /Rationale Delta/);
  }

  assert.match(developmentSkill, /Architecture Deliberation/);
  assert.match(developmentSkill, /Architecture Conformance/);
  assert.match(developmentSkill, /Engineering\/Architecture Conformance/);
  assert.match(developmentSkill, /Context Delta: none\|required/);
  assert.match(developmentSkill, /source of truth and extension point/);
  assert.match(developmentSkill, /API\/schema\/data/);
  assert.match(developmentSkill, /state and lifecycle/);
  assert.match(developmentSkill, /dependency direction/);
  assert.match(developmentSkill, /verification(?: entries|\/deployment)/);
  assert.match(developmentSkill, /material alternatives/);
  assert.match(developmentSkill, /future-change/);
  assert.match(developmentSkill, /technical debt/);
  assert.match(developmentSkill, /forbidden shortcuts/);
  assert.match(
    developmentSkill,
    /project-owned type\/lint\/AST\/dependency\/contract\/behavior\/benchmark\/probe checks/,
  );
  assert.match(developmentSkill, /performance\/capacity\/cost/);
  assert.match(
    developmentSkill,
    /workload, metric, baseline\/budget, environment, comparator\/tolerance/,
  );
  assert.match(
    developmentSkill,
    /Do not create a required `plan\.md`, Task Contract/,
  );
  assert.doesNotMatch(
    developmentSkill,
    /Architecture Context Hit|Modularity Check:/,
  );
});

test("templates keep rationale durable, optional and evidence-free", () => {
  const templatePairs = [
    [
      ".codex/ty-context-managed/context_templates/global.md",
      "packages/ty-context/assets/context_templates/global.md",
    ],
    [
      ".codex/ty-context-managed/context_templates/architecture.md",
      "packages/ty-context/assets/context_templates/architecture.md",
    ],
    [
      ".codex/ty-context-managed/context_templates/area.md",
      "packages/ty-context/assets/context_templates/area.md",
    ],
    [
      ".codex/ty-context-managed/context_templates/product-surface-contract.md",
      "packages/ty-context/assets/context_templates/product-surface-contract.md",
    ],
    [
      ".codex/ty-context-managed/context_templates/screen-contract.md",
      "packages/ty-context/assets/context_templates/screen-contract.md",
    ],
  ];

  for (const [managedPath, packagedPath] of templatePairs) {
    for (const content of [read(managedPath), read(packagedPath)]) {
      assert.match(content, /Design Rationale|rationale/);
      assert.match(content, /durable|stable/);
      assert.match(content, /rejected alternative|rejected alternatives/);
      assert.match(content, /tradeoff|tradeoffs/);
      assert.match(
        content,
        /Do not invent rationale|Do not update this Context for:/,
      );
      assert.match(
        content,
        /implementation summaries|implementation summary|Local implementation summaries/,
      );
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
    assert.match(
      content,
      /type\/compiler\/lint\/architecture\/contract\/behavior\/benchmark\/probe/,
    );
    assert.match(
      content,
      /Static shape checks are not runtime-performance proof/,
    );
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
  const docs = [
    read("README.md"),
    read("packages/ty-context/README.md"),
    read("packages/ty-context/assets/README.md"),
  ];

  for (const content of docs) {
    assert.match(
      content,
      /Shared Engineering Quality extends the architecture obligation/,
    );
    assert.match(
      content,
      /Every implementation delivery visibly completes `Architecture Deliberation`/,
    );
    assert.match(content, /Engineering Quality Conformance/);
    assert.match(content, /Architecture Conformance/);
    assert.match(content, /Final Gate is the sole Long-Task carrier/);
    assert.match(content, /not overall code quality/);
    assert.match(content, /Goal-owned/);
    assert.match(content, /Semantic Facts/);
    assert.match(
      content,
      /workload, metric, baseline or budget, environment, comparator\/tolerance/,
    );
    assert.match(content, /Architecture Context Hit/);
    assert.match(content, /Decision Rationale Hit: existing\|required\|none/);
    assert.match(content, /no Task Contract.*fixed `plan\.md`/is);
    assert.match(
      content,
      /does not expose private chain-of-thought, guarantee the best design or anticipate every unknowable future request/,
    );
    assert.match(
      content,
      /Store stable reasons, rejected alternatives or tradeoffs/,
    );
    assert.match(content, /smallest durable Context surface/);
    assert.match(
      content,
      /rather than becoming a language-generic architecture, quality or performance analyzer/,
    );
    assert.match(content, /no quality plan, stage, matrix, second Authority/);
    assert.doesNotMatch(content, /Architecture Delta|Rationale Delta/);
  }

  const spec = read("PROJECT_SPEC.md");
  assert.match(
    spec,
    /Every implementation delivery has one thin Shared Engineering Quality Obligation/,
  );
  assert.match(
    spec,
    /Applicable Quality Attributes.*Implementation Quality Discipline.*not stages, Gates, states or artifacts/s,
  );
  assert.match(
    spec,
    /Exact product, business and technical predicates.*Non-UI Semantic Fact closure/s,
  );
  assert.match(
    spec,
    /Final Gate is the sole Long-Task Engineering Quality\/Architecture Conformance carrier/,
  );
  assert.match(
    spec,
    /proves only that declared, falsifiable, project-check-bound set—not overall code quality/,
  );
  assert.match(spec, /Architecture Context Hit.*internal routing question/s);
  assert.match(
    spec,
    /Decision Rationale Hit: existing\|required\|none.*internal routing question/s,
  );
  assert.match(spec, /not durable facts, roles, validators or artifacts/);
  assert.match(spec, /never creates a rationale delta or required file/);
  assert.match(spec, /Context Delta.*only durable-fact decision point/s);
  assert.match(
    spec,
    /two workflow entries are execution carriers, not nested quality workflows/,
  );
  assert.match(
    spec,
    /No engineering-quality plan, stage, matrix, ADR, new Contract field\/aspect\/Claim kind\/risk, second Authority, Gate, scheduler, persistent state/,
  );
});

test("Long-Task reuses existing authority and limits its quality claim", () => {
  const sources = [
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read("packages/ty-context/assets/skills/long-task-workflow/SKILL.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
    ),
    read(
      "packages/ty-context/assets/skills/long-task-workflow/references/contract-authoring.md",
    ),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
    read(
      "packages/ty-context/assets/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
  ];

  assert.equal(sources[0], sources[1], "Long-Task Skill package drift");
  assert.equal(
    sources[2],
    sources[3],
    "Contract-authoring reference package drift",
  );
  assert.equal(
    sources[4],
    sources[5],
    "Authority-lifecycle reference package drift",
  );
  for (const content of [sources[0], sources[2], sources[4]]) {
    assert.match(
      content,
      /Engineering Quality(?: Conformance|\/Architecture Conformance)/,
    );
    assert.match(content, /not overall code quality/);
  }
  const combined = sources.join("\n");
  assert.match(combined, /Source-backed/);
  assert.match(combined, /project-owned[\s\S]{0,100}Checks?/);
  assert.match(combined, /independent Assertion|separate Assertions?/);
  assert.match(
    combined,
    /no quality Boolean, matrix, Source aspect, Claim\/risk kind, Contract field, second Gate, state or Receipt/,
  );
  assert.match(combined, /no separate default Contract Conformance closure/);
  assert.match(sources[2], /`quality == true`/);
  assert.match(
    sources[2],
    /performance claim.*workload.*metric.*environment.*benchmark\/probe/s,
  );
});

test("risk-triggered Build Reuse Buy preserves an allowed set and implementation freedom", () => {
  const sources = [
    read("PROJECT_SPEC.md"),
    read(
      "project_context/areas/harness-package/decision-rationale/architecture-quality.md",
    ),
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
    read(
      ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
    ),
    read(
      "packages/ty-context/assets/skills/context_development_engineer/SKILL.md",
    ),
    read("README.md"),
    read("README.zh-CN.md"),
    read("packages/ty-context/README.md"),
  ];
  assert.equal(sources[2], sources[3], "managed Agent guidance drift");
  assert.equal(sources[4], sources[5], "engineering Skill guidance drift");
  const combined = sources.join("\n");

  assert.match(combined, /Build \/ Reuse \/ Buy/iu);
  assert.match(combined, /allowed solution set/iu);
  assert.match(combined, /prohibited failure modes/iu);
  assert.match(combined, /required rationale\/evidence/iu);
  assert.match(combined, /standard (?:library|capabilities)/iu);
  assert.match(combined, /installed dependenc/iu);
  assert.match(combined, /mature compatible (?:external )?librar/iu);
  assert.match(
    combined,
    /bounded self-implementation|small bounded self-implementation/iu,
  );
  assert.match(combined, /intentional non-abstraction/iu);
  assert.match(combined, /duplicate owner/iu);
  assert.match(combined, /extension-point bypass/iu);
  assert.match(combined, /second source of truth/iu);
  assert.match(
    combined,
    /nonempty.*allowed set|at least one supported allowed choice/isu,
  );
  assert.match(
    combined,
    /decision-required.*genuine (?:user\/product\/external|external) choice/isu,
  );
  assert.match(combined, /unselected but (?:still )?legal.*alternative/isu);
  assert.match(
    sources[2],
    /Enumerate every materially supported member before selection.*never removes another supported member from the allowed set/isu,
  );
  assert.match(
    sources[4],
    /Enumerate every materially supported member before selecting one.*never removes another supported member from the allowed set/isu,
  );
  assert.match(
    combined,
    /only a choice which actually exhibits a prohibited failure mode/iu,
  );
  assert.doesNotMatch(
    combined,
    /recording the rejected option as a prohibited failure/iu,
  );
  assert.match(combined, /no mandatory open-source\/DRY rule/iu);
  assert.match(combined, /no .*generic (?:quality )?score.*stage or Gate/isu);
  assert.doesNotMatch(combined, /must use (?:an )?open-source library/iu);
});

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}
