import path from "node:path";

export const TEST_ROOT = "tests/ty-context";
const SUPPORTED_TEST_SUITES = new Set([
  "default",
  "long-task",
  "long-task-trust",
]);

export const TEST_TIER_REVIEW_BUDGETS = Object.freeze({
  long_task_trust: Object.freeze({
    max_files: 17,
    reviewed_on: "2026-08-03",
    rationale:
      "One canonical file per reviewed high-impact trust-boundary invariant family, including compact stable-key plus revision-digest Fact/obligation closure and the prior symbolic, selected-design and non-UI semantic rejection paths.",
  }),
  long_task_focused: Object.freeze({
    max_files: 25,
    reviewed_on: "2026-08-03",
    rationale:
      "Bound the default Long-Task edit loop while retaining authority, Context, semantic, selected-design, compact-carrier exact-closure and fixed structural-cost coverage without removing prior regressions.",
  }),
  delivery_contract_focused: Object.freeze({
    max_files: 14,
    reviewed_on: "2026-08-03",
    rationale:
      "Bound Contract-authoring feedback while retaining parser, compiler, coverage, risk, semantic-drift, Source-authority, first-lock scope, fixed structural-cost and compact plus expanded non-UI semantic projection sentinels.",
  }),
  hotspot_fanout: Object.freeze({
    max_tests_per_path: 10,
    reviewed_on: "2026-07-29",
    rationale:
      "A single implementation path selecting more tests requires remapping or explicit review; the tenth slot lets the central Delivery compiler retain all nine existing authority/workspace/design/revision regressions plus the independent non-UI semantic Fact closure, while complete-suite discovery remains uncapped.",
  }),
});

export const CRITICAL_TEST_SENTINELS = Object.freeze([
  criticalSentinel(
    "authority-lock-continuity",
    "long-task-active-authority-continuity.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that deleting derived cache cannot reset the first compiled Authority Lock or its immutable task base.",
  ),
  criticalSentinel(
    "first-lock-workspace-scope",
    "long-task-workspace-scope.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that Preflight and direct Compile cannot absorb an undeclared dirty path into the first immutable baseline and later drift still fails closed.",
  ),
  criticalSentinel(
    "forged-evidence-rejection",
    "long-task-authority-adversarial.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that forged receipts and compiled cache cannot replace the current live acceptance authority.",
  ),
  criticalSentinel(
    "protected-revision-classification",
    "long-task-authority-revision-classification.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that semantic or proof weakening remains a protected revision requiring an exact user decision before execution.",
  ),
  criticalSentinel(
    "revision-diagnosis-isolation",
    "long-task-authority-revision-diagnosis.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that revision diagnosis cannot mutate progress, pending user-decision state, or acceptance authority.",
  ),
  criticalSentinel(
    "context-freshness",
    "long-task-context-evolution.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that explicitly referenced verification Context stays controlling and stale evidence fails closed.",
  ),
  criticalSentinel(
    "final-gate-mutation-rejection",
    "long-task-final-closure-mutation-smoke.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that controlled candidate mutation invalidates stale proof and cannot create false Final Gate acceptance.",
  ),
  criticalSentinel(
    "verifier-integrity",
    "long-task-profile-hook.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that an active record cannot redirect, replace, or weaken the package-owned current verifier.",
  ),
  criticalSentinel(
    "qualified-close-safety",
    "long-task-qualified-completion.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that failed live gates neither report qualified success nor clear the current Active Authority.",
  ),
  criticalSentinel(
    "target-runtime-non-substitution",
    "long-task-semantic-drift-closure.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that evidence from a different runtime target cannot substitute for the Contract-required target.",
  ),
  criticalSentinel(
    "selected-design-fact-closure",
    "long-task-semantic-drift-closure.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that selected-design method evidence must conserve the exact manifest-backed atomic Fact and property-required proof set for every target/condition, freeze each Fact's expected locator/comparator/tolerance/mask/Oracle/environment/sensitivity authority, and return one attributable passing current-snapshot result per Fact, so artifact or aggregate-pass presence cannot hide omission, substitution, stale authority, unsafe sensitive evidence, or a failed design Fact.",
  ),
  criticalSentinel(
    "symbolic-mixed-representation-closure",
    "long-task-symbolic-denotation-v2.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves one Contract can bind V1 ground Facts and explicitly opted-in V2 Rules together while exact Rule-method-region and freshly recomputed certificate evidence cannot cross-substitute or bypass the existing current-snapshot Final Gate.",
  ),
  criticalSentinel(
    "non-ui-semantic-fact-closure",
    "long-task-semantic-fact-closure.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves complete standard/custom non-UI semantic input, family, unit, condition, property, Fact and proof universes; exact Source→Fact→Contract binding; and one attributable current result per Fact×method, rejecting aggregate, supporting-only, omission, stale authority and evidence reuse bypasses.",
  ),
  criticalSentinel(
    "compact-carrier-exact-closure",
    "long-task-compact-semantic-carrier.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves compact Source and Contract preserve separate exact Fact and obligation sets through stable keys plus current revision digests, support one Fact with multiple obligations, reject revision/capacity drift before first lock, and leave no expanded Authority shadow.",
  ),
  criticalSentinel(
    "semantic-assurance-closure",
    "long-task-semantic-assurance-closure.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves restricted Source classification, mandatory architecture lineage, atomic applicability, Population-universe ownership, claim-local semantic mutation and verifier dependency closure cannot be bypassed by known false-completion models.",
  ),
  criticalSentinel(
    "terminal-state-current-evidence",
    "long-task-semantic-drift-lifecycle.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that Stage frontier and terminal target state derive only from current evidence and the live Final Gate.",
  ),
  criticalSentinel(
    "live-final-gate-only",
    "long-task-workflow-black-box.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves through the real black-box lifecycle that only the current Live Final Gate can finish delivery.",
  ),
  criticalSentinel(
    "mechanism-causal-chain-continuity",
    "long-task-design-context.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that design purpose, key logic, actual current implementation owners, theorem boundary, explicit owner-change rule and anti-degradation evidence remain one recoverable causal chain.",
  ),
  criticalSentinel(
    "implementation-freedom-boundary",
    "long-task-design-context.test.mjs",
    ["long-task", "long-task-trust"],
    "Proves that Goal-owned order/method/cadence and optional multiple-agent implementation remain outside Harness development Gates, scheduling, delegation state and proof while all outputs converge for the unchanged Final Gate.",
  ),
  criticalSentinel(
    "critical-policy-continuity",
    "test-suite-runtime.test.mjs",
    ["default"],
    "Proves that count-preserving replacement, duplication, misplacement, and failure of critical sentinels fail closed.",
  ),
  criticalSentinel(
    "controlled-budget-profile",
    "affected-test-selection.test.mjs",
    ["default"],
    "Proves that controlled wall-time budgets are named, suite-complete, environment-bound, and locally opt-in.",
  ),
  criticalSentinel(
    "ci-diagnostic-routing",
    "workflow-test-entrypoints.test.mjs",
    ["default"],
    "Proves that real CI uses the reviewed profile and uploads same-run timing evidence without another test invocation.",
  ),
]);

assertCriticalTestSentinels();

export const LONG_TASK_TRUST_TEST_FILES = Object.freeze([
  ...new Set(
    CRITICAL_TEST_SENTINELS.filter((entry) =>
      entry.required_suites.includes("long-task-trust"),
    ).map((entry) => entry.file),
  ),
]);

export const LONG_TASK_TRUST_TESTS = Object.freeze(
  LONG_TASK_TRUST_TEST_FILES.map(testPath),
);

export const LONG_TASK_FOCUSED_TESTS = Object.freeze(
  [
    "affected-change-discovery.test.mjs",
    "affected-test-selection.test.mjs",
    "long-task-authority-progress-retry.test.mjs",
    "long-task-authority-revision-classification.test.mjs",
    "long-task-authority-revision-diagnosis.test.mjs",
    "long-task-authority-revision-replay.test.mjs",
    "long-task-closure-invariants.test.mjs",
    "long-task-compact-semantic-carrier.test.mjs",
    "long-task-context-authority-topology.test.mjs",
    "long-task-context-evolution.test.mjs",
    "long-task-design-context.test.mjs",
    "long-task-efficiency-design.test.mjs",
    "long-task-model-choice-checkpoint.test.mjs",
    "long-task-semantic-assurance-closure.test.mjs",
    "long-task-semantic-authority-revision.test.mjs",
    "long-task-semantic-drift-closure.test.mjs",
    "long-task-semantic-drift-lifecycle.test.mjs",
    "long-task-semantic-fact-closure.test.mjs",
    "long-task-structural-closure-cost.test.mjs",
    "long-task-symbolic-denotation-v2.test.mjs",
    "long-task-verification-preview.test.mjs",
    "long-task-workspace-scope.test.mjs",
    "retired-authoring-migration.test.mjs",
    "visual-delivery-guidance.test.mjs",
    "workflow-test-entrypoints.test.mjs",
  ].map(testPath),
);

export const DELIVERY_CONTRACT_FOCUSED_TESTS = Object.freeze(
  [
    "long-task-authoring-claims.test.mjs",
    "long-task-authoring-preflight.test.mjs",
    "long-task-claim-coverage.test.mjs",
    "long-task-compact-semantic-carrier.test.mjs",
    "long-task-delivery-compiler.test.mjs",
    "long-task-delivery-parser.test.mjs",
    "long-task-delivery-risk.test.mjs",
    "long-task-semantic-assurance-closure.test.mjs",
    "long-task-semantic-drift-closure.test.mjs",
    "long-task-semantic-drift-lifecycle.test.mjs",
    "long-task-semantic-fact-closure.test.mjs",
    "long-task-source-authority-closure.test.mjs",
    "long-task-structural-closure-cost.test.mjs",
    "long-task-workspace-scope.test.mjs",
  ].map(testPath),
);

export const STATIC_TESTS = new Set(
  [
    "affected-change-discovery.test.mjs",
    "affected-test-selection.test.mjs",
    "design-system-authoring-skill.test.mjs",
    "design-resource-authoring-provider.test.mjs",
    "design-resource-authoring-skill.test.mjs",
    "long-task-design-context.test.mjs",
    "long-task-efficiency-design.test.mjs",
    "retired-authoring-migration.test.mjs",
    "test-suite-runtime.test.mjs",
    "visual-delivery-guidance.test.mjs",
    "workflow-test-entrypoints.test.mjs",
  ].map(testPath),
);

export const LONG_TASK_PURE_TEST_FILES = Object.freeze([
  "long-task-assertion-safety.test.mjs",
  "long-task-authority-field-completeness.test.mjs",
  "long-task-authority-revision-replay.test.mjs",
  "long-task-claim-coverage.test.mjs",
  "long-task-context-authority-topology.test.mjs",
  "long-task-delivery-parser.test.mjs",
  "long-task-delivery-risk.test.mjs",
  "long-task-design-context.test.mjs",
  "long-task-efficiency-design.test.mjs",
  "long-task-execution-input-policy.test.mjs",
  "long-task-playwright-ac-evidence.test.mjs",
  "long-task-semantic-drift-closure.test.mjs",
  "long-task-structural-closure-cost.test.mjs",
]);

export const LONG_TASK_ISOLATED_TEST_FILES = Object.freeze([
  "long-task-authoring-claims.test.mjs",
  "long-task-symbolic-denotation-v2.test.mjs",
  "long-task-authority-adversarial.test.mjs",
  "long-task-authority-authoring-fields.test.mjs",
  "long-task-authority-progress-retry.test.mjs",
  "long-task-authority-revision-classification.test.mjs",
  "long-task-authority-revision-diagnosis.test.mjs",
  "long-task-capacity-boundary.test.mjs",
  "long-task-closure-invariants.test.mjs",
  "long-task-compact-authoring.test.mjs",
  "long-task-compact-semantic-carrier.test.mjs",
  "long-task-context-evolution.test.mjs",
  "long-task-corrupt-state-abandon.test.mjs",
  "long-task-counterfactual-integrity.test.mjs",
  "long-task-evidence-kernel.test.mjs",
  "long-task-evidence-sensitivity-policy.test.mjs",
  "long-task-evidence-sensitivity-surfaces.test.mjs",
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
  "long-task-protected-paths.test.mjs",
  "long-task-public-contract-example.test.mjs",
  "long-task-qualified-completion.test.mjs",
  "long-task-raw-execution-identity.test.mjs",
  "long-task-runner-freeze-v2.test.mjs",
  "long-task-schema-parser-parity.test.mjs",
  "long-task-semantic-assurance-closure.test.mjs",
  "long-task-semantic-fact-closure.test.mjs",
  "long-task-semantic-authority-revision.test.mjs",
  "long-task-semantic-drift-lifecycle.test.mjs",
  "long-task-source-authority-closure.test.mjs",
  "long-task-source-risk-binding.test.mjs",
  "long-task-state-resume.test.mjs",
  "long-task-verification-preview.test.mjs",
  "long-task-workspace-scope.test.mjs",
]);

export const LONG_TASK_EXCLUSIVE_TEST_FILES = Object.freeze([
  "long-task-active-authority-continuity.test.mjs",
  "long-task-authoring-preflight.test.mjs",
  "long-task-delivery-compiler.test.mjs",
  "long-task-final-authority-race.test.mjs",
  "long-task-platform-boundary.test.mjs",
  "long-task-playwright-trust-boundary.test.mjs",
  "long-task-population-environment.test.mjs",
  "long-task-profile-hook.test.mjs",
  "long-task-release-tarball-contract.test.mjs",
  "long-task-verifier-migration.test.mjs",
  "long-task-workflow-black-box.test.mjs",
]);

export const LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY = 2;

export const CONTROLLED_TEST_SUITE_BUDGET_PROFILES = Object.freeze({
  "github-ubuntu-v1": Object.freeze({
    expected_environment: Object.freeze({
      GITHUB_ACTIONS: "true",
      RUNNER_OS: "Linux",
    }),
    budgets_ms: Object.freeze({
      default: 120_000,
      "long-task-trust": 240_000,
      "long-task": 600_000,
    }),
    reviewed_on: "2026-07-23",
    rationale:
      "Catastrophic regression ceilings for the repository's pinned GitHub-hosted Ubuntu package jobs; local and differently hosted runs remain diagnostic because wall time is not cross-machine evidence.",
  }),
});

const longTaskPureFiles = new Set(LONG_TASK_PURE_TEST_FILES);
const longTaskIsolatedFiles = new Set(LONG_TASK_ISOLATED_TEST_FILES);
const longTaskExclusiveFiles = new Set(LONG_TASK_EXCLUSIVE_TEST_FILES);

assertIsolationPolicy();

assertReviewedTestList(
  "Long-Task Trust Boundary Gate",
  LONG_TASK_TRUST_TESTS,
  TEST_TIER_REVIEW_BUDGETS.long_task_trust,
);
assertReviewedTestList(
  "Long-Task focused tier",
  LONG_TASK_FOCUSED_TESTS,
  TEST_TIER_REVIEW_BUDGETS.long_task_focused,
);
assertReviewedTestList(
  "Delivery Contract focused tier",
  DELIVERY_CONTRACT_FOCUSED_TESTS,
  TEST_TIER_REVIEW_BUDGETS.delivery_contract_focused,
);

export function assertReviewedTestList(label, tests, budget) {
  const unique = new Set(tests);
  if (unique.size !== tests.length)
    throw new Error(
      `${label} contains duplicate test paths; deduplicate the policy without removing independent coverage.`,
    );
  if (tests.length > budget.max_files)
    throw new Error(
      `${label} has ${tests.length} files, above its reviewed maximum ${budget.max_files}. Update TEST_TIER_REVIEW_BUDGETS with an explicit rationale for the new independent coverage; do not delete coverage merely to fit the budget.`,
    );
}

export function assertHotspotTestFanoutBudget(entries) {
  const budget = TEST_TIER_REVIEW_BUDGETS.hotspot_fanout;
  for (const [sourcePath, tests] of entries) {
    const unique = new Set(tests);
    if (unique.size !== tests.length)
      throw new Error(
        `Affected-test hotspot ${sourcePath} contains duplicate test names.`,
      );
    if (tests.length > budget.max_tests_per_path)
      throw new Error(
        `Affected-test hotspot ${sourcePath} maps to ${tests.length} tests, above its reviewed maximum ${budget.max_tests_per_path}. Remap the owner or update TEST_TIER_REVIEW_BUDGETS with an explicit rationale; do not remove coverage merely to fit the budget.`,
      );
  }
}

export function normalizeRepositoryPath(value) {
  return value
    .split(path.sep)
    .join("/")
    .replace(/\\/gu, "/")
    .replace(/^\.\//u, "")
    .trim();
}

export function classifyLongTaskTestFile(value) {
  const name = path.basename(normalizeRepositoryPath(value));
  if (longTaskPureFiles.has(name)) return "pure";
  if (longTaskIsolatedFiles.has(name)) return "isolated";
  return "exclusive";
}

export function planLongTaskIsolationLanes(
  availableFiles,
  safeConcurrency = LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY,
) {
  if (
    !Number.isSafeInteger(safeConcurrency) ||
    safeConcurrency < 1 ||
    safeConcurrency > 2
  )
    throw new Error(
      "Long-Task isolated concurrency must be 1 or 2; use 1 as the serial rollback.",
    );
  const normalized = availableFiles.map((file) => path.basename(file));
  if (new Set(normalized).size !== normalized.length)
    throw new Error(
      "Long-Task isolation planning received duplicate test files.",
    );
  const safe = [];
  const exclusive = [];
  const unknown = [];
  for (const file of normalized) {
    const classification = classifyLongTaskTestFile(file);
    if (classification === "pure" || classification === "isolated")
      safe.push(file);
    else {
      exclusive.push(file);
      if (!longTaskExclusiveFiles.has(file)) unknown.push(file);
    }
  }
  return {
    safe: { files: safe, concurrency: safeConcurrency },
    exclusive: { files: exclusive, concurrency: 1 },
    unknown_files: unknown,
    unknown_files_parallelized: false,
  };
}

export function resolveLongTaskIsolatedConcurrency(environment = process.env) {
  const raw =
    environment.TY_CONTEXT_LONG_TASK_ISOLATED_CONCURRENCY ??
    String(LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY);
  if (!/^[12]$/u.test(raw))
    throw new Error(
      "TY_CONTEXT_LONG_TASK_ISOLATED_CONCURRENCY must be 1 or 2; use 1 as the serial rollback.",
    );
  return Number(raw);
}

export function resolveTestTimingOutput(
  repositoryRoot,
  suite,
  environment = process.env,
) {
  if (environment.TY_CONTEXT_TEST_TIMING_FILE)
    return resolveFromRepository(
      repositoryRoot,
      environment.TY_CONTEXT_TEST_TIMING_FILE,
    );
  if (environment.TY_CONTEXT_TEST_TIMING_DIR)
    return resolveFromRepository(
      repositoryRoot,
      path.join(environment.TY_CONTEXT_TEST_TIMING_DIR, `${suite}.json`),
    );
  return null;
}

export function resolveSuiteWallTimeBudgetMs(suite, environment = process.env) {
  if (environment.TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON)
    throw new Error(
      "TY_CONTEXT_TEST_SUITE_BUDGETS_MS_JSON is retired; select a repository-reviewed TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE instead.",
    );
  const profileName = environment.TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE;
  if (!profileName) return null;
  const profile = CONTROLLED_TEST_SUITE_BUDGET_PROFILES[profileName];
  if (!profile)
    throw new Error(
      `Unknown TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE: ${profileName}.`,
    );
  for (const [key, expected] of Object.entries(profile.expected_environment)) {
    if (environment[key] !== expected)
      throw new Error(
        `TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE ${profileName} requires ${key}=${expected}; received ${environment[key] ?? "<unset>"}.`,
      );
  }
  const value = profile.budgets_ms[suite];
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(
      `TY_CONTEXT_TEST_SUITE_BUDGET_PROFILE ${profileName} must provide a positive integer budget for ${suite}.`,
    );
  return value;
}

export function criticalSentinelsForSuite(suite) {
  if (!SUPPORTED_TEST_SUITES.has(suite))
    throw new Error(`Unsupported package test suite: ${suite}.`);
  return Object.freeze(
    CRITICAL_TEST_SENTINELS.filter((entry) =>
      entry.required_suites.includes(suite),
    ),
  );
}

export function suiteWallTimeBudgetStatus(wallTimeMs, budgetMs) {
  if (budgetMs === null) return "not_configured";
  return wallTimeMs <= budgetMs ? "within_budget" : "exceeded";
}

export function testPath(name) {
  return `${TEST_ROOT}/${name}`;
}

function resolveFromRepository(repositoryRoot, value) {
  return path.isAbsolute(value) ? value : path.resolve(repositoryRoot, value);
}

function assertIsolationPolicy() {
  if (LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY !== 2)
    throw new Error(
      "Long-Task safe-lane concurrency changed from the reviewed default of 2; retain TY_CONTEXT_LONG_TASK_ISOLATED_CONCURRENCY=1 as the mechanical serial rollback and repeat behavioral A/B proof before changing the default.",
    );
  const classified = [
    ...LONG_TASK_PURE_TEST_FILES,
    ...LONG_TASK_ISOLATED_TEST_FILES,
    ...LONG_TASK_EXCLUSIVE_TEST_FILES,
  ];
  if (new Set(classified).size !== classified.length)
    throw new Error("Long-Task isolation classes must be disjoint.");
  if (
    LONG_TASK_PURE_TEST_FILES.length !== 13 ||
    LONG_TASK_ISOLATED_TEST_FILES.length !== 44 ||
    LONG_TASK_EXCLUSIVE_TEST_FILES.length !== 11
  )
    throw new Error(
      "Long-Task isolation policy changed from the reviewed 13/44/11 population; review the new file explicitly instead of parallelizing it by default.",
    );
}

function criticalSentinel(id, file, requiredSuites, rationale) {
  return Object.freeze({
    id,
    file,
    required_suites: Object.freeze([...requiredSuites]),
    rationale,
  });
}

function assertCriticalTestSentinels() {
  const ids = new Set();
  for (const entry of CRITICAL_TEST_SENTINELS) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(entry.id))
      throw new Error(`Invalid critical test sentinel id: ${entry.id}.`);
    if (ids.has(entry.id))
      throw new Error(`Duplicate critical test sentinel id: ${entry.id}.`);
    ids.add(entry.id);
    if (
      path.basename(entry.file) !== entry.file ||
      !entry.file.endsWith(".test.mjs")
    )
      throw new Error(`Invalid critical test sentinel file: ${entry.file}.`);
    if (
      entry.required_suites.length === 0 ||
      new Set(entry.required_suites).size !== entry.required_suites.length ||
      entry.required_suites.some((suite) => !SUPPORTED_TEST_SUITES.has(suite))
    )
      throw new Error(
        `Invalid suite placement for critical sentinel ${entry.id}.`,
      );
    const isLongTaskFile = entry.file.startsWith("long-task-");
    if (
      (entry.required_suites.includes("default") && isLongTaskFile) ||
      (entry.required_suites.some((suite) => suite.startsWith("long-task")) &&
        !isLongTaskFile)
    )
      throw new Error(
        `Critical sentinel ${entry.id} is assigned to the wrong suite family.`,
      );
    if (
      entry.required_suites.includes("long-task-trust") &&
      !entry.required_suites.includes("long-task")
    )
      throw new Error(
        `Trust sentinel ${entry.id} must also run in the complete Long-Task suite.`,
      );
    if (typeof entry.rationale !== "string" || entry.rationale.length <= 40)
      throw new Error(
        `Critical sentinel ${entry.id} requires a review rationale.`,
      );
  }
}
