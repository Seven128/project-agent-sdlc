import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { LEVEL4_GOVERNANCE_RECORD_NAMES } from "./level4_governance_protocol.mjs";
import {
  assert,
  canonical,
} from "./long_task_real_process_roi_scoring.mjs";

const execFileAsync = promisify(execFile);

export async function assertLevel4PromotionCommitBoundary(options) {
  assertExactOptions(options);
  const repository = path.resolve(options.repositoryRoot);
  const promotionCommit = await gitText(repository, [
    "rev-parse",
    `${options.promotionCommit}^{commit}`,
  ]);
  const promotionTree = await gitText(repository, [
    "rev-parse",
    `${promotionCommit}^{tree}`,
  ]);
  const parents = (
    await gitText(repository, [
      "rev-list",
      "--parents",
      "-n",
      "1",
      promotionCommit,
    ])
  ).split(/\s+/u);
  assert(parents.length === 2, "level4_promotion_single_parent");
  const candidateCommit = parents[1];
  const candidateTree = await gitText(repository, [
    "rev-parse",
    `${candidateCommit}^{tree}`,
  ]);
  const governanceRoot = `governance/level4-promotion/${candidateCommit}`;
  const output = await gitText(repository, [
    "diff",
    "--name-status",
    "--no-renames",
    candidateCommit,
    promotionCommit,
    "--",
  ]);
  const rows = output
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => line.split("\t"));
  const expectedPaths = LEVEL4_GOVERNANCE_RECORD_NAMES.map(
    (name) => `${governanceRoot}/${name}`,
  ).sort();
  assert(
    rows.length === expectedPaths.length &&
      rows.every(([status]) => status === "A") &&
      canonical(rows.map(([, file]) => file).sort()) ===
        canonical(expectedPaths),
    "level4_promotion_diff_allowlist",
  );
  return Object.freeze({
    repository,
    promotion_commit: promotionCommit,
    promotion_tree: promotionTree,
    candidate_commit: candidateCommit,
    candidate_tree: candidateTree,
    governance_root: governanceRoot,
  });
}

function assertExactOptions(options) {
  assert(
    options &&
      typeof options === "object" &&
      !Array.isArray(options) &&
      Object.keys(options).sort().join(",") ===
        "promotionCommit,repositoryRoot" &&
      typeof options.repositoryRoot === "string" &&
      typeof options.promotionCommit === "string",
    "level4_promotion_commit_boundary_options",
  );
}

async function gitText(cwd, args) {
  const result = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120_000,
  });
  return result.stdout.trim();
}
