import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  encodeDesignResourceRecoveryCheckpoint,
  parseDesignResourceRecoveryCheckpoint,
  parseDesignResourceRecoveryCreateInput,
} from "../../packages/ty-context/dist/lib/design-resource-recovery-codec.js";
import { readRecoveryCheckpointFile } from "../../packages/ty-context/dist/lib/design-resource-recovery-files.js";
import {
  applyDesignResourceRecoveryWriteback,
  createDesignResourceRecoveryCheckpoint,
  inspectDesignResourceRecovery,
  previewDesignResourceRecoveryWriteback,
  removeDesignResourceRecoveryCheckpoint,
} from "../../packages/ty-context/dist/lib/design-resource-recovery.js";
import { clone, createRecoveryFixture } from "./design-resource-recovery-fixture.mjs";

test("DRA checkpoint replays all decision states and CAS writeback is idempotent", async () => {
  const fixture = await createRecoveryFixture();
  try {
    const created = await createDesignResourceRecoveryCheckpoint(
      fixture.root,
      fixture.input,
    );
    assert.equal(created.status, "created");
    const same = await createDesignResourceRecoveryCheckpoint(
      fixture.root,
      fixture.input,
    );
    assert.equal(same.status, "already-current");
    const inspection = await inspectDesignResourceRecovery(
      fixture.root,
      fixture.input.session_id,
    );
    assert.equal(inspection.writeback.state, "unapplied");
    assert.deepEqual(
      inspection.replay.ordered_active_accepted_deltas.map(
        (delta) => delta.delta_id,
      ),
      ["delta.color", "delta.layout-preserved"],
    );
    assert.deepEqual(
      inspection.replay.rejected_deltas.map((delta) => delta.delta_id),
      ["delta.admin"],
    );
    assert.deepEqual(
      inspection.replay.unresolved_deltas.map((delta) => delta.delta_id),
      ["delta.tagline"],
    );
    const preview = await previewDesignResourceRecoveryWriteback(
      fixture.root,
      fixture.input.session_id,
    );
    assert.equal(preview.patch.patch.operations[0].after_text, "color: red");
    const applied = await applyDesignResourceRecoveryWriteback(
      fixture.root,
      fixture.input.session_id,
      fixture.auditLocator,
    );
    assert.equal(applied.status, "handoff-ready");
    assert.equal(applied.write_transaction, true);
    assert.deepEqual(
      await readFile(path.join(fixture.root, "proposal.md")),
      fixture.afterBytes,
    );
    const idempotent = await applyDesignResourceRecoveryWriteback(
      fixture.root,
      fixture.input.session_id,
      fixture.auditLocator,
    );
    assert.equal(idempotent.status, "handoff-ready");
    assert.equal(idempotent.write_transaction, false);
    assert.equal(idempotent.idempotent_replay, true);
    await assert.rejects(
      removeDesignResourceRecoveryCheckpoint(
        fixture.root,
        fixture.input.session_id,
        "0".repeat(64),
      ),
      /checkpoint_remove_cas_conflict/u,
    );
    const removed = await removeDesignResourceRecoveryCheckpoint(
      fixture.root,
      fixture.input.session_id,
      created.checkpoint_raw_byte_digest,
    );
    assert.equal(removed.removed, true);
  } finally {
    await fixture.cleanup();
  }
});

test("strict codecs reject corruption, unknown versions and unknown fields", async () => {
  const fixture = await createRecoveryFixture();
  try {
    const valid = JSON.stringify(fixture.input);
    assert.equal(
      parseDesignResourceRecoveryCreateInput(valid).session_id,
      fixture.input.session_id,
    );
    assert.throws(
      () =>
        parseDesignResourceRecoveryCreateInput(
          valid.replace('"session_id"', '"unexpected":1,"session_id"'),
        ),
      /unknown_field:unexpected/u,
    );
    assert.throws(
      () =>
        parseDesignResourceRecoveryCreateInput(
          valid.replace(
            "design-resource-recovery-input-v1",
            "design-resource-recovery-input-v999",
          ),
        ),
      /schema_version/u,
    );
    const created = await createDesignResourceRecoveryCheckpoint(
      fixture.root,
      fixture.input,
    );
    const checkpoint = await readRecoveryCheckpointFile(
      fixture.root,
      fixture.input.session_id,
    );
    const parsed = parseDesignResourceRecoveryCheckpoint(
      checkpoint.bytes.toString("utf8"),
    );
    const corrupt = encodeDesignResourceRecoveryCheckpoint({
      ...parsed,
      schema_version: "design-resource-recovery-checkpoint-v999",
    });
    await writeFile(checkpoint.absolute, corrupt, "utf8");
    await assert.rejects(
      inspectDesignResourceRecovery(fixture.root, fixture.input.session_id),
      /checkpoint\.schema_version/u,
    );
    assert.match(created.checkpoint_path, /tmp\/ty-context/u);
  } finally {
    await fixture.cleanup();
  }
});

test("stale Base and writeback CAS conflicts fail closed without mutation", async () => {
  const fixture = await createRecoveryFixture();
  try {
    await createDesignResourceRecoveryCheckpoint(fixture.root, fixture.input);
    await writeFile(
      path.join(fixture.root, fixture.input.base.locator),
      "stale base\n",
      "utf8",
    );
    await assert.rejects(
      inspectDesignResourceRecovery(fixture.root, fixture.input.session_id),
      /base_digest_mismatch/u,
    );
  } finally {
    await fixture.cleanup();
  }
  const conflict = await createRecoveryFixture();
  try {
    await createDesignResourceRecoveryCheckpoint(conflict.root, conflict.input);
    const concurrent = Buffer.from("# Proposal\ncolor: green\n", "utf8");
    await writeFile(path.join(conflict.root, "proposal.md"), concurrent);
    await assert.rejects(
      applyDesignResourceRecoveryWriteback(
        conflict.root,
        conflict.input.session_id,
        conflict.auditLocator,
      ),
      /writeback_cas_conflict/u,
    );
    assert.deepEqual(
      await readFile(path.join(conflict.root, "proposal.md")),
      concurrent,
    );
  } finally {
    await conflict.cleanup();
  }
});

test("semantic order, supersession, scope and delegated choice are validated", async () => {
  for (const mutate of [
    (input) => {
      input.deltas[1].sequence = 7;
    },
    (input) => {
      input.deltas[0].supersedes = ["later"];
    },
    (input) => {
      input.deltas[0].target_keys = ["page.other"];
    },
    (input) => {
      input.delegations[0].allowed_target_keys = ["layout.stable"];
    },
    (input) => {
      input.deltas[0].decision_authority = "none";
    },
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `invalid-${Math.random().toString(16).slice(2)}`,
    });
    try {
      const input = clone(fixture.input);
      mutate(input);
      await assert.rejects(
        createDesignResourceRecoveryCheckpoint(fixture.root, input),
        /design_resource_recovery_invalid/u,
      );
    } finally {
      await fixture.cleanup();
    }
  }
});

test("balanced/blocked reconciliation prevents loss, distortion and leakage", async () => {
  for (const [name, mutate] of [
    ["distortion", (audit) => (audit.requirements_to_resource[0].verdict = "distorted")],
    ["unsupported gain", (audit) => (audit.unexpected_blast_radius[0].verdict = "unexpected")],
    ["rejected leak", (audit) => (audit.rejected_or_unresolved_leakage[0].leaked = true)],
    ["unchanged loss", (audit) => (audit.explicitly_unchanged[0].preserved = false)],
    ["circular authority", (audit) => (audit.resource_to_requirements[0].decision_authority = "none")],
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `blocked-${name.replace(/ /gu, "-")}`,
    });
    try {
      await createDesignResourceRecoveryCheckpoint(fixture.root, fixture.input);
      const audit = clone(fixture.audit);
      mutate(audit);
      await writeFile(
        path.join(fixture.root, fixture.auditLocator),
        `${JSON.stringify(audit)}\n`,
      );
      const result = await applyDesignResourceRecoveryWriteback(
        fixture.root,
        fixture.input.session_id,
        fixture.auditLocator,
      );
      assert.equal(result.status, "blocked", name);
      assert.equal(result.write_transaction, false, name);
      assert.deepEqual(
        await readFile(path.join(fixture.root, "proposal.md")),
        fixture.beforeBytes,
      );
    } finally {
      await fixture.cleanup();
    }
  }
});
