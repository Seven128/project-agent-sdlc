import { LONG_TASK_TRUST_TEST_FILES } from "./test_suite_policy.mjs";

const SUPPORTED_TEST_SUITES = new Set([
  "default",
  "long-task",
  "long-task-trust",
]);

export function selectPackageTestNames(availableNames, suite) {
  if (!SUPPORTED_TEST_SUITES.has(suite))
    throw new Error(`Unsupported package test suite: ${suite}.`);
  if (new Set(availableNames).size !== availableNames.length)
    throw new Error("Package test discovery returned duplicate file names.");
  if (suite === "long-task-trust") {
    const available = new Set(availableNames);
    const missing = LONG_TASK_TRUST_TEST_FILES.filter(
      (name) => !available.has(name),
    );
    if (missing.length > 0)
      throw new Error(
        `Missing Trust Boundary test files: ${missing.join(", ")}`,
      );
    return [...LONG_TASK_TRUST_TEST_FILES];
  }
  return availableNames.filter(
    (name) => /^long-task-/u.test(name) === (suite === "long-task"),
  );
}
