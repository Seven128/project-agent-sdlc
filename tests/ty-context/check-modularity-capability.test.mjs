import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { analyzeModularity } from "../../packages/ty-context/dist/lib/modularity.js";
import { modularityAnalysisCapability } from "../../packages/ty-context/dist/lib/source-files.js";

const cliPath = fileURLToPath(
  new URL("../../packages/ty-context/dist/cli.js", import.meta.url),
);
test("modularity capability classification covers every included file family", () => {
  const expected = new Map([
    ...["js", "jsx", "cjs", "mjs", "ts", "tsx"].map((extension) => [
      `src/example.${extension}`,
      "js-ts-heuristic",
    ]),
    ["tools/example.py", "python-heuristic"],
    ...[
      "bat",
      "cmd",
      "go",
      "gql",
      "graphql",
      "jsonc",
      "proto",
      "ps1",
      "sh",
      "sql",
      "toml",
      "vue",
      "yaml",
      "yml",
    ].map((extension) => [`src/example.${extension}`, "line-only"]),
    ...[
      ".env.example",
      ".env.sample",
      ".env.template",
      "Dockerfile",
      "Dockerfile.dev",
      "service.dockerfile",
      "Makefile",
      "package.json",
      "pyproject.toml",
      "requirements.txt",
      "setup.cfg",
      "tsconfig.json",
      "babel.config.json",
      "biome.json",
      "composer.json",
      "deno.json",
      "eslint.config.json",
      "jsconfig.json",
      "vite.config.json",
      "schema/example.schema.json",
      "config/example.json",
      "examples/example.json",
    ].map((file) => [file, "line-only"]),
  ]);

  for (const [file, capability] of expected) {
    assert.equal(modularityAnalysisCapability(file), capability, file);
  }
  for (const file of [
    "example.env",
    "sample.env",
    ".env",
    "notes.json",
    "README.md",
    "styles.css",
  ]) {
    assert.equal(modularityAnalysisCapability(file), undefined, file);
  }
});

test("modularity metrics use null internally for unsupported observations", () => {
  const lineOnly = analyzeModularity(
    "export function fake() { if (true) return 1; }\n",
    "config/example.yaml",
  );
  assert.deepEqual(lineOnly, {
    analysis: "line-only",
    maxFunctionStatements: null,
    maxBranchComplexity: null,
    exports: null,
    stateTransitions: null,
    responsibilities: null,
  });

  const python = analyzeModularity(
    "def check(value):\n    if value:\n        return value\n",
    "tools/check.py",
  );
  assert.equal(python.analysis, "python-heuristic");
  assert.equal(python.maxFunctionStatements, 2);
  assert.equal(python.maxBranchComplexity, 2);
  assert.equal(python.exports, null);
  assert.equal(python.stateTransitions, null);
  assert.equal(python.responsibilities, null);

  const js = analyzeModularity(
    "export function check(value) { if (value) transition(value); return value; }\n",
    "src/check.ts",
  );
  assert.equal(js.analysis, "js-ts-heuristic");
  for (const metric of [
    js.maxFunctionStatements,
    js.maxBranchComplexity,
    js.exports,
    js.stateTransitions,
  ]) {
    assert.equal(typeof metric, "number");
  }
  assert.ok(Array.isArray(js.responsibilities));
});

test("check-modularity help states exact capability and proof limits", () => {
  const result = runCli(process.cwd(), ["check-modularity", "--help"]);
  assert.equal(result.status, 0, output(result));
  assert.match(
    result.stdout,
    /analysis=js-ts-heuristic\|python-heuristic\|line-only/,
  );
  assert.match(result.stdout, /prints n\/a for unsupported metrics/);
  assert.match(
    result.stdout,
    /not complete cross-language static analysis, architecture proof or runtime-performance evidence/,
  );
});

test("line-only formats report n/a without unsupported heuristic warnings", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-modularity-line-only-"),
  );
  try {
    await mkdir(path.join(root, "src"), { recursive: true });
    const misleadingTokens = Array.from(
      { length: 30 },
      (_, index) => `// export if transition fake_${index}`,
    ).join("\n");
    await writeFile(
      path.join(root, "src/service.go"),
      `${misleadingTokens}\n`,
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--file",
      "src/service.go",
      "--limit",
      "300",
      "--fail-on-warning",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(result.stdout, /warning=0/);
    assert.match(
      result.stdout,
      /analysis=line-only statements=n\/a branches=n\/a exports=n\/a transitions=n\/a responsibilities=n\/a statement_at=n\/a branch_at=n\/a/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("line-only formats retain portable physical-line risk", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-modularity-line-risk-"),
  );
  try {
    await mkdir(path.join(root, "schema"), { recursive: true });
    await writeFile(
      path.join(root, "schema/large.sql"),
      "select 1;\nselect 2;\nselect 3;\n",
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--file",
      "schema/large.sql",
      "--limit",
      "2",
      "--fail-on-warning",
    ]);
    assert.equal(result.status, 1, output(result));
    assert.match(result.stdout, /analysis=line-only/);
    assert.match(result.stderr, /3 physical lines exceeds limit 2/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("line-only baselines do not regress on unsupported legacy metrics", async () => {
  const root = await createGitFixture();
  try {
    const misleadingTokens = Array.from(
      { length: 30 },
      (_, index) => `// export if transition fake_${index}`,
    ).join("\n");
    await writeFile(
      path.join(root, "src/service.go"),
      `package service\n${misleadingTokens}\n`,
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--touched",
      "--limit",
      "300",
      "--fail-on-warning",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(result.stdout, /warning=0/);
    assert.match(result.stdout, /analysis=line-only/);
    assert.doesNotMatch(result.stderr, /exports exceeds|branch complexity/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createGitFixture() {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-modularity-capability-git-"),
  );
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(
    path.join(root, "src/service.go"),
    "package service\n// export if transition\n",
    "utf8",
  );
  await mkdir(path.join(root, ".agent"), { recursive: true });
  await writeFile(
    path.join(root, ".agent/config.yaml"),
    'core:\n  package: project-tiny-context-harness\n  schema_version: "4"\n',
    "utf8",
  );
  run("git", ["init"], root);
  run("git", ["config", "user.name", "Codex"], root);
  run("git", ["config", "user.email", "codex@example.local"], root);
  run("git", ["add", "."], root);
  run("git", ["commit", "-m", "initial"], root);
  return root;
}

function runCli(cwd, args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, output(result));
}

function output(result) {
  return `${result.stdout}\n${result.stderr}`;
}
