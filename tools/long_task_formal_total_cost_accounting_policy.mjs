import {
  FORMAL_TOTAL_COST_CATEGORIES,
  FORMAL_TOTAL_COST_UNIT,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_roi_policy.mjs";
import {
  assert,
  canonical,
} from "./long_task_real_process_roi_scoring.mjs";
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
      "rounding_decimal_places",
      "schema_version",
      "scope",
      "significant_stable_margin",
      "source_bundle_limits",
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
    canonical(policy.retention) === canonical(expectedRetention()),
    "accounting_policy_retention",
  );
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
    stratum(
      "maintenance_once",
      ["maintenance"],
      5,
      "median-paired-delta",
      1,
    ),
    stratum(
      "recovery_once",
      ["recovery"],
      5,
      "median-paired-delta",
      1,
    ),
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

function stratum(key, categories, pairCount, aggregation, cycleMultiplier) {
  return {
    key,
    categories,
    pair_count: pairCount,
    aggregation,
    cycle_multiplier: cycleMultiplier,
  };
}
