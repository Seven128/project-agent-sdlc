import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  changedPaths,
  contextMetrics,
  contextUpdateMetrics,
  observerElapsed,
  runHiddenProbe,
  runVerification
} from "./metrics.mjs";
import { authoringMetrics } from "./authoring-metrics.mjs";
import { loadGold, readJson, writeJson } from "./shared.mjs";

export async function scoreMechanismRun(options) {
  const runDir = path.resolve(options.runDir);
  const metadata = await readJson(path.join(runDir, ".benchmark", "mechanism-run.json"));
  const task = metadata.task;
  const gold = await loadGold(task.id);
  const agentResultPath = path.join(runDir, ".benchmark", "agent-result.json");
  const agentResult = existsSync(agentResultPath) ? await readJson(agentResultPath) : {};
  const changed = await changedPaths(runDir, metadata.initial_commit);
  const agentIdentityCorrect = agentResult.task_id === metadata.task_id && agentResult.variant_id === metadata.variant_id;
  const elapsed = await observerElapsed(runDir);
  const common = {
    schema_version: "tiny-context-mechanism-score-v1",
    scored_at: new Date().toISOString(),
    run: metadata,
    changed_paths: changed,
    elapsed,
    agent_result_present: existsSync(agentResultPath),
    agent_identity_correct: agentIdentityCorrect,
    agent_result: agentResult
  };
  let metrics;
  if (task.track_family === "long-task-authoring") {
    const authoring = await authoringMetrics(runDir, task, gold, agentResult);
    metrics = {
      authoring,
      hard_gate_passed: agentIdentityCorrect && authoring.preflight_ready && authoring.compile_success && authoring.gold_compliance_passed,
      confidence: {
        authority: authoring.compile_success ? "high_machine_projection" : "unavailable",
        authoring_cost: elapsed.duration_ms !== null ? "high_elapsed_plus_machine_shape" : "machine_shape_only",
        preflight_rounds: authoring.preflight_evidence_source
      }
    };
  } else {
    const probe = await runHiddenProbe(runDir, task.probe);
    const verification = runVerification(runDir, gold.required_verification);
    const updates = await contextUpdateMetrics(runDir, gold, changed);
    const context = await contextMetrics(runDir, gold, agentResult, options.trace);
    const reportedDeltaCorrect = agentResult.context_delta === gold.expected_context_delta;
    const conformance = agentResult.conformance_completed === true;
    metrics = {
      hidden_quality: probe,
      native_verification: verification,
      context_update: updates,
      context_routing: context,
      reported_context_delta_correct: reportedDeltaCorrect,
      conformance_completed: conformance,
      workflow_instruction_bytes: metadata.workflow_instruction_bytes,
      hard_gate_passed: agentIdentityCorrect
        && probe.decision === "PASS"
        && verification.every((item) => item.passed)
        && updates.correct
        && reportedDeltaCorrect
        && (context.required_source_total === 0 || context.selected_source_recall === 1),
      confidence: {
        product_quality: "high_hidden_probe",
        native_verification: "high_operator_executed",
        context_update: "high_git_diff",
        context_selection: context.selection_confidence,
        conformance: "diagnostic_agent_reported"
      }
    };
  }
  const report = { ...common, metrics };
  const out = path.resolve(options.out ?? path.join(runDir, ".benchmark", "mechanism-score.json"));
  await writeJson(out, report);
  return report;
}
