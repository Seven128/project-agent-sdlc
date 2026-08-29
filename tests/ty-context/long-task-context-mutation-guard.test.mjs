import assert from "node:assert/strict";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { registerContext } from "../../packages/ty-context/dist/lib/context-register/context-register.js";
import { moveContext } from "../../packages/ty-context/dist/lib/context-move/context-move.js";
import { readContextMutationJournal } from "../../packages/ty-context/dist/lib/context-mutation/mutation-journal.js";
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
      (error) =>
        error?.exit_code === 3 &&
        /active Long-Task Authority binds project_context\/context\.toml/u.test(
          error.message,
        ),
    );
    assert.deepEqual(await readFile(manifest), before);
    assert.equal(await readContextMutationJournal(fixture.root), null);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

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
