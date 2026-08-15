import {
  FORMAL_TOTAL_COST_CATEGORIES,
  FORMAL_TOTAL_COST_UNIT,
  FORMAL_EVIDENCE_CAPACITY,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_schema_policy.mjs";
import { assert, canonical } from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  assertSameSet,
  meterUnits,
  parseJson,
  readRegularFileNoFollow,
} from "./long_task_formal_total_cost_shared.mjs";

const { FORMAL_TOTAL_COST_ACCOUNTING_POLICY_SCHEMA } = REAL_PROCESS_SCHEMAS;

export async function readFormalAccountingPolicy(file) {
  const bytes = await readRegularFileNoFollow(file, 1024 * 1024);
  const policy = parseJson(bytes, "accounting_policy_json");
  validateFormalAccountingPolicy(policy);
  return { bytes, policy };
}

export function validateFormalAccountingPolicy(policy) {
  assertExactKeys(
    policy,
    [
      "event_ownership",
      "external_price_sources",
      "human_time_rates",
      "key",
      "lifecycle_population",
      "normalized_unit",
      "retention",
      "run_artifact_limits",
      "rounding_decimal_places",
      "schema_version",
      "scope",
      "significant_stable_margin",
      "source_bundle_limits",
      "state_storage_retention",
    ],
    "accounting_policy_field_set",
  );
  assert(
    policy.schema_version === FORMAL_TOTAL_COST_ACCOUNTING_POLICY_SCHEMA &&
      policy.key === "level-4-total-roi-2026-08-14" &&
      policy.scope === "this-delivery-only",
    "accounting_policy_identity",
  );
  assertExactKeys(
    policy.normalized_unit,
    ["currency", "name", "ncu_per_cny"],
    "accounting_policy_normalized_unit_fields",
  );
  assert(
    policy.normalized_unit.name === FORMAL_TOTAL_COST_UNIT &&
      policy.normalized_unit.currency === "CNY" &&
      policy.normalized_unit.ncu_per_cny === 1,
    "accounting_policy_normalized_unit",
  );
  validateHumanRates(policy.human_time_rates);
  validateLifecyclePopulation(policy.lifecycle_population);
  validateExternalPricePolicy(policy.external_price_sources);
  assertExactKeys(
    policy.source_bundle_limits,
    ["maximum_bytes_per_file", "maximum_files", "maximum_total_bytes"],
    "accounting_policy_source_limits_fields",
  );
  assert(
    policy.source_bundle_limits.maximum_files === 256 &&
      policy.source_bundle_limits.maximum_bytes_per_file === 8 * 1024 * 1024 &&
      policy.source_bundle_limits.maximum_total_bytes === 64 * 1024 * 1024,
    "accounting_policy_source_limits",
  );
  assert(
    canonical(policy.run_artifact_limits) ===
      canonical({
        expected_executions: FORMAL_EVIDENCE_CAPACITY.expected_execution_count,
        expected_runner_files:
          FORMAL_EVIDENCE_CAPACITY.expected_runner_artifact_count,
        formal_file_headroom: FORMAL_EVIDENCE_CAPACITY.formal_file_headroom,
        formal_worst_case_bytes:
          FORMAL_EVIDENCE_CAPACITY.formal_worst_case_bytes,
        formal_byte_headroom: FORMAL_EVIDENCE_CAPACITY.formal_byte_headroom,
        maximum_formal_files: FORMAL_EVIDENCE_CAPACITY.maximum_formal_files,
        maximum_formal_total_bytes:
          FORMAL_EVIDENCE_CAPACITY.maximum_formal_total_bytes,
        maximum_run_set_files: FORMAL_EVIDENCE_CAPACITY.maximum_run_set_files,
        maximum_run_set_total_bytes:
          FORMAL_EVIDENCE_CAPACITY.maximum_run_set_total_bytes,
        maximum_run_set_control_files:
          FORMAL_EVIDENCE_CAPACITY.maximum_run_set_control_files,
        maximum_run_set_control_total_bytes:
          FORMAL_EVIDENCE_CAPACITY.maximum_run_set_control_total_bytes,
        maximum_run_set_control_bytes_per_file:
          FORMAL_EVIDENCE_CAPACITY.maximum_run_set_control_bytes_per_file,
        maximum_scenario_output_bytes:
          FORMAL_EVIDENCE_CAPACITY.maximum_scenario_output_bytes,
        maximum_raw_prompt_bytes:
          FORMAL_EVIDENCE_CAPACITY.maximum_raw_prompt_bytes,
        maximum_state_payload_bytes:
          FORMAL_EVIDENCE_CAPACITY.maximum_state_payload_bytes,
        maximum_state_source_files:
          FORMAL_EVIDENCE_CAPACITY.maximum_state_source_files,
        maximum_combined_stream_bytes:
          FORMAL_EVIDENCE_CAPACITY.maximum_combined_stream_bytes,
        maximum_event_bytes: FORMAL_EVIDENCE_CAPACITY.maximum_event_bytes,
        maximum_measurement_record_bytes:
          FORMAL_EVIDENCE_CAPACITY.maximum_measurement_record_bytes,
        maximum_lifecycle_file_bytes:
          FORMAL_EVIDENCE_CAPACITY.maximum_lifecycle_file_bytes,
        maximum_package_tarball_bytes:
          FORMAL_EVIDENCE_CAPACITY.maximum_package_tarball_bytes,
        maximum_materialization_command_output_bytes:
          FORMAL_EVIDENCE_CAPACITY.maximum_materialization_command_output_bytes,
        budget_protocol: "catalog-artifact-roles-worst-case-v1",
        lifecycle_run_count: FORMAL_EVIDENCE_CAPACITY.lifecycle_run_count,
        lifecycle_commands_per_run:
          FORMAL_EVIDENCE_CAPACITY.lifecycle_commands_per_run,
        lifecycle_maximum_files_per_run:
          FORMAL_EVIDENCE_CAPACITY.lifecycle_maximum_files_per_run,
        lifecycle_maximum_files:
          FORMAL_EVIDENCE_CAPACITY.lifecycle_maximum_files,
        setup_maximum_files: FORMAL_EVIDENCE_CAPACITY.setup_maximum_files,
        precollection_maximum_files:
          FORMAL_EVIDENCE_CAPACITY.precollection_maximum_files,
        frozen_input_maximum_files:
          FORMAL_EVIDENCE_CAPACITY.frozen_input_maximum_files,
      }),
    "accounting_policy_run_artifact_limits",
  );
  assert(
    canonical(policy.retention) === canonical(expectedRetention()),
    "accounting_policy_retention",
  );
  validateStateStorageRetention(policy.state_storage_retention);
  assert(
    canonical(policy.event_ownership) ===
      canonical({
        identity_owner: "verify_long_task_real_process_roi",
        identity_inputs: [
          "source-relative-path",
          "source-sha256",
          "invocation-id",
        ],
        maximum_subject_owners_per_event: 1,
        cost_and_benefit_reuse_permitted: false,
      }),
    "accounting_policy_event_ownership",
  );
  assert(
    canonical(policy.significant_stable_margin) ===
      canonical({
        benefit_to_positive_incremental_cost_ratio: 1.25,
        minimum_positive_pair_count: 4,
        pair_count: 5,
        maximum_sample_coefficient_of_variation: 0.2,
        zero_mean_passes: false,
        cost_reductions:
          "reported-separately-and-do-not-offset-positive-incremental-costs",
      }),
    "accounting_policy_margin",
  );
  assert(policy.rounding_decimal_places === 6, "accounting_policy_rounding");
  return policy;
}

export function validateFormalStateRetentionSource({
  accountingPolicy,
  bundle,
}) {
  const retention = accountingPolicy.state_storage_retention;
  validateStateStorageRetention(retention);
  if (retention.status === "external_pending")
    throw new Error("formal_collection_state_retention_external_pending");
  const sources = [...bundle.files.values()].filter(
    ({ entry }) => entry.role === "state_retention_source",
  );
  assert(
    sources.length === 1 &&
      sources[0].entry.sha256 === retention.source_sha256 &&
      sources[0].entry.bytes > 0,
    "formal_collection_state_retention_source",
  );
  return Object.freeze({ ...retention });
}

function validateHumanRates(rates) {
  assertExactKeys(
    rates,
    [
      "active_cny_per_hour",
      "scope",
      "universal_standard_claimed",
      "wait_cny_per_hour",
    ],
    "accounting_policy_human_rate_fields",
  );
  assert(
    rates.scope === "this-delivery-precollection-proxy-only" &&
      rates.active_cny_per_hour === 200 &&
      rates.wait_cny_per_hour === 50 &&
      rates.universal_standard_claimed === false,
    "accounting_policy_human_rates",
  );
}

function validateLifecyclePopulation(population) {
  assertExactKeys(
    population,
    [
      "deliveries_per_cycle",
      "pair_count",
      "pairing",
      "purpose_benefit",
      "scenario_ids",
      "strata",
    ],
    "accounting_policy_population_fields",
  );
  assert(
    population.deliveries_per_cycle === 10 &&
      population.pair_count === 5 &&
      population.pairing === "variant-b-versus-variant-c",
    "accounting_policy_population",
  );
  const expectedStrata = [
    stratum(
      "repeatable_delivery",
      ["authoring", "runtime", "state", "test", "process"],
      5,
      "median-paired-delta",
      10,
    ),
    stratum("maintenance_once", ["maintenance"], 5, "median-paired-delta", 1),
    stratum("recovery_once", ["recovery"], 5, "median-paired-delta", 1),
    stratum(
      "one_time",
      ["introduction", "adoption", "migration"],
      1,
      "single-paired-delta",
      1,
    ),
  ];
  assert(
    canonical(population.strata) === canonical(expectedStrata),
    "accounting_policy_strata",
  );
  assertSameSet(
    population.strata.flatMap((item) => item.categories),
    FORMAL_TOTAL_COST_CATEGORIES,
    "accounting_policy_category_partition",
  );
  assert(
    canonical(population.scenario_ids) ===
      canonical(
        Object.fromEntries(
          FORMAL_TOTAL_COST_CATEGORIES.map((category) => [
            category,
            `fixed-${category}-task`,
          ]),
        ),
      ),
    "accounting_policy_scenario_ids",
  );
  assert(
    canonical(population.purpose_benefit) ===
      canonical({
        scenario_count: 1,
        scenario_id: "fixed-controlled-incident",
        scenario_kind: "controlled-real-or-sanitized-real-incident",
        pair_count: 5,
        aggregation: "median-paired-b-minus-c-loss",
        cycle_multiplier: 1,
        occurrence_rate_extrapolation: false,
      }),
    "accounting_policy_purpose_benefit",
  );
}

function validateExternalPricePolicy(policy) {
  assert(
    canonical(policy) ===
      canonical({
        required_meters: Object.keys(meterUnits),
        allowed_source_kinds: ["actual_invoice", "official_price"],
        freeze_requirement: "source-frozen-and-hashed-before-collection",
        missing_consequence: "total_roi_unsupported",
      }),
    "accounting_policy_external_prices",
  );
}

function expectedRetention() {
  return {
    raw_prompt: "retained-or-precollection-rule-redacted",
    provider_event: "retained-or-precollection-rule-redacted",
    sensitive_payload_transport: "local-only",
    not_applicable_requires_no_source: true,
  };
}

function validateStateStorageRetention(retention) {
  assertExactKeys(
    retention,
    [
      "basis",
      "missing_consequence",
      "retention_hours",
      "scope",
      "source_sha256",
      "status",
      "universal_standard_claimed",
    ],
    "accounting_policy_state_retention_fields",
  );
  assert(
    retention.missing_consequence === "formal_collection_fail_closed" &&
      retention.scope === "this-delivery-precollection-proxy-only" &&
      retention.universal_standard_claimed === false,
    "accounting_policy_state_retention_boundary",
  );
  if (retention.status === "external_pending") {
    assert(
      retention.retention_hours === null &&
        retention.basis === null &&
        retention.source_sha256 === null,
      "accounting_policy_state_retention_pending",
    );
    return;
  }
  assert(
    retention.status === "frozen_supported" &&
      Number.isSafeInteger(retention.retention_hours) &&
      retention.retention_hours > 0 &&
      retention.retention_hours <=
        Math.floor(
          Number.MAX_SAFE_INTEGER /
            FORMAL_EVIDENCE_CAPACITY.maximum_state_payload_bytes,
        ) &&
      typeof retention.basis === "string" &&
      retention.basis.length > 0 &&
      /^[a-f0-9]{64}$/u.test(retention.source_sha256),
    "accounting_policy_state_retention_supported",
  );
}

function stratum(key, categories, pairCount, aggregation, cycleMultiplier) {
  return {
    key,
    categories,
    pair_count: pairCount,
    aggregation,
    cycle_multiplier: cycleMultiplier,
  };
}
