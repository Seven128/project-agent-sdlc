import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { CASE_IDS } from "../../tools/long_task_real_process_roi_policy.mjs";
import { deriveExpectedFormalArtifactBudget } from "../../tools/long_task_formal_artifact_budget.mjs";
import {
  FORMAL_EVIDENCE_CAPACITY,
  FORMAL_SCENARIO_CATALOG_REPOSITORY_PATH,
  LEGACY_FORMAL_EVIDENCE_SCHEMAS,
  LEGACY_REAL_PROCESS_SCHEMAS,
  REAL_PROCESS_SCHEMA_FAMILY_TABLE,
  REAL_PROCESS_SCHEMAS,
} from "../../tools/long_task_real_process_schema_policy.mjs";
import { formalCollectorEnvironment } from "../../tools/long_task_formal_collection_io.mjs";
import {
  deriveFormalExecutionId,
  deriveFormalExecutionRecordSha256,
  deriveFormalInvocationId,
  finalizeFormalExecutionRecord,
} from "../../tools/long_task_formal_total_cost_execution.mjs";
import { validateFormalScenarioCatalog } from "../../tools/long_task_formal_total_cost_scenarios.mjs";
import { createLevel4FormalEvidenceFixture } from "./helpers/long-task-level4-fixture.mjs";
import {
  assertPrecollectionMaterialization,
  deriveFixtureAccounting,
  validateFixturePriceSource,
} from "./helpers/long-task-level4-formal-controls.mjs";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
let fixture;
before(async () => {
  fixture = await createLevel4FormalEvidenceFixture(repositoryRoot);
});
after(async () => fixture?.remove());

test("[critical:level4-evidence-governance-boundary] Level 4 schema families and the 11-scenario owner are explicit and closed", async () => {
  assert.deepEqual(
    formalCollectorEnvironment({
      PATH: "C:/tools",
      OPENAI_API_KEY: "must-not-cross",
      "ProgramFiles(x86)": "C:/Program Files (x86)",
    }),
    { PATH: "C:/tools" },
  );
  const catalogSource = fixture.precollection.files.get(
    "scenarios/catalog.json",
  );
  const scenarios = validateFormalScenarioCatalog({
    bundle: { files: fixture.precollection.files },
    window: {
      started: Date.parse("2026-08-16T01:00:00.000Z"),
      completed: Date.parse("2026-08-16T02:00:00.000Z"),
    },
    accountingPolicy: fixture.accountingPolicy,
    precollectionFrozenAt: Date.parse(fixture.precollection.identity.frozen_at),
  });
  assert.equal(scenarios.size, 11);
  const catalog = JSON.parse(catalogSource.bytes.toString("utf8"));
  for (const scenario of catalog.scenarios) {
    const sources = [
      scenario.measurement_profile.human_time,
      scenario.measurement_profile.raw_prompt,
      scenario.measurement_profile.provider_event,
      ...Object.values(scenario.measurement_profile.meters),
    ];
    assert.ok(
      sources.every((item) =>
        ["required", "forbidden"].includes(item.presence),
      ),
    );
    assert.equal(
      scenario.measurement_profile.human_time.quantity_rule,
      "positive-active-nonnegative-wait",
    );
  }
  assert.deepEqual(
    REAL_PROCESS_SCHEMA_FAMILY_TABLE.formal_evidence.legacy,
    LEGACY_FORMAL_EVIDENCE_SCHEMAS,
  );
  assert.deepEqual(
    REAL_PROCESS_SCHEMA_FAMILY_TABLE.real_process.legacy,
    LEGACY_REAL_PROCESS_SCHEMAS,
  );
  assert.equal(REAL_PROCESS_SCHEMA_FAMILY_TABLE.formal_evidence.next, null);
  assert.equal(
    REAL_PROCESS_SCHEMA_FAMILY_TABLE.formal_evidence.current.provider_event,
    "long-task-formal-total-cost-provider-event-v3",
  );
  assert.deepEqual(
    REAL_PROCESS_SCHEMA_FAMILY_TABLE.formal_evidence.legacy.provider_event,
    [
      "long-task-formal-total-cost-provider-event-v1",
      "long-task-formal-total-cost-provider-event-v2",
    ],
  );
  assert.equal(
    REAL_PROCESS_SCHEMA_FAMILY_TABLE.real_process.current.run_set,
    "long-task-real-process-roi-run-set-v5",
  );
  assert.equal(
    REAL_PROCESS_SCHEMA_FAMILY_TABLE.real_process.current.manifest,
    "long-task-real-process-roi-manifest-v2",
  );
  assert.equal(CASE_IDS.includes("r12-argv-incident"), false);
});

test("formal invocation and execution identities are derived on opposite sides of spawn", () => {
  const projection = {
    schema_version: "formal-invocation-projection-v1",
    run_set_id: "fixture",
    run_id: "run-b-1",
    pair_id: "pair-01",
    variant_id: "b",
    scenario_id: "fixed-runtime-task",
    collector: {
      collector_id: "collector",
      implementation_sha256: "1".repeat(64),
    },
    attempt: 1,
    precollection_identity_sha256: "2".repeat(64),
  };
  const invocationId = deriveFormalInvocationId(projection);
  const record = finalizeFormalExecutionRecord({
    schema_version: REAL_PROCESS_SCHEMAS.FORMAL_SCENARIO_EXECUTION_SCHEMA,
    invocation_id: invocationId,
    exit: { exit_code: 0 },
  });
  assert.equal(
    record.execution_record_sha256,
    deriveFormalExecutionRecordSha256(record),
  );
  assert.equal(
    record.execution_id,
    deriveFormalExecutionId(invocationId, record.execution_record_sha256),
  );
  assert.notEqual(record.execution_id, invocationId);
});

test("the formal artifact budget is catalog-derived and closes the 586-file population", async () => {
  const catalog = JSON.parse(
    await readFile(
      path.join(
        repositoryRoot,
        ...FORMAL_SCENARIO_CATALOG_REPOSITORY_PATH.split("/"),
      ),
      "utf8",
    ),
  );
  const budget = deriveExpectedFormalArtifactBudget(catalog);
  assert.equal(budget.expected_execution_count, 86);
  assert.equal(budget.expected_runner_artifact_count, 586);
  assert.equal(budget.maximum_run_set_files, 4379);
  const changed = structuredClone(catalog);
  changed.scenarios[0].pair_count += 1;
  assert.equal(
    deriveExpectedFormalArtifactBudget(changed).expected_runner_artifact_count,
    602,
  );
  assert.deepEqual(budget, FORMAL_EVIDENCE_CAPACITY);
});

test("formal evidence accounting applies the frozen ten-delivery and once-only strata", () => {
  const accounting = deriveFixtureAccounting(fixture.accountingPolicy, {
    costDeltas: Object.fromEntries(
      Object.keys(
        fixture.accountingPolicy.lifecycle_population.scenario_ids,
      ).map((key) => [key, 0.1]),
    ),
    benefitDeltas: [10, 10, 10, 10, 10],
  });
  assert.equal(
    accounting.category_results.authoring.cycle_incremental_cost_ncu,
    "1.000000",
  );
  assert.equal(
    accounting.category_results.maintenance.cycle_incremental_cost_ncu,
    "0.100000",
  );
  assert.equal(
    accounting.category_results.migration.cycle_incremental_cost_ncu,
    "0.100000",
  );
  assert.equal(accounting.positive_incremental_cost_ncu, "5.500000");
  assert.equal(
    accounting.benefit_to_positive_incremental_cost_ratio,
    "1.818182",
  );
});

test("the runner precollection plan freezes and materializes every fixed external input", async () => {
  await assertPrecollectionMaterialization(fixture);
});

test("formal evidence accepts a pre-collection actual-invoice price source", () => {
  const result = validateFixturePriceSource(fixture, {
    sourceKind: "actual_invoice",
  });
  assert.equal(result.rates.size, 5);
  assert.ok(
    [...result.rates.values()].every((rate) => rate.basis === "invoice_line"),
  );
});

test("formal positivity does not use cost reductions to satisfy the 1.25 positive-cost margin", () => {
  const accounting = deriveFixtureAccounting(fixture.accountingPolicy, {
    costDeltas: {
      authoring: 0.1,
      runtime: 0.1,
      state: 0.1,
      test: 0.1,
      process: -20,
      maintenance: 0.1,
      recovery: 0.1,
      introduction: 0.1,
      adoption: 0.1,
      migration: 0.1,
    },
    benefitDeltas: [5, 5, 5, 5, 5],
  });
  assert.equal(accounting.positive_incremental_cost_ncu, "4.500000");
  assert.equal(accounting.cost_reduction_ncu, "200.000000");
  assert.equal(
    accounting.cost_reductions_offset_positive_cost_denominator,
    false,
  );
  assert.equal(accounting.significant_stable_margin_met, false);
});

test("formal positivity requires four positive pairs and sample CV at most twenty percent", () => {
  const costDeltas = Object.fromEntries(
    Object.keys(fixture.accountingPolicy.lifecycle_population.scenario_ids).map(
      (key) => [key, 0.1],
    ),
  );
  const direction = deriveFixtureAccounting(fixture.accountingPolicy, {
    costDeltas,
    benefitDeltas: [20, 20, 20, 0, 0],
  });
  const variance = deriveFixtureAccounting(fixture.accountingPolicy, {
    costDeltas,
    benefitDeltas: [20, 21, 22, 23, 80],
  });
  assert.equal(direction.positive_pair_count, 3);
  assert.equal(direction.significant_stable_margin_met, false);
  assert.ok(Number(variance.paired_net_benefit_sample_cv) > 0.2);
  assert.equal(variance.significant_stable_margin_met, false);
});
