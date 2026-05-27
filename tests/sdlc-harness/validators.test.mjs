import assert from "node:assert/strict";
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
  await writeFile(path.join(root, ".docs/04_implementation/example/dev.md"), "# Impl\n", "utf8");
  await writeFile(
    path.join(root, ".docs/06_review/REVIEW_REPORT.md"),
    "# Review Report\n\n## Findings\n\nNo blocking finding.\n\n## Test Gap\n\nCoverage is intentionally narrow.\n\n## Decision\n\nPASS\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/07_test/TEST_PLAN.md"),
    "# Test Plan\n\n## Matrix\n\n| Scenario | Result |\n|---|---|\n| Normal | PASS |\n\n## Regression\n\n- focused regression: PASS\n\n## Coverage Gap\n\nNo browser coverage.\n\n## Decision\n\nPASS\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/08_release/v0.1.0.md"),
    "# Release v0.1.0\n\n## Release Notes\n\nInitial test release.\n\n## Smoke Evidence\n\n- smoke test: PASS\n\n## Rollback Plan\n\nRevert the release commit.\n",
    "utf8"
  );
  await writeFile(
    path.join(root, ".docs/rfc/RFC_001.md"),
    "# RFC 001\n\nStatus: VERIFIED\n\n## Background\n\nTest RFC.\n\n## Product Impact\n\nNo user-facing change.\n\n## Technical Impact\n\nNo implementation change.\n\n## Regression\n\nKeep validator coverage.\n",
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
    "validate-dev",
    "validate-review",
    "validate-test",
    "validate-release",
    "validate-rfc"
  ]) {
    const report = await runValidator(root, gate);
    assert.deepEqual(report.errors, [], gate);
  }

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
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: DEV-002
next_task_sequence: 3
tasks:
  - id: DEV-002
    title: Open task
    status: in_progress
    summary: Active task
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /Open task DEV-002 missing allowed_paths/);

  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_task_id: DEV-002
next_task_sequence: 3
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
  assert.match(devReport.errors.join("\n"), /Open tasks remain: DEV-002/);
  assert.doesNotMatch(devReport.errors.join("\n"), /missing allowed_paths/);

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
  devReport = await runValidator(root, "validate-dev");
  assert.deepEqual(devReport.errors, [], "valid user_orchestrated parallel contract");

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
  devReport = await runValidator(root, "validate-dev");
  assert.deepEqual(devReport.errors, [], "valid runtime_managed parallel contract");

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
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /parallel_execution\.trigger must be "user_requested"/);

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
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /parallel_execution worker id must be unique: worker-duplicate/);

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
  devReport = await runValidator(root, "validate-dev");
  assert.match(devReport.errors.join("\n"), /branch is required when writes_repo is true/);
  assert.match(devReport.errors.join("\n"), /worktree is required when writes_repo is true/);
  assert.match(devReport.errors.join("\n"), /owned_paths must not be empty when writes_repo is true/);

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
