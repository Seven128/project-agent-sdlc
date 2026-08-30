import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inspectDefaultContextFootprint } from "../../packages/ty-context/dist/lib/context-default-footprint.js";
import { loadContextCatalog } from "../../packages/ty-context/dist/lib/context-catalog/catalog-load.js";
import { compareUtf8Paths } from "../../packages/ty-context/dist/lib/context-catalog/catalog-paths.js";
import { sortCatalogDiagnostics } from "../../packages/ty-context/dist/lib/context-catalog/catalog-diagnostics.js";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import {
  areaContext,
  baseManifest,
  createContextProject,
} from "./context-manifest-fixtures.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));

test("Shared Context Catalog discovers registered and unregistered Context without writes", async () => {
  const neverPath = "project_context/areas/main/never.md";
  const root = await createCatalogProject(neverPath);
  try {
    const before = await snapshotTree(root);
    const catalog = await loadContextCatalog(root);
    const after = await snapshotTree(root);

    assert.deepEqual(after, before);
    assert.equal(catalog.manifest_path, "project_context/context.toml");
    assert.deepEqual(
      catalog.registered_contexts.map((entry) => entry.path),
      [
        "project_context/areas/main.md",
        "project_context/areas/main/always.md",
        neverPath,
        "project_context/areas/main/verification.md",
      ],
    );
    assert.deepEqual(
      catalog.unregistered_context_files.map((entry) => entry.path),
      ["project_context/areas/main/unregistered.md"],
    );
    assert.equal(catalog.default_footprint.has(neverPath), true);
    assert.equal(
      catalog.default_footprint.has("project_context/areas/main/always.md"),
      false,
    );
    assert.deepEqual(
      catalog.diagnostics
        .filter((entry) => entry.severity === "warning")
        .map((entry) => entry.code),
      [
        "manifest_read_policy_legacy",
        "manifest_never_default_child_conflict",
        "manifest_never_default_child_conflict",
        "manifest_read_policy_legacy",
        "context_file_unregistered",
      ],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("legacy diagnostics preserve the established default footprint", async () => {
  const neverPath = "project_context/areas/main/never.md";
  const root = await createCatalogProject(neverPath);
  try {
    const catalog = await loadContextCatalog(root);
    const publicFootprint = await inspectDefaultContextFootprint(root);
    assert.deepEqual(
      publicFootprint.files.map((entry) => entry.path),
      [...catalog.default_footprint.keys()],
    );
    assert.ok(
      catalog.diagnostics.every(
        (entry) =>
          entry.code !== "manifest_read_policy_legacy" ||
          entry.severity === "warning",
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("TypeScript and portable Python consume the same Context rule contract", async () => {
  const neverPath = "project_context/areas/main/never.md";
  const root = await createCatalogProject(neverPath);
  try {
    const report = await runValidator(root, "validate-context");
    assert.deepEqual(report.errors, []);
    const warnings = report.warnings?.join("\n") ?? "";
    assert.match(warnings, /uses legacy read_policy always/u);
    assert.match(warnings, /uses legacy read_policy never-default/u);
    assert.match(warnings, /default_children selects .*never\.md/u);
    assert.match(warnings, /unregistered Context Markdown file/u);

    const portable = runPortableValidator(root);
    assert.equal(portable.status, 0, portable.stderr);
    assert.match(portable.stderr, /uses legacy read_policy always/u);
    assert.match(portable.stderr, /uses legacy read_policy never-default/u);
    assert.match(portable.stderr, /default_children selects .*never\.md/u);
    assert.match(portable.stderr, /unregistered Context Markdown file/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("managed, package and source-workspace portable rules stay byte-identical", async () => {
  const paths = [
    ".codex/ty-context-managed/minimal_tools/context_rules.json",
    "packages/ty-context/assets/tools/context_rules.json",
    "tools/context_rules.json",
  ];
  const contents = await Promise.all(
    paths.map((entry) => readFile(path.join(repository, entry), "utf8")),
  );
  assert.equal(contents[1], contents[0]);
  assert.equal(contents[2], contents[0]);
});

test("Catalog public projections are canonical across override insertion order and UTF-8 comparator traps", async () => {
  const root = await createCatalogProject(
    "project_context/areas/main/never.md",
  );
  const expected = [
    "project_context/areas/main/A.md",
    "project_context/areas/main/Café.md",
    "project_context/areas/main/a.md",
    "project_context/areas/main/Å.md",
    "project_context/areas/main/ä.md",
    "project_context/areas/main/中文.md",
    "project_context/areas/main/\uE000.md",
    "project_context/areas/main/\u{10000}.md",
  ];
  const shuffled = [
    expected[6],
    expected[3],
    expected[5],
    expected[0],
    expected[4],
    expected[2],
    expected[1],
    expected[7],
  ];
  const forward = new Map(
    shuffled.map((relative) => [relative, Buffer.from("# Virtual\n", "utf8")]),
  );
  const reverse = new Map([...forward].reverse());
  try {
    const first = await loadContextCatalog(root, {
      file_overrides: forward,
    });
    const second = await loadContextCatalog(root, {
      file_overrides: reverse,
    });
    const select = (catalog) => ({
      areas: catalog.areas.map(({ id, root: areaRoot, context }) => [
        id,
        areaRoot,
        context,
      ]),
      registered: catalog.registered_contexts.map((entry) => [
        entry.path,
        entry.role,
        entry.read_policy ?? null,
        entry.context?.triggers ?? [],
      ]),
      files: catalog.unregistered_context_files
        .map((entry) => entry.path)
        .filter((relative) => expected.includes(relative)),
      default_footprint: [...catalog.default_footprint].map(
        ([relative, reasons]) => [relative, [...reasons]],
      ),
      role_keys: [...catalog.roles_by_path.keys()],
      read_policy_keys: [...catalog.read_policies_by_path.keys()],
      diagnostics: catalog.diagnostics
        .filter(
          (entry) =>
            entry.code === "context_file_unregistered" &&
            expected.includes(entry.path),
        )
        .map(({ severity, path: diagnosticPath, line, code, message }) => [
          severity,
          diagnosticPath ?? null,
          line ?? null,
          code,
          message,
        ]),
    });
    assert.deepEqual(select(first).files, expected);
    assert.deepEqual(
      select(first).diagnostics.map((entry) => entry[1]),
      expected,
    );
    assert.deepEqual(select(second), select(first));
    assert.ok(
      compareUtf8Paths(
        "project_context/areas/main/\uE000.md",
        "project_context/areas/main/\u{10000}.md",
      ) < 0,
    );
    assert.deepEqual(
      ["\uE000", "\u{10000}"].sort(),
      ["\u{10000}", "\uE000"],
      "the trap must distinguish UTF-8 byte order from default UTF-16 sort",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Catalog rejects NFC-equivalent discovery and Manifest aliases without overwriting a key", async () => {
  const decomposed = "project_context/areas/main/Cafe\u0301.md";
  const composed = "project_context/areas/main/Café.md";
  const manifest = `${baseManifest()}

[[context]]
path = "${decomposed}"
role = "contract"
read_policy = "on-demand"

[[context]]
path = "${composed}"
role = "contract"
read_policy = "on-demand"
`;
  const root = await createContextProject({ manifest });
  const aliases = new Map([
    [decomposed, Buffer.from("# Decomposed\n\nA durable contract.\n")],
    [composed, Buffer.from("# Composed\n\nA durable contract.\n")],
  ]);
  try {
    const first = await loadContextCatalog(root, { file_overrides: aliases });
    const second = await loadContextCatalog(root, {
      file_overrides: new Map([...aliases].reverse()),
    });
    const collisionCodes = (catalog) =>
      catalog.diagnostics
        .filter((entry) => entry.code.includes("unicode_collision"))
        .map((entry) => [entry.code, entry.path, entry.message]);
    assert.deepEqual(collisionCodes(second), collisionCodes(first));
    assert.deepEqual(
      collisionCodes(first).map((entry) => entry[0]),
      [
        "context_override_path_unicode_collision",
        "manifest_context_path_unicode_collision",
      ],
    );
    assert.ok(
      first.diagnostics.some(
        (entry) =>
          entry.severity === "error" &&
          entry.path === composed &&
          entry.message.includes(decomposed) &&
          entry.message.includes(composed),
      ),
    );
    assert.equal(
      first.context_files.filter((entry) => entry.path === composed).length,
      1,
      "invalid aliases may not silently replace one another in the public key set",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Catalog public read-model order is independent of Manifest table and nested trigger order", async () => {
  const areaTables = [
    `[[areas]]
id = "main"
root = "."
context = "project_context/areas/main.md"
kind = "repository"
default = true
`,
    `[[areas]]
id = "client"
root = "apps/client"
context = "project_context/areas/client.md"
kind = "app"
default = false
`,
  ];
  const contextTables = [
    `[[context]]
path = "project_context/areas/main/z.md"
role = "contract"
read_policy = "on-demand"
triggers = ["Zulu", "Alpha"]
`,
    `[[context]]
path = "project_context/areas/main/a.md"
role = "contract"
read_policy = "default"
triggers = ["Beta", "Alpha"]
`,
  ];
  const manifests = [
    [...areaTables, ...contextTables].join("\n"),
    [
      ...[...areaTables].reverse(),
      ...[...contextTables]
        .reverse()
        .map((table) =>
          table.replace(
            /triggers = \[(.*?)\]/u,
            (_match, values) =>
              `triggers = [${values.split(", ").reverse().join(", ")}]`,
          ),
        ),
    ].join("\n"),
  ];
  const roots = await Promise.all(
    manifests.map((manifest) =>
      createContextProject({
        manifest,
        extraFiles: {
          "apps/client/.gitkeep": "",
          "project_context/areas/client.md": areaContext("client"),
          "project_context/areas/main/a.md": contractContext("a"),
          "project_context/areas/main/z.md": contractContext("z"),
        },
      }),
    ),
  );
  try {
    const catalogs = await Promise.all(
      roots.map((root) => loadContextCatalog(root)),
    );
    const project = (catalog) => ({
      areas: catalog.areas.map(({ id, root, context }) => [id, root, context]),
      registered: catalog.registered_contexts.map((entry) => [
        entry.path,
        entry.role,
        entry.read_policy ?? null,
        entry.context?.triggers ?? [],
      ]),
      defaults: [...catalog.default_footprint].map(([relative, reasons]) => [
        relative,
        [...reasons],
      ]),
      roles: [...catalog.roles_by_path],
      policies: [...catalog.read_policies_by_path],
    });
    assert.deepEqual(project(catalogs[1]), project(catalogs[0]));
  } finally {
    await Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    );
  }
});

test("Catalog diagnostic tuple is severity, canonical path, line, code, then message", () => {
  const values = [
    {
      severity: "warning",
      path: "project_context/ä.md",
      line: 1,
      code: "b",
      message: "b",
    },
    {
      severity: "error",
      path: "project_context/\u{10000}.md",
      line: 1,
      code: "a",
      message: "a",
    },
    {
      severity: "error",
      path: "project_context/\uE000.md",
      line: 2,
      code: "b",
      message: "a",
    },
    {
      severity: "error",
      path: "project_context/\uE000.md",
      code: "z",
      message: "z",
    },
    {
      severity: "error",
      path: "project_context/\uE000.md",
      line: 2,
      code: "a",
      message: "z",
    },
    {
      severity: "error",
      path: "project_context/\uE000.md",
      line: 2,
      code: "a",
      message: "a",
    },
  ];
  assert.deepEqual(
    sortCatalogDiagnostics([...values].reverse()).map(
      ({ severity, path: diagnosticPath, line, code, message }) => [
        severity,
        diagnosticPath,
        line ?? null,
        code,
        message,
      ],
    ),
    [
      ["error", "project_context/\uE000.md", null, "z", "z"],
      ["error", "project_context/\uE000.md", 2, "a", "a"],
      ["error", "project_context/\uE000.md", 2, "a", "z"],
      ["error", "project_context/\uE000.md", 2, "b", "a"],
      ["error", "project_context/\u{10000}.md", 1, "a", "a"],
      ["warning", "project_context/ä.md", 1, "b", "b"],
    ],
  );
});

test("Catalog fails closed when distinct raw Area ids collapse to one NFC public id", async () => {
  const decomposedId = "Cafe\u0301";
  const composedId = "Café";
  const manifest = `[[areas]]
id = "${decomposedId}"
root = "."
context = "project_context/areas/main.md"
kind = "repository"
default = true

[[areas]]
id = "${composedId}"
root = "apps/client"
context = "project_context/areas/client.md"
kind = "app"
default = false
`;
  const root = await createContextProject({
    manifest,
    extraFiles: {
      "apps/client/.gitkeep": "",
      "project_context/areas/client.md": areaContext("client"),
    },
  });
  try {
    const catalog = await loadContextCatalog(root);
    const collision = catalog.diagnostics.find(
      (entry) => entry.code === "manifest_area_id_unicode_collision",
    );
    assert.ok(collision);
    assert.equal(collision.severity, "error");
    assert.match(collision.message, /Café, Café/u);
    assert.deepEqual(
      catalog.areas.map((area) => area.id),
      [composedId, composedId],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Catalog rejects case-fold-equivalent Manifest paths and virtual overrides", async () => {
  const upper = "project_context/areas/main/A.md";
  const lower = "project_context/areas/main/a.md";
  const manifest = `${baseManifest()}

[[context]]
path = "${upper}"
role = "contract"
read_policy = "on-demand"

[[context]]
path = "${lower}"
role = "contract"
read_policy = "on-demand"
`;
  const root = await createContextProject({ manifest });
  const overrides = new Map([
    [upper, Buffer.from("# Upper\n\nA durable contract.\n")],
    [lower, Buffer.from("# Lower\n\nA durable contract.\n")],
  ]);
  try {
    const first = await loadContextCatalog(root, { file_overrides: overrides });
    const second = await loadContextCatalog(root, {
      file_overrides: new Map([...overrides].reverse()),
    });
    const collisions = (catalog) =>
      catalog.diagnostics
        .filter((entry) => entry.code.includes("case_collision"))
        .map((entry) => [entry.code, entry.path, entry.message]);
    assert.deepEqual(collisions(second), collisions(first));
    assert.deepEqual(
      collisions(first).map((entry) => entry[0]),
      ["context_path_case_collision", "manifest_context_path_case_collision"],
    );
    assert.ok(
      collisions(first).every(
        (entry) => entry[2].includes(upper) && entry[2].includes(lower),
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test(
  "Catalog rejects physical A.md/a.md aliases on a case-sensitive Linux filesystem",
  { skip: process.platform !== "linux" },
  async () => {
    const root = await createCatalogProject(
      "project_context/areas/main/never.md",
    );
    const upper = "project_context/areas/main/A.md";
    const lower = "project_context/areas/main/a.md";
    try {
      await writeFile(
        path.join(root, ...upper.split("/")),
        "# Upper\n\nA durable physical Context.\n",
      );
      await writeFile(
        path.join(root, ...lower.split("/")),
        "# Lower\n\nA durable physical Context.\n",
      );
      const catalog = await loadContextCatalog(root);
      const collision = catalog.diagnostics.find(
        (entry) => entry.code === "context_path_case_collision",
      );
      assert.ok(collision);
      assert.equal(collision.severity, "error");
      assert.ok(collision.message.includes(upper));
      assert.ok(collision.message.includes(lower));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);

async function createCatalogProject(neverPath) {
  const manifest = `${baseManifest().replace(
    'triggers = ["test"]',
    `triggers = ["test", "test"]\ndefault_children = ["${neverPath}", "${neverPath}"]`,
  )}

[[context]]
path = "project_context/areas/main/always.md"
role = "contract"
read_policy = "always"
triggers = ["legacy", "legacy"]

[[context]]
path = "${neverPath}"
role = "contract"
read_policy = "never-default"
`;
  return createContextProject({
    manifest,
    extraFiles: {
      "project_context/areas/main/always.md": contractContext("always"),
      [neverPath]: contractContext("never-default"),
      "project_context/areas/main/unregistered.md": areaContext("unregistered"),
    },
  });
}

function contractContext(name) {
  return `# ${name} Contract

## Constraint
- Consumers must preserve the durable ${name} contract boundary.
`;
}

function runPortableValidator(cwd) {
  const script = path.join(repository, "tools", "validate_context.py");
  const commands =
    process.platform === "win32"
      ? ["python", "python3"]
      : ["python3", "python"];
  for (const command of commands) {
    const result = spawnSync(command, [script], {
      cwd,
      encoding: "utf8",
      windowsHide: true,
    });
    if (!result.error || result.error.code !== "ENOENT") return result;
  }
  throw new Error("portable_python_unavailable");
}

async function snapshotTree(root) {
  const values = [];
  await visit(root, "", values);
  return values;
}

async function visit(root, relative, values) {
  const absolute = relative ? path.join(root, relative) : root;
  const entries = await readdir(absolute, { withFileTypes: true });
  entries.sort((left, right) => compareUtf8Paths(left.name, right.name));
  for (const entry of entries) {
    const child = relative ? path.join(relative, entry.name) : entry.name;
    if (entry.isDirectory()) {
      await visit(root, child, values);
    } else if (entry.isFile()) {
      const content = await readFile(path.join(root, child));
      values.push([
        child.split(path.sep).join("/"),
        createHash("sha256").update(content).digest("hex"),
      ]);
    }
  }
}
