import assert from "node:assert/strict";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  inspectDesignAuthorityClosure,
  loadCurrentDesignAuthorityClosure,
} from "../../packages/ty-context/dist/lib/design-authority-closure.js";
import { designAuthorityManifestProjection } from "../../packages/ty-context/dist/lib/design-authority-manifest.js";
import {
  BUTTON,
  DESIGN,
  LEGACY_DESIGN,
  assertDiagnostic,
  cleanup,
  createBundle,
  refreshClaim,
  temporaryRepository,
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
