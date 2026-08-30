import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  inspectDesignAuthorityClosure,
  loadCurrentDesignAuthorityClosure,
} from "../../packages/ty-context/dist/lib/design-authority-closure.js";
import { preflightDesignResourceHandoff } from "../../packages/ty-context/dist/lib/design-resource-handoff-validation.js";
import { resolveDesignAuthorityHandoffBinding } from "../../packages/ty-context/dist/lib/design-authority-binding.js";
import {
  DESIGN_HANDOFF_PATH,
  writeDesignResourceHandoff,
  writeDesignResourceHandoffFixture,
} from "./design-resource-handoff-fixture.mjs";
import { writeDesignResourceSymbolicHandoffFixture } from "./design-resource-symbolic-handoff-fixture.mjs";

const LEGACY_DESIGN =
  "# Fixture Design Authority\n\nLegacy single-file test authority.\n";
const BUNDLE_MARKER = "<!-- ty-context-design-authority-format: bundle-v1 -->";

test("V1 explicit project Authority identity is current and stale-safe", async () => {
  await withRepository(async (root) => {
    const fixture = await writeDesignResourceHandoffFixture(root);
    const current = await loadCurrentDesignAuthorityClosure(root);
    fixture.handoff.project_design_authority = closureBinding(current.identity);
    await writeDesignResourceHandoff(root, fixture.handoff);

    const valid = await preflightDesignResourceHandoff(
      root,
      DESIGN_HANDOFF_PATH,
    );
    assert.equal(
      valid.project_design_authority_resolution.compatibility_derived,
      false,
    );
    assert.deepEqual(
      valid.project_design_authority_resolution.identity,
      current.identity,
    );
    assert.deepEqual(valid.project_design_authority_resolution.member_paths, [
      "DESIGN.md",
    ]);

    await writeFile(
      path.join(root, "DESIGN.md"),
      `${LEGACY_DESIGN}\nChanged without rebinding.\n`,
      "utf8",
    );
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /project_design_authority:identity_mismatch:closure_digest/u,
    );
  });
});

test("V2 explicit project Authority identity uses the same closure binding", async () => {
  await withRepository(async (root) => {
    await writeFile(path.join(root, "DESIGN.md"), LEGACY_DESIGN, "utf8");
    const current = await loadCurrentDesignAuthorityClosure(root);
    const fixture = await writeDesignResourceSymbolicHandoffFixture(
      root,
      undefined,
      {
        mutateHandoff(handoff) {
          handoff.project_design_authority = closureBinding(current.identity);
        },
      },
    );
    const valid = await preflightDesignResourceHandoff(
      root,
      fixture.handoffPath,
    );
    assert.equal(
      valid.project_design_authority_resolution.compatibility_derived,
      false,
    );
    assert.deepEqual(
      valid.project_design_authority_resolution.identity,
      current.identity,
    );
  });
});

test("omitted legacy identity cannot silently bind a new bundle", async () => {
  await withRepository(async (root) => {
    await writeDesignResourceHandoffFixture(root);
    await createBundle(root);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /project_design_authority:legacy_omission_bundle_not_allowed/u,
    );
  });
});

test("fresh DRA preflight rejects a marked bundle whose manifest was removed", async () => {
  await withRepository(async (root) => {
    await writeDesignResourceHandoffFixture(root);
    await createBundle(root);
    await rm(path.join(root, "design_system/authority.manifest.json"));
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /bundle_manifest_missing/u,
    );
  });
});

test("fresh DRA binding preserves a noncanonical marker leaf diagnostic", async () => {
  await withRepository(async (root) => {
    const fixture = await writeDesignResourceHandoffFixture(root);
    const authority = await createBundle(root);
    fixture.handoff.project_design_authority = closureBinding(
      authority.identity,
    );
    await writeDesignResourceHandoff(root, fixture.handoff);
    const entryPath = path.join(root, "DESIGN.md");
    const design = await readFile(entryPath, "utf8");
    await writeFile(
      entryPath,
      design.replace(
        BUNDLE_MARKER,
        "<!-- TY-CONTEXT-DESIGN-AUTHORITY-FORMAT: bundle-v1 -->",
      ),
      "utf8",
    );

    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      (error) => {
        const detail = error instanceof Error ? error.message : String(error);
        assert.match(
          detail,
          /bundle_marker_noncanonical:line=1:expected=.*:actual=.*TY-CONTEXT-DESIGN-AUTHORITY-FORMAT/u,
        );
        assert.doesNotMatch(detail, /legacy_omission|bundle_marker_missing/u);
        return true;
      },
    );
  });
});

test("non-fidelity may be explicit not-applicable but style work may not", async () => {
  await withRepository(async (root) => {
    const valid = await resolveDesignAuthorityHandoffBinding({
      repository: root,
      style_dependency: "non-fidelity",
      binding: {
        kind: "not-applicable",
        rationale: "The selected handoff carries no visual-system dependency.",
      },
    });
    assert.equal(valid.identity, null);
    assert.deepEqual(valid.member_paths, []);

    await writeDesignResourceHandoffFixture(root, (handoff) => {
      handoff.project_design_authority = {
        kind: "not-applicable",
        rationale: "Invalid for style-bearing work.",
      };
    });
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /not_applicable_requires_non_fidelity/u,
    );
  });
});

test("handoff Authority binding rejects adoption claims as unknown fields", async () => {
  await withRepository(async (root) => {
    const fixture = await writeDesignResourceHandoffFixture(root);
    const current = await loadCurrentDesignAuthorityClosure(root);
    fixture.handoff.project_design_authority = {
      ...closureBinding(current.identity),
      adopted: true,
    };
    await writeDesignResourceHandoff(root, fixture.handoff);
    await assert.rejects(
      preflightDesignResourceHandoff(root, DESIGN_HANDOFF_PATH),
      /project_design_authority:unknown keys: adopted/u,
    );
  });
});

async function createBundle(root) {
  await writeFile(
    path.join(root, "DESIGN.md"),
    `${BUNDLE_MARKER}\n\n# Fixture Design Authority\n\n[Sheet](design_system/components/sheet.md)\n`,
    "utf8",
  );
  await mkdir(path.join(root, "design_system/components"), { recursive: true });
  await writeFile(
    path.join(root, "design_system/components/sheet.md"),
    "# Sheet\n\nReusable sheet behavior.\n",
    "utf8",
  );
  const manifestPath = path.join(root, "design_system/authority.manifest.json");
  const manifest = {
    schema_version: 1,
    entry: "DESIGN.md",
    authority_files: [
      { path: "design_system/components/sheet.md", kind: "component" },
    ],
    generated_files: [],
    closure_digest: `sha256:${"0".repeat(64)}`,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const provisional = await inspectDesignAuthorityClosure(root);
  assert.ok(provisional.identity, JSON.stringify(provisional.diagnostics));
  manifest.closure_digest = provisional.identity.closure_digest;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const current = await loadCurrentDesignAuthorityClosure(root);
  assert.equal(current.mode, "bundle");
  return current;
}

function closureBinding(identity) {
  return { kind: "repository-closure", ...identity };
}

async function withRepository(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "ty-handoff-authority-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
