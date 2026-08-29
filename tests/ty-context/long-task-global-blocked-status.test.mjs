import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadActiveLongTaskAuthority } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { addGlobalClaim } from "./long-task-global-evidence-sensitivity-fixture.mjs";

test("an unavailable machine Check is needs_work, not formal external pending", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addBlockedGlobalCheck(fixture);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const receipt = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(receipt.workflow_status, "needs_work");
    assert.equal(receipt.outcome_results.first, "passed");

    const stop = await runCliFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(stop.continue, false);
    assert.equal(stop.reason, "live_final_gate_needs_work");
    assert.ok((await loadActiveLongTaskAuthority(fixture.root)).authority);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a real Outcome failure outranks Global blocked_external", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addBlockedGlobalCheck(fixture);
    for (const counterfactual of [
      ...fixture.contract.outcomes[0].acceptance.counterfactual_controls,
      ...fixture.contract.global.acceptance.counterfactual_controls,
    ]) {
      if (
        counterfactual.mutation.type === "replace_json_value" &&
        counterfactual.mutation.pointer === "/first"
      ) {
        counterfactual.mutation.value = true;
      }
    }
    await writeContract(fixture.workdir, fixture.contract);
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({
        first: false,
        second: false,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    await writeFile(
      path.join(fixture.root, "tests", "semantic-false.json"),
      `${JSON.stringify({
        first: false,
        second: true,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const receipt = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(receipt.workflow_status, "needs_work");
    assert.equal(receipt.outcome_results.first, "failed");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function addBlockedGlobalCheck(fixture) {
  await addGlobalClaim(fixture, { counterfactual: true });
  const check = fixture.contract.global.acceptance.checks.find(
    (candidate) => candidate.key === "global-state-check",
  );
  assert.ok(check);
  check.environment_requirements = [
    {
      key: "missing-service-token",
      kind: "env_var",
      target: "TY_CONTEXT_MISSING_GLOBAL_ENV",
    },
  ];
}
