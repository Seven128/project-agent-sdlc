import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildWorkflowDiagnostics,
  listScenarios,
  prepareRunDirectory,
  renderStagePrompt,
} from "../../examples/delivery-benchmark/runner/delivery_benchmark.mjs";
import { runOwnedChildProcess } from "./helpers/owned-child-process.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const benchmarkDataChild = fileURLToPath(
  new URL("./delivery-benchmark-data-child.mjs", import.meta.url),
);

test("benchmark report data is reset for Minimal Context reruns", async () => {
  const data = await loadBenchmarkData();
  assert.equal(data.generatedAt, "2026-06-03T00:00:00.000Z");
  assert.match(data.copy.en.keyFinding.headline, /No public benchmark result/);
  assert.match(data.copy.zh.keyFinding.headline, /没有可用于正式结论/);
  assert.ok(data.scenarios.length >= 4);
  assert.ok(data.scenarios.every((scenario) => scenario.status === "pending"));
  assert.ok(data.scenarios.every((scenario) => !scenario.modes));

  const serialized = JSON.stringify(data);
  assert.doesNotMatch(serialized, /"status":"completed"/i);
  assert.doesNotMatch(serialized, /"modes":/i);
  assert.doesNotMatch(serialized, /"summaryPath":/i);
});

test("benchmark docs keep skeleton protocol and remove old pilot conclusions", async () => {
  const read = (relativePath) =>
    readFile(path.join(repoRoot, relativePath), "utf8");
  const [readme, runbook, resultsReadme, context] = await Promise.all([
    read("examples/delivery-benchmark/README.md"),
    read("examples/delivery-benchmark/RUNBOOK.md"),
    read("examples/delivery-benchmark/results/README.md"),
    read("project_context/areas/delivery-benchmark.md"),
  ]);

  for (const content of [readme, runbook, resultsReadme]) {
    assert.match(content, /Minimal Context/);
    assert.match(content, /reset/i);
    assert.match(content, /workflow overhead ratio/i);
    assert.match(content, /artifact count|artifact inventory/i);
    assert.match(content, /true[- ]product|hygiene/i);
    assert.match(
      content,
      /AC progress visibility|acceptance progress visibility/i,
    );
    assert.doesNotMatch(content, /completed public run|formal result summary/i);
    assert.doesNotMatch(content, /\.work_products|validate-dev|validate-plan/);
  }

  assert.match(readme, /runner and scenario skeletons/i);
  assert.match(runbook, /Do not require lifecycle phase state/);
  assert.match(resultsReadme, /no historical stage-workflow result/);
  assert.match(context, /Historical stage-based numbers are removed/);
  assert.match(context, /workflow overhead ratio/i);
  assert.match(context, /hygiene issue count/i);
  assert.match(context, /AC progress visibility/i);
});

test("results directory contains only report shell and reset data", async () => {
  const files = await readdir(
    path.join(repoRoot, "examples", "delivery-benchmark", "results"),
  );
  assert.deepEqual(files.sort(), [
    "README.md",
    "benchmark-data.js",
    "index.html",
  ]);
});

test("runner still supports scenario listing, prepare, and staged prompts", async () => {
  const scenarios = await listScenarios();
  assert.deepEqual(
    scenarios.sort(),
    [
      "expense-policy-engine",
      "project-context-recovery-lab",
      "support-triage-board",
      "webhook-provider-bridge",
    ].sort(),
  );

  const runRoot = await mkdtemp(
    path.join(os.tmpdir(), "delivery-benchmark-reset-"),
  );
  try {
    const runDir = path.join(runRoot, "harness");
    await prepareRunDirectory({
      scenario: "support-triage-board",
      mode: "harness",
      outDir: runDir,
      force: true,
    });
    const prompt = await readFile(
      path.join(runDir, ".benchmark", "prompt.md"),
      "utf8",
    );
    assert.match(prompt, /Minimal Context Harness/);
    assert.match(prompt, /project_context\/\*\*/);
    assert.match(prompt, /make validate-context/);
    assert.doesNotMatch(prompt, /\.work_products/);
    assert.doesNotMatch(prompt, /validate-dev|validate-plan/);

    const recoveryPrompt = await renderStagePrompt({
      scenario: "support-triage-board",
      mode: "harness",
      stage: "recovery",
    });
    assert.match(recoveryPrompt, /Fresh-Agent Takeover/);
    assert.doesNotMatch(recoveryPrompt, /recovery_answer_key/);
  } finally {
    await rm(runRoot, { recursive: true, force: true });
  }
});

test("runner exposes workflow diagnostics without making them conclusion-grade", () => {
  const diagnostics = buildWorkflowDiagnostics({
    workflowOverheadRatio: 0.25,
    workflowArtifactCount: 7,
    totalArtifactCount: 20,
    productDefectCount: 3,
    hygieneIssueCount: 5,
    acProgressVisibleCount: 4,
    acProgressTotal: 6,
  });

  assert.equal(diagnostics.workflow_overhead_ratio, 0.25);
  assert.equal(diagnostics.workflow_artifact_count, 7);
  assert.equal(diagnostics.total_artifact_count, 20);
  assert.equal(diagnostics.workflow_artifact_ratio, 0.35);
  assert.equal(diagnostics.gate_true_product_defect_count, 3);
  assert.equal(diagnostics.gate_hygiene_issue_count, 5);
  assert.equal(diagnostics.ac_progress_visibility.visible_count, 4);
  assert.equal(diagnostics.ac_progress_visibility.total_count, 6);
  assert.equal(diagnostics.conclusion_eligible, false);
});

async function loadBenchmarkData() {
  const sourcePath = path.join(
    repoRoot,
    "examples",
    "delivery-benchmark",
    "results",
    "benchmark-data.js",
  );
  const result = await runOwnedChildProcess(
    process.execPath,
    [benchmarkDataChild, sourcePath],
    { timeoutMs: 10_000 },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
