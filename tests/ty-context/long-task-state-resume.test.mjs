import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { deliveryCompileFreshness } from "../../packages/ty-context/dist/lib/long-task-freshness.js";
import { readCompiledDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  pathExists,
  runCli,
  runCliFailure,
  synchronizeFixtureExecutionTargetSource,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { fixtureProductRootArgv } from "./long-task-package-machine-fixture.mjs";

test("status projects rolling progress but always requires a Live Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const firstCompile = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    const secondCompile = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.equal(
      secondCompile.compiled_identity,
      firstCompile.compiled_identity,
    );

    const unverified = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(unverified.outcomes.first, "unverified");
    assert.equal(unverified.final_result, "no_final_gate");
    assert.equal(unverified.acceptance_authority, "live_final_gate_required");
    const resumed = await runCli(fixture.root, [
      "long-task",
      "resume",
      fixture.workdir,
    ]);
    assert.equal(resumed.task.id, "fixture-task");

    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);
    let status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_passing");

    await writeFile(
      path.join(fixture.root, "src/state.json"),
      `${JSON.stringify({
        first: false,
        second: false,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_stale");
    await runCliFailure(fixture.root, ["long-task", "verify", fixture.workdir]);
    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_failing");

    await writeFile(
      path.join(fixture.root, "src/state.json"),
      `${JSON.stringify({
        first: true,
        second: false,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    fixture.contract.outcomes[0].acceptance.checks[0].environment_requirements =
      [{ key: "missing-token", kind: "env_var", target: "MISSING_TEST_TOKEN" }];
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    await runCliFailure(fixture.root, ["long-task", "verify", fixture.workdir]);
    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "blocked_external");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("source, selected Context, verification inputs and verifier bundle stale audit results", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = await readCompiledDeliveryContract(fixture.workdir);
    assert.ok(Object.keys(compiled.verifier_identity.bundle_files).length > 10);
    const tampered = structuredClone(compiled);
    tampered.verifier_identity.bundle_sha256 = "0".repeat(64);
    assert.ok(
      (await deliveryCompileFreshness(tampered)).includes(
        "verifier_changed_after_compile:bundle",
      ),
    );
    await runCli(fixture.root, ["long-task", "final-gate", fixture.workdir]);
    let status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.final_result, "last_gate_passed");

    await writeFile(
      path.join(fixture.root, "project_context/unrelated.md"),
      "# unrelated\n",
    );
    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.final_result, "last_gate_inputs_stale");
    await writeFile(
      path.join(fixture.root, "project_context/areas/main.md"),
      "# changed\n",
    );
    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.final_result, "last_gate_inputs_stale");
    await writeFile(
      path.join(fixture.root, "project_context/areas/main.md"),
      "# Main\n",
    );
    await writeFile(
      path.join(fixture.root, "tests/semantic-false.json"),
      "{}\n",
    );
    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.ok(
      status.findings.some((item) =>
        item.code.startsWith("runner_changed_after_compile"),
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("identical raw execution is deduplicated while artifacts remain per-Check", async () => {
  const fixture = await createDeliveryFixture();
  const runCountFile = `${fixture.root}-run-count.txt`;
  try {
    await writeFile(runCountFile, "0\n");
    await writeFile(path.join(fixture.root, "artifacts/a.json"), "");
    await writeFile(path.join(fixture.root, "artifacts/b.json"), "");
    fixture.contract.outcomes[0].technical.allowed_support_paths.push(
      "artifacts/a.json",
      "artifacts/b.json",
    );
    fixture.contract.outcomes[0].product.owner.path_globs.push(
      "artifacts/a.json",
      "artifacts/b.json",
    );
    const original = fixture.contract.outcomes[0].acceptance.checks[0];
    original.runner.effect = "test_sandbox";
    original.runner.argv = fixtureProductRootArgv("tests/oracle.mjs", "first", [
      runCountFile.replaceAll("\\", "/"),
    ]);
    fixture.contract.task.execution_targets[0].root_argv = [
      ...original.runner.argv,
    ];
    original.artifact_globs = ["artifacts/proof.json", "artifacts/a.json"];
    original.expected_output_paths = ["artifacts/a.json"];
    original.positive_assertions.push({
      key: "single-invocation",
      criterion: "The shared Raw Execution is invoked exactly once.",
      claims: [],
      observation: "invocation_count",
      evidence_capabilities: ["presence"],
      operator: "equals",
      expected: 1,
    });
    fixture.contract.outcomes[0].acceptance.counterfactual_controls[0].preserved_assertions.push(
      "single-invocation",
    );
    fixture.contract.outcomes[0].acceptance.counterfactual_controls[1].preserved_assertions.push(
      "single-invocation",
    );
    const second = structuredClone(original);
    second.key = "same-execution-check";
    second.artifact_globs = ["artifacts/proof.json", "artifacts/b.json"];
    second.expected_output_paths = ["artifacts/b.json"];
    second.positive_assertions = second.positive_assertions
      .filter((assertion) => assertion.key === "single-invocation")
      .map((assertion) => {
        const claimless = { ...assertion, claims: [] };
        delete claimless.applicability_ref;
        return claimless;
      });
    second.negative_assertions = [];
    fixture.contract.outcomes[0].acceptance.checks.push(second);
    await synchronizeFixtureExecutionTargetSource(
      fixture.root,
      fixture.contract,
    );
    await writeContract(fixture.workdir, fixture.contract);
    const productRootScript = path.join(fixture.root, "tests/oracle.mjs");
    const productRootSource = await readFile(productRootScript, "utf8");
    assert.match(productRootSource, /console\.log\(JSON\.stringify\(\{/u);
    await writeFile(
      productRootScript,
      productRootSource
        .replace(
          'import { readFile } from "node:fs/promises";',
          'import { readFile, writeFile } from "node:fs/promises";',
        )
        .replace(
          "console.log(JSON.stringify({",
          `const countFile = process.argv[3];
const count = Number((await readFile(countFile, "utf8")).trim()) + 1;
await writeFile(countFile, String(count));
const firstCheckPrefix = "assertion.first.first-check.";
const secondCheckPrefix = "assertion.first.same-execution-check.";
const invocationCount =
  observations[firstCheckPrefix + "first-result"] &&
  !observations[firstCheckPrefix + "first-relations-na"]
    ? count
    : 1;
observations[firstCheckPrefix + "single-invocation"] = invocationCount;
observations[secondCheckPrefix + "single-invocation"] = invocationCount;
console.log(JSON.stringify({`,
        ),
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const accepted = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");
    assert.deepEqual(
      accepted.check_results.map((item) => item.observations.invocation_count),
      [1, 1],
    );
    assert.deepEqual(Object.keys(accepted.check_results[0].artifact_hashes), [
      "artifacts/a.json",
      "artifacts/proof.json",
    ]);
    assert.deepEqual(Object.keys(accepted.check_results[1].artifact_hashes), [
      "artifacts/b.json",
      "artifacts/proof.json",
    ]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(runCountFile, { force: true });
  }
});

test("close itself runs the Live Gate, clears common-dir binding and preserves audit receipt", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "close", fixture.workdir]),
      /final_gate_requires_clean_candidate_commit/,
    );
    await commitCandidate(fixture.root);
    await runCli(fixture.root, ["long-task", "close", fixture.workdir]);
    assert.equal(
      await pathExists(path.join(fixture.workdir, "delivery-contract.yaml")),
      true,
    );
    assert.equal(
      await pathExists(
        path.join(fixture.workdir, ".ty-context/final-receipt.json"),
      ),
      true,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
