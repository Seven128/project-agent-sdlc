import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  DELIVERY_CONTRACT_FOCUSED_TESTS,
  LONG_TASK_FOCUSED_TESTS,
  LONG_TASK_TRUST_TESTS,
  selectAffectedTests,
} from "../../tools/affected_test_selection.mjs";
import {
  CONTROLLED_TEST_SUITE_BUDGET_PROFILES,
  assertHotspotTestFanoutBudget,
  assertReviewedTestList,
  resolveSuiteWallTimeBudgetMs,
  resolveTestTimingOutput,
  suiteWallTimeBudgetStatus,
  TEST_TIER_REVIEW_BUDGETS,
} from "../../tools/test_suite_policy.mjs";

test("hotspot source changes select focused regression tests", () => {
  const selection = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-progress.ts",
  ]);
  assert.equal(selection.mode, "selected");
  assert.equal(selection.requires_build, true);
  assert.deepEqual(selection.tests, [
    "tests/ty-context/long-task-authority-progress-retry.test.mjs",
    "tests/ty-context/long-task-context-evolution.test.mjs",
    "tests/ty-context/long-task-semantic-drift-closure.test.mjs",
    "tests/ty-context/long-task-semantic-drift-lifecycle.test.mjs",
    "tests/ty-context/long-task-state-resume.test.mjs",
  ]);
});

test("UI production-surface owners select the proxy and design-conformance sentinels", () => {
  const selection = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-ui-surface-policy.ts",
  ]);
  assert.equal(selection.mode, "selected");
  assert.equal(selection.requires_build, true);
  assert.deepEqual(selection.tests, [
    "tests/ty-context/long-task-authoring-claims.test.mjs",
    "tests/ty-context/long-task-claim-coverage.test.mjs",
    "tests/ty-context/long-task-semantic-authority-revision.test.mjs",
    "tests/ty-context/long-task-semantic-drift-closure.test.mjs",
  ]);
});

test("Design Authority scaffold and advisory changes select focused coverage", () => {
  const design = selectAffectedTests([
    "packages/ty-context/src/lib/design-md.ts",
  ]);
  assert.equal(design.mode, "selected");
  assert.equal(design.requires_build, true);
  assert.deepEqual(design.tests, [
    "tests/ty-context/sync-init-doctor.test.mjs",
    "tests/ty-context/visual-delivery-guidance.test.mjs",
  ]);

  const doctor = selectAffectedTests(["packages/ty-context/src/lib/doctor.ts"]);
  assert.equal(doctor.mode, "selected");
  assert.equal(doctor.requires_build, true);
  assert.deepEqual(doctor.tests, [
    "tests/ty-context/sync-init-doctor.test.mjs",
  ]);
});

test("control-level UI authority changes select parser, Claim and revision coverage", () => {
  const shape = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-product-shape.ts",
  ]);
  assert.equal(shape.mode, "selected");
  assert.equal(shape.requires_build, true);
  assert.deepEqual(shape.tests, [
    "tests/ty-context/long-task-claim-coverage.test.mjs",
    "tests/ty-context/long-task-delivery-parser.test.mjs",
    "tests/ty-context/long-task-schema-parser-parity.test.mjs",
  ]);

  const policy = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-authority-policy.ts",
  ]);
  assert.equal(policy.mode, "selected");
  assert.deepEqual(policy.tests, [
    "tests/ty-context/long-task-authority-field-completeness.test.mjs",
    "tests/ty-context/long-task-semantic-authority-revision.test.mjs",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
  ]);
});

test("shared non-UI semantic Fact runtime changes widen to the complete Long-Task suite", () => {
  for (const file of [
    "packages/ty-context/src/lib/semantic-fact-policy.ts",
    "packages/ty-context/src/lib/semantic-fact-policy-authority.ts",
    "packages/ty-context/src/lib/long-task-semantic-fact-evidence.ts",
    "packages/ty-context/src/lib/long-task-semantic-fact-contract-proofs.ts",
    "tools/semantic_fact_delivery_catalog.mjs",
    "tools/semantic_fact_delivery_evidence.mjs",
    "tools/semantic_fact_delivery_observations.mjs",
    "tools/semantic_fact_delivery_verifier_support.mjs",
    "tools/verify_semantic_fact_completeness_delivery.mjs",
  ]) {
    const selection = selectAffectedTests([file]);
    assert.equal(selection.mode, "long-task-suite", file);
    assert.equal(selection.requires_build, true, file);
    assert.deepEqual(selection.tests, [], file);
    assert.deepEqual(
      selection.reasons,
      [`${file}:shared_semantic_fact_runtime`],
      file,
    );
  }
});

test("Long-Task command changes include the one-time model-choice regression", () => {
  const selection = selectAffectedTests([
    "packages/ty-context/src/commands/long-task.ts",
  ]);
  assert.equal(selection.mode, "selected");
  assert.equal(selection.requires_build, true);
  assert.deepEqual(selection.tests, [
    "tests/ty-context/long-task-active-authority-continuity.test.mjs",
    "tests/ty-context/long-task-authority-revision-classification.test.mjs",
    "tests/ty-context/long-task-authority-revision-diagnosis.test.mjs",
    "tests/ty-context/long-task-context-evolution.test.mjs",
    "tests/ty-context/long-task-model-choice-checkpoint.test.mjs",
    "tests/ty-context/long-task-semantic-drift-closure.test.mjs",
    "tests/ty-context/long-task-semantic-drift-lifecycle.test.mjs",
    "tests/ty-context/long-task-verification-preview.test.mjs",
    "tests/ty-context/long-task-workflow-black-box.test.mjs",
  ]);
});

test("Authority Revision classifier changes select diagnosis and semantic coverage", () => {
  const selection = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-authority-revision-summary.ts",
  ]);
  assert.equal(selection.mode, "selected");
  assert.equal(selection.requires_build, true);
  assert.deepEqual(selection.tests, [
    "tests/ty-context/long-task-authority-revision-classification.test.mjs",
    "tests/ty-context/long-task-authority-revision-diagnosis.test.mjs",
    "tests/ty-context/long-task-authority-revision-replay.test.mjs",
    "tests/ty-context/long-task-semantic-authority-revision.test.mjs",
    "tests/ty-context/long-task-semantic-drift-closure.test.mjs",
    "tests/ty-context/long-task-semantic-drift-lifecycle.test.mjs",
  ]);
});

test("Authority monotonic-comparison changes retain the adopted-revision replay", () => {
  const selection = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-authority.ts",
  ]);
  assert.equal(selection.mode, "selected");
  assert.deepEqual(selection.tests, [
    "tests/ty-context/long-task-authority-progress-retry.test.mjs",
    "tests/ty-context/long-task-authority-revision-classification.test.mjs",
    "tests/ty-context/long-task-authority-revision-replay.test.mjs",
    "tests/ty-context/long-task-semantic-authority-revision.test.mjs",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
  ]);
});

test("split Authority Revision command modules retain focused routing coverage", () => {
  const revision = selectAffectedTests([
    "packages/ty-context/src/commands/long-task-revision.ts",
  ]);
  assert.deepEqual(revision.tests, [
    "tests/ty-context/long-task-active-authority-continuity.test.mjs",
    "tests/ty-context/long-task-authority-revision-classification.test.mjs",
    "tests/ty-context/long-task-authority-revision-diagnosis.test.mjs",
    "tests/ty-context/long-task-context-evolution.test.mjs",
    "tests/ty-context/long-task-model-choice-checkpoint.test.mjs",
    "tests/ty-context/long-task-workflow-black-box.test.mjs",
  ]);

  const args = selectAffectedTests([
    "packages/ty-context/src/commands/long-task-command-args.ts",
  ]);
  assert.deepEqual(args.tests, [
    "tests/ty-context/long-task-authority-revision-diagnosis.test.mjs",
    "tests/ty-context/long-task-verification-preview.test.mjs",
    "tests/ty-context/long-task-workflow-black-box.test.mjs",
  ]);
});

test("Context authority topology changes use focused selection and freshness coverage", () => {
  const selection = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-context-authority-topology.ts",
  ]);
  assert.equal(selection.mode, "selected");
  assert.deepEqual(selection.tests, [
    "tests/ty-context/long-task-context-authority-topology.test.mjs",
    "tests/ty-context/long-task-context-evolution.test.mjs",
    "tests/ty-context/long-task-semantic-authority-revision.test.mjs",
  ]);
});

test("Preflight repair-diagnostic changes stay on focused Authoring coverage", () => {
  for (const file of [
    "packages/ty-context/src/lib/long-task-authoring-preflight-repair-order.ts",
    "packages/ty-context/src/lib/long-task-authoring-preflight-types.ts",
  ]) {
    const selection = selectAffectedTests([file]);
    assert.equal(selection.mode, "selected", file);
    assert.deepEqual(
      selection.tests,
      ["tests/ty-context/long-task-authoring-preflight.test.mjs"],
      file,
    );
  }
  for (const file of [
    "packages/ty-context/src/lib/long-task-authoring-preflight.ts",
    "packages/ty-context/src/lib/long-task-authoring-preflight-diagnostics.ts",
  ])
    assert.deepEqual(selectAffectedTests([file]).tests, [
      "tests/ty-context/long-task-authoring-preflight.test.mjs",
      "tests/ty-context/long-task-workspace-scope.test.mjs",
    ]);
});

test("workspace-scope and execution-preview owners select their focused regressions", () => {
  for (const file of [
    "packages/ty-context/src/lib/long-task-workspace.ts",
    "packages/ty-context/src/lib/long-task-workspace-scope.ts",
  ])
    assert.deepEqual(selectAffectedTests([file]).tests, [
      "tests/ty-context/long-task-workspace-scope.test.mjs",
    ]);
  assert.deepEqual(
    selectAffectedTests([
      "packages/ty-context/src/lib/long-task-verification-preview.ts",
    ]).tests,
    ["tests/ty-context/long-task-verification-preview.test.mjs"],
  );
});

test("shared long-task runtime types use focused authority and recovery coverage", () => {
  const selection = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-runtime-types.ts",
  ]);
  assert.equal(selection.mode, "selected");
  assert.deepEqual(selection.tests, [
    "tests/ty-context/long-task-context-evolution.test.mjs",
    "tests/ty-context/long-task-delivery-compiler.test.mjs",
    "tests/ty-context/long-task-semantic-authority-revision.test.mjs",
    "tests/ty-context/long-task-semantic-drift-closure.test.mjs",
    "tests/ty-context/long-task-semantic-drift-lifecycle.test.mjs",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
    "tests/ty-context/long-task-state-resume.test.mjs",
  ]);
});

test("unmapped long-task runtime changes fail safe to the Trust Boundary Gate", () => {
  const selection = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-unmapped-runtime.ts",
  ]);
  assert.equal(selection.mode, "trust-boundary");
  assert.equal(selection.tier, "trust-boundary");
  assert.match(selection.purpose, /false-completion/u);
  assert.deepEqual(selection.tests, []);
  assert.equal(selection.requires_build, true);
});

test("Trust widening retains affected tests that the canonical gate does not contain", () => {
  const selection = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-unmapped-runtime.ts",
    "tests/ty-context/long-task-delivery-parser.test.mjs",
    "tests/ty-context/long-task-workflow-black-box.test.mjs",
  ]);
  assert.equal(selection.mode, "trust-boundary");
  assert.deepEqual(selection.tests, [
    "tests/ty-context/long-task-delivery-parser.test.mjs",
  ]);
});

test("shared package runtime and dependency changes fail safe to the full suite", () => {
  for (const file of [
    "packages/ty-context/src/lib/shared-runtime.ts",
    "package-lock.json",
    "unknown.bin",
  ]) {
    const selection = selectAffectedTests([file]);
    assert.equal(selection.mode, "full-suite", file);
    assert.deepEqual(selection.tests, [], file);
  }
});

test("explicit work-product paths remain fail-safe selection inputs", () => {
  const selection = selectAffectedTests([
    ".work_products/skill-validator-python/yaml.py",
  ]);
  assert.equal(selection.mode, "full-suite");
  assert.match(selection.reasons[0], /unclassified_fail_safe/u);
});

test("guidance-only changes select static consistency checks", () => {
  const selection = selectAffectedTests([
    ".codex/skills/long-task-workflow/SKILL.md",
    "PROJECT_SPEC.md",
  ]);
  assert.equal(selection.mode, "selected");
  assert.equal(selection.requires_build, true);
  assert.deepEqual(selection.tests, [
    "tests/ty-context/design-resource-authoring-skill.test.mjs",
    "tests/ty-context/design-system-authoring-skill.test.mjs",
    "tests/ty-context/long-task-design-context.test.mjs",
    "tests/ty-context/long-task-efficiency-design.test.mjs",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
    "tests/ty-context/package-source.test.mjs",
    "tests/ty-context/source-plan-authoring-skill.test.mjs",
    "tests/ty-context/visual-delivery-guidance.test.mjs",
    "tests/ty-context/workflow-contract-routing.test.mjs",
  ]);
});

test("design authoring profile and provider changes select focused coverage", () => {
  const profile = selectAffectedTests([
    "packages/ty-context/src/lib/profiles.ts",
  ]);
  assert.equal(profile.mode, "selected");
  assert.equal(profile.requires_build, true);
  assert.deepEqual(profile.tests, [
    "tests/ty-context/design-resource-authoring-skill.test.mjs",
    "tests/ty-context/design-system-authoring-skill.test.mjs",
    "tests/ty-context/long-task-profile-hook.test.mjs",
    "tests/ty-context/sync-init-doctor.test.mjs",
  ]);

  const provider = selectAffectedTests(["tools/open_design_live_smoke.mjs"]);
  assert.equal(provider.mode, "selected");
  assert.equal(provider.requires_build, false);
  assert.deepEqual(provider.tests, [
    "tests/ty-context/design-resource-authoring-provider.test.mjs",
    "tests/ty-context/design-system-authoring-skill.test.mjs",
  ]);

  const systemSkill = selectAffectedTests([
    ".codex/ty-context-managed/skills/design-system-authoring/SKILL.md",
  ]);
  assert.ok(
    systemSkill.tests.includes(
      "tests/ty-context/design-system-authoring-skill.test.mjs",
    ),
  );
  assert.ok(
    systemSkill.tests.includes(
      "tests/ty-context/design-resource-authoring-provider.test.mjs",
    ),
  );

  const skill = selectAffectedTests([
    ".codex/ty-context-managed/skills/design-resource-authoring/SKILL.md",
  ]);
  assert.ok(
    skill.tests.includes(
      "tests/ty-context/design-resource-authoring-provider.test.mjs",
    ),
  );
  assert.ok(
    skill.tests.includes(
      "tests/ty-context/design-resource-authoring-skill.test.mjs",
    ),
  );

  const adapter = selectAffectedTests([
    "packages/ty-context/src/lib/design-resource-handoff-validation-coverage.ts",
    "packages/ty-context/src/lib/long-task-design-resource-handoff.ts",
  ]);
  assert.equal(adapter.mode, "selected");
  assert.equal(adapter.requires_build, true);
  assert.deepEqual(adapter.tests, [
    "tests/ty-context/design-resource-handoff.test.mjs",
    "tests/ty-context/long-task-delivery-compiler.test.mjs",
  ]);

  const splitManifest = selectAffectedTests([
    "packages/ty-context/src/lib/design-resource-fact-universe-inspector.ts",
    "packages/ty-context/src/lib/design-resource-handoff-validation-fact-cells.ts",
    "packages/ty-context/src/lib/long-task-design-target-capabilities.ts",
  ]);
  assert.equal(splitManifest.mode, "selected");
  assert.deepEqual(splitManifest.tests, adapter.tests);

  const splitPlaywright = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-playwright-case-primitives.ts",
  ]);
  assert.equal(splitPlaywright.mode, "selected");
  assert.deepEqual(splitPlaywright.tests, [
    "tests/ty-context/long-task-playwright-ac-evidence.test.mjs",
    "tests/ty-context/long-task-semantic-drift-closure.test.mjs",
  ]);

  const modularity = selectAffectedTests([
    "packages/ty-context/src/lib/modularity.ts",
  ]);
  assert.equal(modularity.mode, "selected");
  assert.deepEqual(modularity.tests, [
    "tests/ty-context/check-modularity.test.mjs",
    "tests/ty-context/validators.test.mjs",
  ]);

  const activation = selectAffectedTests([
    "packages/ty-context/src/lib/long-task-activation-validation.ts",
  ]);
  assert.equal(activation.mode, "selected");
  assert.deepEqual(activation.tests, [
    "tests/ty-context/design-resource-handoff.test.mjs",
    "tests/ty-context/long-task-authoring-preflight.test.mjs",
    "tests/ty-context/long-task-delivery-compiler.test.mjs",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
    "tests/ty-context/long-task-workspace-scope.test.mjs",
  ]);
});

test("explicit scopes are deterministic and no-change auto mode stays useful", () => {
  const trust = selectAffectedTests([], { scope: "trust" });
  assert.equal(trust.mode, "trust-boundary");
  assert.equal(trust.tier, "trust-boundary");
  assert.deepEqual(trust.tests, []);
  assert.ok(LONG_TASK_TRUST_TESTS.length >= 8);
  assert.deepEqual(
    selectAffectedTests([], { scope: "long-task" }).tests,
    LONG_TASK_FOCUSED_TESTS,
  );
  assert.deepEqual(
    selectAffectedTests([], { scope: "delivery-contract" }).tests,
    DELIVERY_CONTRACT_FOCUSED_TESTS,
  );
  assert.deepEqual(selectAffectedTests([]).tests, LONG_TASK_FOCUSED_TESTS);
  assert.equal(selectAffectedTests([], { scope: "all" }).mode, "full-suite");
});

test("affected tooling changes select discovery, selection, and entry-point coverage", () => {
  for (const file of [
    "tools/affected_change_discovery.mjs",
    "tools/affected_test_selection.mjs",
    "tools/run_affected_tests.mjs",
    "tools/test_suite_policy.mjs",
  ]) {
    const selection = selectAffectedTests([file]);
    assert.equal(selection.mode, "selected", file);
    assert.deepEqual(
      selection.tests,
      [
        "tests/ty-context/affected-change-discovery.test.mjs",
        "tests/ty-context/affected-test-selection.test.mjs",
        "tests/ty-context/workflow-test-entrypoints.test.mjs",
      ],
      file,
    );
  }
});

test("pull-request template changes select workflow policy coverage", () => {
  const selection = selectAffectedTests([".github/PULL_REQUEST_TEMPLATE.md"]);
  assert.equal(selection.mode, "selected");
  assert.deepEqual(selection.tests, [
    "tests/ty-context/workflow-test-entrypoints.test.mjs",
  ]);
});

test("direct test edits run that test while shared fixture edits widen safely", () => {
  const direct = selectAffectedTests([
    "tests/ty-context/long-task-context-evolution.test.mjs",
  ]);
  assert.equal(direct.mode, "selected");
  assert.deepEqual(direct.tests, [
    "tests/ty-context/long-task-context-evolution.test.mjs",
  ]);

  for (const file of [
    "tests/ty-context/long-task-delivery-fixtures.mjs",
    "tests/ty-context/long-task-semantic-sync-fixture.mjs",
    "tests/ty-context/long-task-delegating-oracle-fixture.mjs",
  ]) {
    const fixture = selectAffectedTests([file]);
    assert.equal(fixture.mode, "long-task-suite", file);
    assert.deepEqual(fixture.tests, [], file);
    assert.deepEqual(fixture.reasons, [`${file}:shared_test_support`], file);
  }
});

test("package scripts expose affected and focused developer loops", async () => {
  const repository = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const packageJson = JSON.parse(
    await readFile(path.join(repository, "package.json"), "utf8"),
  );
  assert.equal(
    packageJson.scripts["test:affected"],
    "node tools/run_affected_tests.mjs",
  );
  assert.equal(
    packageJson.scripts["test:affected:list"],
    "node tools/run_affected_tests.mjs --list",
  );
  assert.equal(
    packageJson.scripts["test:long-task:trust"],
    "node tools/run_affected_tests.mjs --scope trust",
  );
  assert.equal(
    packageJson.scripts["test:long-task:focused"],
    "node tools/run_affected_tests.mjs --scope long-task",
  );
  assert.equal(
    packageJson.scripts["test:delivery-contract:focused"],
    "node tools/run_affected_tests.mjs --scope delivery-contract",
  );
  assert.equal(
    packageJson.scripts["smoke:open-design"],
    "node tools/open_design_live_smoke.mjs",
  );
});

test("suite timing paths are rooted at the repository, not the npm workspace cwd", () => {
  const repositoryRoot = path.resolve("timing-repository-fixture");
  assert.equal(
    resolveTestTimingOutput(repositoryRoot, "long-task-trust", {
      TY_CONTEXT_TEST_TIMING_DIR: ".artifacts/test-timing/pr",
    }),
    path.resolve(
      repositoryRoot,
      ".artifacts/test-timing/pr/long-task-trust.json",
    ),
  );

  const absoluteFile = path.resolve(repositoryRoot, "timing.json");
  assert.equal(
    resolveTestTimingOutput(repositoryRoot, "default", {
      TY_CONTEXT_TEST_TIMING_FILE: absoluteFile,
    }),
    absoluteFile,
  );
  assert.equal(resolveTestTimingOutput(repositoryRoot, "default", {}), null);
});

test("reviewed tier and hotspot budgets fail closed without limiting complete discovery", () => {
  assert.equal(
    LONG_TASK_TRUST_TESTS.length,
    TEST_TIER_REVIEW_BUDGETS.long_task_trust.max_files,
  );
  assert.equal(
    LONG_TASK_FOCUSED_TESTS.length,
    TEST_TIER_REVIEW_BUDGETS.long_task_focused.max_files,
  );
  assert.equal(
    DELIVERY_CONTRACT_FOCUSED_TESTS.length,
    TEST_TIER_REVIEW_BUDGETS.delivery_contract_focused.max_files,
  );
  for (const budget of Object.values(TEST_TIER_REVIEW_BUDGETS)) {
    assert.match(budget.reviewed_on, /^\d{4}-\d{2}-\d{2}$/u);
    assert.ok(budget.rationale.length > 40);
  }

  assert.throws(
    () =>
      assertReviewedTestList("synthetic tier", ["a.test.mjs", "b.test.mjs"], {
        max_files: 1,
      }),
    /above its reviewed maximum[\s\S]*do not delete coverage/iu,
  );
  assert.throws(
    () =>
      assertReviewedTestList("synthetic tier", ["a.test.mjs", "a.test.mjs"], {
        max_files: 2,
      }),
    /duplicate/iu,
  );
  assert.throws(
    () =>
      assertHotspotTestFanoutBudget([
        [
          "synthetic/source.ts",
          Array.from(
            {
              length:
                TEST_TIER_REVIEW_BUDGETS.hotspot_fanout.max_tests_per_path + 1,
            },
            (_, index) => `test-${index}.test.mjs`,
          ),
        ],
      ]),
    /hotspot[\s\S]*above its reviewed maximum/iu,
  );
});

test("[critical:controlled-budget-profile] suite wall-time budgets are named, environment-bound, and fail closed", () => {
  const environment = {
    TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE: "github-ubuntu-v1",
    GITHUB_ACTIONS: "true",
    RUNNER_OS: "Linux",
  };
  assert.equal(
    CONTROLLED_TEST_SUITE_BUDGET_PROFILES["github-ubuntu-v1"].reviewed_on,
    "2026-07-23",
  );
  assert.equal(resolveSuiteWallTimeBudgetMs("default", environment), 120000);
  assert.equal(
    resolveSuiteWallTimeBudgetMs("long-task-trust", environment),
    240000,
  );
  assert.equal(resolveSuiteWallTimeBudgetMs("long-task", environment), 600000);
  assert.equal(resolveSuiteWallTimeBudgetMs("default", {}), null);
  assert.equal(suiteWallTimeBudgetStatus(120000, 120000), "within_budget");
  assert.equal(suiteWallTimeBudgetStatus(120001, 120000), "exceeded");
  assert.equal(suiteWallTimeBudgetStatus(1, null), "not_configured");
  assert.throws(
    () =>
      resolveSuiteWallTimeBudgetMs("default", {
        ...environment,
        TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE: "unknown-profile",
      }),
    /Unknown TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE/u,
  );
  assert.throws(
    () =>
      resolveSuiteWallTimeBudgetMs("default", {
        ...environment,
        RUNNER_OS: "Windows",
      }),
    /requires RUNNER_OS=Linux/u,
  );
  assert.throws(
    () =>
      resolveSuiteWallTimeBudgetMs("default", {
        ...environment,
        TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON:
          '{"default":120000,"long-task-trust":240000,"long-task":600000}',
      }),
    /TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON is retired/u,
  );
});
