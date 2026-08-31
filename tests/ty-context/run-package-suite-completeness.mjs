export function finalizeCompleteSuiteExecution({
  execution,
  executionError,
  completions,
  lanes,
  timing,
}) {
  const completeRuntimeObservation =
    executionError === null &&
    completions.length === lanes.length &&
    timing.file_summary_integrity.status === "passed";
  execution.complete_suite = completeRuntimeObservation;
  execution.semantic_test_population_executed = completeRuntimeObservation;
  execution.registry_runtime_observation_complete = completeRuntimeObservation;
  return completeRuntimeObservation;
}
