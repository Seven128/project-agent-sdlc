import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  activeRecordPath,
  commitActiveAuthority,
  loadActiveLongTaskAuthority,
  readProgressRecords,
  worktreeIdentity,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
import {
  createDeliveryFixture,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);
const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages/ty-context/dist/cli.js");

test("[critical:authority-lock-continuity] compiled cache deletion cannot reset previous authority or initial task base", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const first = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    const before = (await loadActiveLongTaskAuthority(fixture.root)).authority;
    assert.ok(before);
    await rm(path.join(fixture.workdir, ".ty-context", "compiled-contract.json"));

    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.compiled_identity, first.compiled_identity);
    assert.ok(
      status.findings.some(
        (finding) => finding.code === "compiled_cache_missing_repairable",
      ),
    );
    const resumed = await runCli(fixture.root, [
      "long-task",
      "resume",
      fixture.workdir,
    ]);
    assert.equal(resumed.contract_identity, first.compiled_identity);

    const rebuilt = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.equal(rebuilt.compiled_identity, first.compiled_identity);
    const after = (await loadActiveLongTaskAuthority(fixture.root)).authority;
    assert.deepEqual(after.initial_task_base, before.initial_task_base);

    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);
    await rm(path.join(fixture.workdir, ".ty-context", "compiled-contract.json"));
    fixture.contract.task.goal = "Weakened replacement goal.";
    await writeContract(fixture.workdir, fixture.contract);
    await assertCliFailure(
      fixture.root,
      ["long-task", "compile", fixture.workdir],
      /authority_revision_requires_revise_flag/u,
    );
    await assertCliFailure(
      fixture.root,
      ["long-task", "compile", fixture.workdir, "--revise"],
      /authority_change_requires_user_decision/u,
    );
    const unchanged = (
      await loadActiveLongTaskAuthority(fixture.root)
    ).authority;
    assert.equal(unchanged.active_authority_identity, first.compiled_identity);
    assert.deepEqual(unchanged.initial_task_base, before.initial_task_base);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("strict risk downgrade remains rejected after cache deletion", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.risk.requested_level = "strict";
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    check.negative_assertions.push({
      key: "negative-floor",
      criterion: "The strict negative floor remains satisfied.",
      claims: [],
      observation: "result_copy",
      evidence_capabilities: ["state_delta"],
      operator: "not_equals",
      expected: false,
    });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await rm(path.join(fixture.workdir, ".ty-context", "compiled-contract.json"));
    fixture.contract.risk.requested_level = "auto";
    await writeContract(fixture.workdir, fixture.contract);
    await assertCliFailure(
      fixture.root,
      ["long-task", "compile", fixture.workdir, "--revise"],
      /authority_risk_downgrade_rejected/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a self-consistent forged cache is ignored by verify and doctor", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const compiled = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    const cacheFile = path.join(
      fixture.workdir,
      ".ty-context",
      "compiled-contract.json",
    );
    const forged = JSON.parse(await readFile(cacheFile, "utf8"));
    forged.outcomes[0].acceptance.checks[0].positive_assertions[0].expected =
      false;
    delete forged.compiled_identity;
    forged.compiled_identity = sha256Hex(canonicalValueJson(forged));
    await writeFile(cacheFile, `${JSON.stringify(forged)}\n`);

    const verified = await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    assert.equal(verified.compiled_identity, compiled.compiled_identity);
    assert.equal(verified.findings.length, 0);
    const doctor = await runCli(fixture.root, [
      "long-task",
      "doctor",
      fixture.workdir,
    ]);
    assert.ok(doctor.findings.includes("active_authority_valid"));
    assert.ok(doctor.findings.includes("compiled_cache_mismatched_ignored"));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("legacy development V2 Active Authority is manual-required and never migrated", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const activeFile = await activeRecordPath(fixture.root);
    const current = JSON.parse(await readFile(activeFile, "utf8"));
    const legacy = {
      schema_version: "active-long-task-binding-v2",
      task_id: current.task_id,
      repository_root: current.repository_root,
      worktree_identity: current.worktree_identity,
      workdir: current.workdir,
      initial_task_base: current.initial_task_base,
      active_authority_identity: current.active_authority_identity,
      verifier_identity: current.verifier_identity,
      activated_at: current.activated_at,
      authority_revision: current.authority_revision,
    };
    const markerKey = `ty-context.longTask.${worktreeIdentity(fixture.root)}`;
    await writeFile(activeFile, `${JSON.stringify(legacy)}\n`);
    await exec("git", ["config", "--local", markerKey, legacy.task_id], {
      cwd: fixture.root,
    });

    await assert.rejects(
      () =>
        runCli(fixture.root, [
          "long-task",
          "status",
          fixture.workdir,
        ]),
      /legacy_v2_active_authority_manual_required/u,
    );
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "verify", fixture.workdir]),
      /legacy_v2_active_authority_manual_required/u,
    );
    assert.equal(
      JSON.parse(await readFile(activeFile, "utf8")).schema_version,
      "active-long-task-binding-v2",
    );
    assert.equal(await gitConfig(fixture.root, markerKey), legacy.task_id);
    const doctor = await runCli(fixture.root, [
      "long-task",
      "doctor",
      fixture.workdir,
    ]);
    assert.equal(
      doctor.status,
      "legacy_v2_active_authority_manual_required",
    );
    assert.equal(
      doctor.next_action,
      `ty-context long-task abandon ${fixture.workdir} --force-corrupt-state`,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("CAS and authority commit failure preserve old authority and progress", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);
    const before = (await loadActiveLongTaskAuthority(fixture.root)).authority;
    const progressBefore = await readProgressRecords(fixture.workdir);
    assert.ok(Object.keys(progressBefore).length > 0);

    await assert.rejects(
      commitActiveAuthority({
        candidate: before.authority_snapshot,
        expected_previous_identity: "not-the-current-identity",
      }),
      /active_authority_compare_and_swap_failed/u,
    );
    assert.equal(
      (await loadActiveLongTaskAuthority(fixture.root)).authority
        .active_authority_identity,
      before.active_authority_identity,
    );

    fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions.push({
      key: "additional-proof",
      criterion: "The additional proof remains true.",
      claims: [],
      observation: "result_copy",
      evidence_capabilities: ["state_delta"],
      operator: "equals",
      expected: true,
    });
    await writeContract(fixture.workdir, fixture.contract);
    const activeFile = await activeRecordPath(fixture.root);
    await mkdir(path.dirname(activeFile), { recursive: true });
    await writeFile(`${activeFile}.lock`, "held\n");
    try {
      await assertCliFailure(
        fixture.root,
        ["long-task", "compile", fixture.workdir, "--revise"],
        /active_authority_compare_and_swap_failed:lock_unavailable/u,
      );
    } finally {
      await rm(`${activeFile}.lock`, { force: true });
    }
    const after = (await loadActiveLongTaskAuthority(fixture.root)).authority;
    assert.equal(
      after.active_authority_identity,
      before.active_authority_identity,
    );
    assert.deepEqual(
      Object.keys(await readProgressRecords(fixture.workdir)).sort(),
      Object.keys(progressBefore).sort(),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function assertCliFailure(cwd, args, pattern) {
  await assert.rejects(
    exec(process.execPath, [cli, ...args], { cwd, windowsHide: true }),
    (error) => {
      assert.match(`${error.stdout ?? ""}\n${error.stderr ?? ""}`, pattern);
      return true;
    },
  );
}

async function gitConfig(root, key) {
  return (
    await exec("git", ["config", "--local", "--get", key], {
      cwd: root,
      windowsHide: true,
    })
  ).stdout.trim();
}
