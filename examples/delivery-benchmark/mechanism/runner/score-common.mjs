export function implementationCompleted({
  probe,
  verification,
  updates,
  reportedDeltaCorrect,
  changeScope,
  routeCorrect,
  gold,
  conformance,
  context,
}) {
  return (
    probe.decision === "PASS" &&
    verification.every((item) => item.passed) &&
    updates.correct &&
    reportedDeltaCorrect &&
    changeScope.correct &&
    routeCorrect &&
    (!gold.conformance_required || conformance) &&
    (context.required_source_total === 0 ||
      context.selected_source_recall === 1)
  );
}

export function implementationConfidence({
  changeScope,
  context,
  executionCost,
}) {
  return {
    product_quality: "high_hidden_probe",
    native_verification: "high_operator_executed",
    context_update: "high_git_diff",
    change_scope: changeScope.evaluated ? "high_git_diff" : "unavailable",
    context_selection: context.selection_confidence,
    conformance: "diagnostic_agent_reported",
    handoff: "diagnostic_agent_reported_bounded_by_machine_outcome",
    execution_cost: executionCost.confidence,
  };
}
