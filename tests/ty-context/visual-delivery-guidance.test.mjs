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

test("page-level UI authority historical design Source is indexed without becoming Context", async () => {
  const [plan, spec, implementationIndex, manifest] = await Promise.all([
    read("docs/page-level-uiux-authority-design-source.md"),
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
    /not Context, a Delivery Contract, runtime state, current workflow routing or completion proof/iu,
  );
  assert.match(plan.slice(0, 700), /Status: dated ordinary Source\/history/iu);
  assert.match(spec, /docs\/page-level-uiux-authority-design-source\.md/);
  assert.match(
    implementationIndex,
    /docs\/page-level-uiux-authority-design-source\.md/,
  );
  assert.doesNotMatch(manifest, /page-level-uiux-authority-design-source/);
});

test("visual design and implementation guidance reaches every managed copy", async () => {
  const [uiuxCopies, developmentCopies, agents, formalHandoff] = await Promise.all([
    skillCopies("context_uiux_design"),
    skillCopies("context_development_engineer"),
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read(
      ".codex/ty-context-managed/skills/design-resource-authoring/references/formal-selected-web-app-handoff.md",
    ),
  ]);

  for (const copies of [uiuxCopies, developmentCopies]) {
    assert.equal(copies[1], copies[0]);
    assert.equal(copies[2], copies[0]);
  }

  const uiux = uiuxCopies[0];
  assert.match(uiux, /^## Ownership$/mu);
  assert.match(uiux, /^## UI Authority Closure$/mu);
  assert.match(uiux, /^## Selected-design alignment$/mu);
  assert.match(uiux, /Own durable Design Authority only/iu);
  assert.match(uiux, /root `DESIGN\.md`/u);
  assert.match(uiux, /exact-value token source\/generation direction/iu);
  assert.match(uiux, /exactly one canonical adoption record per adopted target/iu);
  assert.match(uiux, /project\/system\/component-family targets[\s\S]*owning Screen Contract/iu);
  assert.match(uiux, /design-resource-authoring/iu);
  assert.match(uiux, /ty-context design-resource preflight <handoff\.md>/u);
  assert.match(uiux, /every affected selected `exact-target` or `constraint`/iu);
  assert.match(uiux, /`exact-target`, `constraint` or `inspiration`/iu);
  assert.match(uiux, /immutable path\/URI and digest[\s\S]*editable upstream owner\/locator\/update route/iu);
  assert.match(uiux, /Never overwrite an adopted baseline[\s\S]*new immutable version/iu);
  assert.match(uiux, /real production route\/component and affected cold-start journey after the final change/iu);
  assert.match(uiux, /resource integrity\/preflight is not production conformance/iu);
  assert.match(uiux, /Do not create a UI lifecycle[\s\S]*second Authority\/Gate/iu);
  assert.ok(Buffer.byteLength(uiux, "utf8") < 8_000, "compact authority owner");

  const development = developmentCopies[0];
  assert.match(development, /Design Authority[\s\S]*belong to `context_uiux_design`/iu);
  assert.match(development, /design-resource generation\/handoff belongs to `design-resource-authoring`/iu);
  assert.match(development, /surface information\/action\/feedback responsibility belongs to `context_surface_contract`/iu);
  assert.match(development, /exact selected UI values remain owned by selected-design closure/iu);
  assert.doesNotMatch(development, /^## Visual Delivery Implementation/mu);

  const distributed = `${agents}\n${uiux}\n${formalHandoff}`;
  assert.match(distributed, /Expected Fact Universe[\s\S]*Canonical Resource Facts[\s\S]*Handoff Indexed Facts/iu);
  assert.match(distributed, /subject × target × condition × variation × atomic property/iu);
  assert.match(distributed, /frozen Inspector[\s\S]*Census/iu);
  assert.match(distributed, /full_target[\s\S]*layout_geometry[\s\S]*visual_pixel/iu);
  assert.match(distributed, /Final Gate/iu);
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
  assert.match(
    authoring,
    /Expected Fact Universe = Canonical Resource Facts = Handoff Indexed Facts/iu,
  );
  assert.match(
    authoring,
    /subject × target × condition × variation × property/iu,
  );
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
  assert.match(
    authoring,
    /Browser, Expo-Web, native, mobile and desktop UI conformance cannot machine-close a Claim/iu,
  );
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
    /direct-process observer can derive host `target_runtime`[\s\S]*does not currently derive `interaction_trace`/iu,
  );
  assert.match(
    authoring,
    /project or Playwright `design_method`[\s\S]*remain diagnostic and cannot provide authority/iu,
  );
  assert.match(authoring, /exact proof-owned `fact_refs`/iu);
  assert.match(authoring, /canonical `fact_expectations` row for every Fact/iu);
  assert.match(
    authoring,
    /current package derivation supplies only admitted plain exact\/presence results and host `target_runtime`/iu,
  );
  assert.match(
    authoring,
    /design conformance, interaction, layout, pixel, accessibility, motion[\s\S]*blocking External Confirmations/iu,
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
  assert.match(
    evidence,
    /complete per-resource\/Fact Cell\/Fact\/proof closure/iu,
  );
  assert.match(evidence, /exact handoff `fact_refs`/iu);
  assert.match(evidence, /exact expectation/iu);
  assert.match(
    evidence,
    /project `design_method`, `fact_results`, screenshots and Playwright attachments are repair diagnostics only/iu,
  );
  assert.match(
    evidence,
    /aggregate Boolean[\s\S]*one `all-states` result[\s\S]*per-Fact authority/iu,
  );
  assert.match(
    evidence,
    /geometry\/pixel\/token\/content[\s\S]*motion\/haptic\/sound timeline[\s\S]*accessibility semantic\/navigation\/visual[\s\S]*asset integrity/iu,
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
  assert.match(evidence, /`ui_browser` does not create machine proof/iu);
  assert.match(evidence, /stable surface\/control\/target keys/iu);
  assert.match(
    evidence,
    /one broad screenshot or UI pass cannot prove all Control fields/iu,
  );
  assert.match(
    evidence,
    /Host `target_runtime`[\s\S]*directly executes the process product root[\s\S]*`interaction_trace` has no package derivation/iu,
  );
  assert.match(
    evidence,
    /Candidate comparison, a mutable provider link, extraction success[\s\S]*authoring\/integrity material/iu,
  );
});

test("selected-design Source authority is shared while formal proof levels remain distinct", async () => {
  const [
    spec,
    globalContext,
    rationale,
    handoffContract,
    longTaskCopies,
    rootReadme,
    chineseReadme,
    packageReadme,
    designSource,
    longTaskDetail,
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
    read("docs/design-resource-authoring-implementation-source.md"),
    Promise.all([
      read(
        ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
      ),
      read(
        ".codex/ty-context-managed/skills/long-task-workflow/references/evidence-design.md",
      ),
    ]).then((contents) => contents.join("\n")),
  ]);

  assert.equal(longTaskCopies[1], longTaskCopies[0]);
  assert.equal(longTaskCopies[2], longTaskCopies[0]);
  for (const content of [
    spec,
    rationale,
    handoffContract,
    `${longTaskCopies[0]}\n${longTaskDetail}`,
  ]) {
    assert.match(
      content,
      /Agent implementation, acceptance and testing fully conform|full implementation\/acceptance\/test conformance/iu,
    );
    assert.match(content, /canonical (?:machine-readable )?(?:entry|source)/iu);
    assert.match(content, /typed locator/iu);
    assert.match(content, /subject.*target.*condition.*variation.*property/isu);
    assert.match(
      content,
      /residual[\s\S]{0,160}handoff|handoff[\s\S]{0,160}residual/iu,
    );
    assert.match(content, /immutable/iu);
    assert.match(content, /Final Gate/iu);
  }
  for (const content of [rootReadme, packageReadme]) {
    assert.match(content, /Both development paths preserve selected design Source authority/iu);
    assert.match(content, /do not share a formal proof level/iu);
    assert.match(content, /default work[\s\S]*reports conditions not established[\s\S]*Long-Task additionally provides exact per-Fact\/Rule machine closure/iu);
    assert.match(content, /canonical (?:machine-readable )?(?:entry|source)/iu);
    assert.match(content, /typed locator/iu);
    assert.match(content, /subject.*target.*condition.*variation.*property/isu);
  }
  for (const content of [
    spec,
    handoffContract,
    `${longTaskCopies[0]}\n${longTaskDetail}`,
    rootReadme,
    packageReadme,
  ]) {
    assert.match(content, /Expected Fact Universe/iu);
    assert.match(content, /pixel/iu);
  }
  assert.match(handoffContract, /resource_fact_closure/u);
  assert.match(handoffContract, /fact_refs/u);
  assert.match(
    globalContext,
    /Material selected design remains ordinary Source[\s\S]*Default work opens affected exact targets\/constraints[\s\S]*Long-Task alone projects exact selected-design Fact\/method closure/iu,
  );
  assert.doesNotMatch(
    globalContext,
    /Expected Fact Universe|frozen Inspector|Fact Cell universe/iu,
  );
  assert.match(
    chineseReadme,
    /两种开发路径共享选定设计 Source 权威，但不共享形式化证明等级/iu,
  );
  assert.match(
    chineseReadme,
    /canonical entry[\s\S]*typed locator[\s\S]*subject.*target.*condition/isu,
  );
  assert.match(chineseReadme, /Expected Fact Universe/iu);
  assert.match(
    chineseReadme,
    /subject × selected target × condition combination × variation combination × property/iu,
  );
  assert.match(chineseReadme, /pixel/iu);
  assert.match(
    designSource,
    /Implementation-Source Closure And Provider Selection Amendment/iu,
  );
  assert.match(
    designSource,
    /Shared Conformance And Durable UI\/UX Recovery Amendment/iu,
  );
  assert.match(designSource, /REQ-DRA-054/);
  assert.match(designSource, /AC-DRA-033/);
  assert.match(designSource, /Figma[\s\S]*Penpot[\s\S]*OpenPencil/iu);
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
    assert.match(
      content,
      /no (?:visual Schema|`uiux_delivery` block)|There is no `uiux_delivery` block/iu,
    );
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
    /subject × target × condition × variation × property[\s\S]*Product Controls\/eight dimensions are not the Fact ceiling/iu,
  );
  assert.match(
    workflow,
    /open every affected exact target\/constraint[\s\S]*production owner and cold-start real-user journey[\s\S]*report any condition those checks do not cover/iu,
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
    /real production owner and cold-start journey[\s\S]*project-native visual, interaction, accessibility or runtime checks on the final candidate/iu,
  );
  assert.match(
    agents,
    /Preflight(?: and hashes)? proves? input completeness\/integrity[\s\S]*never production conformance/iu,
  );
  assert.match(
    agents,
    /Local fixes and explicit non-fidelity prototypes stay lightweight/iu,
  );
  assert.match(
    agents,
    /Externally authored resources remain ordinary Source/iu,
  );
  assert.match(agents, /exactly one canonical record/iu);
  assert.match(
    agents,
    /immutable locator\/digest[\s\S]*editable-upstream update route/iu,
  );
  assert.match(agents, /Never overwrite an adopted baseline/iu);
  assert.match(
    agents,
    /reports conditions those checks did not establish[\s\S]*does not rebuild the complete Fact Cell universe/iu,
  );
  assert.match(
    agents,
    /active Long-Task instead projects the exact obligation[\s\S]*never also runs a default closure/iu,
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
    assert.match(
      content,
      /project `design_conformance`, `design_method` and `fact_results` records are diagnostic[\s\S]*blocking External Confirmations/iu,
    );
    assert.match(content, /first useful runnable production slice/iu);
    assert.match(
      content,
      /representative\/pairwise samples[\s\S]{0,120}cannot stand for atomic cells/iu,
    );
    assert.match(
      content,
      /all 22 canonical fields[\s\S]*`field_coverage`[\s\S]*never caps[\s\S]*finer design Fact universe[\s\S]*Control Claims\/relations/iu,
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
  assert.match(
    chineseReadme,
    /项目 `design_conformance`、`design_method` 与 `fact_results` record 只作诊断[\s\S]*阻断性 External Confirmation/iu,
  );
  assert.match(chineseReadme, /第一个有价值的可运行纵向切片/u);
  assert.match(chineseReadme, /两种 carrier 互斥/u);
  assert.match(chineseReadme, /exactly-one canonical adoption record/iu);
});
