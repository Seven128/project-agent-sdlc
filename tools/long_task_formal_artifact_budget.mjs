import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CASE_IDS,
  MEASUREMENT_THRESHOLDS,
  VARIANT_IDS,
} from "./long_task_real_process_roi_policy.mjs";

const MiB = 1024 * 1024;
const canonicalCatalogPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "examples",
  "delivery-benchmark",
  "real-process-workload",
  "formal-scenario-catalog.json",
);

export function deriveExpectedFormalArtifactBudget(catalog) {
  if (!catalog || !Array.isArray(catalog.scenarios))
    throw new Error("formal_artifact_budget_catalog");
  let executionCount = 0;
  let computeRecordCount = 0;
  let stateExecutionCount = 0;
  let providerExecutionCount = 0;
  const scenarioIds = new Set();
  for (const scenario of catalog.scenarios) {
    if (
      !scenario ||
      typeof scenario.scenario_id !== "string" ||
      scenarioIds.has(scenario.scenario_id) ||
      !Number.isSafeInteger(scenario.pair_count) ||
      scenario.pair_count <= 0 ||
      !Array.isArray(scenario.comparison_variants) ||
      scenario.comparison_variants.length === 0
    )
      throw new Error("formal_artifact_budget_scenario");
    scenarioIds.add(scenario.scenario_id);
    const executions =
      scenario.pair_count * scenario.comparison_variants.length;
    executionCount += executions;
    const meters = scenario.measurement_profile?.meters;
    if (meters?.compute_ms?.presence === "required")
      computeRecordCount += executions;
    if (meters?.storage_byte_hour?.presence === "required")
      stateExecutionCount += executions;
    if (scenario.measurement_profile?.provider_event?.presence === "required")
      providerExecutionCount += executions;
  }
  const baseArtifactCount = executionCount * 6;
  const stateArtifactCount = stateExecutionCount * 2;
  const providerArtifactCount = providerExecutionCount * 2;
  const expectedRunnerArtifactCount =
    baseArtifactCount +
    computeRecordCount +
    stateArtifactCount +
    providerArtifactCount;
  const maximums = {
    maximum_scenario_output_bytes: MiB,
    maximum_raw_prompt_bytes: MiB,
    maximum_state_payload_bytes: 4 * MiB,
    maximum_state_source_files: 128,
    maximum_combined_stream_bytes: 2 * MiB,
    maximum_event_bytes: 128 * 1024,
    maximum_measurement_record_bytes: 64 * 1024,
    maximum_lifecycle_file_bytes: 64 * MiB,
    maximum_package_tarball_bytes: 16 * MiB,
    maximum_materialization_command_output_bytes: 4 * MiB,
  };
  const formalWorstCaseBytes =
    executionCount *
      (maximums.maximum_event_bytes +
        maximums.maximum_scenario_output_bytes +
        maximums.maximum_combined_stream_bytes +
        2 * maximums.maximum_measurement_record_bytes) +
    computeRecordCount * maximums.maximum_measurement_record_bytes +
    stateExecutionCount *
      (maximums.maximum_measurement_record_bytes +
        maximums.maximum_state_payload_bytes) +
    providerExecutionCount *
      (maximums.maximum_raw_prompt_bytes +
        maximums.maximum_measurement_record_bytes);
  const formalFileHeadroom = 64;
  const formalByteHeadroom = 32 * MiB;
  const precollectionMaximumFiles = 256;
  const precollectionMaximumBytes = 64 * MiB;
  const frozenInputMaximumFiles = 256;
  const frozenInputMaximumBytes = 64 * MiB;
  const materializationCommandsPerVariant = 9;
  const setupMaximumFiles =
    3 * (2 + materializationCommandsPerVariant * 3);
  const setupMaximumBytes =
    3 *
    (maximums.maximum_package_tarball_bytes +
      materializationCommandsPerVariant *
        (maximums.maximum_materialization_command_output_bytes +
          maximums.maximum_measurement_record_bytes));
  const lifecycleRunCount =
    MEASUREMENT_THRESHOLDS.expanded_repeats * VARIANT_IDS.length;
  const attackCaseCount = CASE_IDS.length - 1;
  const lifecycleCommandsPerRun =
    (CASE_IDS.length + attackCaseCount) * 7;
  const lifecycleMaximumFilesPerRun =
    lifecycleCommandsPerRun * 3 +
    CASE_IDS.length +
    attackCaseCount +
    2 +
    4;
  const lifecycleMaximumFiles =
    lifecycleRunCount * lifecycleMaximumFilesPerRun;
  const lifecycleMaximumBytes = lifecycleRunCount * 16 * MiB;
  const indexedRootFiles = 4;
  const indexedRootMaximumBytes = 16 * MiB;
  const runSetFileHeadroom = 128;
  const runSetByteHeadroom = 64 * MiB;
  const maximumRunSetControlFiles = 2;
  const maximumRunSetControlTotalBytes = 4 * MiB;
  return Object.freeze({
    expected_execution_count: executionCount,
    base_artifact_count: baseArtifactCount,
    compute_record_count: computeRecordCount,
    state_execution_count: stateExecutionCount,
    state_artifact_count: stateArtifactCount,
    provider_execution_count: providerExecutionCount,
    provider_artifact_count: providerArtifactCount,
    expected_runner_artifact_count: expectedRunnerArtifactCount,
    formal_file_headroom: formalFileHeadroom,
    formal_worst_case_bytes: formalWorstCaseBytes,
    formal_byte_headroom: formalByteHeadroom,
    maximum_formal_files: expectedRunnerArtifactCount + formalFileHeadroom,
    maximum_formal_total_bytes: formalWorstCaseBytes + formalByteHeadroom,
    maximum_run_set_files:
      expectedRunnerArtifactCount +
      precollectionMaximumFiles +
      frozenInputMaximumFiles +
      setupMaximumFiles +
      lifecycleMaximumFiles +
      indexedRootFiles +
      runSetFileHeadroom +
      maximumRunSetControlFiles,
    maximum_run_set_total_bytes:
      formalWorstCaseBytes +
      formalByteHeadroom +
      precollectionMaximumBytes +
      frozenInputMaximumBytes +
      setupMaximumBytes +
      lifecycleMaximumBytes +
      indexedRootMaximumBytes +
      runSetByteHeadroom +
      maximumRunSetControlTotalBytes,
    maximum_run_set_control_files: maximumRunSetControlFiles,
    maximum_run_set_control_total_bytes: maximumRunSetControlTotalBytes,
    maximum_run_set_control_bytes_per_file: 2 * MiB,
    lifecycle_run_count: lifecycleRunCount,
    lifecycle_commands_per_run: lifecycleCommandsPerRun,
    lifecycle_maximum_files_per_run: lifecycleMaximumFilesPerRun,
    lifecycle_maximum_files: lifecycleMaximumFiles,
    setup_maximum_files: setupMaximumFiles,
    precollection_maximum_files: precollectionMaximumFiles,
    frozen_input_maximum_files: frozenInputMaximumFiles,
    ...maximums,
  });
}

export const CURRENT_FORMAL_ARTIFACT_BUDGET =
  deriveExpectedFormalArtifactBudget(
    JSON.parse(readFileSync(canonicalCatalogPath, "utf8")),
  );
