import assert from "node:assert/strict";
import { access, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadActiveLongTaskAuthority } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  createDeliveryFixture,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("[critical:revision-diagnosis-isolation] scope-only candidates stay stateless, coalesce before Compile, and auto-adopt with evidence invalidation", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "final-gate", fixture.workdir]);

    await writeFile(
      path.join(fixture.root, "tests", "extra.mjs"),
      "export const extraProofDependency = true;\n",
    );
    const activeBefore = (await loadActiveLongTaskAuthority(fixture.root))
      .authority;
    assert.ok(activeBefore);
    const runtimeBefore = await readRuntimeProjection(fixture.workdir);
    assert.equal(runtimeBefore.pending, null);
    assert.equal(runtimeBefore.approved, null);
    assert.notEqual(runtimeBefore.final, null);
    assert.ok(runtimeBefore.progress.length > 0);

    const candidate = structuredClone(fixture.contract);
    candidate.outcomes[0].product.owner.path_globs.push("shared/**");
    candidate.outcomes[0].technical.expected_change_paths.push("shared/**");
    candidate.outcomes[0].technical.allowed_support_paths.push("shared/**");
    candidate.outcomes[0].acceptance.checks[0].verification_inputs.push(
      "tests/extra.mjs",
    );
    await writeContract(fixture.workdir, candidate);

    const diagnosis = await runCli(fixture.root, [
      "long-task",
      "diagnose-revision",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    assert.equal(diagnosis.status, "scope_candidate_exercised");
    assert.equal(diagnosis.acceptance_authorized, false);
    assert.equal(diagnosis.progress_written, false);
    assert.equal(diagnosis.pending_revision_written, false);
    assert.equal(diagnosis.diagnostics_executed, true);
    assert.equal(diagnosis.revision.change_class, "scope_only_expansion");
    assert.equal(diagnosis.revision.user_decision_required, false);
    assert.equal(diagnosis.revision.approval_required, false);
    assert.deepEqual(diagnosis.revision.user_decision_reasons, []);
    assert.equal(
      diagnosis.revision.approval_summary.product_semantics_changed,
      false,
    );
    assert.equal(
      diagnosis.revision.approval_summary.acceptance_or_proof_weakened,
      false,
    );
    assert.equal(
      diagnosis.revision.approval_summary.write_scope_expanded,
      true,
    );
    assert.deepEqual(diagnosis.revision.approval_summary.protected_reasons, [
      "allowed_path_expanded",
      "expected_change_path_expanded",
      "owner_path_expanded",
    ]);
    assert.ok(
      diagnosis.revision.approval_summary.added_verification_dependencies.includes(
        "first.first-check:tests/extra.mjs",
      ),
    );
    assert.equal(diagnosis.check_results[0].status, "passed");

    const activeAfterDiagnosis = (
      await loadActiveLongTaskAuthority(fixture.root)
    ).authority;
    assert.equal(
      activeAfterDiagnosis.active_authority_identity,
      activeBefore.active_authority_identity,
    );
    assert.deepEqual(
      await readRuntimeProjection(fixture.workdir),
      runtimeBefore,
    );

    assert.match(
      diagnosis.revision.decision_brief.headline,
      /No user decision is required/iu,
    );
    assert.match(
      diagnosis.revision.decision_brief.approval_reason,
      /only expands repository-bound implementation scope/iu,
    );
    assert.deepEqual(diagnosis.revision.decision_brief.affected_outcomes, [
      "first",
    ]);

    candidate.outcomes[0].product.owner.path_globs.push("config/**");
    candidate.outcomes[0].technical.expected_change_paths.push("config/**");
    await writeContract(fixture.workdir, candidate);
    const revisedDiagnosis = await runCli(fixture.root, [
      "long-task",
      "diagnose-revision",
      fixture.workdir,
      "--check",
      "first-check",
    ]);
    assert.notEqual(
      revisedDiagnosis.revision.revision_identity,
      diagnosis.revision.revision_identity,
    );
    assert.equal(revisedDiagnosis.status, "scope_candidate_exercised");
    assert.deepEqual(
      await readRuntimeProjection(fixture.workdir),
      runtimeBefore,
      "diagnosis must not create pending/approval state or adopt a withdrawn candidate",
    );

    const adopted = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(adopted.status, "compiled");
    assert.equal(adopted.authority_revision, 2);
    assert.equal(adopted.progress_preserved, false);
    assert.equal(
      adopted.authority_revision_change.change_class,
      "scope_only_expansion",
    );
    assert.equal(
      adopted.authority_revision_change.revision_identity,
      revisedDiagnosis.revision.revision_identity,
    );
    assert.equal(
      adopted.authority_revision_change.user_decision_required,
      false,
    );
    assert.equal(await exists(runtimeFile(fixture.workdir, "progress")), false);
    assert.equal(
      await exists(runtimeFile(fixture.workdir, "final-receipt.json")),
      false,
    );
    assert.equal(
      await exists(
        runtimeFile(fixture.workdir, "authority-revision-pending.json"),
      ),
      false,
    );
    assert.equal(
      await exists(
        runtimeFile(fixture.workdir, "authority-revision-approved.json"),
      ),
      false,
    );

    const final = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(final.workflow_status, "machine_accepted");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function readRuntimeProjection(workdir) {
  const progressFolder = runtimeFile(workdir, "progress");
  const progressNames = await readdir(progressFolder).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  return {
    compiled: await optionalText(
      runtimeFile(workdir, "compiled-contract.json"),
    ),
    pending: await optionalText(
      runtimeFile(workdir, "authority-revision-pending.json"),
    ),
    approved: await optionalText(
      runtimeFile(workdir, "authority-revision-approved.json"),
    ),
    final: await optionalText(runtimeFile(workdir, "final-receipt.json")),
    progress: await Promise.all(
      progressNames
        .filter((name) => name.endsWith(".json"))
        .sort()
        .map(async (name) => [
          name,
          await readFile(path.join(progressFolder, name), "utf8"),
        ]),
    ),
  };
}

function runtimeFile(workdir, name) {
  return path.join(workdir, ".ty-context", name);
}

async function optionalText(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function exists(file) {
  return access(file).then(
    () => true,
    () => false,
  );
}
