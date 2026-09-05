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
import { compareUtf8Paths } from "../../packages/ty-context/dist/lib/context-catalog/catalog-paths.js";

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

  assert.deepEqual(
    [...selected.keys()],
    [
        "project_context/areas/main.md",
      "project_context/areas/main/checks.md",
      "project_context/areas/main/verification.md",
        "project_context/global.md",
    ],
  );
  assert.deepEqual(
    [...selected.get("project_context/areas/main/checks.md")],
    ["default_child"],
  );
  assert.equal(selected.has("project_context/areas/secondary.md"), false);
  assert.equal(selected.has("project_context/areas/main/archive.md"), false);
});

test("default Context projection uses canonical NFC keys and UTF-8 byte order independent of Manifest order", () => {
  const privateUse = "project_context/areas/main/\uE000.md";
  const supplementary = "project_context/areas/main/\u{10000}.md";
  const decomposed = "project_context/areas/main/Cafe\u0301.md";
  const selected = selectDefaultContextPaths({
    areas: [
      {
        id: "main",
        root: ".",
        context: "project_context/areas/main.md",
        default: true,
      },
    ],
    contexts: [supplementary, privateUse, decomposed].map((contextPath) => ({
      path: contextPath,
      role: "contract",
      read_policy: "default",
      triggers: [],
      default_children: [],
    })),
  });

  assert.deepEqual(
    [...selected.keys()],
    [
        "project_context/areas/main.md",
      "project_context/areas/main/Café.md",
      privateUse,
      supplementary,
        "project_context/global.md",
    ],
  );
  assert.ok(compareUtf8Paths(privateUse, supplementary) < 0);
});

test("Schema v4 legacy policies retain current direct and default-child selection semantics", () => {
  const policies = [
    "default",
    "on-demand",
    "always",
    "optional",
    "never-default",
  ];
  const direct = policies.map((policy) => ({
    path: `project_context/areas/main/direct-${policy}.md`,
    role: "contract",
    read_policy: policy,
    triggers: [],
    default_children: [],
  }));
  const children = policies.map((policy) => ({
    path: `project_context/areas/main/child-${policy}.md`,
    role: "contract",
    read_policy: policy,
    triggers: [],
    default_children: [],
  }));
  const selected = selectDefaultContextPaths({
    areas: [
      {
        id: "main",
        root: ".",
        context: "project_context/areas/main.md",
        default: true,
      },
    ],
    contexts: [
      ...direct,
      ...children,
      {
        path: "project_context/areas/main/default-parent.md",
        role: "foundation",
        read_policy: "default",
        triggers: [],
        default_children: children.map((entry) => entry.path),
      },
    ],
  });

  for (const policy of policies) {
    assert.equal(
      selected.has(`project_context/areas/main/direct-${policy}.md`),
      policy === "default",
      `direct ${policy}`,
    );
    assert.equal(
      selected.has(`project_context/areas/main/child-${policy}.md`),
      true,
      `default child ${policy}`,
    );
  }
  assert.deepEqual(
    [...selected.get("project_context/areas/main/child-default.md")].sort(),
    ["default_child", "default_role"],
  );
  for (const policy of policies.filter((value) => value !== "default")) {
    assert.deepEqual(
      [...selected.get(`project_context/areas/main/child-${policy}.md`)],
      ["default_child"],
    );
  }
});

test("default-child traversal remains finite across duplicates, nesting and cycles", () => {
  const parent = "project_context/areas/main/parent.md";
  const child = "project_context/areas/main/child.md";
  const grandchild = "project_context/areas/main/grandchild.md";
  const selected = selectDefaultContextPaths({
    areas: [
      {
        id: "main",
        root: ".",
        context: "project_context/areas/main.md",
        default: true,
      },
    ],
    contexts: [
      {
        path: parent,
        role: "foundation",
        read_policy: "default",
        triggers: [],
        default_children: [child, child],
      },
      {
        path: child,
        role: "contract",
        read_policy: "never-default",
        triggers: [],
        default_children: [grandchild],
      },
      {
        path: grandchild,
        role: "verification",
        read_policy: "optional",
        triggers: [],
        default_children: [parent],
      },
    ],
  });

  assert.deepEqual(
    [parent, child, grandchild].map((entry) => [
      entry,
      [...selected.get(entry)].sort(),
    ]),
    [
      [parent, ["default_child", "default_role"]],
      [child, ["default_child"]],
      [grandchild, ["default_child"]],
    ],
  );
});

test("legacy policy migration choices expose their exact default-footprint diff", () => {
  const alwaysPath = "project_context/areas/main/always.md";
  const neverPath = "project_context/areas/main/never.md";
  const manifest = {
    areas: [
      {
        id: "main",
        root: ".",
        context: "project_context/areas/main.md",
        default: true,
      },
    ],
    contexts: [
      {
        path: "project_context/areas/main/parent.md",
        role: "foundation",
        read_policy: "default",
        triggers: [],
        default_children: [neverPath],
      },
      {
        path: alwaysPath,
        role: "contract",
        read_policy: "always",
        triggers: [],
        default_children: [],
      },
      {
        path: neverPath,
        role: "contract",
        read_policy: "never-default",
        triggers: [],
        default_children: [],
      },
    ],
  };
  const before = selectDefaultContextPaths(manifest);
  const alwaysDefault = structuredClone(manifest);
  alwaysDefault.contexts[1].read_policy = "default";
  const afterAlwaysDefault = selectDefaultContextPaths(alwaysDefault);
  const alwaysOnDemand = structuredClone(manifest);
  alwaysOnDemand.contexts[1].read_policy = "on-demand";
  const afterAlwaysOnDemand = selectDefaultContextPaths(alwaysOnDemand);
  const withoutNeverEdge = structuredClone(manifest);
  withoutNeverEdge.contexts[0].default_children = [];
  const afterNeverEdgeRemoval = selectDefaultContextPaths(withoutNeverEdge);

  assert.equal(before.has(alwaysPath), false);
  assert.equal(afterAlwaysDefault.has(alwaysPath), true);
  assert.deepEqual([...afterAlwaysOnDemand.keys()], [...before.keys()]);
  assert.equal(before.has(neverPath), true);
  assert.equal(afterNeverEdgeRemoval.has(neverPath), false);
});

test("repository-common defaults keep sparse workspace Context on-demand", () => {
  const selected = selectDefaultContextPaths({
    areas: [
      {
        id: "repository",
        root: ".",
        context: "project_context/areas/repository.md",
        kind: "repository",
        default: true,
      },
      {
        id: "mobile-product",
        root: "apps/mobile",
        context: "project_context/workspaces/mobile/areas/product.md",
        kind: "app",
        default: false,
      },
      {
        id: "miniapp-product",
        root: "apps/miniapp",
        context: "project_context/workspaces/miniapp/areas/product.md",
        kind: "app",
        default: false,
      },
      {
        id: "shared-service",
        root: "packages/service",
        context: "project_context/areas/shared-service.md",
        kind: "service",
        default: false,
      },
    ],
    contexts: [
      {
        path: "project_context/workspaces/mobile/areas/verification.md",
        role: "verification",
        read_policy: "on-demand",
        triggers: [],
        default_children: [],
      },
      {
        path: "project_context/workspaces/miniapp/areas/verification.md",
        role: "verification",
        read_policy: "on-demand",
        triggers: [],
        default_children: [],
      },
    ],
  });

  assert.deepEqual(
    [...selected.keys()],
    [
        "project_context/areas/repository.md",
        "project_context/global.md",
    ],
  );
  assert.equal(
    selected.has("project_context/workspaces/mobile/areas/product.md"),
    false,
  );
  assert.equal(
    selected.has("project_context/workspaces/mobile/areas/verification.md"),
    false,
  );
  assert.equal(
    selected.has("project_context/workspaces/miniapp/areas/product.md"),
    false,
  );
  assert.equal(selected.has("project_context/areas/shared-service.md"), false);
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
    assert.equal(report.files.length, 3);
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

test("default Context footprint resolves an NFD physical file while emitting its canonical NFC key", async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-footprint-nfd-"),
  );
  const physicalPath = "project_context/areas/main/Cafe\u0301.md";
  const canonicalPath = physicalPath.normalize("NFC");
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
kind = "repository"
default = true

[[context]]
path = "${physicalPath}"
role = "contract"
read_policy = "default"
`,
      "utf8",
    );
    await writeFile(
      path.join(root, "project_context", "global.md"),
      "global\n",
    );
    await writeFile(
      path.join(root, "project_context", "architecture.md"),
      "architecture\n",
    );
    await writeFile(
      path.join(root, "project_context", "areas", "main.md"),
      "main\n",
    );
    const physicalContent = "NFD physical Context\n";
    await writeFile(
      path.join(root, ...physicalPath.split("/")),
      physicalContent,
      "utf8",
    );

    const report = await inspectDefaultContextFootprint(root);
    const selected = report.files.find((entry) => entry.path === canonicalPath);
    assert.ok(selected);
    assert.equal(selected.bytes, Buffer.byteLength(physicalContent, "utf8"));
    assert.equal(
      report.files.some((entry) => entry.path === physicalPath),
      false,
    );
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
    "project_context/global.md",
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
