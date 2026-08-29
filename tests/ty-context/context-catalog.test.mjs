import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inspectDefaultContextFootprint } from "../../packages/ty-context/dist/lib/context-default-footprint.js";
import { loadContextCatalog } from "../../packages/ty-context/dist/lib/context-catalog/catalog-load.js";
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
        "project_context/areas/main/verification.md",
        "project_context/areas/main/always.md",
        neverPath,
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
        "manifest_read_policy_legacy",
        "manifest_never_default_child_conflict",
        "manifest_never_default_child_conflict",
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
      [...catalog.default_footprint.keys()].sort(),
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
      "project_context/areas/main/unregistered.md":
        areaContext("unregistered"),
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
  const commands = process.platform === "win32" ? ["python", "python3"] : ["python3", "python"];
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
  entries.sort((left, right) => left.name.localeCompare(right.name));
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
