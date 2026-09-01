import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { npmCommandSpec } from "../../tools/npm_command_spec.mjs";
import { parsePackJson } from "../../tools/release_publish_helpers.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const scriptPath = path.join(repoRoot, "tools/quickstart_smoke.mjs");
const sourcePreviewScriptPath = path.join(
  repoRoot,
  "tools/source_preview_pack.mjs",
);
const outDir = await mkdtemp(
  path.join(tmpdir(), "ty-context-quickstart-smoke-test-"),
);
const sourcePreviewOutDir = await mkdtemp(
  path.join(tmpdir(), "ty-context-source-preview-pack-test-"),
);
const packlistFixture = await mkdtemp(
  path.join(tmpdir(), "ty-context-package-ignore-test-"),
);
const packageManifest = JSON.parse(
  await readFile(
    path.join(repoRoot, "packages", "ty-context", "package.json"),
    "utf8",
  ),
);

try {
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--out-dir", outDir, "--pack-ignore-scripts"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 120_000,
    },
  );

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Quickstart smoke passed/);
  assert.match(result.stdout, /Generated recovery surface/);

  const demoRoot = path.join(outDir, "repo");
  await stat(path.join(demoRoot, "AGENTS.md"));
  await stat(path.join(demoRoot, "project_context/global.md"));
  await stat(path.join(demoRoot, "project_context/architecture.md"));
  await stat(path.join(demoRoot, ".github/workflows/harness.yml"));

  const report = JSON.parse(
    await readFile(path.join(outDir, "quickstart-smoke-report.json"), "utf8"),
  );
  assert.equal(report.status, "passed");
  assert.ok(report.generatedFiles.includes("AGENTS.md"));
  assert.ok(report.generatedFiles.includes("project_context/context.toml"));
  assert.equal(report.designAuthority.mode, "legacy");
  assert.match(report.designAuthority.closureDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.equal(report.authorityDeltaAssessment, "validated-read-only");

  const sourcePreviewResult = spawnSync(
    process.execPath,
    [
      sourcePreviewScriptPath,
      "--out-dir",
      sourcePreviewOutDir,
      "--pack-ignore-scripts",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      timeout: 120_000,
    },
  );

  assert.equal(
    sourcePreviewResult.status,
    0,
    `${sourcePreviewResult.stdout}\n${sourcePreviewResult.stderr}`,
  );
  assert.match(sourcePreviewResult.stdout, /Source preview package ready/);
  assert.match(
    sourcePreviewResult.stdout,
    /npx --no-install ty-context init --adopt/,
  );

  const previewReport = JSON.parse(
    await readFile(
      path.join(sourcePreviewOutDir, "source-preview-report.json"),
      "utf8",
    ),
  );
  assert.equal(previewReport.status, "packed");
  assert.equal(
    previewReport.package,
    `project-tiny-context-harness@${packageManifest.version}`,
  );
  assert.ok(
    previewReport.tarballPath.endsWith(
      `project-tiny-context-harness-${packageManifest.version}.tgz`,
    ),
  );
  await stat(previewReport.tarballPath);

  const fixtureTools = path.join(
    packlistFixture,
    "assets",
    "tools",
    "__pycache__",
  );
  await mkdir(fixtureTools, { recursive: true });
  await writeFile(
    path.join(packlistFixture, "package.json"),
    `${JSON.stringify(
      {
        name: "ty-context-package-ignore-fixture",
        version: "1.0.0",
        files: ["assets"],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    path.join(packlistFixture, "assets", ".npmignore"),
    await readFile(
      path.join(repoRoot, "packages", "ty-context", "assets", ".npmignore"),
      "utf8",
    ),
    "utf8",
  );
  await writeFile(
    path.join(packlistFixture, "assets", "tools", "validate_context.py"),
    "print('ok')\n",
    "utf8",
  );
  await writeFile(
    path.join(fixtureTools, "validate_context.cpython-310.pyc"),
    "runtime cache",
    "utf8",
  );
  await writeFile(
    path.join(packlistFixture, "assets", "tools", "validate_context.pyo"),
    "runtime cache",
    "utf8",
  );
  const packSpec = npmCommandSpec([
    "pack",
    "--dry-run",
    "--json",
    "--ignore-scripts",
  ]);
  const packResult = spawnSync(packSpec.command, packSpec.args, {
    cwd: packlistFixture,
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true,
  });
  assert.ifError(packResult.error);
  assert.equal(packResult.status, 0, packResult.stderr || packResult.stdout);
  const pack = parsePackJson(packResult.stdout);
  assert.ok(Array.isArray(pack.files), "npm pack result must include files");
  const packedFiles = pack.files.map((entry) => entry.path);
  assert.ok(packedFiles.includes("assets/tools/validate_context.py"));
  assert.equal(
    packedFiles.some(
      (file) => file.includes("/__pycache__/") || /\.(?:pyc|pyo)$/iu.test(file),
    ),
    false,
  );
} finally {
  await rm(outDir, { recursive: true, force: true });
  await rm(sourcePreviewOutDir, { recursive: true, force: true });
  await rm(packlistFixture, { recursive: true, force: true });
}

test("top-level script assertions completed", () => {});
