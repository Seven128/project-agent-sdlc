import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  activeRecordPath,
  readProgressRecords,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  pathExists,
  readState,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { expectDecision } from "./long-task-semantic-authority-revision-fixture.mjs";

import "./long-task-complete-delivery-black-box.cases.mjs";

const exec = promisify(execFile);
const cli = fileURLToPath(
  new URL("../../packages/ty-context/dist/cli.js", import.meta.url),
);

test("[critical:live-final-gate-only] controlled real V2 Smoke proves only the current Live Final Gate can finish", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    const sourcePath = path.join(fixture.root, "source.md");
    const acceptance = "The second outcome is observable and implemented.";
    await writeFile(
      sourcePath,
      replaceMarkedSourceItem(
        await readFile(sourcePath, "utf8"),
        "second-observable",
        acceptance,
      ),
    );
    fixture.contract.source_claims.find(
      (claim) => claim.key === "second-observable",
    ).statement = acceptance;
    fixture.contract.outcomes[1].product.requirements.find(
      (requirement) => requirement.key === "observe-second",
    ).statement = acceptance;
    fixture.contract.outcomes[1].acceptance.checks[0].positive_assertions.find(
      (assertion) => assertion.key === "second-requirement",
    ).criterion = acceptance;
    await writeContract(fixture.workdir, fixture.contract);
    await run(fixture.root, ["enable", "long-task"]);
    const preflight = await run(fixture.root, [
      "long-task",
      "preflight",
      fixture.workdir,
    ]);
    assert.equal(preflight.status, "ready");
    const compiled = await run(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.equal(compiled.status, "compiled");
    assert.equal(compiled.claim_coverage.uncovered_claims.length, 0);
    await commitCandidate(fixture.root);

    const first = await run(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    assert.equal(first.acceptance_authorized, false);
    const secondFailure = await runFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "second",
    ]);
    assert.equal(secondFailure.check_results[0].status, "assertion_failed");
    assert.ok(
      secondFailure.check_results[0].findings.some(
        (finding) =>
          finding.source_claim_keys?.includes("second-observable") &&
          finding.assertion_key === "second-requirement" &&
          finding.observation === "requirement_result",
      ),
    );

    const localReceipt = path.join(
      fixture.workdir,
      ".ty-context/final-receipt.json",
    );
    const activeFile = await activeRecordPath(fixture.root);
    const mirrorReceipt = path.join(
      path.dirname(activeFile),
      "last-final-receipt.json",
    );
    const forged = JSON.stringify({
      schema_version: "long-task-final-receipt-v2",
      workflow_status: "machine_accepted",
      receipt_sha256: "0".repeat(64),
    });
    await writeFile(localReceipt, forged);
    await writeFile(mirrorReceipt, forged);
    let stop = await runFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(stop.continue, false);
    assert.equal(
      JSON.parse(await readFile(localReceipt, "utf8")).check_results.length,
      2,
    );

    const cacheFile = path.join(
      fixture.workdir,
      ".ty-context/compiled-contract.json",
    );
    const cache = JSON.parse(await readFile(cacheFile, "utf8"));
    cache.outcomes = cache.outcomes.slice(0, 1);
    await writeFile(cacheFile, `${JSON.stringify(cache)}\n`);
    stop = await runFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(stop.continue, false);
    assert.match(stop.reason, /live_final_gate/u);

    const state = await readState(fixture.root);
    state.second = true;
    await writeFile(
      path.join(fixture.root, "src/state.json"),
      `${JSON.stringify(state)}\n`,
    );
    await commitCandidate(fixture.root);
    const accepted = await run(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");

    const revisedAcceptance =
      "The second outcome remains observable and implemented.";
    await writeFile(
      sourcePath,
      replaceMarkedSourceItem(
        await readFile(sourcePath, "utf8"),
        "second-observable",
        revisedAcceptance,
      ),
    );
    fixture.contract.source_claims.find(
      (claim) => claim.key === "second-observable",
    ).statement = revisedAcceptance;
    fixture.contract.outcomes[1].product.requirements.find(
      (requirement) => requirement.key === "observe-second",
    ).statement = revisedAcceptance;
    fixture.contract.outcomes[1].acceptance.checks[0].positive_assertions.find(
      (assertion) => assertion.key === "second-requirement",
    ).criterion = revisedAcceptance;
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      () => run(fixture.root, ["long-task", "compile", fixture.workdir]),
      /authority_revision_requires_revise_flag/u,
    );
    const pending = await expectDecision(fixture, {
      field: "source_files_changed",
      includes: "source.md",
      reason: "source_file_content_changed",
    });
    await run(fixture.root, [
      "long-task",
      "approve-authority-revision",
      fixture.workdir,
      "--revision",
      pending.revision_identity,
    ]);
    await run(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.deepEqual(await readProgressRecords(fixture.workdir), {});
    assert.equal(await pathExists(localReceipt), false);
    await commitCandidate(fixture.root);

    const acceptedStop = await run(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(acceptedStop.continue, true);
    assert.equal(await pathExists(activeFile), false);
    assert.equal(
      (await run(fixture.root, ["long-task", "stop-check", fixture.workdir]))
        .reason,
      "no_active_task",
    );

    await rm(cacheFile, { force: true });
    await run(fixture.root, ["long-task", "compile", fixture.workdir]);
    state.second = false;
    await writeFile(
      path.join(fixture.root, "src/state.json"),
      `${JSON.stringify(state)}\n`,
    );
    stop = await runFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(stop.continue, false);
    state.second = true;
    await writeFile(
      path.join(fixture.root, "src/state.json"),
      `${JSON.stringify(state)}\n`,
    );
    await commitCandidate(fixture.root);
    await run(fixture.root, ["long-task", "close", fixture.workdir]);

    assert.equal(
      await pathExists(
        path.join(fixture.root, ".codex/ty-context-active-long-task.json"),
      ),
      false,
    );
    const worktrees = await exec("git", ["worktree", "list", "--porcelain"], {
      cwd: fixture.root,
    });
    assert.equal((worktrees.stdout.match(/^worktree /gmu) ?? []).length, 1);
    const branches = await exec(
      "git",
      ["branch", "--format=%(refname:short)"],
      {
        cwd: fixture.root,
      },
    );
    assert.equal(
      branches.stdout.trim().split(/\r?\n/u).filter(Boolean).length,
      1,
    );
    for (const retired of ["campaign", "sfc", "packet", "wave", "delivery-set"])
      assert.equal(
        await pathExists(path.join(fixture.root, `.codex/${retired}`)),
        false,
      );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function run(cwd, args) {
  const result = await exec(process.execPath, [cli, ...args], {
    cwd,
    windowsHide: true,
  });
  return parse(result.stdout);
}

async function runFailure(cwd, args) {
  try {
    await run(cwd, args);
    assert.fail(`expected command failure: ${args.join(" ")}`);
  } catch (error) {
    if (!error.stdout) throw error;
    return parse(error.stdout);
  }
}

function parse(stdout) {
  const text = stdout.trim();
  try {
    return JSON.parse(text);
  } catch {}
  const line = text.split(/\r?\n/u).at(-1);
  try {
    return JSON.parse(line);
  } catch {
    return { text };
  }
}

function replaceMarkedSourceItem(source, key, statement) {
  const pattern = new RegExp(
    `(<!-- ty-source-item:start key=${key}\\b[^>]*-->\\r?\\n)[\\s\\S]*?(\\r?\\n<!-- ty-source-item:end -->)`,
    "u",
  );
  assert.match(source, pattern);
  return source.replace(pattern, `$1${statement}$2`);
}
