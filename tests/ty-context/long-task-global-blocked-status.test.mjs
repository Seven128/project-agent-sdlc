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

test("an unavailable machine Check is needs_work, not formal external pending", async () => {
  const fixture = await createDeliveryFixture();
  try {
    addBlockedGlobalCheck(fixture.contract);
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
    addBlockedGlobalCheck(fixture.contract);
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

function addBlockedGlobalCheck(contract) {
  contract.global.applicability.push({
    key: "external-service-degradation",
    target_ref: "fixture-app",
    journey_role: "degradation",
    dimensions: [{ key: "fixture-state", value: "degraded" }],
    given_refs: ["fixture-loaded"],
    when_refs: ["read-outcome"],
  });
  contract.global.technical.constraints.push({
    key: "external-service",
    statement: "An external service must be available.",
    applicability_refs: ["external-service-degradation"],
  });
  contract.global.acceptance.checks.push({
    ...structuredClone(contract.outcomes[0].acceptance.checks[0]),
    key: "external-service-check",
    journey_roles: ["degradation"],
    execution_target: {
      target_ref: "fixture-app",
      entrypoint: "root",
    },
    proof_surface: "runtime_behavior",
    positive_assertions: [
      {
        key: "external-service-proof",
        criterion: "The external service constraint is observable.",
        claims: ["constraint.external-service"],
        applicability_ref: "external-service-degradation",
        observation: "result",
        evidence_capabilities: ["target_runtime", "presence"],
        operator: "equals",
        expected: true,
      },
      {
        key: "external-service-liveness",
        criterion: "The product target remains live.",
        claims: [],
        observation: "target_live",
        evidence_capabilities: ["target_runtime"],
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [],
    environment_requirements: [
      {
        key: "missing-service-token",
        kind: "env_var",
        target: "TY_CONTEXT_MISSING_GLOBAL_ENV",
      },
    ],
  });
  contract.global.acceptance.counterfactual_controls.push({
    key: "external-service-semantic-witness",
    binding_ref: "first.state-first",
    claims: ["constraint.external-service"],
    check_key: "external-service-check",
    mutation: {
      type: "replace_json_value",
      path: "src/state.json",
      pointer: "/first",
      value: false,
    },
    expected_assertion_failures: ["external-service-proof"],
    preserved_assertions: ["external-service-liveness"],
  });
}
