import assert from "node:assert/strict";
import { validateFormalCollectorCatalog } from "../../../tools/long_task_formal_total_cost_collectors.mjs";
import { finalizeFormalExecutionRecord } from "../../../tools/long_task_formal_total_cost_execution.mjs";
import { validateFormalScenarioCatalog } from "../../../tools/long_task_formal_total_cost_scenarios.mjs";
import {
  assertByteMutationRejected,
  assertJsonMutationRejected,
  clonePrecollection,
  toBytes,
  withoutDerivedExecutionFields,
} from "./long-task-level4-test-utils.mjs";

const window = {
  started: Date.parse("2026-08-16T01:00:00.000Z"),
  completed: Date.parse("2026-08-16T02:00:00.000Z"),
};

export async function assertStateMeasurementAttacks(fixture) {
  const stateEvent = await readEvent(fixture, "cost:state:pair-01:b");
  const otherStateEvent = await readEvent(fixture, "cost:state:pair-01:c");
  await assertJsonMutationRejected(
    fixture,
    stateEvent.binding.event_path,
    (event) => {
      const record = withoutDerivedExecutionFields(event.execution_record);
      record.measurement_refs.state_payload =
        otherStateEvent.event.execution_record.measurement_refs.state_payload;
      event.execution_record = finalizeFormalExecutionRecord(record);
    },
    /formal_state_payload_ref/u,
  );
  for (const mutate of [
    (ledger) => {
      ledger.entries[0].offset += 1;
    },
    (ledger) => {
      ledger.entries[0].bytes += 1;
    },
    (ledger) => {
      ledger.entries[0].sha256 = "0".repeat(64);
    },
  ])
    await assertJsonMutationRejected(
      fixture,
      fixture.attackPaths.stateLedger,
      mutate,
      /formal_storage_event/u,
    );
  await assertByteMutationRejected(
    fixture,
    fixture.attackPaths.statePayload,
    Buffer.alloc(0),
    /formal_storage_ledger/u,
  );

  const leftPayload = await fixture.index.read(
    stateEvent.event.execution_record.measurement_refs.state_payload,
    "state_payload",
  );
  const rightPayload = await fixture.index.read(
    otherStateEvent.event.execution_record.measurement_refs.state_payload,
    "state_payload",
  );
  const leftOutput = await fixture.index.read(
    stateEvent.event.scenario_output_ref,
    "scenario_output",
  );
  const rightOutput = await fixture.index.read(
    otherStateEvent.event.scenario_output_ref,
    "scenario_output",
  );
  const gold = fixture.precollection.files.get(
    "scenarios/fixed-state-task/gold.bin",
  ).bytes;
  assert.equal(leftPayload.equals(rightPayload), false);
  assert.equal(leftOutput.equals(gold), true);
  assert.equal(rightOutput.equals(gold), true);
}

export async function assertZeroPolicyAttacks(fixture) {
  await assertJsonMutationRejected(
    fixture,
    fixture.attackPaths.processAccounting,
    (record) => {
      record.user_cpu_100ns = 0;
      record.kernel_cpu_100ns = 0;
      record.total_cpu_100ns = 0;
    },
    /formal_process_accounting/u,
  );
  await assertJsonMutationRejected(
    fixture,
    fixture.attackPaths.human,
    (trace) => {
      for (const interval of trace.records) interval.state = "wait";
    },
    /formal_human_trace_coverage/u,
  );
  const maintenance = await readEvent(fixture, "cost:maintenance:pair-01:b");
  await assertJsonMutationRejected(
    fixture,
    maintenance.binding.event_path,
    (event) => {
      const record = withoutDerivedExecutionFields(event.execution_record);
      record.measurement_refs.process_accounting =
        fixture.attackPaths.processAccounting;
      event.execution_record = finalizeFormalExecutionRecord(record);
    },
    /formal_process_accounting_forbidden/u,
  );

  for (const mutation of [
    (catalog) => {
      catalog.scenarios[0].measurement_profile.meters.provider_input_token.quantity_rule =
        "unknown";
    },
    (catalog) => {
      delete catalog.scenarios[0].measurement_profile.meters
        .provider_input_token.quantity_rule;
    },
    (catalog) => {
      catalog.scenarios[0].measurement_profile.meters.provider_input_token.presence =
        "optional";
    },
  ])
    assertCatalogRejected(fixture, mutation, /formal_scenario_measurement/u);

  await assertJsonMutationRejected(
    fixture,
    "formal-evidence-index.json",
    (packet) => {
      packet.zero_policy = "packet-owned";
    },
    /formal_evidence_packet_field_set/u,
  );
  await assertJsonMutationRejected(
    fixture,
    fixture.attackPaths.runtimeEvent,
    (event) => {
      event.zero_policy = "event-owned";
    },
    /raw_event_fields/u,
  );
  assertCollectorZeroPolicyRejected(fixture);
}

async function readEvent(fixture, evidenceKey) {
  const binding = fixture.packet.artifact_bindings.find(
    (item) => item.evidence_key === evidenceKey,
  );
  assert(binding, evidenceKey);
  const event = JSON.parse(
    (await fixture.index.read(binding.event_path, "raw_event")).toString(
      "utf8",
    ),
  );
  return { binding, event };
}

function assertCatalogRejected(fixture, mutate, pattern) {
  const bundle = clonePrecollection(fixture.precollection);
  const source = bundle.files.get("scenarios/catalog.json");
  const catalog = JSON.parse(source.bytes.toString("utf8"));
  mutate(catalog);
  source.bytes = toBytes(catalog);
  assert.throws(
    () =>
      validateFormalScenarioCatalog({
        bundle,
        window,
        accountingPolicy: fixture.accountingPolicy,
        precollectionFrozenAt: Date.parse(
          fixture.precollection.identity.frozen_at,
        ),
      }),
    pattern,
  );
}

function assertCollectorZeroPolicyRejected(fixture) {
  const bundle = clonePrecollection(fixture.precollection);
  const catalogSource = bundle.files.get("collectors/catalog.json");
  const catalog = JSON.parse(catalogSource.bytes.toString("utf8"));
  catalog.collectors[0].zero_policy = "collector-owned";
  catalogSource.bytes = toBytes(catalog);
  const scenarios = validateFormalScenarioCatalog({
    bundle,
    window,
    accountingPolicy: fixture.accountingPolicy,
    precollectionFrozenAt: Date.parse(fixture.precollection.identity.frozen_at),
  });
  assert.throws(
    () =>
      validateFormalCollectorCatalog({
        bundle,
        window,
        precollectionFrozenAt: Date.parse(
          fixture.precollection.identity.frozen_at,
        ),
        scenarios,
      }),
    /formal_collector_fields/u,
  );
}
