import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  aggregateComparisons,
  compareMechanismScores,
  prepareMechanismRun,
  scoreMechanismRun
} from "../../examples/delivery-benchmark/mechanism/runner/mechanism_benchmark.mjs";
import { resolveContext } from "../../examples/delivery-benchmark/mechanism/runner/context-resolve-r0.mjs";
import { contextMetrics, contextUpdateMetrics } from "../../examples/delivery-benchmark/mechanism/runner/metrics.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const mechanismRoot = path.join(repoRoot, "examples", "delivery-benchmark", "mechanism");

test("mechanism benchmark fixes baseline, tracks, tasks, gold, and hidden boundaries", async () => {
  const experiments = JSON.parse(await readFile(path.join(mechanismRoot, "experiment-set.json"), "utf8"));
  assert.equal(experiments.baseline_commit, "89b04869a2b29ae09944839370f1e373aa55085f");
  assert.deepEqual(Object.keys(experiments.tracks).sort(), ["context-routing", "long-task-authoring", "workflow-expression"]);
  const taskIds = [...new Set(Object.values(experiments.tracks).flatMap((track) => track.tasks))];
  assert.equal(taskIds.length, 11);
  for (const id of taskIds) {
    await assert.doesNotReject(readFile(path.join(mechanismRoot, "tasks", `${id}.json`), "utf8"));
    await assert.doesNotReject(readFile(path.join(mechanismRoot, "gold", `${id}.json`), "utf8"));
  }
  const serialized = JSON.stringify(experiments);
  assert.doesNotMatch(serialized, /benchmark-proven|completed result|speedup achieved/iu);
});

test("prompt, Context, and Skill packaging equivalence requires independent paired Agent evidence", async () => {
  const verification = await readFile(
    path.join(repoRoot, "project_context", "areas", "harness-package", "verification.md"),
    "utf8",
  );

  assert.match(
    verification,
    /Static\/unit tests may prove instruction distribution, canonical-source parity, core-runtime identity and known semantic invariants/iu,
  );
  assert.match(
    verification,
    /prompt, Context or Skill-packaging changes[\s\S]*do not by themselves prove Agent-level recall\/adherence[\s\S]*conclusion-grade independent paired A\/B runs/iu,
  );
  assert.match(
    verification,
    /narrow evidence rule does not replace deterministic mechanism proof for machine-runtime changes/iu,
  );
});

test("stateless Context resolver reaches fixed controlling Context without creating state", async () => {
  const fixture = path.join(mechanismRoot, "fixture");
  const result = await resolveContext(fixture, {
    terms: ["money", "rounding", "1.005", "10.075"],
    paths: ["src/billing/money.mjs", "tests/base.test.mjs"],
    facets: ["verification"]
  });
  for (const required of [
    "project_context/global.md",
    "project_context/architecture.md",
    "project_context/context.toml",
    "project_context/areas/invoice-ops.md",
    "project_context/areas/invoice-ops/foundation/money.md",
    "project_context/areas/invoice-ops/decision-rationale/rounding.md",
    "project_context/areas/invoice-ops/verification.md"
  ]) assert.ok([...result.required, ...result.candidates].includes(required), required);
  assert.equal(result.state_created, false);
  assert.equal(result.schema_version, "context-resolve-r0-v1");
  assert.ok(!result.candidates.includes("project_context/areas/admin.md"));
  assert.ok(!result.candidates.includes("project_context/areas/invoice-ops/archive/legacy-tax.md"));
});

test("UIUX recovery benchmark preserves selected-source closure and one canonical target owner", async () => {
  const fixture = path.join(mechanismRoot, "fixture");
  const experiments = JSON.parse(await readFile(path.join(mechanismRoot, "experiment-set.json"), "utf8"));
  for (const track of ["context-routing", "workflow-expression"]) {
    assert.ok(experiments.tracks[track].tasks.includes("uiux-selected-target-recovery"), track);
  }

  const task = JSON.parse(await readFile(path.join(mechanismRoot, "tasks", "uiux-selected-target-recovery.json"), "utf8"));
  const gold = JSON.parse(await readFile(path.join(mechanismRoot, "gold", "uiux-selected-target-recovery.json"), "utf8"));
  const handoff = await readFile(path.join(fixture, "design", "handoffs", "invoice-board.md"), "utf8");
  for (const dimension of [
    "surface_flow",
    "visual_content",
    "component_control",
    "state_interaction",
    "motion",
    "adaptation_input",
    "accessibility",
    "assets"
  ]) {
    assert.match(handoff, new RegExp(`dimension:\\s+${dimension}\\b`, "u"), dimension);
    assert.match(
      handoff,
      new RegExp(`dimension:\\s+${dimension}\\b[\\s\\S]*?condition_refs:\\s*\\r?\\n\\s*- desktop-default\\s*\\r?\\n\\s*- desktop-reduced`, "u"),
      `${dimension} condition closure`
    );
  }
  assert.match(handoff, /kind:\s+implementation_web[\s\S]*acquisition:\s+complete/u);

  const screen = await readFile(path.join(fixture, "project_context", "areas", "invoice-ops", "screens", "invoice-board.md"), "utf8");
  const design = await readFile(path.join(fixture, "DESIGN.md"), "utf8");
  assert.match(screen, /invoice-board-desktop-v1[\s\S]*sha256:f285fac663d8d08f1d201918a6ce7ebaebc417d80e77bd483f25dc397f24ef98/u);
  assert.match(screen, /od:\/\/projects\/invoice-operations-lab\/invoice-board/u);
  assert.match(screen, /desktop Web, 1440 × 900, light/u);
  assert.match(design, /invoice-board-desktop-v1[\s\S]*canonical owner:[\s\S]*invoice-board\.md#design-target-references/u);
  assert.doesNotMatch(design, /f285fac663d8d08f1d201918a6ce7ebaebc417d80e77bd483f25dc397f24ef98|od:\/\/projects\/invoice-operations-lab\/invoice-board/u);

  const routed = await resolveContext(fixture, {
    terms: task.terms,
    paths: task.paths,
    facets: task.facets
  });
  const routedFiles = [...routed.required, ...routed.candidates];
  assert.ok(routedFiles.includes("project_context/areas/invoice-ops/screens/invoice-board.md"));

  const temp = await mkdtemp(path.join(os.tmpdir(), "mechanism-uiux-trace-"));
  try {
    const trace = path.join(temp, "trace.json");
    await writeFile(trace, `${JSON.stringify({
      schema_version: "tiny-context-host-trace-v1",
      source: "host_tool_trace",
      context_files_read: gold.controlling_context,
      source_files_read: gold.required_source_reads,
      context_read_rounds: 2
    })}\n`);
    const metrics = await contextMetrics(fixture, gold, {}, trace);
    assert.equal(metrics.controlling_context_recall, 1);
    assert.equal(metrics.selected_source_recall, 1);
    assert.deepEqual(metrics.required_source_missing, []);

    await writeFile(trace, `${JSON.stringify({
      schema_version: "tiny-context-host-trace-v1",
      source: "host_tool_trace",
      context_files_read: gold.controlling_context,
      source_files_read: ["../outside-source.md"],
      context_read_rounds: 2
    })}\n`);
    const unsafe = await contextMetrics(fixture, gold, {
      context_files_read: gold.controlling_context,
      source_files_read: gold.required_source_reads,
      context_read_rounds: 2
    }, trace);
    assert.equal(unsafe.selection_source, "invalid_host_trace_fallback_to_agent_report");
    assert.equal(unsafe.selection_confidence, "diagnostic");
  } finally {
    await rm(temp, { recursive: true, force: true });
  }

  const hidden = await readFile(path.join(mechanismRoot, "hidden", task.probe), "utf8");
  for (let index = 1; index <= 7; index += 1) {
    assert.match(hidden, new RegExp(`UIUX-${String(index).padStart(3, "0")}`, "u"));
  }
  assert.match(hidden, /event\.command === "design-resource preflight"/u);
  const prepare = await readFile(path.join(mechanismRoot, "runner", "prepare.mjs"), "utf8");
  assert.match(prepare, /args\[0\] === "design-resource" && args\[1\] === "preflight"/u);
});

test("prepare keeps hidden/gold outside the run and records strict pair identity", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "mechanism-prepare-"));
  try {
    const runDir = path.join(temp, "run");
    const result = await prepareMechanismRun({
      task: "local-rounding-bug",
      variant: "context-resolve-r0",
      pairId: "pair-a",
      replicate: 1,
      model: "fixed-model",
      reasoning: "fixed-reasoning",
      outDir: runDir,
      force: true,
      skipHarnessInit: true
    });
    assert.equal(result.pair_id, "pair-a");
    assert.equal(result.model, "fixed-model");
    assert.equal(result.protocol_status, "calibration");
    assert.equal(result.harness_initialized, false);
    assert.match(await readFile(result.prompt, "utf8"), /Do not inspect.*gold files.*hidden probes/iu);
    await assert.rejects(readFile(path.join(runDir, "gold", "local-rounding-bug.json"), "utf8"));
    await assert.rejects(readFile(path.join(runDir, "hidden", "local-rounding-bug.mjs"), "utf8"));
    assert.match(await readFile(path.join(runDir, "AGENTS.md"), "utf8"), /Context Resolve R0/);
    await assert.doesNotReject(readFile(path.join(runDir, "tools", "context-resolve-r0.mjs"), "utf8"));
    await assert.rejects(prepareMechanismRun({
      task: "local-rounding-bug",
      variant: "context-resolve-r0",
      pairId: "pair-without-replicate",
      model: "fixed-model",
      reasoning: "fixed-reasoning",
      outDir: path.join(temp, "missing-replicate"),
      force: true,
      skipHarnessInit: true
    }), /positive integer --replicate/iu);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("score and compare fail closed until quality, Context, and traced reads are present", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "mechanism-score-"));
  try {
    const baselineDir = path.join(temp, "baseline");
    const candidateDir = path.join(temp, "candidate");
    const common = { task: "local-rounding-bug", pairId: "rounding-pair", replicate: 1, model: "fixed-model", reasoning: "fixed-reasoning", force: true, skipHarnessInit: true };
    await prepareMechanismRun({ ...common, variant: "context-current-main", outDir: baselineDir });
    await prepareMechanismRun({ ...common, variant: "context-resolve-r0", outDir: candidateDir });

    for (const runDir of [baselineDir, candidateDir]) {
      await writeFile(path.join(runDir, "src", "billing", "money.mjs"), `export function roundMoney(value) {\n  if (!Number.isFinite(value)) throw new TypeError("money value must be finite");\n  const shifted = Number(\`${"${value}"}e2\`);\n  return Number(\`${"${Math.round(shifted)}"}e-2\`);\n}\n\nexport function calculateInvoiceTotal({ subtotal, taxRate }) {\n  return roundMoney(subtotal + subtotal * taxRate);\n}\n`);
      const metadata = JSON.parse(await readFile(path.join(runDir, ".benchmark", "mechanism-run.json"), "utf8"));
      const gold = JSON.parse(await readFile(path.join(mechanismRoot, "gold", "local-rounding-bug.json"), "utf8"));
      await writeFile(path.join(runDir, ".benchmark", "agent-result.json"), `${JSON.stringify({
        task_id: "local-rounding-bug",
        variant_id: metadata.variant_id,
        context_delta: "none",
        context_files_read: gold.controlling_context,
        context_read_rounds: 2,
        context_selection_source: "agent_reported",
        verification_commands: [{ command: "npm test", status: "passed" }],
        conformance_completed: true,
        preflight_reports: [],
        compile_report: null,
        notes: "calibration"
      }, null, 2)}\n`);
    }

    const calibrationBaseline = await scoreMechanismRun({ runDir: baselineDir });
    const calibrationCandidate = await scoreMechanismRun({ runDir: candidateDir });
    assert.equal(calibrationBaseline.metrics.hard_gate_passed, true);
    const b0 = path.join(temp, "b0.json"); const c0 = path.join(temp, "c0.json");
    await writeFile(b0, `${JSON.stringify(calibrationBaseline)}\n`); await writeFile(c0, `${JSON.stringify(calibrationCandidate)}\n`);
    const calibrationPair = await compareMechanismScores({ baselineScore: b0, candidateScore: c0 });
    assert.equal(calibrationPair.decision_eligible, false);
    assert.match(calibrationPair.interpretation, /calibration-only/iu);

    const invalidTrace = path.join(temp, "invalid-trace.json");
    await writeFile(invalidTrace, `${JSON.stringify({ context_files_read: ["project_context/global.md"], context_read_rounds: 1 })}\n`);
    const invalidTraceBaseline = await scoreMechanismRun({ runDir: baselineDir, trace: invalidTrace });
    const invalidTraceCandidate = await scoreMechanismRun({ runDir: candidateDir, trace: invalidTrace });
    for (const score of [invalidTraceBaseline, invalidTraceCandidate]) {
      score.run.protocol_status = "formal";
      score.run.harness_initialized = true;
    }
    const invalidB = path.join(temp, "invalid-b.json"); const invalidC = path.join(temp, "invalid-c.json");
    await writeFile(invalidB, `${JSON.stringify(invalidTraceBaseline)}\n`); await writeFile(invalidC, `${JSON.stringify(invalidTraceCandidate)}\n`);
    const invalidTracePair = await compareMechanismScores({ baselineScore: invalidB, candidateScore: invalidC });
    assert.equal(invalidTracePair.decision_eligible, false);
    assert.equal(invalidTracePair.metrics.evidence_sufficient, false);

    const trace = path.join(temp, "trace.json");
    const gold = JSON.parse(await readFile(path.join(mechanismRoot, "gold", "local-rounding-bug.json"), "utf8"));
    await writeFile(trace, `${JSON.stringify({ schema_version: "tiny-context-host-trace-v1", source: "host_tool_trace", context_files_read: gold.controlling_context, context_read_rounds: 2 })}\n`);
    const baseline = await scoreMechanismRun({ runDir: baselineDir, trace });
    const candidate = await scoreMechanismRun({ runDir: candidateDir, trace });
    baseline.run.protocol_status = "formal";
    candidate.run.protocol_status = "formal";
    baseline.run.harness_initialized = true;
    candidate.run.harness_initialized = true;
    const b1 = path.join(temp, "b1.json"); const c1 = path.join(temp, "c1.json");
    await writeFile(b1, `${JSON.stringify(baseline)}\n`); await writeFile(c1, `${JSON.stringify(candidate)}\n`);
    const eligiblePair = await compareMechanismScores({ baselineScore: b1, candidateScore: c1 });
    assert.equal(eligiblePair.decision_eligible, true);
    const pairFile = path.join(temp, "pair.json"); await writeFile(pairFile, `${JSON.stringify(eligiblePair)}\n`);
    const aggregate = await aggregateComparisons({ scores: [pairFile] });
    assert.equal(aggregate.decision_eligible, false);
    assert.equal(aggregate.decision, "INSUFFICIENT_PAIRED_RUNS");
    await assert.rejects(aggregateComparisons({ scores: [pairFile, pairFile, pairFile] }), /distinct paired runs/iu);

    const pair2 = structuredClone(eligiblePair); pair2.replicate = 2;
    const pair3 = structuredClone(eligiblePair); pair3.replicate = 3;
    const pair2File = path.join(temp, "pair-2.json"); const pair3File = path.join(temp, "pair-3.json");
    await writeFile(pair2File, `${JSON.stringify(pair2)}\n`); await writeFile(pair3File, `${JSON.stringify(pair3)}\n`);
    const threePairs = await aggregateComparisons({ scores: [pairFile, pair2File, pair3File] });
    assert.equal(threePairs.eligible_pair_count, 3);
    assert.equal(threePairs.decision_eligible, true);

    pair3.run_identity.reasoning = "different-reasoning";
    await writeFile(pair3File, `${JSON.stringify(pair3)}\n`);
    await assert.rejects(aggregateComparisons({ scores: [pairFile, pair2File, pair3File] }), /share fixed model, reasoning/iu);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});





test("Context Delta scoring rejects touch-only updates and checks durable semantics", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "mechanism-context-delta-"));
  try {
    const runDir = path.join(temp, "run");
    await prepareMechanismRun({
      task: "cross-module-receipt-event",
      variant: "workflow-current",
      pairId: "context-delta",
      replicate: 1,
      model: "fixed-model",
      reasoning: "fixed-reasoning",
      outDir: runDir,
      force: true,
      skipHarnessInit: true
    });
    const gold = JSON.parse(await readFile(path.join(mechanismRoot, "gold", "cross-module-receipt-event.json"), "utf8"));
    const touched = [...gold.required_context_updates];
    const touchOnly = await contextUpdateMetrics(runDir, gold, touched);
    assert.equal(touchOnly.correct, false);
    assert.ok(touchOnly.content_findings.some((item) => item.forbidden_terms_present.length > 0));

    await writeFile(path.join(runDir, "project_context", "areas", "invoice-ops", "contracts", "invoice-api.md"), "# Invoice API Contract\n\nA paid transition emits exactly one receipt, is idempotent, and a repeated request creates no additional event.\n");
    await writeFile(path.join(runDir, "project_context", "areas", "notifications.md"), "# Notifications\n\nA paid invoice creates at most one receipt; duplicate paid transition requests remain idempotent.\n");
    const updated = await contextUpdateMetrics(runDir, gold, touched);
    assert.equal(updated.correct, true);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("formal prepare overlays the fixed Context after Harness init and exposes a local CLI wrapper", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "mechanism-formal-"));
  try {
    const fakeCli = path.join(temp, "fake-cli.mjs");
    await writeFile(fakeCli, `import { mkdir, writeFile } from "node:fs/promises";\nconst [command] = process.argv.slice(2);\nif (command === "init") {\n  await mkdir(".codex", { recursive: true });\n  await mkdir("project_context/areas/main", { recursive: true });\n  await writeFile("project_context/areas/main.md", "# generated main\\n");\n  await writeFile("project_context/areas/main/verification.md", "# generated verification\\n");\n  await writeFile("AGENTS.md", "# Generated\\n\\n<!-- ty-context:managed:begin -->\\n## Default Workflow Contract\\n\\nCurrent detailed workflow.\\n\\n## Long-Task Routing\\n\\nExplicit only.\\n<!-- ty-context:managed:end -->\\n");\n} else if (command === "enable") {\n  await mkdir(".codex/skills/long-task-workflow", { recursive: true });\n  await writeFile(".codex/skills/long-task-workflow/SKILL.md", "# Long Task\\n");\n} else process.exitCode = 1;\n`);
    const runDir = path.join(temp, "run");
    await prepareMechanismRun({
      task: "authoring-structured-json",
      variant: "authoring-compact-v2",
      pairId: "authoring-formal",
      replicate: 1,
      model: "fixed-model",
      reasoning: "fixed-reasoning",
      outDir: runDir,
      harnessCli: fakeCli,
      force: true
    });
    await assert.rejects(readFile(path.join(runDir, "project_context", "areas", "main.md"), "utf8"));
    await assert.doesNotReject(readFile(path.join(runDir, "project_context", "areas", "invoice-ops.md"), "utf8"));
    await assert.doesNotReject(readFile(path.join(runDir, ".codex", "skills", "long-task-workflow", "SKILL.md"), "utf8"));
    assert.ok((await readFile(path.join(runDir, "tools", "ty-context.mjs"), "utf8")).includes(JSON.stringify(fakeCli)));
    assert.match(await readFile(path.join(runDir, ".benchmark", "prompt.md"), "utf8"), /node tools\/ty-context\.mjs/);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
