import { assert } from "./long_task_real_process_roi_scoring.mjs";
import {
  formalEvidenceKey,
} from "./long_task_formal_total_cost_events.mjs";
import { pairIds } from "./long_task_formal_total_cost_shared.mjs";

export function deriveFormalTotalCostAccounting(byKey, accountingPolicy) {
  const categoryResults = {};
  let signedIncrementalCost = 0;
  let positiveIncrementalCost = 0;
  let costReduction = 0;
  for (const stratum of accountingPolicy.lifecycle_population.strata) {
    const pairs = stratum.pair_count === 1 ? ["once"] : pairIds;
    for (const category of stratum.categories) {
      const deltas = pairs.map(
        (pairId) =>
          eventValue(byKey, "cost", category, null, pairId, "c") -
          eventValue(byKey, "cost", category, null, pairId, "b"),
      );
      const representative =
        deltas.length === 1 ? deltas[0] : exactMedian(deltas);
      const cycleIncremental = representative * stratum.cycle_multiplier;
      const positive = Math.max(cycleIncremental, 0);
      const reduction = Math.max(-cycleIncremental, 0);
      signedIncrementalCost += cycleIncremental;
      positiveIncrementalCost += positive;
      costReduction += reduction;
      categoryResults[category] = categoryResult({
        stratum,
        deltas,
        representative,
        cycleIncremental,
        positive,
        reduction,
      });
    }
  }
  const benefit = derivePurposeBenefit(byKey, accountingPolicy);
  const pairedCycleMargins = benefit.deltas.map(
    (pairedBenefit) => pairedBenefit - positiveIncrementalCost,
  );
  return formalAccountingResult({
    accountingPolicy,
    categoryResults,
    signedIncrementalCost,
    positiveIncrementalCost,
    costReduction,
    benefit,
    pairedCycleMargins,
  });
}

function categoryResult(options) {
  const {
    stratum,
    deltas,
    representative,
    cycleIncremental,
    positive,
    reduction,
  } = options;
  return {
    stratum: stratum.key,
    pair_count: stratum.pair_count,
    paired_deltas_ncu: deltas.map(decimal6),
    representative_delta_ncu: decimal6(representative),
    cycle_multiplier: stratum.cycle_multiplier,
    cycle_incremental_cost_ncu: decimal6(cycleIncremental),
    positive_incremental_cost_ncu: decimal6(positive),
    cost_reduction_ncu: decimal6(reduction),
  };
}

function derivePurposeBenefit(byKey, accountingPolicy) {
  const scenarioId =
    accountingPolicy.lifecycle_population.purpose_benefit.scenario_id;
  const deltas = pairIds.map(
    (pairId) =>
      eventValue(byKey, "purpose_benefit", null, scenarioId, pairId, "b") -
      eventValue(byKey, "purpose_benefit", null, scenarioId, pairId, "c"),
  );
  return { scenarioId, deltas, cycleValue: exactMedian(deltas) };
}

function formalAccountingResult(options) {
  const {
    accountingPolicy,
    categoryResults,
    signedIncrementalCost,
    positiveIncrementalCost,
    costReduction,
    benefit,
    pairedCycleMargins,
  } = options;
  const positivePairCount = pairedCycleMargins.filter((value) => value > 0).length;
  const sampleCv = sampleCoefficientOfVariation(pairedCycleMargins);
  const ratio =
    positiveIncrementalCost === 0
      ? null
      : benefit.cycleValue / positiveIncrementalCost;
  const threshold = accountingPolicy.significant_stable_margin;
  const ratioMet =
    positiveIncrementalCost === 0
      ? benefit.cycleValue > 0
      : ratio >= threshold.benefit_to_positive_incremental_cost_ratio;
  const significantStableMarginMet =
    ratioMet &&
    positivePairCount >= threshold.minimum_positive_pair_count &&
    Number.isFinite(sampleCv) &&
    sampleCv <= threshold.maximum_sample_coefficient_of_variation;
  return {
    normalized_unit: accountingPolicy.normalized_unit.name,
    normalized_currency: accountingPolicy.normalized_unit.currency,
    deliveries_per_cycle:
      accountingPolicy.lifecycle_population.deliveries_per_cycle,
    category_results: categoryResults,
    purpose_benefit: {
      scenario_id: benefit.scenarioId,
      paired_b_minus_c_loss_ncu: benefit.deltas.map(decimal6),
      cycle_purpose_benefit_ncu: decimal6(benefit.cycleValue),
    },
    signed_incremental_cost_ncu: decimal6(signedIncrementalCost),
    positive_incremental_cost_ncu: decimal6(positiveIncrementalCost),
    cost_reduction_ncu: decimal6(costReduction),
    conservative_cycle_margin_ncu: decimal6(
      benefit.cycleValue - positiveIncrementalCost,
    ),
    benefit_to_positive_incremental_cost_ratio:
      ratio === null ? null : decimal6(ratio),
    paired_cycle_margins_ncu: pairedCycleMargins.map(decimal6),
    positive_pair_count: positivePairCount,
    paired_net_benefit_sample_cv:
      Number.isFinite(sampleCv) ? decimal6(sampleCv) : null,
    significant_stable_margin_met: significantStableMarginMet,
    cost_reductions_offset_positive_cost_denominator: false,
    final_decimal_places: accountingPolicy.rounding_decimal_places,
  };
}

function eventValue(byKey, kind, category, scenarioId, pairId, variantId) {
  const key = formalEvidenceKey({
    kind,
    category,
    scenarioId,
    pairId,
    variantId,
  });
  const value = byKey.get(key)?.value;
  assert(Number.isFinite(value), `formal_evidence_value:${key}`);
  return value;
}

function exactMedian(values) {
  assert(values.length > 0, "formal_accounting_median_empty");
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function sampleCoefficientOfVariation(values) {
  assert(values.length > 1, "formal_accounting_sample_cv_population");
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return Number.POSITIVE_INFINITY;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance) / Math.abs(mean);
}

function decimal6(value) {
  assert(Number.isFinite(value), "formal_accounting_decimal");
  const normalized = Object.is(value, -0) ? 0 : value;
  return normalized.toFixed(6);
}
