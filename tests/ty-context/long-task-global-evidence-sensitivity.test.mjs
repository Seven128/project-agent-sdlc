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
  GLOBAL_PRODUCT_PATH,
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

test("Global Checks preserve Outcome-scoped Binding identity while deduplicating physical closure paths", async () => {
  for (const [scenario, secondPath, expectedPhysicalPaths] of [
    ["same physical path", "src/state.json", ["src/state.json"]],
    [
      "different physical paths",
      "src/second-state.json",
      ["src/second-state.json", "src/state.json"],
    ],
  ]) {
    const fixture = await createDeliveryFixture({ twoOutcomes: true });
    try {
      await addGlobalClaim(fixture, { counterfactual: true });
      const [first, second] = fixture.contract.outcomes;
      const firstBinding = first.technical.bindings.find(
        (binding) => binding.key === "state-first",
      );
      const secondBinding = second.technical.bindings.find(
        (binding) => binding.key === "state-second",
      );
      assert.ok(firstBinding, `${scenario}: first state Binding is required`);
      assert.ok(secondBinding, `${scenario}: second state Binding is required`);
      first.technical.bindings.push({
        ...structuredClone(firstBinding),
        key: "shared-state",
      });
      second.technical.bindings.push({
        ...structuredClone(secondBinding),
        key: "shared-state",
        target: secondPath,
        carrier_paths: [secondPath],
      });
      fixture.contract.global.acceptance.counterfactual_controls[0].binding_ref =
        "first.shared-state";
      const authoredGlobalCheck =
        fixture.contract.global.acceptance.checks.find(
          (check) => check.key === "global-state-check",
        );
      assert.ok(authoredGlobalCheck);
      if (!authoredGlobalCheck.input_paths.includes(secondPath))
        authoredGlobalCheck.input_paths.push(secondPath);
      if (secondPath !== "src/state.json")
        await writeFile(
          path.join(fixture.root, ...secondPath.split("/")),
          '{"second":true}\n',
        );
      await writeContract(fixture.workdir, fixture.contract);

      const compiled = await compileDeliveryContract(
        fixture.workdir,
        fixture.root,
        { require_completion_gate: false },
      );
      const globalCheck = compiled.global.acceptance.checks.find(
        (check) => check.key === "global-state-check",
      );
      assert.ok(globalCheck, `${scenario}: compiled Global Check is required`);
      const scopedRefs = globalCheck.process_runtime_closure.production_binding_refs
        .filter((bindingRef) => bindingRef.endsWith(".shared-state"))
        .sort();
      assert.deepEqual(scopedRefs, [
        "first.shared-state",
        "second.shared-state",
      ]);
      assert.deepEqual(
        globalCheck.process_runtime_closure.production_carrier_files.filter(
          (file) => file.startsWith("src/"),
        ),
        expectedPhysicalPaths,
      );
      for (const authority of globalCheck.observation_authorities)
        assert.deepEqual(
          authority.carrier_refs
            .map((carrier) => carrier.binding_ref)
            .filter((bindingRef) => bindingRef.endsWith(".shared-state"))
            .sort(),
          ["first.shared-state", "second.shared-state"],
        );
      assert.ok(
        compiled.outcomes[0].acceptance.checks[0].observation_authorities.every(
          (authority) =>
            authority.carrier_refs.every((carrier) =>
              carrier.binding_ref.startsWith("first."),
            ),
        ),
      );
      assert.ok(
        compiled.outcomes[1].acceptance.checks[0].observation_authorities.every(
          (authority) =>
            authority.carrier_refs.every((carrier) =>
              carrier.binding_ref.startsWith("second."),
            ),
        ),
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
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
    process.env.TY_CONTEXT_OTHER_GLOBAL_SCOPE ??= "fixture-other-global";
    second.environment_requirements = [
      {
        key: "other-global-scope",
        kind: "env_var",
        target: "TY_CONTEXT_OTHER_GLOBAL_SCOPE",
      },
    ];
    second.positive_assertions[0].key = "other-global-assertion";
    otherGlobal.contract.global.acceptance.checks.push(second);
    otherGlobal.contract.global.acceptance.counterfactual_controls.push({
      key: "other-global-control",
      binding_ref: "first.state-first",
      claims: ["constraint.global-state"],
      check_key: second.key,
      mutation: {
        type: "replace_json_value",
        path: "src/state.json",
        pointer: "/first",
        value: false,
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
    assert.deepEqual(finding.owner_paths, [
      "src/**",
      "bin/**",
      GLOBAL_PRODUCT_PATH,
      "tests/legacy-oracle.mjs",
    ]);
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
      '{"first":true,"second":false,"first_relations_applicable":false,"second_relations_applicable":false,"revision":2}\n',
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
    const stateBinding = replaced.contract.outcomes[0].technical.bindings.find(
      (binding) => binding.key === "state-first",
    );
    assert.ok(stateBinding, "fixture state binding is required");
    replaced.contract.outcomes[0].technical.bindings.push({
      ...structuredClone(stateBinding),
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
