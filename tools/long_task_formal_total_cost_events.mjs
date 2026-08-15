import {
  FORMAL_EVIDENCE_CAPACITY,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_schema_policy.mjs";
import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  assertTimestamp,
  pairIds,
  parseJson,
} from "./long_task_formal_total_cost_shared.mjs";
import { validateFormalExecutionRecord } from "./long_task_formal_total_cost_execution.mjs";
import { validateFormalEventMeasurements } from "./long_task_formal_total_cost_measurements.mjs";
import {
  assertFormalRedactionRulesConsumed,
  validateFormalExecutionProvenance,
} from "./long_task_formal_total_cost_retention.mjs";

const { FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA } = REAL_PROCESS_SCHEMAS;

export async function validateFormalRawEvents({
  artifactBindings,
  runArtifactIndex,
  window,
  runSetId,
  runBindingById,
  setupByVariant,
  precollectionIdentity,
  accountingPolicy,
  redactionRules,
  priceRates,
  scenarios,
  collectors,
  precollectionBundle,
  runtimeTcbIdentity,
}) {
  const byKey = new Map();
  const eventIds = new Set();
  const executionIds = new Set();
  const invocationIds = new Set();
  const usedMeters = new Set();
  const unpricedEventKeys = [];
  const consumedArtifacts = new Set();
  const usedRedactionRules = new Set();
  const providerCorrelationIds = new Set();

  for (const [bindingKey, eventPath] of artifactBindings) {
    assert(
      !consumedArtifacts.has(eventPath),
      `formal_evidence_event_artifact_duplicate:${eventPath}`,
    );
    const eventBytes = await runArtifactIndex.read(
      eventPath,
      "raw_event",
      FORMAL_EVIDENCE_CAPACITY.maximum_event_bytes,
    );
    consumedArtifacts.add(eventPath);
    const event = parseJson(eventBytes, `raw_event_json:${eventPath}`);
    validateRawEventShape(event, eventPath, runSetId, invocationIds);
    const runBinding = runBindingById.get(event.run_id);
    assert(
      runBinding &&
        runBinding.variant_id === event.variant_id &&
        runBinding.repeat === pairRepeat(event.pair_id),
      `raw_event_run_binding:${eventPath}`,
    );
    const setup = setupByVariant.get(event.variant_id);
    assert(
      setup && setup.commit === runBinding.candidate_commit,
      `raw_event_candidate_binding:${eventPath}`,
    );
    const subject = validateEventSubject(
      event.subject,
      accountingPolicy,
      eventPath,
    );
    const key = evidenceKey({
      kind: subject.kind,
      category: subject.category,
      scenarioId: subject.scenarioId,
      pairId: event.pair_id,
      variantId: event.variant_id,
    });
    assert(
      bindingKey === key && !byKey.has(key),
      `raw_event_subject_binding:${key}`,
    );
    const scenario = scenarios.get(subject.scenarioId);
    const collector = scenario ? collectors.get(scenario.collector_id) : null;
    assert(scenario && collector, `raw_event_scenario:${eventPath}`);
    const execution = await validateFormalExecutionRecord({
      record: event.execution_record,
      event,
      scenario,
      collector,
      runBinding,
      setup,
      precollectionIdentity,
      runtimeTcbIdentity,
      accountingPolicy,
      runArtifactIndex,
      consumedArtifacts,
      collectionWindow: window,
    });
    assert(
      !executionIds.has(event.execution_record.execution_id),
      `formal_execution_identity_duplicate:${eventPath}`,
    );
    executionIds.add(event.execution_record.execution_id);
    const observedAt = assertTimestamp(
      event.observed_at,
      `raw_event_time:${eventPath}`,
    );
    assert(
      observedAt === execution.clocks.processCompletedWall &&
        observedAt >= window.started &&
        observedAt <= window.completed,
      `raw_event_time_window:${eventPath}`,
    );
    const outputBytes = await runArtifactIndex.read(
      event.scenario_output_ref,
      "scenario_output",
      FORMAL_EVIDENCE_CAPACITY.maximum_scenario_output_bytes,
    );
    validateScenarioOutputBytes({
      outputBytes,
      scenario,
      subject,
      variantId: event.variant_id,
      eventPath,
    });
    const provenance = await validateFormalExecutionProvenance({
      execution,
      scenario,
      runArtifactIndex,
      consumedArtifacts,
      redactionRules,
      usedRedactionRules,
      sourcePath: eventPath,
      runtimeTcbIdentity,
      providerCorrelationIds,
    });
    const measurement = validateFormalEventMeasurements({
      scenario,
      execution,
      providerRecord: provenance.providerRecord,
      priceRates,
      usedMeters,
      sourcePath: eventPath,
      accountingPolicy,
    });
    const eventEntry = runArtifactIndex.get(eventPath);
    const eventId = sha256(
      canonical({
        run_artifact_path: eventPath,
        run_artifact_sha256: eventEntry.sha256,
        invocation_id: event.invocation_id,
      }),
    );
    assert(!eventIds.has(eventId), `raw_event_identity_duplicate:${eventPath}`);
    eventIds.add(eventId);
    if (measurement.value === null) unpricedEventKeys.push(key);
    byKey.set(key, {
      key,
      eventId,
      executionId: event.execution_record.execution_id,
      pairId: event.pair_id,
      variantId: event.variant_id,
      subject,
      value: measurement.value,
    });
  }
  assertFormalRedactionRulesConsumed({
    bundle: precollectionBundle,
    usedRedactionRules,
  });
  const formalPaths = runArtifactIndex
    .paths()
    .filter((item) => item.startsWith("formal-evidence/"));
  assert(
    formalPaths.length <= FORMAL_EVIDENCE_CAPACITY.maximum_formal_files &&
      formalPaths.every((item) => consumedArtifacts.has(item)) &&
      consumedArtifacts.size === formalPaths.length,
    "formal_execution_artifact_set",
  );
  return {
    byKey,
    eventIds,
    executionIds,
    usedMeters,
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
          keys.add(evidenceKey({ kind: "cost", category, pairId, variantId }));
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

function validateRawEventShape(event, eventPath, runSetId, invocationIds) {
  assertExactKeys(
    event,
    [
      "execution_record",
      "invocation_id",
      "observed_at",
      "pair_id",
      "run_id",
      "run_set_id",
      "scenario_output_ref",
      "schema_version",
      "subject",
      "variant_id",
    ],
    `raw_event_fields:${eventPath}`,
  );
  assert(
    event.schema_version === FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA &&
      event.run_set_id === runSetId &&
      ["b", "c"].includes(event.variant_id) &&
      typeof event.run_id === "string" &&
      event.run_id.length > 0 &&
      typeof event.invocation_id === "string" &&
      /^[a-f0-9]{64}$/u.test(event.invocation_id) &&
      typeof event.scenario_output_ref === "string" &&
      event.scenario_output_ref.startsWith("formal-evidence/") &&
      !invocationIds.has(event.invocation_id),
    `raw_event_identity:${eventPath}`,
  );
  invocationIds.add(event.invocation_id);
}

function validateEventSubject(subject, accountingPolicy, sourcePath) {
  assert(
    subject && typeof subject === "object",
    `raw_event_subject:${sourcePath}`,
  );
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

function validateScenarioOutputBytes({
  outputBytes,
  scenario,
  subject,
  variantId,
  eventPath,
}) {
  assert(outputBytes.length > 0, `formal_scenario_output_empty:${eventPath}`);
  const matchesGold = outputBytes.equals(scenario.gold.bytes);
  if (subject.kind === "cost")
    assert(matchesGold, `formal_scenario_cost_gold:${eventPath}`);
  else if (variantId === "b")
    assert(!matchesGold, `formal_scenario_incident_b_wrong:${eventPath}`);
  else assert(matchesGold, `formal_scenario_incident_c_correct:${eventPath}`);
}

function pairRepeat(pairId) {
  if (pairId === "once") return 1;
  assert(pairIds.includes(pairId), `raw_event_pair:${pairId}`);
  return Number.parseInt(pairId.slice(-2), 10);
}

function evidenceKey({ kind, category, scenarioId, pairId, variantId }) {
  return kind === "cost"
    ? `cost:${category}:${pairId}:${variantId}`
    : `benefit:${scenarioId}:${pairId}:${variantId}`;
}
