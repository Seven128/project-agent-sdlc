import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { readPackedPackageIdentity } from "./long_task_packed_package_identity.mjs";
import { assert } from "./long_task_real_process_roi_scoring.mjs";
import { npmCommandSpec } from "./npm_command_spec.mjs";

const execFileAsync = promisify(execFile);

export async function comparePackedPackages({
  repositoryRoot,
  candidateCommit,
  promotionCommit,
}) {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "ty-level4-promotion-"),
  );
  const checkouts = [];
  try {
    const results = {};
    for (const [label, commit] of [
      ["candidate", candidateCommit],
      ["promotion", promotionCommit],
    ]) {
      const checkout = path.join(temporaryRoot, label);
      await execChecked(
        "git",
        ["worktree", "add", "--detach", checkout, commit],
        {
          cwd: repositoryRoot,
          timeout: 120_000,
        },
      );
      checkouts.push(checkout);
      results[label] = await packIdentity(checkout, temporaryRoot, label);
    }
    return results;
  } finally {
    await cleanupComparison(repositoryRoot, temporaryRoot, checkouts);
  }
}

async function packIdentity(checkout, temporaryRoot, label) {
  const output = path.join(temporaryRoot, `${label}-pack`);
  await mkdir(output);
  const packCommand = npmCommandSpec([
    "pack",
    "--workspace",
    "project-tiny-context-harness",
    "--pack-destination",
    output,
    "--ignore-scripts",
  ]);
  await execChecked(packCommand.command, packCommand.args, {
    cwd: checkout,
    timeout: 120_000,
  });
  const tarballs = (await readdir(output)).filter((name) =>
    name.endsWith(".tgz"),
  );
  assert(tarballs.length === 1, `level4_promotion_pack_count:${label}`);
  return readPackedPackageIdentity(
    await readFile(path.join(output, tarballs[0])),
  );
}

async function cleanupComparison(repositoryRoot, temporaryRoot, checkouts) {
  const cleanupErrors = [];
  for (const checkout of checkouts)
    try {
      await execChecked("git", ["worktree", "remove", "--force", checkout], {
        cwd: repositoryRoot,
        timeout: 120_000,
      });
    } catch (error) {
      cleanupErrors.push(error);
    }
  try {
    await rm(temporaryRoot, { recursive: true, force: true });
  } catch (error) {
    cleanupErrors.push(error);
  }
  if (cleanupErrors.length)
    throw new AggregateError(cleanupErrors, "level4_promotion_package_cleanup");
}

async function execChecked(command, args, options) {
  await execFileAsync(command, args, {
    ...options,
    windowsHide: true,
    encoding: "buffer",
    maxBuffer: 16 * 1024 * 1024,
  });
}
