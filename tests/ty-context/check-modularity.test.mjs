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

test("check-modularity warns for over-limit touched files without failing by default", async () => {
  const root = await createGitFixture();
  try {
    await writeFile(
      path.join(root, "src/new-large.ts"),
      lines(["one", "two", "three"]),
      "utf8",
    );
    run("git", ["add", "src/new-large.ts"], root);
    const result = runCli(root, [
      "check-modularity",
      "--touched",
      "--limit",
      "2",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(result.stdout, /check-modularity audited=1 warning=1 limit=2/);
    assert.match(result.stdout, /over-limit: src\/new-large\.ts 3 lines/);
    assert.match(
      result.stderr,
      /warning: src\/new-large\.ts: 3 physical lines exceeds limit 2/,
    );
    assert.match(
      result.stderr,
      /valid <harnessRoot>\/config\.yaml waiver with path, category, owner/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity can opt into failing on warnings", async () => {
  const root = await createGitFixture();
  try {
    await writeFile(
      path.join(root, "src/new-large.ts"),
      lines(["one", "two", "three"]),
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--touched",
      "--limit",
      "2",
      "--fail-on-warning",
    ]);
    assert.equal(result.status, 1, output(result));
    assert.match(result.stdout, /warning=1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity expands nested untracked directories into source files", async () => {
  const root = await createGitFixture();
  try {
    const nested = path.join(root, "src", "new-runtime", "store.ts");
    await mkdir(path.dirname(nested), { recursive: true });
    await writeFile(nested, lines(["one", "two", "three"]), "utf8");
    const result = runCli(root, [
      "check-modularity",
      "--touched",
      "--limit",
      "2",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(result.stdout, /audited=1 warning=1/);
    assert.match(result.stdout, /src\/new-runtime\/store\.ts/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity honors config waivers and reports them distinctly", async () => {
  const root = await createGitFixture();
  try {
    await writeHarnessConfig(
      root,
      `
modularity:
  limit: 2
  waivers:
    - path: src/new-large.ts
      category: legacy_migration
      owner: harness-maintainers
      introduced_at: "2026-07-13"
      reason: "Existing legacy module exceeds the hard source size bound."
      tracking_issue: "modularity-backlog"
      expiry_condition: "Extract provider adapters and retry policy."
`,
    );
    await writeFile(
      path.join(root, "src/new-large.ts"),
      lines(["one", "two", "three"]),
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--touched",
      "--limit",
      "2",
      "--fail-on-warning",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(
      result.stdout,
      /check-modularity audited=2 warning=0 limit=2 waived=1/,
    );
    assert.match(result.stdout, /waived: src\/new-large\.ts 3 lines/);
    assert.match(
      result.stderr,
      /waived: src\/new-large\.ts: 3 physical lines exceeds limit 2 but is waived by harness-maintainers/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity rejects lifecycle-incomplete waivers", async () => {
  const root = await createGitFixture();
  try {
    await writeHarnessConfig(
      root,
      `
modularity:
  limit: 2
  waivers:
    - path: src/large.ts
      category: legacy_migration
      reason: "No lifecycle metadata."
`,
    );
    const result = runCli(root, [
      "check-modularity",
      "--file",
      "src/large.ts",
      "--limit",
      "2",
    ]);
    assert.equal(result.status, 1, output(result));
    assert.match(result.stderr, /\.owner must be a non-empty string/);
    assert.match(result.stderr, /\.tracking_issue must be a non-empty string/);
    assert.match(
      result.stderr,
      /\.expiry_condition must be a non-empty string/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity catches compressed one-line branch complexity", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-modularity-compressed-"),
  );
  try {
    await mkdir(path.join(root, "src"), { recursive: true });
    const branches = Array.from(
      { length: 30 },
      (_, index) => `if(value===${index}){value++;}`,
    ).join("");
    await writeFile(
      path.join(root, "src/compressed.ts"),
      `export function compressed(value){${branches}return value;}\n`,
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--file",
      "src/compressed.ts",
      "--limit",
      "300",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(result.stdout, /over-limit: src\/compressed\.ts 1 lines/);
    assert.match(result.stdout, /branches=31/);
    assert.match(result.stdout, /branch_at=compressed:1/);
    assert.match(
      result.stderr,
      /branch complexity exceeds limit 25 in function compressed at line 1/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity measures Python complexity per function instead of aggregating the file", async () => {
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
    assert.match(result.stdout, /statements=3 branches=2/);
    assert.match(result.stdout, /statement_at=check_0:1 branch_at=check_0:1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity does not treat a declaration-only module as one giant function", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-modularity-schema-"),
  );
  try {
    await mkdir(path.join(root, "src"), { recursive: true });
    const declarations = Array.from(
      { length: 100 },
      (_, index) => `export interface Record${index} { value: string; }`,
    ).join("\n");
    await writeFile(
      path.join(root, "src/schema.ts"),
      `${declarations}\n`,
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--file",
      "src/schema.ts",
      "--limit",
      "300",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(result.stdout, /statements=0 branches=0/);
    assert.match(result.stderr, /exports exceeds limit 24/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity audits explicit files without git state", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-modularity-file-"),
  );
  try {
    await mkdir(path.join(root, "src"), { recursive: true });
    await writeFile(
      path.join(root, "src/explicit.ts"),
      lines(["one", "two", "three"]),
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--file",
      "src/explicit.ts",
      "--limit",
      "2",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(result.stdout, /over-limit: src\/explicit\.ts 3 lines/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity excludes generated and non-source paths", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-modularity-exclude-"),
  );
  try {
    await writeHarnessConfig(
      root,
      `
modularity:
  limit: 1
  policy: strict_except_generated
`,
    );
    await mkdir(path.join(root, "src"), { recursive: true });
    await mkdir(path.join(root, "dist"), { recursive: true });
    await writeFile(
      path.join(root, "src/generated.ts"),
      lines(["// Code generated by tool. DO NOT EDIT.", "one", "two"]),
      "utf8",
    );
    await writeFile(
      path.join(root, "dist/large.ts"),
      lines(["one", "two", "three"]),
      "utf8",
    );
    await writeFile(
      path.join(root, "package-lock.json"),
      lines(["one", "two", "three"]),
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--file",
      "src/generated.ts",
      "--file",
      "dist/large.ts",
      "--file",
      "package-lock.json",
      "--limit",
      "1",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(result.stdout, /check-modularity audited=0 warning=0 limit=1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity excludes only the Long-Task authority Contract while auditing sibling runners", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-modularity-authority-"),
  );
  try {
    const workdir = path.join(root, ".work_products", "delivery");
    await mkdir(workdir, { recursive: true });
    await writeFile(
      path.join(workdir, "delivery-contract.yaml"),
      lines(["contract:", "  claims:", "    - first"]),
      "utf8",
    );
    await writeFile(
      path.join(workdir, "runner.mjs"),
      lines(["one", "two", "three"]),
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--file",
      ".work_products/delivery/delivery-contract.yaml",
      "--file",
      ".work_products/delivery/runner.mjs",
      "--limit",
      "1",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(result.stdout, /check-modularity audited=1 warning=1 limit=1/);
    assert.match(result.stdout, /\.work_products\/delivery\/runner\.mjs/);
    assert.doesNotMatch(result.stdout, /delivery-contract\.yaml/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity fails on unknown modularity policy", async () => {
  const root = await createGitFixture();
  try {
    await writeHarnessConfig(
      root,
      `
modularity:
  limit: 2
  policy: freestyle
`,
    );
    const result = runCli(root, [
      "check-modularity",
      "--file",
      "src/large.ts",
      "--limit",
      "2",
      "--fail-on-warning",
    ]);
    assert.equal(result.status, 1, output(result));
    assert.match(
      result.stderr,
      /modularity\.policy must be one of scoped_waivers, strict_except_generated/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity audits files changed from a base ref", async () => {
  const root = await createGitFixture();
  try {
    const base = run("git", ["rev-parse", "HEAD"], root).stdout.trim();
    await writeFile(
      path.join(root, "src/new-large.ts"),
      lines(["one", "two", "three"]),
      "utf8",
    );
    run("git", ["add", "src/new-large.ts"], root);
    const result = runCli(root, [
      "check-modularity",
      "--base",
      base,
      "--limit",
      "2",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(result.stdout, /over-limit: src\/new-large\.ts 3 lines/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity reports formatter-only line expansion without failing the regression gate", async () => {
  const root = await createGitFixture();
  try {
    await writeFile(
      path.join(root, "src/large.ts"),
      lines(["one", "two", "three"]),
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--touched",
      "--limit",
      "2",
      "--fail-on-warning",
    ]);
    assert.equal(result.status, 0, output(result));
    assert.match(result.stdout, /observed-risk: src\/large\.ts 3 lines/);
    assert.match(result.stdout, /warning=0/);
    assert.doesNotMatch(result.stderr, /warning: src\/large\.ts/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity rejects worsened non-line complexity against the baseline", async () => {
  const root = await createGitFixture();
  try {
    const branches = Array.from(
      { length: 30 },
      (_, index) => `if(value===${index}){value++;}`,
    ).join("");
    await writeFile(
      path.join(root, "src/large.ts"),
      `export function expanded(value){${branches}return value;}\n`,
      "utf8",
    );
    const result = runCli(root, [
      "check-modularity",
      "--touched",
      "--limit",
      "300",
      "--fail-on-warning",
    ]);
    assert.equal(result.status, 1, output(result));
    assert.match(result.stderr, /branch complexity exceeds limit 25/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity config-only validates waiver lifecycle without a source scope", async () => {
  const root = await createGitFixture();
  try {
    await writeHarnessConfig(
      root,
      `
modularity:
  waivers:
    - path: src/large.ts
      category: legacy_migration
      reason: "Missing lifecycle fields."
`,
    );
    const result = runCli(root, [
      "check-modularity",
      "--config-only",
      "--fail-on-warning",
    ]);
    assert.equal(result.status, 1, output(result));
    assert.match(result.stderr, /\.owner must be a non-empty string/);
    assert.match(
      result.stderr,
      /\.expiry_condition must be a non-empty string/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("check-modularity config-only rejects stale or unnecessary waivers", async () => {
  const root = await createGitFixture();
  try {
    await writeHarnessConfig(
      root,
      `
modularity:
  limit: 2
  waivers:
    - path: src/large.ts
      category: legacy_migration
      owner: harness-maintainers
      introduced_at: "2026-07-14"
      reason: "The target used to exceed the threshold."
      tracking_issue: "modularity-backlog"
      expiry_condition: "Remove when the target is below the threshold."
    - path: src/missing.ts
      category: legacy_migration
      owner: harness-maintainers
      introduced_at: "2026-07-14"
      reason: "The target used to exist."
      tracking_issue: "modularity-backlog"
      expiry_condition: "Remove when the target is deleted."
`,
    );
    const result = runCli(root, [
      "check-modularity",
      "--config-only",
      "--fail-on-warning",
    ]);
    assert.equal(result.status, 1, output(result));
    assert.match(
      result.stderr,
      /src\/large\.ts.*waiver|waiver for src\/large\.ts/is,
    );
    assert.match(result.stderr, /does not currently exceed/);
    assert.match(result.stderr, /src\/missing\.ts.*missing source file/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createGitFixture() {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-modularity-git-"),
  );
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(
    path.join(root, "src/large.ts"),
    lines(["one", "two"]),
    "utf8",
  );
  await writeHarnessConfig(root, "");
  run("git", ["init"], root);
  run("git", ["config", "user.name", "Codex"], root);
  run("git", ["config", "user.email", "codex@example.local"], root);
  run("git", ["add", "."], root);
  run("git", ["commit", "-m", "initial"], root);
  return root;
}

async function writeHarnessConfig(root, extraConfig) {
  await mkdir(path.join(root, ".agent"), { recursive: true });
  await writeFile(
    path.join(root, ".agent", "config.yaml"),
    `core:
  package: project-tiny-context-harness
  schema_version: "4"
${extraConfig}
`,
    "utf8",
  );
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
  return result;
}

function lines(values) {
  return `${values.join("\n")}\n`;
}

function output(result) {
  return `${result.stdout}\n${result.stderr}`;
}
