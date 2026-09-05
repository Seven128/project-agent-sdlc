import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

<!-- ty-context-design-authority-format: bundle-v1 -->

# Design System

See [button](design_system/components/button.md).
`;

export const LEGACY_DESIGN = DESIGN.replace(
  "<!-- ty-context-design-authority-format: bundle-v1 -->\n\n",
  "",
);

export const BUTTON = `# Button

The button uses the project Token source.
`;

export const SHOWCASE_MARKER =
  '<!-- ty-context-design-showcase path="docs/design-system-showcase/showcase.manifest.json" -->';
export const SHOWCASE_MANIFEST_PATH =
  "docs/design-system-showcase/showcase.manifest.json";
export const SHOWCASE_HTML_PATH = "docs/design-system-showcase/index.html";
export const SHOWCASE_COVERAGE = [
  "identity",
  "color",
  "typography",
  "layout-spacing-density",
  "container-grammar",
  "icons-assets",
  "component-catalog",
  "component-contracts",
  "relationship-contracts",
  "interaction-accessibility",
  "motion",
  "adaptation",
  "implementation-provenance",
  "supplemental-validation",
];

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

export async function createShowcase(repository, options = {}) {
  const currentEntry = await readFile(path.join(repository, "DESIGN.md"), "utf8");
  if (!currentEntry.includes(SHOWCASE_MARKER))
    await writeFile(
      path.join(repository, "DESIGN.md"),
      currentEntry.replace(
        "# Design System",
        `${SHOWCASE_MARKER}\n\n# Design System`,
      ),
      "utf8",
    );
  const closure = await refreshClaim(repository);
  assert.equal(closure.status, "valid", JSON.stringify(closure.diagnostics));
  assert.ok(closure.identity);
  const assets = options.assets ?? [];
  for (const asset of assets) {
    const target = path.join(repository, ...asset.path.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, asset.content);
  }
  const html = showcaseHtml(
    closure.identity.closure_digest,
    options.html_fragment ?? "",
  );
  await mkdir(path.join(repository, "docs/design-system-showcase"), {
    recursive: true,
  });
  await writeFile(path.join(repository, SHOWCASE_HTML_PATH), html, "utf8");
  const manifest = showcaseManifest(closure.identity, html, assets);
  await writeShowcaseManifest(repository, manifest);
  return inspectDesignAuthorityClosure(repository);
}

export function showcaseManifest(identity, html, assets = []) {
  return {
    schema_version: "design-authority-showcase-v1",
    artifact_category: "design_system_handbook",
    authority: {
      entry_path: "DESIGN.md",
      closure_digest: identity.closure_digest,
      revision: identity.revision,
    },
    status: "adopted",
    html: { path: SHOWCASE_HTML_PATH, sha256: digest(Buffer.from(html)) },
    assets: assets.map((asset) => ({
      path: asset.path,
      sha256: digest(Buffer.from(asset.content)),
    })),
    coverage: SHOWCASE_COVERAGE.map((key) => ({
      key,
      disposition: "rendered",
      anchor: `section-${key}`,
    })),
    token_families: [{ key: "core", anchor: "token-core" }],
    components: [{ key: "button", anchor: "component-button" }],
    target_conditions: [
      {
        target_key: "account-overview",
        condition_key: "wide-default",
        anchor: "target-account-overview-wide-default",
      },
    ],
    external_network_dependencies: [],
  };
}

export function showcaseHtml(authorityDigest, fragment = "") {
  const sections = SHOWCASE_COVERAGE.map((key) => {
    const indexed =
      key === "color"
        ? '<div id="token-core" data-ty-showcase-token-family="core">Core tokens</div>'
        : key === "component-catalog"
          ? '<article id="component-button" data-ty-showcase-component="button">Button</article>'
          : key === "supplemental-validation"
            ? '<article id="target-account-overview-wide-default" data-ty-showcase-target="account-overview" data-ty-showcase-condition="wide-default">Account overview scenario</article>'
            : "";
    const extra = key === "icons-assets" ? fragment : "";
    return `<section id="section-${key}" data-ty-showcase-section="${key}"><h2>${key}</h2>${indexed}${extra}</section>`;
  }).join("\n");
  return `<!doctype html>
<html lang="en" data-ty-showcase-artifact="design_system_handbook" data-ty-showcase-status="adopted" data-ty-showcase-authority-digest="${authorityDigest}">
<head><meta charset="utf-8"><title>Design system handbook</title><style>body { color: #112233; }</style></head>
<body><main>${sections}</main></body>
</html>
`;
}

export async function writeShowcaseManifest(repository, manifest) {
  await mkdir(path.join(repository, "docs/design-system-showcase"), {
    recursive: true,
  });
  await writeFile(
    path.join(repository, SHOWCASE_MANIFEST_PATH),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

export async function readShowcaseManifest(repository) {
  return JSON.parse(
    await readFile(path.join(repository, SHOWCASE_MANIFEST_PATH), "utf8"),
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

export function digest(content) {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}
