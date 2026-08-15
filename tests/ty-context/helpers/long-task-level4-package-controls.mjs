import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { materializeLongTaskPackage } from "../../../tools/long_task_package_materialization.mjs";

const execFileAsync = promisify(execFile);

export async function assertPackageChildBoundaries({
  repositoryRoot,
  baselineRecord,
}) {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "ty-level4-package-child-"),
  );
  const base = await gitText(repositoryRoot, ["rev-parse", "HEAD"]);
  const registered = [];
  try {
    const governanceCommit = await createDetachedChild({
      repositoryRoot,
      temporary,
      label: "governance",
      base,
      mutate: async (checkout) => {
        const target = path.join(
          checkout,
          "governance",
          "level4-promotion",
          base,
          "evidence-reference.json",
        );
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, '{"synthetic_test_only":true}\n');
      },
      registered,
    });
    const governance = await materializeChild({
      repositoryRoot,
      temporary,
      label: "governance",
      commit: governanceCommit,
      registered,
    });
    assert.equal(governance.package_sha256, baselineRecord.package_sha256);
    assert.equal(
      governance.package_file_set_sha256,
      baselineRecord.package_file_set_sha256,
    );

    const mutationCommit = await createDetachedChild({
      repositoryRoot,
      temporary,
      label: "packed-mutation",
      base,
      mutate: async (checkout) => {
        const target = path.join(
          checkout,
          "packages",
          "ty-context",
          "README.md",
        );
        const before = await readFile(target);
        await writeFile(
          target,
          Buffer.concat([before, Buffer.from("\npacked mutation\n")]),
        );
      },
      registered,
    });
    const mutation = await materializeChild({
      repositoryRoot,
      temporary,
      label: "packed-mutation",
      commit: mutationCommit,
      registered,
    });
    assert.notEqual(mutation.package_sha256, baselineRecord.package_sha256);
    assert.notEqual(
      mutation.package_file_set_sha256,
      baselineRecord.package_file_set_sha256,
    );
  } finally {
    for (const checkout of registered)
      await gitText(repositoryRoot, [
        "worktree",
        "remove",
        "--force",
        checkout,
      ]).catch(() => {});
    await rm(temporary, { recursive: true, force: true });
  }
}

async function createDetachedChild({
  repositoryRoot,
  temporary,
  label,
  base,
  mutate,
  registered,
}) {
  const checkout = path.join(temporary, `${label}-source`);
  await gitText(repositoryRoot, [
    "worktree",
    "add",
    "--detach",
    checkout,
    base,
  ]);
  registered.push(checkout);
  await gitText(checkout, ["config", "user.email", "fixture@example.invalid"]);
  await gitText(checkout, ["config", "user.name", "Fixture"]);
  await mutate(checkout);
  await gitText(checkout, ["add", "."]);
  await gitText(checkout, ["commit", "-m", label]);
  return gitText(checkout, ["rev-parse", "HEAD"]);
}

async function materializeChild({
  repositoryRoot,
  temporary,
  label,
  commit,
  registered,
}) {
  const checkout = path.join(temporary, `${label}-materialized-checkout`);
  const result = await materializeLongTaskPackage({
    repositoryRoot,
    commit,
    checkout,
    outputDir: path.join(temporary, `${label}-materialized-output`),
  });
  registered.push(checkout);
  return result.record;
}

async function gitText(cwd, args) {
  const result = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 64 * 1024 * 1024,
  });
  return result.stdout.trim();
}
