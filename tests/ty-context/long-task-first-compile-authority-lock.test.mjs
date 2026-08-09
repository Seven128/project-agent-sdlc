import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { expectDecision } from "./long-task-semantic-authority-revision-fixture.mjs";

test("Contract remains editable before first compile", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    fixture.contract.task.goal = "Edited freely before Authority Lock.";
    await writeContract(fixture.workdir, fixture.contract);
    const compiled = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.equal(compiled.authority_revision, 1);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("first compile locks Product authority before verify", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    fixture.contract.task.goal = "Weakened after first compile.";
    await writeContract(fixture.workdir, fixture.contract);
    await expectDecision(fixture, {
      field: "product_semantics_changed",
      includes: "task.goal",
      reason: "product_semantics_changed",
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("deleting progress, Receipt, cache, or restoring code cannot unlock authority", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const stateFile = path.join(fixture.root, "src", "state.json");
    const initialState = await readFile(stateFile, "utf8");
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "final-gate", fixture.workdir]);
    await Promise.all([
      rm(path.join(fixture.workdir, ".ty-context", "progress"), {
        recursive: true,
        force: true,
      }),
      rm(path.join(fixture.workdir, ".ty-context", "final-receipt.json"), {
        force: true,
      }),
      rm(path.join(fixture.workdir, ".ty-context", "compiled-contract.json"), {
        force: true,
      }),
    ]);
    await writeFile(stateFile, initialState);
    fixture.contract.task.goal = "Weakened after deleting derived state.";
    await writeContract(fixture.workdir, fixture.contract);
    await expectDecision(fixture, {
      field: "product_semantics_changed",
      includes: "task.goal",
      reason: "product_semantics_changed",
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("proof additions and proven scope tightening revise automatically", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions.push({
      key: "additional-proof",
      criterion: "The additional proof remains true.",
      claims: [],
      observation: "package_exact_additional_proof",
      evidence_capabilities: ["presence"],
      operator: "equals",
      expected: true,
    });
    await writeContract(fixture.workdir, fixture.contract);
    const proofRevision = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(proofRevision.authority_revision, 2);

    fixture.contract.outcomes[0].technical.expected_change_paths = [
      "src/state.json",
    ];
    await writeContract(fixture.workdir, fixture.contract);
    const tightened = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(tightened.authority_revision, 3);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
