import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { inspectDesignAuthorityClosure } from "../../packages/ty-context/dist/lib/design-authority-closure.js";
import { projectDesignAuthorityTokens } from "../../packages/ty-context/dist/lib/design-authority-tokens.js";

export const DESIGN = `---
version: "alpha"
name: "Bundle Fixture"
description: "A deterministic authority closure fixture."
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

# Design System

See [button](design_system/components/button.md).
`;

export const BUTTON = `# Button

The button uses the project Token source.
`;

export async function createBundle(repository, options = {}) {
  const eol = options.crlf ? "\r\n" : "\n";
  await mkdir(path.join(repository, "design_system/components"), {
    recursive: true,
  });
  await writeFile(
    path.join(repository, "DESIGN.md"),
    DESIGN.replaceAll("\n", eol),
  );
  await writeFile(
    path.join(repository, "design_system/components/button.md"),
    BUTTON.replaceAll("\n", eol),
  );
  const projected = projectDesignAuthorityTokens(DESIGN);
  assert.equal(projected.success, true);
  await writeFile(
    path.join(repository, "design_system/tokens.json"),
    projected.content,
  );
  await writeManifest(
    repository,
    baseManifest(),
    options.prettyManifest !== false,
  );
  return refreshClaim(repository, options.prettyManifest !== false);
}

export async function refreshClaim(repository, pretty = true) {
  const before = await inspectDesignAuthorityClosure(repository);
  assert.ok(before.identity, JSON.stringify(before.diagnostics));
  await writeManifest(
    repository,
    baseManifest(before.identity.closure_digest),
    pretty,
  );
  return inspectDesignAuthorityClosure(repository);
}

export function baseManifest(digest = `sha256:${"0".repeat(64)}`) {
  return {
    schema_version: 1,
    entry: "DESIGN.md",
    authority_files: [
      { path: "design_system/components/button.md", kind: "component" },
    ],
    generated_files: [
      {
        path: "design_system/tokens.json",
        source: "DESIGN.md#frontmatter.tokens",
      },
    ],
    closure_digest: digest,
  };
}

export async function writeManifest(repository, manifest, pretty = true) {
  await writeFile(
    path.join(repository, "design_system/authority.manifest.json"),
    `${JSON.stringify(manifest, null, pretty ? 2 : 0)}\n`,
    "utf8",
  );
}

export function assertDiagnostic(result, code) {
  assert.equal(
    result.diagnostics.some((item) => item.code === code),
    true,
    JSON.stringify(result.diagnostics),
  );
}

export async function temporaryRepository() {
  return mkdtemp(path.join(os.tmpdir(), "ty-design-authority-"));
}

export async function cleanup(...repositories) {
  for (const repository of repositories)
    await rm(repository, { recursive: true, force: true });
}
