import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { inspectContext } from "../../packages/ty-context/dist/lib/context-inspect/context-inspect.js";
import {
  baseManifest,
  createContextProject,
} from "./context-manifest-fixtures.mjs";

const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages", "ty-context", "dist", "cli.js");

test("context inspect reports owner metadata, default membership, backlinks, stable keys and Router reasons", async () => {
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
      route_task: "修改天气地图",
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
    assert.equal(result.route?.selected, true);
    assert.ok(
      result.route?.candidate?.reasons.some(
        (reason) => reason.kind === "trigger" && reason.input === "天气地图",
      ),
    );

    const missed = await inspectContext({
      project_root: root,
      context_path: target,
      route_task: "unrelated task",
      route_case_sensitive: true,
    });
    assert.equal(missed.route?.selected, false);
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
    assert.equal(result.route, null);
    assert.ok(
      result.diagnostics.some(
        (entry) => entry.code === "context_file_unregistered",
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context inspect uses the Catalog physical identity for an NFD file and emits one stable NFC path", async () => {
  const physicalPath = "project_context/areas/main/Cafe\u0301.md";
  const canonicalPath = physicalPath.normalize("NFC");
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
    assert.equal(JSON.stringify(decomposed), JSON.stringify(canonical));
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
