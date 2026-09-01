import assert from "node:assert/strict";

export function assertCriticalInventoryContract(read) {
  const sources = readCriticalInventorySources(read);
  assertSuiteInventoryIntegration(sources);
  assertStaticInventoryCoverage(sources);
  assertRoleAndCapabilityCoverage(sources);
  assertRegistrationProjectionBoundary(sources);
  assertNoProcessFallback(sources);
}

function readCriticalInventorySources(read) {
  return {
    suiteRunner: read("tests/ty-context/run-package-suite.mjs"),
    suiteReporter: read("tests/ty-context/test-suite-file-reporter.mjs"),
    suitePolicy: read("tools/test_suite_policy.mjs"),
    suiteSelection: read("tools/test_suite_selection.mjs"),
    titleInventory: read("tools/test_title_inventory.mjs"),
    titleAnalysis: read("tools/test_title_static_analysis.mjs"),
    titleDestructuringRoles: read("tools/test_title_destructuring_roles.mjs"),
    titleModuleEdges: read("tools/test_title_module_edges.mjs"),
    titleRegistration: read("tools/test_title_registration_resolution.mjs"),
    titleExpressionRoles: read("tools/test_title_expression_roles.mjs"),
    titleConstructorRoles: read("tools/test_title_constructor_roles.mjs"),
    titleReferenceValidation: read("tools/test_title_reference_validation.mjs"),
    titleRoles: read("tools/test_title_roles.mjs"),
    titleScopeModel: read("tools/test_title_scope_model.mjs"),
    titlePatternScope: read("tools/test_title_pattern_scope.mjs"),
    sentinelRunner: read("tools/run_required_critical_sentinel.mjs"),
    sentinelReport: read("tools/required_critical_sentinel_report.mjs"),
  };
}

function assertSuiteInventoryIntegration(sources) {
  const {
    suiteRunner,
    suiteReporter,
    suitePolicy,
    suiteSelection,
    titleInventory,
    sentinelRunner,
  } = sources;
  assert.match(suiteRunner, /selectPackageTestNames\(availableNames, suite\)/u);
  assert.match(suiteRunner, /assertCriticalTestTitleInventory/u);
  assert.match(suiteRunner, /critical_title_inventory/u);
  assert.match(suiteRunner, /require_exact_file_summaries/u);
  assert.match(suitePolicy, /LONG_TASK_TRUST_TEST_FILES/u);
  assert.match(suiteSelection, /export function selectPackageTestNames/u);
  assert.match(suiteSelection, /LONG_TASK_TRUST_TEST_FILES/u);
  assert.match(suiteSelection, /\^long-task-/u);
  assert.match(sentinelRunner, /assertCriticalTestTitleInventory/u);
  assert.match(sentinelRunner, /selectPackageTestNames/u);
  assert.match(titleInventory, /from "acorn"/u);
  assert.match(titleInventory, /analyzeNodeTestProgram/u);
  assert.match(titleInventory, /local_module_edges/u);
  assert.match(titleInventory, /isWithinDirectory/u);
  assert.match(titleInventory, /critical_occurrences/u);
  assert.match(
    suiteRunner,
    /declaredCriticalOccurrences: titleInventory\.critical_occurrences/u,
  );
  assert.match(
    sentinelRunner,
    /declaredCriticalOccurrences:[\s\S]*critical_occurrences/u,
  );
  assert.match(suiteReporter, /declaration_mismatch_ids/u);
  assert.match(suiteReporter, /file_summary_integrity/u);
  assert.match(suiteReporter, /summary_terminal_count/u);
}

function assertStaticInventoryCoverage(sources) {
  const {
    titleAnalysis,
    titleDestructuringRoles,
    titleModuleEdges,
    titleInventory,
  } = sources;
  assert.match(titleAnalysis, /critical_test_title_inventory_dynamic_title/u);
  assert.match(titleAnalysis, /resolveRegistrationRoles/u);
  assert.match(titleAnalysis, /resolveDestructuringRoles/u);
  assert.match(titleDestructuringRoles, /bindingScope/u);
  assert.match(titleDestructuringRoles, /evaluationScope/u);
  assert.match(titleDestructuringRoles, /resolveStaticPropertyName/u);
  assert.match(titleDestructuringRoles, /resolveConstructorAccessRole/u);
  assert.match(titleDestructuringRoles, /AssignmentExpression/u);
  assert.match(titleDestructuringRoles, /ForInStatement/u);
  assert.match(titleDestructuringRoles, /ForOfStatement/u);
  assert.match(
    titleModuleEdges,
    /critical_test_title_inventory_dynamic_module_specifier/u,
  );
  assert.match(
    titleModuleEdges,
    /critical_test_title_inventory_unsupported_dynamic_import/u,
  );
  assert.match(titleInventory, /createRequire/u);
}

function assertRoleAndCapabilityCoverage(sources) {
  const {
    titleRegistration,
    titleExpressionRoles,
    titleConstructorRoles,
    titleReferenceValidation,
    titleRoles,
    titleScopeModel,
    titlePatternScope,
  } = sources;
  assert.match(titleRegistration, /resolveImmutableAliases/u);
  assert.match(titleRegistration, /get-builtin-module/u);
  assert.match(titleExpressionRoles, /get-builtin-module/u);
  assert.match(titleExpressionRoles, /dynamic-code/u);
  assert.match(titleExpressionRoles, /constructor-access/u);
  assert.match(titleExpressionRoles, /constructor-identity-method/u);
  assert.match(titleConstructorRoles, /CONSTRUCTOR_INSPECTION_PROPERTIES/u);
  assert.match(titleConstructorRoles, /unknown-role-bearing-value/u);
  assert.match(titleConstructorRoles, /unsupported-constructor-capability/u);
  assert.match(
    titleReferenceValidation,
    /critical_test_title_inventory_unsupported_node_test_reference/u,
  );
  assert.match(titleRoles, /NODE_TEST_FUNCTION_EXPORTS/u);
  assert.match(titleRoles, /NODE_TEST_SUITE_EXPORTS/u);
  assert.match(titleRoles, /registerHooks/u);
  assert.match(titleScopeModel, /buildNodeTestScopeModel/u);
  assert.match(titleScopeModel, /createScope/u);
  assert.match(titleScopeModel, /function-parameters/u);
  assert.match(titlePatternScope, /bindScopePattern/u);
}

function assertRegistrationProjectionBoundary(sources) {
  const { sentinelRunner, sentinelReport } = sources;
  assert.match(sentinelRunner, /required-critical-sentinel-report-v1/u);
  assert.match(sentinelRunner, /projection_status/u);
  assert.match(sentinelRunner, /verified_ids/u);
  assert.match(sentinelRunner, /registry_runtime_observation_complete/u);
  assert.match(sentinelRunner, /applicableCriticalSentinels/u);
  assert.match(sentinelRunner, /require_exact_file_summaries/u);
  assert.match(sentinelRunner, /\.\.\.selectedFiles/u);
  assert.match(sentinelRunner, /spawnCommandOnce/u);
  assert.match(sentinelRunner, /REGISTRATION_PROJECTION_TIMEOUT_MS = 300_000/u);
  assert.match(
    sentinelReport,
    /critical_sentinel_projection_partition_invalid/u,
  );
}

function assertNoProcessFallback(sources) {
  const checkedSources = [
    "titleInventory",
    "titleAnalysis",
    "titleDestructuringRoles",
    "titleModuleEdges",
    "titleRegistration",
    "titleConstructorRoles",
    "titleReferenceValidation",
    "titleRoles",
    "titleScopeModel",
    "titlePatternScope",
  ];
  for (const owner of checkedSources) {
    const source = sources[owner];
    assert.doesNotMatch(source, /grep|execFile|spawn/u, owner);
  }
}
