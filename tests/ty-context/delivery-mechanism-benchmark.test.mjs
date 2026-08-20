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
  assert.equal(experiments.baseline_commit, "c030d02eee315d2860c6a2ff01c22887690f3684");
  assert.deepEqual(Object.keys(experiments.tracks).sort(), ["context-routing", "long-task-authoring", "workflow-assurance", "workflow-expression"]);
  const taskIds = [...new Set(Object.values(experiments.tracks).flatMap((track) => track.tasks))];
  assert.equal(taskIds.length, 12);
  for (const id of taskIds) {
    await assert.doesNotReject(readFile(path.join(mechanismRoot, "tasks", `${id}.json`), "utf8"));
    await assert.doesNotReject(readFile(path.join(mechanismRoot, "gold", `${id}.json`), "utf8"));
  }
  const serialized = JSON.stringify(experiments);
  assert.doesNotMatch(serialized, /benchmark-proven|completed result|speedup achieved/iu);
  assert.deepEqual(experiments.tracks["workflow-assurance"].variants, ["workflow-exact-ephemeral-baseline", "workflow-assurance-split"]);
  assert.equal(experiments.tracks["workflow-assurance"].pair_policy.minimum_pairs, 3);
  assert.equal(experiments.tracks["workflow-assurance"].pair_policy.high_variance_or_near_threshold_pairs, 5);
  assert.equal(experiments.tracks["workflow-assurance"].decision_thresholds.false_complete_free_rate, 1);
  const assuranceSources = experiments.tracks["workflow-assurance"].variants.map((id) => experiments.variants[id].guidance_source);
  assert.deepEqual(assuranceSources.map(({ commit, path }) => ({ commit, path })), [
    {
      commit: "c030d02eee315d2860c6a2ff01c22887690f3684",
      path: ".codex/ty-context-managed/agents/AGENTS_CORE.md"
    },
    {
      commit: "c8a194cc91683b5fcbe8f0b946a18af502f5dd30",
      path: ".codex/ty-context-managed/agents/AGENTS_CORE.md"
    }
  ]);
  for (const source of assuranceSources) {
    assert.equal(source.kind, "git_managed_protocol_v1");
    assert.equal(source.injection_scope, "managed_protocol");
    assert.match(source.git_blob_oid, /^[0-9a-f]{40}$/u);
    assert.match(source.file_sha256, /^[0-9a-f]{64}$/u);
    assert.equal(source.measured_section.start_heading, "## Default Workflow Contract");
    assert.equal(source.measured_section.end_heading, "## Long-Task Routing");
    assert.match(source.measured_section.sha256, /^[0-9a-f]{64}$/u);
  }
});

test("workflow assurance variants freeze the old exact default and the new model-led boundary", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "mechanism-assurance-guidance-"));
  try {
    const common = { task: "local-rounding-bug", pairId: "assurance-guidance", replicate: 1, model: "fixed-model", reasoning: "fixed-reasoning", force: true, skipHarnessInit: true };
    const baselineDir = path.join(temp, "baseline");
    const candidateDir = path.join(temp, "candidate");
    await prepareMechanismRun({ ...common, variant: "workflow-exact-ephemeral-baseline", outDir: baselineDir });
    await prepareMechanismRun({ ...common, variant: "workflow-assurance-split", outDir: candidateDir });
    const baseline = await readFile(path.join(baselineDir, "AGENTS.md"), "utf8");
    const candidate = await readFile(path.join(candidateDir, "AGENTS.md"), "utf8");
    const baselineMetadata = JSON.parse(await readFile(path.join(baselineDir, ".benchmark", "mechanism-run.json"), "utf8"));
    const candidateMetadata = JSON.parse(await readFile(path.join(candidateDir, ".benchmark", "mechanism-run.json"), "utf8"));
    assert.match(baseline, /Expected Semantic Facts = Source Indexed Facts = implementation\/acceptance accounted Facts/u);
    assert.match(baseline, /Fact × required-method obligations = attributable current-candidate result rows/u);
    assert.doesNotMatch(candidate, /Expected Semantic Facts = Source Indexed Facts/u);
    assert.match(candidate, /model-led default Workflow Contract for work of any complexity/u);
    assert.match(candidate, /Perform evidence-bounded Contract Conformance/u);
    assert.match(candidate, /Report `Implemented`, `Verified`, `Unverified`, `Blocked \/ decision required`/u);
    assert.equal(baselineMetadata.workflow_instruction_bytes, workflowInstructionBytes(baseline));
    assert.equal(candidateMetadata.workflow_instruction_bytes, workflowInstructionBytes(candidate));
    const experiments = JSON.parse(await readFile(path.join(mechanismRoot, "experiment-set.json"), "utf8"));
    assert.deepEqual(baselineMetadata.workflow_guidance_source, expectedGuidanceProvenance(experiments.variants["workflow-exact-ephemeral-baseline"].guidance_source));
    assert.deepEqual(candidateMetadata.workflow_guidance_source, expectedGuidanceProvenance(experiments.variants["workflow-assurance-split"].guidance_source));
    assert.notEqual(baselineMetadata.workflow_guidance_source.commit, candidateMetadata.workflow_guidance_source.commit);
    const guidance = await readFile(path.join(mechanismRoot, "runner", "guidance.mjs"), "utf8");
    assert.doesNotMatch(guidance, /function exactEphemeralBaselineWorkflow/u);
    assert.doesNotMatch(guidance, /function assuranceSplitWorkflow/u);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("small high-assurance work selects Long-Task without activating it", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "mechanism-assurance-route-"));
  try {
    const task = JSON.parse(await readFile(path.join(mechanismRoot, "tasks", "small-high-assurance-route.json"), "utf8"));
    assert.doesNotMatch(task.prompt, /Task size must not decide the route|proof-floor choice/iu);
    assert.match(task.prompt, /recoverable in a later session/iu);
    assert.match(task.prompt, /independently locatable and rerunnable acceptance check/iu);
    const runDir = path.join(temp, "run");
    await prepareMechanismRun({
      task: "small-high-assurance-route",
      variant: "workflow-assurance-split",
      pairId: "assurance-route",
      replicate: 1,
      model: "fixed-model",
      reasoning: "fixed-reasoning",
      outDir: runDir,
      force: true,
      skipHarnessInit: true
    });
    const metadata = JSON.parse(await readFile(path.join(runDir, ".benchmark", "mechanism-run.json"), "utf8"));
    const gold = JSON.parse(await readFile(path.join(mechanismRoot, "gold", "small-high-assurance-route.json"), "utf8"));
    await writeFile(path.join(runDir, ".benchmark", "agent-result.json"), `${JSON.stringify({
      task_id: metadata.task_id,
      variant_id: metadata.variant_id,
      context_delta: "none",
      context_files_read: gold.controlling_context,
      context_read_rounds: 1,
      context_selection_source: "agent_reported",
      source_files_read: [],
      verification_commands: [],
      conformance_completed: false,
      selected_workflow_route: "long_task",
      completion_status: "complete",
      implemented_scope: ["workflow route decision"],
      verified_scope: ["assurance criteria mapped to the explicit route"],
      unverified_scope: [],
      blocked_scope: [],
      preflight_reports: [],
      compile_report: null,
      notes: "route only; Long-Task was not activated"
    }, null, 2)}\n`);
    await writeFile(path.join(runDir, ".benchmark", "observer-state.json"), `${JSON.stringify({ duration_ms: 1200 })}\n`);
    const trace = path.join(temp, "trace.json");
    await writeFile(trace, `${JSON.stringify({
      schema_version: "tiny-context-host-trace-v1",
      source: "host_tool_trace",
      context_files_read: gold.controlling_context,
      source_files_read: [],
      context_read_rounds: 1,
      total_tool_calls: 4,
      pre_implementation_tool_calls: 4,
      formal_enumeration_tool_calls: 0,
      total_tokens: 1800
    })}\n`);
    const score = await scoreMechanismRun({ runDir, trace });
    assert.equal(score.metrics.hard_gate_passed, true);
    assert.equal(score.metrics.handoff.workflow_route_correct, true);
    assert.equal(score.metrics.change_scope.correct, true);
    assert.equal(score.metrics.execution_cost.confidence, "high_host_trace");
    assert.equal(score.metrics.execution_cost.total_tool_calls, 4);
    await assert.rejects(readFile(path.join(runDir, "delivery-contract.yaml"), "utf8"));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

function workflowInstructionBytes(agents) {
  const start = agents.indexOf("## Default Workflow Contract");
  const end = agents.indexOf("## Long-Task Routing");
  assert.ok(start >= 0 && end > start);
  assert.equal(agents.indexOf("## Default Workflow Contract", start + 1), -1);
  assert.equal(agents.indexOf("## Long-Task Routing", end + 1), -1);
  return Buffer.byteLength(agents.slice(start, end), "utf8");
}

function expectedGuidanceProvenance(source) {
  return {
    kind: source.kind,
    commit: source.commit,
    path: source.path,
    git_blob_oid: source.git_blob_oid,
    file_sha256: source.file_sha256,
    measured_section_sha256: source.measured_section.sha256
  };
}

test("workflow assurance aggregation expands from three to five pairs only under the frozen cost rule", async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), "mechanism-assurance-pairs-"));
  try {
    const identity = {
      model: "fixed-model",
      reasoning: "fixed-reasoning",
      baseline_commit: "c030d02eee315d2860c6a2ff01c22887690f3684",
      fixture_sha256: "fixture",
      experiment_set_sha256: "experiment",
      baseline_source_checkout_commit: "source",
      candidate_source_checkout_commit: "source"
    };
    const files = [];
    for (let index = 1; index <= 3; index += 1) {
      const comparison = {
        track: "workflow-assurance",
        task_id: "local-rounding-bug",
        pair_id: `pair-${index}`,
        replicate: index,
        baseline_variant: "workflow-exact-ephemeral-baseline",
        candidate_variant: "workflow-assurance-split",
        run_identity: identity,
        decision_eligible: true,
        metrics: {
          hidden_quality_equal: true,
          context_update_equal: true,
          candidate_context_recall: 1,
          candidate_selected_source_recall: 1,
          irrelevant_context_bytes_reduction: 0,
          read_round_reduction: 0,
          instruction_bytes_reduction: 0.3,
          hard_gates_passed: true,
          conformance_preserved: true,
          workflow_route_correct: true,
          owner_scope_conformance: true,
          false_complete_free: true,
          honest_handoff: true,
          total_tool_call_reduction: 0.2,
          pre_implementation_tool_call_reduction: 0.2,
          formal_enumeration_tool_call_reduction: 0.5,
          token_reduction: 0.2,
          elapsed_reduction: 0.2
        }
      };
      const file = path.join(temp, `pair-${index}.json`);
      await writeFile(file, `${JSON.stringify(comparison)}\n`);
      files.push(file);
    }
    const base = await aggregateComparisons({ scores: files });
    assert.equal(base.minimum_recommended_pairs, 3);
    assert.equal(base.decision_eligible, true);
    assert.equal(base.pair_requirement_reason, "base_sufficient");

    for (const file of files) {
      const comparison = JSON.parse(await readFile(file, "utf8"));
      comparison.metrics.total_tool_call_reduction = 0.03;
      await writeFile(file, `${JSON.stringify(comparison)}\n`);
    }
    const expanded = await aggregateComparisons({ scores: files });
    assert.equal(expanded.minimum_recommended_pairs, 5);
    assert.equal(expanded.decision_eligible, false);
    assert.match(expanded.pair_requirement_reason, /near:total_tool_call_reduction/u);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("prompt, Context, and Skill packaging equivalence requires independent paired Agent evidence", async () => {
  const verification = await readFile(
    path.join(repoRoot, "project_context", "areas", "harness-package", "verification.md"),
    "utf8",
  );

  assert.match(
    verification,
    /Static\/unit tests may prove instruction distribution, canonical-source parity, core-runtime identity, route eligibility and known semantic invariants/iu,
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
        selected_workflow_route: "default",
        completion_status: "complete",
        implemented_scope: ["rounding implementation and regression coverage"],
        verified_scope: ["hidden behavior and npm test"],
        unverified_scope: [],
        blocked_scope: [],
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
