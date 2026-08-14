export const REAL_PROCESS_SCHEMAS = Object.freeze({
  FORMAL_TOTAL_COST_ACCOUNTING_POLICY_SCHEMA:
    "long-task-formal-total-cost-accounting-policy-v1",
  FORMAL_TOTAL_COST_EVIDENCE_PACKET_SCHEMA:
    "long-task-formal-total-cost-evidence-packet-v1",
  FORMAL_TOTAL_COST_PRECOLLECTION_PLAN_SCHEMA:
    "long-task-formal-total-cost-precollection-plan-v1",
  FORMAL_TOTAL_COST_PRICE_DOCUMENT_SCHEMA:
    "long-task-formal-total-cost-price-document-v1",
  FORMAL_TOTAL_COST_PRICE_SOURCE_SCHEMA:
    "long-task-formal-total-cost-price-source-v1",
  FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA:
    "long-task-formal-total-cost-provider-event-v1",
  FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA:
    "long-task-formal-total-cost-raw-event-v1",
  FORMAL_TOTAL_COST_REDACTION_RULE_SCHEMA:
    "long-task-formal-total-cost-redaction-rule-v1",
  FORMAL_TOTAL_COST_SCENARIO_CATALOG_SCHEMA:
    "long-task-formal-total-cost-scenario-catalog-v1",
  FORMAL_TOTAL_COST_SOURCE_MANIFEST_SCHEMA:
    "long-task-formal-total-cost-source-manifest-v1",
  REAL_PROCESS_ROI_SCHEMA: "long-task-real-process-roi-run-set-v3",
  REAL_PROCESS_RUN_SCHEMA: "long-task-real-process-roi-run-v3",
  REAL_PROCESS_MANIFEST_SCHEMA: "long-task-real-process-roi-manifest-v1",
  REAL_PROCESS_ATTESTATION_SCHEMA: "long-task-real-process-roi-attestation-v3",
  REAL_PROCESS_FROZEN_CONFIG_SCHEMA:
    "long-task-real-process-roi-frozen-config-v3",
  REAL_PROCESS_SUMMARY_SCHEMA: "long-task-real-process-roi-summary-v3",
  REAL_PROCESS_DRY_RUN_SCHEMA: "long-task-real-process-roi-dry-run-v3",
  REAL_PROCESS_COLLECTION_SCHEMA: "long-task-real-process-roi-collection-v3",
  REAL_PROCESS_VERIFICATION_SCHEMA:
    "long-task-real-process-roi-verification-v3",
  REAL_PROCESS_WORKLOAD_SCHEMA: "long-task-real-process-workload-v3",
});

export const LEGACY_REAL_PROCESS_SCHEMAS = Object.freeze({
  run_set: Object.freeze([
    "long-task-real-process-roi-run-set-v1",
    "long-task-real-process-roi-run-set-v2",
  ]),
  run: Object.freeze([
    "long-task-real-process-roi-run-v1",
    "long-task-real-process-roi-run-v2",
  ]),
  attestation: Object.freeze([
    "long-task-real-process-roi-attestation-v1",
    "long-task-real-process-roi-attestation-v2",
  ]),
  frozen_config: Object.freeze([
    "long-task-real-process-roi-frozen-config-v1",
    "long-task-real-process-roi-frozen-config-v2",
  ]),
  summary: Object.freeze([
    "long-task-real-process-roi-summary-v1",
    "long-task-real-process-roi-summary-v2",
  ]),
  dry_run: Object.freeze(["long-task-real-process-roi-dry-run-v2"]),
  collection: Object.freeze(["long-task-real-process-roi-collection-v2"]),
  verification: Object.freeze(["long-task-real-process-roi-verification-v2"]),
  workload: Object.freeze([
    "long-task-real-process-workload-v1",
    "long-task-real-process-workload-v2",
  ]),
});

export const BASELINE_A_COMMIT = "0f35e08aa4ed272c9d23df92c3fe4604194790df";
export const ISOLATED_ENVELOPE_B_COMMIT =
  "808efa9e9a6cfea7e12bde48cd18dc7c87cb7e70";

export const VARIANT_IDS = Object.freeze(["a", "b", "c"]);
export const CASE_IDS = Object.freeze([
  "correct-control",
  "wrong-product-value",
  "r9-evidence-role-runtime-input",
  "r10-verification-role-runtime-input",
  "r11-source-wrong-execution-root",
]);
export const KNOWN_B_FALSE_ACCEPT_CASE_IDS = Object.freeze([
  "r9-evidence-role-runtime-input",
  "r10-verification-role-runtime-input",
  "r11-source-wrong-execution-root",
]);
export const COUNTERFACTUAL_IDS = Object.freeze([
  "disable-checkout",
  "exceed-retry-budget",
]);

export const MAINTENANCE_RUNTIME_OWNER_PATHS = Object.freeze([
  "packages/ty-context/src/lib/long-task-check-runner.ts",
  "packages/ty-context/src/lib/long-task-evidence-capability-runtime.ts",
  "packages/ty-context/src/lib/long-task-evidence-v2.ts",
  "packages/ty-context/src/lib/long-task-verifier-v2.ts",
  "packages/ty-context/src/lib/long-task-final-v2.ts",
  "packages/ty-context/src/lib/long-task-counterfactual-sandbox.ts",
  "packages/ty-context/src/lib/long-task-observation-authority.ts",
  "packages/ty-context/src/lib/long-task-process-observation.ts",
  "packages/ty-context/src/lib/long-task-execution-observation.ts",
  "packages/ty-context/src/lib/long-task-static-observation-freeze.ts",
  "packages/ty-context/src/lib/long-task-exact-comparison.ts",
  "packages/ty-context/src/lib/long-task-admitted-observation.ts",
  "packages/ty-context/src/lib/long-task-process-runtime-closure.ts",
]);

export const MAINTENANCE_TEST_PATHS = Object.freeze([
  "tests/ty-context/long-task-delivery-compiler.test.mjs",
  "tests/ty-context/long-task-evidence-kernel.test.mjs",
  "tests/ty-context/long-task-counterfactual-integrity.test.mjs",
  "tests/ty-context/long-task-direct-process-observer.test.mjs",
  "tests/ty-context/long-task-execution-observation.test.mjs",
  "tests/ty-context/long-task-static-observation-freeze.test.mjs",
  "tests/ty-context/long-task-observer-trust-counterexamples.test.mjs",
  "tests/ty-context/long-task-final-closure-mutation-smoke.test.mjs",
]);

export const REPEAT_ORDERS = Object.freeze([
  Object.freeze(["a", "b", "c"]),
  Object.freeze(["b", "c", "a"]),
  Object.freeze(["c", "a", "b"]),
  Object.freeze(["a", "c", "b"]),
  Object.freeze(["c", "b", "a"]),
]);

export const MEASUREMENT_THRESHOLDS = Object.freeze({
  minimum_repeats: 3,
  minimum_wins: 2,
  expanded_repeats: 5,
  expanded_wins: 3,
  maximum_coefficient_of_variation: 0.2,
  threshold_nearness: 0.05,
  maximum_correct_path_cost_ratio: 1.25,
  maximum_phase_cost_ratio: 1.5,
  candidate_false_completions: 0,
  candidate_correct_accept_rate: 1,
  candidate_counterfactual_pass_rate: 1,
  migration_amortization_horizon: 10,
});

export const FORMAL_TOTAL_COST_CATEGORIES = Object.freeze([
  "authoring",
  "runtime",
  "state",
  "recovery",
  "maintenance",
  "test",
  "process",
  "introduction",
  "adoption",
  "migration",
]);

export const FORMAL_TOTAL_COST_UNIT = "normalized-cost-units";

export const FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH =
  "examples/delivery-benchmark/real-process-workload/accounting-policy.json";

export const REQUIRED_METRICS = Object.freeze([
  "authoring_active_ms",
  "authoring_token_count",
  "contract_bytes",
  "effective_yaml_lines",
  "manual_source_reference_count",
  "preflight_repair_rounds",
  "compile_wall_ms",
  "compile_peak_rss_bytes",
  "compiled_contract_bytes",
  "authority_bytes",
  "verify_wall_ms",
  "verify_snapshot_ms",
  "unique_raw_execution_ms",
  "counterfactual_wall_ms",
  "counterfactual_incremental_ms",
  "closure_copy_ms",
  "closure_copy_bytes",
  "final_gate_wall_ms",
  "final_gate_snapshot_ms",
  "rework_count",
  "modification_rounds",
  "false_completion_count",
  "false_completion_rate",
  "false_blocking_count",
  "false_blocking_rate",
  "correct_path_total_ms",
  "total_elapsed_ms",
  "migration_ms",
  "maintenance_minutes",
  "runtime_owner_file_count",
  "runtime_owner_loc",
  "test_file_count",
  "test_loc",
  "peak_rss_bytes",
  "spawned_process_count",
  "process_execution_count",
  "stdout_bytes",
]);

export const NULLABLE_UNVERIFIED_METRICS = Object.freeze([
  "authoring_token_count",
  "maintenance_minutes",
]);

export const SIGNED_METRICS = Object.freeze(["counterfactual_incremental_ms"]);

export const PHASE_COST_METRICS = Object.freeze([
  "authoring_active_ms",
  "compile_wall_ms",
  "verify_wall_ms",
  "counterfactual_wall_ms",
  "final_gate_wall_ms",
]);

export function variantDefinitions(candidateCommit) {
  assertFullSha(candidateCommit, "candidate_commit");
  return Object.freeze({
    a: Object.freeze({
      id: "a",
      label: "legacy-self-report",
      commit: BASELINE_A_COMMIT,
      comparison_role: "cost-and-error-baseline-only",
      safety_eligible: false,
      expected_observation_boundary: "project-v3-self-report",
    }),
    b: Object.freeze({
      id: "b",
      label: "isolated-envelope-before-source-closure",
      commit: ISOLATED_ENVELOPE_B_COMMIT,
      comparison_role: "historical-runtime-cost-baseline",
      safety_eligible: false,
      expected_observation_boundary: "isolated-product-stdout-envelope",
    }),
    c: Object.freeze({
      id: "c",
      label: "source-backed-process-runtime-closure",
      commit: candidateCommit,
      comparison_role: "measurement-candidate",
      safety_eligible: true,
      expected_observation_boundary:
        "source-backed-isolated-product-stdout-envelope",
    }),
  });
}

export function repeatOrder(repeat) {
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > REPEAT_ORDERS.length)
    throw new Error(`real_process_roi_repeat_out_of_range:${repeat}`);
  return [...REPEAT_ORDERS[repeat - 1]];
}

export function requiredWins(repeats) {
  if (repeats === MEASUREMENT_THRESHOLDS.minimum_repeats)
    return MEASUREMENT_THRESHOLDS.minimum_wins;
  if (repeats === MEASUREMENT_THRESHOLDS.expanded_repeats)
    return MEASUREMENT_THRESHOLDS.expanded_wins;
  throw new Error(`real_process_roi_repeat_count_unsupported:${repeats}`);
}

export function assertFullSha(value, label) {
  if (!/^[a-f0-9]{40}$/u.test(value ?? ""))
    throw new Error(`real_process_roi_invalid:${label}`);
}
