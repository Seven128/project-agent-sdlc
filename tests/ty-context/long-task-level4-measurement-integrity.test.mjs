import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { finalizeFormalExecutionRecord } from "../../tools/long_task_formal_total_cost_execution.mjs";
import { LEGACY_FORMAL_EVIDENCE_SCHEMAS } from "../../tools/long_task_real_process_schema_policy.mjs";
import { createLevel4FormalEvidenceFixture } from "./helpers/long-task-level4-fixture.mjs";
import {
  assertPrecollectionBudgetFuses,
  assertPrecollectionNoFollow,
  assertStrictJsonFuses,
  validateFixturePriceSource,
} from "./helpers/long-task-level4-formal-controls.mjs";
import {
  assertStateMeasurementAttacks,
  assertZeroPolicyAttacks,
} from "./helpers/long-task-level4-measurement-attacks.mjs";
import { assertProviderEvidenceAttacks } from "./helpers/long-task-level4-provider-controls.mjs";
import {
  assertByteMutationRejected,
  assertJsonMutationRejected,
  withoutDerivedExecutionFields,
} from "./helpers/long-task-level4-test-utils.mjs";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
let fixture;
before(async () => {
  fixture = await createLevel4FormalEvidenceFixture(repositoryRoot);
});
after(async () => fixture?.remove());

test("[critical:level4-measurement-integrity-boundary] incomplete packets and cross-category invocation reuse fail closed", async () => {
  await assertJsonMutationRejected(
    fixture,
    "formal-evidence-index.json",
    (packet) => packet.artifact_bindings.pop(),
    /formal_evidence_artifact_binding_set/u,
  );
  const runtime = JSON.parse(
    (
      await fixture.index.read(fixture.attackPaths.runtimeEvent, "raw_event")
    ).toString("utf8"),
  );
  await assertJsonMutationRejected(
    fixture,
    fixture.attackPaths.stateEvent,
    (event) => {
      event.invocation_id = runtime.invocation_id;
    },
    /raw_event_identity/u,
  );
});

test("formal scenarios derive same-quality cost and incident outcomes from raw outputs", async () => {
  const gold = fixture.precollection.files.get(
    "scenarios/fixed-controlled-incident/gold.bin",
  ).bytes;
  await assertByteMutationRejected(
    fixture,
    fixture.attackPaths.costOutput,
    Buffer.from("wrong-cost\n"),
    /formal_scenario_cost_gold/u,
  );
  await assertByteMutationRejected(
    fixture,
    fixture.attackPaths.incidentBOutput,
    gold,
    /formal_scenario_incident_b_wrong/u,
  );
  await assertByteMutationRejected(
    fixture,
    fixture.attackPaths.incidentCOutput,
    Buffer.from("wrong-incident\n"),
    /formal_scenario_incident_c_correct/u,
  );
  await assertJsonMutationRejected(
    fixture,
    fixture.attackPaths.runtimeEvent,
    (event) => {
      event.scenario_output_ref = fixture.attackPaths.incidentCOutput;
      const record = withoutDerivedExecutionFields(event.execution_record);
      record.scenario_output_ref = event.scenario_output_ref;
      event.execution_record = finalizeFormalExecutionRecord(record);
    },
    /formal_execution_output_ref/u,
  );
});

test("formal source bundles preserve materialization safety, byte fuses, strict JSON, no-follow, and pre-collection prices", async () => {
  assertPrecollectionBudgetFuses(fixture);
  assertStrictJsonFuses();
  assert.throws(
    () =>
      validateFixturePriceSource(fixture, {
        frozenAt: "2026-08-16T01:30:00.000Z",
      }),
    /price_source/u,
  );
  await assertPrecollectionNoFollow(fixture);
});

test("Provider identities, prompts, usage, correlation IDs, reuse, and cached zero remain verifier-bound", async () => {
  await assertProviderEvidenceAttacks(fixture);
});

test("State payload binding, ledger recomputation, scenario outputs, and zero policies fail closed", async () => {
  await assertStateMeasurementAttacks(fixture);
  await assertZeroPolicyAttacks(fixture);
});

test("missing authoritative authoring usage produces an unsupported reportable result", async () => {
  const authoringEvent = fixture.packet.artifact_bindings.find(
    (item) => item.evidence_key === "cost:authoring:pair-01:b",
  ).event_path;
  await assertJsonMutationRejected(
    fixture,
    authoringEvent,
    (event) => {
      const record = withoutDerivedExecutionFields(event.execution_record);
      record.measurement_refs.provider_event = null;
      event.execution_record = finalizeFormalExecutionRecord(record);
    },
    /formal_execution_provider_event/u,
  );
});

test("formal purpose benefit rejects packet-authored normalized loss values", async () => {
  await assertJsonMutationRejected(
    fixture,
    "formal-evidence-index.json",
    (packet) => {
      packet.normalized_value = 100;
    },
    /formal_evidence_packet_prohibited_field/u,
  );
});

test("the complete 586-file synthetic control remains external_pending", async () => {
  const result = await fixture.evaluate();
  assert.equal(result.admitted, true);
  assert.equal(result.event_count, 86);
  assert.equal(result.incident_evidence_class, "synthetic_test_only");
  assert.equal(result.support_complete, false);
  assert.deepEqual(result.blockers, ["controlled_incident_external_pending"]);
  assert.equal(result.accounting, null);
  assert.equal(
    fixture.manifest.entries.filter((entry) =>
      entry.path.startsWith("formal-evidence/"),
    ).length,
    586,
  );
});

test("legacy, mixed, and unknown-newer formal packet schemas fail closed", async () => {
  for (const schema of [
    LEGACY_FORMAL_EVIDENCE_SCHEMAS.evidence_packet[0],
    "long-task-formal-total-cost-evidence-packet-v999",
  ])
    await assertJsonMutationRejected(
      fixture,
      "formal-evidence-index.json",
      (packet) => {
        packet.schema_version = schema;
      },
      /formal_evidence_packet/u,
    );

  for (const [relative, schema, diagnostic] of [
    [
      fixture.attackPaths.runtimeEvent,
      LEGACY_FORMAL_EVIDENCE_SCHEMAS.raw_event[0],
      /raw_event_identity/u,
    ],
    [
      fixture.attackPaths.provider,
      LEGACY_FORMAL_EVIDENCE_SCHEMAS.provider_event[0],
      /provider_event/u,
    ],
  ])
    await assertJsonMutationRejected(
      fixture,
      relative,
      (record) => {
        record.schema_version = schema;
      },
      diagnostic,
    );
});
