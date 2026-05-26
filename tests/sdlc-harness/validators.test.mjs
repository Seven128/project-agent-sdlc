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
    path.join(root, ".docs/03_tech_plan/plan.md"),
    "# Plan\n\nAPI contract task breakdown\n",
    "utf8"
  );
  await writeFile(path.join(root, ".docs/04_implementation/example/dev.md"), "# Impl\n", "utf8");
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

  for (const gate of ["validate-harness", "validate-pm", "validate-design", "validate-dev"]) {
    const report = await runValidator(root, gate);
    assert.deepEqual(report.errors, [], gate);
  }

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
    `current_task_id: ""
next_task_sequence: 3
parallel_execution:
  enabled: true
  trigger: user_requested
  mode: user_orchestrated
  phase: REQUIREMENT_GATHERING
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
  phase: TESTING
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
  phase: REQUIREMENT_GATHERING
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
  phase: TESTING
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
  phase: TESTING
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
    `current_task_id: DEV-002
next_task_sequence: 3
parallel_execution:
  enabled: true
  trigger: user_requested
  mode: user_orchestrated
  phase: SPRINTING
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
  assert.match(devReport.errors.join("\n"), /SPRINTING parallel_execution\.linked_task_id must match current_task_id/);
} finally {
  await rm(root, { recursive: true, force: true });
}
