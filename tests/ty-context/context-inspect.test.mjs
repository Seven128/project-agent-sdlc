import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inspectContext } from "../../packages/ty-context/dist/lib/context-inspect/context-inspect.js";
import { runDoctor } from "../../packages/ty-context/dist/lib/doctor.js";
import {
  baseManifest,
  createContextProject,
} from "./context-manifest-fixtures.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages", "ty-context", "dist", "cli.js");

test("context inspect reports owner metadata, default membership, backlinks and stable keys", async () => {
  const target = "project_context/areas/main/weather.md";
  const manifest = `${baseManifest()}\n[[context]]
path = "${target}"
role = "domain"
read_policy = "on-demand"
read_when = "Read for weather work."
triggers = ["天气地图"]
default_children = ["project_context/areas/main/verification.md"]
`;
  const root = await createContextProject({
    manifest,
    extraFiles: {
      [target]: `# Weather
<!-- ty-context-declare Fact-ID: WEATHER-001 -->
Durable weather map rules.
`,
      "project_context/areas/main/links.md": `[weather](weather.md#rules)
<!-- ty-context-declare Fact-ID: WEATHER-001 -->
`,
    },
  });
  try {
    const result = await inspectContext({
      project_root: root,
      context_path: target,
    });
    assert.equal(result.schema_version, 1);
    assert.equal(result.registration, "registered");
    assert.equal(result.source, "context");
    assert.equal(result.role, "domain");
    assert.equal(result.read_policy, "on-demand");
    assert.equal(result.read_when, "Read for weather work.");
    assert.deepEqual(result.triggers, ["天气地图"]);
    assert.deepEqual(result.default_children, [
      "project_context/areas/main/verification.md",
    ]);
    assert.equal(result.default_footprint.selected, false);
    assert.equal(result.referenced_by.length, 1);
    assert.equal(
      result.referenced_by[0].source_path,
      "project_context/areas/main/links.md",
    );
    assert.equal(result.stable_key_declarations.length, 1);
    assert.equal(result.stable_key_conflicts.length, 1);
    assert.equal("route" in result, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context inspect supports unregistered files and produces byte-stable JSON", async () => {
  const target = "project_context/areas/main/unregistered.md";
  const root = await createContextProject({
    extraFiles: { [target]: "# Unregistered\n" },
  });
  try {
    const args = [cli, "context", "inspect", target, "--json"];
    const first = spawnSync(process.execPath, args, {
      cwd: root,
      encoding: "utf8",
    });
    const second = spawnSync(process.execPath, args, {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.stdout, first.stdout);
    const result = JSON.parse(first.stdout);
    assert.equal(result.registration, "unregistered");
    assert.equal(result.role, null);
    assert.equal("route" in result, false);
    assert.ok(
      result.diagnostics.some(
        (entry) => entry.code === "context_file_unregistered",
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context inspect preserves NFC identity but does not heal physically missing NFD/NFC Markdown destinations", async () => {
  const physicalPath = "project_context/areas/Cafe\u0301/target.md";
  const canonicalPath = physicalPath.normalize("NFC");
  const physicalSource = "project_context/areas/Cafe\u0301/source.md";
  const canonicalSource = physicalSource.normalize("NFC");
  const manifest = `${baseManifest()}
[[context]]
path = "${physicalPath}"
role = "contract"
read_policy = "on-demand"
`;
  const root = await createContextProject({
    manifest,
    extraFiles: {
      [physicalPath]:
        "# Unicode Contract\n\nConsumers must preserve this durable contract.\n",
      [physicalSource]: `# Unicode Links

[inline](./target.md)
[encoded](./target%2Emd)
[root-physical](/${physicalPath})
[repository-physical](${physicalPath})
[root-canonical-missing](/${canonicalPath})
[repository-canonical-missing](${canonicalPath})
[reference][target]

[target]: ./target.md "Target"
<./target.md>
`,
    },
  });
  try {
    const canonical = await inspectContext({
      project_root: root,
      context_path: canonicalPath,
    });
    const decomposed = await inspectContext({
      project_root: root,
      context_path: physicalPath,
    });
    assert.equal(canonical.path, canonicalPath);
    assert.equal(canonical.registration, "registered");
    assert.equal(canonical.role, "contract");
    assert.equal(canonical.referenced_by.length, 6);
    assert.ok(
      canonical.referenced_by.every(
        (reference) =>
          reference.source_path === canonicalSource &&
          reference.target_path === canonicalPath &&
          reference.status === "valid",
      ),
    );
    assert.equal(JSON.stringify(decomposed), JSON.stringify(canonical));
    const source = await inspectContext({
      project_root: root,
      context_path: canonicalSource,
    });
    assert.deepEqual(
      source.references.map((reference) => reference.status),
      [
        "valid",
        "valid",
        "valid",
        "valid",
        "missing",
        "missing",
        "valid",
        "valid",
      ],
    );
    assert.ok(
      source.references.every(
        (reference) => reference.target_path === canonicalPath,
      ),
    );
    const doctor = await runDoctor(root);
    assert.deepEqual(doctor.errors, []);
    assert.equal(
      doctor.warnings.filter(
        (warning) =>
          warning.includes(canonicalSource) && warning.includes("missing"),
      ).length,
      0,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context inspect classifies argument, Catalog and path-safety failures", async () => {
  const root = await createContextProject();
  try {
    const missingArgument = spawnSync(
      process.execPath,
      [cli, "context", "inspect"],
      { cwd: root, encoding: "utf8" },
    );
    const unsafePath = spawnSync(
      process.execPath,
      [cli, "context", "inspect", "../outside.md"],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(missingArgument.status, 2);
    assert.equal(unsafePath.status, 5);

    const invalid = await createContextProject({
      manifest: "[[areas]\ninvalid = true\n",
      extraFiles: {
        "project_context/areas/main/unregistered.md": "# File\n",
      },
    });
    try {
      const catalogError = spawnSync(
        process.execPath,
        [
          cli,
          "context",
          "inspect",
          "project_context/areas/main/unregistered.md",
          "--json",
        ],
        { cwd: invalid, encoding: "utf8" },
      );
      assert.equal(catalogError.status, 3, catalogError.stderr);
      assert.ok(
        JSON.parse(catalogError.stdout).diagnostics.some(
          (entry) => entry.severity === "error",
        ),
      );
    } finally {
      await rm(invalid, { recursive: true, force: true });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
