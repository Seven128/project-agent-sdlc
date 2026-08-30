import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  activeRecordPath,
  worktreeIdentity,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import { canonicalJson } from "../../packages/ty-context/dist/lib/strict-codec.js";
import {
  createDeliveryFixture,
  pathExists,
  runCli,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);

test("force-corrupt-state safely abandons every unrecoverable local state", async (t) => {
  for (const scenario of corruptScenarios())
    await t.test(scenario.name, async () => {
      const fixture = await createDeliveryFixture();
      try {
        await runCli(fixture.root, ["enable", "long-task"]);
        await runCli(fixture.root, [
          "long-task",
          "compile",
          fixture.workdir,
        ]);
        const activeFile = await activeRecordPath(fixture.root);
        const markerKey = `ty-context.longTask.${worktreeIdentity(fixture.root)}`;
        const baseline = await protectedBaseline(fixture);
        await scenario.corrupt({
          fixture,
          activeFile,
          markerKey,
        });

        await assert.rejects(
          () =>
            runCli(fixture.root, [
              "long-task",
              "abandon",
              fixture.workdir,
            ]),
        );
        const doctor = await runCli(fixture.root, [
          "long-task",
          "doctor",
          fixture.workdir,
        ]);
        assert.equal(doctor.healthy, false);
        assert.equal(
          doctor.next_action,
          `ty-context long-task abandon ${fixture.workdir} --force-corrupt-state`,
        );

        const result = await runCli(fixture.root, [
          "long-task",
          "abandon",
          fixture.workdir,
          "--force-corrupt-state",
        ]);
        assert.equal(result.force_corrupt_state, true);
        assert.equal(await pathExists(activeFile), false);
        assert.equal(await gitConfig(fixture.root, markerKey), null);
        assert.equal(
          await pathExists(path.join(fixture.workdir, ".ty-context")),
          false,
        );
        assert.equal(
          await pathExists(
            path.join(fixture.workdir, "delivery-contract.yaml"),
          ),
          true,
        );
        assert.deepEqual(await protectedBaseline(fixture), baseline);
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    });
});

test("a canonical dead Active Authority owner is reclaimed without force", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const activeFile = await activeRecordPath(fixture.root);
    await writeFile(
      `${activeFile}.lock`,
      canonicalJson({
        schema_version: "active-authority-lock-owner-v1",
        lock_id: "00000000-0000-4000-8000-000000000001",
        pid: 2147483647,
        operation: "commit",
        created_at: new Date(0).toISOString(),
      }),
    );
    const result = await runCli(fixture.root, [
      "long-task",
      "abandon",
      fixture.workdir,
    ]);
    assert.equal(result.status, "abandoned");
    assert.equal(result.force_corrupt_state, false);
    assert.equal(await pathExists(`${activeFile}.lock`), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function corruptScenarios() {
  return [
    {
      name: "invalid JSON record",
      async corrupt({ activeFile }) {
        await writeFile(activeFile, "{not-json\n");
      },
    },
    {
      name: "marker only",
      async corrupt({ activeFile }) {
        await rm(activeFile, { force: true });
      },
    },
    {
      name: "record only",
      async corrupt({ fixture, markerKey }) {
        await unsetGitConfig(fixture.root, markerKey);
      },
    },
    {
      name: "marker and record identity mismatch",
      async corrupt({ fixture, markerKey }) {
        await exec(
          "git",
          ["config", "--local", markerKey, "wrong|99|identity"],
          { cwd: fixture.root, windowsHide: true },
        );
      },
    },
    {
      name: "legacy cache missing",
      async corrupt({ fixture, activeFile, markerKey }) {
        const current = JSON.parse(await readFile(activeFile, "utf8"));
        const legacy = {
          schema_version: "active-long-task-binding-v2",
          task_id: current.task_id,
          repository_root: current.repository_root,
          worktree_identity: current.worktree_identity,
          workdir: current.workdir,
          initial_task_base: current.initial_task_base,
          active_authority_identity: current.active_authority_identity,
          verifier_identity: current.verifier_identity,
          activated_at: current.activated_at,
          authority_revision: current.authority_revision,
        };
        await writeFile(activeFile, `${JSON.stringify(legacy)}\n`);
        await exec("git", ["config", "--local", markerKey, legacy.task_id], {
          cwd: fixture.root,
          windowsHide: true,
        });
        await rm(
          path.join(
            fixture.workdir,
            ".ty-context",
            "compiled-contract.json",
          ),
          { force: true },
        );
      },
    },
  ];
}

async function protectedBaseline(fixture) {
  const [contract, source, context, head] = await Promise.all([
    readFile(
      path.join(fixture.workdir, "delivery-contract.yaml"),
      "utf8",
    ),
    readFile(path.join(fixture.root, "source.md"), "utf8"),
    readFile(
      path.join(fixture.root, "project_context", "areas", "main.md"),
      "utf8",
    ),
    exec("git", ["rev-parse", "HEAD"], {
      cwd: fixture.root,
      windowsHide: true,
    }).then((result) => result.stdout.trim()),
  ]);
  return { contract, source, context, head };
}

async function gitConfig(root, key) {
  try {
    return (
      await exec("git", ["config", "--local", "--get", key], {
        cwd: root,
        windowsHide: true,
      })
    ).stdout.trim();
  } catch {
    return null;
  }
}

async function unsetGitConfig(root, key) {
  await exec("git", ["config", "--local", "--unset-all", key], {
    cwd: root,
    windowsHide: true,
  });
}
