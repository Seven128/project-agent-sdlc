import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  addGlobalClaim,
  addGlobalCounterfactual,
  assertPreflightAndCompileReject,
} from "./long-task-global-evidence-sensitivity-fixture.mjs";
import { expectDecision } from "./long-task-semantic-authority-revision-fixture.mjs";

test("Global structured Claims require a same-Check Global Counterfactual", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: false });
    await assertPreflightAndCompileReject(
      fixture,
      "global_structured_evidence_sensitivity_required",
    );

    await addGlobalCounterfactual(fixture.contract);
    await writeContract(fixture.workdir, fixture.contract);
    assert.equal(
      (await preflightDeliveryContract(fixture.workdir, fixture.root)).status,
      "ready",
    );
    await assert.doesNotReject(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Outcome and other-Global Counterfactuals cannot cover a Global Check", async () => {
  const outcomeOnly = await createDeliveryFixture();
  try {
    await addGlobalClaim(outcomeOnly, { counterfactual: false });
    assert.ok(
      outcomeOnly.contract.outcomes[0].acceptance.counterfactual_controls
        .length > 0,
    );
    await assertPreflightAndCompileReject(
      outcomeOnly,
      "global_structured_evidence_sensitivity_required",
    );
  } finally {
    await rm(outcomeOnly.root, { recursive: true, force: true });
  }

  const otherGlobal = await createDeliveryFixture();
  try {
    await addGlobalClaim(otherGlobal, { counterfactual: false });
    const second = structuredClone(
      otherGlobal.contract.global.acceptance.checks[0],
    );
    second.key = "other-global-check";
    second.runner.argv = ["first", "other-global"];
    second.positive_assertions[0].key = "other-global-assertion";
    otherGlobal.contract.global.acceptance.checks.push(second);
    otherGlobal.contract.global.acceptance.counterfactual_controls.push({
      key: "other-global-control",
      binding_ref: "first.state-first",
      claims: ["constraint.global-state"],
      check_key: second.key,
      mutation: {
        type: "replace_file",
        path: "src/state.json",
        fixture_path: "tests/semantic-false.json",
      },
      expected_assertion_failures: ["other-global-assertion"],
      preserved_assertions: ["global-state-liveness"],
    });
    await assertPreflightAndCompileReject(
      otherGlobal,
      "global_structured_evidence_sensitivity_required",
    );
  } finally {
    await rm(otherGlobal.root, { recursive: true, force: true });
  }
});

test("Global Counterfactual binding_ref and Assertion relations fail closed", async () => {
  for (const scenario of [
    {
      name: "unknown binding",
      mutate(control) {
        control.binding_ref = "first.unknown-binding";
      },
      code: "global_counterfactual_binding_unknown",
    },
    {
      name: "unknown check",
      mutate(control) {
        control.check_key = "unknown-check";
      },
      code: "global_counterfactual_check_unknown",
    },
    {
      name: "unrelated Assertion",
      mutate(control) {
        control.expected_assertion_failures = ["missing-assertion"];
      },
      code: "global_counterfactual_assertion_unknown",
    },
  ]) {
    const fixture = await createDeliveryFixture();
    try {
      await addGlobalClaim(fixture, { counterfactual: true });
      scenario.mutate(
        fixture.contract.global.acceptance.counterfactual_controls[0],
      );
      await assertPreflightAndCompileReject(fixture, scenario.code);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("a constant Global Oracle cannot pass the Live Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, {
      counterfactual: true,
      constant: true,
    });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const result = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(result.workflow_status, "needs_work");
    const finding = result.findings.find(
      (item) => item.code === "counterfactual_integrity_failed",
    );
    assert.equal(finding.outcome_key, null);
    assert.equal(finding.check_key, "global-state-check");
    assert.equal(finding.assertion_key, "global-state-assertion");
    assert.equal(finding.binding_ref, "first.state-first");
    assert.equal(finding.owning_outcome_key, "first");
    assert.deepEqual(finding.source_claim_keys, ["global-state-source"]);
    assert.deepEqual(finding.source_target_refs, ["constraint.global-state"]);
    assert.deepEqual(finding.owner_paths, ["src/**"]);
    assert.match(finding.next_action, /referenced implementation carrier/iu);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global Counterfactual failure is recoverable from targeted Progress", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, {
      counterfactual: true,
      constant: true,
    });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const failed = await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--check",
      "global-state-check",
    ]);
    const result = failed.check_results.find(
      (item) => item.check_key === "global-state-check",
    );
    assert.equal(result.status, "invalid_evidence");
    assert.deepEqual(result.claim_proofs, []);
    assert.ok(
      result.findings.some(
        (finding) => finding.code === "counterfactual_integrity_failed",
      ),
    );

    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.final_workflow_status, null);
    assert.ok(
      status.findings.some(
        (finding) =>
          finding.code === "counterfactual_integrity_failed" &&
          finding.check_key === "global-state-check",
      ),
    );
    const resume = await runCli(fixture.root, [
      "long-task",
      "resume",
      fixture.workdir,
    ]);
    assert.equal(resume.final_workflow_status, null);
    assert.ok(
      resume.recent_findings.some(
        (finding) =>
          finding.code === "counterfactual_integrity_failed" &&
          finding.check_key === "global-state-check",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a sensitive Global Oracle passes the Live Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const result = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(result.workflow_status, "machine_accepted");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Global Counterfactual carrier changes stale targeted Progress", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--check",
      "global-state-check",
    ]);
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      '{"first":true,"revision":2}\n',
    );
    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.ok(
      status.findings.some(
        (finding) =>
          finding.code === "global_progress_stale" &&
          finding.check_key === "global-state-check",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("redundant Global Counterfactual removal auto-adopts but binding_ref replacement is reviewed", async () => {
  const removed = await createDeliveryFixture();
  try {
    await addGlobalClaim(removed, { counterfactual: true });
    const redundant = structuredClone(
      removed.contract.global.acceptance.counterfactual_controls[0],
    );
    redundant.key = "remove-global-state-redundant";
    removed.contract.global.acceptance.counterfactual_controls.push(redundant);
    await writeContract(removed.workdir, removed.contract);
    await runCli(removed.root, ["enable", "long-task"]);
    const initial = await runCli(removed.root, [
      "long-task",
      "compile",
      removed.workdir,
    ]);
    removed.contract.global.acceptance.counterfactual_controls.pop();
    await writeContract(removed.workdir, removed.contract);
    const revised = await runCli(removed.root, [
      "long-task",
      "compile",
      removed.workdir,
      "--revise",
    ]);
    assert.equal(revised.authority_revision, initial.authority_revision + 1);
  } finally {
    await rm(removed.root, { recursive: true, force: true });
  }

  const replaced = await createDeliveryFixture();
  try {
    await addGlobalClaim(replaced, { counterfactual: true });
    replaced.contract.outcomes[0].technical.bindings.push({
      ...structuredClone(replaced.contract.outcomes[0].technical.bindings[0]),
      key: "state-global-alternate",
    });
    await writeContract(replaced.workdir, replaced.contract);
    await runCli(replaced.root, ["enable", "long-task"]);
    await runCli(replaced.root, ["long-task", "compile", replaced.workdir]);
    replaced.contract.global.acceptance.counterfactual_controls[0].binding_ref =
      "first.state-global-alternate";
    await writeContract(replaced.workdir, replaced.contract);
    await expectDecision(replaced, {
      field: "counterfactuals_removed",
      includes: "GLOBAL:replace-global-state",
      reason: "counterfactual_removed",
    });
  } finally {
    await rm(replaced.root, { recursive: true, force: true });
  }
});

test("adding a Global Counterfactual is an automatic proof strengthening", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    const initial = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    const added = structuredClone(
      fixture.contract.global.acceptance.counterfactual_controls[0],
    );
    added.key = "remove-global-state-additional";
    fixture.contract.global.acceptance.counterfactual_controls.push(added);
    await writeContract(fixture.workdir, fixture.contract);
    const revised = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(revised.authority_revision, initial.authority_revision + 1);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
