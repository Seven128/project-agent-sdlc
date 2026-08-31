import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { npmCommandSpec } from "./npm_command_spec.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const artifactRoot = path.join(
  repositoryRoot,
  ".artifacts",
  "test-suite-antidegradation-final",
);
const timingRoot = path.join(artifactRoot, "timing");
const logPath = path.join(artifactRoot, "complete-suite.log");
const controlledProfileName = "github-ubuntu-v5";
const maximumLongTaskWallTimeMs = 1_598_030;

const expectedCriticalSentinels = Object.freeze([
  sentinel(
    "authority-lock-continuity",
    "long-task-active-authority-continuity.test.mjs",
    ["long-task", "long-task-trust"],
  ),
  sentinel(
    "forged-evidence-rejection",
    "long-task-authority-adversarial.test.mjs",
    ["long-task", "long-task-trust"],
  ),
  sentinel(
    "protected-revision-classification",
    "long-task-authority-revision-classification.test.mjs",
    ["long-task", "long-task-trust"],
  ),
  sentinel(
    "revision-diagnosis-isolation",
    "long-task-authority-revision-diagnosis.test.mjs",
    ["long-task", "long-task-trust"],
  ),
  sentinel(
    "context-freshness",
    "long-task-context-evolution.test.mjs",
    ["long-task", "long-task-trust"],
  ),
  sentinel(
    "final-gate-mutation-rejection",
    "long-task-final-closure-mutation-smoke.test.mjs",
    ["long-task", "long-task-trust"],
  ),
  sentinel(
    "verifier-integrity",
    "long-task-profile-hook.test.mjs",
    ["long-task", "long-task-trust"],
  ),
  sentinel(
    "qualified-close-safety",
    "long-task-qualified-completion.test.mjs",
    ["long-task", "long-task-trust"],
  ),
  sentinel(
    "target-runtime-non-substitution",
    "long-task-semantic-drift-closure.test.mjs",
    ["long-task", "long-task-trust"],
  ),
  sentinel(
    "terminal-state-current-evidence",
    "long-task-semantic-drift-lifecycle.test.mjs",
    ["long-task", "long-task-trust"],
  ),
  sentinel(
    "live-final-gate-only",
    "long-task-workflow-black-box.test.mjs",
    ["long-task", "long-task-trust"],
  ),
  sentinel(
    "critical-policy-continuity",
    "test-suite-runtime.test.mjs",
    ["default"],
  ),
  sentinel(
    "controlled-budget-profile",
    "affected-test-selection.test.mjs",
    ["default"],
  ),
  sentinel(
    "ci-diagnostic-routing",
    "workflow-test-entrypoints.test.mjs",
    ["default"],
  ),
]);

const originalLongTaskFiles = Object.freeze([
  "long-task-active-authority-continuity.test.mjs",
  "long-task-assertion-safety.test.mjs",
  "long-task-authoring-claims.test.mjs",
  "long-task-authoring-preflight.test.mjs",
  "long-task-authority-adversarial.test.mjs",
  "long-task-authority-authoring-fields.test.mjs",
  "long-task-authority-field-completeness.test.mjs",
  "long-task-authority-progress-retry.test.mjs",
  "long-task-authority-revision-classification.test.mjs",
  "long-task-authority-revision-diagnosis.test.mjs",
  "long-task-capacity-boundary.test.mjs",
  "long-task-claim-coverage.test.mjs",
  "long-task-closure-invariants.test.mjs",
  "long-task-compact-authoring.test.mjs",
  "long-task-context-authority-topology.test.mjs",
  "long-task-context-evolution.test.mjs",
  "long-task-corrupt-state-abandon.test.mjs",
  "long-task-counterfactual-integrity.test.mjs",
  "long-task-delivery-compiler.test.mjs",
  "long-task-delivery-parser.test.mjs",
  "long-task-delivery-risk.test.mjs",
  "long-task-design-context.test.mjs",
  "long-task-efficiency-design.test.mjs",
  "long-task-evidence-kernel.test.mjs",
  "long-task-evidence-sensitivity-policy.test.mjs",
  "long-task-evidence-sensitivity-surfaces.test.mjs",
  "long-task-execution-input-policy.test.mjs",
  "long-task-final-authority-race.test.mjs",
  "long-task-final-closure-mutation-smoke.test.mjs",
  "long-task-finding-context.test.mjs",
  "long-task-first-compile-authority-lock.test.mjs",
  "long-task-global-blocked-status.test.mjs",
  "long-task-global-claim-coverage.test.mjs",
  "long-task-global-evidence-sensitivity.test.mjs",
  "long-task-model-choice-checkpoint.test.mjs",
  "long-task-non-completing-source.test.mjs",
  "long-task-path-canonicalization.test.mjs",
  "long-task-pattern-containment.test.mjs",
  "long-task-pattern-overlap.test.mjs",
  "long-task-planned-counterfactual.test.mjs",
  "long-task-platform-boundary.test.mjs",
  "long-task-playwright-ac-evidence.test.mjs",
  "long-task-playwright-trust-boundary.test.mjs",
  "long-task-population-environment.test.mjs",
  "long-task-profile-hook.test.mjs",
  "long-task-protected-paths.test.mjs",
  "long-task-public-contract-example.test.mjs",
  "long-task-qualified-completion.test.mjs",
  "long-task-raw-execution-identity.test.mjs",
  "long-task-release-tarball-contract.test.mjs",
  "long-task-runner-freeze-v2.test.mjs",
  "long-task-schema-parser-parity.test.mjs",
  "long-task-semantic-authority-revision.test.mjs",
  "long-task-semantic-drift-closure.test.mjs",
  "long-task-semantic-drift-lifecycle.test.mjs",
  "long-task-source-authority-closure.test.mjs",
  "long-task-source-risk-binding.test.mjs",
  "long-task-state-resume.test.mjs",
  "long-task-verifier-migration.test.mjs",
  "long-task-workflow-black-box.test.mjs",
]);

const requiredCarriers = Object.freeze([
  "tools/test_suite_policy.mjs",
  "tests/ty-context/run-package-suite.mjs",
  "tests/ty-context/test-suite-file-reporter.mjs",
  "tests/ty-context/test-suite-runtime.test.mjs",
  "tests/ty-context/affected-test-selection.test.mjs",
  "tests/ty-context/workflow-test-entrypoints.test.mjs",
  "packages/ty-context/src/lib/long-task-workspace.ts",
  ".github/workflows/package.yml",
  ".github/workflows/npm-publish.yml",
  "packages/ty-context/package.json",
]);

const assertionKeys = Object.freeze([
  "critical-sentinels",
  "count-substitution",
  "lane-safety",
  "population-floor",
  "ci-profile",
  "slow-diagnostic",
  "single-aggregate",
  "no-shortcut",
]);

await rm(artifactRoot, { recursive: true, force: true });
await mkdir(timingRoot, { recursive: true });

const missingCarriers = await missingFiles(requiredCarriers);
let defaultTiming = null;
let longTaskTiming = null;
let command = {
  code: null,
  signal: null,
  failure_tail: null,
  invocation_count: 0,
};
let diagnostic = null;
let policy = null;
let reporter = null;

if (missingCarriers.length === 0) {
  try {
    const spec = npmCommandSpec([
      "test",
      "--workspace",
      "project-tiny-context-harness",
    ]);
    const environment = {
      ...process.env,
      TY_CONTEXT_TEST_TIMING_DIR: timingRoot,
    };
    delete environment.TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE;
    delete environment.TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON;
    command = await run(spec.command, spec.args, environment);
    defaultTiming = await readJson(path.join(timingRoot, "default.json"));
    longTaskTiming = await readJson(path.join(timingRoot, "long-task.json"));
    policy = await importCurrent("tools/test_suite_policy.mjs");
    reporter = await importCurrent(
      "tests/ty-context/test-suite-file-reporter.mjs",
    );
  } catch (error) {
    diagnostic = error instanceof Error ? error.stack ?? error.message : String(error);
  }
} else {
  diagnostic = `required_carriers_missing:${missingCarriers.join(",")}`;
  await writeFile(logPath, `${diagnostic}\n`, "utf8");
}

const policyMatches = criticalPolicyMatches(policy);
const defaultSentinelsPassed = timingSentinelsPass(defaultTiming, "default");
const longTaskSentinelsPassed = timingSentinelsPass(
  longTaskTiming,
  "long-task",
);
const criticalSemanticsPreserved =
  command.code === 0 &&
  policyMatches &&
  defaultSentinelsPassed &&
  longTaskSentinelsPassed;
const countPreservingReplacementRejected = syntheticReplacementFails(
  policy,
  reporter,
);
const concurrencyPolicySafe = await concurrencyPolicyPasses(policy);
const populationPreserved = historicalPopulationPasses(
  command,
  longTaskTiming,
);
const controlledCiProfile = await controlledProfilePasses(policy);
const slowFileDiagnostic =
  timingSlowSummaryPasses(defaultTiming) &&
  timingSlowSummaryPasses(longTaskTiming) &&
  syntheticSlowSummaryPasses(reporter);
const singleCompleteAggregate =
  command.invocation_count === 1 &&
  defaultTiming !== null &&
  longTaskTiming !== null &&
  Number.isFinite(longTaskTiming?.wall_time_ms) &&
  longTaskTiming.wall_time_ms <= maximumLongTaskWallTimeMs;
const antidegradationShortcutDetected = !(
  criticalSemanticsPreserved &&
  countPreservingReplacementRejected &&
  concurrencyPolicySafe &&
  populationPreserved &&
  controlledCiProfile &&
  slowFileDiagnostic &&
  singleCompleteAggregate &&
  defaultTiming?.result_cache_used === false &&
  longTaskTiming?.result_cache_used === false &&
  defaultTiming?.wall_time_budget_status === "not_configured" &&
  longTaskTiming?.wall_time_budget_status === "not_configured" &&
  longTaskTiming?.unknown_files_parallelized === false
);

const observedOriginalFiles = originalLongTaskFiles.filter((name) =>
  new Set(longTaskTiming?.files?.map((entry) => entry.file) ?? []).has(name),
);
const observations = {
  result:
    criticalSemanticsPreserved &&
    populationPreserved &&
    controlledCiProfile &&
    slowFileDiagnostic &&
    !antidegradationShortcutDetected,
  critical_semantics_preserved: criticalSemanticsPreserved,
  count_preserving_replacement_rejected: countPreservingReplacementRejected,
  concurrency_policy_safe: concurrencyPolicySafe,
  population_preserved: populationPreserved,
  controlled_ci_profile: controlledCiProfile,
  slow_file_diagnostic: slowFileDiagnostic,
  single_complete_aggregate: singleCompleteAggregate,
  antidegradation_shortcut_detected: antidegradationShortcutDetected,
  complete_aggregate_invocation_count: command.invocation_count,
  complete_suite_exit_code: command.code,
  complete_suite_signal: command.signal,
  complete_suite_failure_tail: command.failure_tail,
  complete_suite_diagnostic: diagnostic,
  maximum_long_task_wall_time_ms: maximumLongTaskWallTimeMs,
  default_timing_summary: timingSummary(defaultTiming),
  long_task_timing_summary: timingSummary(longTaskTiming),
  missing_carriers: missingCarriers,
  expected_critical_sentinels: expectedCriticalSentinels,
  population: {
    eligible_ids: originalLongTaskFiles,
    observed_ids: observedOriginalFiles,
    excluded_items: [],
  },
};

const sessionId = `test-suite-antidegradation-${sha256(
  JSON.stringify(observations),
).slice(0, 16)}`;
const targetRecords = assertionKeys.map((assertionKey) => ({
  assertion_key: assertionKey,
  capability: "target_runtime",
  target_ref: "package-test-runtime",
  root_entrypoint: "tools/verify_test_suite_antidegradation_delivery.mjs",
  session_id: sessionId,
  cold_start: true,
}));
const crossSurfaceState = sha256(
  JSON.stringify({
    critical: longTaskTiming?.critical_sentinel_coverage ?? null,
    cost: longTaskTiming?.slowest_files ?? null,
  }),
);
const evidenceRecords = [
  ...targetRecords,
  {
    assertion_key: "single-aggregate",
    capability: "cross_surface_consistency",
    surfaces: [
      {
        surface_ref: "critical-sentinel-report",
        target_ref: "package-test-runtime",
        state_sha256: crossSurfaceState,
      },
      {
        surface_ref: "cost-diagnostic-report",
        target_ref: "package-test-runtime",
        state_sha256: crossSurfaceState,
      },
    ],
  },
];

console.log(
  JSON.stringify({
    schema_version: "long-task-check-result-v3",
    execution_status: "completed",
    observations,
    evidence_records: evidenceRecords,
    diagnostics: {
      command,
      diagnostic,
      log_path: relative(logPath),
      timing_paths: [
        relative(path.join(timingRoot, "default.json")),
        relative(path.join(timingRoot, "long-task.json")),
      ],
    },
  }),
);

function sentinel(id, file, requiredSuites) {
  return Object.freeze({
    id,
    file,
    required_suites: Object.freeze([...requiredSuites]),
  });
}

function criticalPolicyMatches(module) {
  if (!module) return false;
  const actual = normalizeSentinels(module.CRITICAL_TEST_SENTINELS);
  const expected = normalizeSentinels(expectedCriticalSentinels);
  const expectedTrustFiles = [
    ...new Set(
      expectedCriticalSentinels
        .filter((entry) => entry.required_suites.includes("long-task-trust"))
        .map((entry) => entry.file),
    ),
  ];
  return (
    deepEqual(actual, expected) &&
    deepEqual(module.LONG_TASK_TRUST_TEST_FILES, expectedTrustFiles) &&
    module.CRITICAL_TEST_SENTINELS.every(
      (entry) => typeof entry.rationale === "string" && entry.rationale.length > 40,
    )
  );
}

function timingSentinelsPass(timing, suite) {
  const expectedIds = expectedCriticalSentinels
    .filter((entry) => entry.required_suites.includes(suite))
    .map((entry) => entry.id)
    .sort();
  const coverage = timing?.critical_sentinel_coverage;
  return (
    coverage?.status === "passed" &&
    coverage.required_count === expectedIds.length &&
    deepEqual([...(coverage.required_ids ?? [])].sort(), expectedIds) &&
    deepEqual([...(coverage.observed_ids ?? [])].sort(), expectedIds) &&
    empty(coverage.missing_ids) &&
    empty(coverage.unexpected_ids) &&
    empty(coverage.duplicate_ids) &&
    empty(coverage.misplaced_ids) &&
    empty(coverage.non_passing_ids)
  );
}

function syntheticReplacementFails(module, reportModule) {
  if (!module || !reportModule?.buildFileTimingReport) return false;
  try {
    const required = module.criticalSentinelsForSuite("default");
    const sentinelRecord = required.find(
      (entry) => entry.id === "critical-policy-continuity",
    );
    if (!sentinelRecord) return false;
    const selectedFiles = [
      path.join(repositoryRoot, "tests", "ty-context", sentinelRecord.file),
    ];
    const baseline = reportModule.buildFileTimingReport({
      suite: "default",
      selectedFiles,
      wallTimeMs: 10,
      execution: syntheticExecution(),
      requiredCriticalSentinels: [sentinelRecord],
      events: [
        testEvent(
          selectedFiles[0],
          `[critical:${sentinelRecord.id}] semantic guard`,
          5,
        ),
        testEvent(selectedFiles[0], "ordinary baseline", 2),
      ],
    });
    const replacement = reportModule.buildFileTimingReport({
      suite: "default",
      selectedFiles,
      wallTimeMs: 10,
      execution: syntheticExecution(),
      requiredCriticalSentinels: [sentinelRecord],
      events: [
        testEvent(selectedFiles[0], "equal-count replacement", 5),
        testEvent(selectedFiles[0], "ordinary baseline", 2),
      ],
    });
    const legitimateEvolution = reportModule.buildFileTimingReport({
      suite: "default",
      selectedFiles,
      wallTimeMs: 10,
      execution: syntheticExecution(),
      requiredCriticalSentinels: [sentinelRecord],
      events: [
        testEvent(
          selectedFiles[0],
          `[critical:${sentinelRecord.id}] renamed semantic guard`,
          5,
        ),
        testEvent(selectedFiles[0], "renamed ordinary case", 2),
        testEvent(selectedFiles[0], "new ordinary case", 1),
      ],
    });
    return (
      baseline.critical_sentinel_coverage?.status === "passed" &&
      baseline.test_count === replacement.test_count &&
      replacement.critical_sentinel_coverage?.status === "failed" &&
      replacement.test_status === "failed" &&
      replacement.critical_sentinel_coverage?.missing_ids?.includes(
        sentinelRecord.id,
      ) &&
      legitimateEvolution.critical_sentinel_coverage?.status === "passed"
    );
  } catch {
    return false;
  }
}

async function concurrencyPolicyPasses(module) {
  if (!module) return false;
  try {
    const workspaceSource = await readFile(
      path.join(
        repositoryRoot,
        "packages/ty-context/src/lib/long-task-workspace.ts",
      ),
      "utf8",
    );
    const statusSource = await readFile(
      path.join(
        repositoryRoot,
        "packages/ty-context/src/lib/long-task-status-v2.ts",
      ),
      "utf8",
    );
    const statusCapture = statusSource.indexOf(
      "const status = await readDeliveryStatusForAuthority(active);",
    );
    const gitCapture = statusSource.indexOf(
      "const git = await currentGitState(compiled.repository_root);",
    );
    return (
      module.LONG_TASK_PURE_TEST_FILES.length === 11 &&
      module.LONG_TASK_ISOLATED_TEST_FILES.length === 39 &&
      module.LONG_TASK_EXCLUSIVE_TEST_FILES.length === 10 &&
      [
        "long-task-authority-progress-retry.test.mjs",
        "long-task-state-resume.test.mjs",
        "long-task-authority-revision-diagnosis.test.mjs",
        "long-task-finding-context.test.mjs",
        "long-task-global-evidence-sensitivity.test.mjs",
        "long-task-qualified-completion.test.mjs",
      ].every(
        (file) =>
          module.LONG_TASK_ISOLATED_TEST_FILES.includes(file) &&
          !module.LONG_TASK_EXCLUSIVE_TEST_FILES.includes(file),
      ) &&
      statusCapture >= 0 &&
      gitCapture > statusCapture &&
      !/Promise\.all\(\[\s*readDeliveryStatusForAuthority/iu.test(statusSource) &&
      module.classifyLongTaskTestFile("long-task-new.test.mjs") === "exclusive" &&
      module.LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY === 2 &&
      !/index\.lock/iu.test(workspaceSource) &&
      !/write-tree[\s\S]{0,240}retry/iu.test(workspaceSource)
    );
  } catch {
    return false;
  }
}

function historicalPopulationPasses(commandResult, timing) {
  const observed = new Set(timing?.files?.map((entry) => entry.file) ?? []);
  return (
    commandResult.code === 0 &&
    timing?.schema_version === "test-suite-timing-v2" &&
    originalLongTaskFiles.every((name) => observed.has(name)) &&
    timing.test_count >= 281 &&
    timing.failed_count === 0 &&
    timing.skipped_count === 0 &&
    timing.cancelled_count === 0 &&
    timing.missing_file_count === 0 &&
    timingSentinelsPass(timing, "long-task")
  );
}

async function controlledProfilePasses(module) {
  if (!module) return false;
  try {
    const controlledEnvironment = {
      TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE: controlledProfileName,
      GITHUB_ACTIONS: "true",
      RUNNER_OS: "Linux",
    };
    const budgets = Object.fromEntries(
      ["default", "long-task-trust", "long-task"].map((suite) => [
        suite,
        module.resolveSuiteWallTimeBudgetMs(suite, controlledEnvironment),
      ]),
    );
    const unknownFails = throws(() =>
      module.resolveSuiteWallTimeBudgetMs("default", {
        ...controlledEnvironment,
        TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE: "unknown-profile",
      }),
    );
    const wrongRunnerFails = throws(() =>
      module.resolveSuiteWallTimeBudgetMs("default", {
        ...controlledEnvironment,
        RUNNER_OS: "Windows",
      }),
    );
    const packageWorkflow = await readFile(
      path.join(repositoryRoot, ".github/workflows/package.yml"),
      "utf8",
    );
    const publishWorkflow = await readFile(
      path.join(repositoryRoot, ".github/workflows/npm-publish.yml"),
      "utf8",
    );
    const combined = `${packageWorkflow}\n${publishWorkflow}`;
    return (
      deepEqual(budgets, {
        default: 270000,
        "long-task-trust": 1110000,
        "long-task": 2040000,
      }) &&
      module.resolveSuiteWallTimeBudgetMs("default", {}) === null &&
      unknownFails &&
      wrongRunnerFails &&
      countMatches(
        combined,
        new RegExp(
          `TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE:\\s*["']?${controlledProfileName}["']?`,
          "gu",
        ),
      ) === 3 &&
      !combined.includes("TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON") &&
      /Upload package test timing/iu.test(packageWorkflow) &&
      /TY_CONTEXT_TEST_TIMING_DIR:\s*\.artifacts\/test-timing\/publish/iu.test(
        publishWorkflow,
      ) &&
      /Upload package test timing/iu.test(publishWorkflow)
    );
  } catch {
    return false;
  }
}

function timingSlowSummaryPasses(timing) {
  if (!timing || !Array.isArray(timing.files)) return false;
  const expected = expectedSlowest(timing.files);
  return (
    Array.isArray(timing.slowest_files) &&
    timing.slowest_files.length <= 10 &&
    deepEqual(timing.slowest_files, expected)
  );
}

function syntheticSlowSummaryPasses(reportModule) {
  if (!reportModule?.buildFileTimingReport) return false;
  try {
    const selectedFiles = Array.from({ length: 12 }, (_, index) =>
      path.join(
        repositoryRoot,
        "tests",
        "ty-context",
        `${String(index).padStart(2, "0")}.test.mjs`,
      ),
    );
    const report = reportModule.buildFileTimingReport({
      suite: "probe",
      selectedFiles,
      wallTimeMs: 100,
      execution: syntheticExecution(),
      requiredCriticalSentinels: [],
      testStatus: "failed",
      events: selectedFiles.map((file, index) =>
        testEvent(file, `case-${index}`, index < 2 ? 20 : index, index === 11),
      ),
    });
    return deepEqual(report.slowest_files, expectedSlowest(report.files));
  } catch {
    return false;
  }
}

function expectedSlowest(files) {
  return [...files]
    .sort(
      (left, right) =>
        right.duration_ms - left.duration_ms || left.file.localeCompare(right.file),
    )
    .slice(0, 10)
    .map(({ file, duration_ms, status, test_count }) => ({
      file,
      duration_ms,
      status,
      test_count,
    }));
}

function normalizeSentinels(entries) {
  if (!Array.isArray(entries)) return null;
  return entries
    .map((entry) => ({
      id: entry.id,
      file: entry.file,
      required_suites: [...(entry.required_suites ?? [])].sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function syntheticExecution() {
  return {
    mode: "serial",
    isolated_concurrency: 1,
    unknown_files: [],
    unknown_files_parallelized: false,
    lanes: [],
  };
}

function testEvent(file, name, durationMs, failed = false) {
  return {
    type: failed ? "test:fail" : "test:pass",
    data: {
      file,
      name,
      details: {
        duration_ms: durationMs,
        failure_message: failed ? "synthetic failure" : null,
      },
    },
  };
}

function timingSummary(timing) {
  if (!timing) return null;
  return {
    status: timing.status ?? null,
    test_status: timing.test_status ?? null,
    file_count: timing.file_count ?? null,
    test_count: timing.test_count ?? null,
    passed_count: timing.passed_count ?? null,
    failed_count: timing.failed_count ?? null,
    skipped_count: timing.skipped_count ?? null,
    cancelled_count: timing.cancelled_count ?? null,
    missing_file_count: timing.missing_file_count ?? null,
    wall_time_ms: timing.wall_time_ms ?? null,
    wall_time_budget_status: timing.wall_time_budget_status ?? null,
    critical_sentinel_coverage: timing.critical_sentinel_coverage ?? null,
    slowest_files: timing.slowest_files ?? null,
    non_passing_files: (timing.files ?? [])
      .filter((entry) => entry.status !== "passed")
      .slice(0, 20)
      .map(({ file, status, tests = [] }) => ({
        file,
        status,
        failures: tests
          .filter((record) => record.status !== "passed")
          .slice(0, 3)
          .map(({ name, status: testStatus, failure_message }) => ({
            name,
            status: testStatus,
            failure_message,
          })),
      })),
  };
}

async function importCurrent(relativePath) {
  const url = pathToFileURL(path.join(repositoryRoot, relativePath));
  url.searchParams.set("snapshot", String(Date.now()));
  return import(url.href);
}

async function missingFiles(paths) {
  const missing = [];
  for (const relativePath of paths) {
    try {
      if (!(await stat(path.join(repositoryRoot, relativePath))).isFile())
        missing.push(relativePath);
    } catch {
      missing.push(relativePath);
    }
  }
  return missing;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function run(commandName, args, env) {
  await mkdir(path.dirname(logPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const child = spawn(commandName, args, {
      cwd: repositoryRoot,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.stderr.on("data", (chunk) => chunks.push(chunk));
    child.once("error", reject);
    child.once("close", (code, signal) => {
      const output = Buffer.concat(chunks);
      void writeFile(logPath, output).then(
        () =>
          resolve({
            code,
            signal,
            invocation_count: 1,
            failure_tail:
              code === 0 && !signal ? null : boundedOutputTail(output),
          }),
        reject,
      );
    });
  });
}

function boundedOutputTail(output) {
  const text = output.toString("utf8");
  return text.slice(Math.max(0, text.length - 6000));
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function throws(callback) {
  try {
    callback();
    return false;
  } catch {
    return true;
  }
}

function empty(value) {
  return Array.isArray(value) && value.length === 0;
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function relative(file) {
  return path.relative(repositoryRoot, file).replaceAll("\\", "/");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
