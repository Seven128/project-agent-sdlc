import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
  pathExists,
  readState,
  runCli,
  runCliFailure,
  synchronizeFixtureExecutionTargetSource,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { readProgressRecords } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  configureMixedEvidenceContract,
  MUTATION_CLOSURE_PRODUCT_PATH,
  mutationClosureProductOracleSource,
  writeSource,
} from "./long-task-final-closure-mutation-fixtures.mjs";

test("[critical:final-gate-mutation-rejection] controlled closure mutation smoke rejects false authority and stale proof", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    configureMixedEvidenceContract(fixture.contract);
    await writeFile(
      path.join(fixture.root, ...MUTATION_CLOSURE_PRODUCT_PATH.split("/")),
      mutationClosureProductOracleSource(),
    );
    await writeSource(fixture.root, {
      wrongRequirementTarget: true,
      executionTarget: fixture.contract.task.execution_targets[0],
    });
    await synchronizeFixtureExecutionTargetSource(
      fixture.root,
      fixture.contract,
    );
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);

    let preflight = await runCliFailure(fixture.root, [
      "long-task",
      "preflight",
      fixture.workdir,
    ]);
    assert.match(JSON.stringify(preflight), /source_target_kind_mismatch/u);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /source_target_kind_mismatch/u,
    );

    fixture.contract.source_claims[0].statement =
      "The first outcome must be observable.";
    fixture.contract.source_claims[0].disposition.refs = [
      "first.requirement.observe-first",
    ];
    await writeSource(fixture.root, {
      wrongRequirementTarget: false,
      executionTarget: fixture.contract.task.execution_targets[0],
    });
    await writeContract(fixture.workdir, fixture.contract);
    preflight = await runCliFailure(fixture.root, [
      "long-task",
      "preflight",
      fixture.workdir,
    ]);
    assert.match(
      JSON.stringify(preflight),
      /behavioral_semantic_counterfactual_required/u,
    );

    fixture.contract.outcomes[1].acceptance.checks[0].artifact_globs = [
      "artifacts/proof.json",
    ];
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /behavioral_semantic_counterfactual_required/u,
    );

    const structured = fixture.contract.outcomes[1];
    const structuredBehaviorControl =
      structured.acceptance.counterfactual_controls.find(
        (control) => control.key === "remove-second-state",
      );
    structuredBehaviorControl.expected_assertion_failures.push(
      "structured-acceptance",
    );
    await writeContract(fixture.workdir, fixture.contract);
    const compiled = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.equal(compiled.status, "compiled");

    const finalGate = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(finalGate.workflow_status, "needs_work");
    const finding = finalGate.check_results
      .flatMap((result) => result.findings)
      .find((item) => item.assertion_key === "structured-acceptance");
    assert.ok(finding, JSON.stringify(finalGate));
    assert.deepEqual(finding.claim_keys, ["requirement.observe-second"]);
    assert.ok(finding.source_claim_keys.includes("second-observable"));
    assert.ok(
      finding.source_claim_keys.includes("second-structured-acceptance"),
    );
    assert.ok(
      finding.source_target_refs.includes("second.requirement.observe-second"),
    );
    assert.ok(
      finding.source_target_refs.includes(
        "second.second-check.structured-acceptance",
      ),
    );
    assert.equal(finding.observation, "structured_requirement_result");
    assert.deepEqual(finding.owner_paths, [
      "src/**",
      "bin/**",
      MUTATION_CLOSURE_PRODUCT_PATH,
      "tests/legacy-oracle.mjs",
    ]);

    const state = await readState(fixture.root);
    state.second = true;
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify(state)}\n`,
    );
    const verified = await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "second",
    ]);
    assert.equal(verified.check_results[0].status, "passed");
    assert.notDeepEqual(await readProgressRecords(fixture.workdir), {});
    const accepted = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");
    const receipt = path.join(
      fixture.workdir,
      ".ty-context",
      "final-receipt.json",
    );
    assert.equal(await pathExists(receipt), true);

    const revisedCriterion =
      "The structured outcome remains observable and implemented.";
    fixture.contract.source_claims.find(
      (claim) => claim.key === "second-structured-acceptance",
    ).statement = revisedCriterion;
    structured.acceptance.checks
      .find((check) => check.key === "second-check")
      .positive_assertions.find(
        (assertion) => assertion.key === "structured-acceptance",
      ).criterion = revisedCriterion;
    await writeSource(fixture.root, {
      wrongRequirementTarget: false,
      structuredCriterion: revisedCriterion,
      executionTarget: fixture.contract.task.execution_targets[0],
    });
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /authority_revision_requires_revise_flag/u,
    );
    await assert.rejects(
      () =>
        runCli(fixture.root, [
          "long-task",
          "compile",
          fixture.workdir,
          "--revise",
        ]),
      /authority_change_requires_user_decision/u,
    );
    const pending = JSON.parse(
      await readFile(
        path.join(
          fixture.workdir,
          ".ty-context",
          "authority-revision-pending.json",
        ),
        "utf8",
      ),
    );
    assert.ok(pending.revision_diff.source_files_changed.includes("source.md"));
    assert.ok(
      pending.revision_diff.reduction_reasons.includes(
        "source_file_content_changed",
      ),
    );
    await runCli(fixture.root, [
      "long-task",
      "approve-authority-revision",
      fixture.workdir,
      "--revision",
      pending.revision_identity,
    ]);
    await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.deepEqual(await readProgressRecords(fixture.workdir), {});
    assert.equal(await pathExists(receipt), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
