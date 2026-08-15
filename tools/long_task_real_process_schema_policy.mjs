export const REAL_PROCESS_SCHEMAS = Object.freeze({
  FORMAL_TOTAL_COST_ACCOUNTING_POLICY_SCHEMA:
    "long-task-formal-total-cost-accounting-policy-v2",
  FORMAL_TOTAL_COST_EVIDENCE_PACKET_SCHEMA:
    "long-task-formal-total-cost-evidence-packet-v2",
  FORMAL_TOTAL_COST_PRECOLLECTION_PLAN_SCHEMA:
    "long-task-formal-total-cost-precollection-plan-v2",
  FORMAL_TOTAL_COST_PRICE_DOCUMENT_SCHEMA:
    "long-task-formal-total-cost-price-document-v1",
  FORMAL_TOTAL_COST_PRICE_SOURCE_SCHEMA:
    "long-task-formal-total-cost-price-source-v1",
  FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA:
    "long-task-formal-total-cost-provider-event-v2",
  FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA:
    "long-task-formal-total-cost-raw-event-v2",
  FORMAL_TOTAL_COST_REDACTION_RULE_SCHEMA:
    "long-task-formal-total-cost-redaction-rule-v1",
  FORMAL_TOTAL_COST_SCENARIO_CATALOG_SCHEMA:
    "long-task-formal-total-cost-scenario-catalog-v2",
  FORMAL_TOTAL_COST_SOURCE_MANIFEST_SCHEMA:
    "long-task-formal-total-cost-source-manifest-v2",
  FORMAL_TOTAL_COST_COLLECTOR_CATALOG_SCHEMA:
    "long-task-formal-total-cost-collector-catalog-v1",
  FORMAL_SCENARIO_EXECUTION_SCHEMA: "formal-scenario-execution-v1",
  FORMAL_HUMAN_INTERACTION_TRACE_SCHEMA: "formal-runner-interaction-trace-v1",
  FORMAL_PROCESS_ACCOUNTING_SCHEMA: "formal-process-tree-accounting-v1",
  FORMAL_STORAGE_LEDGER_SCHEMA: "formal-runner-storage-ledger-v1",
  LEVEL4_INDEPENDENT_AUDIT_SCHEMA: "level4-independent-capability-audit-v1",
  LEVEL4_PROMOTION_RECORD_SCHEMA: "level4-governance-promotion-v1",
  REAL_PROCESS_ROI_SCHEMA: "long-task-real-process-roi-run-set-v4",
  REAL_PROCESS_RUN_SCHEMA: "long-task-real-process-roi-run-v4",
  REAL_PROCESS_MANIFEST_SCHEMA: "long-task-real-process-roi-manifest-v2",
  REAL_PROCESS_ATTESTATION_SCHEMA: "long-task-real-process-roi-attestation-v4",
  REAL_PROCESS_FROZEN_CONFIG_SCHEMA:
    "long-task-real-process-roi-frozen-config-v4",
  REAL_PROCESS_SUMMARY_SCHEMA: "long-task-real-process-roi-summary-v4",
  REAL_PROCESS_DRY_RUN_SCHEMA: "long-task-real-process-roi-dry-run-v4",
  REAL_PROCESS_COLLECTION_SCHEMA: "long-task-real-process-roi-collection-v4",
  REAL_PROCESS_VERIFICATION_SCHEMA:
    "long-task-real-process-roi-verification-v4",
  REAL_PROCESS_WORKLOAD_SCHEMA: "long-task-real-process-workload-v4",
});

export const LEGACY_FORMAL_EVIDENCE_SCHEMAS = Object.freeze({
  accounting_policy: Object.freeze([
    "long-task-formal-total-cost-accounting-policy-v1",
  ]),
  evidence_packet: Object.freeze([
    "long-task-formal-total-cost-evidence-packet-v1",
  ]),
  precollection_plan: Object.freeze([
    "long-task-formal-total-cost-precollection-plan-v1",
  ]),
  provider_event: Object.freeze([
    "long-task-formal-total-cost-provider-event-v1",
  ]),
  raw_event: Object.freeze(["long-task-formal-total-cost-raw-event-v1"]),
  scenario_catalog: Object.freeze([
    "long-task-formal-total-cost-scenario-catalog-v1",
  ]),
  source_manifest: Object.freeze([
    "long-task-formal-total-cost-source-manifest-v1",
  ]),
});

export const LEGACY_REAL_PROCESS_SCHEMAS = Object.freeze({
  run_set: Object.freeze([
    "long-task-real-process-roi-run-set-v1",
    "long-task-real-process-roi-run-set-v2",
    "long-task-real-process-roi-run-set-v3",
  ]),
  run: Object.freeze([
    "long-task-real-process-roi-run-v1",
    "long-task-real-process-roi-run-v2",
    "long-task-real-process-roi-run-v3",
  ]),
  attestation: Object.freeze([
    "long-task-real-process-roi-attestation-v1",
    "long-task-real-process-roi-attestation-v2",
    "long-task-real-process-roi-attestation-v3",
  ]),
  frozen_config: Object.freeze([
    "long-task-real-process-roi-frozen-config-v1",
    "long-task-real-process-roi-frozen-config-v2",
    "long-task-real-process-roi-frozen-config-v3",
  ]),
  summary: Object.freeze([
    "long-task-real-process-roi-summary-v1",
    "long-task-real-process-roi-summary-v2",
    "long-task-real-process-roi-summary-v3",
  ]),
  dry_run: Object.freeze([
    "long-task-real-process-roi-dry-run-v2",
    "long-task-real-process-roi-dry-run-v3",
  ]),
  collection: Object.freeze([
    "long-task-real-process-roi-collection-v2",
    "long-task-real-process-roi-collection-v3",
  ]),
  verification: Object.freeze([
    "long-task-real-process-roi-verification-v2",
    "long-task-real-process-roi-verification-v3",
  ]),
  workload: Object.freeze([
    "long-task-real-process-workload-v1",
    "long-task-real-process-workload-v2",
    "long-task-real-process-workload-v3",
  ]),
  manifest: Object.freeze(["long-task-real-process-roi-manifest-v1"]),
});

export const REAL_PROCESS_SCHEMA_FAMILY_TABLE = Object.freeze({
  formal_evidence: Object.freeze({
    current: Object.freeze({
      accounting_policy:
        REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_ACCOUNTING_POLICY_SCHEMA,
      evidence_packet:
        REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_EVIDENCE_PACKET_SCHEMA,
      precollection_plan:
        REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PRECOLLECTION_PLAN_SCHEMA,
      provider_event:
        REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA,
      raw_event: REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA,
      scenario_catalog:
        REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_SCENARIO_CATALOG_SCHEMA,
      source_manifest:
        REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_SOURCE_MANIFEST_SCHEMA,
    }),
    next: null,
    legacy: LEGACY_FORMAL_EVIDENCE_SCHEMAS,
  }),
  real_process: Object.freeze({
    current: Object.freeze({
      attestation: REAL_PROCESS_SCHEMAS.REAL_PROCESS_ATTESTATION_SCHEMA,
      collection: REAL_PROCESS_SCHEMAS.REAL_PROCESS_COLLECTION_SCHEMA,
      dry_run: REAL_PROCESS_SCHEMAS.REAL_PROCESS_DRY_RUN_SCHEMA,
      frozen_config: REAL_PROCESS_SCHEMAS.REAL_PROCESS_FROZEN_CONFIG_SCHEMA,
      manifest: REAL_PROCESS_SCHEMAS.REAL_PROCESS_MANIFEST_SCHEMA,
      run: REAL_PROCESS_SCHEMAS.REAL_PROCESS_RUN_SCHEMA,
      run_set: REAL_PROCESS_SCHEMAS.REAL_PROCESS_ROI_SCHEMA,
      summary: REAL_PROCESS_SCHEMAS.REAL_PROCESS_SUMMARY_SCHEMA,
      verification: REAL_PROCESS_SCHEMAS.REAL_PROCESS_VERIFICATION_SCHEMA,
      workload: REAL_PROCESS_SCHEMAS.REAL_PROCESS_WORKLOAD_SCHEMA,
    }),
    next: null,
    legacy: LEGACY_REAL_PROCESS_SCHEMAS,
  }),
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

export const FORMAL_SCENARIO_CATALOG_REPOSITORY_PATH =
  "examples/delivery-benchmark/real-process-workload/formal-scenario-catalog.json";

export const FORMAL_EVIDENCE_CAPACITY = Object.freeze({
  expected_execution_count: 86,
  expected_runner_artifact_count: 576,
  maximum_formal_files: 640,
  maximum_formal_total_bytes: 384 * 1024 * 1024,
  maximum_run_set_files: 4096,
  maximum_run_set_total_bytes: 512 * 1024 * 1024,
  maximum_run_set_control_files: 2,
  maximum_run_set_control_total_bytes: 4 * 1024 * 1024,
  maximum_run_set_control_bytes_per_file: 2 * 1024 * 1024,
  maximum_scenario_output_bytes: 1024 * 1024,
  maximum_raw_prompt_bytes: 1024 * 1024,
  maximum_combined_stream_bytes: 2 * 1024 * 1024,
  maximum_event_bytes: 128 * 1024,
  maximum_measurement_record_bytes: 64 * 1024,
  maximum_lifecycle_file_bytes: 64 * 1024 * 1024,
});

export const FORMAL_CLOCK_POLICY = Object.freeze({
  monotonic_clock_id: "runner-monotonic-hrtime-v1",
  wall_clock_id: "runner-wall-utc-v1",
  provider_clock_id_prefix: "provider-recorded-at-v1:",
  wall_monotonic_elapsed_tolerance_ms: 250,
  provider_wall_window_tolerance_ms: 5000,
});
