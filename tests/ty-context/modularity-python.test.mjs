import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cliPath = fileURLToPath(
  new URL("../../packages/ty-context/dist/cli.js", import.meta.url),
);

test("Python complexity is measured per function instead of per file", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-modularity-python-"),
  );
  try {
    await mkdir(path.join(root, "tools"), { recursive: true });
    const functions = Array.from(
      { length: 10 },
      (_, index) =>
        `def check_${index}(value):\n    if value:\n        return value\n    return None`,
    ).join("\n\n");
    await writeFile(
      path.join(root, "tools/checks.py"),
      `${functions}\n`,
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--file",
      "tools/checks.py",
      "--limit",
      "300",
      "--fail-on-warning",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(result.stdout, /analysis=python-heuristic/);
    assert.match(result.stdout, /statements=3 branches=2/);
    assert.match(
      result.stdout,
      /exports=n\/a transitions=n\/a responsibilities=n\/a/,
    );
    assert.match(result.stdout, /statement_at=check_0:1 branch_at=check_0:1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Python lexical analysis ignores comments and strings and handles multiline and inline suites", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-modularity-python-lexical-"),
  );
  try {
    await mkdir(path.join(root, "tools"), { recursive: true });
    await writeFile(
      path.join(root, "tools/check.py"),
      `def check(
    value,
    fallback=None,
):
    text = "if or for # fake"
    doc = '''while and except
case'''
    total = (
        value
        or fallback
    )
    if value and fallback:
        return value
    elif fallback: result = fallback; return result
    return None
`,
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--file",
      "tools/check.py",
      "--limit",
      "300",
      "--fail-on-warning",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(
      result.stdout,
      /analysis=python-heuristic statements=9 branches=5/,
    );
    assert.match(result.stdout, /statement_at=check:1 branch_at=check:1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function runCli(cwd, args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function output(result) {
  return `${result.stdout}\n${result.stderr}`;
}
