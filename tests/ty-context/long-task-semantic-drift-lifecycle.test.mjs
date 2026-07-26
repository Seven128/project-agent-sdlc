import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import {
  computeAuthorityHashes,
  isMonotonicAcceptanceStrengthening,
} from "../../packages/ty-context/dist/lib/long-task-authority.js";
import {
  semanticConformanceRequired,
  validateSemanticConformance,
} from "../../packages/ty-context/dist/lib/long-task-conformance-policy.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { createUpgradePlan } from "../../packages/ty-context/dist/lib/migrations.js";
import {
  commitCandidate,
  createDeliveryFixture,
  deliveryContract,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("read-only Product Conformance is required only for weak, complex deliveries", () => {
  const simple = deliveryContract();
  simple.risk.facts.weak_observability = ["first"];
  assert.equal(semanticConformanceRequired(simple, "strict"), false);

  const staged = deliveryContract({ twoOutcomes: true });
  staged.risk.facts.weak_observability = ["first"];
  assert.equal(semanticConformanceRequired(staged, "strict"), true);
  assert.throws(
    () => validateSemanticConformance(staged, "strict", []),
    /semantic_conformance_check_required/u,
  );

  const conformance = structuredClone(staged.outcomes[0].acceptance.checks[0]);
  conformance.key = "product-conformance";
  conformance.journey_roles = ["conformance"];
  conformance.positive_assertions[0].key = "product-conformance-result";
  conformance.positive_assertions[0].claims = [];
  conformance.runner.effect = "read_only";
  staged.global.acceptance.checks.push(conformance);
  const compiled = compiledCheck(staged, conformance, null);
  compiled.raw_execution_identity = "independent-conformance-runtime";
  assert.doesNotThrow(() =>
    validateSemanticConformance(staged, "strict", [compiled]),
  );
});

test("Verifier capability strengthening is monotonic while weakening and target changes are protected", () => {
  const baseline = deliveryContract({ externalConfirmation: true });
  const strengthened = structuredClone(baseline);
  strengthened.outcomes[0].acceptance.checks[0].positive_assertions[0].evidence_capabilities.push(
    "input_variation",
  );
  assert.equal(
    isMonotonicAcceptanceStrengthening(baseline, strengthened),
    true,
  );
  assert.equal(
    isMonotonicAcceptanceStrengthening(strengthened, baseline),
    false,
  );

  const changedExternal = structuredClone(baseline);
  changedExternal.global.acceptance.external_confirmations[0].kind =
    "functional_prerequisite";
  changedExternal.global.acceptance.external_confirmations[0].blocks_target = true;
  assert.equal(
    isMonotonicAcceptanceStrengthening(baseline, changedExternal),
    false,
  );

  const changedTarget = structuredClone(baseline);
  changedTarget.task.target_profile.required_state = "production_release_ready";
  assert.notEqual(
    computeAuthorityHashes(baseline).product_authority_hash,
    computeAuthorityHashes(changedTarget).product_authority_hash,
  );
});

test("old V2 Contracts receive an indexed manual migration instead of synthesized proof", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const old = structuredClone(fixture.contract);
    delete old.task.target_profile.required_target_refs;
    delete old.outcomes[0].stage;
    delete old.outcomes[0].acceptance.checks[0].scenario;
    delete old.outcomes[0].acceptance.checks[0].positive_assertions[0]
      .evidence_capabilities;
    await writeContract(fixture.workdir, old);

    assert.throws(
      () => parseDeliveryContractText(YAML.stringify(old)),
      /long_task_delivery_v2_semantic_drift_migration_required:[\s\S]*task\.target_profile\.required_target_refs/u,
    );
    const plan = await createUpgradePlan(fixture.root);
    const migration = plan.manual_required.find(
      (item) => item.id === "long-task-v2-semantic-drift-authority",
    );
    assert.ok(migration);
    assert.match(migration.message, /Re-author these meanings from Source/u);
    assert.match(migration.message, /required_target_refs/u);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("[critical:terminal-state-current-evidence] Stage frontier and terminal target state derive from current evidence and the Final Gate", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

    let status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.deepEqual(status.stages, { first: "ready", second: "locked" });
    assert.deepEqual(status.ready_outcomes, ["first"]);
    assert.equal(status.target_state, "not_accepted");

    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.stages.first, "progress_passing");
    assert.equal(status.stages.second, "ready");
    assert.deepEqual(status.ready_outcomes, ["second"]);

    const failed = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(failed.workflow_status, "needs_work");
    assert.equal(failed.target_state, "not_accepted");
    assert.deepEqual(failed.stage_results, { first: "passed", second: "failed" });

    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({ first: true, second: true })}\n`,
    );
    await commitCandidate(fixture.root);
    const accepted = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");
    assert.equal(accepted.target_state, "target_profile_usable");
    assert.deepEqual(accepted.stage_results, { first: "passed", second: "passed" });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("targeted verification is not gated by the acceptance frontier", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

    const before = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.deepEqual(before.ready_outcomes, ["first"]);
    assert.deepEqual(before.ready_for_implementation, ["first"]);
    assert.equal(before.stages.second, "locked");
    const resumed = await runCli(fixture.root, [
      "long-task",
      "resume",
      fixture.workdir,
    ]);
    assert.match(
      resumed.next_safe_action,
      /advisory acceptance\/verification frontier/u,
    );
    assert.match(resumed.next_safe_action, /Implementation order remains Goal-owned/u);
    assert.doesNotMatch(
      resumed.next_safe_action,
      /Implement and verify ready Outcome/u,
    );

    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({ first: true, second: true })}\n`,
    );
    const verified = await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "second",
    ]);
    assert.equal(verified.acceptance_authorized, false);
    assert.equal(verified.check_results[0].status, "passed");

    const after = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(after.outcomes.first, "unverified");
    assert.equal(after.outcomes.second, "progress_passing");
    assert.equal(after.stages.second, "locked");
    assert.deepEqual(after.ready_outcomes, ["first"]);
    assert.deepEqual(after.ready_for_implementation, ["first"]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function compiledCheck(contract, declared, outcomeKey) {
  const check = structuredClone(declared);
  const target = contract.task.execution_targets.find(
    (candidate) => candidate.key === check.execution_target.target_ref,
  );
  return {
    ...check,
    internal_id: `CHECK.${outcomeKey ?? "GLOBAL"}.${check.key}`,
    outcome_key: outcomeKey,
    execution_target_definition: target,
    known_execution_targets: contract.task.execution_targets,
    raw_execution_identity: `raw-${check.key}`,
  };
}
