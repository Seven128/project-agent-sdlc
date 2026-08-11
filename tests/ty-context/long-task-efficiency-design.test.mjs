import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const read = (relative) => readFile(path.join(repository, relative), "utf8");

test("Context authority projection excludes retrieval-only friction without weakening final proof", async () => {
  const [architecture, contextModel, rationale, efficiency, lifecycle] =
    await Promise.all([
      read("project_context/architecture.md"),
      read("project_context/areas/harness-package/foundation/context-model.md"),
      read(
        "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
      ),
      read("docs/long-task-workflow-efficiency.md"),
      read(
        ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
      ),
    ]);
  const combined = [
    architecture,
    contextModel,
    rationale,
    efficiency,
    lifecycle,
  ].join("\n");

  for (const expected of [
    "triggers",
    "read_when",
    "read_policy",
    "selected delivery-authority projection",
    "selected area",
    "role/dependency structure",
    "scoped Progress",
    "Live Final Gate",
  ])
    assert.match(combined, new RegExp(expected, "iu"), expected);
  assert.match(
    combined,
    /retrieval-only[\s\S]*do not revise|retrieval-only[\s\S]*does not revise/iu,
  );
  assert.match(
    combined,
    /changed Git tree[\s\S]*Live Final Gate|final Git tree[\s\S]*Live Final Gate/iu,
  );
  assert.doesNotMatch(
    combined,
    /retrieval registry|retrieval cache|retrieval state file/iu,
  );
});

test("bounded Context discovery reduces trigger-only recall risk without a retrieval system", async () => {
  const [
    agents,
    development,
    contextModel,
    architecture,
    rationale,
    efficiency,
  ] = await Promise.all([
    read(".codex/ty-context-managed/agents/AGENTS_CORE.md"),
    read(
      ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
    ),
    read("project_context/areas/harness-package/foundation/context-model.md"),
    read("project_context/architecture.md"),
    read(
      "project_context/areas/harness-package/decision-rationale/minimal-context.md",
    ),
    read("docs/long-task-workflow-efficiency.md"),
  ]);
  const combined = [
    agents,
    development,
    contextModel,
    architecture,
    rationale,
    efficiency,
  ].join("\n");

  assert.match(combined, /bounded (?:text|Context discovery) search/iu);
  assert.match(combined, /project_context\/\*\*/u);
  assert.match(
    combined,
    /before `Context Delta`|before deciding `Context Delta`/iu,
  );
  assert.match(combined, /area\/module/iu);
  assert.match(
    combined,
    /API\/schema\/state\/security\/verification\/deployment|API\/Schema\/state\/security\/verification\/deployment/iu,
  );
  assert.match(combined, /supplements.*semantic judgment/isu);
  assert.match(combined, /low fixed cost/iu);

  const affirmativeInfrastructureClaims = combined
    .split(/\r?\n/u)
    .filter((line) =>
      /create(?:s)? (?:a )?(?:vector|persistent) index|persist(?:s)? search state/iu.test(
        line,
      ),
    )
    .filter(
      (line) => !/\bno\b|does not|without|never|不创建|不持久化/iu.test(line),
    );
  assert.deepEqual(affirmativeInfrastructureClaims, []);
});

test("first-lock host checkpoint creates no model routing state", async () => {
  const [
    skill,
    generated,
    packaged,
    lifecycleSource,
    lifecycleGenerated,
    lifecyclePackaged,
    rationale,
    efficiency,
    architecture,
    workflowContract,
    managedAgentProfile,
    installedAgentProfile,
    packagedAgentProfile,
    specification,
    packageSurfaces,
  ] = await Promise.all([
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read(".codex/skills/long-task-workflow/SKILL.md"),
    read("packages/ty-context/assets/skills/long-task-workflow/SKILL.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
    read(".codex/skills/long-task-workflow/references/authority-lifecycle.md"),
    read(
      "packages/ty-context/assets/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read("docs/long-task-workflow-efficiency.md"),
    read("project_context/architecture.md"),
    read(
      "project_context/areas/harness-package/contracts/workflow-contract.md",
    ),
    read(
      ".codex/ty-context-managed/agents/long-task-implementation.toml",
    ),
    read(".codex/agents/long-task-implementation.toml"),
    read(
      "packages/ty-context/assets/agents/long-task-implementation.toml",
    ),
    read("PROJECT_SPEC.md"),
    read(
      "project_context/areas/harness-package/contracts/package-managed-surfaces.md",
    ),
  ]);

  assert.equal(generated, skill);
  assert.equal(packaged, skill);
  assert.equal(lifecycleGenerated, lifecycleSource);
  assert.equal(lifecyclePackaged, lifecycleSource);
  assert.equal(installedAgentProfile, managedAgentProfile);
  assert.equal(packagedAgentProfile, managedAgentProfile);
  const combined = [
    skill,
    lifecycleSource,
    rationale,
    efficiency,
    architecture,
    workflowContract,
    specification,
    packageSurfaces,
    managedAgentProfile,
  ].join("\n");

  for (const expected of [
    "execution_model_checkpoint",
    "change_model_in_host_then_continue",
    "resume_token: continue",
    "required: false",
    "first Authority Lock",
  ])
    assert.match(combined, new RegExp(expected, "iu"), expected);
  assert.match(combined, /After handling the model change, send \[continue\]\./u);
  assert.match(combined, /unconditionally|always ends? the current turn/iu);
  assert.match(combined, /prior[\s\S]{0,120}(?:never skips|cannot skip)/iu);
  assert.match(combined, /generic_continue_satisfies"?\s*:\s*true/iu);
  assert.match(combined, /model_change_observable_by_harness"?\s*:\s*false/iu);
  assert.match(
    combined,
    /no checkpoint file|no acknowledgement file|no acknowledgement state/iu,
  );
  assert.match(combined, /no .*model route|creates no model route/iu);
  assert.match(combined, /does not switch|cannot switch/iu);
  assert.match(combined, /not proof|not acceptance evidence/iu);
  assert.match(combined, /long_task_implementation/iu);
  assert.match(
    combined,
    /after .*checkpoint|after .*resume|post-checkpoint/iu,
  );
  assert.match(combined, /Delegation Suitability/iu);
  assert.match(combined, /benefit[\s\S]{0,120}coordination cost/iu);
  assert.match(combined, /multiple disjoint/iu);
  assert.match(combined, /parent[\s\S]{0,200}(?:Source|Authority)[\s\S]{0,240}Final Gate/iu);
  assert.match(
    combined,
    /absence.*acceptance|unavailable.*formal acceptance|cannot affect .*acceptance/iu,
  );
  assert.match(
    combined,
    /static, stateless, non-Authority|fixed, stateless, optional and non-authoritative/iu,
  );
  const ownerImplication =
    "禁止的是动态或持久化模型路由、模型调度和第二控制平面；允许的是一个固定、无状态、非 Authority、可缺席的 Codex 原生滚动实现 worker profile。";
  assert.ok(specification.includes(ownerImplication));
  assert.ok(rationale.includes(ownerImplication));
  assert.match(managedAgentProfile, /^name = "long_task_implementation"$/mu);
  assert.match(managedAgentProfile, /^model = "[^"\r\n]+"$/mu);
  assert.match(managedAgentProfile, /^model_reasoning_effort = "[^"\r\n]+"$/mu);
  assert.match(managedAgentProfile, /^\[agents\]$/mu);
  assert.match(managedAgentProfile, /^enabled = false$/mu);
  assert.doesNotMatch(
    combined,
    /continue_current_model|switch_model_then_resume|generic_continue_satisfies:\s*false/iu,
  );

  const affirmativeModelRoutingClaims = combined
    .split(/\r?\n/u)
    .filter((line) =>
      /model-tier scheduler.*active|persisted model route|dynamic model route.*active/iu.test(
        line,
      ),
    )
    .filter(
      (line) =>
        !/\bno\b|does not|without|never|not[\s\S]*persisted model route|不创建|不持久化/iu.test(
          line,
        ),
    );
  assert.deepEqual(affirmativeModelRoutingClaims, []);
});

test("implementation freedom removes method gates without weakening declared proof", async () => {
  const [
    specification,
    workflow,
    rationale,
    efficiency,
    skill,
    lifecycle,
    development,
    uiux,
    publicReadme,
    packageReadme,
  ] = await Promise.all([
    read("PROJECT_SPEC.md"),
    read("project_context/areas/harness-package/contracts/workflow-contract.md"),
    read(
      "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
    ),
    read("docs/long-task-workflow-efficiency.md"),
    read(".codex/ty-context-managed/skills/long-task-workflow/SKILL.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
    read(
      ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
    ),
    read(".codex/ty-context-managed/skills/context_uiux_design/SKILL.md"),
    read("README.md"),
    read("packages/ty-context/README.md"),
  ]);
  const combined = [
    specification,
    workflow,
    rationale,
    efficiency,
    skill,
    lifecycle,
    development,
    uiux,
    publicReadme,
    packageReadme,
  ].join("\n");

  assert.match(
    combined,
    /Goal-owned adaptive (?:technical )?implementation/iu,
  );
  assert.match(
    combined,
    /Frontier[\s\S]{0,240}(?:not an implementation gate|does not (?:authorize|prohibit|restrict|gate))/iu,
  );
  assert.match(
    combined,
    /platform-native (?:internal |opaque )?delegation[\s\S]{0,280}(?:no .*scheduler|non-authoritative|not .*proof|converge)/iu,
  );
  assert.match(combined, /Implementation Freedom Boundary/iu);
  assert.match(
    combined,
    /one or multiple platform-native agents\/subagents/iu,
  );
  assert.match(
    combined,
    /(?:agent reports|their reports)[\s\S]{0,120}(?:not Progress|non-authoritative|not .*proof)/iu,
  );
  assert.match(
    combined,
    /(?:new|proposed mandatory) development-stage constraint[\s\S]{0,300}distinct path[\s\S]{0,300}(?:lighter project-owned check|lighter project check)[\s\S]{0,300}positive net ROI[\s\S]{0,160}high total-cost ROI[\s\S]{0,120}high efficiency/iu,
  );
  assert.match(
    combined,
    /significant(?:,)? stable margin[\s\S]{0,160}(?:not|rather than)[\s\S]{0,80}(?:global|local) optimum/iu,
  );
  assert.match(
    combined,
    /sufficiency (?:rule|stop rule)[\s\S]{0,300}(?:new real counterexample|repeated material cost hot spot|significant additional net benefit)/iu,
  );
  assert.match(
    combined,
    /recommended targeted-feedback points[\s\S]{0,260}(?:only before an intermediate decision|only before intermediate reliance)/iu,
  );
  assert.match(
    combined,
    /Final Gate[\s\S]{0,220}(?:ignores Progress|stale or absent Progress)[\s\S]{0,180}reruns?/iu,
  );
  assert.match(
    combined,
    /(?:no declared applicable combination may be pruned|Never replace declared combinations)[\s\S]{0,180}(?:pairwise|equivalence)/iu,
  );
  assert.match(combined, /execution_model_checkpoint\.required: true/iu);
  assert.match(combined, /change_model_in_host_then_continue/iu);
  assert.match(combined, /generic_continue_satisfies"?\s*:\s*true/iu);
  assert.doesNotMatch(
    combined,
    /continue_current_model|switch_model_then_resume/iu,
  );

  for (const obsolete of [
    /stage-constrained rolling technical implementation/iu,
    /rolling internal implementation Frontier/iu,
    /implement only Outcomes in the derived current Stage frontier/iu,
    /Implement and verify ready Outcome/iu,
    /Never proactively spawn, assign or coordinate parallel subagents/iu,
    /refresh[\s\S]{0,100}before (?:dependent reliance or )?Final Gate/iu,
  ])
    assert.doesNotMatch(combined, obsolete);
});

test("Preflight repair ordering remains advisory and creates no authority", async () => {
  const [architecture, efficiency, ...references] = await Promise.all([
    read("project_context/architecture.md"),
    read("docs/long-task-workflow-efficiency.md"),
    read(".codex/skills/long-task-workflow/references/authority-lifecycle.md"),
    read(
      ".codex/ty-context-managed/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
    read(
      "packages/ty-context/assets/skills/long-task-workflow/references/authority-lifecycle.md",
    ),
  ]);
  const combined = [architecture, efficiency, ...references].join("\n");

  for (const expected of [
    "diagnostic_id",
    "repair_group",
    "repair_priority",
    "blocked_by",
    "structural duplicate",
    "same Claim",
  ])
    assert.match(combined, new RegExp(expected, "iu"), expected);
  assert.match(combined, /no (?:diagnostic|finding) is hidden/iu);
  assert.match(combined, /no repair state|creates no repair state/iu);
  assert.equal(references[1], references[0]);
  assert.equal(references[2], references[0]);
});

test("affected developer loops remain non-authoritative", async () => {
  const [verification, implementation, efficiency, specification] =
    await Promise.all([
      read("project_context/areas/harness-package/verification.md"),
      read("docs/test-suite-roi-redesign.md"),
      read("docs/long-task-workflow-efficiency.md"),
      read("PROJECT_SPEC.md"),
    ]);
  const combined = [
    verification,
    implementation,
    efficiency,
    specification,
  ].join("\n");
  for (const command of [
    "test:affected:list",
    "test:affected",
    "test:long-task:focused",
    "test:long-task:trust",
    "test:delivery-contract:focused",
    "do not replace complete CI/release gates",
    "fail safe",
  ])
    assert.ok(combined.includes(command), command);

  for (const boundary of [
    "local-worktree",
    "HEAD^",
    "Trust Boundary Gate",
    "test-suite-timing-v2",
    "main",
    "publish",
  ])
    assert.ok(combined.includes(boundary), boundary);

  assert.match(combined, /zero times during ordinary repair/iu);
  assert.match(combined, /third run requires/iu);
  assert.match(
    combined,
    /never Contract acceptance|never.*acceptance authority|never becomes Long-Task acceptance evidence/iu,
  );
});

test("aggregate rerun policy removes only redundant local complete runs", async () => {
  const [verification, redesign, efficiency, specification, authoring] =
    await Promise.all([
      read("project_context/areas/harness-package/verification.md"),
      read("docs/test-suite-roi-redesign.md"),
      read("docs/long-task-workflow-efficiency.md"),
      read("PROJECT_SPEC.md"),
      read(
        ".codex/skills/authoring/harness_package_design/references/test-and-benchmark-governance.md",
      ),
    ]);
  assert.match(
    verification,
    /environment-only[\s\S]*tracked verification inputs[\s\S]*guaranteed downstream[\s\S]*local aggregate remains failed[\s\S]*without that downstream gate[\s\S]*clean complete rerun/iu,
  );
  assert.match(
    redesign,
    /tracked source[\s\S]*tests[\s\S]*configuration[\s\S]*shared fixtures[\s\S]*runners[\s\S]*never splice partial reruns/iu,
  );
  assert.match(
    efficiency,
    /cross-suite contamination[\s\S]*guaranteed downstream[\s\S]*failed local aggregate remains failed[\s\S]*partial reruns cannot be reported/iu,
  );
  assert.match(
    specification,
    /cross-suite contamination[\s\S]*environment-only[\s\S]*guaranteed downstream[\s\S]*partial reruns never become a local complete-pass claim/iu,
  );
  assert.match(
    authoring,
    /TS-RERUN[\s\S]*local green fragments cannot be concatenated[\s\S]*tracked verification inputs did not change[\s\S]*environment-only[\s\S]*Otherwise obtain one fresh complete pass/iu,
  );
});
