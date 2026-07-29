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
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  preserveFixtureSemanticOracle,
  preservedFixtureOracleDelegationPrelude,
} from "./long-task-delegating-oracle-fixture.mjs";

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
    assert.equal(secondCompile.compiled_identity, firstCompile.compiled_identity);

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
    await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
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
    fixture.contract.outcomes[0].acceptance.checks[0].environment_requirements = [
      { key: "missing-token", kind: "env_var", target: "MISSING_TEST_TOKEN" },
    ];
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
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
    await writeFile(path.join(fixture.root, "tests/oracle.mjs"), "// changed\n");
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
  try {
    await writeFile(path.join(fixture.root, "tests/run-count.txt"), "0\n");
    const original = fixture.contract.outcomes[0].acceptance.checks[0];
    original.verification_inputs.push("tests/run-count.txt");
    original.artifact_globs = [
      "artifacts/proof.json",
      "artifacts/a.json",
    ];
    original.positive_assertions.push({
      key: "single-invocation",
      criterion: "The shared Raw Execution is invoked exactly once.",
      claims: [],
      observation: "invocation_count",
      evidence_capabilities: ["state_delta"],
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
    second.artifact_globs = [
      "artifacts/proof.json",
      "artifacts/b.json",
    ];
    second.positive_assertions = second.positive_assertions
      .filter((assertion) => assertion.key !== "first-semantic-fact")
      .map((assertion) => {
        const claimless = { ...assertion, claims: [] };
        delete claimless.applicability_ref;
        return claimless;
      });
    second.negative_assertions = second.negative_assertions.map((assertion) => {
      const claimless = { ...assertion, claims: [] };
      delete claimless.applicability_ref;
      return claimless;
    });
    fixture.contract.outcomes[0].acceptance.checks.push(second);
    await preserveFixtureSemanticOracle(fixture);
    await writeFile(
      path.join(fixture.root, "tests/oracle.mjs"),
      `import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const countFile = new URL("./run-count.txt", import.meta.url);
const count = Number((await readFile(countFile, "utf8")).trim()) + 1;
await writeFile(countFile, String(count));
await mkdir(path.join(process.cwd(), "artifacts"), {recursive:true});
await writeFile(path.join(process.cwd(), "artifacts", "a.json"), "a");
await writeFile(path.join(process.cwd(), "artifacts", "b.json"), "b");
${preservedFixtureOracleDelegationPrelude()}
result.observations.invocation_count =
  result.observations.result &&
  !result.observations.relations_applicable
    ? count
    : 1;
result.evidence_records.push({
  assertion_key: "single-invocation",
  capability: "state_delta",
  before_sha256: "2".repeat(64),
  after_sha256: "3".repeat(64),
  changed_fields: ["invocation_count"]
});
console.log(JSON.stringify(result));
`,
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
    assert.deepEqual(
      Object.keys(accepted.check_results[0].artifact_hashes),
      ["artifacts/a.json", "artifacts/proof.json"],
    );
    assert.deepEqual(
      Object.keys(accepted.check_results[1].artifact_hashes),
      ["artifacts/b.json", "artifacts/proof.json"],
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
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
