import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import { promisify } from "node:util";
import { materializeLongTaskPackage } from "../../tools/long_task_package_materialization.mjs";
import { readPackedPackageIdentity } from "../../tools/long_task_packed_package_identity.mjs";
import { comparePackedPackages } from "../../tools/level4_package_identity_comparator.mjs";
import {
  parseAndValidateLevel4FormalReport,
  parseAndValidateLevel4RunSetManifest,
} from "../../tools/level4_promotion_evidence_validation.mjs";
import { verifyLevel4GovernancePromotion } from "../../tools/verify_level4_governance_promotion.mjs";
import { REAL_PROCESS_SCHEMAS } from "../../tools/long_task_real_process_schema_policy.mjs";
import {
  canonical,
  sha256,
} from "../../tools/long_task_real_process_roi_scoring.mjs";
import { assertPackageChildBoundaries } from "./helpers/long-task-level4-package-controls.mjs";
import { assertPromotionArtifactControls } from "./helpers/long-task-level4-promotion-controls.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
let reproducedPackagePromise;

after(async () => {
  const fixture = await reproducedPackagePromise?.catch(() => null);
  await fixture?.cleanup();
});

test(
  "[critical:level4-package-promotion-boundary] the unique materializer reproduces exact current-candidate package bytes and the five-way identity",
  { timeout: 600_000 },
  async () => {
    const fixture = await reproducedPackageFixture();
    const temporary = await mkdtemp(
      path.join(os.tmpdir(), "ty-level4-package-"),
    );
    const checkout = path.join(temporary, "independent-checkout");
    let independent;
    try {
      independent = await materializeLongTaskPackage({
        repositoryRoot,
        commit: fixture.commit,
        checkout,
        outputDir: path.join(temporary, "independent-materialization"),
      });
      const first = fixture.record;
      const second = independent.record;
      assert.equal(first.commit, fixture.commit);
      assert.equal(
        first.tree,
        await gitText(repositoryRoot, [
          "rev-parse",
          `${fixture.commit}^{tree}`,
        ]),
      );
      assert.equal(first.package_name, "project-tiny-context-harness");
      assert.equal(first.package_version, fixture.expectedPackageVersion);
      assert.equal(second.package_version, fixture.expectedPackageVersion);
      assert.match(first.package_sha256, /^[a-f0-9]{64}$/u);
      assert.match(first.package_file_set_sha256, /^[a-f0-9]{64}$/u);
      assert.equal(first.package_sha256, second.package_sha256);
      assert.equal(
        first.package_file_set_sha256,
        second.package_file_set_sha256,
      );
      assert.equal(first.lockfile_sha256, second.lockfile_sha256);
      assert.equal(first.node_executable_sha256, second.node_executable_sha256);
      assert.deepEqual(
        first.command_records.map((item) => item.label),
        [
          "git-worktree-add",
          "candidate-head",
          "candidate-tree",
          "npm-ci",
          "package-build",
          "package-check-source",
          "package-pack",
          "npm-version",
          "candidate-status",
        ],
      );
      const packed = readPackedPackageIdentity(fixture.tarball);
      assert.equal(packed.package_sha256, first.package_sha256);
      assert.equal(
        packed.package_file_set_sha256,
        first.package_file_set_sha256,
      );
    } finally {
      if (independent)
        await gitText(repositoryRoot, [
          "worktree",
          "remove",
          "--force",
          independent.checkout,
        ]).catch(() => {});
      await rm(temporary, { recursive: true, force: true });
    }
  },
);

test(
  "governance-only direct-child bytes preserve the package while a packed-source mutation changes it",
  { timeout: 600_000 },
  async () => {
    const fixture = await reproducedPackageFixture();
    await assertPackageChildBoundaries({
      repositoryRoot,
      candidateCommit: fixture.commit,
      baselineRecord: fixture.record,
    });
  },
);

test(
  "the authoritative Promotion verifier closes five-way package identity, unbuilt tarballs, and governance-only direct-child rules",
  { timeout: 1_200_000 },
  async () => {
    const fixture = await reproducedPackageFixture();
    const verify = () =>
      assertPromotionArtifactControls({
        repositoryRoot,
        candidateRecord: fixture.record,
        candidateTarball: fixture.tarball,
      });
    if (process.platform === "win32") await verify();
    else
      await assert.rejects(
        verify,
        /formal_process_supervisor_platform_unsupported/u,
      );
  },
);

test("materialization, comparator, and promotion reject injected runners or fake comparators", async () => {
  const commit = await gitText(repositoryRoot, ["rev-parse", "HEAD"]);
  await assert.rejects(
    () =>
      materializeLongTaskPackage({
        repositoryRoot,
        commit,
        checkout: "x",
        outputDir: "y",
        commandRunner: async () => {},
      }),
    /long_task_package_materialization_options/u,
  );
  await assert.rejects(
    () =>
      comparePackedPackages({
        repositoryRoot,
        candidateCommit: commit,
        promotionCommit: commit,
        materializer: async () => ({ package_sha256: "0".repeat(64) }),
      }),
    /level4_package_comparison_options/u,
  );
  await assert.rejects(
    () =>
      verifyLevel4GovernancePromotion({
        repositoryRoot,
        promotionCommit: commit,
        evidenceRoot: repositoryRoot,
        packageIdentityComparator: async () => ({}),
      }),
    /level4_promotion_options/u,
  );
});

test("package mutation and formal report package mismatch fail closed", async () => {
  const fixture = await reproducedPackageFixture();
  const mutated = Buffer.from(fixture.tarball);
  mutated[mutated.length - 1] ^= 0xff;
  assert.throws(
    () => readPackedPackageIdentity(mutated),
    /real_process_roi_package_tarball_gzip/u,
  );
  const evidenceReference = {
    candidate: {
      commit: "a".repeat(40),
      tree: "b".repeat(40),
      package_version: fixture.expectedPackageVersion,
      package_sha256: "c".repeat(64),
    },
    runtime_tcb_identity_sha256: "d".repeat(64),
  };
  const report = {
    schema_version: REAL_PROCESS_SCHEMAS.REAL_PROCESS_VERIFICATION_SCHEMA,
    formal_conclusion_owner: "verify_long_task_real_process_roi",
    candidate_commit: evidenceReference.candidate.commit,
    candidate_tree: evidenceReference.candidate.tree,
    capability_level: "level_3",
    level_4_claimed: false,
    governance_judgment_included: false,
    formal_status: "total_roi_positive",
    total_roi_supported: true,
    total_roi_positive: true,
    formal_runtime_tcb_identity_sha256:
      evidenceReference.runtime_tcb_identity_sha256,
    candidate_package: {
      package_name: "project-tiny-context-harness",
      package_version: fixture.expectedPackageVersion,
      package_sha256: "e".repeat(64),
    },
    formal_blockers: [],
    formal_accounting: { significant_stable_margin_met: true },
    formal_evidence: { incident_evidence_class: "authorized_sanitized_real" },
  };
  assert.throws(
    () =>
      parseAndValidateLevel4FormalReport(
        Buffer.from(JSON.stringify(report)),
        evidenceReference,
      ),
    /level4_promotion_formal_report/u,
  );
});

test("manifest v2 is exact and legacy, mixed, or unknown-newer manifest families fail closed", () => {
  const entries = [
    {
      path: "setup/c/candidate.tgz",
      role: "package_tarball",
      bytes: 1,
      sha256: "a".repeat(64),
    },
  ];
  const manifest = {
    schema_version: REAL_PROCESS_SCHEMAS.REAL_PROCESS_MANIFEST_SCHEMA,
    root: ".",
    excludes: ["attestation.json", "manifest.json"],
    entries,
    entry_count: 1,
    total_bytes: 1,
    materialized_set_sha256: sha256(canonical(entries)),
  };
  assert.deepEqual(
    parseAndValidateLevel4RunSetManifest(Buffer.from(JSON.stringify(manifest))),
    manifest,
  );
  for (const schema of [
    "long-task-real-process-roi-manifest-v1",
    "long-task-real-process-roi-manifest-v999",
  ])
    assert.throws(
      () =>
        parseAndValidateLevel4RunSetManifest(
          Buffer.from(JSON.stringify({ ...manifest, schema_version: schema })),
        ),
      /level4_run_set_manifest/u,
    );
});

function reproducedPackageFixture() {
  reproducedPackagePromise ??= createReproducedPackageFixture();
  return reproducedPackagePromise;
}

async function createReproducedPackageFixture() {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "ty-level4-package-shared-"),
  );
  const checkout = path.join(temporary, "checkout");
  let materialized;
  try {
    const commit = await currentCandidateCommit(repositoryRoot, temporary);
    const packageJson = JSON.parse(
      await gitText(repositoryRoot, [
        "show",
        `${commit}:packages/ty-context/package.json`,
      ]),
    );
    if (typeof packageJson.version !== "string" || !packageJson.version)
      throw new Error("level4_package_candidate_version");
    materialized = await materializeLongTaskPackage({
      repositoryRoot,
      commit,
      checkout,
      outputDir: path.join(temporary, "materialization"),
    });
    await gitText(repositoryRoot, [
      "worktree",
      "remove",
      "--force",
      materialized.checkout,
    ]);
    let cleaned = false;
    return Object.freeze({
      commit,
      expectedPackageVersion: packageJson.version,
      record: materialized.record,
      tarball: Buffer.from(materialized.tarball_bytes),
      cleanup: async () => {
        if (cleaned) return;
        cleaned = true;
        await rm(temporary, { recursive: true, force: true });
      },
    });
  } catch (error) {
    if (materialized)
      await gitText(repositoryRoot, [
        "worktree",
        "remove",
        "--force",
        materialized.checkout,
      ]).catch(() => {});
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

async function currentCandidateCommit(root, temporary) {
  const head = await gitText(root, ["rev-parse", "HEAD"]);
  const environment = {
    ...process.env,
    GIT_INDEX_FILE: path.join(temporary, "candidate.index"),
    GIT_AUTHOR_NAME: "Fixture",
    GIT_AUTHOR_EMAIL: "fixture@example.invalid",
    GIT_AUTHOR_DATE: "2000-01-01T00:00:00Z",
    GIT_COMMITTER_NAME: "Fixture",
    GIT_COMMITTER_EMAIL: "fixture@example.invalid",
    GIT_COMMITTER_DATE: "2000-01-01T00:00:00Z",
  };
  await gitText(root, ["read-tree", head], environment);
  await gitText(root, ["add", "-A", "--", "."], environment);
  const tree = await gitText(root, ["write-tree"], environment);
  return gitText(
    root,
    [
      "commit-tree",
      tree,
      "-p",
      head,
      "-m",
      "synthetic current-candidate package fixture",
    ],
    environment,
  );
}

async function gitText(cwd, args, env = process.env) {
  const result = await execFileAsync("git", args, {
    cwd,
    env,
    windowsHide: true,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  return result.stdout.trim();
}
