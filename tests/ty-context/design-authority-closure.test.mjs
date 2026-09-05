import assert from "node:assert/strict";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  inspectDesignAuthorityClosure,
  loadCurrentDesignAuthorityClosure,
} from "../../packages/ty-context/dist/lib/design-authority-closure.js";
import { designAuthorityManifestProjection } from "../../packages/ty-context/dist/lib/design-authority-manifest.js";
import { inspectDesignAuthorityShowcaseCss } from "../../packages/ty-context/dist/lib/design-authority-showcase-css.js";
import {
  BUTTON,
  DESIGN,
  LEGACY_DESIGN,
  SHOWCASE_HTML_PATH,
  SHOWCASE_MARKER,
  assertDiagnostic,
  cleanup,
  createBundle,
  createShowcase,
  digest,
  readShowcaseManifest,
  refreshClaim,
  temporaryRepository,
  writeShowcaseManifest,
} from "./design-authority-closure-fixture.mjs";

const BUNDLE_MARKER = "<!-- ty-context-design-authority-format: bundle-v1 -->";

test("legacy Design Authority identity is deterministic across LF and CRLF", async () => {
  const left = await temporaryRepository();
  const right = await temporaryRepository();
  try {
    await writeFile(path.join(left, "DESIGN.md"), LEGACY_DESIGN, "utf8");
    await writeFile(
      path.join(right, "DESIGN.md"),
      LEGACY_DESIGN.replaceAll("\n", "\r\n"),
      "utf8",
    );
    const a = await inspectDesignAuthorityClosure(left);
    const b = await inspectDesignAuthorityClosure(right);
    assert.equal(a.status, "invalid");
    assert.equal(
      a.diagnostics.some(
        (item) => item.code === "authority_closure_link_unlisted",
      ),
      true,
    );
    assert.equal(a.identity?.closure_digest, b.identity?.closure_digest);

    const clean = LEGACY_DESIGN.replace(
      "See [button](design_system/components/button.md).",
      "No subordinate bundle is declared.",
    );
    await writeFile(path.join(left, "DESIGN.md"), clean, "utf8");
    const valid = await loadCurrentDesignAuthorityClosure(left);
    assert.equal(valid.mode, "legacy");
    assert.equal(valid.identity.manifest_path, null);
    assert.equal(valid.identity.revision, "alpha");
    assert.deepEqual(valid.member_paths, ["DESIGN.md"]);
  } finally {
    await cleanup(left, right);
  }
});

test("bundle marker prevents manifest deletion or rename from becoming legacy", async () => {
  for (const mutation of ["delete", "rename", "empty"]) {
    const repository = await temporaryRepository();
    try {
      await createBundle(repository);
      const manifest = path.join(
        repository,
        "design_system/authority.manifest.json",
      );
      if (mutation === "delete") await rm(manifest);
      else if (mutation === "rename")
        await rename(
          manifest,
          path.join(
            repository,
            "design_system/authority.manifest.renamed.json",
          ),
        );
      else await writeFile(manifest, "", "utf8");

      const inspection = await inspectDesignAuthorityClosure(repository);
      assert.equal(inspection.status, "invalid");
      assert.equal(inspection.identity, null);
      assert.match(
        inspection.diagnostics[0].detail,
        mutation === "empty"
          ? /design_authority_manifest_invalid:json/u
          : /bundle_manifest_missing/u,
      );
      await assert.rejects(
        loadCurrentDesignAuthorityClosure(repository),
        /design_authority_invalid/u,
      );
    } finally {
      await cleanup(repository);
    }
  }
});

test("manifest requires the fixed DESIGN bundle marker", async () => {
  const repository = await temporaryRepository();
  try {
    await createBundle(repository);
    await writeFile(path.join(repository, "DESIGN.md"), LEGACY_DESIGN, "utf8");
    const inspection = await inspectDesignAuthorityClosure(repository);
    assert.equal(inspection.status, "invalid");
    assert.equal(inspection.identity, null);
    assert.match(inspection.diagnostics[0].detail, /bundle_marker_missing/u);
  } finally {
    await cleanup(repository);
  }
});

test("bundle marker grammar is fixed, singular, body-leading and outside examples", async () => {
  const cases = [
    {
      name: "moved",
      design: DESIGN.replace(
        "<!-- ty-context-design-authority-format: bundle-v1 -->\n\n# Design System",
        "# Design System\n\n<!-- ty-context-design-authority-format: bundle-v1 -->",
      ),
      expected: /bundle_marker_misplaced/u,
    },
    {
      name: "duplicate",
      design: DESIGN.replace(
        "# Design System",
        "<!-- ty-context-design-authority-format: bundle-v1 -->\n\n# Design System",
      ),
      expected: /bundle_marker_duplicate/u,
    },
    {
      name: "whitespace",
      design: DESIGN.replace(
        "<!-- ty-context-design-authority-format: bundle-v1 -->",
        " <!-- ty-context-design-authority-format: bundle-v1 -->",
      ),
      expected: /bundle_marker_noncanonical/u,
    },
    {
      name: "unclosed-frontmatter",
      design: DESIGN.replace("\n---\n\n<!--", "\n\n<!--"),
      expected: /bundle_marker_noncanonical:.*frontmatter_unclosed/u,
    },
    {
      name: "invalid-frontmatter",
      design: DESIGN.replace('version: "alpha"', "version: ["),
      expected: /bundle_marker_noncanonical:.*frontmatter_invalid:/u,
    },
    {
      name: "frontmatter-fence-like-scalar",
      design: DESIGN.replace(
        'description: "A deterministic authority closure fixture."',
        "description: |\n  ```",
      ),
      expected: /bundle_manifest_missing/u,
      unpaired_only: true,
    },
  ];
  for (const item of cases) {
    for (const withManifest of item.unpaired_only ? [false] : [false, true]) {
      const repository = await markerFixture(item.design, withManifest);
      try {
        const inspection = await inspectDesignAuthorityClosure(repository);
        assert.equal(inspection.status, "invalid", item.name);
        assert.equal(inspection.mode, "bundle", item.name);
        assert.match(
          inspection.diagnostics[0].detail,
          item.expected,
          item.name,
        );
      } finally {
        await cleanup(repository);
      }
    }
  }

  for (const example of [
    "```md\n<!-- ty-context-design-authority-format: bundle-v1 -->\n```",
    "~~~md\n<!-- TY-CONTEXT-DESIGN-AUTHORITY-FORMAT : bundle-v2 -->\n~~~",
    "`<!-- ty-context-design-authority-format: bundle-v1 -->`",
    "Example: <!-- TY-CONTEXT-DESIGN-AUTHORITY-FORMAT: bundle-v2 -->",
    "<!-- ordinary project note -->",
    "<!-- ty-context-design-authority: bundle-v1 -->",
  ]) {
    const repository = await temporaryRepository();
    try {
      const legacy = LEGACY_DESIGN.replace(
        "See [button](design_system/components/button.md).",
        example,
      );
      await writeFile(path.join(repository, "DESIGN.md"), legacy, "utf8");
      const inspection = await inspectDesignAuthorityClosure(repository);
      assert.equal(inspection.status, "valid");
      assert.equal(inspection.mode, "legacy");
    } finally {
      await cleanup(repository);
    }
  }
});

test("reserved format namespace candidates are noncanonical before legacy classification", async () => {
  const malformed = [
    ["leading line whitespace", ` ${BUNDLE_MARKER}`],
    [
      "internal comment whitespace",
      "<!--  ty-context-design-authority-format: bundle-v1 -->",
    ],
    [
      "internal tab",
      "<!--\tty-context-design-authority-format:\tbundle-v1 -->",
    ],
    [
      "colon spacing",
      "<!-- ty-context-design-authority-format : bundle-v1 -->",
    ],
    [
      "value leading whitespace",
      "<!-- ty-context-design-authority-format:  bundle-v1 -->",
    ],
    [
      "value trailing whitespace",
      "<!-- ty-context-design-authority-format: bundle-v1  -->",
    ],
    [
      "namespace case",
      "<!-- TY-CONTEXT-DESIGN-AUTHORITY-FORMAT: bundle-v1 -->",
    ],
    ["value case", "<!-- ty-context-design-authority-format: BUNDLE-V1 -->"],
    [
      "unknown version",
      "<!-- ty-context-design-authority-format: bundle-v2 -->",
    ],
    ["trailing line whitespace", `${BUNDLE_MARKER}\t`],
  ];
  for (const [name, candidate] of malformed) {
    for (const withManifest of [false, true]) {
      const repository = await markerFixture(
        `${candidate}\n\n# Design System\n`,
        withManifest,
      );
      try {
        const inspection = await inspectDesignAuthorityClosure(repository);
        assert.equal(inspection.status, "invalid", name);
        assert.equal(inspection.mode, "bundle", name);
        assert.equal(inspection.identity, null, name);
        assert.match(
          inspection.diagnostics[0].detail,
          /bundle_marker_noncanonical:line=1:expected=.*:actual=/u,
          name,
        );
        assert.doesNotMatch(
          inspection.diagnostics[0].detail,
          /bundle_marker_missing/u,
          name,
        );
      } finally {
        await cleanup(repository);
      }
    }
  }
});

test("an exact marker plus a malformed reserved declaration fails at the concrete leaf", async () => {
  for (const withManifest of [false, true]) {
    const repository = await markerFixture(
      `${BUNDLE_MARKER}\n<!-- ty-context-design-authority-format: bundle-v2 -->\n# Design System\n`,
      withManifest,
    );
    try {
      const inspection = await inspectDesignAuthorityClosure(repository);
      assert.equal(inspection.status, "invalid");
      assert.equal(inspection.mode, "bundle");
      assert.match(
        inspection.diagnostics[0].detail,
        /bundle_marker_noncanonical:line=2:expected=.*:actual=.*bundle-v2/u,
      );
      assert.doesNotMatch(
        inspection.diagnostics[0].detail,
        /bundle_marker_duplicate|bundle_manifest_missing/u,
      );
    } finally {
      await cleanup(repository);
    }
  }
});

async function markerFixture(design, withManifest) {
  const repository = await temporaryRepository();
  if (withManifest) await createBundle(repository);
  await writeFile(path.join(repository, "DESIGN.md"), design, "utf8");
  return repository;
}

test("orphan manifest is an invalid bundle rather than missing or legacy", async () => {
  for (const mutation of ["delete", "rename"]) {
    const repository = await temporaryRepository();
    try {
      await createBundle(repository);
      const entry = path.join(repository, "DESIGN.md");
      if (mutation === "delete") await rm(entry);
      else await rename(entry, path.join(repository, "DESIGN.renamed.md"));
      const inspection = await inspectDesignAuthorityClosure(repository);
      assert.equal(inspection.status, "invalid");
      assert.equal(inspection.mode, "bundle");
      assertDiagnostic(inspection, "bundle_entry_missing");
    } finally {
      await cleanup(repository);
    }
  }
});

test("bundle path spelling is portable for directory, manifest and members", async () => {
  for (const target of ["directory", "manifest", "member"]) {
    const repository = await temporaryRepository();
    try {
      await createBundle(repository);
      if (target === "directory") {
        await rename(
          path.join(repository, "design_system"),
          path.join(repository, "Design_System"),
        );
      } else if (target === "manifest") {
        await rename(
          path.join(repository, "design_system/authority.manifest.json"),
          path.join(repository, "design_system/Authority.Manifest.Json"),
        );
      } else {
        await rename(
          path.join(repository, "design_system/components/button.md"),
          path.join(repository, "design_system/components/Button.md"),
        );
      }
      const inspection = await inspectDesignAuthorityClosure(repository);
      assert.equal(inspection.status, "invalid", target);
      assert.equal(inspection.mode, "bundle", target);
      assert.match(
        inspection.diagnostics[0].detail,
        /(?:path_case_mismatch|bundle_manifest_missing|protected_input_not_found:design_authority_member|ENOENT)/u,
        target,
      );
    } finally {
      await cleanup(repository);
    }
  }
});

test("bundle marker still blocks downgrade after child and link removal", async () => {
  const repository = await temporaryRepository();
  try {
    await createBundle(repository);
    await rm(path.join(repository, "design_system/authority.manifest.json"));
    await rm(path.join(repository, "design_system/components/button.md"));
    await writeFile(
      path.join(repository, "DESIGN.md"),
      DESIGN.replace(
        "See [button](design_system/components/button.md).",
        "No subordinate link remains.",
      ),
      "utf8",
    );
    const inspection = await inspectDesignAuthorityClosure(repository);
    assert.equal(inspection.status, "invalid");
    assert.match(inspection.diagnostics[0].detail, /bundle_manifest_missing/u);
  } finally {
    await cleanup(repository);
  }
});

test("sparse manifest binds entry, child, generated Tokens and canonical projection", async () => {
  const repository = await temporaryRepository();
  try {
    const first = await createBundle(repository);
    assert.equal(first.status, "valid");
    assert.equal(first.mode, "bundle");
    assert.equal(first.claimed_closure_digest, first.identity.closure_digest);
    assert.deepEqual(first.member_paths, [
      "DESIGN.md",
      "design_system/authority.manifest.json",
      "design_system/components/button.md",
      "design_system/tokens.json",
    ]);
    assert.equal(first.diagnostics.length, 0);
    assert.equal(
      designAuthorityManifestProjection(first.manifest).includes(
        "closure_digest",
      ),
      false,
    );

    const loaded = await loadCurrentDesignAuthorityClosure(repository);
    assert.deepEqual(loaded.identity, first.identity);
    assert.equal(loaded.generated_tokens?.endsWith("\n"), true);
  } finally {
    await cleanup(repository);
  }
});

test("manifest presentation and member EOL do not change closure identity", async () => {
  const left = await temporaryRepository();
  const right = await temporaryRepository();
  try {
    const a = await createBundle(left);
    const b = await createBundle(right, { crlf: true, prettyManifest: false });
    assert.equal(a.identity.closure_digest, b.identity.closure_digest);
    assert.equal(b.status, "valid");
  } finally {
    await cleanup(left, right);
  }
});

test("child, entry and generated-byte drift invalidate a claimed closure", async () => {
  const repository = await temporaryRepository();
  try {
    const initial = await createBundle(repository);
    await writeFile(
      path.join(repository, "design_system/components/button.md"),
      `${BUTTON}\nChanged.\n`,
      "utf8",
    );
    const childDrift = await inspectDesignAuthorityClosure(repository);
    assert.equal(childDrift.status, "invalid");
    assert.notEqual(
      childDrift.identity?.closure_digest,
      initial.identity.closure_digest,
    );
    assertDiagnostic(childDrift, "design_authority_closure_digest_mismatch");

    await createBundle(repository);
    await writeFile(
      path.join(repository, "design_system/tokens.json"),
      "{}\n",
      "utf8",
    );
    const generatedDrift = await inspectDesignAuthorityClosure(repository);
    assert.equal(generatedDrift.status, "invalid");
    assertDiagnostic(generatedDrift, "design_authority_generated_tokens_stale");
    await assert.rejects(
      loadCurrentDesignAuthorityClosure(repository),
      /design_authority_generated_tokens_stale/u,
    );
  } finally {
    await cleanup(repository);
  }
});

test("unlisted drafts warn while normative links to them fail closure", async () => {
  const repository = await temporaryRepository();
  try {
    await createBundle(repository);
    await mkdir(path.join(repository, "design_system/drafts"), {
      recursive: true,
    });
    await writeFile(
      path.join(repository, "design_system/drafts/idea.md"),
      "# Draft\n",
      "utf8",
    );
    const warning = await inspectDesignAuthorityClosure(repository);
    assert.equal(warning.status, "valid");
    assertDiagnostic(warning, "unlisted_design_system_file");

    await writeFile(
      path.join(repository, "design_system/components/button.md"),
      `${BUTTON}\n[Draft](../drafts/idea.md)\n`,
      "utf8",
    );
    await refreshClaim(repository);
    const linked = await inspectDesignAuthorityClosure(repository);
    assert.equal(linked.status, "invalid");
    assertDiagnostic(linked, "authority_closure_link_unlisted");
  } finally {
    await cleanup(repository);
  }
});

test("showcase inspection is additive, deterministic and closure-external", async () => {
  const repository = await temporaryRepository();
  try {
    const authority = await createBundle(repository);
    assert.equal(authority.status, "valid");
    assert.equal(authority.showcase.status, "not_declared");
    const adopted = await createShowcase(repository);
    assert.equal(adopted.status, "valid");
    assert.equal(adopted.showcase.status, "valid");
    assert.equal(
      adopted.showcase.authority.closure_digest,
      adopted.identity.closure_digest,
    );
    assert.deepEqual(adopted.showcase.indexes, {
      token_families: 1,
      components: 1,
      target_conditions: 1,
    });
    assert.equal(
      adopted.members.some((item) => item.path.startsWith("docs/")),
      false,
    );
    assert.deepEqual(await inspectDesignAuthorityClosure(repository), adopted);
    const loaded = await loadCurrentDesignAuthorityClosure(repository);
    assert.equal("showcase" in loaded, false);

    await writeFile(
      path.join(repository, SHOWCASE_HTML_PATH),
      "broken",
      "utf8",
    );
    const brokenProjection = await inspectDesignAuthorityClosure(repository);
    assert.equal(brokenProjection.status, "valid");
    assert.equal(brokenProjection.showcase.status, "invalid");
    assert.match(
      brokenProjection.showcase.diagnostics[0].detail,
      /file_digest_mismatch/u,
    );
    assert.ok(await loadCurrentDesignAuthorityClosure(repository));
  } finally {
    await cleanup(repository);
  }
});

test("showcase manifest rejects stale identity, category inversion and incomplete coverage", async () => {
  const mutations = [
    ["unknown field", (value) => (value.extra = true), /unknown_field:extra/u],
    [
      "candidate status",
      (value) => (value.status = "candidate"),
      /status:expected:adopted/u,
    ],
    [
      "gallery category",
      (value) => (value.artifact_category = "application_gallery"),
      /artifact_category:expected:design_system_handbook/u,
    ],
    [
      "wrong authority digest",
      (value) => (value.authority.closure_digest = `sha256:${"0".repeat(64)}`),
      /authority_closure_digest_mismatch/u,
    ],
    [
      "wrong revision",
      (value) => (value.authority.revision = "stale"),
      /authority_revision_mismatch/u,
    ],
    [
      "wrong HTML path",
      (value) => (value.html.path = "docs/design-system-showcase/gallery.html"),
      /html\.path:expected/u,
    ],
    [
      "wrong HTML digest",
      (value) => (value.html.sha256 = `sha256:${"0".repeat(64)}`),
      /file_digest_mismatch/u,
    ],
    [
      "network dependency",
      (value) =>
        value.external_network_dependencies.push("https://example.invalid"),
      /external_network_dependencies:not_empty/u,
    ],
    [
      "missing coverage",
      (value) => value.coverage.pop(),
      /coverage:expected_14_items/u,
    ],
    [
      "wrong coverage order",
      (value) =>
        ([value.coverage[0], value.coverage[1]] = [
          value.coverage[1],
          value.coverage[0],
        ]),
      /coverage\[0\]\.key:expected:identity/u,
    ],
    [
      "required section N/A",
      (value) => {
        value.coverage[0] = {
          key: "identity",
          disposition: "not_applicable",
          rationale: "Incorrectly omitted.",
        };
      },
      /required_section_not_rendered:identity/u,
    ],
    [
      "empty token index",
      (value) => (value.token_families = []),
      /token_families:non_empty_array_required/u,
    ],
    [
      "empty target index",
      (value) => (value.target_conditions = []),
      /target_conditions:non_empty_array_required/u,
    ],
    [
      "unsafe asset path",
      (value) =>
        value.assets.push({
          path: "docs/design-system-showcase/assets/../escape.png",
          sha256: `sha256:${"0".repeat(64)}`,
        }),
      /portable_repository_path_required/u,
    ],
  ];
  for (const [label, mutate, expected] of mutations) {
    const repository = await temporaryRepository();
    try {
      await createBundle(repository);
      await createShowcase(repository);
      const manifest = await readShowcaseManifest(repository);
      mutate(manifest);
      await writeShowcaseManifest(repository, manifest);
      const inspection = await inspectDesignAuthorityClosure(repository);
      assert.equal(inspection.status, "valid", label);
      assert.equal(inspection.showcase.status, "invalid", label);
      assert.match(inspection.showcase.diagnostics[0].detail, expected, label);
    } finally {
      await cleanup(repository);
    }
  }
});

test("showcase marker grammar is exact while fenced examples remain inert", async () => {
  const fenced = await temporaryRepository();
  const malformed = await temporaryRepository();
  try {
    await createBundle(fenced);
    await writeFile(
      path.join(fenced, "DESIGN.md"),
      `${await readFile(path.join(fenced, "DESIGN.md"), "utf8")}\n\`\`\`md\n${SHOWCASE_MARKER}\n\`\`\`\n`,
      "utf8",
    );
    const fencedResult = await refreshClaim(fenced);
    assert.equal(fencedResult.status, "valid");
    assert.equal(fencedResult.showcase.status, "not_declared");

    await createBundle(malformed);
    await writeFile(
      path.join(malformed, "DESIGN.md"),
      `${await readFile(path.join(malformed, "DESIGN.md"), "utf8")}\n<!-- ty-context-design-showcase path = "docs/design-system-showcase/showcase.manifest.json" -->\n`,
      "utf8",
    );
    const malformedResult = await refreshClaim(malformed);
    assert.equal(malformedResult.status, "valid");
    assert.equal(malformedResult.showcase.status, "invalid");
    assert.match(
      malformedResult.showcase.diagnostics[0].detail,
      /declaration_noncanonical/u,
    );
  } finally {
    await cleanup(fenced, malformed);
  }
});

test("showcase HTML is an inert handbook and supplemental scenes cannot own primitives", async () => {
  const mutations = [
    [
      "active script",
      (html) => html.replace("</body>", "<script></script></body>"),
      /active_element:script/u,
    ],
    [
      "remote image",
      (html) =>
        html.replace(
          "<h2>icons-assets</h2>",
          '<h2>icons-assets</h2><img src="https://example.invalid/icon.png" alt="icon">',
        ),
      /external_or_active_url:img:src/u,
    ],
    [
      "encoded remote image",
      (html) =>
        html.replace(
          "<h2>icons-assets</h2>",
          '<h2>icons-assets</h2><img src="https&#58;//example.invalid/icon.png" alt="icon">',
        ),
      /url_attribute_not_literal:img:src/u,
    ],
    [
      "sibling outside root",
      (html) =>
        html.replace("</html>", "</html><section>outside root</section>"),
      /html_tag_outside_root:section/u,
    ],
    [
      "text outside root",
      (html) => html.replace("</html>", "</html>outside root"),
      /html_text_outside_root/u,
    ],
    [
      "root gallery category",
      (html) =>
        html.replace(
          'data-ty-showcase-artifact="design_system_handbook"',
          'data-ty-showcase-artifact="application_gallery"',
        ),
      /html_root_attribute:data-ty-showcase-artifact/u,
    ],
    [
      "missing handbook section",
      (html) =>
        html.replace(
          'data-ty-showcase-section="typography"',
          'data-section="typography"',
        ),
      /section_marker_count/u,
    ],
    [
      "gallery defines component",
      (html) =>
        html
          .replace(
            '<article id="component-button" data-ty-showcase-component="button">Button</article>',
            "",
          )
          .replace(
            "Account overview scenario</article>",
            'Account overview scenario</article><article id="component-button" data-ty-showcase-component="button">Button</article>',
          ),
      /component_declared_by_supplemental_gallery:button/u,
    ],
  ];
  for (const [label, mutate, expected] of mutations) {
    const repository = await temporaryRepository();
    try {
      await createBundle(repository);
      await createShowcase(repository);
      await mutateShowcaseHtml(repository, mutate);
      const inspection = await inspectDesignAuthorityClosure(repository);
      assert.equal(inspection.status, "valid", label);
      assert.equal(inspection.showcase.status, "invalid", label);
      assert.match(inspection.showcase.diagnostics[0].detail, expected, label);
    } finally {
      await cleanup(repository);
    }
  }
});

test("showcase local assets are digest-bound, reachable and network-free", async () => {
  const valid = await temporaryRepository();
  const missing = await temporaryRepository();
  const unreachable = await temporaryRepository();
  const remoteCss = await temporaryRepository();
  try {
    const assets = [
      {
        path: "docs/design-system-showcase/assets/theme.css",
        content: 'body { background-image: url("dot.png"); }\n',
      },
      {
        path: "docs/design-system-showcase/assets/dot.png",
        content: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      },
    ];
    await createBundle(valid);
    const validResult = await createShowcase(valid, {
      assets,
      html_fragment: '<link rel="stylesheet" href="assets/theme.css">',
    });
    assert.equal(validResult.showcase.status, "valid");
    await writeFile(
      path.join(valid, assets[1].path),
      Buffer.from([0x89, 0x50, 0x4e, 0x48]),
    );
    const digestMismatch = await inspectDesignAuthorityClosure(valid);
    assert.equal(digestMismatch.showcase.status, "invalid");
    assert.match(
      digestMismatch.showcase.diagnostics[0].detail,
      /file_digest_mismatch/u,
    );

    await createBundle(missing);
    await createShowcase(missing, {
      assets: [assets[1]],
      html_fragment: '<img src="assets/dot.png" alt="dot">',
    });
    await rm(path.join(missing, assets[1].path));
    const missingResult = await inspectDesignAuthorityClosure(missing);
    assert.equal(missingResult.showcase.status, "invalid");
    assert.match(
      missingResult.showcase.diagnostics[0].detail,
      /protected_input_not_found/u,
    );

    await createBundle(unreachable);
    const unreachableResult = await createShowcase(unreachable, {
      assets: [assets[1]],
    });
    assert.equal(unreachableResult.showcase.status, "invalid");
    assert.match(
      unreachableResult.showcase.diagnostics[0].detail,
      /asset_not_reachable/u,
    );

    await createBundle(remoteCss);
    await createShowcase(remoteCss, {
      assets: [assets[0]],
      html_fragment: '<link rel="stylesheet" href="assets/theme.css">',
    });
    const manifest = await readShowcaseManifest(remoteCss);
    const css = 'body { background: url("https://example.invalid/a.png"); }\n';
    await writeFile(path.join(remoteCss, assets[0].path), css, "utf8");
    manifest.assets[0].sha256 = digest(Buffer.from(css));
    await writeShowcaseManifest(remoteCss, manifest);
    const remoteResult = await inspectDesignAuthorityClosure(remoteCss);
    assert.equal(remoteResult.showcase.status, "invalid");
    assert.match(
      remoteResult.showcase.diagnostics[0].detail,
      /asset_reference_not_local/u,
    );
  } finally {
    await cleanup(valid, missing, unreachable, remoteCss);
  }
});

test("showcase CSS rejects network strings and token obfuscation", () => {
  const sourcePath = "docs/design-system-showcase/assets/theme.css";
  const declaredAssets = new Set([
    "docs/design-system-showcase/assets/dot.png",
  ]);
  assert.deepEqual(
    inspectDesignAuthorityShowcaseCss({
      source_path: sourcePath,
      content: 'body { background-image: url("dot.png"); }\n',
      declared_assets: declaredAssets,
    }),
    ["docs/design-system-showcase/assets/dot.png"],
  );
  for (const [label, content, expected] of [
    [
      "network string",
      'body { background-image: image-set("https://example.invalid/a.png" 1x); }',
      /external_css_url/u,
    ],
    [
      "escaped url token",
      String.raw`body { background-image: u\72l("dot.png"); }`,
      /css_escape_unsupported/u,
    ],
    [
      "comment-obfuscated url token",
      'body { background-image: u/**/rl("https://example.invalid/a.png"); }',
      /css_comment_unsupported/u,
    ],
  ])
    assert.throws(
      () =>
        inspectDesignAuthorityShowcaseCss({
          source_path: sourcePath,
          content,
          declared_assets: declaredAssets,
        }),
      expected,
      label,
    );
});

test("an Authority revision invalidates a previously valid showcase binding", async () => {
  const repository = await temporaryRepository();
  try {
    await createBundle(repository);
    const current = await createShowcase(repository);
    assert.equal(current.showcase.status, "valid");
    const entry = await readFile(path.join(repository, "DESIGN.md"), "utf8");
    await writeFile(
      path.join(repository, "DESIGN.md"),
      entry.replace('version: "alpha"', 'version: "beta"'),
      "utf8",
    );
    const revised = await refreshClaim(repository);
    assert.equal(revised.status, "valid");
    assert.equal(revised.identity.revision, "beta");
    assert.equal(revised.showcase.status, "invalid");
    assert.match(
      revised.showcase.diagnostics[0].detail,
      /authority_closure_digest_mismatch/u,
    );
  } finally {
    await cleanup(repository);
  }
});

async function mutateShowcaseHtml(repository, mutate) {
  const target = path.join(repository, SHOWCASE_HTML_PATH);
  const content = mutate(await readFile(target, "utf8"));
  await writeFile(target, content, "utf8");
  const manifest = await readShowcaseManifest(repository);
  manifest.html.sha256 = digest(Buffer.from(content));
  await writeShowcaseManifest(repository, manifest);
}
