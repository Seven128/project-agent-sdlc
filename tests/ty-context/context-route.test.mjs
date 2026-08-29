import assert from "node:assert/strict";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { CONTEXT_ROUTE_BUDGETS } from "../../packages/ty-context/dist/lib/context-router/context-route-budget.js";
import { routeContext } from "../../packages/ty-context/dist/lib/context-router/context-route.js";
import {
  candidate,
  compareUtf8,
  createRouteProject,
  repository,
  snapshotTree,
} from "./helpers/context-route-fixture.mjs";

test("Router source never compiles task terms or Manifest triggers as regular expressions", async () => {
  const sourceRoot = path.join(
    repository,
    "packages",
    "ty-context",
    "src",
    "lib",
    "context-router",
  );
  const source = (
    await Promise.all(
      (await readdir(sourceRoot))
        .filter((name) => name.endsWith(".ts"))
        .sort()
        .map((name) => readFile(path.join(sourceRoot, name), "utf8")),
    )
  ).join("\n");
  assert.doesNotMatch(source, /new\s+RegExp\s*\(/u);
  assert.doesNotMatch(source, /(?:from|require\s*\()\s*["']re2js/u);
});

test("experimental Router combines deepest Area, Chinese trigger, literal and unregistered candidates without writes", async () => {
  const root = await createRouteProject();
  try {
    const before = await snapshotTree(root);
    const result = await routeContext({
      project_root: root,
      task: "修改“天气地图”与 map.*[x] 查询",
      paths: ["apps\\client\\src\\map.ts"],
      explicit_terms: ["literal[.*]"],
    });
    const after = await snapshotTree(root);

    assert.deepEqual(after, before);
    assert.equal(result.complete, true);
    assert.equal(result.catalog_valid, true);
    assert.equal(result.experimental, true);
    assert.equal(result.authority, false);
    assert.equal(result.workflow_search_replaced, false);
    assert.ok(
      result.default_context.some(
        (entry) => entry.path === "project_context/areas/main.md",
      ),
    );

    const client = candidate(result, "project_context/areas/client.md");
    assert.ok(client.groups.includes("path_candidates"));
    assert.deepEqual(client.matched_paths, ["apps/client/src/map.ts"]);
    const weather = candidate(
      result,
      "project_context/areas/client/weather.md",
    );
    assert.ok(weather.groups.includes("on_demand_registered"));
    assert.ok(weather.groups.includes("trigger_candidates"));
    assert.ok(weather.groups.includes("literal_candidates"));
    assert.ok(weather.matched_terms.includes("天气地图"));
    assert.ok(weather.matched_terms.includes("literal[.*]"));

    const unregistered = result.unregistered_matches.find(
      (entry) => entry.path === "project_context/areas/client/unregistered.md",
    );
    assert.ok(unregistered);
    assert.equal(unregistered.role, null);
    assert.deepEqual(unregistered.groups.slice(0, 1), ["unregistered"]);
    assert.ok(
      result.diagnostics.some(
        (entry) => entry.code === "context_file_unregistered",
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Router matching is NFC literal, explicitly case-controlled and never regex-expanded", async () => {
  const root = await createRouteProject();
  try {
    const insensitive = await routeContext({
      project_root: root,
      task: "none",
      explicit_terms: ["café", "alpha", "map.*[x]"],
    });
    const sensitive = await routeContext({
      project_root: root,
      task: "none",
      explicit_terms: ["café", "alpha", "map.*[x]"],
      case_sensitive: true,
    });
    const target = "project_context/areas/client/weather.md";
    assert.ok(candidate(insensitive, target).matched_terms.includes("café"));
    assert.ok(candidate(insensitive, target).matched_terms.includes("alpha"));
    assert.ok(
      candidate(insensitive, target).matched_terms.includes("map.*[x]"),
    );
    assert.equal(
      sensitive.candidates
        .find((entry) => entry.path === target)
        ?.matched_terms.includes("alpha") ?? false,
      false,
    );
    assert.equal(
      insensitive.candidates.some(
        (entry) =>
          entry.path !== target && entry.matched_terms.includes("map.*[x]"),
      ),
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Area routing chooses the deepest root and reports equal-root ties", async () => {
  const root = await createRouteProject({ duplicateClientRoot: true });
  try {
    const result = await routeContext({
      project_root: root,
      task: "route path",
      paths: ["apps/client/src/map.ts", "outside/file.ts"],
    });
    assert.equal(result.complete, true);
    assert.equal(result.ambiguous.length, 1);
    assert.equal(result.ambiguous[0].input, "apps/client/src/map.ts");
    assert.deepEqual(
      result.ambiguous[0].candidates.map((entry) => entry.id),
      ["client", "client-shadow"],
    );
    assert.equal(result.unresolved.length, 0);
    assert.ok(
      candidate(result, "project_context/areas/main.md").groups.includes(
        "path_candidates",
      ),
      "root dot remains the unique deepest match for outside/file.ts",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Router JSON is byte-stable and output truncation is not scan incompleteness", async () => {
  const root = await createRouteProject();
  try {
    const input = {
      project_root: root,
      task: "Context",
      explicit_terms: ["Context"],
      max_search_results: 1,
    };
    const first = await routeContext(input);
    const second = await routeContext(input);
    assert.equal(JSON.stringify(second), JSON.stringify(first));
    assert.equal(first.complete, true);
    assert.equal(first.output_truncated, true);
    assert.equal(first.scan.budget_exceeded, false);
    assert.ok(
      first.candidates.every(
        (entry, index, values) =>
          index === 0 || compareUtf8(values[index - 1].path, entry.path) <= 0,
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Router reports task and per-file budget overruns as incomplete", async () => {
  const root = await createRouteProject();
  try {
    const largePath = path.join(
      root,
      "project_context",
      "areas",
      "client",
      "unregistered-large.md",
    );
    await writeFile(
      largePath,
      `needle${"x".repeat(CONTEXT_ROUTE_BUDGETS.per_file_scan_bytes)}`,
      "utf8",
    );
    const result = await routeContext({
      project_root: root,
      task: "x".repeat(CONTEXT_ROUTE_BUDGETS.task_utf8_bytes + 1),
      explicit_terms: ["needle"],
    });
    assert.equal(result.complete, false);
    assert.equal(result.catalog_valid, true);
    assert.equal(result.scan.budget_exceeded, true);
    assert.ok(
      result.scan.exceeded.some((entry) => entry.budget === "task_utf8_bytes"),
    );
    assert.ok(
      result.scan.exceeded.some(
        (entry) =>
          entry.budget === "per_file_scan_bytes" &&
          entry.path.endsWith("unregistered-large.md"),
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
