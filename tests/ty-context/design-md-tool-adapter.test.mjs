import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { designMdToolAdapter } from "../../packages/ty-context/dist/lib/design-md-tool-adapter.js";

const toolEntry = fileURLToPath(import.meta.resolve("@google/design.md"));
const validDesign = `---
version: "alpha"
name: "Adapter Fixture"
description: "A deterministic local-tool fixture."
colors:
  primary: "#112233"
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
    rounded: "{rounded.sm}"
---

## Overview

The fixture exists only to prove local tool compatibility.

## Colors

Use the primary pair for the button.

## Typography

Use the body token for ordinary text.

## Components

The button consumes the declared color pair.
`;

const brokenReferenceDesign = `---
name: "Broken Reference"
components:
  button:
    backgroundColor: "{colors.missing}"
---
`;

test("DesignMdToolAdapter reports the actual installed local tool identity", async () => {
  const packageJson = JSON.parse(
    await readFile(
      path.resolve(path.dirname(toolEntry), "../package.json"),
      "utf8",
    ),
  );

  assert.deepEqual(designMdToolAdapter.identity(), {
    package_name: "@google/design.md",
    package_version: packageJson.version,
    api_surface: "@google/design.md/linter",
  });
});

test("DesignMdToolAdapter isolates parse and lint output behind stable JSON-ready shapes", () => {
  const parsed = designMdToolAdapter.parseValidate(validDesign);
  const linted = designMdToolAdapter.lint(validDesign);

  assert.equal(parsed.mode, "parse-validate");
  assert.equal(parsed.valid, true);
  assert.deepEqual(Object.keys(parsed.design_system?.colors ?? {}), [
    "on-primary",
    "primary",
  ]);
  assert.equal(linted.mode, "lint");
  assert.equal(linted.valid, true);
  assert.equal(linted.summary.errors, 0);
  assert.doesNotThrow(() => JSON.stringify(linted));

  const malformed = designMdToolAdapter.parseValidate(
    "---\ncolors:\n  broken: [\n---\n",
  );
  assert.equal(malformed.valid, true);
  assert.equal(malformed.summary.warnings, 1);
  assert.match(malformed.findings[0]?.message ?? "", /end with a \]/u);

  const brokenReference = designMdToolAdapter.lint(brokenReferenceDesign);
  assert.equal(brokenReference.valid, false);
  assert.equal(brokenReference.summary.errors, 1);
  assert.match(brokenReference.findings[0]?.message ?? "", /does not resolve/u);
});

test("DesignMdToolAdapter lint and local exports match the installed CLI semantics", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "design-md-adapter-"));
  try {
    const designPath = path.join(root, "DESIGN.md");
    await writeFile(designPath, validDesign, "utf8");

    const cliLint = runTool(["lint", designPath]);
    assert.equal(cliLint.status, 0, cliLint.stderr);
    const linted = designMdToolAdapter.lint(validDesign);
    assert.deepEqual(
      { findings: linted.findings, summary: linted.summary },
      JSON.parse(cliLint.stdout),
    );

    const cliExport = runTool(["export", "--format", "dtcg", designPath]);
    assert.equal(cliExport.status, 0, cliExport.stderr);
    const exported = designMdToolAdapter.exportTokens(validDesign, "dtcg");
    assert.equal(exported.success, true);
    assert.deepEqual(
      JSON.parse(exported.content),
      JSON.parse(cliExport.stdout),
    );

    const cssFirst = designMdToolAdapter.exportTokens(
      validDesign,
      "css-tailwind",
    );
    const cssSecond = designMdToolAdapter.exportTokens(
      validDesign,
      "css-tailwind",
    );
    assert.equal(cssFirst.success, true);
    assert.deepEqual(cssSecond, cssFirst);

    const cliCssVars = runTool([
      "export",
      "--format",
      "css-vars",
      "--prefix",
      "app",
      designPath,
    ]);
    assert.equal(cliCssVars.status, 0, cliCssVars.stderr);
    const cssVars = designMdToolAdapter.exportTokens(validDesign, "css-vars", {
      css_variable_prefix: "app",
    });
    assert.equal(cssVars.success, true);
    assert.equal(cssVars.content, `${cliCssVars.stdout.trimEnd()}\n`);
    assert.doesNotMatch(cssVars.content, /\r|\n\n$/u);

    const misplacedPrefix = designMdToolAdapter.exportTokens(
      validDesign,
      "dtcg",
      { css_variable_prefix: "app" },
    );
    assert.equal(misplacedPrefix.success, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("DesignMdToolAdapter diff matches installed CLI token and regression semantics", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "design-md-adapter-"));
  try {
    const beforePath = path.join(root, "before.md");
    const afterPath = path.join(root, "after.md");
    const afterDesign = validDesign.replace("#112233", "#223344");
    await writeFile(beforePath, validDesign, "utf8");
    await writeFile(afterPath, afterDesign, "utf8");

    const cli = runTool(["diff", beforePath, afterPath]);
    assert.equal(cli.status, 0, cli.stderr);
    const cliDiff = JSON.parse(cli.stdout);
    const adapted = designMdToolAdapter.diff(validDesign, afterDesign);

    assert.equal(adapted.success, true);
    assert.deepEqual(adapted.tokens, normalizeCliTokens(cliDiff.tokens));
    assert.deepEqual(adapted.findings, cliDiff.findings);
    assert.equal(adapted.regression, cliDiff.regression);

    const brokenPath = path.join(root, "broken.md");
    await writeFile(brokenPath, brokenReferenceDesign, "utf8");
    const brokenCli = runTool(["diff", beforePath, brokenPath]);
    assert.equal(brokenCli.status, 1, brokenCli.stderr);
    const brokenAdapted = designMdToolAdapter.diff(
      validDesign,
      brokenReferenceDesign,
    );
    assert.equal(brokenAdapted.success, true);
    assert.equal(brokenAdapted.regression, true);
    assert.deepEqual(
      brokenAdapted.tokens,
      normalizeCliTokens(JSON.parse(brokenCli.stdout).tokens),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function runTool(argv) {
  return spawnSync(process.execPath, [toolEntry, ...argv], {
    encoding: "utf8",
    windowsHide: true,
  });
}

function normalizeCliTokens(tokens) {
  return Object.fromEntries(
    Object.entries(tokens).map(([category, changes]) => [
      category,
      {
        added: [...changes.added].sort(),
        removed: [...changes.removed].sort(),
        modified: [...changes.modified].sort(),
      },
    ]),
  );
}
