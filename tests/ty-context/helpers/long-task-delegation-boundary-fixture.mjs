import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { aggregateComparisons } from "../../../examples/delivery-benchmark/mechanism/runner/compare.mjs";
import {
  digest,
  readTrackedRegularContained,
} from "../../../examples/delivery-benchmark/mechanism/runner/delegation-guidance-io.mjs";
import { readDelegationCandidateBundle } from "../../../examples/delivery-benchmark/mechanism/runner/delegation-guidance.mjs";
import {
  mechanismRunMarker,
  resetOwnedRunDirectory,
} from "../../../examples/delivery-benchmark/mechanism/runner/owned-run-directory.mjs";
import { gitText } from "./long-task-delegation-benchmark-fixture.mjs";

export async function verifyOwnedRunResetSafety(repoRoot) {
  const temporary = await mkdtemp(path.join(tmpdir(), "tiny-context-owned-run-"));
  try {
    for (const target of [
      path.parse(repoRoot).root,
      homedir(),
      path.dirname(repoRoot),
      repoRoot,
      path.join(repoRoot, "examples/delivery-benchmark/mechanism"),
    ])
      await assert.rejects(
        resetOwnedRunDirectory(target, { force: true }),
        /mechanism_run_out_dir_(protected|repo_scope_forbidden)/u,
      );

    const foreign = path.join(temporary, "foreign");
    await mkdir(foreign);
    const foreignSentinel = path.join(foreign, "keep.txt");
    await writeFile(foreignSentinel, "keep\n");
    await assert.rejects(
      resetOwnedRunDirectory(foreign, { force: true }),
      /mechanism_run_owned_marker_missing/u,
    );
    assert.equal(await readFile(foreignSentinel, "utf8"), "keep\n");

    const owned = path.join(temporary, "owned");
    await resetOwnedRunDirectory(owned);
    const disposable = path.join(owned, "discard.txt");
    await writeFile(disposable, "discard\n");
    await resetOwnedRunDirectory(owned, { force: true });
    await assert.rejects(access(disposable));
    assert.deepEqual(
      JSON.parse(
        await readFile(
          path.join(owned, ".benchmark/mechanism-owned-run.json"),
          "utf8",
        ),
      ),
      mechanismRunMarker(owned),
    );

    const linkTarget = path.join(temporary, "link-target");
    const linked = path.join(temporary, "linked");
    await mkdir(linkTarget);
    const linkSentinel = path.join(linkTarget, "keep.txt");
    await writeFile(linkSentinel, "linked keep\n");
    await symlink(
      linkTarget,
      linked,
      process.platform === "win32" ? "junction" : "dir",
    );
    await assert.rejects(
      resetOwnedRunDirectory(linked, { force: true }),
      /mechanism_run_out_dir_link_forbidden/u,
    );
    assert.equal(await readFile(linkSentinel, "utf8"), "linked keep\n");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function verifyRelabeledDelegationAggregateRejected() {
  const temporary = await mkdtemp(
    path.join(tmpdir(), "tiny-context-delegation-relabel-"),
  );
  try {
    const scores = [];
    for (const index of [1, 2, 3]) {
      const file = path.join(temporary, `pair-${index}.json`);
      await writeFile(
        file,
        `${JSON.stringify({
          track: "context-routing",
          task_id: "long-task-disjoint-money-health",
          baseline_variant: "long-task-delegation-conditional",
          candidate_variant: "long-task-delegation-positive-default",
          pair_id: `pair-${index}`,
          replicate: 1,
          run_identity: { forged: true },
          decision_eligible: true,
          metrics: {},
        })}\n`,
      );
      scores.push(file);
    }
    await assert.rejects(
      aggregateComparisons({ scores }),
      /aggregate variants do not match the current experiment track and roles/u,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function verifyTrackedFrozenInputBoundary() {
  const temporary = await mkdtemp(
    path.join(tmpdir(), "tiny-context-delegation-tracked-input-"),
  );
  try {
    const file = path.join(temporary, "frozen.txt");
    await writeFile(file, "frozen\n");
    gitText(temporary, ["init", "-b", "main"]);
    gitText(temporary, ["config", "user.name", "Tracked Input Test"]);
    gitText(temporary, ["config", "user.email", "tracked@example.invalid"]);
    gitText(temporary, ["add", "frozen.txt"]);
    const manifest = {
      entries: [
        {
          role: "frozen",
          candidate: {
            path: "frozen.txt",
            byte_length: Buffer.byteLength("frozen\n"),
            content_sha256: digest(Buffer.from("frozen\n")),
          },
        },
      ],
    };
    assert.equal(
      (await readTrackedRegularContained(temporary, "frozen.txt")).toString(),
      "frozen\n",
    );
    assert.equal(
      (await readDelegationCandidateBundle(manifest, temporary))
        .get("frozen")
        .toString(),
      "frozen\n",
    );
    await writeFile(file, "working tree drift\n");
    await assert.rejects(
      readTrackedRegularContained(temporary, "frozen.txt"),
      /delegation_tracked_source_index_mismatch/u,
    );
    await assert.rejects(
      readDelegationCandidateBundle(manifest, temporary),
      /delegation_tracked_source_index_mismatch/u,
    );
    await writeFile(file, "staged drift\n");
    gitText(temporary, ["add", "frozen.txt"]);
    await assert.rejects(
      readDelegationCandidateBundle(manifest, temporary),
      /candidate:frozen_bytes_mismatch/u,
    );
    gitText(temporary, ["commit", "-m", "drift candidate"]);
    assert.equal(gitText(temporary, ["status", "--short"]), "");
    await assert.rejects(
      readDelegationCandidateBundle(manifest, temporary),
      /candidate:frozen_bytes_mismatch/u,
    );
    await writeFile(file, "frozen\n");
    gitText(temporary, ["add", "frozen.txt"]);
    gitText(temporary, ["rm", "--cached", "frozen.txt"]);
    await writeFile(path.join(temporary, ".gitignore"), "frozen.txt\n");
    await assert.rejects(
      readTrackedRegularContained(temporary, "frozen.txt"),
      /delegation_tracked_source_missing/u,
    );
    assert.equal(await readFile(file, "utf8"), "frozen\n");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
