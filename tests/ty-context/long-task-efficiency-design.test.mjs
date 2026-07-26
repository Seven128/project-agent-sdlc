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
        "project_context/areas/harness-package/decision-rationale/minimal-context.md",
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
    "selected delivery-authority structure",
    "selected area",
    "selected role",
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

test("one-time model choice uses Authority Lock without creating model routing state", async () => {
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
  ]);

  assert.equal(generated, skill);
  assert.equal(packaged, skill);
  assert.equal(lifecycleGenerated, lifecycleSource);
  assert.equal(lifecyclePackaged, lifecycleSource);
  const combined = [
    skill,
    lifecycleSource,
    rationale,
    efficiency,
    architecture,
  ].join("\n");

  for (const expected of [
    "execution_model_checkpoint",
    "continue_current_model",
    "required: false",
    "first Authority Lock",
  ])
    assert.match(combined, new RegExp(expected, "iu"), expected);
  assert.match(
    combined,
    /switch_model_then_resume|switch models[\s\S]{0,80}resume/iu,
  );
  assert.match(combined, /stop once|one-time/iu);
  assert.match(combined, /prior explicit|already stated explicitly/iu);
  assert.match(
    combined,
    /no checkpoint file|no acknowledgement file|no acknowledgement state/iu,
  );
  assert.match(combined, /no .*model route|creates no model route/iu);
  assert.match(combined, /does not switch|cannot switch/iu);
  assert.match(combined, /not proof|not acceptance evidence/iu);

  const affirmativeModelRoutingClaims = combined
    .split(/\r?\n/u)
    .filter((line) =>
      /model-tier scheduler.*active|persisted model route/iu.test(line),
    )
    .filter(
      (line) =>
        !/\bno\b|does not|without|never|not persisted|不创建|不持久化/iu.test(
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
    /never prune a declared\/applicable combination[\s\S]{0,180}(?:pairwise|equivalence)/iu,
  );
  assert.match(combined, /execution_model_checkpoint\.required: true/iu);
  assert.match(combined, /continue_current_model/iu);
  assert.match(combined, /switch_model_then_resume/iu);

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
      read(".codex/skills/authoring/harness_package_design/SKILL.md"),
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
    /TS-RERUN[\s\S]*不得把失败后的局部复验拼接[\s\S]*tracked verification inputs[\s\S]*environment-only[\s\S]*否则最终证明必须重新取得一次完整通过/iu,
  );
});
