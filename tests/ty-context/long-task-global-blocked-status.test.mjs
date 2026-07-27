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

test("Global blocked_external projects to blocked_external and cannot Stop", async () => {
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
    assert.equal(receipt.workflow_status, "blocked_external");
    assert.equal(receipt.outcome_results.first, "passed");

    const stop = await runCliFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(stop.continue, false);
    assert.equal(stop.reason, "live_final_gate_blocked_external");
    assert.ok((await loadActiveLongTaskAuthority(fixture.root)).authority);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a real Outcome failure outranks Global blocked_external", async () => {
  const fixture = await createDeliveryFixture();
  try {
    addBlockedGlobalCheck(fixture.contract);
    await writeContract(fixture.workdir, fixture.contract);
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({ first: false, second: false })}\n`,
    );
    await writeFile(
      path.join(fixture.root, "tests", "semantic-false.json"),
      `${JSON.stringify({ first: false, second: true })}\n`,
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
        evidence_capabilities: ["target_runtime", "state_delta"],
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
      type: "replace_file",
      path: "src/state.json",
      fixture_path: "tests/semantic-false.json",
    },
    expected_assertion_failures: ["external-service-proof"],
    preserved_assertions: ["external-service-liveness"],
  });
}
