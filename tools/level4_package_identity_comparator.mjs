import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { materializeLongTaskPackage } from "./long_task_package_materialization.mjs";

const execFileAsync = promisify(execFile);

export async function comparePackedPackages(options) {
  assertExactOptions(options);
  const repositoryRoot = path.resolve(options.repositoryRoot);
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "ty-level4-promotion-"),
  );
  const checkouts = [];
  try {
    const results = {};
    for (const [label, commit] of [
      ["candidate", options.candidateCommit],
      ["promotion", options.promotionCommit],
    ]) {
      const checkout = path.join(temporaryRoot, label);
      const materialized = await materializeLongTaskPackage({
        repositoryRoot,
        commit,
        checkout,
        outputDir: path.join(temporaryRoot, `${label}-materialization`),
      });
      checkouts.push(checkout);
      results[label] = materialized.record;
    }
    return Object.freeze(results);
  } finally {
    await cleanupComparison(repositoryRoot, temporaryRoot, checkouts);
  }
}

async function cleanupComparison(repositoryRoot, temporaryRoot, checkouts) {
  const cleanupErrors = [];
  for (const checkout of checkouts)
    try {
      await execFileAsync(
        "git",
        ["worktree", "remove", "--force", checkout],
        {
          cwd: repositoryRoot,
          timeout: 120_000,
          windowsHide: true,
          encoding: "buffer",
          maxBuffer: 16 * 1024 * 1024,
        },
      );
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

function assertExactOptions(options) {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options) ||
    Object.keys(options).sort().join(",") !==
      "candidateCommit,promotionCommit,repositoryRoot"
  )
    throw new Error("level4_package_comparison_options");
}
