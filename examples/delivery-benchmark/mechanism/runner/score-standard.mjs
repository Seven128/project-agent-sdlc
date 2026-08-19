import {
  changeScopeMetrics,
  contextMetrics,
  contextUpdateMetrics,
  handoffMetrics,
  hostTraceCostMetrics,
  runHiddenProbe,
  runVerification,
} from "./metrics.mjs";
import { authoringMetrics } from "./authoring-metrics.mjs";
import {
  implementationCompleted,
  implementationConfidence,
} from "./score-common.mjs";

export async function scoreAuthoringRun(context) {
  const { runDir, task, gold, agentResult, agentIdentityCorrect, elapsed } =
    context;
  const authoring = await authoringMetrics(runDir, task, gold, agentResult);
  return {
    authoring,
    hard_gate_passed:
      agentIdentityCorrect &&
      authoring.preflight_ready &&
      authoring.compile_success &&
      authoring.gold_compliance_passed,
    confidence: {
      authority: authoring.compile_success
        ? "high_machine_projection"
        : "unavailable",
      authoring_cost:
        elapsed.duration_ms !== null
          ? "high_elapsed_plus_machine_shape"
          : "machine_shape_only",
      preflight_rounds: authoring.preflight_evidence_source,
    },
  };
}

export async function scoreDefaultRun(context) {
  const {
    options,
    runDir,
    metadata,
    task,
    gold,
    agentResult,
    changed,
    agentIdentityCorrect,
  } = context;
  const probe = await runHiddenProbe(runDir, task.probe);
  const verification = runVerification(runDir, gold.required_verification);
  const updates = await contextUpdateMetrics(runDir, gold, changed);
  const routedContext = await contextMetrics(
    runDir,
    gold,
    agentResult,
    options.trace,
  );
  const changeScope = changeScopeMetrics(changed, gold);
  const executionCost = await hostTraceCostMetrics(options.trace);
  const reportedDeltaCorrect =
    agentResult.context_delta === gold.expected_context_delta;
  const conformance = agentResult.conformance_completed === true;
  const expectedRoute = gold.expected_workflow_route ?? null;
  const routeCorrect =
    expectedRoute == null ||
    agentResult.selected_workflow_route === expectedRoute;
  const actualComplete = implementationCompleted({
    probe,
    verification,
    updates,
    reportedDeltaCorrect,
    changeScope,
    routeCorrect,
    gold,
    conformance,
    context: routedContext,
  });
  const handoff = handoffMetrics(agentResult, actualComplete, expectedRoute);
  return {
    hidden_quality: probe,
    native_verification: verification,
    context_update: updates,
    context_routing: routedContext,
    change_scope: changeScope,
    execution_cost: executionCost,
    handoff,
    reported_context_delta_correct: reportedDeltaCorrect,
    conformance_required: gold.conformance_required === true,
    conformance_completed: conformance,
    workflow_instruction_bytes: metadata.workflow_instruction_bytes,
    hard_gate_passed:
      agentIdentityCorrect &&
      actualComplete &&
      handoff.false_complete_free &&
      handoff.honest_handoff,
    confidence: implementationConfidence({
      changeScope,
      context: routedContext,
      executionCost,
    }),
  };
}
