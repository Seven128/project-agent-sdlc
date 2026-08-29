import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
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
  assertDiagnostic,
  cleanup,
  createBundle,
  refreshClaim,
  temporaryRepository,
} from "./design-authority-closure-fixture.mjs";

test("legacy Design Authority identity is deterministic across LF and CRLF", async () => {
  const left = await temporaryRepository();
  const right = await temporaryRepository();
  try {
    await writeFile(path.join(left, "DESIGN.md"), DESIGN, "utf8");
    await writeFile(
      path.join(right, "DESIGN.md"),
      DESIGN.replaceAll("\n", "\r\n"),
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

    const clean = DESIGN.replace(
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
