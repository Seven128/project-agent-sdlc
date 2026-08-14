import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_roi_policy.mjs";
import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";
import { validateFormalEventMeasurements } from "./long_task_formal_total_cost_measurements.mjs";
import {
  assertFormalScenarioOutputsConsumed,
  validateFormalScenarioOutput,
} from "./long_task_formal_total_cost_scenarios.mjs";
import {
  assertFormalSensitiveSourcesConsumed,
  validateFormalEventProvenance,
} from "./long_task_formal_total_cost_retention.mjs";
import {
  assertExactKeys,
  assertTimestamp,
  meterUnits,
  pairIds,
  parseJson,
  rejectProhibitedFields,
} from "./long_task_formal_total_cost_shared.mjs";

const { FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA } = REAL_PROCESS_SCHEMAS;

export function validateFormalRawEvents({
  bundle,
  window,
  runSetId,
  runBindingById,
  accountingPolicy,
  redactionRules,
  priceRates,
  scenarios,
}) {
  const byKey = new Map();
  const eventIds = new Set();
  const invocationIds = new Set();
  const usedMeters = new Set();
  const usedSensitiveSources = new Set();
  const usedRedactionRules = new Set();
  const usedScenarioOutputs = new Set();
  const unpricedEventKeys = [];
  const missingAuthoringUsageKeys = [];
  for (const [sourcePath, source] of bundle.files) {
    if (source.entry.role !== "raw_event") continue;
    const event = parseJson(source.bytes, `raw_event_json:${sourcePath}`);
    rejectProhibitedFields(event, `raw_event_prohibited_field:${sourcePath}`);
    validateRawEventShape(event, sourcePath, runSetId, invocationIds);
    const observedAt = assertTimestamp(
      event.observed_at,
      `raw_event_time:${sourcePath}`,
    );
    assert(
      observedAt >= window.started && observedAt <= window.completed,
      `raw_event_collection_window:${sourcePath}`,
    );
    const runBinding = runBindingById.get(event.run_id);
    assert(
      runBinding && runBinding.variant_id === event.variant_id,
      `raw_event_run_binding:${sourcePath}`,
    );
    const subject = validateEventSubject(event.subject, accountingPolicy, sourcePath);
    const expectedPairs = subject.pairCount === 1 ? ["once"] : pairIds;
    assert(expectedPairs.includes(event.pair_id), `raw_event_pair:${sourcePath}`);
    const expectedRepeat =
      event.pair_id === "once" ? 1 : Number(event.pair_id.slice(-2));
    assert(
      runBinding.repeat === expectedRepeat,
      `raw_event_pair_run_binding:${sourcePath}`,
    );
    const provenance = validateFormalEventProvenance({
      provenance: event.provenance,
      subject,
      invocationId: event.invocation_id,
      observedAt,
      bundle,
      redactionRules,
      usedSensitiveSources,
      usedRedactionRules,
      sourcePath,
    });
    validateFormalScenarioOutput({
      bundle,
      sourceRef: event.scenario_output_ref,
      subject,
      variantId: event.variant_id,
      scenarios,
      usedOutputs: usedScenarioOutputs,
      sourcePath,
    });
    const measurement = validateFormalEventMeasurements({
      event,
      subject,
      priceRates,
      usedMeters,
      provenance,
      sourcePath,
      accountingPolicy,
    });
    const key = evidenceKey({
      kind: subject.kind,
      category: subject.category,
      scenarioId: subject.scenarioId,
      pairId: event.pair_id,
      variantId: event.variant_id,
    });
    assert(!byKey.has(key), `raw_event_subject_duplicate:${key}`);
    const eventId = sha256(
      canonical({
        source_relative_path: sourcePath,
        source_sha256: source.entry.sha256,
        invocation_id: event.invocation_id,
      }),
    );
    assert(!eventIds.has(eventId), `raw_event_identity_duplicate:${sourcePath}`);
    eventIds.add(eventId);
    if (
      subject.kind === "cost" &&
      subject.category === "authoring" &&
      Object.keys(meterUnits)
        .filter((meter) => meter.startsWith("provider_"))
        .some((meter) => !measurement.meters.has(meter))
    )
      missingAuthoringUsageKeys.push(key);
    if (measurement.value === null) unpricedEventKeys.push(key);
    byKey.set(key, {
      key,
      eventId,
      pairId: event.pair_id,
      variantId: event.variant_id,
      subject,
      value: measurement.value,
    });
  }
  assertFormalSensitiveSourcesConsumed({
    bundle,
    usedSensitiveSources,
    usedRedactionRules,
  });
  assertFormalScenarioOutputsConsumed(bundle, usedScenarioOutputs);
  return {
    byKey,
    eventIds,
    usedMeters,
    missingAuthoringUsageKeys: missingAuthoringUsageKeys.sort(),
    unpricedEventKeys: unpricedEventKeys.sort(),
  };
}

export function expectedFormalEvidenceKeys(accountingPolicy) {
  const keys = new Set();
  for (const stratum of accountingPolicy.lifecycle_population.strata) {
    const pairs = stratum.pair_count === 1 ? ["once"] : pairIds;
    for (const category of stratum.categories)
      for (const pairId of pairs)
        for (const variantId of ["b", "c"])
          keys.add(
            evidenceKey({ kind: "cost", category, pairId, variantId }),
          );
  }
  const benefit = accountingPolicy.lifecycle_population.purpose_benefit;
  for (const pairId of pairIds)
    for (const variantId of ["b", "c"])
      keys.add(
        evidenceKey({
          kind: "purpose_benefit",
          scenarioId: benefit.scenario_id,
          pairId,
          variantId,
        }),
      );
  return keys;
}

export function formalEvidenceKey({
  kind,
  category,
  scenarioId,
  pairId,
  variantId,
}) {
  return evidenceKey({ kind, category, scenarioId, pairId, variantId });
}

function validateRawEventShape(event, sourcePath, runSetId, invocationIds) {
  assertExactKeys(
    event,
    [
      "invocation_id",
      "measurements",
      "observed_at",
      "pair_id",
      "provenance",
      "run_id",
      "run_set_id",
      "schema_version",
      "scenario_output_ref",
      "subject",
      "variant_id",
    ],
    `raw_event_fields:${sourcePath}`,
  );
  assert(
    event.schema_version === FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA &&
      event.run_set_id === runSetId &&
      ["b", "c"].includes(event.variant_id) &&
      typeof event.invocation_id === "string" &&
      event.invocation_id.length > 0 &&
      typeof event.scenario_output_ref === "string" &&
      event.scenario_output_ref.length > 0 &&
      !invocationIds.has(event.invocation_id),
    `raw_event_identity:${sourcePath}`,
  );
  invocationIds.add(event.invocation_id);
}

function validateEventSubject(subject, accountingPolicy, sourcePath) {
  assert(subject && typeof subject === "object", `raw_event_subject:${sourcePath}`);
  if (subject.kind === "cost") {
    assertExactKeys(
      subject,
      ["category", "kind", "scenario_id", "stratum"],
      `raw_event_cost_subject_fields:${sourcePath}`,
    );
    const stratum = accountingPolicy.lifecycle_population.strata.find(
      (candidate) => candidate.categories.includes(subject.category),
    );
    assert(
      stratum &&
        subject.stratum === stratum.key &&
        subject.scenario_id ===
          accountingPolicy.lifecycle_population.scenario_ids[subject.category],
      `raw_event_cost_subject:${sourcePath}`,
    );
    return {
      kind: "cost",
      category: subject.category,
      scenarioId: subject.scenario_id,
      stratum: subject.stratum,
      pairCount: stratum.pair_count,
    };
  }
  assertExactKeys(
    subject,
    ["kind", "scenario_id", "stratum"],
    `raw_event_benefit_subject_fields:${sourcePath}`,
  );
  const benefit = accountingPolicy.lifecycle_population.purpose_benefit;
  assert(
    subject.kind === "purpose_benefit" &&
      subject.scenario_id === benefit.scenario_id &&
      subject.stratum === "incident_once",
    `raw_event_benefit_subject:${sourcePath}`,
  );
  return {
    kind: "purpose_benefit",
    scenarioId: subject.scenario_id,
    stratum: subject.stratum,
    pairCount: benefit.pair_count,
  };
}

function evidenceKey({ kind, category, scenarioId, pairId, variantId }) {
  return kind === "cost"
    ? `cost:${category}:${pairId}:${variantId}`
    : `benefit:${scenarioId}:${pairId}:${variantId}`;
}
