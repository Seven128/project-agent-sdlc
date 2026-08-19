import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { resolveAffectedChanges } from "../../tools/affected_change_discovery.mjs";

const exec = promisify(execFile);

test("explicit paths bypass Git discovery and normalize cross-platform separators", async () => {
  const changes = await resolveAffectedChanges({
    explicitPaths: [
      ".\\packages\\ty-context\\src\\cli.ts",
      "packages/ty-context/src/cli.ts",
    ],
    git: failIfCalled(),
  });

  assert.deepEqual(changes.paths, ["packages/ty-context/src/cli.ts"]);
  assert.deepEqual(changes.discovery, {
    source: "explicit-paths",
    base: null,
    includes_worktree: false,
  });
});

test("dirty local discovery uses only the current worktree", async () => {
  const git = fakeGit({
    working: ["packages/ty-context/src/lib/current.ts"],
    comparisons: { "HEAD^": ["package-lock.json"] },
  });
  const changes = await resolveAffectedChanges({
    environment: {},
    git,
  });

  assert.deepEqual(changes.paths, ["packages/ty-context/src/lib/current.ts"]);
  assert.equal(changes.discovery.source, "local-worktree");
  assert.deepEqual(git.comparisonCalls, []);
});

test("local inference reports and omits only untracked work products", async () => {
  const git = fakeGit({
    working: ["packages/ty-context/src/lib/current.ts"],
    untracked: [
      ".work_products/design/review.md",
      ".work_products/skill-validator-python/yaml.py",
      "notes/new-test-input.md",
    ],
  });
  const changes = await resolveAffectedChanges({ environment: {}, git });

  assert.deepEqual(changes.paths, [
    "notes/new-test-input.md",
    "packages/ty-context/src/lib/current.ts",
  ]);
  assert.deepEqual(changes.discovery, {
    source: "local-worktree",
    base: null,
    includes_worktree: true,
    ignored_untracked_local_artifacts: [
      ".work_products/design/review.md",
      ".work_products/skill-validator-python/yaml.py",
    ],
  });
});

test("tracked and explicit work-product paths remain discovery inputs", async () => {
  const tracked = await resolveAffectedChanges({
    environment: {},
    git: fakeGit({ working: [".work_products/tracked-authority.md"] }),
  });
  assert.deepEqual(tracked.paths, [".work_products/tracked-authority.md"]);
  assert.equal(
    "ignored_untracked_local_artifacts" in tracked.discovery,
    false,
  );

  const explicit = await resolveAffectedChanges({
    explicitPaths: [".work_products/explicit-authority.md"],
    git: failIfCalled(),
  });
  assert.deepEqual(explicit.paths, [
    ".work_products/explicit-authority.md",
  ]);
});

test("clean local discovery uses only the current commit parent", async () => {
  const git = fakeGit({
    refs: ["HEAD^"],
    comparisons: {
      "HEAD^": ["tools/run_affected_tests.mjs"],
    },
  });
  const changes = await resolveAffectedChanges({ environment: {}, git });

  assert.deepEqual(changes.paths, ["tools/run_affected_tests.mjs"]);
  assert.deepEqual(changes.discovery, {
    source: "local-head-parent",
    base: "HEAD^",
    includes_worktree: false,
  });
});

test("pull-request CI uses its supplied base and includes any worktree delta", async () => {
  const git = fakeGit({
    working: ["project_context/global.md"],
    refs: ["origin/main"],
    comparisons: {
      "origin/main": ["packages/ty-context/src/lib/long-task-state.ts"],
    },
  });
  const changes = await resolveAffectedChanges({
    environment: { CI: "true", GITHUB_BASE_REF: "main" },
    git,
  });

  assert.deepEqual(changes.paths, [
    "packages/ty-context/src/lib/long-task-state.ts",
    "project_context/global.md",
  ]);
  assert.deepEqual(changes.discovery, {
    source: "ci-base-ref",
    base: "origin/main",
    includes_worktree: true,
  });
});

test("explicit base is exact, includes current worktree changes, and fails closed", async () => {
  const git = fakeGit({
    working: ["README.md"],
    refs: ["release-base"],
    comparisons: {
      "release-base": ["packages/ty-context/package.json"],
    },
  });
  const changes = await resolveAffectedChanges({
    explicitBase: "release-base",
    environment: {},
    git,
  });

  assert.deepEqual(changes.paths, [
    "README.md",
    "packages/ty-context/package.json",
  ]);
  assert.equal(changes.discovery.source, "explicit-base");
  assert.equal(changes.discovery.base, "release-base");

  await assert.rejects(
    resolveAffectedChanges({
      explicitBase: "missing-base",
      environment: {},
      git,
    }),
    /base ref does not exist: missing-base/u,
  );
});

test("working-tree and base discovery preserve both endpoints of a Git rename", async () => {
  const repository = await mkdtemp(
    path.join(tmpdir(), "ty-context-affected-rename-"),
  );
  const oldPath = "tests/ty-context/long-task-level4-acquisition.test.mjs";
  const newPath = "notes/ordinary.mjs";
  try {
    await git(repository, ["init"]);
    await git(repository, ["config", "user.email", "tests@example.invalid"]);
    await git(repository, ["config", "user.name", "Tiny Context Tests"]);
    await git(repository, ["config", "diff.renames", "true"]);
    await mkdir(path.join(repository, "tests/ty-context"), { recursive: true });
    await mkdir(path.join(repository, "notes"), { recursive: true });
    await writeFile(path.join(repository, oldPath), "export const level4 = true;\n");
    await git(repository, ["add", "."]);
    await git(repository, ["commit", "-m", "seed protected path"]);
    await git(repository, ["mv", oldPath, newPath]);

    const working = await resolveAffectedChanges({ repository, environment: {} });
    assert.deepEqual(working.paths, [newPath, oldPath].sort());

    await git(repository, ["commit", "-am", "move protected path"]);
    const committed = await resolveAffectedChanges({ repository, environment: {} });
    assert.deepEqual(committed.paths, [newPath, oldPath].sort());
    assert.equal(committed.discovery.source, "local-head-parent");
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

function fakeGit(options = {}) {
  const refs = new Set(options.refs ?? []);
  const comparisons = options.comparisons ?? {};
  const comparisonCalls = [];
  return {
    comparisonCalls,
    async workingTreeChanges() {
      return {
        tracked: options.working ?? [],
        untracked: options.untracked ?? [],
      };
    },
    async refExists(ref) {
      return refs.has(ref);
    },
    async comparisonPaths(ref) {
      comparisonCalls.push(ref);
      return comparisons[ref] ?? [];
    },
  };
}

function failIfCalled() {
  return new Proxy(
    {},
    {
      get() {
        throw new Error("Git discovery must not run for explicit paths");
      },
    },
  );
}

async function git(repository, arguments_) {
  await exec("git", arguments_, { cwd: repository, windowsHide: true });
}
