const COMPLETE_SUITE_NAMES = new Set([
  "default",
  "long-task",
  "long-task-trust",
]);

const CONTROLLED_NODE_ENVIRONMENT_KEYS = [
  "NODE_OPTIONS",
  "NODE_TEST_CONTEXT",
  "NODE_PATH",
];

export const INCOMPLETE_SUITE_EXECUTION_FACTS = Object.freeze({
  complete_suite: false,
  semantic_test_population_executed: false,
  registry_runtime_observation_complete: false,
});

export function assertCompleteSuiteInvocation({
  argumentsAfterScript,
  execArgv,
  environment,
}) {
  if (argumentsAfterScript.length !== 1)
    throw new Error("complete_suite_extra_arguments_forbidden");
  const [suite] = argumentsAfterScript;
  if (!COMPLETE_SUITE_NAMES.has(suite))
    throw new Error(
      "complete_suite_invalid_suite:expected_default_long-task_or_long-task-trust",
    );
  if (execArgv.length !== 0)
    throw new Error("complete_suite_execution_envelope_forbidden:execArgv");
  for (const key of CONTROLLED_NODE_ENVIRONMENT_KEYS) {
    const value = environment[key];
    if (value !== undefined && value !== "")
      throw new Error(`complete_suite_execution_envelope_forbidden:${key}`);
  }
  return suite;
}

export function assertCompleteSuiteLanePlan({
  selectedFiles,
  lanes,
  maxFilesPerLane = Number.POSITIVE_INFINITY,
}) {
  if (!Array.isArray(selectedFiles) || selectedFiles.length === 0)
    throw new Error("complete_suite_lane_plan_empty_population");
  if (new Set(selectedFiles).size !== selectedFiles.length)
    throw new Error("complete_suite_lane_plan_duplicate_selected_root");
  if (!Array.isArray(lanes) || lanes.length === 0)
    throw new Error("complete_suite_lane_plan_empty");

  const selected = new Set(selectedFiles);
  const laneKeys = new Set();
  const plannedFiles = new Set();
  for (const lane of lanes) {
    if (typeof lane?.key !== "string" || lane.key.trim() === "")
      throw new Error("complete_suite_lane_plan_invalid_key");
    if (laneKeys.has(lane.key))
      throw new Error(`complete_suite_lane_plan_duplicate_key:${lane.key}`);
    laneKeys.add(lane.key);
    if (!Array.isArray(lane.names) || lane.names.length === 0)
      throw new Error(`complete_suite_lane_plan_empty_lane:${lane.key}`);
    if (!Number.isInteger(lane.concurrency) || lane.concurrency < 1)
      throw new Error(
        `complete_suite_lane_plan_invalid_concurrency:${lane.key}`,
      );
    if (lane.names.length > maxFilesPerLane)
      throw new Error(
        `complete_suite_lane_plan_batch_limit_exceeded:${lane.key}`,
      );

    const laneFiles = new Set();
    for (const file of lane.names) {
      if (typeof file !== "string" || file.length === 0)
        throw new Error(`complete_suite_lane_plan_invalid_file:${lane.key}`);
      if (laneFiles.has(file))
        throw new Error(`complete_suite_lane_plan_duplicate_in_lane:${file}`);
      laneFiles.add(file);
      if (!selected.has(file))
        throw new Error(`complete_suite_lane_plan_extra_root:${file}`);
      if (plannedFiles.has(file))
        throw new Error(`complete_suite_lane_plan_duplicate_root:${file}`);
      plannedFiles.add(file);
    }
  }

  const missing = selectedFiles.filter((file) => !plannedFiles.has(file));
  if (missing.length > 0)
    throw new Error(
      `complete_suite_lane_plan_missing_roots:${missing.join(",")}`,
    );
  return true;
}

export function evaluateCompleteSuiteExecution({
  executionError,
  selectedFiles,
  completions,
  lanes,
  timing,
}) {
  if (executionError !== null || !Array.isArray(lanes) || lanes.length === 0)
    return false;
  if (
    !Array.isArray(completions) ||
    completions.length !== lanes.length ||
    !Array.isArray(selectedFiles) ||
    selectedFiles.length === 0
  )
    return false;

  const laneKeys = new Set();
  const completionKeys = new Set();
  for (let index = 0; index < lanes.length; index += 1) {
    const laneKey = lanes[index]?.key;
    const completion = completions[index];
    if (
      typeof laneKey !== "string" ||
      laneKey.length === 0 ||
      laneKeys.has(laneKey) ||
      completion?.lane_key !== laneKey ||
      completionKeys.has(completion.lane_key) ||
      !Number.isInteger(completion.code) ||
      completion.signal !== null
    )
      return false;
    laneKeys.add(laneKey);
    completionKeys.add(completion.lane_key);
  }

  const integrity = timing?.file_summary_integrity;
  return (
    timing?.file_count === selectedFiles.length &&
    timing?.missing_file_count === 0 &&
    integrity?.required === true &&
    integrity?.status === "passed" &&
    Array.isArray(integrity.missing_files) &&
    integrity.missing_files.length === 0 &&
    Array.isArray(integrity.duplicate_files) &&
    integrity.duplicate_files.length === 0
  );
}

export function finalizeCompleteSuiteExecution(input) {
  const completeRuntimeObservation = evaluateCompleteSuiteExecution(input);
  const { execution } = input;
  execution.complete_suite = completeRuntimeObservation;
  execution.semantic_test_population_executed = completeRuntimeObservation;
  execution.registry_runtime_observation_complete = completeRuntimeObservation;
  return completeRuntimeObservation;
}
