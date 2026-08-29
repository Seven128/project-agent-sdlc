import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { parseDesignResourceRecoveryCreateInput } from "../../packages/ty-context/dist/lib/design-resource-recovery-codec.js";
import {
  createDesignResourceRecoveryCheckpoint,
  inspectDesignResourceRecovery,
} from "../../packages/ty-context/dist/lib/design-resource-recovery.js";
import {
  clone,
  createRecoveryFixture,
  sha256,
} from "./design-resource-recovery-fixture.mjs";

test("DRA recovery accepts and preserves a current legacy closure identity", async () => {
  const fixture = await createRecoveryFixture({
    authorityMode: "closure-legacy",
  });
  try {
    assert.equal(fixture.input.design_authority.kind, "repository-closure");
    assert.equal(fixture.input.design_authority.manifest_path, null);
    const created = await createDesignResourceRecoveryCheckpoint(
      fixture.root,
      fixture.input,
    );
    assert.equal(created.status, "created");
    const inspection = await inspectDesignResourceRecovery(
      fixture.root,
      fixture.input.session_id,
    );
    assert.deepEqual(
      inspection.replay.design_authority,
      fixture.input.design_authority,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("a subordinate bundle change stales DRA recovery even without revision change", async () => {
  const fixture = await createRecoveryFixture({
    authorityMode: "closure-bundle",
  });
  try {
    assert.equal(
      fixture.input.design_authority.manifest_path,
      "design_system/authority.manifest.json",
    );
    assert.equal(fixture.input.design_authority.revision, null);
    await createDesignResourceRecoveryCheckpoint(fixture.root, fixture.input);
    await writeFile(
      path.join(fixture.root, "design_system/components/sheet.md"),
      "# Sheet\n\nChanged reusable drag behavior.\n",
      "utf8",
    );
    await assert.rejects(
      inspectDesignResourceRecovery(
        fixture.root,
        fixture.input.session_id,
      ),
      /design_authority_(?:invalid|closure_mismatch)/u,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("legacy raw-file recovery identity cannot downgrade a manifest bundle", async () => {
  const fixture = await createRecoveryFixture({
    authorityMode: "closure-bundle",
  });
  try {
    const input = clone(fixture.input);
    const designBytes = await readFile(path.join(fixture.root, "DESIGN.md"));
    input.design_authority = {
      kind: "repository-file",
      locator: "DESIGN.md",
      raw_byte_digest: sha256(designBytes),
    };
    await assert.rejects(
      createDesignResourceRecoveryCheckpoint(fixture.root, input),
      /legacy_design_authority_bundle_not_allowed/u,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("closure identity codec is strict and rejects legacy or adoption fields", async () => {
  const fixture = await createRecoveryFixture({
    authorityMode: "closure-legacy",
  });
  try {
    const valid = parseDesignResourceRecoveryCreateInput(
      JSON.stringify(fixture.input),
    );
    assert.deepEqual(valid.design_authority, fixture.input.design_authority);

    for (const mutation of [
      (identity) => {
        identity.locator = "DESIGN.md";
      },
      (identity) => {
        identity.adopted = true;
      },
      (identity) => {
        delete identity.closure_digest;
      },
      (identity) => {
        identity.closure_digest = "0".repeat(64);
      },
    ]) {
      const input = clone(fixture.input);
      mutation(input.design_authority);
      assert.throws(
        () => parseDesignResourceRecoveryCreateInput(JSON.stringify(input)),
        /design_resource_recovery_invalid/u,
      );
    }
  } finally {
    await fixture.cleanup();
  }
});
