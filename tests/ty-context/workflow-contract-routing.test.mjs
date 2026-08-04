import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import YAML from "yaml";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import {
  areaContext,
  createContextProject,
} from "./context-manifest-fixtures.mjs";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relative) => readFile(path.join(repo, relative), "utf8");
const exec = promisify(execFile);
const missing = (file) =>
  stat(file).then(
    () => false,
    () => true,
  );

test("default workflow uses internal planning and creates no second authority", async () => {
  await withInitializedProject(async (root) => {
    for (const file of [
      "plan.md",
      "plan-matrix.json",
      "final-verdict.json",
      "evidence-ledger.json",
      "delivery-contract.yaml",
    ]) {
      assert.equal(await missing(path.join(root, file)), true);
    }
    await writeFile(path.join(root, "plan.md"), "ordinary user file\n");
    assert.deepEqual((await runValidator(root, "validate-context")).errors, []);
  });
});

test("default Context routing combines manifest candidates with bounded search", async () => {
  const [
    managed,
    rootAgents,
    packaged,
    development,
    longTask,
    contractAuthoring,
  ] = await Promise.all([
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read("AGENTS.md"),
    read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
    read(
      ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
    ),
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
    ),
  ]);
  assert.equal(packaged, managed, "package AGENTS Core drift");
  assert.match(
    managed,
    /prompt-level protocol applies automatically[\s\S]*no validator result[\s\S]*machine-completion authority/iu,
  );
  assert.match(
    rootAgents,
    /bounded text search over `project_context\/\*\*`/iu,
  );
  for (const content of [managed, development]) {
    assert.match(content, /graph\/trigger candidates|triggers\/read policy/iu);
    assert.match(content, /bounded text search/iu);
    assert.match(content, /project_context\/\*\*/u);
    assert.match(
      content,
      /before deciding `Context Delta`|判断 `Context Delta` 前/iu,
    );
    assert.match(content, /area\/module|area\/module\/API/iu);
    assert.match(
      content,
      /API\/schema\/state\/security\/verification\/deployment|API\/Schema\/state\/security\/verification\/deployment/iu,
    );
    assert.match(
      content,
      /supplements rather than replaces semantic judgment|补充语义判断/iu,
    );
    assert.match(
      content,
      /no index, cache, state or second authority|不创建索引、缓存或第二权威/iu,
    );
  }
  assert.match(
    managed,
    /For material UI, reconcile affected stable surface\/control\/target keys/iu,
  );
  assert.match(
    managed,
    /open every affected selected `exact-target` or `constraint`/iu,
  );
  assert.match(managed, /^## Selected-Design Conformance Obligation$/mu);
  assert.match(managed, /exactly one canonical record/iu);
  assert.match(managed, /editable-upstream update route/iu);
  assert.match(managed, /ty-context design-resource preflight <handoff\.md>/u);
  assert.match(
    managed,
    /canonical entry[\s\S]*exact dependency closure[\s\S]*frozen-Inspector observable-Fact manifest/iu,
  );
  assert.match(
    managed,
    /Expected Fact Universe = Canonical Resource Facts = Handoff Indexed Facts/iu,
  );
  assert.match(
    managed,
    /Incomplete acquisition[\s\S]*unreadable Census\/locators[\s\S]*missing\/extra Fact Cells or proofs[\s\S]*stale digests fail closed/iu,
  );
  assert.match(
    managed,
    /Deliberately partial input remains a constraint or blocking unresolved/iu,
  );
  assert.match(
    managed,
    /Preflight proves input completeness\/integrity relative to the named Inspector\/Oracle TCB, never production conformance/iu,
  );
  assert.match(
    managed,
    /Default work opens every affected selected `exact-target` or `constraint`[\s\S]*reports conditions those checks did not establish[\s\S]*does not rebuild the complete Fact Cell universe/iu,
  );
  assert.match(
    managed,
    /active Long-Task instead projects the exact obligation[\s\S]*Final Gate[\s\S]*never also runs a default closure/iu,
  );
  assert.match(managed, /Default work identifies material requirements[\s\S]*risk-proportional depth[\s\S]*reports anything not established/iu);
  assert.match(managed, /does not maintain stable Fact\/Obligation identities, exact set equality[\s\S]*complete result ledger/iu);
  const defaultSection = /## Default Workflow Contract[\s\S]*?(?=## Non-UI Source And Assurance Boundary)/u.exec(managed)?.[0] ?? "";
  assert.doesNotMatch(defaultSection, /Expected Semantic Facts\s*=|Fact × required-method obligations|per-Fact-by-method result rows|revision digest|machine accepted/iu);
  assert.match(managed, /low-frequency rules in this startup router/iu);
  assert.match(
    `${longTask}\n${contractAuthoring}`,
    /marked `design-resource-handoff-v1`[\s\S]*`verification_inputs`/iu,
  );
});

test("sparse Context workspace guidance keeps reads expandable and change targets explicit", async () => {
  const [
    managed,
    rootAgents,
    packaged,
    development,
    manifestTemplate,
    areaTemplate,
    architectureTemplate,
    verificationTemplate,
    workflow,
    rationale,
    specification,
    readme,
    chineseReadme,
    packageReadme,
    sample,
    implementationIndex,
    verification,
  ] = await Promise.all([
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read("AGENTS.md"),
    read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
    read(
      ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
    ),
    read(".codex/ty-context-managed/context_templates/context.toml"),
    read(".codex/ty-context-managed/context_templates/area.md"),
    read(".codex/ty-context-managed/context_templates/architecture.md"),
    read(".codex/ty-context-managed/context_templates/verification.md"),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read(
      "project_context/areas/harness-package/decision-rationale/minimal-context.md",
    ),
    read("PROJECT_SPEC.md"),
    read("README.md"),
    read("README.zh-CN.md"),
    read("packages/ty-context/README.md"),
    read("docs/examples/minimal-context-sample.md"),
    read("project_context/areas/harness-package/implementation-index.md"),
    read("project_context/areas/harness-package/verification.md"),
  ]);

  assert.equal(packaged, managed, "package AGENTS Core drift");
  for (const guidance of [managed, workflow, rationale, specification]) {
    assert.match(guidance, /project_context\/workspaces\/<workspace-id>/iu);
    assert.match(guidance, /sparse/iu);
    assert.match(
      guidance,
      /one (?:repository-relative )?(?:implementation\/)?code root|corresponds to exactly one repository-relative/iu,
    );
    assert.match(guidance, /no empty|without durable Context.*no empty/iu);
    assert.match(
      guidance,
      /default Area[\s\S]{0,100}repository-common|repository-common(?: top-level)? Area[\s\S]{0,100}(?:the monorepo )?default|repository-common[\s\S]{0,100}default Area/iu,
    );
    assert.match(guidance, /expandable/iu);
    assert.match(guidance, /read ACL|read isolation/iu);
    assert.match(guidance, /intended workspace/iu);
    assert.match(guidance, /shared|supporting/iu);
    assert.match(guidance, /changed-path|target-scope/iu);
    assert.match(guidance, /project-owned|repository-owned/iu);
    assert.match(
      guidance,
      /task-attributable|paths attributable to the current task/iu,
    );
  }
  assert.match(
    rootAgents,
    /separate the expandable read scope from the task-local intended workspace/iu,
  );
  assert.match(
    managed,
    /ask one concise target question before product edits/iu,
  );
  assert.match(managed, /Enumerate intentional multi-workspace targets/iu);
  assert.match(managed, /Do not make the full Context graph the default/iu);
  assert.match(managed, /required Context directory for every package-manager workspace/iu);
  assert.match(managed, /automatic topology scan/iu);
  assert.match(managed, /duplicate Long-Task scope classifier/iu);
  assert.match(
    rationale,
    /Long-Task retains its existing full-Context Authority, scope classifier, Final Gate and `F = Implementation Freedom Boundary`/iu,
  );
  assert.match(
    workflow,
    /active Long-Task keeps its existing scope classifier and `scope_escape` owner/iu,
  );
  assert.match(development, /读取什么.*intended workspace/iu);
  assert.match(development, /没 Context 的 workspace 不建空目录/iu);
  assert.match(development, /跨 workspace.*顶层 `project_context\/areas/iu);
  assert.match(development, /default Area.*仓库公共.*workspace-local Context 默认 `on-demand`/iu);
  assert.match(development, /不能仅凭 default Area、最近修改/iu);
  assert.match(
    development,
    /根 `DESIGN\.md` 仍是当前共享项目 Design Authority[\s\S]*单 Area\/非 monorepo 不增加 schema、迁移、状态或行为成本/iu,
  );
  assert.match(manifestTemplate, /project_context\/workspaces\/<workspace-id>/iu);
  assert.match(manifestTemplate, /maps one code root/iu);
  assert.match(manifestTemplate, /do not create empty/iu);
  assert.match(manifestTemplate, /repository-common default Area/iu);
  assert.match(manifestTemplate, /workspace-local[\s\S]*on-demand/iu);
  assert.match(manifestTemplate, /no workspace schema or read\/edit ACL/iu);
  assert.match(manifestTemplate, /starting read set, not a maximum/iu);
  assert.match(
    areaTemplate,
    /workspace-local Area belongs under `project_context\/workspaces\/<workspace-id>\/areas/iu,
  );
  assert.match(areaTemplate, /Cross-workspace Areas stay under top-level/iu);
  assert.match(architectureTemplate, /each represented `project_context\/workspaces/iu);
  assert.match(architectureTemplate, /no durable Context merely to complete a mirror/iu);
  assert.match(
    verificationTemplate,
    /changed-path\/target-scope verifier[\s\S]*intended workspace\(s\)[\s\S]*task-attributable paths/iu,
  );
  for (const publicEnglish of [readme, packageReadme]) {
    assert.match(publicEnglish, /project_context\/workspaces\/<workspace-id>/iu);
    assert.match(
      publicEnglish,
      /expandable starting set|expandable working set/iu,
    );
    assert.match(publicEnglish, /no empty directory/iu);
    assert.match(publicEnglish, /Single-workspace and non-monorepo/iu);
    assert.match(publicEnglish, /repository-common default Area/iu);
    assert.match(publicEnglish, /workspace-local Context `on-demand`/iu);
    assert.match(publicEnglish, /Root `DESIGN\.md` remains the current shared project Design Authority/iu);
    assert.match(publicEnglish, /changed-path|target-scope/iu);
  }
  assert.match(sample, /## Sparse Context Workspace \/ Monorepo Variant/iu);
  assert.match(sample, /project_context\/workspaces\/mobile\/areas\/product\.md/iu);
  assert.match(sample, /id = "repository"[\s\S]*default = true/iu);
  assert.doesNotMatch(
    sample,
    /id = "mobile-product"[\s\S]*?default = true[\s\S]*?\[\[areas\]\][\s\S]*?id = "miniapp-product"/iu,
  );
  assert.match(sample, /initial Context working set/iu);
  assert.match(sample, /packages\/eslint-config[\s\S]*without any Context directory/iu);
  assert.match(sample, /adds no `\[\[workspaces\]\]` schema/iu);
  assert.match(sample, /changed-path scope verifier/iu);
  assert.match(chineseReadme, /### 稀疏 Context Workspace 与 Monorepo/u);
  assert.match(chineseReadme, /没有耐久 Context 的 package-manager workspace 不创建空目录/u);
  assert.match(chineseReadme, /不是读取 ACL、最大集合/u);
  assert.match(chineseReadme, /单 workspace\/非 monorepo 项目保持原有/u);
  assert.match(
    implementationIndex,
    /^## Sparse Context Workspace \/ Monorepo Owners$/mu,
  );
  assert.match(
    verification,
    /^## Sparse Context Workspace \/ Monorepo Evidence$/mu,
  );
  assert.match(
    verification,
    /fixed independent paired runs[\s\S]*fresh-Agent mechanism benchmark/iu,
  );
  assert.doesNotMatch(
    `${managed}\n${workflow}`,
    /must only read the target Area|must read the full Context graph|persist(?:ed)? target declaration/iu,
  );
  assert.doesNotMatch(
    `${managed}\n${development}\n${workflow}\n${rationale}\n${specification}`,
    /one Area may own several workspaces|Area 与 workspace 不要求一一对应/iu,
  );
});

test("non-monorepo init and sparse Context workspace manifests need no schema or migration", async () => {
  await withInitializedProject(async (root) => {
    const manifest = await readFile(
      path.join(root, "project_context", "context.toml"),
      "utf8",
    );
    assert.match(manifest, /id = "main"[\s\S]*root = "\."/u);
    assert.match(manifest, /no workspace schema or read\/edit ACL/iu);
    assert.match(manifest, /starting read set, not a maximum/iu);
    assert.doesNotMatch(
      manifest,
      /^(?:workspace|owner_area|applies_to|requires)\s*=|^\[\[workspaces\]\]/mu,
    );
    assert.equal(
      await missing(path.join(root, "project_context", "workspaces")),
      true,
    );
    assert.deepEqual((await runValidator(root, "validate-context")).errors, []);
  });

  const root = await createContextProject({
    manifest: `[[areas]]
id = "repository"
root = "."
context = "project_context/areas/main.md"
kind = "repository"
default = true

[[areas]]
id = "mobile-product"
root = "apps/mobile"
context = "project_context/workspaces/mobile/areas/product.md"
kind = "app"

[[context]]
path = "project_context/workspaces/mobile/areas/verification.md"
role = "verification"
read_policy = "on-demand"
triggers = ["mobile test"]

[[areas]]
id = "miniapp-product"
root = "apps/miniapp"
context = "project_context/workspaces/miniapp/areas/product.md"
kind = "app"

[[areas]]
id = "shared-service"
root = "packages/service"
context = "project_context/areas/shared-service.md"
kind = "service"

[[context]]
path = "project_context/areas/shared-service/verification.md"
role = "verification"
read_policy = "on-demand"
triggers = ["shared service test"]
`,
    extraFiles: {
      "apps/mobile/package.json": "{}\n",
      "apps/miniapp/package.json": "{}\n",
      "packages/service/package.json": "{}\n",
      "packages/eslint-config/package.json": "{}\n",
      "project_context/workspaces/mobile/areas/product.md":
        areaContext("mobile-product"),
      "project_context/workspaces/mobile/areas/verification.md": `---
context_role: verification
read_policy: on-demand
---
# Mobile Verification

## Verification Paths
- \`npm test --workspace mobile\`
`,
      "project_context/workspaces/miniapp/areas/product.md":
        areaContext("miniapp-product"),
      "project_context/areas/shared-service.md": areaContext("shared-service"),
      "project_context/areas/shared-service/verification.md": `---
context_role: verification
read_policy: on-demand
---
# Shared Service Verification

## Verification Paths
- \`npm test --workspace shared-service\`
`,
    },
  });
  try {
    const report = await runValidator(root, "validate-context");
    assert.deepEqual(report.errors, []);
    assert.match(
      report.info.join("\n"),
      /loaded project_context\/context\.toml with 4 area\(s\)/u,
    );
    assert.equal(
      await missing(
        path.join(root, "project_context", "workspaces", "eslint-config"),
      ),
      true,
    );
    const manifest = await readFile(
      path.join(root, "project_context", "context.toml"),
      "utf8",
    );
    assert.doesNotMatch(
      manifest,
      /^(?:workspace|owner_area|applies_to|requires)\s*=|^\[\[workspaces\]\]/mu,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("shared engineering quality is observable, risk-proportional, and single-carrier", async () => {
  const [
    managed,
    rootAgents,
    packaged,
    development,
    authoring,
    workflow,
    rationale,
  ] = await Promise.all([
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read("AGENTS.md"),
    read("packages/ty-context/assets/agents/AGENTS_CORE.md"),
    read(
      ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
    ),
    read(".codex/skills/authoring/harness_package_design/SKILL.md"),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read(
      "project_context/areas/harness-package/decision-rationale/architecture-quality.md",
    ),
  ]);

  assert.equal(packaged, managed, "package AGENTS Core drift");
  for (const guidance of [managed, rootAgents, workflow, rationale]) {
    assert.match(guidance, /Architecture Deliberation/iu);
    assert.match(guidance, /Architecture Conformance/iu);
    assert.match(guidance, /Engineering Quality Conformance/iu);
  }
  for (const guidance of [managed, development, workflow, rationale]) {
    assert.match(
      guidance,
      /externally observable|对用户可见|可见.*流程检查点/iu,
    );
    assert.match(
      guidance,
      /before the first implementation edit|第一处实现编辑前/iu,
    );
    assert.match(guidance, /risk-proportional|风险.*深度/iu);
    assert.match(guidance, /owner|所有者/iu);
    assert.match(guidance, /extension point/iu);
    assert.match(guidance, /source of truth/iu);
    assert.match(guidance, /future-change|future change|未来变化/iu);
    assert.match(guidance, /technical debt|技术债|touched debt/iu);
    assert.match(guidance, /project-owned|项目原生/iu);
    assert.match(guidance, /quality|质量/iu);
  }

  assert.match(
    managed,
    /Default work embeds it in Contract Conformance; an active Long-Task embeds it only in Final Gate/iu,
  );
  assert.match(managed, /Never schedule both/iu);
  assert.match(
    managed,
    /recheck after any candidate or controlling-input change/iu,
  );
  assert.match(
    workflow,
    /Contract Conformance carrying `Engineering Quality Conformance` including `Architecture Conformance`[\s\S]*then check Context drift/iu,
  );
  assert.match(
    rationale,
    /Contract Conformance primarily checks `Source\/Context -> implementation`[\s\S]*Context drift checks `implementation\/new decision -> durable Context`/iu,
  );
  assert.match(
    rationale,
    /owner, reason, tracking and a removal\/expiry condition/iu,
  );
  assert.match(
    workflow,
    /no quality artifact\/matrix, second `Context Delta`, Contract, Source aspect, Claim\/risk kind, Authority, Gate, state, scheduler, broad quality Boolean or language-generic analyzer/iu,
  );
  assert.match(
    authoring,
    /decision-rationale\/architecture-quality\.md[\s\S]*每个实现需求[\s\S]*Goal 拥有[\s\S]*整体代码质量[\s\S]*unsupported metric[\s\S]*普通 sync 不迁移/iu,
  );
});

test("CLI and managed guidance route only explicit or active work to long-task", async () => {
  const { stdout } = await exec(process.execPath, [
    path.join(repo, "packages/ty-context/dist/cli.js"),
    "help",
  ]);
  assert.match(stdout, /long-task <subcommand>/);
  assert.match(stdout, /Install Long-Task Skill, Source Plan pointer/);
  assert.doesNotMatch(
    stdout,
    /validate-plan-contract|validate-plan-acceptance/,
  );
  const guidance = await read(
    ".codex/ty-context-managed/agents/AGENTS_CORE.md",
  );
  assert.match(
    guidance,
    /Do not infer long-task mode from duration, complexity, file count/,
  );
  assert.match(guidance, /Git common-dir active record/);
  assert.match(guidance, /Git-config marker/);
  assert.match(guidance, /currently selected host execution Goal/);
  assert.match(guidance, /Context Delta: none\|required/);
  assert.match(guidance, /Local fixes preserving durable semantics are `none`/);
  assert.match(
    guidance,
    /After the first Authority Lock,[\s\S]*terminal-turn boundary/iu,
  );
  assert.match(guidance, /continue_current_model[\s\S]*switch models/iu);
  assert.match(
    guidance,
    /Generic continue\/resume\/finish\/continue-goal language does not satisfy/iu,
  );
  assert.match(
    guidance,
    /no model route or checkpoint acknowledgement state/iu,
  );
  assert.match(
    guidance,
    /`ty-context enable long-task` installs the Long-Task Workflow Skill, the retired Source Plan compatibility pointer and package-owned completion Hook/iu,
  );
  assert.match(guidance, /`design-system-authoring` is explicit-only/iu);
});

test("complexity, workflow assurance, and Long-Task proof floor remain orthogonal", async () => {
  const [
    managed,
    development,
    workflow,
    rationale,
    specification,
    readme,
    chineseReadme,
    packageReadme,
    source,
  ] = await Promise.all([
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read(".codex/ty-context-managed/skills/context_development_engineer/SKILL.md"),
    read("project_context/areas/harness-package/contracts/workflow-contract.md"),
    read("project_context/areas/harness-package/decision-rationale/long-task-workflow.md"),
    read("PROJECT_SPEC.md"),
    read("README.md"),
    read("README.zh-CN.md"),
    read("packages/ty-context/README.md"),
    read("docs/workflow-assurance-boundary.md"),
  ]);

  for (const content of [managed, workflow, specification, readme, packageReadme, source]) {
    assert.match(content, /any complexity|regardless of duration, complexity or file count/iu);
    assert.match(content, /completion authority[\s\S]*recoverab/iu);
    assert.match(content, /complexity[\s\S]*execution and verification depth/iu);
  }
  assert.match(chineseReadme, /复杂度决定执行与验证深度/u);
  assert.match(chineseReadme, /完成权威与恢复能力决定工作流路线/u);
  assert.match(development, /任意复杂度/u);
  assert.match(managed, /Route by required assurance, not task size/iu);
  assert.match(managed, /A small consequential rule may use it and a complex cross-module change may remain default/iu);
  assert.match(rationale, /removes the former L0 eligibility barrier only/iu);
  assert.match(rationale, /auto \| standard \| strict[\s\S]*remain unchanged/iu);
  assert.match(specification, /This route keeps the existing Source, Contract, Authority Lock, protected Revision, Fact\/Obligation, Evidence Kernel, repair\/reverification, External Confirmation, Final Gate and no-drift logic unchanged/iu);
  assert.match(source, /does not revise Long-Task's internal workflow, proof model, schema or runtime/iu);

  const defaultManaged = /## Default Workflow Contract[\s\S]*?(?=## Non-UI Source And Assurance Boundary)/u.exec(managed)?.[0] ?? "";
  assert.doesNotMatch(defaultManaged, /Expected Semantic Facts\s*=|Fact × required-method obligations|stable Fact Key|Obligation Key|revision digest|Final Gate|machine accepted/iu);
  assert.match(development, /默认 Workflow 不构造完整 Expected Semantic Fact Universe、稳定 Fact\/Obligation Key、精确集合等式/iu);
  assert.match(managed, /After the last relevant code, configuration, Source or controlling-Context change, rerun every affected check/iu);
  assert.match(managed, /localize it to the requirement\/owner\/module\/check, repair it and rerun affected checks/iu);
  assert.match(managed, /Report `Implemented`, `Verified`, `Unverified`, `Blocked \/ decision required`/iu);
});

test("Goal ownership, active recovery, and explicit Codex invocation stay independent", async () => {
  const [agents, workflow, skill] = await Promise.all([
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
  ]);

  for (const content of [agents, workflow, skill]) {
    assert.match(content, /selected and owned by the host\/user/iu);
    assert.match(
      content,
      /does not create, persist or reconnect (?:a |that )?(?:native )?Goal identifier/iu,
    );
    assert.match(
      content,
      /later physical Goal\/session[\s\S]*semantic (?:workflow )?state through `resume`[\s\S]*prior Turn/iu,
    );
    assert.match(
      content,
      /resume[\s\S]*directly load[\s\S]*installed package-managed `long-task-workflow` Skill[\s\S]*does not depend on implicit invocation/iu,
    );
  }
  assert.match(workflow, /\$long-task-workflow[\s\S]*\/skills/);
});

test("real-entry feedback stays advisory while final-candidate cold-start proof stays required", async () => {
  const [agents, workflow, spec, verification] = await Promise.all([
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read("PROJECT_SPEC.md"),
    read("project_context/areas/harness-package/verification.md"),
  ]);

  for (const content of [agents, workflow]) {
    assert.match(
      content,
      /first useful independently runnable production slice/iu,
    );
    assert.match(content, /recommended real-entry feedback point/iu);
    assert.match(
      content,
      /expected early-localization value exceeds the run cost/iu,
    );
    assert.match(content, /not a prerequisite for expanding implementation/iu);
    assert.match(
      content,
      /Detached routes, specimens and deep links remain supplemental/iu,
    );
  }
  for (const content of [agents, workflow, spec, verification]) {
    assert.match(
      content,
      /always rerun(?:s)?[\s\S]{0,120}affected cold-start journey[\s\S]{0,100}final candidate/iu,
    );
    assert.doesNotMatch(
      content,
      /after each independently runnable vertical slice|before dependent UI work expands|run early real-entry checks per runnable slice/iu,
    );
  }
});

test("partial design constraints stay distinct from incomplete implementation-source acquisition", async () => {
  const [agents, workflow, skill, contractAuthoring] = await Promise.all([
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
    ),
  ]);

  for (const content of [agents, workflow, skill, contractAuthoring]) {
    assert.match(
      content,
      /Deliberately partial (?:design )?input[\s\S]{0,100}(?:explicitly scoped )?constraint or blocking unresolved/iu,
    );
    assert.match(
      content,
      /incomplete (?:implementation-source )?(?:acquisition|acquisition\/Census)[\s\S]{0,240}(?:blocking|block|fail closed)/iu,
    );
    assert.match(
      content,
      /exact[- ]target[\s\S]{0,180}(?:layout and pixel|layout\/pixel) Facts/iu,
    );
  }
});

test("Workflow Contract names the complete Source-bound-Draft-to-qualified-result lifecycle", async () => {
  const workflow = await read(
    "project_context/areas/harness-package/contracts/workflow-contract.md",
  );
  const summary = workflow.match(/The workflow is:\r?\n\r?\n`([^`]+)`/u)?.[1];
  assert.ok(summary);
  for (const concept of [
    "initial/revised proposal + selected immutable design resources",
    "validated residual design-resource handoff",
    "one Source-bound Contract Draft loop",
    "inventory/provenance/refinement/markers/mapping",
    "Preflight",
    "Authority Lock",
    "one-time model choice",
    "Goal-owned adaptive implementation",
    "acceptance/verification Frontier",
    "source-recompiled one-snapshot Final Gate",
    "qualified machine result",
    "Stop/close",
    "native Goal veto review",
  ]) {
    assert.ok(summary.includes(concept), concept);
  }
  assert.doesNotMatch(
    summary,
    /one complete Compact V2 Contract.*Authoring Preflight/iu,
  );
});

test("long-task Skill is the only active long-task workflow", async () => {
  const [
    active,
    generated,
    packaged,
    codexMetadata,
    generatedMetadata,
    packagedMetadata,
    sourceAuthoring,
    contractAuthoring,
    evidenceDesign,
    authorityLifecycle,
  ] = await Promise.all([
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read(".codex/skills/long-task-workflow/SKILL.md"),
    read("packages/ty-context/assets/skills/long-task-workflow/SKILL.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/agents/openai.yaml",
    ),
    read(".codex/skills/long-task-workflow/agents/openai.yaml"),
    read(
      "packages/ty-context/assets/skills/long-task-workflow/agents/openai.yaml",
    ),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/source-authoring.md",
    ),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
    ),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/evidence-design.md",
    ),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
  ]);
  assert.equal(generated, active, "source-workspace long-task Skill drift");
  assert.equal(packaged, active, "package long-task Skill drift");
  assert.equal(
    generatedMetadata,
    codexMetadata,
    "source-workspace Long-Task metadata drift",
  );
  assert.equal(
    packagedMetadata,
    codexMetadata,
    "package Long-Task metadata drift",
  );
  assert.match(active, /delivery-contract\.yaml/);
  assert.match(active, /currently selected host execution Goal/i);
  assert.match(
    active,
    /Progress.*repair evidence only.*never acceptance authority/is,
  );
  assert.match(active, /one complete Contract/);
  assert.match(active, /preflight/);
  assert.match(active, /delivery-set.*retired and non-executing/is);
  assert.match(active, /Final Gate/i);
  assert.match(codexMetadata, /Use \$long-task-workflow/);
  assert.doesNotMatch(codexMetadata, /Use \/long-task-workflow/);
  assert.equal(
    YAML.parse(codexMetadata).policy.allow_implicit_invocation,
    false,
  );
  const detailedAuthoring = `${sourceAuthoring}\n${contractAuthoring}`;
  assert.match(
    detailedAuthoring,
    /pre-existing Source Plan is simply one possible input[\s\S]*External design resources authorize fidelity only when they become a selected exact target/is,
  );
  assert.match(detailedAuthoring, /ordinary prose is the Source/is);
  assert.match(
    detailedAuthoring,
    /stable semantic (?:lowercase-kebab )?keys and Markdown anchors/is,
  );
  assert.match(
    detailedAuthoring,
    /one defensible recommendation exists.*record.*exact added meaning in real Source/is,
  );
  assert.match(
    detailedAuthoring,
    /Before comparative research or a material product, technical, architecture or provider selection.*fidelity versus cost.*unknown preference.*ask one concise targeted clarification/is,
  );
  assert.match(
    detailedAuthoring,
    /Do not impose a questionnaire, re-ask known preferences or pause for minor reversible choices/is,
  );
  assert.match(
    detailedAuthoring,
    /Once the material preference envelope is clear, use current authoritative or primary evidence/is,
  );
  assert.match(
    detailedAuthoring,
    /Conflicting authority, an explicitly user-reserved choice, a missing material preference or the absence of a defensible recommendation remains `decision_required`/is,
  );
  assert.match(detailedAuthoring, /Draft decomposition and repository binding/is);
  assert.match(detailedAuthoring, /evidence-backed repository facts/is);
  assert.match(
    detailedAuthoring,
    /Contract YAML cannot become the sole owner[\s\S]*never place the choice only in Contract YAML/is,
  );
  assert.match(
    detailedAuthoring,
    /payment.*contracting.*production deployment.*destructive production mutation.*external confirmations/is,
  );
  assert.match(
    detailedAuthoring,
    /conflicting authority[\s\S]*user-reserved choice[\s\S]*missing material preference[\s\S]*`decision_required`/is,
  );
  assert.match(active, /^## Controlling Objective$/mu);
  assert.match(active, /^## Contract Draft And Outcome Decomposition$/mu);
  assert.match(active, /same non-authoritative `delivery-contract\.yaml`/iu);
  assert.match(active, /need not be completed in one response/iu);
  assert.match(
    active,
    /Draft Outcome[\s\S]*not a new schema field or runtime entity/iu,
  );
  assert.match(
    active,
    /`depends_on` and Stage gates express acceptance and intermediate-proof readiness/iu,
  );
  assert.match(
    active,
    /no development phase\/method Gate[\s\S]{0,180}agent allocator\/scheduler[\s\S]{0,120}persistent delegation state/iu,
  );
  assert.match(
    active,
    /Outcome decomposes execution and diagnosis, not completion authority/iu,
  );
  assert.match(active, /execution_model_checkpoint\.required: true/iu);
  assert.match(active, /continue_current_model/iu);
  assert.match(active, /Later revisions return `required: false`/iu);
  assert.match(
    active,
    /no checkpoint file.*model route.*automatic model switch/is,
  );
  assert.match(active, /second Contract plan/);
  assert.match(
    active,
    /may (?:implement, inspect or repair|work across)[\s\S]{0,180}(?:any in-scope Outcome|Outcome or Stage boundaries)/iu,
  );
  assert.match(
    active,
    /platform-native agents\/subagents[\s\S]{0,300}(?:non-authoritative|not Progress|not proof)[\s\S]{0,180}converge/iu,
  );
  assert.ok(
    Buffer.byteLength(active, "utf8") <= 16_000,
    "main Long-Task Skill must remain a compact objective/boundary/router surface",
  );
  assert.deepEqual(
    [...active.matchAll(/\]\(references\/([^\)]+)\)/gu)].map(
      (match) => match[1],
    ),
    [
      "source-authoring.md",
      "contract-authoring.md",
      "evidence-design.md",
      "authority-lifecycle.md",
    ],
  );
  assert.doesNotMatch(
    active,
    /^## (?:Entry And Authoring Loop|Visual Delivery Authoring|Symbolic Selected-Design Authoring|Non-UI Semantic Fact Evidence|Live Final Authority)$/mu,
  );
  assert.match(contractAuthoring, /^## Symbolic Selected-Design Authoring$/mu);
  assert.match(evidenceDesign, /^## Symbolic Noninterference Evidence$/mu);
  assert.match(authorityLifecycle, /^## Final Gate And Terminal Paths$/mu);
  assert.doesNotMatch(
    active,
    /Do not create a second plan, Authoring Skill product/,
  );
  for (const relative of [
    ".codex/ty-context-managed/skills/normal-long-task/SKILL.md",
    ".codex/skills/normal-long-task/SKILL.md",
    "packages/ty-context/assets/skills/normal-long-task/SKILL.md",
  ]) {
    assert.equal(await missing(path.join(repo, relative)), true, relative);
  }
  assert.equal(
    await missing(
      path.join(
        repo,
        ".codex/ty-context-managed/skills/prepare-composite-long-task/SKILL.md",
      ),
    ),
    true,
  );
  assert.equal(
    await missing(
      path.join(
        repo,
        ".codex/ty-context-managed/skills/composite-long-task-workflow/SKILL.md",
      ),
    ),
    true,
  );
});

test("retired Source Plan entry points to the Source-bound Contract Draft loop", async () => {
  const [sourcePlan, sourceAuthoring, workflowContext] = await Promise.all([
    read(".codex/ty-context-managed/skills/source-plan-authoring/SKILL.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/source-authoring.md",
    ),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
  ]);
  assert.match(sourcePlan, /Retired: Source Plan Authoring/iu);
  assert.match(
    sourcePlan,
    /select `\$long-task-workflow`[\s\S]*host's Skill selector/iu,
  );
  assert.match(sourcePlan, /Do not rewrite it merely for compatibility/iu);
  assert.match(sourcePlan, /create a new Source Plan artifact/iu);
  assert.doesNotMatch(
    sourcePlan,
    /ty-context long-task (?:init|preflight|compile)/,
  );
  assert.match(
    sourceAuthoring,
    /neither an earlier Source-authoring phase nor a standalone Source Plan stage/iu,
  );
  assert.match(
    sourceAuthoring,
    /Do not create a Source Plan schema, CLI, Preflight, Compile, Receipt, cache, authority, state or internal Source-authoring stage/iu,
  );
  assert.match(
    sourceAuthoring,
    /classification \(`exact-target`, `constraint` or `inspiration`\)/iu,
  );
  assert.match(
    workflowContext,
    /research proposal, ordinary prose plan, legacy Source Plan or external design resource remains ordinary Source/is,
  );
  assert.match(
    workflowContext,
    /unknown preference could materially change research or selection, ask before comparative research/is,
  );
  assert.match(
    workflowContext,
    /Once the material preference envelope is known.*record one supported recommendation explicitly as delegated Source instead of pausing for approval/is,
  );
  assert.match(
    workflowContext,
    /returns for a decision only when requirements conflict.*user reserves the choice.*no defensible recommendation.*falsifiable acceptance cannot be formed/is,
  );
  assert.match(
    workflowContext,
    /No lifecycle phases, fixed Contract plans, separate Contract-Authoring Skill/is,
  );
  assert.match(workflowContext, /one continuously revised.*Contract Draft/);
  assert.match(workflowContext, /one current snapshot/);
  assert.match(
    workflowContext,
    /Contract Draft[\s\S]*`long-task-workflow` owns its authoring/iu,
  );
  assert.match(
    workflowContext,
    /Draft Outcome[\s\S]*without creating `draft_outcomes`, a `DraftOutcome` runtime type/iu,
  );
  assert.match(workflowContext, /not a Contract Draft/iu);
  assert.match(
    workflowContext,
    /Only the source-recompiled Final Gate may accept/iu,
  );
  assert.match(
    workflowContext,
    /rolling blocker[\s\S]*not itself an External Confirmation[\s\S]*adoption[\s\S]*resumes rolling implementation/iu,
  );
  assert.match(
    workflowContext,
    /delivery_completed_by_this_event: false[\s\S]*acceptance_scope: declared_machine_authority[\s\S]*native_goal_effect: none/iu,
  );
  assert.match(
    workflowContext,
    /veto-only conformance guard[\s\S]*never substitutes Agent judgment for Final Gate proof/iu,
  );
});

test("retired command names are lightweight non-executing tombstones", async () => {
  for (const command of ["composite-campaign", "composite-long-task"]) {
    const { stdout } = await exec(process.execPath, [
      path.join(repo, "packages/ty-context/dist/cli.js"),
      command,
    ]);
    const result = JSON.parse(stdout);
    assert.equal(result.status, "retired");
    assert.match(result.next_command, /ty-context long-task/);
  }
  const source = (
    await Promise.all([
      read("packages/ty-context/src/commands/composite-campaign.ts"),
      read("packages/ty-context/src/commands/composite-long-task.ts"),
    ])
  ).join("\n");
  assert.doesNotMatch(source, /^import /mu);
});

async function withInitializedProject(action) {
  const root = await mkdtemp(path.join(os.tmpdir(), "workflow-routing-"));
  try {
    await runInit(root, { adopt: false, force: false });
    await action(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
