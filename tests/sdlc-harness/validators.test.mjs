import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runValidator } from "../../packages/sdlc-harness/dist/lib/validators.js";

const root = await mkdtemp(path.join(tmpdir(), "sdlc-harness-validators-"));

try {
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  await mkdir(path.join(root, ".docs/01_product"), { recursive: true });
  await mkdir(path.join(root, ".docs/02_architecture"), { recursive: true });
  await mkdir(path.join(root, ".docs/03_tech_plan"), { recursive: true });
  await mkdir(path.join(root, ".docs/04_implementation/example"), { recursive: true });
  await mkdir(path.join(root, ".docs/06_review"), { recursive: true });
  await mkdir(path.join(root, ".docs/07_test"), { recursive: true });
  await mkdir(path.join(root, ".docs/08_release"), { recursive: true });
  await mkdir(path.join(root, ".docs/rfc"), { recursive: true });
  await mkdir(path.join(root, ".harness/state"), { recursive: true });
  await mkdir(path.join(root, ".harness/skills"), { recursive: true });
  await mkdir(path.join(root, ".harness/pjsdlc_managed/templates"), { recursive: true });
  await mkdir(path.join(root, ".harness/pjsdlc_managed/policies"), { recursive: true });
  await writeFile(path.join(root, "AGENTS.md"), "# Agents\n", "utf8");
  await writeFile(path.join(root, ".docs/INDEX.md"), "# Index\n.docs/04_implementation/example/dev.md\n", "utf8");
  await writeFile(path.join(root, ".harness/config.yaml"), "core:\n  package: x\n", "utf8");
  await writeFile(
    path.join(root, ".docs/01_product/prd.md"),
    "# PRD\n\n## Acceptance Criteria\n\n## Out of Scope\n\n## Open Questions\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/02_architecture/arch.md"),
    "# Architecture\n\nPRD requirement interface task\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/02_architecture/overview.md"),
    "# Generated Architecture Overview\n\nGenerated overview should not count as a deliverable.\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/03_tech_plan/plan.md"),
    "# Plan\n\nAPI contract task breakdown\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/03_tech_plan/overview.md"),
    "# Generated Technical Plan Overview\n\nGenerated overview should not count as a deliverable.\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\n- Entry points: shipped CLI fixture.\n- Exit / side effects: validation output only.\n- Config contract: not applicable.\n- Fixture/live boundary: fixture-only.\n\n## Development Evidence\n\n- Runnable Entry: CLI command `npx sdlc-harness validate-dev` runs the package validator fixture.\n- Observable Exit: Command output reports validate-dev PASS with no errors.\n- Client / Server Initialization: Local CLI runtime starts from the recorded command and exits with status evidence.\n- Config Contract: no external config required for this fixture.\n- Basic Self-test Evidence: `npm test --workspace agent-project-sdlc` PASS for the fixture regression.\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/06_review/REVIEW_REPORT.md"),
    "# Review Report\n\n## Findings\n\nNo blocking finding.\n\n## Test Gap\n\nCoverage is intentionally narrow.\n\n## Runnable Entry/Exit Readiness\n\n- Runnable Entry: PASS\n- Observable Exit: PASS\n- Initialization: PASS\n- Config Contract: PASS\n- Testing Handoff Readiness: PASS\n- Notes: Existing entry/exit is runnable before testing.\n\n## Decision\n\nPASS\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/07_test/TEST_REPORT.md"),
    "# Test Report\n\n## Matrix\n\n| Scenario | Result |\n|---|---|\n| Normal | PASS |\n\n## Regression Evidence\n\n- focused regression: PASS\n\n## Runnable Entry/Exit Coverage\n\nExisting entry/exit is exercised through the shipped CLI.\n\n## Coverage Gap\n\nNo browser coverage.\n\n## Decision\n\nPASS\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/08_release/CURRENT_RELEASE.md"),
    "# Current Release Status\n\n## Release Notes\n\nInitial test release.\n\n## Smoke Evidence\n\n- smoke test: PASS\n\n## Rollback Plan\n\nRevert the release commit.\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/rfc/RFC_001.md"),
    "# RFC 001\n\nStatus: VERIFIED\n\n## Background\n\nTest RFC.\n\n## Product Impact\n\nNo user-facing change.\n\n## Technical Impact\n\nNo implementation change.\n\n## Regression\n\nKeep validator coverage.\n\n## Test Fact Source Impact\n\nSuperseded test docs: none\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".harness/state/lifecycle.yaml"),
    'current_phase: "REQUIREMENT_GATHERING"\n',
    "utf8"
  );
  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: ""
next_task_sequence: 2
tasks: []
`,
    "utf8"
  );
  await writeFile(
    path.join(root, ".harness/state/plan.draft.yaml"),
    `next_task_sequence: 2
tasks:
  - id: TASK-001
    phase: SPRINTING
    title: Implement baseline fixture
    status: pending
    summary: Build the baseline package validator fixture.
    docs:
      product:
        - .docs/01_product/prd.md
      architecture:
        - .docs/02_architecture/arch.md
      tech_plan:
        - .docs/03_tech_plan/plan.md
    allowed_paths:
      - src/**
      - tests/**
      - .docs/04_implementation/example/dev.md
    required_gates:
      - npm test
    acceptance_criteria:
      - Fixture task has a concrete tech plan slice.
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );

  for (const gate of [
    "validate-harness",
    "validate-plan",
    "validate-pm",
    "validate-design",
    "validate-review",
    "validate-test",
    "validate-release",
    "validate-rfc"
  ]) {
    const report = await runValidator(root, gate);
    assert.deepEqual(report.errors, [], gate);
  }
  await writeFile(path.join(root, ".docs/07_test/TEST_PLAN.md"), "# Legacy Test Plan\n\nMissing canonical sections.\n", "utf8");
  const ignoredTestPlan = await runValidator(root, "validate-test");
  assert.deepEqual(ignoredTestPlan.errors, [], "validate-test ignores TEST_PLAN.md when TEST_REPORT.md exists");
  assert.match(ignoredTestPlan.info.join("\n"), /TEST_REPORT\.md/);

  await rm(path.join(root, ".docs/07_test/TEST_REPORT.md"), { force: true });
  const onlyLegacyPlan = await runValidator(root, "validate-test");
  assert.match(onlyLegacyPlan.errors.join("\n"), /Missing test report/);
  await rm(path.join(root, ".docs/07_test/TEST_PLAN.md"), { force: true });
  await writeFile(path.join(root, ".docs/07_test/TEST_CASES.md"), "# Test Cases\n\n## Cases\n\nNo executed evidence.\n", "utf8");
  const onlyTestCases = await runValidator(root, "validate-test");
  assert.match(onlyTestCases.errors.join("\n"), /Missing test report/);
  await writeFile(
    path.join(root, ".docs/07_test/TEST_REPORT.md"),
    "# Test Report\n\n## Matrix\n\n| Scenario | Result |\n|---|---|\n| Normal | pending |\n\n## Regression Evidence\n\n- TBD\n\n## Runnable Entry/Exit Coverage\n\nExisting entry/exit is exercised.\n\n## Coverage Gap\n\nTBD\n\n## Decision\n\nBLOCKED\n",
    "utf8"
  );
  const placeholderReport = await runValidator(root, "validate-test");
  assert.match(placeholderReport.errors.join("\n"), /executed evidence/);
  await writeFile(
    path.join(root, ".docs/07_test/TEST_REPORT.md"),
    "# Test Report\n\n## Matrix\n\n| Scenario | Result |\n|---|---|\n| Runtime handoff | PASS |\n\n## Regression Evidence\n\n- focused regression: PASS\n\n## Runnable Entry/Exit Coverage\n\nNo runnable entry exists and missing Development Evidence remains.\n\n## Coverage Gap\n\nRuntime entry is missing.\n\n## Decision\n\nPASS\n",
    "utf8"
  );
  const missingReadinessPassReport = await runValidator(root, "validate-test");
  assert.match(missingReadinessPassReport.errors.join("\n"), /cannot PASS/);
  await writeFile(
    path.join(root, ".docs/07_test/TEST_REPORT.md"),
    "# Test Report\n\n## Matrix\n\n| Scenario | Result |\n|---|---|\n| Normal | PASS |\n\n## Regression Evidence\n\n- focused regression: PASS\n\n## Runnable Entry/Exit Coverage\n\nExisting entry/exit is exercised through the shipped CLI.\n\n## Coverage Gap\n\nNo browser coverage.\n\n## Decision\n\nPASS\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/rfc/RFC_002.md"),
    "# RFC 002\n\nStatus: APPLIED\n\n## Background\n\nRoute change.\n\n## Product Impact\n\nTest facts must be cleaned.\n\n## Technical Impact\n\nNo implementation change.\n\n## Regression\n\nKeep current TEST_REPORT evidence.\n\n## Test Fact Source Impact\n\nSuperseded test docs: .docs/07_test/OLD_ROUTE.md\n",
    "utf8"
  );
  await writeFile(path.join(root, ".docs/07_test/OLD_ROUTE.md"), "# Old route result\n", "utf8");
  const staleRfcDoc = await runValidator(root, "validate-rfc");
  assert.match(staleRfcDoc.errors.join("\n"), /Superseded test doc still exists/);
  await rm(path.join(root, ".docs/07_test/OLD_ROUTE.md"), { force: true });
  await writeFile(path.join(root, ".docs/INDEX.md"), "# Index\n\n- Old: .docs/07_test/OLD_ROUTE.md\n", "utf8");
  const staleRfcIndex = await runValidator(root, "validate-rfc");
  assert.match(staleRfcIndex.errors.join("\n"), /Superseded test doc still linked/);
  await writeFile(path.join(root, ".docs/INDEX.md"), "# Index\n.docs/04_implementation/example/dev.md\n", "utf8");
  const cleanedRfc = await runValidator(root, "validate-rfc");
  assert.deepEqual(cleanedRfc.errors, [], "validate-rfc allows superseded test refs only after facts and index are cleaned");

  const currentReleasePath = path.join(root, ".docs/08_release/CURRENT_RELEASE.md");
  const legacyReleasePath = path.join(root, ".docs/08_release/v0.1.0.md");
  await writeFile(
    legacyReleasePath,
    "# Legacy Release v0.1.0\n\n## Release Notes\n\nLegacy release.\n\n## Smoke Evidence\n\n- smoke test: PASS\n\n## Rollback Plan\n\nRevert the release commit.\n",
    "utf8"
  );
  await rm(currentReleasePath, { force: true });
  const legacyReleaseReport = await runValidator(root, "validate-release");
  assert.deepEqual(legacyReleaseReport.errors, [], "validate-release accepts legacy versioned release docs");
  assert.match(legacyReleaseReport.info.join("\n"), /legacy \.docs\/08_release/);
  await writeFile(currentReleasePath, "# Current Release Status\n\n## Release Notes\n\nOnly change notes are present.\n", "utf8");
  const preferredCurrentRelease = await runValidator(root, "validate-release");
  assert.match(preferredCurrentRelease.errors.join("\n"), /smoke test evidence/);
  assert.match(preferredCurrentRelease.errors.join("\n"), /rollback plan/);
  assert.match(preferredCurrentRelease.info.join("\n"), /CURRENT_RELEASE\.md/);
  await writeFile(
    currentReleasePath,
    "# Current Release Status\n\n## Release Notes\n\nInitial test release.\n\n## Smoke Evidence\n\n- smoke test: PASS\n\n## Rollback Plan\n\nRevert the release commit.\n",
    "utf8"
  );

  await writeFile(
    path.join(root, ".docs/06_review/REVIEW_REPORT.md"),
    "# Review Report\n\n## Findings\n\nNo blocking finding.\n\n## Test Gap\n\nCoverage is intentionally narrow.\n\n## Decision\n\nPASS\n",
    "utf8"
  );
  const missingEntryReview = await runValidator(root, "validate-review");
  assert.match(missingEntryReview.errors.join("\n"), /entry\/exit readiness/);
  await writeFile(
    path.join(root, ".docs/06_review/REVIEW_REPORT.md"),
    "# Review Report\n\n## Findings\n\nRuntime handoff is incomplete.\n\n## Test Gap\n\nCoverage is blocked by missing runtime readiness.\n\n## Runnable Entry/Exit Readiness\n\n- Runnable Entry: PASS\n- Observable Exit: PASS\n- Initialization: BLOCKED\n- Config Contract: PASS\n- Testing Handoff Readiness: PASS\n- Notes: server startup evidence is missing.\n\n## Decision\n\nBLOCKED\n",
    "utf8"
  );
  const blockedReadinessReview = await runValidator(root, "validate-review");
  assert.match(blockedReadinessReview.errors.join("\n"), /Review readiness is BLOCKED: Initialization/);
  await writeFile(
    path.join(root, ".docs/06_review/REVIEW_REPORT.md"),
    "# Review Report\n\n## Findings\n\nNo blocking finding.\n\n## Test Gap\n\nCoverage is intentionally narrow.\n\n## Runnable Entry/Exit Readiness\n\n- Runnable Entry: PASS\n- Observable Exit: PASS\n- Initialization: PASS\n- Config Contract: PASS\n- Testing Handoff Readiness: PASS\n- Notes: Existing entry/exit is runnable before testing.\n\n## Decision\n\nPASS\n",
    "utf8"
  );

  const boundaryRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-testing-boundary-"));
  try {
    await writeTestingBoundaryFixture(boundaryRoot);
    await writeFile(
      path.join(boundaryRoot, ".harness/state/plan.yaml"),
      `current_task_id: TASK-001
next_task_sequence: 2
tasks:
  - id: TASK-001
    phase: TESTING
    title: Invalid testing runtime task
    status: in_progress
    summary: Invalid testing task that tries to change runtime scripts.
    docs:
      review:
        - .docs/06_review/REVIEW_REPORT.md
    allowed_paths:
      - ".docs/07_test/**"
      - "tests/**"
      - "package.json"
    required_gates:
      - "npx sdlc-harness validate-test"
    acceptance_criteria:
      - "Runtime script changes are rejected in TESTING."
    result_docs:
      - .docs/07_test/TEST_REPORT.md
`,
      "utf8"
    );
    const invalidTestingTask = await runValidator(boundaryRoot, "validate-plan");
    assert.match(invalidTestingTask.errors.join("\n"), /TESTING task allowed_paths/);

    await writeFile(
      path.join(boundaryRoot, ".harness/state/plan.yaml"),
      `current_task_id: TASK-002
next_task_sequence: 3
tasks:
  - id: TASK-002
    phase: SPRINTING
    title: Invalid premature test docs task
    status: in_progress
    summary: Invalid sprint task that tries to create current test facts before TESTING.
    docs:
      product:
        - .docs/01_product/prd.md
    allowed_paths:
      - "src/**"
      - ".docs/07_test/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "SPRINTING cannot create formal test facts."
    result_docs:
      - .docs/07_test/TEST_REPORT.md
`,
      "utf8"
    );
    const prematureTestFactsTask = await runValidator(boundaryRoot, "validate-plan");
    assert.match(prematureTestFactsTask.errors.join("\n"), /Only TESTING or RFC_RECALIBRATION tasks/);

    await writeFile(
      path.join(boundaryRoot, ".harness/state/plan.yaml"),
      `current_task_id: ""
next_task_sequence: 2
tasks: []
`,
      "utf8"
    );
    execFileSync("git", ["init"], { cwd: boundaryRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Codex"], { cwd: boundaryRoot });
    execFileSync("git", ["config", "user.email", "codex@example.local"], { cwd: boundaryRoot });
    execFileSync("git", ["add", "."], { cwd: boundaryRoot });
    execFileSync("git", ["commit", "-m", "baseline"], { cwd: boundaryRoot, stdio: "ignore" });
    await mkdir(path.join(boundaryRoot, "tests"), { recursive: true });
    await writeFile(path.join(boundaryRoot, "tests/provider-fixture.mjs"), "export {};\n", "utf8");
    const testOnlyFixture = await runValidator(boundaryRoot, "validate-test");
    assert.deepEqual(testOnlyFixture.errors, [], "TESTING allows provider-named test fixture files");
    await rm(path.join(boundaryRoot, "tests/provider-fixture.mjs"), { force: true });
    await writeFile(
      path.join(boundaryRoot, "package.json"),
      JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" }, scripts: { "dev:agent": "node tests/runtime/direct-poller.mjs" } }, null, 2),
      "utf8"
    );
    await mkdir(path.join(boundaryRoot, "tests/runtime"), { recursive: true });
    await writeFile(path.join(boundaryRoot, "tests/runtime/direct-poller.mjs"), "export {};\n", "utf8");
    const dirtyRuntime = await runValidator(boundaryRoot, "validate-test");
    assert.match(dirtyRuntime.errors.join("\n"), /package\.json/);
    assert.match(dirtyRuntime.errors.join("\n"), /tests\/runtime\/direct-poller\.mjs/);
  } finally {
    await rm(boundaryRoot, { recursive: true, force: true });
  }

  await writeFile(
    path.join(root, ".harness/state/lifecycle.yaml"),
    'current_phase: "SPRINTING"\n',
    "utf8"
  );
  const staleDraftDevReport = await runValidator(root, "validate-dev");
  assert.match(staleDraftDevReport.errors.join("\n"), /Unconsumed draft tasks remain in plan\.draft\.yaml: TASK-001/);
  await writeFile(
    path.join(root, ".harness/state/plan.draft.yaml"),
    `next_task_sequence: 2
tasks: []
`,
    "utf8"
  );
  const consumedDraftDevReport = await runValidator(root, "validate-dev");
  assert.deepEqual(consumedDraftDevReport.errors, [], "validate-dev allows consumed draft queue");
  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: TASK-002
next_task_sequence: 3
tasks:
  - id: TASK-002
    phase: SPRINTING
    title: Open task
    status: in_progress
    summary: Active task
    docs:
      product:
        - .docs/01_product/prd.md
    allowed_paths:
      - "src/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "development evidence is structured"
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  await writeFile(path.join(root, ".docs/04_implementation/example/dev.md"), "# Impl\n", "utf8");
  const missingRunnableEntryExitDevReport = await runValidator(root, "validate-dev");
  assert.match(missingRunnableEntryExitDevReport.errors.join("\n"), /Runnable Entry\/Exit/);
  await writeFile(
    path.join(root, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\nNot applicable: validator fixture implementation has no product runtime boundary.\n",
    "utf8"
  );
  const missingDevelopmentEvidenceDevReport = await runValidator(root, "validate-dev");
  assert.match(missingDevelopmentEvidenceDevReport.errors.join("\n"), /Development Evidence/);
  await writeFile(
    path.join(root, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\n- Entry points: shipped CLI fixture.\n- Exit / side effects: validation output only.\n- Config contract: not applicable.\n- Fixture/live boundary: fixture-only.\n\n## Development Evidence\n\n- Runnable Entry:\n- Observable Exit: PASS output.\n- Client / Server Initialization: Local CLI/test runtime starts from the recorded command and exits with status evidence.\n- Config Contract: no external config required for this fixture.\n- Basic Self-test Evidence: `npm test` PASS.\n",
    "utf8"
  );
  const placeholderDevelopmentEvidenceDevReport = await runValidator(root, "validate-dev");
  assert.match(placeholderDevelopmentEvidenceDevReport.errors.join("\n"), /Runnable Entry must contain concrete/);
  await writeFile(
    path.join(root, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\n- Entry points: shipped CLI fixture.\n- Exit / side effects: validation output only.\n- Config contract: not applicable.\n- Fixture/live boundary: fixture-only.\n\n## Development Evidence\n\n- Runnable Entry: CLI command `npx sdlc-harness validate-dev` runs the package validator fixture.\n- Basic Self-test Evidence: `npm test --workspace agent-project-sdlc` PASS for the fixture regression.\n",
    "utf8"
  );
  const missingObservableExitDevReport = await runValidator(root, "validate-dev");
  assert.match(missingObservableExitDevReport.errors.join("\n"), /Observable Exit must contain concrete/);
  await writeFile(
    path.join(root, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\n- Entry points: shipped CLI fixture.\n- Exit / side effects: validation output only.\n- Config contract: not applicable.\n- Fixture/live boundary: fixture-only.\n\n## Development Evidence\n\n- Runnable Entry: CLI command `npx sdlc-harness validate-dev` runs the package validator fixture.\n- Observable Exit: Command output reports validate-dev PASS with no errors.\n",
    "utf8"
  );
  const missingSelfTestEvidenceDevReport = await runValidator(root, "validate-dev");
  assert.match(missingSelfTestEvidenceDevReport.errors.join("\n"), /Basic Self-test Evidence must contain concrete/);
  await writeFile(
    path.join(root, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\n- Entry points: cloud agent service.\n- Exit / side effects: fake send adapter output only.\n- Config contract: DASH_SCOPE_API_KEY.\n- Fixture/live boundary: provider live smoke only.\n\n## Development Evidence\n\n- Runnable Entry: provider live smoke calls DashScope with a one-shot smoke message.\n- Observable Exit: fake adapter output reports PASS for provider smoke.\n- Client / Server Initialization: provider client initializes for the one-shot request.\n- Config Contract: env DASH_SCOPE_API_KEY is required.\n- Basic Self-test Evidence: provider live smoke PASS.\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: TASK-002
next_task_sequence: 3
tasks:
  - id: TASK-002
    phase: SPRINTING
    title: Open cloud agent runtime task
    status: in_progress
    summary: Active cloud agent runtime task with live mode
    docs:
      product:
        - .docs/01_product/prd.md
    allowed_paths:
      - "src/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "application readiness is proven beyond provider smoke"
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  const providerSmokeOnlyDevReport = await runValidator(root, "validate-dev");
  assert.match(providerSmokeOnlyDevReport.errors.join("\n"), /not enough for application readiness/);
  await writeFile(
    path.join(root, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\n- Entry points: cloud agent service.\n- Exit / side effects: HTTP response and queue item.\n- Config contract: DASH_SCOPE_API_KEY.\n- Fixture/live boundary: runtime HTTP smoke plus provider live smoke.\n\n## Development Evidence\n\n- Runnable Entry: HTTP endpoint `http://localhost:3000/events` receives a live-mode event.\n- Observable Exit: response output and queue log report PASS for runtime HTTP smoke and application readiness.\n- Basic Self-test Evidence: runtime HTTP smoke PASS.\n",
    "utf8"
  );
  const missingInitializationDevReport = await runValidator(root, "validate-dev");
  assert.match(missingInitializationDevReport.errors.join("\n"), /Client \/ Server Initialization/);
  await writeFile(
    path.join(root, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\n- Entry points: cloud agent service.\n- Exit / side effects: HTTP response and queue item.\n- Config contract: DASH_SCOPE_API_KEY.\n- Fixture/live boundary: runtime HTTP smoke plus provider live smoke.\n\n## Development Evidence\n\n- Runnable Entry: HTTP endpoint `http://localhost:3000/events` receives a live-mode event.\n- Observable Exit: response output and queue log report PASS for runtime HTTP smoke and application readiness.\n- Client / Server Initialization: server startup command `npm run agent:start` listens on localhost and health status returns PASS.\n- Basic Self-test Evidence: runtime HTTP smoke PASS.\n",
    "utf8"
  );
  const missingConfigContractDevReport = await runValidator(root, "validate-dev");
  assert.match(missingConfigContractDevReport.errors.join("\n"), /Config Contract/);
  await writeFile(
    path.join(root, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\nNot applicable: validator fixture implementation has no product runtime boundary.\n\n## Development Evidence\n\n- Not applicable: because this validator fixture has no product runtime boundary, no user-facing entry, and no observable side effect beyond static validation.\n",
    "utf8"
  );
  const notApplicableDevReport = await runValidator(root, "validate-dev");
  assert.deepEqual(notApplicableDevReport.errors, [], "validate-dev accepts explicit Not applicable entry/exit docs");
  await writeFile(
    path.join(root, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\n- Entry points: page module fixture.\n- Exit / side effects: rendered page state.\n- Config contract: fixture.\n- Fixture/live boundary: fixture-only.\n\n## Development Evidence\n\n- Runnable Entry: frontend page smoke opens the local UI fixture.\n- Observable Exit: PASS output reports rendered page state.\n- Client / Server Initialization: local page preview startup is recorded for this fixture.\n- Config Contract: fixture config only.\n- Basic Self-test Evidence: smoke PASS.\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: TASK-002
next_task_sequence: 3
tasks:
  - id: TASK-002
    phase: SPRINTING
    title: Open frontend page task
    status: in_progress
    summary: Active page task
    docs:
      product:
        - .docs/01_product/prd.md
    allowed_paths:
      - "src/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "page evidence is structured"
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  const pageMissingUrlDevReport = await runValidator(root, "validate-dev");
  assert.match(pageMissingUrlDevReport.errors.join("\n"), /dev server or page URL/);
  await writeFile(
    path.join(root, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\n- Entry points: page module fixture.\n- Exit / side effects: rendered page state.\n- Config contract: fixture.\n- Fixture/live boundary: fixture-only.\n\n## Development Evidence\n\n- Runnable Entry: dev server page URL `http://localhost:3000/dashboard` opens the local UI fixture.\n- Observable Exit: PASS output reports rendered page state.\n- Client / Server Initialization: dev server startup is represented by the recorded page URL.\n- Config Contract: fixture config only.\n- Basic Self-test Evidence: smoke PASS.\n",
    "utf8"
  );
  const pageMissingBrowserCheckDevReport = await runValidator(root, "validate-dev");
  assert.match(pageMissingBrowserCheckDevReport.errors.join("\n"), /browser check/);
  await writeFile(
    path.join(root, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\n- Entry points: shipped CLI fixture.\n- Exit / side effects: validation output only.\n- Config contract: not applicable.\n- Fixture/live boundary: fixture-only.\n\n## Development Evidence\n\n- Runnable Entry: CLI command `npx sdlc-harness validate-dev` runs the package validator fixture.\n- Observable Exit: Command output reports validate-dev PASS with no errors.\n- Client / Server Initialization: Local CLI runtime starts from the recorded command and exits with status evidence.\n- Config Contract: no external config required for this fixture.\n- Basic Self-test Evidence: `npm test --workspace agent-project-sdlc` PASS for the fixture regression.\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: ""
next_task_sequence: 3
tasks: []
`,
    "utf8"
  );

  await writeFile(
    path.join(root, ".harness/state/lifecycle.yaml"),
    'current_phase: "TESTING"\n',
    "utf8"
  );
  const testingCurrent = await runValidator(root, "validate-current");
  assert.deepEqual(testingCurrent.errors, [], "validate-current routes TESTING to validate-test");
  await writeFile(
    path.join(root, ".harness/state/lifecycle.yaml"),
    'current_phase: "REQUIREMENT_GATHERING"\n',
    "utf8"
  );

  await writeFile(
    path.join(root, ".harness/state/plan.draft.yaml"),
    `next_task_sequence: 2
tasks:
  - id: TASK-001
    phase: SPRINTING
    title: Missing tech plan ref
    status: pending
    summary: Negative design slicing fixture.
    docs:
      product:
        - .docs/01_product/prd.md
    allowed_paths:
      - src/**
    required_gates:
      - npm test
    acceptance_criteria:
      - Fixture fails design slicing.
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  let designReport = await runValidator(root, "validate-design");
  assert.match(designReport.errors.join("\n"), /must reference at least one tech plan slice/);

  await writeFile(
    path.join(root, ".harness/state/plan.draft.yaml"),
    `next_task_sequence: 3
tasks:
  - id: TASK-001
    phase: SPRINTING
    title: First shared plan task
    status: pending
    summary: Negative shared tech plan fixture.
    docs:
      product:
        - .docs/01_product/prd.md
      tech_plan:
        - .docs/03_tech_plan/plan.md
    allowed_paths:
      - src/one/**
    required_gates:
      - npm test
    acceptance_criteria:
      - First task is scoped.
    implementation_doc: .docs/04_implementation/example/dev.md
  - id: TASK-002
    phase: SPRINTING
    title: Second shared plan task
    status: pending
    summary: Negative shared tech plan fixture.
    docs:
      product:
        - .docs/01_product/prd.md
      tech_plan:
        - .docs/03_tech_plan/plan.md
    allowed_paths:
      - src/two/**
    required_gates:
      - npm test
    acceptance_criteria:
      - Second task is scoped.
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  designReport = await runValidator(root, "validate-design");
  assert.match(designReport.errors.join("\n"), /distinct primary tech plan slices/);

  await writeFile(
    path.join(root, ".docs/03_tech_plan/plan_two.md"),
    "# Plan Two\n\nAPI contract task breakdown for the second slice.\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".harness/state/plan.draft.yaml"),
    `next_task_sequence: 3
tasks:
  - id: TASK-001
    phase: SPRINTING
    title: First sliced plan task
    status: pending
    summary: Positive split tech plan fixture.
    docs:
      product:
        - .docs/01_product/prd.md
      tech_plan:
        - .docs/03_tech_plan/plan.md
    allowed_paths:
      - src/one/**
    required_gates:
      - npm test
    acceptance_criteria:
      - First task is scoped.
    implementation_doc: .docs/04_implementation/example/dev.md
  - id: TASK-002
    phase: SPRINTING
    title: Second sliced plan task
    status: pending
    summary: Positive split tech plan fixture.
    docs:
      product:
        - .docs/01_product/prd.md
      tech_plan:
        - .docs/03_tech_plan/plan_two.md
    allowed_paths:
      - src/two/**
    required_gates:
      - npm test
    acceptance_criteria:
      - Second task is scoped.
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  designReport = await runValidator(root, "validate-design");
  assert.deepEqual(designReport.errors, [], "validate-design allows distinct tech plan slices");

  await writeFile(
    path.join(root, ".docs/01_product/prd.md"),
    "# PRD\n\nThe product includes an AI provider, one external system, and compliance audit workflows.\n\n## Acceptance Criteria\n\n## Out of Scope\n\n## Open Questions\n",
    "utf8"
  );
  designReport = await runValidator(root, "validate-design");
  assert.match(designReport.errors.join("\n"), /dedicated AI copilot\/provider architecture slice/);
  assert.match(designReport.errors.join("\n"), /dedicated external system boundary architecture slice/);
  assert.match(designReport.errors.join("\n"), /dedicated compliance\/permission\/audit architecture slice/);

  await writeFile(
    path.join(root, ".docs/02_architecture/ai.md"),
    "# AI Provider Architecture\n\nThe AI provider boundary defines prompt handling and model access.\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/02_architecture/external.md"),
    "# External System Architecture\n\nThe external system boundary uses an adapter interface.\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/02_architecture/compliance.md"),
    "# Compliance Architecture\n\nCompliance audit and permission controls protect authorization flows.\n",
    "utf8"
  );
  designReport = await runValidator(root, "validate-design");
  assert.deepEqual(designReport.errors, [], "validate-design accepts dedicated cross-cutting architecture slices");
  await writeFile(
    path.join(root, ".harness/state/plan.draft.yaml"),
    `next_task_sequence: 3
tasks: []
`,
    "utf8"
  );
  await writeFile(
    path.join(root, ".harness/state/lifecycle.yaml"),
    'current_phase: "SPRINTING"\n',
    "utf8"
  );

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: ""
next_task_sequence: 2
tasks:
  - id: DEV-001
    title: Done task
    status: done
    summary: Completed task
    gate_result: PASS
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  let devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /Completed task DEV-001 must not remain in plan.yaml/);

  await writeFile(
    path.join(root, ".harness/state/lifecycle.yaml"),
    'current_phase: "REVIEWING"\n',
    "utf8"
  );
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /validate-dev requires lifecycle current_phase SPRINTING/);
  await writeFile(
    path.join(root, ".harness/state/lifecycle.yaml"),
    'current_phase: "SPRINTING"\n',
    "utf8"
  );

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: TASK-002
next_task_sequence: 3
tasks:
  - id: TASK-002
    phase: SPRINTING
    title: Open task
    status: in_progress
    summary: Active task
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /Open task TASK-002 missing allowed_paths/);

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: ""
next_task_sequence: 3
tasks:
  - id: TASK-002
    phase: SPRINTING
    title: Open task
    status: in_progress
    summary: Active task
    docs:
      product:
        - .docs/01_product/prd.md
    allowed_paths:
      - "src/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "plan contract is present"
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /validate-dev requires current_task_id/);
  assert.doesNotMatch(devReport.errors.join("\n"), /missing allowed_paths/);

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: TASK-999
next_task_sequence: 3
tasks:
  - id: TASK-002
    phase: SPRINTING
    title: Open task
    status: in_progress
    summary: Active task
    docs:
      product:
        - .docs/01_product/prd.md
    allowed_paths:
      - "src/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "plan contract is present"
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /current_task_id does not match/);

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: TASK-002
next_task_sequence: 3
tasks:
  - id: TASK-002
    phase: REQUIREMENT_GATHERING
    title: Open task
    status: in_progress
    summary: Active task
    docs:
      product:
        - .docs/01_product/prd.md
    allowed_paths:
      - "src/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "plan contract is present"
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /TASK-002 must have phase SPRINTING/);

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: TASK-002
next_task_sequence: 3
tasks:
  - id: TASK-002
    phase: SPRINTING
    title: Open task
    status: in_progress
    summary: Active task
    docs:
      product:
        - .docs/01_product/prd.md
    allowed_paths:
      - "src/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "plan contract is present"
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  devReport = await runValidator(root, "validate-dev");
  assert.deepEqual(devReport.errors, [], "validate-dev accepts valid current open SPRINTING task");
  const currentWithOpenDevTask = await runValidator(root, "validate-current");
  assert.match(currentWithOpenDevTask.errors.join("\n"), /Open tasks remain: TASK-002/);

  await writeFile(path.join(root, ".docs/INDEX.md"), "# Index\n", "utf8");
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /\.docs\/INDEX\.md does not link implementation doc/);
  await writeFile(path.join(root, ".docs/INDEX.md"), "# Index\n.docs/04_implementation/example/dev.md\n", "utf8");

  const dirtyRoot = await mkdtemp(path.join(tmpdir(), "sdlc-harness-dirty-dev-"));
  try {
    await writeSprintDevFixture(dirtyRoot);
    execFileSync("git", ["init"], { cwd: dirtyRoot, stdio: "ignore" });
    execFileSync("git", ["config", "user.name", "Codex"], { cwd: dirtyRoot });
    execFileSync("git", ["config", "user.email", "codex@example.local"], { cwd: dirtyRoot });
    execFileSync("git", ["add", "."], { cwd: dirtyRoot });
    execFileSync("git", ["commit", "-m", "baseline"], { cwd: dirtyRoot, stdio: "ignore" });
    await writeFile(path.join(dirtyRoot, "README.md"), "# Dirty outside allowed paths\n", "utf8");
    const dirtyDevReport = await runValidator(dirtyRoot, "validate-dev");
    assert.match(dirtyDevReport.errors.join("\n"), /Changed files outside current task allowed_paths: README\.md/);
  } finally {
    await rm(dirtyRoot, { recursive: true, force: true });
  }

  await writeFile(
    path.join(root, ".harness/state/lifecycle.yaml"),
    'current_phase: "REQUIREMENT_GATHERING"\n',
    "utf8"
  );

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: TASK-004
next_task_sequence: 5
tasks:
  - id: TASK-004
    phase: REQUIREMENT_GATHERING
    title: Draft one PRD slice
    status: in_progress
    summary: Active document-production task
    docs:
      raw:
        - .docs/00_raw/request.md
    allowed_paths:
      - ".docs/01_product/prd.md"
      - ".docs/INDEX.md"
      - ".harness/state/plan.yaml"
    required_gates:
      - "npx sdlc-harness validate-plan"
    acceptance_criteria:
      - "One PRD slice is updated."
    result_docs:
      - .docs/01_product/prd.md
`,
    "utf8"
  );
  const planReport = await runValidator(root, "validate-plan");
  assert.deepEqual(planReport.errors, [], "validate-plan allows open document task with result_docs");
  const pmWithOpenTask = await runValidator(root, "validate-pm");
  assert.match(pmWithOpenTask.errors.join("\n"), /Open tasks remain: TASK-004/);

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: TASK-005
next_task_sequence: 6
tasks:
  - id: TASK-005
    title: Missing phase
    status: in_progress
    summary: Active document-production task
    docs:
      product:
        - .docs/01_product/prd.md
    allowed_paths:
      - ".docs/01_product/prd.md"
    required_gates:
      - "npx sdlc-harness validate-plan"
    acceptance_criteria:
      - "One PRD slice is updated."
    result_docs:
      - .docs/01_product/prd.md
`,
    "utf8"
  );
  const missingPhase = await runValidator(root, "validate-plan");
  assert.match(missingPhase.errors.join("\n"), /TASK-005 must define valid phase/);

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: ""
next_task_sequence: 3
parallel_execution:
  enabled: true
  trigger: user_requested
  mode: user_orchestrated
  coordinator: main_agent
  workers:
    - id: worker-research
      writes_repo: false
      owned_paths: []
      forbidden_paths:
        - ".harness/state/**"
      expected_output:
        - "research notes"
      required_gates:
        - "main agent review"
  integration:
    owner: main_agent
    merge_strategy: "main agent synthesizes PRD"
    required_gates:
      - "validate-pm"
    fact_source_updates:
      - ".docs/01_product/"
tasks: []
`,
    "utf8"
  );
  let parallelReport = await runValidator(root, "validate-plan");
  assert.deepEqual(parallelReport.errors, [], "valid user_orchestrated parallel contract");

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: ""
next_task_sequence: 3
parallel_execution:
  enabled: true
  trigger: user_requested
  mode: runtime_managed
  coordinator: main_agent
  workers:
    - id: worker-smoke
      writes_repo: true
      branch: agent/test-smoke
      worktree: ../project-test-smoke
      owned_paths:
        - "tests/smoke/**"
      forbidden_paths:
        - ".harness/state/**"
      expected_output:
        - "smoke test evidence"
      required_gates:
        - "npm test -- tests/smoke"
  integration:
    owner: main_agent
    merge_strategy: "main agent reviews and merges"
    required_gates:
      - "make validate-test"
    fact_source_updates:
      - ".docs/07_test/"
tasks: []
`,
    "utf8"
  );
  parallelReport = await runValidator(root, "validate-plan");
  assert.deepEqual(parallelReport.errors, [], "valid runtime_managed parallel contract");

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: ""
next_task_sequence: 3
parallel_execution:
  enabled: true
  mode: user_orchestrated
  coordinator: main_agent
  workers:
    - id: worker-research
      writes_repo: false
      owned_paths: []
      forbidden_paths: []
      expected_output:
        - "research notes"
      required_gates:
        - "main agent review"
  integration:
    owner: main_agent
    merge_strategy: "main agent synthesizes PRD"
    required_gates:
      - "validate-pm"
    fact_source_updates:
      - ".docs/01_product/"
tasks: []
`,
    "utf8"
  );
  parallelReport = await runValidator(root, "validate-plan");
  assert.match(parallelReport.errors.join("\n"), /parallel_execution\.trigger must be "user_requested"/);

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: ""
next_task_sequence: 3
parallel_execution:
  enabled: true
  trigger: user_requested
  mode: runtime_managed
  coordinator: main_agent
  workers:
    - id: worker-duplicate
      writes_repo: false
      owned_paths: []
      forbidden_paths: []
      expected_output:
        - "first notes"
      required_gates:
        - "main agent review"
    - id: worker-duplicate
      writes_repo: false
      owned_paths: []
      forbidden_paths: []
      expected_output:
        - "second notes"
      required_gates:
        - "main agent review"
  integration:
    owner: main_agent
    merge_strategy: "main agent reviews evidence"
    required_gates:
      - "make validate-test"
    fact_source_updates:
      - ".docs/07_test/"
tasks: []
`,
    "utf8"
  );
  parallelReport = await runValidator(root, "validate-plan");
  assert.match(parallelReport.errors.join("\n"), /parallel_execution worker id must be unique: worker-duplicate/);

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: ""
next_task_sequence: 3
parallel_execution:
  enabled: true
  trigger: user_requested
  mode: runtime_managed
  coordinator: main_agent
  workers:
    - id: worker-smoke
      writes_repo: true
      owned_paths: []
      forbidden_paths: []
      expected_output:
        - "smoke test evidence"
      required_gates:
        - "npm test -- tests/smoke"
  integration:
    owner: main_agent
    merge_strategy: "main agent reviews and merges"
    required_gates:
      - "make validate-test"
    fact_source_updates:
      - ".docs/07_test/"
tasks: []
`,
    "utf8"
  );
  parallelReport = await runValidator(root, "validate-plan");
  assert.match(parallelReport.errors.join("\n"), /branch is required when writes_repo is true/);
  assert.match(parallelReport.errors.join("\n"), /worktree is required when writes_repo is true/);
  assert.match(parallelReport.errors.join("\n"), /owned_paths must not be empty when writes_repo is true/);

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_phase: SPRINTING
current_task_id: ""
next_task_sequence: 3
tasks: []
`,
    "utf8"
  );
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /plan\.yaml must not define current_phase/);

  await writeFile(
    path.join(root, ".harness/state/lifecycle.yaml"),
    'current_phase: "SPRINTING"\n',
    "utf8"
  );
  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: ""
next_task_sequence: 3
parallel_execution:
  enabled: true
  trigger: user_requested
  mode: user_orchestrated
  coordinator: main_agent
  workers:
    - id: worker-feature
      writes_repo: true
      branch: agent/feature
      worktree: ../project-feature
      owned_paths:
        - "src/feature/**"
      forbidden_paths:
        - ".harness/state/**"
      expected_output:
        - "implementation branch"
      required_gates:
        - "npm test -- tests/feature"
  integration:
    owner: main_agent
    merge_strategy: "main agent reviews and cherry-picks"
    required_gates:
      - "make validate-dev"
    fact_source_updates:
      - ".docs/04_implementation/"
tasks: []
`,
    "utf8"
  );
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /SPRINTING parallel_execution requires plan\.yaml current_task_id/);

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: DEV-002
next_task_sequence: 3
parallel_execution:
  enabled: true
  trigger: user_requested
  mode: user_orchestrated
  coordinator: main_agent
  linked_task_id: DEV-999
  workers:
    - id: worker-feature
      writes_repo: true
      branch: agent/feature
      worktree: ../project-feature
      owned_paths:
        - "src/feature/**"
      forbidden_paths:
        - ".harness/state/**"
      expected_output:
        - "implementation branch"
      required_gates:
        - "npm test -- tests/feature"
  integration:
    owner: main_agent
    merge_strategy: "main agent reviews and cherry-picks"
    required_gates:
      - "make validate-dev"
    fact_source_updates:
      - ".docs/04_implementation/"
tasks:
  - id: DEV-002
    title: Open task
    status: in_progress
    summary: Active task
    docs:
      product:
        - .docs/01_product/prd.md
    allowed_paths:
      - "src/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "plan contract is present"
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /parallel_execution must not define linked_task_id/);
} finally {
  await rm(root, { recursive: true, force: true });
}

async function writeTestingBoundaryFixture(projectRoot) {
  await writeFile(
    path.join(projectRoot, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  await mkdir(path.join(projectRoot, ".docs/06_review"), { recursive: true });
  await mkdir(path.join(projectRoot, ".docs/07_test"), { recursive: true });
  await mkdir(path.join(projectRoot, ".harness/state"), { recursive: true });
  await writeFile(
    path.join(projectRoot, ".docs/06_review/REVIEW_REPORT.md"),
    "# Review Report\n\n## Findings\n\nNo blocking finding.\n\n## Test Gap\n\nCoverage exists.\n\n## Runnable Entry/Exit Readiness\n\n- Runnable Entry: PASS\n- Observable Exit: PASS\n- Initialization: PASS\n- Config Contract: PASS\n- Testing Handoff Readiness: PASS\n- Notes: Existing entry/exit is runnable.\n\n## Decision\n\nPASS\n",
    "utf8"
  );
  await writeFile(
    path.join(projectRoot, ".docs/07_test/TEST_REPORT.md"),
    "# Test Report\n\n## Matrix\n\n| Scenario | Result |\n|---|---|\n| Normal | PASS |\n\n## Regression\n\n- focused regression: PASS\n\n## Runnable Entry/Exit Coverage\n\nExisting entry/exit is exercised.\n\n## Coverage Gap\n\nNo gap.\n\n## Decision\n\nPASS\n",
    "utf8"
  );
  await writeFile(path.join(projectRoot, ".harness/state/lifecycle.yaml"), 'current_phase: "TESTING"\n', "utf8");
  await writeFile(
    path.join(projectRoot, ".harness/state/plan.yaml"),
    `current_task_id: ""
next_task_sequence: 2
tasks: []
`,
    "utf8"
  );
}

async function writeSprintDevFixture(projectRoot) {
  await writeFile(
    path.join(projectRoot, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  await mkdir(path.join(projectRoot, ".docs/04_implementation/example"), { recursive: true });
  await mkdir(path.join(projectRoot, ".harness/state"), { recursive: true });
  await writeFile(path.join(projectRoot, ".docs/INDEX.md"), "# Index\n.docs/04_implementation/example/dev.md\n", "utf8");
  await writeFile(
    path.join(projectRoot, ".docs/04_implementation/example/dev.md"),
    "# Impl\n\n## Runnable Entry/Exit\n\n- Entry points: local fixture API.\n- Exit / side effects: validation output only.\n- Config contract: not applicable.\n- Fixture/live boundary: fixture-only.\n\n## Development Evidence\n\n- Runnable Entry: API command `node tests/fixture-api.mjs` invokes the local fixture API.\n- Observable Exit: Command output reports PASS validation output only.\n- Client / Server Initialization: Local API fixture starts from the recorded command.\n- Config Contract: no external config required for this fixture.\n- Basic Self-test Evidence: `npm test --workspace agent-project-sdlc` PASS for dirty-file scoping regression.\n",
    "utf8"
  );
  await writeFile(path.join(projectRoot, ".harness/state/lifecycle.yaml"), 'current_phase: "SPRINTING"\n', "utf8");
  await writeFile(path.join(projectRoot, ".harness/state/plan.draft.yaml"), "next_task_sequence: 2\ntasks: []\n", "utf8");
  await writeFile(
    path.join(projectRoot, ".harness/state/plan.yaml"),
    `current_task_id: TASK-001
next_task_sequence: 2
tasks:
  - id: TASK-001
    phase: SPRINTING
    title: Active sprint task
    status: in_progress
    summary: Validate dirty-file scoping.
    docs:
      product:
        - .docs/01_product/prd.md
    allowed_paths:
      - "src/**"
      - "tests/**"
      - ".docs/04_implementation/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "Dirty file scoping is enforced."
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
}
