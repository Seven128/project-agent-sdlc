import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relativePath) => readFile(path.join(repo, relativePath), "utf8");

const skillCopies = (name) =>
  Promise.all([
    read(`.codex/ty-context-managed/skills/${name}/SKILL.md`),
    read(`.codex/skills/${name}/SKILL.md`),
    read(`packages/ty-context/assets/skills/${name}/SKILL.md`),
  ]);

const referenceCopies = (name) =>
  Promise.all([
    read(
      `.codex/ty-context-managed/skills/long-task-workflow/references/${name}`,
    ),
    read(`.codex/skills/long-task-workflow/references/${name}`),
    read(
      `packages/ty-context/assets/skills/long-task-workflow/references/${name}`,
    ),
  ]);

test("page-level UI authority Source Plan is indexed without becoming Context", async () => {
  const [plan, spec, implementationIndex, manifest] = await Promise.all([
    read("docs/page-level-uiux-authority-source-plan.md"),
    read("PROJECT_SPEC.md"),
    read("project_context/areas/harness-package/implementation-index.md"),
    read("project_context/context.toml"),
  ]);
  assert.match(plan, /Plan key: `PLAN-UIAUTH-001`/u);
  assert.match(plan, /IN-USER-001/);
  assert.match(plan, /IN-EXT-001/);
  assert.match(plan, /^## Design Context Depth Model$/mu);
  assert.match(plan, /^## Single-Owner And Conflict Rules$/mu);
  assert.match(plan, /^## Canonical Control Field Semantics$/mu);
  assert.match(plan, /REQ-VER-003/);
  assert.match(plan, /AC-UIAUTH-012/);
  assert.match(plan, /AC-UIAUTH-013/);
  assert.match(plan, /AC-UIAUTH-014/);
  assert.match(plan, /AC-UIAUTH-015/);
  assert.match(
    plan,
    /not Context, a Delivery Contract, runtime state or completion proof/iu,
  );
  assert.match(spec, /docs\/page-level-uiux-authority-source-plan\.md/);
  assert.match(
    implementationIndex,
    /docs\/page-level-uiux-authority-source-plan\.md/,
  );
  assert.doesNotMatch(manifest, /page-level-uiux-authority-source-plan/);
});

test("visual design and implementation guidance reaches every managed copy", async () => {
  const [uiuxCopies, developmentCopies] = await Promise.all([
    skillCopies("context_uiux_design"),
    skillCopies("context_development_engineer"),
  ]);

  for (const copies of [uiuxCopies, developmentCopies]) {
    assert.equal(copies[1], copies[0]);
    assert.equal(copies[2], copies[0]);
  }

  const uiux = uiuxCopies[0];
  assert.match(uiux, /^## Design Context Depth \/ 设计上下文深度$/mu);
  assert.match(uiux, /^## Design Source Projection \/ 设计资源事实投影$/mu);
  for (const dimension of [
    "surface_flow",
    "visual_content",
    "component_control",
    "state_interaction",
    "motion",
    "adaptation_input",
    "accessibility",
    "assets",
  ]) assert.match(uiux, new RegExp(dimension, "u"));
  assert.match(uiux, /每个 adopted target 只能有一个 canonical adoption record/iu);
  assert.match(
    uiux,
    /项目级、系统级或 component-family target[\s\S]*owning Screen Contract/iu,
  );
  assert.match(uiux, /handoff 的变化型 coverage index 不复制进 Context/iu);
  assert.match(
    uiux,
    /^## External Design Resource Consumption \/ 外部设计资源消费$/mu,
  );
  assert.match(uiux, /design-resource-authoring/iu);
  assert.match(uiux, /ty-context design-resource preflight <handoff\.md>/u);
  assert.match(
    uiux,
    /surface\/flow、visual\/content、component\/control、state\/interaction、motion、adaptation\/input、accessibility、assets/u,
  );
  assert.match(uiux, /可观察的设计事实/iu);
  assert.match(uiux, /Control 是产品交互语义单位，不是 UI 原子粒度上限/iu);
  assert.match(uiux, /完整 fact\/resource closure/iu);
  assert.match(uiux, /整目标 layout 与 pixel 事实/iu);
  assert.match(uiux, /不复制 provider.*提示词\/模板/isu);
  assert.match(
    uiux,
    /不改 `project_context\/\*\*`、`DESIGN\.md` 或 production code/u,
  );
  assert.match(uiux, /只有进入默认开发流程或 Long-Task、需要采纳稳定结论时/u);
  assert.match(uiux, /UI Authority Closure/iu);
  assert.match(uiux, /stable surface\/control\/target key/iu);
  assert.match(
    uiux,
    /主动打开每个受影响的 selected `exact-target`\/`constraint`/u,
  );
  assert.match(
    uiux,
    /不可变 adopted locator\/digest[\s\S]*editable upstream owner\/locator\/update route/iu,
  );
  assert.match(uiux, /new immutable version|新 immutable version/iu);
  assert.match(uiux, /^## Design Authority Readiness \/ 设计权威就绪$/mu);
  assert.match(
    uiux,
    /material production UI lacks sufficient or consistent Design Authority/iu,
  );
  assert.match(uiux, /`exact-target`, `constraint` or `inspiration`/iu);
  assert.match(uiux, /Design authority status: `unconfigured`/iu);
  assert.match(
    uiux,
    /implementation's own generated screenshot or diff as the target/iu,
  );
  assert.match(uiux, /^## Visual Delivery Coverage \/ 视觉交付覆盖$/mu);
  assert.match(uiux, /task-local \*\*Visual Coverage Set\*\*/u);
  assert.match(
    uiux,
    /surface\/route\/component[\s\S]*viewport[\s\S]*theme or product mode[\s\S]*interaction\/state[\s\S]*content stress[\s\S]*accessibility\/motion/iu,
  );
  assert.match(
    uiux,
    /not a required file, matrix, Context role, workflow artifact/iu,
  );
  assert.match(
    uiux,
    /one authored exact-value token source and one generation direction/iu,
  );
  assert.match(uiux, /production components or real product routes/iu);
  assert.match(uiux, /never claim an unchecked combination/iu);
  assert.match(
    uiux,
    /never prune a declared\/applicable combination[\s\S]{0,180}(?:pairwise|equivalence)/iu,
  );
  assert.match(
    uiux,
    /first useful runnable production slice[\s\S]{0,180}not a prerequisite/iu,
  );
  assert.match(uiux, /configured.*not.*implementation-ready/iu);

  const development = developmentCopies[0];
  assert.match(
    development,
    /^## Visual Delivery Implementation \/ 视觉交付实现$/mu,
  );
  assert.match(
    development,
    /production token source, its generation direction/iu,
  );
  assert.match(development, /first confirm Design Authority readiness/iu);
  assert.match(
    development,
    /ty-context design-resource preflight <handoff\.md>/u,
  );
  assert.match(
    development,
    /complete observable design fact[\s\S]*fact\/Source\/method\/blocker\/target\/condition sets[\s\S]*project-owned check/iu,
  );
  assert.match(development, /`exact-target`, `constraint` or `inspiration`/iu);
  assert.match(
    development,
    /open the immutable adopted locator\/digest before deciding or coding/iu,
  );
  assert.match(
    development,
    /editable upstream owner\/locator\/update route[\s\S]*manual\/external boundary/iu,
  );
  assert.match(development, /Never overwrite an adopted baseline/iu);
  assert.match(development, /production components and real product routes/iu);
  assert.match(development, /cold-start real-user entry journey/iu);
  assert.match(development, /first useful runnable vertical slice/iu);
  assert.match(
    development,
    /never prune a declared\/applicable combination[\s\S]{0,180}(?:pairwise|equivalence)/iu,
  );
  assert.match(development, /not an implementation gate/iu);
  assert.match(development, /final candidate/iu);
  assert.match(
    development,
    /resource integrity[\s\S]*implementation-conformance proof/iu,
  );
  assert.match(
    development,
    /undeclared raw color, spacing, typography or motion values/iu,
  );
  assert.match(development, /report only the combinations actually checked/iu);
  assert.match(development, /Do not introduce a second visual plan/iu);
  assert.match(development, /Product `surface_bindings`/u);
  assert.match(development, /typed `design_conformance`/u);
  assert.match(
    development,
    /region\/location.*type\/label.*validation.*recovery.*accessibility/isu,
  );
  assert.match(
    development,
    /planned target cannot unlock fidelity implementation/iu,
  );
  assert.match(
    development,
    /final-current-candidate Contract Conformance[\s\S]*unread, unsupported, unresolved, unmapped, unimplemented, unexecuted, stale or indistinguishable/iu,
  );
  assert.match(development, /exact handoff `fact_refs`/iu);
  assert.match(development, /full-target layout and pixel proof/iu);
  assert.match(development, /do not run the preceding default closure/iu);
  assert.match(development, /Final Gate is the sole Long-Task carrier/iu);
});

test("Long-Task visual guidance reuses existing authoring and evidence mechanisms", async () => {
  const [authoringCopies, evidenceCopies] = await Promise.all([
    referenceCopies("contract-authoring.md"),
    referenceCopies("evidence-design.md"),
  ]);

  for (const copies of [authoringCopies, evidenceCopies]) {
    assert.equal(copies[1], copies[0]);
    assert.equal(copies[2], copies[0]);
  }

  const authoring = authoringCopies[0];
  assert.match(authoring, /^## Visual Delivery Authoring$/mu);
  assert.match(authoring, /existing Contract semantics/iu);
  assert.match(authoring, /resolve Design Authority before Compile/iu);
  assert.match(authoring, /perform UI Authority Closure/iu);
  assert.match(authoring, /design-resource-handoff-v1/u);
  assert.match(authoring, /complete observable design fact/iu);
  assert.match(authoring, /full-target layout and pixel facts/iu);
  assert.match(
    authoring,
    /exact handoff target key and interpretation[\s\S]*condition_keys[\s\S]*source_claims[\s\S]*root conformance Assertion/iu,
  );
  assert.match(
    authoring,
    /unconfigured starter, style-only prose, inspiration-only set/iu,
  );
  assert.match(
    authoring,
    /generated implementation screenshot\/diff is an Artifact, not the target/iu,
  );
  assert.match(authoring, /browser or Expo-Web proxy cannot prove a native/iu);
  assert.match(
    authoring,
    /atomic Requirement, applicable Control field or named AC Assertion/iu,
  );
  assert.match(
    authoring,
    /risk-based, pairwise, representative or sampled coverage never substitutes for a declared applicable cell/iu,
  );
  assert.match(authoring, /explicit external confirmation/iu);
  assert.match(authoring, /minimum aggregated Product `surface_bindings`/iu);
  assert.match(
    authoring,
    /root journey[\s\S]*`navigation_result`[\s\S]*`interaction_trace`[\s\S]*`target_runtime`/iu,
  );
  assert.match(
    authoring,
    /typed current-execution `design_method` evidence/iu,
  );
  assert.match(authoring, /exact handoff `fact_refs`/iu);
  assert.match(
    authoring,
    /all-of `design_conformance`, `interaction_trace` and `target_runtime`/iu,
  );
  assert.match(
    authoring,
    /explicitly inventory every declared design-acceptance blocker/iu,
  );
  assert.match(authoring, /There is no in-band not-applicable waiver/iu);
  assert.match(authoring, /requires explicit revised Source/iu);
  assert.match(
    authoring,
    /creates no `uiux_delivery` authority block, Claim kind, risk level, lifecycle state/iu,
  );
  assert.match(
    authoring,
    /`surface`.*`region`.*`validation`.*`recovery`.*`accessibility`/isu,
  );
  assert.match(
    authoring,
    /candidate\/planned artifacts cannot authorize fidelity Claims/iu,
  );
  assert.match(
    authoring,
    /external design resources.*selected exact target/isu,
  );
  assert.match(
    authoring,
    /Treat candidates and unresolved decisions honestly/iu,
  );
  assert.match(
    authoring,
    /source_paths.*verification_inputs.*input_paths.*artifact_globs/isu,
  );

  const evidence = evidenceCopies[0];
  assert.match(evidence, /^## Visual UI Evidence$/mu);
  assert.match(evidence, /ty-context design-resource preflight/iu);
  assert.match(evidence, /complete per-resource fact closure/iu);
  assert.match(evidence, /exact handoff `fact_refs`/iu);
  assert.match(
    evidence,
    /geometry\/pixel\/token\/content[\s\S]*motion timeline[\s\S]*accessibility semantics[\s\S]*asset integrity/iu,
  );
  assert.match(
    evidence,
    /`design_resource_integrity` and `design_implementation_conformance` distinct/iu,
  );
  assert.match(
    evidence,
    /`design_conformance` record[\s\S]*compiled target\/Assertion\/current Check target/iu,
  );
  assert.match(
    evidence,
    /each independently falsifiable AC[\s\S]*\[ac:<assertion-key>\]/iu,
  );
  assert.match(evidence, /baseline[\s\S]*included in `verification_inputs`/iu);
  assert.match(
    evidence,
    /Generated screenshots, diffs and reports are Artifacts/iu,
  );
  assert.match(
    evidence,
    /after Authority Lock is verifier-material revision/iu,
  );
  assert.match(evidence, /subjective visual quality and approval external/iu);
  assert.match(evidence, /selected `exact-target`/iu);
  assert.match(
    evidence,
    /implementation's current screenshot is never its own target/iu,
  );
  assert.match(evidence, /`ui_browser` proves browser UI only/iu);
  assert.match(evidence, /stable surface\/control\/target keys/iu);
  assert.match(
    evidence,
    /one broad screenshot or UI pass cannot prove all Control fields/iu,
  );
  assert.match(
    evidence,
    /named root-entry journey[\s\S]*required product target root/iu,
  );
  assert.match(
    evidence,
    /Candidate comparison, a mutable provider link, extraction success[\s\S]*authoring\/integrity material/iu,
  );
});

test("complete selected-design conformance is shared through mutually exclusive carriers", async () => {
  const [
    spec,
    globalContext,
    rationale,
    handoffContract,
    longTaskCopies,
    rootReadme,
    chineseReadme,
    packageReadme,
    sourcePlan,
  ] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read("project_context/global.md"),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read(
      "project_context/areas/harness-package/contracts/design-resource-handoff.md",
    ),
    skillCopies("long-task-workflow"),
    read("README.md"),
    read("README.zh-CN.md"),
    read("packages/ty-context/README.md"),
    read("docs/design-resource-authoring-source-plan.md"),
  ]);

  assert.equal(longTaskCopies[1], longTaskCopies[0]);
  assert.equal(longTaskCopies[2], longTaskCopies[0]);
  for (const content of [
    spec,
    rationale,
    handoffContract,
    longTaskCopies[0],
    rootReadme,
    packageReadme,
  ]) {
    assert.match(
      content,
      /Agent implementation, acceptance and testing fully conform/iu,
    );
    assert.match(content, /canonical (?:machine-readable )?(?:entry|source)/iu);
    assert.match(content, /typed locator/iu);
    assert.match(content, /subject.*target.*condition.*dimension/isu);
    assert.match(
      content,
      /residual[\s\S]{0,160}handoff|handoff[\s\S]{0,160}residual/iu,
    );
    assert.match(content, /immutable/iu);
    assert.match(content, /Final Gate/iu);
  }
  for (const content of [
    spec,
    handoffContract,
    longTaskCopies[0],
    rootReadme,
    packageReadme,
  ]) {
    assert.match(content, /complete observable (?:design )?fact/iu);
    assert.match(content, /pixel/iu);
  }
  assert.match(handoffContract, /resource_fact_closure/u);
  assert.match(handoffContract, /fact_refs/u);
  assert.match(
    globalContext,
    /A selected implementation handoff defaults to every complete observable design fact[\s\S]*current-candidate production proof/iu,
  );
  assert.match(
    globalContext,
    /Design Source Projection routes durable UI\/UX meaning[\s\S]*each adopted target has one canonical record/iu,
  );
  assert.match(
    globalContext,
    /default Contract Conformance and Long-Task Final Gate are mutually exclusive carriers/iu,
  );
  assert.match(
    chineseReadme,
    /Agent 的开发、验收和测试在 UI\/UX 方面完整遵循选定设计资源/iu,
  );
  assert.match(
    chineseReadme,
    /canonical entry[\s\S]*typed locator[\s\S]*subject.*target.*condition/isu,
  );
  assert.match(chineseReadme, /complete observable design fact/iu);
  assert.match(chineseReadme, /pixel/iu);
  assert.match(
    sourcePlan,
    /Implementation-Source Closure And Provider Selection Amendment/iu,
  );
  assert.match(
    sourcePlan,
    /Shared Conformance And Durable UI\/UX Recovery Amendment/iu,
  );
  assert.match(sourcePlan, /REQ-DRA-054/);
  assert.match(sourcePlan, /AC-DRA-033/);
  assert.match(sourcePlan, /Figma[\s\S]*Penpot[\s\S]*OpenPencil/iu);
});

test("default workflow routes Design Authority readiness without adding a visual lifecycle", async () => {
  const [
    spec,
    managedSurface,
    verification,
    workflow,
    agents,
    rootReadme,
    chineseReadme,
    packageReadme,
  ] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read(
      "project_context/areas/harness-package/contracts/package-managed-surfaces.md",
    ),
    read("project_context/areas/harness-package/verification.md"),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read("README.md"),
    read("README.zh-CN.md"),
    read("packages/ty-context/README.md"),
  ]);

  for (const content of [spec, managedSurface]) {
    assert.match(content, /task-local|ephemeral/iu);
    assert.match(content, /no (?:visual Schema|`uiux_delivery` block)|There is no `uiux_delivery` block/iu);
    assert.match(content, /no[^\n]*lifecycle state/iu);
  }
  assert.match(
    spec,
    /authoring\/evidence specialization, not a new mechanism/iu,
  );
  assert.match(spec, /cannot infer completeness beyond declared coverage/iu);
  assert.match(verification, /Design Authority and visual delivery guidance/iu);
  assert.match(workflow, /^## Design Authority Readiness$/mu);
  assert.match(workflow, /^## External Design Resources$/mu);
  assert.match(workflow, /ty-context design-resource preflight <handoff\.md>/u);
  assert.match(
    workflow,
    /every subject across surface\/flow[\s\S]*accessibility and assets/iu,
  );
  assert.match(
    workflow,
    /conserves the exact covered Source-item\/method\/blocker\/target\/condition sets[\s\S]*real-entry checks/iu,
  );
  assert.match(workflow, /^## UI Authority Closure$/mu);
  assert.match(workflow, /material production UI/iu);
  assert.match(workflow, /`exact-target`, `constraint` or `inspiration`/iu);
  assert.match(workflow, /conditional order-of-thought guidance/iu);
  assert.match(
    workflow,
    /open and inspect every selected `exact-target` or `constraint`/iu,
  );
  assert.match(
    workflow,
    /immutable adopted locator\/digest[\s\S]*editable upstream locator\/owner\/update route/iu,
  );
  assert.match(workflow, /new immutable version\/digest/iu);
  assert.match(
    workflow,
    /design-system-authoring[\s\S]*never auto-runs[\s\S]*design-resource-authoring[\s\S]*style-bearing work stops on unconfigured authority/isu,
  );
  assert.doesNotMatch(workflow, /Visual Coverage Set/u);
  assert.match(
    agents,
    /For material UI, reconcile affected stable surface\/control\/target keys/iu,
  );
  assert.match(agents, /stable surface\/control\/target key/iu);
  assert.match(
    agents,
    /production owner, cold-start journey[\s\S]*final-candidate project check/iu,
  );
  assert.match(
    agents,
    /Preflight and hashes prove input completeness\/integrity, never production conformance/iu,
  );
  assert.match(agents, /Local fixes and explicit non-fidelity prototypes stay lightweight/iu);
  assert.match(agents, /Externally authored resources remain ordinary Source/iu);
  assert.match(agents, /exactly one canonical record/iu);
  assert.match(
    agents,
    /immutable locator\/digest[\s\S]*editable-upstream update route/iu,
  );
  assert.match(agents, /Never overwrite an adopted baseline/iu);
  assert.match(
    agents,
    /unresolved, unmapped, unexecuted, stale or indistinguishable item blocks a complete-conformance claim/iu,
  );
  assert.match(
    agents,
    /active Long-Task projects this same obligation[\s\S]*never also runs the default closure/iu,
  );
  assert.match(managedSurface, /Context-reachable Source/iu);
  assert.match(
    managedSurface,
    /no binary copy in Context, provider registry, asset registry, state or second authority/iu,
  );

  for (const content of [rootReadme, packageReadme]) {
    assert.match(content, /^### Visual Delivery Guidance$/mu);
    assert.match(content, /^### Optional Design Resource Authoring$/mu);
    assert.match(
      content,
      /default Workflow.*conditional Design Authority Check/iu,
    );
    assert.match(content, /no `uiux_delivery` block/iu);
    assert.match(content, /surface implementation readiness/iu);
    assert.match(content, /Context-reachable Source/iu);
    assert.match(
      content,
      /immutable locator\/digest[\s\S]*editable upstream owner\/locator\/update route/iu,
    );
    assert.match(content, /exactly one canonical adoption record/iu);
    assert.match(content, /mutually exclusive/iu);
    assert.match(content, /Product `surface_bindings`/u);
    assert.match(content, /typed `design_conformance`/u);
    assert.match(content, /first useful runnable production slice/iu);
    assert.match(
      content,
      /pairwise sampling[\s\S]{0,120}(?:scope narrowing|equivalence proof)/iu,
    );
    assert.match(
      content,
      /all 22 canonical fields[\s\S]*`field_coverage`[\s\S]*omission never means non-applicable[\s\S]*`control_relation_closure`/iu,
    );
    assert.match(
      content,
      /applicability profiles?[\s\S]*exact target[\s\S]*Given condition\/input\/state[\s\S]*ordered When/iu,
    );
  }
  assert.match(chineseReadme, /^### 视觉交付指导$/mu);
  assert.match(chineseReadme, /^### 可选 Design Resource Authoring$/mu);
  assert.match(chineseReadme, /默认 Workflow.*Design Authority Check/u);
  assert.match(chineseReadme, /不新增 `uiux_delivery`/u);
  assert.match(chineseReadme, /UI Authority Closure/u);
  assert.match(chineseReadme, /Context-reachable Source/iu);
  assert.match(chineseReadme, /新 immutable version/u);
  assert.match(chineseReadme, /Product `surface_bindings`/u);
  assert.match(chineseReadme, /typed `design_conformance`/u);
  assert.match(chineseReadme, /第一个有价值的可运行纵向切片/u);
  assert.match(chineseReadme, /两种证明载体互斥/u);
  assert.match(chineseReadme, /exactly-one canonical adoption record/iu);
});
