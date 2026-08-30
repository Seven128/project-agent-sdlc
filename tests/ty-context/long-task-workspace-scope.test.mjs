import assert from "node:assert/strict";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  classifyWorkspaceScope,
  firstLockManagedWorkspacePaths,
  workspaceScopeErrors,
} from "../../packages/ty-context/dist/lib/long-task-workspace-scope.js";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { assertWorkspaceSnapshotExtractionControls } from "./helpers/long-task-workspace-snapshot-controls.mjs";

test("workspace scope classifies every changed path with forbidden precedence", () => {
  const classification = classifyWorkspaceScope(
    {
      global: {
        technical: {
          forbidden_paths: [{ key: "no-secrets", path: "secrets/**" }],
        },
      },
      outcomes: [
        {
          technical: {
            expected_change_paths: ["src/**", "secrets/**"],
            allowed_support_paths: ["docs/**"],
            forbidden_paths: ["generated/private/**"],
          },
        },
      ],
    },
    [
      "source.md",
      "src/app.ts",
      "docs/guide.md",
      "secrets/token.txt",
      "generated/private/data.json",
      "notes.txt",
    ],
    ["source.md"],
  );

  assert.deepEqual(classification.protected, ["source.md"]);
  assert.deepEqual(classification.expected_change, ["src/app.ts"]);
  assert.deepEqual(classification.allowed_support, ["docs/guide.md"]);
  assert.deepEqual(classification.forbidden, [
    "generated/private/data.json",
    "secrets/token.txt",
  ]);
  assert.deepEqual(classification.unclassified, ["notes.txt"]);
  assert.deepEqual(workspaceScopeErrors(classification), [
    "workspace_path_forbidden:generated/private/data.json",
    "workspace_path_forbidden:secrets/token.txt",
    "workspace_path_unclassified:notes.txt",
  ]);
});

test("workspace snapshots recover only an unchanged no-diagnostic checkout and retain sparse entries", async (t) => {
  await assertWorkspaceSnapshotExtractionControls(t.mock);
});

test("first-lock bootstrap admits only a validated regular exact Codex worker profile", async () => {
  const fixture = await createDeliveryFixture();
  const profile = ".codex/agents/long-task-implementation.toml";
  const profileFile = path.join(fixture.root, profile);
  const sibling = ".codex/agents/user-worker.toml";
  const external = path.join(
    path.dirname(fixture.root),
    `${path.basename(fixture.root)}-worker-target.toml`,
  );
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    assert.deepEqual(
      await firstLockManagedWorkspacePaths(fixture.root, [profile, sibling]),
      [profile],
    );

    const valid = await readFile(profileFile, "utf8");
    await writeFile(
      profileFile,
      valid.replace("enabled = false", "enabled = true"),
    );
    assert.deepEqual(
      await firstLockManagedWorkspacePaths(fixture.root, [profile]),
      [],
    );

    await writeFile(
      profileFile,
      '# ty-context:managed:long-task-implementation-worker\nname = "long_task_implementation"\n',
    );
    assert.deepEqual(
      await firstLockManagedWorkspacePaths(fixture.root, [profile]),
      [],
    );

    await rm(profileFile, { force: true });
    await writeFile(external, valid);
    await symlink(external, profileFile, "file");
    assert.deepEqual(
      await firstLockManagedWorkspacePaths(fixture.root, [profile]),
      [],
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
    await rm(external, { force: true });
  }
});

test("[critical:first-lock-workspace-scope] first-lock Preflight and direct Compile reject an unclassified dirty path", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const initialLeak = path.join(fixture.root, "unclassified-support.txt");
    await writeFile(initialLeak, "must be classified before lock\n");

    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "not_ready");
    const diagnostic = preflight.diagnostics.find(
      (item) => item.code === "workspace_path_unclassified",
    );
    assert.deepEqual(diagnostic?.refs, ["unclassified-support.txt"]);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root),
      /workspace_path_unclassified:unclassified-support\.txt/u,
    );

    fixture.contract.outcomes[0].technical.allowed_support_paths.push(
      "unclassified-support.txt",
    );
    fixture.contract.outcomes[0].product.owner.path_globs.push(
      "unclassified-support.txt",
    );
    await writeContract(fixture.workdir, fixture.contract);
    const repaired = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(repaired.status, "ready", JSON.stringify(repaired));

    await mkdir(path.join(fixture.root, ".codex"), { recursive: true });
    await writeFile(
      path.join(fixture.root, ".codex", "user-note.md"),
      "an arbitrary file under the harness root is not package-managed\n",
    );
    await mkdir(path.join(fixture.root, "tools"), { recursive: true });
    await writeFile(
      path.join(fixture.root, "tools", "user-note.md"),
      "an arbitrary file under a managed directory is not a package asset\n",
    );
    const broadHarnessPath = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.deepEqual(
      broadHarnessPath.diagnostics
        .filter((item) => item.code === "workspace_path_unclassified")
        .flatMap((item) => item.refs),
      [".codex/user-note.md", "tools/user-note.md"],
    );
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root),
      /workspace_path_unclassified:\.codex\/user-note\.md/u,
    );
    await rm(path.join(fixture.root, ".codex", "user-note.md"));
    await rm(path.join(fixture.root, "tools", "user-note.md"));

    await mkdir(path.join(fixture.root, ".codex", "agents"), {
      recursive: true,
    });
    await writeFile(
      path.join(fixture.root, ".codex", "agents", "user-worker.toml"),
      'name = "user_worker"\n',
    );
    const agentSibling = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.deepEqual(
      agentSibling.diagnostics
        .filter((item) => item.code === "workspace_path_unclassified")
        .flatMap((item) => item.refs),
      [".codex/agents/user-worker.toml"],
    );
    await rm(path.join(fixture.root, ".codex", "agents", "user-worker.toml"));

    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await writeFile(
      path.join(fixture.root, "later-unclassified.txt"),
      "post-lock drift\n",
    );
    const verified = await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    assert.equal(verified.check_results.length, 0);
    const scopeEscape = verified.findings.find(
      (item) => item.code === "scope_escape",
    );
    assert.ok(scopeEscape);
    assert.deepEqual(scopeEscape.actual, ["later-unclassified.txt"]);
    assert.match(scopeEscape.message, /unclassified: later-unclassified\.txt/u);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
