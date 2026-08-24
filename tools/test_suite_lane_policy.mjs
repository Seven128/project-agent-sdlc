import path from "node:path";

import {
  LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY,
  LONG_TASK_TRUST_TEST_FILES,
  planLongTaskIsolationLanes,
} from "./test_suite_policy.mjs";

export const LONG_TASK_MAX_FILES_PER_TEST_PROCESS = 16;
export const LONG_TASK_SERIAL_ROLLBACK_MAX_FILES_PER_TEST_PROCESS = 1;

export function planLongTaskSuiteLanes(
  availableFiles,
  suite,
  safeConcurrency = LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY,
) {
  if (suite !== "long-task" && suite !== "long-task-trust")
    throw new Error(`Unsupported Long-Task lane suite: ${suite}.`);
  const policy = planLongTaskIsolationLanes(availableFiles, safeConcurrency);
  const normalized = availableFiles.map((file) => path.basename(file));
  const trustFiles = new Set(LONG_TASK_TRUST_TEST_FILES);
  if (suite === "long-task") {
    const selected = new Set(normalized);
    const missing = LONG_TASK_TRUST_TEST_FILES.filter(
      (file) => !selected.has(file),
    );
    if (missing.length > 0)
      throw new Error(
        `Complete Long-Task suite is missing Trust Boundary files: ${missing.join(", ")}`,
      );
  }
  const partitions =
    suite === "long-task"
      ? [
          {
            key: "trust",
            files: normalized.filter((file) => trustFiles.has(file)),
          },
          {
            key: "remainder",
            files: normalized.filter((file) => !trustFiles.has(file)),
          },
        ]
      : [{ key: null, files: normalized }];
  const safeFiles = new Set(policy.safe.files);
  const exclusiveFiles = new Set(policy.exclusive.files);
  const logicalLanes = partitions.flatMap((partition) => {
    const prefix = partition.key ? `${partition.key}-` : "";
    return [
      {
        key: `${prefix}safe`,
        names: partition.files.filter((file) => safeFiles.has(file)),
        concurrency: policy.safe.concurrency,
      },
      {
        key: `${prefix}exclusive`,
        names: partition.files.filter((file) => exclusiveFiles.has(file)),
        concurrency: policy.exclusive.concurrency,
      },
    ].filter((lane) => lane.names.length > 0);
  });
  const maxFilesPerTestProcess =
    safeConcurrency === 1
      ? LONG_TASK_SERIAL_ROLLBACK_MAX_FILES_PER_TEST_PROCESS
      : LONG_TASK_MAX_FILES_PER_TEST_PROCESS;
  const lanes = logicalLanes.flatMap((lane) =>
    splitLongTaskProcessLane(lane, maxFilesPerTestProcess),
  );
  return {
    ...policy,
    lanes,
    max_files_per_test_process: maxFilesPerTestProcess,
  };
}

function splitLongTaskProcessLane(lane, maxFilesPerTestProcess) {
  if (lane.names.length <= maxFilesPerTestProcess) return [lane];
  const chunks = [];
  for (
    let index = 0;
    index < lane.names.length;
    index += maxFilesPerTestProcess
  )
    chunks.push({
      key: `${lane.key}-${String(chunks.length + 1).padStart(2, "0")}`,
      names: lane.names.slice(index, index + maxFilesPerTestProcess),
      concurrency: lane.concurrency,
    });
  return chunks;
}
