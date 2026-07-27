import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { readProgressRecords } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  createDeliveryFixture,
  pathExists,
  runCli,
} from "./long-task-delivery-fixtures.mjs";

test("verify --explain previews deduplicated and Counterfactual executions without running or writing", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const marker = path.join(fixture.root, "runner-invoked");
    await writeFile(
      path.join(fixture.root, "tests", "oracle.mjs"),
      `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(marker)}, "ran");\n`,
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

    const before = await readProgressRecords(fixture.workdir);
    const preview = await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
      "--explain",
    ]);

    assert.equal(preview.schema_version, "long-task-verification-preview-v1");
    assert.equal(preview.acceptance_authorized, false);
    assert.equal(preview.executes_checks, false);
    assert.equal(preview.writes_progress, false);
    assert.equal(preview.selected_outcome, "first");
    assert.equal(preview.summary.selected_checks, 1);
    assert.equal(preview.summary.unique_main_runner_invocations, 1);
    assert.equal(
      preview.summary.counterfactual_runner_invocation_upper_bound,
      2,
    );
    assert.equal(preview.summary.declared_runner_invocation_upper_bound, 3);
    assert.equal(preview.summary.declared_command_attempt_upper_bound, 3);
    assert.deepEqual(preview.main_raw_executions[0].check_refs, [
      "first:first-check",
    ]);
    assert.deepEqual(
      preview.counterfactual_executions
        .map((execution) => execution.control_key)
        .sort(),
      ["make-first-relations-applicable", "remove-first-state"],
    );
    assert.equal(await pathExists(marker), false);
    assert.deepEqual(await readProgressRecords(fixture.workdir), before);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("resume reports progress_stale as a coalescible freshness fact", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({ first: true, second: false, touched: true })}\n`,
    );

    const resumed = await runCli(fixture.root, [
      "long-task",
      "resume",
      fixture.workdir,
    ]);
    assert.equal(resumed.outcomes.first, "progress_stale");
    assert.match(resumed.next_safe_action, /freshness fact/u);
    assert.match(resumed.next_safe_action, /not an implementation gate/u);
    assert.match(resumed.next_safe_action, /not.*immediate per-edit rerun/u);
    assert.match(resumed.next_safe_action, /coalesce relevant changes/u);
    assert.match(resumed.next_safe_action, /only before relying/u);
    assert.match(resumed.next_safe_action, /Final Gate needs no targeted refresh/u);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
