import path from "node:path";

import {
  LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY,
  LONG_TASK_LEVEL4_TEST_FILES,
  LONG_TASK_TRUST_TEST_FILES,
  planLongTaskIsolationLanes,
} from "./test_suite_policy.mjs";

export const LONG_TASK_MAX_FILES_PER_TEST_PROCESS = 16;

export function selectPackageSuiteFileNames(availableFiles, suite) {
  if (
    ![
      "default",
      "long-task",
      "long-task-level4",
      "long-task-trust",
    ].includes(suite)
  )
    throw new Error(`Unsupported package test suite: ${suite}.`);
  const available = [...availableFiles].sort();
  if (suite === "long-task-trust" || suite === "long-task-level4") {
    const requiredFiles =
      suite === "long-task-trust"
        ? LONG_TASK_TRUST_TEST_FILES
        : LONG_TASK_LEVEL4_TEST_FILES;
    const label =
      suite === "long-task-trust" ? "Trust Boundary" : "Level-4 lane";
    const availableSet = new Set(available);
    const missing = requiredFiles.filter((name) => !availableSet.has(name));
    if (missing.length > 0)
      throw new Error(`Missing ${label} test files: ${missing.join(", ")}`);
    return [...requiredFiles];
  }
  return available.filter(
    (name) => /^long-task-/u.test(name) === (suite === "long-task"),
  );
}

export function planLongTaskSuiteLanes(
  availableFiles,
  suite,
  safeConcurrency = LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY,
) {
  if (
    suite !== "long-task" &&
    suite !== "long-task-trust" &&
    suite !== "long-task-level4"
  )
    throw new Error(`Unsupported Long-Task lane suite: ${suite}.`);
  const policy = planLongTaskIsolationLanes(availableFiles, safeConcurrency);
  const normalized = availableFiles.map((file) => path.basename(file));
  const trustFiles = new Set(LONG_TASK_TRUST_TEST_FILES);
  const level4Files = new Set(LONG_TASK_LEVEL4_TEST_FILES);
  if (suite === "long-task") {
    const selected = new Set(normalized);
    const missing = [
      ...LONG_TASK_TRUST_TEST_FILES,
      ...LONG_TASK_LEVEL4_TEST_FILES,
    ].filter((file) => !selected.has(file));
    if (missing.length > 0)
      throw new Error(
        `Complete Long-Task suite is missing protected lane files: ${missing.join(", ")}`,
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
            key: "level4",
            files: normalized.filter((file) => level4Files.has(file)),
          },
          {
            key: "remainder",
            files: normalized.filter(
              (file) => !trustFiles.has(file) && !level4Files.has(file),
            ),
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
  const lanes = logicalLanes.flatMap(splitLongTaskProcessLane);
  return { ...policy, lanes };
}

function splitLongTaskProcessLane(lane) {
  if (lane.names.length <= LONG_TASK_MAX_FILES_PER_TEST_PROCESS) return [lane];
  const chunks = [];
  for (
    let index = 0;
    index < lane.names.length;
    index += LONG_TASK_MAX_FILES_PER_TEST_PROCESS
  )
    chunks.push({
      key: `${lane.key}-${String(chunks.length + 1).padStart(2, "0")}`,
      names: lane.names.slice(
        index,
        index + LONG_TASK_MAX_FILES_PER_TEST_PROCESS,
      ),
      concurrency: lane.concurrency,
    });
  return chunks;
}
