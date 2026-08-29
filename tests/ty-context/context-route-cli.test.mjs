import assert from "node:assert/strict";
import { rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { CONTEXT_ROUTE_BUDGETS } from "../../packages/ty-context/dist/lib/context-router/context-route-budget.js";
import { routeContext } from "../../packages/ty-context/dist/lib/context-router/context-route.js";
import { createContextProject } from "./context-manifest-fixtures.mjs";
import {
  createRouteProject,
  runCli,
} from "./helpers/context-route-fixture.mjs";

test("manual includes are deduplicated and symlink/missing targets fail with I/O exit", async (t) => {
  const root = await createRouteProject();
  try {
    const included = "project_context/areas/client/unregistered.md";
    const result = await routeContext({
      project_root: root,
      task: "nothing",
      includes: [included, included],
    });
    assert.equal(
      result.unregistered_matches.filter((entry) => entry.path === included)
        .length,
      1,
    );
    assert.ok(
      result.unregistered_matches[0].groups.includes("manual_includes"),
    );

    const outside = path.join(root, "outside.md");
    const linked = path.join(
      root,
      "project_context",
      "areas",
      "client",
      "linked.md",
    );
    await writeFile(outside, "outside\n", "utf8");
    try {
      await symlink(outside, linked, "file");
    } catch (error) {
      if (error?.code === "EPERM") {
        t.diagnostic(
          "symlink creation unavailable; missing include still covers exit 5",
        );
      } else throw error;
    }
    for (const target of [
      "project_context/areas/client/missing.md",
      "project_context/areas/client/linked.md",
    ]) {
      const cliResult = runCli(root, [
        "route",
        "--task",
        "nothing",
        "--include",
        target,
        "--format",
        "json",
      ]);
      assert.equal(cliResult.status, 5, cliResult.stderr);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Router CLI reserves argument, Catalog, budget and I/O exit codes", async () => {
  const root = await createRouteProject();
  const invalid = await createContextProject({ manifest: "not = [valid" });
  const ambiguous = await createRouteProject({ duplicateClientRoot: true });
  try {
    const help = runCli(root, ["route", "--help"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /task=8192 UTF-8 bytes/u);
    assert.match(help.stdout, /Exit codes: 0 complete/u);
    assert.equal(runCli(root, ["route", "--format", "json"]).status, 2);
    assert.equal(
      runCli(invalid, ["route", "--task", "test", "--format", "json"]).status,
      3,
    );
    const budget = runCli(root, [
      "route",
      "--task",
      "x".repeat(CONTEXT_ROUTE_BUDGETS.task_utf8_bytes + 1),
      "--format",
      "json",
    ]);
    assert.equal(budget.status, 4, budget.stderr);
    assert.equal(JSON.parse(budget.stdout).complete, false);
    assert.equal(
      runCli(root, ["route", "--task", "test", "--include", "../outside.md"])
        .status,
      5,
    );
    assert.equal(
      runCli(root, ["route", "--task", "test", "--format", "json"]).status,
      0,
    );
    const ambiguity = runCli(ambiguous, [
      "route",
      "--task",
      "test",
      "--path",
      "apps/client/src/map.ts",
      "--format",
      "json",
    ]);
    assert.equal(ambiguity.status, 0, ambiguity.stderr);
    assert.equal(JSON.parse(ambiguity.stdout).ambiguous.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(invalid, { recursive: true, force: true });
    await rm(ambiguous, { recursive: true, force: true });
  }
});
