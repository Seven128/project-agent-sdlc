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
  await mkdir(path.join(root, ".harness/state/checkpoints"), { recursive: true });
  await mkdir(path.join(root, ".harness/skills"), { recursive: true });
  await mkdir(path.join(root, ".harness/managed/templates"), { recursive: true });
  await mkdir(path.join(root, ".harness/managed/policies"), { recursive: true });
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
    path.join(root, ".harness/state/tasks.yaml"),
    `tasks:
  - id: DEV-001
    title: Done task
    status: done
    summary: Completed task
    gate_result: PASS
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );

  for (const gate of ["validate-harness", "validate-pm", "validate-design", "validate-dev", "validate-checkpoint"]) {
    const report = await runValidator(root, gate);
    assert.deepEqual(report.errors, [], gate);
  }

  await writeFile(
    path.join(root, ".harness/state/tasks.yaml"),
    `tasks:
  - id: DEV-002
    title: Open task
    status: in_progress
    summary: Active task
    checkpoint: .harness/state/checkpoints/DEV-002.md
    implementation_doc: .docs/04_implementation/example/dev.md
`,
    "utf8"
  );
  let checkpointReport = await runValidator(root, "validate-checkpoint");
  assert.match(checkpointReport.errors.join("\n"), /checkpoint file does not exist/);

  await writeFile(
    path.join(root, ".harness/state/checkpoints/DEV-002.md"),
    `# Checkpoint: DEV-002

## Task Contract

\`\`\`yaml
allowed_paths:
  - "src/**"
required_gates:
  - "npm test"
\`\`\`
`,
    "utf8"
  );
  checkpointReport = await runValidator(root, "validate-checkpoint");
  assert.deepEqual(checkpointReport.errors, []);
} finally {
  await rm(root, { recursive: true, force: true });
}
