import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { prepareRealProcessRoiPlan } from "../../../tools/long_task_real_process_roi_runner.mjs";
import { npmCommandSpec } from "../../../tools/npm_command_spec.mjs";
import {
  assertPromotionMutationRejected,
  packageControl,
  runPromotionCase,
} from "./long-task-level4-promotion-fixture.mjs";
import { git } from "./long-task-level4-test-utils.mjs";

const execFileAsync = promisify(execFile);

export async function assertPromotionArtifactControls({
  repositoryRoot,
  candidateRecord,
  candidateTarball,
}) {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "ty-level4-promotion-control-"),
  );
  const registered = [];
  try {
    const plan = await prepareRealProcessRoiPlan({
      candidate: candidateRecord.commit,
      repositoryRoot,
    });
    const built = packageControl(candidateTarball);
    assert.equal(built.identity.package_sha256, candidateRecord.package_sha256);
    const unbuilt = await createUnbuiltPackage({
      repositoryRoot,
      commit: candidateRecord.commit,
      temporary,
      registered,
    });
    assert.equal(unbuilt.identity.package_name, built.identity.package_name);
    assert.equal(
      unbuilt.identity.package_version,
      built.identity.package_version,
    );
    assert.notEqual(
      unbuilt.identity.package_sha256,
      built.identity.package_sha256,
    );

    await assert.rejects(
      () =>
        runPromotionCase({
          repositoryRoot,
          temporary,
          registered,
          label: "report-package-mismatch",
          plan,
          candidateRecord,
          evidencePackage: built,
          reportPackage: unbuilt,
          manifestPackage: built,
        }),
      /level4_promotion_formal_report/u,
    );
    await assert.rejects(
      () =>
        runPromotionCase({
          repositoryRoot,
          temporary,
          registered,
          label: "run-set-package-mismatch",
          plan,
          candidateRecord,
          evidencePackage: built,
          reportPackage: built,
          manifestPackage: unbuilt,
        }),
      /level4_promotion_run_set_candidate_package/u,
    );
    await assert.rejects(
      () =>
        runPromotionCase({
          repositoryRoot,
          temporary,
          registered,
          label: "unbuilt-package",
          plan,
          candidateRecord,
          evidencePackage: unbuilt,
          reportPackage: unbuilt,
          manifestPackage: unbuilt,
        }),
      /level4_promotion_package_identity/u,
    );
    const positive = await runPromotionCase({
      repositoryRoot,
      temporary,
      registered,
      label: "governance-only-positive",
      plan,
      candidateRecord,
      evidencePackage: built,
      reportPackage: built,
      manifestPackage: built,
    });
    assert.equal(positive.governance_promotion_verified, true);
    assert.equal(positive.candidate_commit, candidateRecord.commit);
    assert.equal(positive.package_sha256, candidateRecord.package_sha256);

    const alteredVerifierCheckout = path.join(
      temporary,
      "altered-executing-verifier",
    );
    await git(repositoryRoot, [
      "worktree",
      "add",
      "--detach",
      alteredVerifierCheckout,
      candidateRecord.commit,
    ]);
    registered.push(alteredVerifierCheckout);
    const alteredVerifierPath = path.join(
      alteredVerifierCheckout,
      "tools",
      "verify_level4_governance_promotion.mjs",
    );
    await appendFile(
      alteredVerifierPath,
      "\n// synthetic modified executing verifier\n",
      "utf8",
    );
    const alteredVerifier = await import(
      `${pathToFileURL(alteredVerifierPath).href}?modified=${Date.now()}`
    );
    await assert.rejects(
      () =>
        alteredVerifier.verifyLevel4GovernancePromotion({
          repositoryRoot: positive.checkout,
          promotionCommit: positive.promotionCommit,
          evidenceRoot: positive.evidenceRoot,
        }),
      /level4_promotion_executing_benchmark_identity/u,
    );

    for (const mutation of [
      "packages/ty-context/README.md",
      "tools/formal_process_supervisor.mjs",
    ])
      await assertPromotionMutationRejected({
        repositoryRoot,
        temporary,
        registered,
        label: mutation.includes("README") ? "packed-mutation" : "tcb-mutation",
        candidateCommit: candidateRecord.commit,
        records: positive.records,
        mutation,
        evidenceRoot: positive.evidenceRoot,
      });
  } finally {
    for (const checkout of registered)
      await git(repositoryRoot, [
        "worktree",
        "remove",
        "--force",
        checkout,
      ]).catch(() => {});
    await rm(temporary, { recursive: true, force: true });
  }
}

async function createUnbuiltPackage({
  repositoryRoot,
  commit,
  temporary,
  registered,
}) {
  const checkout = path.join(temporary, "unbuilt-checkout");
  const output = path.join(temporary, "unbuilt-pack");
  await git(repositoryRoot, ["worktree", "add", "--detach", checkout, commit]);
  registered.push(checkout);
  await mkdir(output);
  const command = npmCommandSpec([
    "pack",
    "--workspace",
    "project-tiny-context-harness",
    "--pack-destination",
    output,
    "--ignore-scripts",
  ]);
  await execFileAsync(command.command, command.args, {
    cwd: checkout,
    windowsHide: true,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  const tarballs = (await readdir(output)).filter((name) =>
    name.endsWith(".tgz"),
  );
  assert.equal(tarballs.length, 1);
  return packageControl(await readFile(path.join(output, tarballs[0])));
}
