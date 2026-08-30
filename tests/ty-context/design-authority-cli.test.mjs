import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runDoctor } from "../../packages/ty-context/dist/lib/doctor.js";
import { runInit } from "../../packages/ty-context/dist/lib/init.js";

const cli = fileURLToPath(
  new URL("../../packages/ty-context/dist/cli.js", import.meta.url),
);

const DESIGN = `---
version: "cli-v1"
name: "CLI Fixture"
description: "Read-only Design Authority inspection."
colors:
  primary: "#123456"
  on-primary: "#FFFFFF"
typography:
  body:
    fontFamily: "system-ui"
    fontSize: "1rem"
    fontWeight: 400
rounded:
  sm: 4px
spacing:
  sm: 8px
components:
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
---

# Design System

The fixture has no subordinate bundle.
`;
const BUNDLE_DESIGN = DESIGN.replace(
  "# Design System",
  "<!-- ty-context-design-authority-format: bundle-v1 -->\n\n# Design System",
);

test("design-authority inspect and tokens are deterministic read-only commands", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "ty-design-cli-"));
  try {
    await writeFile(
      path.join(repository, "DESIGN.md"),
      DESIGN,
      "utf8",
    );
    const before = await readdir(repository);
    const first = run(repository, ["design-authority", "inspect", "--json"]);
    const second = run(repository, [
      "design-authority",
      "inspect",
      "--format",
      "json",
    ]);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(second.stdout, first.stdout);
    const parsed = JSON.parse(first.stdout);
    assert.equal(parsed.status, "valid");
    assert.equal(parsed.mode, "legacy");
    assert.equal(parsed.identity.revision, "cli-v1");
    assert.equal(parsed.identity.manifest_path, null);
    assert.equal(parsed.members.length, 1);
    assert.equal("timestamp" in parsed, false);

    const tokens = run(repository, ["design-authority", "tokens"]);
    assert.equal(tokens.status, 0, tokens.stderr);
    const projected = JSON.parse(tokens.stdout);
    assert.equal(
      projected.$schema,
      "https://www.designtokens.org/schemas/2025.10/format.json",
    );
    assert.match(tokens.stdout, /"\$value"/u);
    assert.deepEqual(await readdir(repository), before);
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test("explicit inspection returns catalog exit 3 for an invalid claimed bundle", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "ty-design-cli-"));
  try {
    await writeFile(
      path.join(repository, "DESIGN.md"),
      BUNDLE_DESIGN,
      "utf8",
    );
    await mkdir(path.join(repository, "design_system"));
    await writeFile(
      path.join(repository, "design_system/authority.manifest.json"),
      JSON.stringify({
        schema_version: 1,
        entry: "DESIGN.md",
        authority_files: [],
        generated_files: [],
        closure_digest: `sha256:${"0".repeat(64)}`,
      }),
      "utf8",
    );
    const result = run(repository, ["design-authority", "inspect", "--json"]);
    assert.equal(result.status, 3, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.status, "invalid");
    assert.equal(
      parsed.diagnostics.some(
        (item) => item.code === "design_authority_closure_digest_mismatch",
      ),
      true,
    );
    const tokens = run(repository, ["design-authority", "tokens"]);
    assert.equal(tokens.status, 3);
    assert.match(tokens.stderr, /closure_digest_mismatch/u);
    const fromEntry = run(repository, [
      "design-authority",
      "tokens",
      "--from-entry",
    ]);
    assert.equal(fromEntry.status, 0, fromEntry.stderr);
    assert.equal(
      JSON.parse(fromEntry.stdout).$schema,
      "https://www.designtokens.org/schemas/2025.10/format.json",
    );
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test("Doctor reports an invalid manifest closure as a structural error", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "ty-design-doctor-"));
  try {
    await runInit(repository, { adopt: false, force: false });
    await writeFile(
      path.join(repository, "DESIGN.md"),
      BUNDLE_DESIGN,
      "utf8",
    );
    await mkdir(path.join(repository, "design_system"));
    await writeFile(
      path.join(repository, "design_system/authority.manifest.json"),
      JSON.stringify({
        schema_version: 1,
        entry: "DESIGN.md",
        authority_files: [],
        generated_files: [],
        closure_digest: `sha256:${"0".repeat(64)}`,
      }),
      "utf8",
    );
    const report = await runDoctor(repository);
    assert.equal(
      report.errors.some((line) =>
        line.includes("design_authority_closure_digest_mismatch"),
      ),
      true,
    );
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test("Doctor reports an orphan bundle manifest as a structural error", async () => {
  const repository = await mkdtemp(path.join(os.tmpdir(), "ty-design-doctor-"));
  try {
    await runInit(repository, { adopt: false, force: false });
    await rm(path.join(repository, "DESIGN.md"));
    await mkdir(path.join(repository, "design_system"));
    await writeFile(
      path.join(repository, "design_system/authority.manifest.json"),
      "{}\n",
      "utf8",
    );
    const report = await runDoctor(repository);
    assert.equal(
      report.errors.some((line) => line.includes("bundle_entry_missing")),
      true,
      JSON.stringify(report),
    );
  } finally {
    await rm(repository, { recursive: true, force: true });
  }
});

test("design-authority help states the non-adoption boundary", () => {
  const result = run(process.cwd(), ["design-authority", "help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /read-only/u);
  assert.match(result.stdout, /never[\s\S]*adopt/u);
});

function run(cwd, args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
  });
}
