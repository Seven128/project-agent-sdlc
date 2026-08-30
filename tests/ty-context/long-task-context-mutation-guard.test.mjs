import assert from "node:assert/strict";
import {
  access,
  chmod,
  mkdir,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { registerContext } from "../../packages/ty-context/dist/lib/context-register/context-register.js";
import { moveContext } from "../../packages/ty-context/dist/lib/context-move/context-move.js";
import { executeContextMutationPlan } from "../../packages/ty-context/dist/lib/context-mutation/mutation-commit.js";
import {
  createContextMutationJournal,
  readContextMutationJournal,
  updateContextMutationJournal,
} from "../../packages/ty-context/dist/lib/context-mutation/mutation-journal.js";
import {
  completeContextMutation,
  rollbackContextMutation,
} from "../../packages/ty-context/dist/lib/context-mutation/mutation-recovery.js";
import {
  captureMutationFileState,
  mutationRecordedFileState,
} from "../../packages/ty-context/dist/lib/context-mutation/mutation-file-state.js";
import { planContextRegistration } from "../../packages/ty-context/dist/lib/context-register/context-register.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  activateDeliveryContract,
  activeAuthorityLockExists,
  activeAuthorityLockPath,
  forceClearCorruptActiveState,
  withActiveAuthorityLock,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  createDeliveryFixture,
  runCli,
} from "./long-task-delivery-fixtures.mjs";

test("active Long-Task Context Authority blocks register without a force bypass", async () => {
  const fixture = await createDeliveryFixture();
  const contextPath = "project_context/areas/main/active-guard.md";
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    const absolute = path.join(fixture.root, ...contextPath.split("/"));
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(
      absolute,
      `---
context_role: domain
read_policy: on-demand
---
# Active Guard Domain

## Responsibility

- This Context owns a durable rule used to verify mutation Authority isolation.
`,
      "utf8",
    );
    const manifest = path.join(
      fixture.root,
      "project_context",
      "context.toml",
    );
    const before = await readFile(manifest);
    await assert.rejects(
      registerContext({
        project_root: fixture.root,
        context_path: contextPath,
        role: "domain",
        read_policy: "on-demand",
        apply: true,
      }),
      (error) => {
        assert.equal(error?.exit_code, 3);
        assert.match(
          error.message,
          /active Long-Task Authority binds project_context\/context\.toml/u,
        );
        assert.match(
          error.message,
          /end or abandon that binding through its legitimate Long-Task lifecycle before starting Context mutation/u,
        );
        assert.doesNotMatch(
          error.message,
          /Authority Revision or rebinding flow before Context mutation/u,
        );
        return true;
      },
    );
    assert.deepEqual(await readFile(manifest), before);
    assert.equal(await readContextMutationJournal(fixture.root), null);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("unfinished Context transaction blocks direct activation and first Compile", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    const candidate = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    const pending = await planFixtureRegistration(fixture.root);
    await createContextMutationJournal(fixture.root, pending.planned.plan);
    // Keep the first-Compile fixture's semantic Source closure unchanged. The
    // journal remains the only new controlling state.
    await rm(pending.absolute);
    await assert.rejects(
      activateDeliveryContract(candidate),
      /active_authority_context_mutation_unfinished/u,
    );
    await assert.rejects(
      runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /active_authority_context_mutation_unfinished/u,
    );
    assert.ok(await readContextMutationJournal(fixture.root));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Authority Revision fails closed when an unfinished transaction appears", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const pending = await planFixtureRegistration(fixture.root);
    await createContextMutationJournal(fixture.root, pending.planned.plan);
    await rm(pending.absolute);
    await assert.rejects(
      runCli(fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
        "--revise",
      ]),
      /active_authority_context_mutation_unfinished/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("recovery rechecks current Authority and proceeds only after legitimate abandon", async (t) => {
  await t.test("prepared complete", async () => {
    const fixture = await createDeliveryFixture();
    try {
      await runCli(fixture.root, ["enable", "long-task"]);
      await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
      const pending = await planFixtureRegistration(fixture.root);
      let journal = await createContextMutationJournal(
        fixture.root,
        pending.planned.plan,
      );
      journal = await updateContextMutationJournal(
        fixture.root,
        journal,
        { ...journal, state: "prepared" },
        ["planning"],
      );
      assert.equal(journal.state, "prepared");
      const manifest = path.join(
        fixture.root,
        "project_context",
        "context.toml",
      );
      const before = await readFile(manifest);
      await assert.rejects(
        completeContextMutation(fixture.root),
        (error) => {
          assert.match(
            error.message,
            /unfinished Context mutation conflicts with active Long-Task Authority binding for project_context\/context\.toml/u,
          );
          assert.match(
            error.message,
            /first end or abandon .* then complete or rollback .* then use a fresh Compile\/rebind and any required Authority Revision/u,
          );
          assert.match(
            error.message,
            /Compile, Revision, and activation cannot bypass the unfinished journal/u,
          );
          return true;
        },
      );
      assert.deepEqual(await readFile(manifest), before);
      await runCli(fixture.root, ["long-task", "abandon", fixture.workdir]);
      await completeContextMutation(fixture.root);
      assert.equal(await readContextMutationJournal(fixture.root), null);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  await t.test("partially applied rollback", async () => {
    const fixture = await createDeliveryFixture();
    try {
      await runCli(fixture.root, ["enable", "long-task"]);
      await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
      const pending = await planFixtureRegistration(fixture.root);
      const manifest = path.join(
        fixture.root,
        "project_context",
        "context.toml",
      );
      const before = await readFile(manifest);
      let journal = await createContextMutationJournal(
        fixture.root,
        pending.planned.plan,
      );
      const change = journal.files[0];
      await writeFile(
        manifest,
        Buffer.from(change.after.bytes_base64, "base64"),
      );
      await chmod(manifest, change.after.mode);
      const published = mutationRecordedFileState(
        await captureMutationFileState(fixture.root, change.path),
      );
      journal = await updateContextMutationJournal(
        fixture.root,
        journal,
        {
          ...journal,
          state: "committing",
          files: [
            {
              ...change,
              published_after: published,
            },
          ],
          applied_paths: [change.path],
        },
        ["planning"],
      );
      assert.equal(journal.state, "committing");
      await assert.rejects(
        rollbackContextMutation(fixture.root),
        /unfinished Context mutation conflicts with active Long-Task Authority binding for project_context\/context\.toml.*Compile, Revision, and activation cannot bypass the unfinished journal/u,
      );
      await runCli(fixture.root, ["long-task", "abandon", fixture.workdir]);
      await rollbackContextMutation(fixture.root);
      assert.deepEqual(await readFile(manifest), before);
      assert.equal(await readContextMutationJournal(fixture.root), null);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});

test("live mutation retains the shared lock through publication journal persistence", async () => {
  const fixture = await createDeliveryFixture();
  const publication = deferred();
  const release = deferred();
  try {
    const candidate = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    const pending = await planFixtureRegistration(fixture.root);
    const execution = executeContextMutationPlan(
      fixture.root,
      pending.planned.plan,
      {
        async barrier(point) {
          if (point !== "published_before_journal:project_context/context.toml")
            return;
          publication.resolve();
          await release.promise;
        },
      },
    );
    void execution.catch(publication.reject);
    await publication.promise;
    try {
      assert.equal(await activeAuthorityLockExists(fixture.root), true);
      await assert.rejects(
        compileDeliveryContract(fixture.workdir, fixture.root, {
          require_completion_gate: false,
        }),
        /active_authority_compare_and_swap_failed:lock_unavailable:live_owner/u,
      );
      await assert.rejects(
        activateDeliveryContract(candidate),
        /active_authority_compare_and_swap_failed:lock_unavailable:live_owner/u,
      );
      await assert.rejects(
        forceClearCorruptActiveState(fixture.root, fixture.workdir),
        /active_authority_compare_and_swap_failed:lock_unavailable:live_owner/u,
      );
    } finally {
      release.resolve();
    }
    await execution;
    await assert.rejects(
      activateDeliveryContract(candidate),
      /active_authority_candidate_stale:.*context_changed_after_compile/u,
    );
  } finally {
    release.resolve();
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("an old owner release cannot ABA-delete a replacement lock", async () => {
  const fixture = await createDeliveryFixture();
  const successorEntered = deferred();
  const releaseSuccessor = deferred();
  let successor;
  try {
    const lockFile = await activeAuthorityLockPath(fixture.root);
    const oldOwner = withActiveAuthorityLock(
      fixture.root,
      "context_mutation",
      async () => {
        await unlink(lockFile);
        successor = withActiveAuthorityLock(
          fixture.root,
          "compile",
          async () => {
            successorEntered.resolve();
            await releaseSuccessor.promise;
          },
        );
        void successor.catch(successorEntered.reject);
        await successorEntered.promise;
      },
    );
    await assert.rejects(
      oldOwner,
      /active_authority_lock_release_ownership_lost/u,
    );
    assert.equal(await activeAuthorityLockExists(fixture.root), true);
  } finally {
    releaseSuccessor.resolve();
    await successor?.catch(() => undefined);
    assert.equal(await activeAuthorityLockExists(fixture.root), false);
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function planFixtureRegistration(root) {
  const contextPath = "project_context/areas/main/recovery-guard.md";
  const absolute = path.join(root, ...contextPath.split("/"));
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(
    absolute,
    `---
context_role: domain
read_policy: on-demand
---
# Recovery Guard Domain

## Responsibility

- This Context owns a durable recovery interlock fixture rule.
`,
    "utf8",
  );
  return {
    contextPath,
    absolute,
    planned: await planContextRegistration({
      project_root: root,
      context_path: contextPath,
      role: "domain",
      read_policy: "on-demand",
      apply: false,
    }),
  };
}

test("active Long-Task Context Authority blocks move before directory or journal creation", async () => {
  const fixture = await createDeliveryFixture();
  const contextPath = "project_context/areas/main.md";
  const targetPath = "project_context/areas/moved/main.md";
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await writeFile(
      path.join(fixture.root, ...contextPath.split("/")),
      `# Main Area

## Responsibility

- This Context owns durable facts for the fixture's main product area.
`,
      "utf8",
    );
    await assert.rejects(
      moveContext({
        project_root: fixture.root,
        from_path: contextPath,
        to_path: targetPath,
        apply: true,
      }),
      (error) =>
        error?.exit_code === 3 &&
        /active Long-Task Authority binds/u.test(error.message) &&
        /project_context\/context\.toml/u.test(error.message),
    );
    await assert.rejects(
      access(path.join(fixture.root, "project_context", "areas", "moved")),
    );
    assert.equal(await readContextMutationJournal(fixture.root), null);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
