import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  inspectDefaultContextFootprint,
  selectDefaultContextPaths,
} from "../../packages/ty-context/dist/lib/context-default-footprint.js";

const repository = fileURLToPath(new URL("../..", import.meta.url));

test("default Context selection includes only core, default areas and default-role closure", () => {
  const selected = selectDefaultContextPaths({
    areas: [
      {
        id: "main",
        root: ".",
        context: "project_context/areas/main.md",
        kind: "app",
        default: true,
      },
      {
        id: "secondary",
        root: "secondary",
        context: "project_context/areas/secondary.md",
        kind: "app",
        default: false,
      },
    ],
    contexts: [
      {
        path: "project_context/areas/main/verification.md",
        role: "verification",
        read_policy: "default",
        triggers: [],
        default_children: ["project_context/areas/main/checks.md"],
      },
      {
        path: "project_context/areas/main/checks.md",
        role: "contract",
        read_policy: "on-demand",
        triggers: [],
        default_children: [],
      },
      {
        path: "project_context/areas/main/archive.md",
        role: "archive",
        read_policy: "on-demand",
        triggers: [],
        default_children: [],
      },
    ],
  });

  assert.deepEqual([...selected.keys()].sort(), [
    "project_context/architecture.md",
    "project_context/areas/main.md",
    "project_context/areas/main/checks.md",
    "project_context/areas/main/verification.md",
    "project_context/context.toml",
    "project_context/global.md",
  ]);
  assert.deepEqual(
    [...selected.get("project_context/areas/main/checks.md")],
    ["default_child"],
  );
  assert.equal(selected.has("project_context/areas/secondary.md"), false);
  assert.equal(selected.has("project_context/areas/main/archive.md"), false);
});

test("default Context footprint reports bytes and exact duplicate owners without mutating files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-context-footprint-"));
  try {
    await mkdir(path.join(root, "project_context", "areas", "main"), {
      recursive: true,
    });
    await writeFile(
      path.join(root, "project_context", "context.toml"),
      `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "app"
default = true

[[context]]
path = "project_context/areas/main/verification.md"
role = "verification"
read_policy = "default"
triggers = ["test"]
`,
    );
    await writeFile(path.join(root, "project_context", "global.md"), "same\n");
    await writeFile(
      path.join(root, "project_context", "architecture.md"),
      "architecture\n",
    );
    await writeFile(
      path.join(root, "project_context", "areas", "main.md"),
      "same\n",
    );
    await writeFile(
      path.join(root, "project_context", "areas", "main", "verification.md"),
      "verification\n",
    );

    const report = await inspectDefaultContextFootprint(root);
    assert.equal(report.files.length, 5);
    assert.equal(
      report.total_bytes,
      report.files.reduce((total, file) => total + file.bytes, 0),
    );
    assert.deepEqual(report.duplicate_groups, [
      ["project_context/areas/main.md", "project_context/global.md"],
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source workspace keeps specialized role Context out of the default read path without making the soft budget a gate", async () => {
  const report = await inspectDefaultContextFootprint(repository);
  const paths = report.files.map((file) => file.path);

  assert.ok(report.total_bytes > 0);
  assert.deepEqual(report.duplicate_groups, []);
  for (const required of [
    "project_context/context.toml",
    "project_context/global.md",
    "project_context/architecture.md",
    "project_context/areas/harness-package.md",
  ])
    assert.ok(paths.includes(required), required);
  for (const specialized of [
    "project_context/areas/harness-package/foundation/context-model.md",
    "project_context/areas/harness-package/contracts/workflow-contract.md",
    "project_context/areas/harness-package/contracts/package-managed-surfaces.md",
    "project_context/areas/harness-package/verification.md",
  ])
    assert.equal(paths.includes(specialized), false, specialized);
});

test("default Context footprint rejects manifest paths outside the project", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-footprint-path-"),
  );
  try {
    await mkdir(path.join(root, "project_context"), { recursive: true });
    await writeFile(
      path.join(root, "project_context", "context.toml"),
      `[[areas]]
id = "outside"
root = "."
context = "../outside.md"
kind = "app"
default = true
`,
    );
    await writeFile(
      path.join(root, "project_context", "global.md"),
      "global\n",
    );
    await writeFile(
      path.join(root, "project_context", "architecture.md"),
      "architecture\n",
    );

    await assert.rejects(
      inspectDefaultContextFootprint(root),
      /default_context_path_outside_project:\.\.\/outside\.md/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
