import { assert } from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  meterUnits,
} from "./long_task_formal_total_cost_shared.mjs";

export function validateFormalEventMeasurements({
  event,
  priceRates,
  usedMeters,
  provenance,
  sourcePath,
  accountingPolicy,
}) {
  assert(
    Array.isArray(event.measurements) &&
      event.measurements.length > 0 &&
      event.measurements.length <= 16,
    `raw_event_measurements:${sourcePath}`,
  );
  return validateCostMeasurements({
    measurements: event.measurements,
    priceRates,
    usedMeters,
    provenance,
    sourcePath,
    accountingPolicy,
  });
}

function validateCostMeasurements({
  measurements,
  priceRates,
  usedMeters,
  provenance,
  sourcePath,
  accountingPolicy,
}) {
  let value = 0;
  let priced = true;
  let humanTimeSeen = false;
  const eventMeters = new Set();
  for (const measurement of measurements) {
    if (measurement.kind === "human_time") {
      assert(!humanTimeSeen, `raw_event_human_time_duplicate:${sourcePath}`);
      humanTimeSeen = true;
      value += humanTimeValue(measurement, sourcePath, accountingPolicy);
      continue;
    }
    validateMeteredUsage(measurement, sourcePath, eventMeters);
    usedMeters.add(measurement.meter);
    const rate = priceRates.get(measurement.meter);
    if (!rate) {
      priced = false;
      continue;
    }
    assert(
      measurement.price_source_ref === rate.source_path,
      `raw_event_price_source_ref:${sourcePath}:${measurement.meter}`,
    );
    value += measurement.quantity * rate.ncu_per_unit;
  }
  if ([...eventMeters].some((meter) => meter.startsWith("provider_")))
    validateProviderUsage({
      measurements,
      eventMeters,
      provenance,
      sourcePath,
    });
  return { value: priced ? value : null, meters: eventMeters };
}

function validateProviderUsage({
  measurements,
  eventMeters,
  provenance,
  sourcePath,
}) {
  assert(
    provenance.providerEvent.disposition !== "not_applicable" &&
      provenance.providerRecord,
    `raw_event_provider_retention:${sourcePath}`,
  );
  const expected = new Map([
    ["provider_input_token", provenance.providerRecord.usage.input_tokens],
    ["provider_output_token", provenance.providerRecord.usage.output_tokens],
    [
      "provider_cached_input_token",
      provenance.providerRecord.usage.cached_input_tokens,
    ],
  ]);
  assert(
    [...eventMeters]
      .filter((meter) => meter.startsWith("provider_"))
      .every((meter) => expected.has(meter)),
    `raw_event_provider_meter_set:${sourcePath}`,
  );
  for (const measurement of measurements) {
    if (!expected.has(measurement.meter)) continue;
    assert(
      measurement.quantity === expected.get(measurement.meter),
      `raw_event_provider_usage:${sourcePath}:${measurement.meter}`,
    );
  }
}

function humanTimeValue(measurement, sourcePath, accountingPolicy) {
  assertExactKeys(
    measurement,
    ["active_ms", "kind", "wait_ms"],
    `raw_event_human_time_fields:${sourcePath}`,
  );
  assert(
    Number.isSafeInteger(measurement.active_ms) &&
      measurement.active_ms >= 0 &&
      Number.isSafeInteger(measurement.wait_ms) &&
      measurement.wait_ms >= 0,
    `raw_event_human_time:${sourcePath}`,
  );
  return (
    (measurement.active_ms / 3_600_000) *
      accountingPolicy.human_time_rates.active_cny_per_hour +
    (measurement.wait_ms / 3_600_000) *
      accountingPolicy.human_time_rates.wait_cny_per_hour
  );
}

function validateMeteredUsage(measurement, sourcePath, eventMeters) {
  assertExactKeys(
    measurement,
    ["kind", "meter", "price_source_ref", "quantity", "unit"],
    `raw_event_meter_fields:${sourcePath}`,
  );
  assert(
    measurement.kind === "metered_usage" &&
      meterUnits[measurement.meter] === measurement.unit &&
      Number.isFinite(measurement.quantity) &&
      measurement.quantity >= 0 &&
      measurement.quantity <= Number.MAX_SAFE_INTEGER &&
      !eventMeters.has(measurement.meter),
    `raw_event_meter:${sourcePath}`,
  );
  eventMeters.add(measurement.meter);
}
