import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { writeReleaseTarballLongTaskFixture } from "../../tools/release_tarball_smoke_fixture.mjs";

const exec = promisify(execFile);
const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const cli = path.join(repo, "packages/ty-context/dist/cli.js");

test("release tarball fixture compiles and reaches the Live Final Gate with package-observed exact proof", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "release-tarball-contract-"),
  );
  try {
    await runCli(root, ["init", "--adopt", "--harness-folder", ".agent"]);
    await runCli(root, ["enable", "long-task"]);
    const workdir = await writeReleaseTarballLongTaskFixture(root);
    await writeFile(path.join(root, ".gitignore"), "node_modules/\n");
    await git(root, ["init", "-b", "main"]);
    await git(root, ["config", "user.email", "fixture@example.invalid"]);
    await git(root, ["config", "user.name", "Fixture"]);
    await git(root, ["add", "."]);
    await git(root, ["commit", "-m", "release fixture"]);
    await runCli(root, ["long-task", "preflight", workdir]);
    await runCli(root, ["long-task", "compile", workdir]);
    await runCli(root, ["long-task", "final-gate", workdir]);
    const receipt = JSON.parse(
      await readFile(
        path.join(workdir, ".ty-context", "final-receipt.json"),
        "utf8",
      ),
    );
    assert.equal(receipt.workflow_status, "machine_accepted");
    assert.deepEqual(receipt.findings, []);
    assert.equal(receipt.check_results[0].status, "passed");
    // Final Gate cannot accept this direct-process Check unless the package
    // observer sees exactly both designated mismatches while liveness remains
    // passing.
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function runCli(cwd, args) {
  await exec(process.execPath, [cli, ...args], { cwd });
}

async function git(cwd, args) {
  await exec("git", args, { cwd });
}
