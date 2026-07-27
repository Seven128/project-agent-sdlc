import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  createDeliveryFixture,
  commitCandidate,
  pathExists,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);

test("long-task never invokes model/Git orchestration surfaces and runs only declared Checks", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  const shims = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-forbidden-process-shims-"),
  );
  try {
    const forbiddenLog = path.join(shims, "forbidden-process.log");
    const gitTrace = path.join(
      os.tmpdir(),
      `ty-context-git-trace-${path.basename(fixture.root)}.log`,
    );
    for (const name of ["codex", "gh", "app-server", "agent"]) {
      await writeFile(
        path.join(shims, `${name}.cmd`),
        `@echo ${name}>>"%TY_CONTEXT_FORBIDDEN_PROCESS_LOG%"\r\n@exit /b 97\r\n`,
      );
    }
    await writeContract(fixture.workdir, fixture.contract);
    const env = {
      ...process.env,
      PATH: `${shims}${path.delimiter}${process.env.PATH}`,
      TY_CONTEXT_FORBIDDEN_PROCESS_LOG: forbiddenLog,
      GIT_TRACE: gitTrace,
    };
    await runCli(fixture.root, ["enable", "long-task"], { env });
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir], { env });
    const first = await runCli(fixture.root, [
      "long-task", "verify", fixture.workdir, "--outcome", "first",
    ], { env });
    assert.deepEqual(first.check_results.map((item) => item.attempts), [1]);
    await commitCandidate(fixture.root);
    const before = await gitShape(fixture.root);
    const failed = await runCliFailure(fixture.root, [
      "long-task", "final-gate", fixture.workdir,
    ], { env, skipCandidateCommit: true });
    assert.equal(failed.workflow_status, "needs_work");
    assert.deepEqual(
      failed.check_results.map((item) => item.check_key).sort(),
      ["first-check", "second-check"],
    );
    assert.equal(await pathExists(forbiddenLog), false);
    assert.deepEqual(await gitShape(fixture.root), before);

    const trace = await readFile(gitTrace, "utf8");
    assert.doesNotMatch(
      trace,
      /\bgit (?:worktree|branch|switch|checkout\s|merge|push|request-pull)\b/u,
    );
    assert.equal(await pathExists(path.join(fixture.root, ".git/refs/remotes")), false);
  } finally {
    await rm(
      path.join(
        os.tmpdir(),
        `ty-context-git-trace-${path.basename(fixture.root)}.log`,
      ),
      { force: true },
    );
    await rm(shims, { recursive: true, force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("package_script runner executes in the immutable snapshot with project dependencies available", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.outcomes[0].acceptance.checks[0].runner = {
      type: "package_script",
      target: "oracle",
      argv: [],
      cwd: ".",
      timeout_ms: 30_000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
    };
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const accepted = await runCli(fixture.root, [
      "long-task", "final-gate", fixture.workdir,
    ]);
    assert.equal(accepted.workflow_status, "machine_accepted");
    assert.equal(accepted.check_results[0].attempts, 1);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("package_script runner rejects unresolved shell and verifier dependency closure", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.outcomes[0].acceptance.checks[0].runner = {
      type: "package_script",
      target: "oracle",
      argv: [],
      cwd: ".",
      timeout_ms: 30_000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
    };
    const packageFile = path.join(fixture.root, "package.json");
    const packageJson = JSON.parse(await readFile(packageFile, "utf8"));
    packageJson.scripts.oracle =
      "node tests/oracle.mjs first && node tests/unfrozen-helper.mjs";
    await writeFile(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await assert.rejects(
      runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      (error) => {
        assert.match(
          `${error.stdout ?? ""}\n${error.stderr ?? ""}`,
          /package_script_dependency_closure_unresolved:dynamic_shell_syntax/u,
        );
        return true;
      },
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function gitShape(root) {
  const [head, branches, worktrees, status] = await Promise.all([
    exec("git", ["rev-parse", "HEAD"], { cwd: root }),
    exec("git", ["branch", "--format=%(refname:short)"], { cwd: root }),
    exec("git", ["worktree", "list", "--porcelain"], { cwd: root }),
    exec("git", ["status", "--short", "--untracked-files=no"], { cwd: root }),
  ]);
  return {
    head: head.stdout.trim(),
    branches: branches.stdout.trim(),
    worktrees: worktrees.stdout.trim(),
    tracked_status: status.stdout.trim(),
  };
}
