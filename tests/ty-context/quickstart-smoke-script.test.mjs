import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
} finally {
  await rm(outDir, { recursive: true, force: true });
  await rm(sourcePreviewOutDir, { recursive: true, force: true });
}
