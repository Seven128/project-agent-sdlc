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
        .sort(compareUtf8)
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
    assert.ok(unregistered.groups.includes("unregistered"));
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

test("Router JSON uses UTF-8 byte order for non-ASCII and case-varied Context paths", async () => {
  const root = await createRouteProject();
  const contextDirectory = path.join(
    root,
    "project_context",
    "areas",
    "client",
  );
  const physicalPaths = [
    "project_context/areas/client/A-upper.md",
    "project_context/areas/client/a-lower.md",
    "project_context/areas/client/combining-Cafe\u0301.md",
    "project_context/areas/client/precomposed-Café.md",
    "project_context/areas/client/Å.md",
    "project_context/areas/client/ä.md",
    "project_context/areas/client/中文.md",
    "project_context/areas/client/\uE000.md",
    "project_context/areas/client/\u{10000}.md",
  ];
  const expectedPaths = physicalPaths
    .map((entry) => entry.normalize("NFC"))
    .sort(compareUtf8);
  try {
    await Promise.all(
      physicalPaths.map((relative) =>
        writeFile(
          path.join(contextDirectory, path.basename(relative)),
          "# Unicode order\n\nunicode-order-needle\n",
          "utf8",
        ),
      ),
    );
    const input = {
      project_root: root,
      task: "none",
      explicit_terms: ["unicode-order-needle"],
    };
    const first = await routeContext(input);
    const second = await routeContext(input);
    assert.equal(JSON.stringify(second), JSON.stringify(first));
    assert.deepEqual(
      first.unregistered_matches.map((entry) => entry.path),
      expectedPaths,
    );
    assert.deepEqual(
      first.diagnostics
        .filter(
          (entry) =>
            entry.code === "context_file_unregistered" &&
            expectedPaths.includes(entry.path),
        )
        .map((entry) => entry.path),
      expectedPaths,
    );
    assert.ok(
      expectedPaths.indexOf("project_context/areas/client/\uE000.md") <
        expectedPaths.indexOf("project_context/areas/client/\u{10000}.md"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Router JSON is invariant to file creation order, path input order and separator aliases", async () => {
  const roots = await Promise.all([
    createRouteProject({ duplicateClientRoot: true }),
    createRouteProject({ duplicateClientRoot: true }),
  ]);
  const names = ["z-last.md", "Å-middle.md", "\uE000.md", "\u{10000}.md"];
  try {
    for (const [index, root] of roots.entries()) {
      const ordered = index === 0 ? names : [...names].reverse();
      for (const name of ordered)
        await writeFile(
          path.join(root, "project_context", "areas", "client", name),
          "# Permutation\n\npermutation-needle\n",
          "utf8",
        );
    }
    const first = await routeContext({
      project_root: roots[0],
      task: "permutation",
      explicit_terms: ["permutation-needle"],
      paths: [
        "outside/file.ts",
        "apps\\client\\src\\map.ts",
        "apps/client/src/map.ts",
      ],
    });
    const second = await routeContext({
      project_root: roots[1],
      task: "permutation",
      explicit_terms: ["permutation-needle"],
      paths: ["apps/client/src/map.ts", "outside\\file.ts"],
    });
    assert.equal(JSON.stringify(second), JSON.stringify(first));
    assert.deepEqual(
      first.ambiguous.map((entry) => entry.input),
      ["apps/client/src/map.ts"],
    );
    for (const entry of [...first.candidates, ...first.unregistered_matches]) {
      assert.deepEqual([...entry.groups].sort(compareUtf8), entry.groups);
      assert.deepEqual([...entry.reasons].sort(compareReasons), entry.reasons);
    }
  } finally {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
  }
});

test("Router resolves an NFC manual include to an NFD physical file and emits only the canonical key", async () => {
  const root = await createRouteProject();
  const decomposed = "project_context/areas/client/Cafe\u0301.md";
  const canonical = decomposed.normalize("NFC");
  try {
    const manifestPath = path.join(root, "project_context", "context.toml");
    await writeFile(
      manifestPath,
      `${await readFile(manifestPath, "utf8")}
[[context]]
path = "${decomposed}"
role = "contract"
read_policy = "on-demand"
`,
      "utf8",
    );
    await writeFile(
      path.join(root, ...decomposed.split("/")),
      "# Unicode Contract\n\nConsumers must preserve this contract.\n",
      "utf8",
    );
    const result = await routeContext({
      project_root: root,
      task: "none",
      includes: [canonical],
    });
    const included = candidate(result, canonical);
    assert.ok(included.groups.includes("manual_includes"));
    assert.ok(
      included.reasons.some(
        (reason) =>
          reason.kind === "manual_include" && reason.input === canonical,
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Router preserves source-position then explicit-term order inside file matches", async () => {
  const root = await createRouteProject();
  try {
    const target = path.join(
      root,
      "project_context",
      "areas",
      "client",
      "match-order.md",
    );
    await writeFile(target, "# Match order\n\nalpha beta\n", "utf8");
    const result = await routeContext({
      project_root: root,
      task: "none",
      explicit_terms: ["beta", "alpha", "alp"],
    });
    const entry = result.unregistered_matches.find((value) =>
      value.path.endsWith("match-order.md"),
    );
    assert.ok(entry);
    assert.deepEqual(
      entry.matches.map((match) => match.term),
      ["alpha", "alp", "beta"],
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
    assert.deepEqual(
      result.scan.exceeded.map((entry) => [entry.budget, entry.path ?? ""]),
      [...result.scan.exceeded]
        .sort(
          (left, right) =>
            compareUtf8(left.budget, right.budget) ||
            compareUtf8(left.path ?? "", right.path ?? ""),
        )
        .map((entry) => [entry.budget, entry.path ?? ""]),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function compareReasons(left, right) {
  return (
    compareUtf8(left.kind, right.kind) ||
    compareUtf8(left.input, right.input) ||
    compareUtf8(left.detail, right.detail)
  );
}
