import { assert } from "./long_task_real_process_roi_scoring.mjs";
import { meterUnits } from "./long_task_formal_total_cost_shared.mjs";

export function validateFormalEventMeasurements({
  scenario,
  execution,
  providerRecord,
  priceRates,
  usedMeters,
  sourcePath,
  accountingPolicy,
}) {
  const rawMeters = new Map();
  if (providerRecord)
    for (const [meter, field] of [
      ["provider_input_token", "input_tokens"],
      ["provider_output_token", "output_tokens"],
      ["provider_cached_input_token", "cached_input_tokens"],
    ])
      rawMeters.set(meter, providerRecord.usage[field]);
  if (execution.processAccounting)
    rawMeters.set("compute_ms", execution.processAccounting.compute_ms);
  if (execution.storage)
    rawMeters.set("storage_byte_hour", execution.storage.storage_byte_hour);

  let value = humanTimeValue(execution.human, sourcePath, accountingPolicy);
  let priced = true;
  const eventMeters = new Set();
  for (const [meter, expectedUnit] of Object.entries(meterUnits)) {
    const profile = scenario.measurement_profile.meters[meter];
    const present = rawMeters.has(meter);
    assert(
      (profile.presence === "required") === present,
      `raw_event_measurement_profile:${sourcePath}:${meter}`,
    );
    if (!present) continue;
    const quantity = rawMeters.get(meter);
    assert(
      Number.isFinite(quantity) &&
        quantity >= 0 &&
        quantity <= Number.MAX_SAFE_INTEGER,
      `raw_event_meter_quantity:${sourcePath}:${meter}`,
    );
    const rate = priceRates.get(meter);
    eventMeters.add(meter);
    usedMeters.add(meter);
    if (!rate) {
      priced = false;
      continue;
    }
    assert(
      rate.unit === expectedUnit,
      `raw_event_price_source:${sourcePath}:${meter}`,
    );
    value += quantity * rate.ncu_per_unit;
  }
  return {
    value: priced && Number.isFinite(value) ? value : null,
    meters: eventMeters,
  };
}

function humanTimeValue(measurement, sourcePath, accountingPolicy) {
  assert(
    measurement &&
      Number.isFinite(measurement.active_ms) &&
      measurement.active_ms >= 0 &&
      Number.isFinite(measurement.wait_ms) &&
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
