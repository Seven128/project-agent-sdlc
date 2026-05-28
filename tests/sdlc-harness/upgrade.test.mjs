import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runInit } from "../../packages/sdlc-harness/dist/lib/init.js";
import { runUpgrade } from "../../packages/sdlc-harness/dist/lib/upgrade.js";

const root = await mkdtemp(path.join(tmpdir(), "sdlc-harness-upgrade-"));

try {
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ sdlcHarness: { harnessFolderName: ".harness" } }, null, 2),
    "utf8"
  );
  await runInit(root, { adopt: true, force: false });
  await rm(path.join(root, ".harness/state/memory.md"), { force: true });
  await mkdir(path.join(root, ".harness/state"), { recursive: true });
  await writeFile(
    path.join(root, ".harness/config.yaml"),
    `core:
  package: "agent-project-sdlc"
  version: "0.1.0"
  schema_version: "1"
managed_files:
  - path: "AGENTS.md"
    strategy: "merge-block"
  - path: ".agents/skills"
    strategy: "generated"
  - path: ".harness/templates"
    strategy: "managed"
  - path: ".harness/policies"
    strategy: "merge-with-local"
  - path: ".harness/make/sdlc-harness.mk"
    strategy: "managed"
local_overrides:
  - ".harness/overrides/**"
  - ".harness/policies/*.local.yaml"
never_overwrite:
  - ".docs/**"
  - ".harness/state/**"
`,
    "utf8"
  );
  await writeFile(
    path.join(root, ".harness/state/plan.yaml"),
    `current_phase: "SPRINTING"
current_task_id: DEV-002
parallel_execution:
  enabled: true
  trigger: user_requested
  mode: user_orchestrated
  phase: SPRINTING
  coordinator: main_agent
  linked_task_id: DEV-002
  workers:
    - id: worker-feature
      writes_repo: false
      owned_paths: []
      forbidden_paths: []
      expected_output:
        - "legacy notes"
      required_gates:
        - "main review"
  integration:
    owner: main_agent
    merge_strategy: "main agent integrates"
    required_gates:
      - "validate-dev"
    fact_source_updates:
      - ".docs/04_implementation/"
tasks:
  - id: DEV-001
    title: Completed legacy task
    status: done
    summary: Done task should leave current plan
    implementation_doc: .docs/04_implementation/legacy/dev_001.md
  - id: DEV-002
    title: Open legacy task
    status: pending
    summary: Open task should stay in current plan
    gate_result: PASS
    implementation_doc: .docs/04_implementation/legacy/dev_002.md
`,
    "utf8"
  );
  await writeFile(
    path.join(root, ".harness/state/tasks.draft.yaml"),
    `current_phase: "SPRINTING"
current_task_id: DEV-003
tasks: []
`,
    "utf8"
  );
  await writeFile(path.join(root, ".harness/state/gate_results.log"), "legacy gate evidence\n", "utf8");
  await writeFile(
    path.join(root, ".harness/state/lifecycle.yaml"),
    `current_phase: "REQUIREMENT_GATHERING"
active_skill: "pm_prd"
history:
  - phase: "IDLE"
    note: "legacy phase history should be removed"
`,
    "utf8"
  );
  await rm(path.join(root, ".harness/pjsdlc_managed"), { recursive: true, force: true });
  await mkdir(path.join(root, ".harness/managed/policies"), { recursive: true });
  await writeFile(path.join(root, ".harness/managed/policies/custom.local.yaml"), "custom: true\n", "utf8");
  await mkdir(path.join(root, ".harness/overrides/skills"), { recursive: true });
  await writeFile(
    path.join(root, ".harness/overrides/skills/pjsdlc_dev_sprint.md"),
    "升级后的开发阶段仍保留本地提示词。\n",
    "utf8"
  );

  const report = await runUpgrade(root);
  assert.ok(report.some((line) => line.startsWith("migrations changed=")));
  assert.ok(report.some((line) => line.startsWith("sync changed=")));

  const plan = await readFile(path.join(root, ".harness/state/plan.yaml"), "utf8");
  assert.doesNotMatch(plan, /current_phase/);
  assert.match(plan, /current_task_id/);
  assert.doesNotMatch(plan, /phase: SPRINTING/);
  assert.doesNotMatch(plan, /linked_task_id/);
  assert.match(plan, /id: DEV-002/);
  assert.match(plan, /next_task_sequence: 3/);
  assert.doesNotMatch(plan, /DEV-001/);
  assert.doesNotMatch(plan, /gate_result/);
  await assert.rejects(readFile(path.join(root, ".harness/state/gate_results.log"), "utf8"));
  const draft = await readFile(path.join(root, ".harness/state/plan.draft.yaml"), "utf8");
  assert.doesNotMatch(draft, /current_phase/);
  assert.doesNotMatch(draft, /current_task_id/);

  const config = await readFile(path.join(root, ".harness/config.yaml"), "utf8");
  const packageMetadata = JSON.parse(
    await readFile(fileURLToPath(new URL("../../packages/sdlc-harness/package.json", import.meta.url)), "utf8")
  );
  assert.match(config, new RegExp(`version: "?${packageMetadata.version}"?`));
  assert.doesNotMatch(config, /version: "?0\.1\.0"?/);
  assert.match(config, /\.harness\/skills/);
  assert.doesNotMatch(config, /\.harness\/prompts/);
  assert.match(config, /path: "?Makefile"?/);
  assert.doesNotMatch(config, /\.harness\/agents\/skills/);
  assert.doesNotMatch(config, /\.agents\/skills/);
  assert.match(config, /\.harness\/pjsdlc_managed\/templates/);
  assert.match(config, /\.harness\/pjsdlc_managed\/policies/);
  assert.match(config, /\.harness\/pjsdlc_managed\/override_skills\/\*\.md/);
  assert.doesNotMatch(config, /\.harness\/overrides\/\*\*/);
  assert.doesNotMatch(config, /\.harness\/managed\/templates/);
  assert.doesNotMatch(config, /\.harness\/managed\/policies/);
  const localOverride = await readFile(path.join(root, ".harness/pjsdlc_managed/policies/custom.local.yaml"), "utf8");
  assert.match(localOverride, /custom: true/);
  await assert.rejects(readFile(path.join(root, ".harness/managed/policies/custom.local.yaml"), "utf8"));
  const skillOverride = await readFile(path.join(root, ".harness/pjsdlc_managed/override_skills/pjsdlc_dev_sprint.md"), "utf8");
  assert.match(skillOverride, /升级后的开发阶段仍保留本地提示词。/);
  await assert.rejects(readFile(path.join(root, ".harness/overrides/skills/pjsdlc_dev_sprint.md"), "utf8"));
  const generatedDevSkill = await readFile(path.join(root, ".harness/skills/pjsdlc_dev_sprint/SKILL.md"), "utf8");
  assert.match(generatedDevSkill, /\.harness\/pjsdlc_managed\/override_skills\/pjsdlc_dev_sprint\.md/);
  assert.match(generatedDevSkill, /升级后的开发阶段仍保留本地提示词。/);

  const makefile = await readFile(path.join(root, "Makefile"), "utf8");
  assert.match(makefile, /pjsdlc:sdlc-harness:make:begin/);
  assert.match(makefile, /-include \.harness\/pjsdlc_managed\/make\/sdlc-harness\.mk/);

  const lifecycle = await readFile(path.join(root, ".harness/state/lifecycle.yaml"), "utf8");
  assert.match(lifecycle, /active_skill: "?pjsdlc_pm_prd"?/);
  assert.doesNotMatch(lifecycle, /active_prompt/);
  assert.doesNotMatch(lifecycle, /active_skill: "pm_prd"/);
  assert.doesNotMatch(lifecycle, /history:/);
  assert.doesNotMatch(lifecycle, /legacy phase history/);
  const memory = await readFile(path.join(root, ".harness/state/memory.md"), "utf8");
  assert.match(memory, /简短摘要和链接/);
  assert.match(memory, /\.docs\/05_decisions\//);
  assert.match(memory, /正式事实源/);
} finally {
  await rm(root, { recursive: true, force: true });
}
