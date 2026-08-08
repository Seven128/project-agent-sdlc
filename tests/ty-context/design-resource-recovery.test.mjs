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
import { validateDesignResourceAuthoritySourceItems } from "../../packages/ty-context/dist/lib/design-resource-recovery-source-authority.js";
import { verifyDesignResourceExactPatchReadback } from "../../packages/ty-context/dist/lib/design-resource-recovery-text.js";
import {
  applyDesignResourceRecoveryWriteback,
  createDesignResourceRecoveryCheckpoint,
  inspectDesignResourceRecovery,
  previewDesignResourceRecoveryWriteback,
  reconcileDesignResourceRecovery,
  removeDesignResourceRecoveryCheckpoint,
  updateDesignResourceRecoveryCheckpoint,
} from "../../packages/ty-context/dist/lib/design-resource-recovery.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
import { renderDesignResourceProposalScalarCarrier } from "../../packages/ty-context/dist/lib/design-resource-recovery-writeback-policy.js";
import {
  clone,
  createRecoveryFixture,
  sha256,
} from "./design-resource-recovery-fixture.mjs";

test("DRA checkpoint replays accepted/rejected decisions and CAS writeback is idempotent", async () => {
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
      [],
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
    assert.equal(applied.status, "writeback-applied");
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
    assert.equal(idempotent.status, "writeback-idempotent");
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
    assert.equal(removed.status, "removed");
    assert.equal(removed.checkpoint_removed, true);
  } finally {
    await fixture.cleanup();
  }
});

test("unresolved resource decisions remain replayable but block writeback", async () => {
  const fixture = await createRecoveryFixture({ includeUnresolved: true });
  try {
    await createDesignResourceRecoveryCheckpoint(fixture.root, fixture.input);
    const inspection = await inspectDesignResourceRecovery(
      fixture.root,
      fixture.input.session_id,
    );
    assert.deepEqual(
      inspection.replay.unresolved_deltas.map((delta) => delta.delta_id),
      ["delta.tagline"],
    );
    const result = await applyDesignResourceRecoveryWriteback(
      fixture.root,
      fixture.input.session_id,
      fixture.auditLocator,
    );
    assert.equal(result.status, "blocked");
    assert.equal(result.write_transaction, false);
    assert.ok(
      result.reconciliation.findings.includes(
        "resource_decision_unresolved:resource-decision.tagline",
      ),
    );
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
            "design-resource-recovery-input-v4",
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

test("decision authority resolves to raw-digest-bound actual Source items", async () => {
  for (const [name, mutate, pattern] of [
    [
      "fabricated accepted source ref",
      (input) => {
        input.deltas[0].source_refs = ["conversation-only-authority"];
      },
      /delta_source_ref_unresolved/u,
    ],
    [
      "fabricated delegation source ref",
      (input) => {
        input.delegations[0].source_ref = "source.missing";
      },
      /delegation_source_ref_unresolved/u,
    ],
    [
      "stale source raw digest",
      (input) => {
        input.authority_sources[0].raw_byte_digest = "0".repeat(64);
      },
      /authority_source_raw_digest_mismatch/u,
    ],
    [
      "missing actual Source item",
      (input) => {
        input.authority_sources[0].source_item_key = "invented-item";
      },
      /authority_source_item_missing/u,
    ],
    [
      "explicit user without decision item",
      (input) => {
        input.deltas[0].decision_authority = "explicit-user";
        input.deltas[0].source_refs = ["source.layout-stable"];
      },
      /explicit_user_source_decision_required/u,
    ],
    [
      "delegation source omitted from accepted Delta",
      (input) => {
        input.deltas[0].source_refs = ["source.layout-stable"];
      },
      /delegation_source_not_bound/u,
    ],
    [
      "nonvisual meaning has only an authority decision",
      (input) => {
        input.deltas[0].semantic_kind = "product";
      },
      /delegation_semantic_kind_not_allowed/u,
    ],
    [
      "conversation-only snapshot authorization",
      (input) => {
        input.base.materialization = {
          kind: "authorized-recovery-snapshot",
          authorization_ref: "conversation-only-authority",
        };
      },
      /base_snapshot_authorization_ref_unresolved/u,
    ],
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `source-${name.replace(/[^a-z]+/giu, "-")}`,
    });
    try {
      const input = clone(fixture.input);
      mutate(input);
      await assert.rejects(
        createDesignResourceRecoveryCheckpoint(fixture.root, input),
        pattern,
      );
    } finally {
      await fixture.cleanup();
    }
  }

  const directDecisionMeaning = await createRecoveryFixture({
    sessionId: "nonvisual-explicit-decision-meaning",
  });
  try {
    const input = clone(directDecisionMeaning.input);
    input.deltas[0].semantic_kind = "product";
    input.deltas[0].origin = "user-direct";
    input.deltas[0].decision_authority = "explicit-user";
    input.deltas[0].source_refs = ["source.product-explicit-decision"];
    input.audit_expectations.resource_decisions[0].semantic_kind = "product";
    await assert.doesNotReject(
      createDesignResourceRecoveryCheckpoint(directDecisionMeaning.root, input),
    );
  } finally {
    await directDecisionMeaning.cleanup();
  }
});

test("checkpoint update is multi-round CAS with old-state retention on conflict", async () => {
  const fixture = await createRecoveryFixture({ sessionId: "update-cas" });
  try {
    const created = await createDesignResourceRecoveryCheckpoint(
      fixture.root,
      fixture.input,
    );
    const roundTwo = clone(fixture.input);
    roundTwo.provider.run.immutable_identity = "run-revision-2";
    roundTwo.provider.resources.push({
      key: "resource.alternate",
      locator: "provider://resource/alternate",
      immutable_identity: "resource-revision-2",
      raw_byte_digest: "1".repeat(64),
    });
    roundTwo.deltas.splice(2, 0, unresolvedTaglineDelta());
    roundTwo.deltas[3].sequence = 4;
    roundTwo.decision_sets.unresolved_delta_ids = ["delta.tagline"];
    roundTwo.audit_expectations.resource_decisions.push({
      key: "resource-decision.tagline",
      resource_ref: "resource.main",
      semantic_kind: "product",
      bindings: [
        {
          binding_id: "binding.tagline",
          delta_id: "delta.tagline",
          target_key: "copy.tagline",
          final_disposition: { kind: "unresolved" },
        },
      ],
      condition_refs: ["condition.default"],
    });
    roundTwo.audit_expectations.inactive_delta_leakage.push({
      delta_id: "delta.tagline",
      reason: "unresolved",
    });
    const updated = await updateDesignResourceRecoveryCheckpoint(
      fixture.root,
      roundTwo,
      created.checkpoint_raw_byte_digest,
    );
    assert.equal(updated.status, "updated");
    const roundTwoSnapshot = await readRecoveryCheckpointFile(
      fixture.root,
      fixture.input.session_id,
    );
    assert.equal(
      roundTwoSnapshot.raw_byte_digest,
      updated.checkpoint_raw_byte_digest,
    );

    const roundThree = clone(roundTwo);
    roundThree.provider.run.immutable_identity = "run-revision-3";
    roundThree.deltas[2].status = "rejected";
    roundThree.decision_sets.rejected_delta_ids.push("delta.tagline");
    roundThree.decision_sets.unresolved_delta_ids = [];
    roundThree.audit_expectations.resource_decisions.find(
      (row) => row.key === "resource-decision.tagline",
    ).bindings[0].final_disposition = { kind: "not-adopted" };
    roundThree.audit_expectations.inactive_delta_leakage.find(
      (row) => row.delta_id === "delta.tagline",
    ).reason = "rejected";
    await assert.rejects(
      updateDesignResourceRecoveryCheckpoint(
        fixture.root,
        roundThree,
        created.checkpoint_raw_byte_digest,
      ),
      /checkpoint_update_digest_mismatch|checkpoint_update_cas_conflict/u,
    );
    const retained = await readRecoveryCheckpointFile(
      fixture.root,
      fixture.input.session_id,
    );
    assert.deepEqual(retained.bytes, roundTwoSnapshot.bytes);

    const finalUpdate = await updateDesignResourceRecoveryCheckpoint(
      fixture.root,
      roundThree,
      updated.checkpoint_raw_byte_digest,
    );
    assert.equal(finalUpdate.status, "updated");
    const inspection = await inspectDesignResourceRecovery(
      fixture.root,
      fixture.input.session_id,
    );
    assert.deepEqual(
      inspection.replay.rejected_deltas.map((delta) => delta.delta_id),
      ["delta.admin", "delta.tagline"],
    );
    assert.deepEqual(inspection.replay.unresolved_deltas, []);
    assert.equal(
      inspection.writeback.expected_post_write_raw_byte_digest,
      sha256(
        Buffer.from(
          fixture.beforeBytes
            .toString("utf8")
            .replace("color: blue", "color: red"),
          "utf8",
        ),
      ),
    );
  } finally {
    await fixture.cleanup();
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

test("only accepted same-target semantic supersession changes effective requirements", async () => {
  const valid = await createRecoveryFixture({
    sessionId: "valid-supersession",
  });
  try {
    const input = clone(valid.input);
    input.deltas.push(colorReplacement({ status: "accepted" }));
    input.decision_sets.accepted_delta_ids.push("delta.color.v2");
    const currentProposal = Buffer.from(
      fixtureText(valid.beforeBytes).replace("color: blue", "color: red"),
      "utf8",
    );
    await writeFile(path.join(valid.root, "proposal.md"), currentProposal);
    configureAcceptedColorSupersession(input, currentProposal, "purple");
    await createDesignResourceRecoveryCheckpoint(valid.root, input);
    const inspection = await inspectDesignResourceRecovery(
      valid.root,
      input.session_id,
    );
    assert.deepEqual(inspection.replay.superseded_delta_ids, ["delta.color"]);
    assert.deepEqual(
      inspection.replay.ordered_active_accepted_deltas.map(
        (delta) => delta.delta_id,
      ),
      ["delta.layout-preserved", "delta.color.v2"],
    );
  } finally {
    await valid.cleanup();
  }

  const proposal = await createRecoveryFixture({
    sessionId: "unresolved-proposal-relation",
  });
  try {
    const input = clone(proposal.input);
    input.deltas.push(
      colorReplacement({
        delta_id: "delta.color.proposal",
        status: "unresolved",
        supersedes: [],
        proposes_replacement_of: ["delta.color"],
        decision_authority: "none",
        source_refs: [],
      }),
    );
    input.decision_sets.unresolved_delta_ids.push("delta.color.proposal");
    input.audit_expectations.inactive_delta_leakage.push({
      delta_id: "delta.color.proposal",
      reason: "unresolved",
    });
    await createDesignResourceRecoveryCheckpoint(proposal.root, input);
    const inspection = await inspectDesignResourceRecovery(
      proposal.root,
      input.session_id,
    );
    assert.deepEqual(inspection.replay.superseded_delta_ids, []);
    assert.ok(
      inspection.replay.ordered_active_accepted_deltas.some(
        (delta) => delta.delta_id === "delta.color",
      ),
    );
  } finally {
    await proposal.cleanup();
  }

  for (const [name, mutate, pattern] of [
    [
      "rejected superseder",
      (delta) => {
        delta.status = "rejected";
        delta.decision_authority = "none";
        delta.source_refs = [];
      },
      /delta_superseder_not_accepted/u,
    ],
    [
      "cross target",
      (delta) => {
        delta.target_keys = ["layout.stable"];
        delta.origin = "necessary-derived";
        delta.decision_authority = "none";
        delta.source_refs = ["source.layout-stable"];
      },
      /supersedes_target_mismatch/u,
    ],
    [
      "semantic mismatch",
      (delta) => {
        delta.before_semantics = { color: "blue" };
      },
      /supersedes_semantic_mismatch/u,
    ],
    [
      "semantic kind mismatch",
      (delta) => {
        delta.semantic_kind = "product";
        delta.origin = "necessary-derived";
        delta.decision_authority = "none";
        delta.source_refs = ["source.layout-stable"];
      },
      /supersedes_semantic_kind_mismatch/u,
    ],
    [
      "unresolved superseder",
      (delta) => {
        delta.status = "unresolved";
        delta.decision_authority = "none";
        delta.source_refs = [];
      },
      /delta_superseder_not_accepted/u,
    ],
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `invalid-${name.replace(/ /gu, "-")}`,
    });
    try {
      const input = clone(fixture.input);
      const delta = colorReplacement({ status: "accepted" });
      mutate(delta);
      input.deltas.push(delta);
      if (delta.status === "accepted") {
        input.decision_sets.accepted_delta_ids.push(delta.delta_id);
        input.writeback.proposal_written_delta_ids = [delta.delta_id];
      } else if (delta.status === "rejected")
        input.decision_sets.rejected_delta_ids.push(delta.delta_id);
      else input.decision_sets.unresolved_delta_ids.push(delta.delta_id);
      await assert.rejects(
        createDesignResourceRecoveryCheckpoint(fixture.root, input),
        pattern,
      );
    } finally {
      await fixture.cleanup();
    }
  }
});

test("balanced/blocked reconciliation prevents loss, distortion and leakage", async () => {
  for (const [name, mutate] of [
    [
      "distortion",
      (audit) => (audit.requirements_to_resource[0].verdict = "distorted"),
    ],
    [
      "unsupported gain",
      (audit) => (audit.unexpected_blast_radius[0].verdict = "unexpected"),
    ],
    [
      "rejected leak",
      (audit) => (audit.inactive_delta_leakage[0].leaked = true),
    ],
    [
      "unchanged loss",
      (audit) => (audit.explicitly_unchanged[0].verdict = "changed"),
    ],
    [
      "circular authority",
      (audit) =>
        (audit.resource_to_requirements[0].requirement_bindings[0].decision_authority =
          "none"),
    ],
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

test("complete audit universes and per-key resource authority fail closed", async () => {
  for (const [name, mutate, expected] of [
    [
      "missing requirement row",
      (audit) => audit.requirements_to_resource.pop(),
      /requirements_to_resource_keys/u,
    ],
    [
      "extra requirement row",
      (audit) =>
        audit.requirements_to_resource.push({
          ...clone(audit.requirements_to_resource[0]),
          key: "copy.unexpected",
        }),
      /requirements_to_resource_keys/u,
    ],
    [
      "missing resource decision row",
      (audit) => audit.resource_to_requirements.pop(),
      /resource_decision_keys/u,
    ],
    [
      "extra resource decision row",
      (audit) => {
        const extra = clone(audit.resource_to_requirements[1]);
        extra.key = "resource-decision.extra";
        extra.requirement_bindings[0].binding_id = "binding.extra";
        extra.requirement_bindings[0].requirement_key = "copy.unexpected";
        audit.resource_to_requirements.push(extra);
      },
      /resource_decision_keys/u,
    ],
    [
      "missing blast row",
      (audit) => audit.unexpected_blast_radius.pop(),
      /unexpected_blast_radius_keys/u,
    ],
    [
      "extra blast row",
      (audit) =>
        audit.unexpected_blast_radius.push({
          key: "page.unfrozen",
          verdict: "expected",
        }),
      /unexpected_blast_radius_keys/u,
    ],
    [
      "missing unchanged row",
      (audit) => audit.explicitly_unchanged.pop(),
      /explicitly_unchanged_keys/u,
    ],
    [
      "accepted decision lacks final owner",
      (audit) =>
        (audit.resource_to_requirements[0].requirement_bindings[0].final_disposition =
          {
            kind: "not-adopted",
          }),
      /resource_decision_accepted_owner_missing/u,
    ],
    [
      "nonvisual meaning cannot be resource-owned",
      (audit) => {
        const row = audit.resource_to_requirements[0];
        row.semantic_kind = "product";
        row.requirement_bindings[0].final_disposition = {
          kind: "resource-owned-exact-visual",
          resource_ref: "resource.main",
          condition_refs: ["condition.default"],
          downstream_owner: {
            kind: "selected-source-record",
            locator: "resources/main.json",
            raw_byte_digest: audit.resource_identities[0].raw_byte_digest,
            resource_key: "resource.main",
          },
        };
      },
      /resource_decision_semantic_kind/u,
    ],
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `universe-${name.replace(/[^a-z]+/giu, "-")}`,
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
      assert.match(result.reconciliation.findings.join("\n"), expected, name);
      assert.deepEqual(
        await readFile(path.join(fixture.root, "proposal.md")),
        fixture.beforeBytes,
      );
    } finally {
      await fixture.cleanup();
    }
  }

  for (const [name, rows] of [
    ["duplicate requirement", "requirements_to_resource"],
    ["duplicate resource decision", "resource_to_requirements"],
    ["duplicate blast", "unexpected_blast_radius"],
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `duplicate-${name.replace(/ /gu, "-")}`,
    });
    try {
      await createDesignResourceRecoveryCheckpoint(fixture.root, fixture.input);
      const audit = clone(fixture.audit);
      audit[rows].push(clone(audit[rows][0]));
      await writeFile(
        path.join(fixture.root, fixture.auditLocator),
        `${JSON.stringify(audit)}\n`,
      );
      await assert.rejects(
        applyDesignResourceRecoveryWriteback(
          fixture.root,
          fixture.input.session_id,
          fixture.auditLocator,
        ),
        /audit_duplicate/u,
      );
    } finally {
      await fixture.cleanup();
    }
  }
});

test("resource-owned exact visual is frozen and never changes Proposal bytes", async () => {
  const fixture = await createRecoveryFixture({
    sessionId: "resource-owned-visual",
  });
  try {
    const input = clone(fixture.input);
    const audit = clone(fixture.audit);
    configureResourceOwnedColor(input, audit);
    const proposalBefore = await readFile(
      path.join(fixture.root, "proposal.md"),
    );
    await createDesignResourceRecoveryCheckpoint(fixture.root, input);
    await writeAudit(fixture, audit);
    const result = await reconcileDesignResourceRecovery(
      fixture.root,
      input.session_id,
      fixture.auditLocator,
    );
    assert.equal(result.status, "reconciliation-balanced");
    assert.equal(result.write_transaction, false);
    assert.deepEqual(
      await readFile(path.join(fixture.root, "proposal.md")),
      proposalBefore,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("audit cannot select or change the checkpoint-frozen final owner", async () => {
  for (const direction of ["proposal-to-resource", "resource-to-proposal"]) {
    const fixture = await createRecoveryFixture({
      sessionId: `owner-freeze-${direction}`,
    });
    try {
      const input = clone(fixture.input);
      const audit = clone(fixture.audit);
      const resourceFrozen = direction === "resource-to-proposal";
      if (resourceFrozen) configureResourceOwnedColor(input, audit);
      await createDesignResourceRecoveryCheckpoint(fixture.root, input);
      audit.resource_to_requirements[0].requirement_bindings[0].final_disposition =
        resourceFrozen
          ? {
              kind: "proposal-written",
              operation_id: "patch.visual.color",
            }
          : resourceOwnedDisposition(input);
      await writeAudit(fixture, audit);
      const proposalBefore = await readFile(
        path.join(fixture.root, "proposal.md"),
      );
      const result = resourceFrozen
        ? await reconcileDesignResourceRecovery(
            fixture.root,
            input.session_id,
            fixture.auditLocator,
          )
        : await applyDesignResourceRecoveryWriteback(
            fixture.root,
            input.session_id,
            fixture.auditLocator,
          );
      assert.equal(result.status, "blocked");
      assert.match(
        result.reconciliation.findings.join("\n"),
        /resource_decision_frozen_disposition:binding\.color/u,
      );
      assert.deepEqual(
        await readFile(path.join(fixture.root, "proposal.md")),
        proposalBefore,
      );
    } finally {
      await fixture.cleanup();
    }
  }

  const dual = await createRecoveryFixture({ sessionId: "dual-owner-shape" });
  try {
    const input = clone(dual.input);
    Object.assign(
      input.audit_expectations.resource_decisions[0].bindings[0]
        .final_disposition,
      resourceOwnedDisposition(input),
    );
    assert.throws(
      () => parseDesignResourceRecoveryCreateInput(JSON.stringify(input)),
      /final_disposition:unknown_field:(?:operation_id|resource_ref)/u,
    );
  } finally {
    await dual.cleanup();
  }
});

test("changing final owner succeeds only through checkpoint digest CAS update", async () => {
  const fixture = await createRecoveryFixture({
    sessionId: "owner-cas-update",
  });
  try {
    const created = await createDesignResourceRecoveryCheckpoint(
      fixture.root,
      fixture.input,
    );
    const input = clone(fixture.input);
    const audit = clone(fixture.audit);
    configureResourceOwnedColor(input, audit);
    const updated = await updateDesignResourceRecoveryCheckpoint(
      fixture.root,
      input,
      created.checkpoint_raw_byte_digest,
    );
    assert.equal(updated.status, "updated");
    await writeAudit(fixture, audit);
    const proposalBefore = await readFile(
      path.join(fixture.root, "proposal.md"),
    );
    const result = await reconcileDesignResourceRecovery(
      fixture.root,
      input.session_id,
      fixture.auditLocator,
    );
    assert.equal(result.status, "reconciliation-balanced");
    assert.deepEqual(
      await readFile(path.join(fixture.root, "proposal.md")),
      proposalBefore,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("mixed owners write only the proposal-owned Delta subset", async () => {
  const fixture = await createRecoveryFixture({ sessionId: "mixed-owners" });
  try {
    const input = clone(fixture.input);
    const audit = clone(fixture.audit);
    await addDelegatedResourceOwnedOpacity(fixture, input, audit);
    await createDesignResourceRecoveryCheckpoint(fixture.root, input);
    await writeAudit(fixture, audit);
    const result = await applyDesignResourceRecoveryWriteback(
      fixture.root,
      input.session_id,
      fixture.auditLocator,
    );
    assert.equal(
      result.status,
      "writeback-applied",
      result.reconciliation.findings.join("\n"),
    );
    assert.deepEqual(input.writeback.proposal_written_delta_ids, [
      "delta.color",
    ]);
    assert.deepEqual(
      input.writeback.patch.operations.map((operation) => operation.delta_id),
      ["delta.color"],
    );
    const proposal = await readFile(
      path.join(fixture.root, "proposal.md"),
      "utf8",
    );
    assert.match(proposal, /color: red/u);
    assert.doesNotMatch(proposal, /opacity/u);
  } finally {
    await fixture.cleanup();
  }
});

test("Source-owned authority projection closes target, semantic kind and meaning digest", async () => {
  for (const [name, mutate, pattern] of [
    [
      "target",
      (delta) => (delta.target_keys = ["product.admin"]),
      /explicit_user_projection_required|accepted_meaning_projection_required/u,
    ],
    [
      "semantic kind",
      (delta) => (delta.semantic_kind = "business"),
      /explicit_user_projection_required|accepted_meaning_projection_required/u,
    ],
    [
      "meaning",
      (delta) => (delta.after_semantics = { color: "purple" }),
      /explicit_user_projection_required|accepted_meaning_projection_required/u,
    ],
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `authority-projection-${name.replace(/ /gu, "-")}`,
    });
    try {
      const input = clone(fixture.input);
      const delta = input.deltas[0];
      delta.semantic_kind = "product";
      delta.origin = "user-direct";
      delta.decision_authority = "explicit-user";
      delta.source_refs = ["source.product-explicit-decision"];
      mutate(delta);
      await assert.rejects(
        validateDesignResourceAuthoritySourceItems(fixture.root, input),
        pattern,
      );
    } finally {
      await fixture.cleanup();
    }
  }
});

test("explicit meaning targets are exact while delegated nonvisual meaning is independently sourced", async () => {
  const exact = await createRecoveryFixture({ sessionId: "explicit-exact" });
  try {
    const input = clone(exact.input);
    configureExplicitProductColor(input);
    await assert.doesNotReject(
      createDesignResourceRecoveryCheckpoint(exact.root, input),
    );
  } finally {
    await exact.cleanup();
  }

  const superset = await createRecoveryFixture({
    sessionId: "explicit-target-superset",
  });
  try {
    const input = clone(superset.input);
    configureExplicitProductColor(input);
    await updateAuthorityProjection(
      superset,
      input,
      "product-explicit-decision",
      (projection) => {
        projection.target_keys = ["layout.stable", "visual.color"];
      },
      (projection) => projection.mode === "explicit-user",
    );
    await assert.rejects(
      createDesignResourceRecoveryCheckpoint(superset.root, input),
      /explicit_user_projection_required/u,
    );
  } finally {
    await superset.cleanup();
  }

  for (const [name, independent, expected] of [
    ["delegation-only", "none", /nonvisual_meaning_source_required/u],
    [
      "unrelated-requirement",
      "unrelated",
      /delegated_nonvisual_meaning_projection_required/u,
    ],
    ["matching-requirement", "matching", null],
  ]) {
    const fixture = await createRecoveryFixture({ sessionId: name });
    try {
      const input = clone(fixture.input);
      await configureDelegatedNonvisualColor(fixture, input, independent);
      if (expected)
        await assert.rejects(
          createDesignResourceRecoveryCheckpoint(fixture.root, input),
          expected,
        );
      else
        await assert.doesNotReject(
          createDesignResourceRecoveryCheckpoint(fixture.root, input),
        );
    } finally {
      await fixture.cleanup();
    }
  }
});

test("Delta red and patch purple fail during checkpoint create and update", async () => {
  const fixture = await createRecoveryFixture({ sessionId: "red-purple" });
  try {
    const input = clone(fixture.input);
    const operation = input.writeback.patch.operations[0];
    operation.after_text = "color: purple";
    operation.after_text_sha256 = sha256(operation.after_text);
    input.writeback.expected_post_write_raw_byte_digest = sha256(
      Buffer.from(
        fixtureText(fixture.beforeBytes).replace(
          "color: blue",
          "color: purple",
        ),
        "utf8",
      ),
    );
    input.writeback.patch_identity = sha256Hex(
      canonicalValueJson(input.writeback.patch),
    );
    await assert.rejects(
      createDesignResourceRecoveryCheckpoint(fixture.root, input),
      /patch_after_semantic_text_mismatch/u,
    );

    const created = await createDesignResourceRecoveryCheckpoint(
      fixture.root,
      fixture.input,
    );
    const retainedBeforeUpdate = await readRecoveryCheckpointFile(
      fixture.root,
      fixture.input.session_id,
    );
    await assert.rejects(
      updateDesignResourceRecoveryCheckpoint(
        fixture.root,
        input,
        created.checkpoint_raw_byte_digest,
      ),
      /patch_after_semantic_text_mismatch/u,
    );
    const retainedAfterUpdate = await readRecoveryCheckpointFile(
      fixture.root,
      fixture.input.session_id,
    );
    assert.deepEqual(retainedAfterUpdate.bytes, retainedBeforeUpdate.bytes);
  } finally {
    await fixture.cleanup();
  }
});

test("external selected resource remains revalidation-pending after balanced writeback", async () => {
  const fixture = await createRecoveryFixture({
    sessionId: "external-revalidation-pending",
  });
  try {
    const input = clone(fixture.input);
    input.selected_resource_bindings[0].identity_kind = "external-immutable";
    input.selected_resource_bindings[0].locator = "provider://resource/main";
    await createDesignResourceRecoveryCheckpoint(fixture.root, input);
    const result = await applyDesignResourceRecoveryWriteback(
      fixture.root,
      input.session_id,
      fixture.auditLocator,
    );
    assert.equal(result.status, "external-resource-revalidation-pending");
    assert.equal(result.write_transaction, true);
    assert.equal(result.reconciliation.status, "reconciliation-balanced");
  } finally {
    await fixture.cleanup();
  }
});

test("two active accepted owners for one semantic target fail closed", async () => {
  const fixture = await createRecoveryFixture({
    sessionId: "active-target-collision",
  });
  try {
    const input = clone(fixture.input);
    input.deltas.push({
      ...clone(input.deltas[0]),
      delta_id: "delta.color.parallel",
      sequence: 4,
    });
    input.decision_sets.accepted_delta_ids.push("delta.color.parallel");
    await assert.rejects(
      createDesignResourceRecoveryCheckpoint(fixture.root, input),
      /active_accepted_target_collision/u,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("superseded accepted meaning is required in the inactive leakage universe", async () => {
  const fixture = await createRecoveryFixture({
    sessionId: "superseded-leakage",
  });
  try {
    const input = clone(fixture.input);
    input.deltas.push(colorReplacement({ status: "accepted" }));
    input.decision_sets.accepted_delta_ids.push("delta.color.v2");
    const currentProposal = Buffer.from(
      fixtureText(fixture.beforeBytes).replace("color: blue", "color: red"),
      "utf8",
    );
    await writeFile(path.join(fixture.root, "proposal.md"), currentProposal);
    configureAcceptedColorSupersession(input, currentProposal, "purple");
    await createDesignResourceRecoveryCheckpoint(fixture.root, input);
    const audit = configureSupersessionAudit(clone(fixture.audit), input);
    audit.inactive_delta_leakage = audit.inactive_delta_leakage.filter(
      (row) => row.delta_id !== "delta.color",
    );
    await writeAudit(fixture, audit);
    const result = await applyDesignResourceRecoveryWriteback(
      fixture.root,
      input.session_id,
      fixture.auditLocator,
    );
    assert.equal(result.status, "blocked");
    assert.match(
      result.reconciliation.findings.join("\n"),
      /inactive_delta_leakage_ids/u,
    );
    assert.deepEqual(
      await readFile(path.join(fixture.root, "proposal.md")),
      currentProposal,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("superseded Proposal text projection cannot survive the active replacement", async () => {
  const fixture = await createRecoveryFixture({
    sessionId: "superseded-proposal-leakage",
  });
  try {
    const input = clone(fixture.input);
    input.deltas.push(colorReplacement({ status: "accepted" }));
    input.decision_sets.accepted_delta_ids.push("delta.color.v2");
    const currentProposal = Buffer.from(
      fixtureText(fixture.beforeBytes).replace("color: blue", "color: red"),
      "utf8",
    );
    await writeFile(path.join(fixture.root, "proposal.md"), currentProposal);
    configureAcceptedColorSupersession(input, currentProposal, "purple");
    const operation = input.writeback.patch.operations[0];
    operation.after_text = "color: purple\r\nlegacy-color: red";
    operation.after_text_sha256 = sha256(operation.after_text);
    input.writeback.expected_post_write_raw_byte_digest = sha256(
      Buffer.from(
        fixtureText(currentProposal).replace(
          "color: red",
          operation.after_text,
        ),
        "utf8",
      ),
    );
    input.writeback.patch_identity = sha256Hex(
      canonicalValueJson(input.writeback.patch),
    );
    await assert.rejects(
      createDesignResourceRecoveryCheckpoint(fixture.root, input),
      /patch_replace_scaffold_/u,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("checkpoint input rejects duplicate resource identities before indexing", async () => {
  for (const [name, mutate, pattern] of [
    [
      "provider resources",
      (input) =>
        input.provider.resources.unshift({
          ...clone(input.provider.resources[0]),
          raw_byte_digest: "0".repeat(64),
        }),
      /provider_resource_key_duplicate/u,
    ],
    [
      "selected resource bindings",
      (input) =>
        input.selected_resource_bindings.unshift({
          ...clone(input.selected_resource_bindings[0]),
          raw_byte_digest: "0".repeat(64),
        }),
      /duplicate:selected_resource_key/u,
    ],
    [
      "writeback resource identities",
      (input) =>
        input.writeback.resource_identities.unshift({
          ...clone(input.writeback.resource_identities[0]),
          raw_byte_digest: "0".repeat(64),
        }),
      /writeback_resource_identity_duplicate/u,
    ],
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `duplicate-input-${name.replace(/ /gu, "-")}`,
    });
    try {
      const input = clone(fixture.input);
      mutate(input);
      await assert.rejects(
        createDesignResourceRecoveryCheckpoint(fixture.root, input),
        pattern,
      );
    } finally {
      await fixture.cleanup();
    }
  }
});

test("duplicate identities and cross-row final-owner bindings fail closed", async () => {
  for (const [name, mutate, pattern] of [
    [
      "resource identity",
      (audit) =>
        audit.resource_identities.unshift({
          key: "resource.main",
          raw_byte_digest: "0".repeat(64),
        }),
      /audit_duplicate:resource_identity:actual/u,
    ],
    [
      "same-row binding",
      (audit) =>
        audit.resource_to_requirements[0].requirement_bindings.push(
          clone(audit.resource_to_requirements[0].requirement_bindings[0]),
        ),
      /audit_duplicate:resource_requirement_binding_ids/u,
    ],
    [
      "cross-row binding",
      (audit) => {
        const duplicate = clone(audit.resource_to_requirements[0]);
        duplicate.key = "resource-decision.color.duplicate";
        audit.resource_to_requirements.push(duplicate);
      },
      /audit_duplicate:resource_binding_id_global/u,
    ],
    [
      "two final owners",
      (audit) => {
        const duplicate = clone(audit.resource_to_requirements[0]);
        duplicate.key = "resource-decision.color.owner-two";
        duplicate.requirement_bindings[0].binding_id =
          "binding.color.owner-two";
        duplicate.requirement_bindings[0].final_disposition = {
          kind: "resource-owned-exact-visual",
          resource_ref: "resource.main",
          condition_refs: ["condition.default"],
          downstream_owner: {
            kind: "selected-source-record",
            locator: "resources/main.json",
            raw_byte_digest: audit.resource_identities.at(-1).raw_byte_digest,
            resource_key: "resource.main",
          },
        };
        audit.resource_to_requirements.push(duplicate);
      },
      /audit_duplicate:resource_binding_tuple_global/u,
    ],
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `duplicate-${name.replace(/ /gu, "-")}`,
    });
    try {
      await createDesignResourceRecoveryCheckpoint(fixture.root, fixture.input);
      const audit = clone(fixture.audit);
      mutate(audit);
      await writeAudit(fixture, audit);
      await assert.rejects(
        applyDesignResourceRecoveryWriteback(
          fixture.root,
          fixture.input.session_id,
          fixture.auditLocator,
        ),
        pattern,
      );
    } finally {
      await fixture.cleanup();
    }
  }
});

test("catalog-exact resource, condition and unchanged basis bindings block drift", async () => {
  for (const [name, mutate, pattern] of [
    [
      "requirement condition",
      (audit) =>
        (audit.requirements_to_resource[0].condition_refs = [
          "condition.hover",
        ]),
      /requirement_conditions:visual\.color/u,
    ],
    [
      "unchanged resource",
      (audit) =>
        (audit.explicitly_unchanged[0].resource_refs = ["resource.unrelated"]),
      /unchanged_resources:layout\.stable/u,
    ],
    [
      "unchanged basis",
      (audit) =>
        (audit.explicitly_unchanged[0].basis_source_refs = [
          "source.product-explicit-decision",
        ]),
      /unchanged_basis_sources:layout\.stable/u,
    ],
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `catalog-drift-${name.replace(/ /gu, "-")}`,
    });
    try {
      await createDesignResourceRecoveryCheckpoint(fixture.root, fixture.input);
      const audit = clone(fixture.audit);
      mutate(audit);
      await writeAudit(fixture, audit);
      const result = await applyDesignResourceRecoveryWriteback(
        fixture.root,
        fixture.input.session_id,
        fixture.auditLocator,
      );
      assert.equal(result.status, "blocked");
      assert.match(result.reconciliation.findings.join("\n"), pattern);
    } finally {
      await fixture.cleanup();
    }
  }
});

test("Proposal semantic projection is atomic and a source span cannot carry two meanings", async () => {
  const multiLeaf = await createRecoveryFixture({ sessionId: "multi-leaf" });
  try {
    const input = clone(multiLeaf.input);
    input.deltas[0].after_semantics = { color: "red", opacity: 0.5 };
    input.writeback.patch.operations[0].semantic_binding.after_semantics_sha256 =
      sha256Hex(canonicalValueJson(input.deltas[0].after_semantics));
    refreshPatchIdentity(input);
    await assert.rejects(
      createDesignResourceRecoveryCheckpoint(multiLeaf.root, input),
      /patch_after_semantic_leaf_count:patch\.visual\.color:2/u,
    );
  } finally {
    await multiLeaf.cleanup();
  }

  const multiDelta = await createRecoveryFixture({
    sessionId: "one-op-two-delta",
  });
  try {
    const input = clone(multiDelta.input);
    input.writeback.patch.operations[0].delta_ids = [
      "delta.color",
      "delta.other",
    ];
    assert.throws(
      () => parseDesignResourceRecoveryCreateInput(JSON.stringify(input)),
      /operations\[0\]:unknown_field:delta_ids/u,
    );
  } finally {
    await multiDelta.cleanup();
  }

  const sharedSpan = await createRecoveryFixture({ sessionId: "shared-span" });
  try {
    const input = clone(sharedSpan.input);
    await addDelegatedProposalAccent(sharedSpan, input);
    await assert.rejects(
      createDesignResourceRecoveryCheckpoint(sharedSpan.root, input),
      /patch_source_span_overlap/u,
    );
  } finally {
    await sharedSpan.cleanup();
  }
});

test("atomic replace, add and remove preserve exact operation semantics", async () => {
  for (const operation of ["replace", "add", "remove"]) {
    const fixture = await createRecoveryFixture({
      sessionId: `atomic-${operation}`,
    });
    try {
      const input = clone(fixture.input);
      const audit = clone(fixture.audit);
      const expected = await configureAtomicColorOperation(
        fixture,
        input,
        audit,
        operation,
      );
      await createDesignResourceRecoveryCheckpoint(fixture.root, input);
      await writeAudit(fixture, audit);
      const result = await applyDesignResourceRecoveryWriteback(
        fixture.root,
        input.session_id,
        fixture.auditLocator,
      );
      assert.equal(result.status, "writeback-applied");
      assert.deepEqual(
        await readFile(path.join(fixture.root, "proposal.md")),
        expected,
      );
      if (operation === "remove")
        assert.doesNotMatch(expected.toString("utf8"), /color: blue/u);
    } finally {
      await fixture.cleanup();
    }
  }

  const nestedNull = await createRecoveryFixture({
    sessionId: "atomic-nested-null-scalar",
  });
  try {
    const input = clone(nestedNull.input);
    const operation = input.writeback.patch.operations[0];
    input.deltas[0].after_semantics = { color: null };
    operation.after_text = "color: null";
    operation.after_text_sha256 = sha256(operation.after_text);
    operation.semantic_binding.after_semantics_sha256 = sha256Hex(
      canonicalValueJson(input.deltas[0].after_semantics),
    );
    operation.semantic_binding.after_text_projection = {
      semantic_path: ["color"],
      start_offset: 7,
      end_offset: 11,
    };
    input.writeback.expected_post_write_raw_byte_digest = sha256(
      Buffer.from(
        fixtureText(nestedNull.beforeBytes).replace(
          "color: blue",
          "color: null",
        ),
        "utf8",
      ),
    );
    refreshPatchIdentity(input);
    await createDesignResourceRecoveryCheckpoint(nestedNull.root, input);
  } finally {
    await nestedNull.cleanup();
  }

  const disabled = await createRecoveryFixture({
    sessionId: "remove-writes-disabled",
  });
  try {
    const input = clone(disabled.input);
    const audit = clone(disabled.audit);
    await configureAtomicColorOperation(disabled, input, audit, "remove");
    const patch = input.writeback.patch.operations[0];
    patch.after_text = "disabled";
    patch.after_text_sha256 = sha256("disabled");
    refreshPatchIdentity(input);
    await assert.rejects(
      createDesignResourceRecoveryCheckpoint(disabled.root, input),
      /patch_remove_shape/u,
    );
  } finally {
    await disabled.cleanup();
  }

  const stale = await createRecoveryFixture({
    sessionId: "remove-stale-readback",
  });
  try {
    const input = clone(stale.input);
    const audit = clone(stale.audit);
    await configureAtomicColorOperation(stale, input, audit, "remove");
    const current = await readFile(path.join(stale.root, "proposal.md"));
    assert.throws(
      () =>
        verifyDesignResourceExactPatchReadback(current, input.writeback.patch),
      /patch_remove_before_still_present/u,
    );
  } finally {
    await stale.cleanup();
  }
});

test("Proposal scalar carriers reject scaffold, control, anchor and neighboring-meaning interference", async () => {
  assert.throws(
    () =>
      renderDesignResourceProposalScalarCarrier(
        "visual.color",
        ["color"],
        "red-->permission.admin: true",
      ),
    /patch_carrier_comment_escape/u,
  );
  for (const [name, configure, pattern] of [
    [
      "replace-injects-unrelated-line",
      async (fixture, input) => {
        const operation = input.writeback.patch.operations[0];
        operation.after_text = "permission.admin: true\r\ncolor: red";
        operation.after_text_sha256 = sha256(operation.after_text);
        operation.semantic_binding.after_text_projection = {
          semantic_path: ["color"],
          start_offset: operation.after_text.lastIndexOf("red"),
          end_offset: operation.after_text.lastIndexOf("red") + 3,
        };
      },
      /patch_replace_scaffold_prefix/u,
    ],
    [
      "replace-mutates-scaffold",
      async (fixture, input) => {
        const operation = input.writeback.patch.operations[0];
        operation.after_text = "renamed-color: red";
        operation.after_text_sha256 = sha256(operation.after_text);
        operation.semantic_binding.after_text_projection = {
          semantic_path: ["color"],
          start_offset: operation.after_text.indexOf("red"),
          end_offset: operation.after_text.indexOf("red") + 3,
        };
      },
      /patch_replace_scaffold_prefix/u,
    ],
    [
      "scalar-newline-injection",
      async (fixture, input) => {
        const value = "red\npermission.admin: true";
        const operation = input.writeback.patch.operations[0];
        input.deltas[0].after_semantics = { color: value };
        operation.after_text = `color: ${value}`;
        operation.after_text_sha256 = sha256(operation.after_text);
        operation.semantic_binding.after_semantics_sha256 = sha256Hex(
          canonicalValueJson(input.deltas[0].after_semantics),
        );
        operation.semantic_binding.after_text_projection = {
          semantic_path: ["color"],
          start_offset: 7,
          end_offset: 7 + value.length,
        };
      },
      /patch_after_semantic_scalar_control/u,
    ],
    [
      "add-deletes-anchor",
      async (fixture, input, audit) => {
        await configureAtomicColorOperation(fixture, input, audit, "add");
        const operation = input.writeback.patch.operations[0];
        operation.after_text = operation.after_text.slice(
          0,
          -operation.before_text.length,
        );
        operation.after_text_sha256 = sha256(operation.after_text);
      },
      /patch_add_anchor_or_carrier/u,
    ],
    [
      "add-injects-second-record",
      async (fixture, input, audit) => {
        await configureAtomicColorOperation(fixture, input, audit, "add");
        const operation = input.writeback.patch.operations[0];
        operation.after_text += "\r\npermission.admin: true";
        operation.after_text_sha256 = sha256(operation.after_text);
      },
      /patch_add_anchor_or_carrier/u,
    ],
    [
      "remove-deletes-neighbor",
      async (fixture, input, audit) => {
        await configureAtomicColorOperation(fixture, input, audit, "remove");
        const operation = input.writeback.patch.operations[0];
        operation.before_text += "layout: compact";
        operation.before_text_sha256 = sha256(operation.before_text);
        operation.source_span.end_offset =
          operation.source_span.start_offset + operation.before_text.length;
        operation.source_span.before_text_sha256 = operation.before_text_sha256;
      },
      /patch_remove_carrier/u,
    ],
    [
      "remove-wrong-target-carrier",
      async (fixture, input, audit) => {
        await configureAtomicColorOperation(fixture, input, audit, "remove");
        const operation = input.writeback.patch.operations[0];
        const newline = fixtureText(
          await readFile(path.join(fixture.root, "proposal.md")),
        ).includes("\r\n")
          ? "\r\n"
          : "\n";
        const carrier = renderDesignResourceProposalScalarCarrier(
          "visual.opacity",
          ["color"],
          "blue",
        );
        operation.before_text = `${carrier}${newline}`;
        operation.before_text_sha256 = sha256(operation.before_text);
        operation.source_span.end_offset =
          operation.source_span.start_offset + operation.before_text.length;
        operation.source_span.before_text_sha256 = operation.before_text_sha256;
        const scalar = canonicalValueJson("blue");
        operation.semantic_binding.before_text_projection = {
          semantic_path: ["color"],
          start_offset: operation.before_text.indexOf(scalar),
          end_offset: operation.before_text.indexOf(scalar) + scalar.length,
        };
      },
      /patch_remove_carrier/u,
    ],
  ]) {
    const fixture = await createRecoveryFixture({ sessionId: name });
    try {
      const input = clone(fixture.input);
      const audit = clone(fixture.audit);
      await configure(fixture, input, audit);
      refreshPatchIdentity(input);
      await assert.rejects(
        createDesignResourceRecoveryCheckpoint(fixture.root, input),
        pattern,
      );
    } finally {
      await fixture.cleanup();
    }
  }
});

test("patch source spans come only from one original preimage and cannot overlap", async () => {
  for (const [name, configure, pattern] of [
    [
      "operation-uses-prior-output",
      async (fixture, input) => {
        await addDelegatedProposalAccent(fixture, input);
        const operation = input.writeback.patch.operations[1];
        const delta = input.deltas.find(
          (row) => row.delta_id === "delta.accent",
        );
        delta.before_semantics = { accent: "red" };
        delta.after_semantics = { accent: "green" };
        operation.before_text = "color: red";
        operation.after_text = "color: green";
        operation.before_text_sha256 = sha256(operation.before_text);
        operation.after_text_sha256 = sha256(operation.after_text);
        operation.source_span.start_offset = fixtureText(
          fixture.beforeBytes,
        ).indexOf("layout: compact");
        operation.source_span.end_offset =
          operation.source_span.start_offset + operation.before_text.length;
        operation.source_span.before_text_sha256 = operation.before_text_sha256;
        operation.semantic_binding.before_semantics_sha256 = sha256Hex(
          canonicalValueJson(delta.before_semantics),
        );
        operation.semantic_binding.after_semantics_sha256 = sha256Hex(
          canonicalValueJson(delta.after_semantics),
        );
        operation.semantic_binding.before_text_projection = {
          semantic_path: ["accent"],
          start_offset: 7,
          end_offset: 10,
        };
        operation.semantic_binding.after_text_projection = {
          semantic_path: ["accent"],
          start_offset: 7,
          end_offset: 12,
        };
      },
      /patch_source_span_preimage/u,
    ],
    [
      "partially-overlapping-operation-spans",
      async (fixture, input) => {
        await addDelegatedProposalAccent(fixture, input);
        const operation = input.writeback.patch.operations[1];
        operation.before_text = "blue\r\nlayout";
        operation.after_text = "red\r\nlayout";
        operation.before_text_sha256 = sha256(operation.before_text);
        operation.after_text_sha256 = sha256(operation.after_text);
        const start = fixtureText(fixture.beforeBytes).indexOf("blue");
        operation.source_span = {
          coordinate_system: "utf16-code-unit-v1",
          start_offset: start,
          end_offset: start + operation.before_text.length,
          before_text_sha256: operation.before_text_sha256,
        };
        operation.semantic_binding.before_text_projection = {
          semantic_path: ["accent"],
          start_offset: 0,
          end_offset: 4,
        };
        operation.semantic_binding.after_text_projection = {
          semantic_path: ["accent"],
          start_offset: 0,
          end_offset: 3,
        };
      },
      /patch_source_span_overlap/u,
    ],
    [
      "nested-operation-spans",
      async (fixture, input) => {
        await addDelegatedProposalAccent(fixture, input);
        const operation = input.writeback.patch.operations[1];
        operation.before_text = "blue";
        operation.after_text = "red";
        operation.before_text_sha256 = sha256(operation.before_text);
        operation.after_text_sha256 = sha256(operation.after_text);
        const start = fixtureText(fixture.beforeBytes).indexOf("blue");
        operation.source_span = {
          coordinate_system: "utf16-code-unit-v1",
          start_offset: start,
          end_offset: start + operation.before_text.length,
          before_text_sha256: operation.before_text_sha256,
        };
        operation.semantic_binding.before_text_projection = {
          semantic_path: ["accent"],
          start_offset: 0,
          end_offset: 4,
        };
        operation.semantic_binding.after_text_projection = {
          semantic_path: ["accent"],
          start_offset: 0,
          end_offset: 3,
        };
      },
      /patch_source_span_overlap/u,
    ],
    [
      "two-adds-share-one-insertion-anchor",
      async (fixture, input, audit) => {
        await configureAtomicColorOperation(fixture, input, audit, "add");
        await addDelegatedProposalAccent(fixture, input);
        const delta = input.deltas.find(
          (row) => row.delta_id === "delta.accent",
        );
        delta.operation = "add";
        delta.before_semantics = null;
        const operation = input.writeback.patch.operations[1];
        const newline = fixtureText(
          await readFile(path.join(fixture.root, "proposal.md")),
        ).includes("\r\n")
          ? "\r\n"
          : "\n";
        const carrier = renderDesignResourceProposalScalarCarrier(
          "visual.accent",
          ["accent"],
          "red",
        );
        operation.operation = "add";
        operation.before_text = input.writeback.patch.operations[0].before_text;
        operation.after_text = `${carrier}${newline}${operation.before_text}`;
        operation.before_text_sha256 = sha256(operation.before_text);
        operation.after_text_sha256 = sha256(operation.after_text);
        operation.source_span = clone(
          input.writeback.patch.operations[0].source_span,
        );
        operation.semantic_binding.before_semantics_sha256 = sha256Hex(
          canonicalValueJson(null),
        );
        operation.semantic_binding.before_text_projection = null;
        const scalar = canonicalValueJson("red");
        operation.semantic_binding.after_text_projection = {
          semantic_path: ["accent"],
          start_offset: operation.after_text.indexOf(scalar),
          end_offset: operation.after_text.indexOf(scalar) + scalar.length,
        };
      },
      /patch_source_span_overlap/u,
    ],
  ]) {
    const fixture = await createRecoveryFixture({ sessionId: name });
    try {
      const input = clone(fixture.input);
      const audit = clone(fixture.audit);
      await configure(fixture, input, audit);
      refreshPatchIdentity(input);
      await assert.rejects(
        createDesignResourceRecoveryCheckpoint(fixture.root, input),
        pattern,
      );
    } finally {
      await fixture.cleanup();
    }
  }
});

test("two disjoint original-preimage operations apply without coordinate drift", async () => {
  const fixture = await createRecoveryFixture({ sessionId: "disjoint-spans" });
  try {
    const input = clone(fixture.input);
    const audit = clone(fixture.audit);
    await addDelegatedProposalAccent(fixture, input);
    const newline = fixtureText(fixture.beforeBytes).includes("\r\n")
      ? "\r\n"
      : "\n";
    const beforeText = fixtureText(fixture.beforeBytes).replace(
      "layout: compact",
      `accent: blue${newline}layout: compact`,
    );
    const afterText = beforeText
      .replace("color: blue", "color: red")
      .replace("accent: blue", "accent: red");
    const beforeBytes = Buffer.from(beforeText, "utf8");
    const afterBytes = Buffer.from(afterText, "utf8");
    await writeFile(path.join(fixture.root, "proposal.md"), beforeBytes);
    const operation = input.writeback.patch.operations[1];
    operation.before_text = "accent: blue";
    operation.after_text = "accent: red";
    operation.before_text_sha256 = sha256(operation.before_text);
    operation.after_text_sha256 = sha256(operation.after_text);
    const start = beforeText.indexOf(operation.before_text);
    operation.source_span = {
      coordinate_system: "utf16-code-unit-v1",
      start_offset: start,
      end_offset: start + operation.before_text.length,
      before_text_sha256: operation.before_text_sha256,
    };
    operation.semantic_binding.before_text_projection = {
      semantic_path: ["accent"],
      start_offset: 8,
      end_offset: 12,
    };
    operation.semantic_binding.after_text_projection = {
      semantic_path: ["accent"],
      start_offset: 8,
      end_offset: 11,
    };
    input.writeback.pre_write_raw_byte_digest = sha256(beforeBytes);
    input.writeback.expected_post_write_raw_byte_digest = sha256(afterBytes);
    audit.base_raw_byte_digest = input.base.raw_byte_digest;
    audit.accepted_delta_ids.push("delta.accent");
    audit.changed_keys.push("visual.accent");
    audit.requirements_to_resource.push({
      key: "visual.accent",
      verdict: "covered",
      delta_ids: ["delta.accent"],
      resource_refs: ["resource.main"],
      condition_refs: ["condition.default"],
    });
    audit.resource_to_requirements.push({
      key: "resource-decision.accent",
      resource_ref: "resource.main",
      status: "accepted",
      semantic_kind: "exact-visual",
      delta_ids: ["delta.accent"],
      condition_refs: ["condition.default"],
      requirement_bindings: [
        {
          binding_id: "binding.accent",
          requirement_key: "visual.accent",
          delta_id: "delta.accent",
          origin: "provider-suggested",
          decision_authority: "delegated:visual-choice",
          source_refs: ["source.visual-color-delegation"],
          final_disposition: {
            kind: "proposal-written",
            operation_id: "patch.visual.accent",
          },
        },
      ],
    });
    audit.writeback_target_raw_byte_digest = sha256(afterBytes);
    refreshPatchIdentity(input);
    await createDesignResourceRecoveryCheckpoint(fixture.root, input);
    await writeAudit(fixture, audit);
    const result = await applyDesignResourceRecoveryWriteback(
      fixture.root,
      input.session_id,
      fixture.auditLocator,
    );
    assert.equal(result.status, "writeback-applied");
    assert.deepEqual(
      await readFile(path.join(fixture.root, "proposal.md")),
      afterBytes,
    );
  } finally {
    await fixture.cleanup();
  }
});

test("downstream owner is structured, digest-current and never a recovery formal-handoff label", async () => {
  const arbitrary = await createRecoveryFixture({
    sessionId: "arbitrary-owner",
  });
  try {
    const input = clone(arbitrary.input);
    const audit = clone(arbitrary.audit);
    configureResourceOwnedColor(input, audit);
    input.audit_expectations.resource_decisions[0].bindings[0].final_disposition.downstream_owner =
      "some-text";
    assert.throws(
      () => parseDesignResourceRecoveryCreateInput(JSON.stringify(input)),
      /downstream_owner:object_required/u,
    );
  } finally {
    await arbitrary.cleanup();
  }

  const formal = await createRecoveryFixture({ sessionId: "formal-label" });
  try {
    const input = clone(formal.input);
    const audit = clone(formal.audit);
    configureResourceOwnedColor(input, audit);
    input.audit_expectations.resource_decisions[0].bindings[0].final_disposition.downstream_owner =
      {
        kind: "formal-handoff-target",
        locator: "resources/main.json",
        raw_byte_digest: input.selected_resource_bindings[0].raw_byte_digest,
        resource_key: "resource.main",
      };
    assert.throws(
      () => parseDesignResourceRecoveryCreateInput(JSON.stringify(input)),
      /downstream_owner\.kind/u,
    );
  } finally {
    await formal.cleanup();
  }

  const external = await createRecoveryFixture({ sessionId: "external-only" });
  try {
    const input = clone(external.input);
    const audit = clone(external.audit);
    configureResourceOwnedColor(input, audit, { external: true });
    await createDesignResourceRecoveryCheckpoint(external.root, input);
    await writeAudit(external, audit);
    const result = await reconcileDesignResourceRecovery(
      external.root,
      input.session_id,
      external.auditLocator,
    );
    assert.equal(result.status, "external-resource-revalidation-pending");
    assert.equal(result.write_transaction, false);
  } finally {
    await external.cleanup();
  }

  const drift = await createRecoveryFixture({
    sessionId: "owner-digest-drift",
  });
  try {
    const input = clone(drift.input);
    const audit = clone(drift.audit);
    configureResourceOwnedColor(input, audit);
    await createDesignResourceRecoveryCheckpoint(drift.root, input);
    await writeAudit(drift, audit);
    await writeFile(
      path.join(drift.root, "resources/main.json"),
      '{"color":"purple"}\n',
      "utf8",
    );
    const result = await reconcileDesignResourceRecovery(
      drift.root,
      input.session_id,
      drift.auditLocator,
    );
    assert.equal(result.status, "blocked");
    assert.match(
      result.reconciliation.findings.join("\n"),
      /selected_resource:resource\.main_digest_mismatch/u,
    );
  } finally {
    await drift.cleanup();
  }
});

test("v3 recovery and audit state are never interpreted as v4", async () => {
  const fixture = await createRecoveryFixture({ sessionId: "v3-fail-closed" });
  try {
    const inputV3 = clone(fixture.input);
    inputV3.schema_version = "design-resource-recovery-input-v3";
    assert.throws(
      () => parseDesignResourceRecoveryCreateInput(JSON.stringify(inputV3)),
      /schema_version.*design-resource-recovery-input-v4/u,
    );
    const patchV3 = clone(fixture.input);
    patchV3.writeback.patch.schema_version = "design-resource-exact-patch-v3";
    assert.throws(
      () => parseDesignResourceRecoveryCreateInput(JSON.stringify(patchV3)),
      /schema_version.*design-resource-exact-patch-v4/u,
    );
    const auditV3 = clone(fixture.audit);
    auditV3.schema_version = "design-resource-reconciliation-audit-v3";
    await writeAudit(fixture, auditV3);
    await createDesignResourceRecoveryCheckpoint(fixture.root, fixture.input);
    await assert.rejects(
      applyDesignResourceRecoveryWriteback(
        fixture.root,
        fixture.input.session_id,
        fixture.auditLocator,
      ),
      /schema_version.*design-resource-reconciliation-audit-v4/u,
    );
    const checkpoint = await readRecoveryCheckpointFile(
      fixture.root,
      fixture.input.session_id,
    );
    const checkpointV3 = JSON.parse(checkpoint.bytes.toString("utf8"));
    checkpointV3.schema_version = "design-resource-recovery-checkpoint-v3";
    await writeFile(
      checkpoint.absolute,
      `${JSON.stringify(checkpointV3)}\n`,
      "utf8",
    );
    await assert.rejects(
      inspectDesignResourceRecovery(fixture.root, fixture.input.session_id),
      /schema_version.*design-resource-recovery-checkpoint-v4/u,
    );
  } finally {
    await fixture.cleanup();
  }
});

function colorReplacement(overrides = {}) {
  return {
    delta_id: "delta.color.v2",
    sequence: 4,
    supersedes: ["delta.color"],
    proposes_replacement_of: [],
    operation: "replace",
    semantic_kind: "exact-visual",
    target_keys: ["visual.color"],
    before_semantics: { color: "red" },
    after_semantics: { color: "purple" },
    origin: "provider-suggested",
    decision_authority: "delegated:visual-choice",
    evidence_refs: ["resource.main"],
    source_refs: ["source.visual-color-delegation"],
    explicitly_unchanged_keys: [],
    status: "accepted",
    ...overrides,
  };
}

function unresolvedTaglineDelta() {
  return {
    delta_id: "delta.tagline",
    sequence: 3,
    supersedes: [],
    proposes_replacement_of: [],
    operation: "replace",
    semantic_kind: "product",
    target_keys: ["copy.tagline"],
    before_semantics: { copy: "Old" },
    after_semantics: { copy: "New" },
    origin: "provider-suggested",
    decision_authority: "none",
    evidence_refs: ["resource.main"],
    source_refs: [],
    explicitly_unchanged_keys: [],
    status: "unresolved",
  };
}

function configureAcceptedColorSupersession(input, currentBytes, color) {
  input.writeback.proposal_written_delta_ids = ["delta.color.v2"];
  input.audit_expectations.changed[0].delta_ids = ["delta.color.v2"];
  const decision = input.audit_expectations.resource_decisions.find(
    (row) => row.key === "resource-decision.color",
  );
  decision.bindings = [
    {
      binding_id: "binding.color.v2",
      delta_id: "delta.color.v2",
      target_key: "visual.color",
      final_disposition: {
        kind: "proposal-written",
        operation_id: "patch.visual.color",
      },
    },
  ];
  input.audit_expectations.inactive_delta_leakage.push({
    delta_id: "delta.color",
    reason: "superseded",
  });
  const operation = input.writeback.patch.operations[0];
  operation.delta_id = "delta.color.v2";
  operation.before_text = "color: red";
  operation.after_text = `color: ${color}`;
  operation.before_text_sha256 = sha256(operation.before_text);
  operation.after_text_sha256 = sha256(operation.after_text);
  const sourceStart = fixtureText(currentBytes).indexOf(operation.before_text);
  assert.notEqual(sourceStart, -1);
  operation.source_span = {
    coordinate_system: "utf16-code-unit-v1",
    start_offset: sourceStart,
    end_offset: sourceStart + operation.before_text.length,
    before_text_sha256: operation.before_text_sha256,
  };
  operation.semantic_binding = {
    delta_id: "delta.color.v2",
    target_key: "visual.color",
    before_semantics_sha256: sha256Hex(canonicalValueJson({ color: "red" })),
    after_semantics_sha256: sha256Hex(canonicalValueJson({ color })),
    before_text_projection: {
      semantic_path: ["color"],
      start_offset: 7,
      end_offset: 10,
    },
    after_text_projection: {
      semantic_path: ["color"],
      start_offset: 7,
      end_offset: 7 + color.length,
    },
  };
  input.writeback.pre_write_raw_byte_digest = sha256(currentBytes);
  input.writeback.expected_post_write_raw_byte_digest = sha256(
    Buffer.from(
      fixtureText(currentBytes).replace("color: red", `color: ${color}`),
      "utf8",
    ),
  );
  input.writeback.patch_identity = sha256Hex(
    canonicalValueJson(input.writeback.patch),
  );
}

function configureSupersessionAudit(audit, input) {
  audit.accepted_delta_ids = clone(input.decision_sets.accepted_delta_ids);
  audit.writeback_target_raw_byte_digest =
    input.writeback.expected_post_write_raw_byte_digest;
  audit.requirements_to_resource[0].delta_ids = ["delta.color.v2"];
  const decision = audit.resource_to_requirements.find(
    (row) => row.key === "resource-decision.color",
  );
  decision.delta_ids = ["delta.color.v2"];
  decision.requirement_bindings[0] = {
    ...decision.requirement_bindings[0],
    binding_id: "binding.color.v2",
    delta_id: "delta.color.v2",
    final_disposition: {
      kind: "proposal-written",
      operation_id: "patch.visual.color",
    },
  };
  audit.inactive_delta_leakage.push({
    delta_id: "delta.color",
    inactive_reason: "superseded",
    leaked: false,
  });
  return audit;
}

async function writeAudit(fixture, audit) {
  await writeFile(
    path.join(fixture.root, fixture.auditLocator),
    `${JSON.stringify(audit, null, 2)}\n`,
    "utf8",
  );
}

function configureResourceOwnedColor(input, audit, options = {}) {
  const selected = input.selected_resource_bindings[0];
  if (options.external) {
    selected.identity_kind = "external-immutable";
    selected.locator = "provider://resource/main";
  }
  const disposition = {
    kind: "resource-owned-exact-visual",
    resource_ref: "resource.main",
    condition_refs: ["condition.default"],
    downstream_owner: {
      kind: options.external ? "external-immutable" : "selected-source-record",
      locator: selected.locator,
      raw_byte_digest: selected.raw_byte_digest,
      resource_key: "resource.main",
    },
  };
  input.audit_expectations.resource_decisions[0].bindings[0].final_disposition =
    clone(disposition);
  audit.resource_to_requirements[0].requirement_bindings[0].final_disposition =
    clone(disposition);
  delete input.writeback;
  delete audit.writeback_target_raw_byte_digest;
}

function resourceOwnedDisposition(input, options = {}) {
  const selected = input.selected_resource_bindings[0];
  return {
    kind: "resource-owned-exact-visual",
    resource_ref: "resource.main",
    condition_refs: ["condition.default"],
    downstream_owner: {
      kind: options.external ? "external-immutable" : "selected-source-record",
      locator: selected.locator,
      raw_byte_digest: selected.raw_byte_digest,
      resource_key: "resource.main",
    },
  };
}

async function addDelegatedResourceOwnedOpacity(fixture, input, audit) {
  await extendDelegationTarget(fixture, input, "visual.opacity");
  audit.base_raw_byte_digest = input.base.raw_byte_digest;
  input.base.in_scope_keys.push("visual.opacity");
  input.deltas.push({
    delta_id: "delta.opacity",
    sequence: 4,
    supersedes: [],
    proposes_replacement_of: [],
    operation: "replace",
    semantic_kind: "exact-visual",
    target_keys: ["visual.opacity"],
    before_semantics: { opacity: 1 },
    after_semantics: { opacity: 0.5 },
    origin: "provider-suggested",
    decision_authority: "delegated:visual-choice",
    evidence_refs: ["resource.main"],
    source_refs: ["source.visual-color-delegation"],
    explicitly_unchanged_keys: [],
    status: "accepted",
  });
  input.decision_sets.accepted_delta_ids.push("delta.opacity");
  input.audit_expectations.changed.push({
    key: "visual.opacity",
    delta_ids: ["delta.opacity"],
    resource_refs: ["resource.main"],
    condition_refs: ["condition.default"],
  });
  const disposition = resourceOwnedDisposition(input);
  input.audit_expectations.resource_decisions.push({
    key: "resource-decision.opacity",
    resource_ref: "resource.main",
    semantic_kind: "exact-visual",
    bindings: [
      {
        binding_id: "binding.opacity",
        delta_id: "delta.opacity",
        target_key: "visual.opacity",
        final_disposition: clone(disposition),
      },
    ],
    condition_refs: ["condition.default"],
  });
  audit.accepted_delta_ids.push("delta.opacity");
  audit.changed_keys.push("visual.opacity");
  audit.requirements_to_resource.push({
    key: "visual.opacity",
    verdict: "covered",
    delta_ids: ["delta.opacity"],
    resource_refs: ["resource.main"],
    condition_refs: ["condition.default"],
  });
  audit.resource_to_requirements.push({
    key: "resource-decision.opacity",
    resource_ref: "resource.main",
    status: "accepted",
    semantic_kind: "exact-visual",
    delta_ids: ["delta.opacity"],
    condition_refs: ["condition.default"],
    requirement_bindings: [
      {
        binding_id: "binding.opacity",
        requirement_key: "visual.opacity",
        delta_id: "delta.opacity",
        origin: "provider-suggested",
        decision_authority: "delegated:visual-choice",
        source_refs: ["source.visual-color-delegation"],
        final_disposition: clone(disposition),
      },
    ],
  });
}

async function addDelegatedProposalAccent(fixture, input) {
  await extendDelegationTarget(fixture, input, "visual.accent");
  input.base.in_scope_keys.push("visual.accent");
  input.deltas.push({
    delta_id: "delta.accent",
    sequence: 4,
    supersedes: [],
    proposes_replacement_of: [],
    operation: "replace",
    semantic_kind: "exact-visual",
    target_keys: ["visual.accent"],
    before_semantics: { accent: "blue" },
    after_semantics: { accent: "red" },
    origin: "provider-suggested",
    decision_authority: "delegated:visual-choice",
    evidence_refs: ["resource.main"],
    source_refs: ["source.visual-color-delegation"],
    explicitly_unchanged_keys: [],
    status: "accepted",
  });
  input.decision_sets.accepted_delta_ids.push("delta.accent");
  input.audit_expectations.changed.push({
    key: "visual.accent",
    delta_ids: ["delta.accent"],
    resource_refs: ["resource.main"],
    condition_refs: ["condition.default"],
  });
  input.audit_expectations.resource_decisions.push({
    key: "resource-decision.accent",
    resource_ref: "resource.main",
    semantic_kind: "exact-visual",
    bindings: [
      {
        binding_id: "binding.accent",
        delta_id: "delta.accent",
        target_key: "visual.accent",
        final_disposition: {
          kind: "proposal-written",
          operation_id: "patch.visual.accent",
        },
      },
    ],
    condition_refs: ["condition.default"],
  });
  const operation = clone(input.writeback.patch.operations[0]);
  operation.operation_id = "patch.visual.accent";
  operation.target_key = "visual.accent";
  operation.delta_id = "delta.accent";
  operation.semantic_binding = {
    ...operation.semantic_binding,
    delta_id: "delta.accent",
    target_key: "visual.accent",
    before_semantics_sha256: sha256Hex(canonicalValueJson({ accent: "blue" })),
    after_semantics_sha256: sha256Hex(canonicalValueJson({ accent: "red" })),
    before_text_projection: {
      ...operation.semantic_binding.before_text_projection,
      semantic_path: ["accent"],
    },
    after_text_projection: {
      ...operation.semantic_binding.after_text_projection,
      semantic_path: ["accent"],
    },
  };
  input.writeback.patch.operations.push(operation);
  input.writeback.proposal_written_delta_ids.push("delta.accent");
  refreshPatchIdentity(input);
}

async function configureAtomicColorOperation(fixture, input, audit, operation) {
  const newline = fixtureText(fixture.beforeBytes).includes("\r\n")
    ? "\r\n"
    : "\n";
  const original = fixtureText(fixture.beforeBytes);
  const delta = input.deltas[0];
  const patch = input.writeback.patch.operations[0];
  let before = original;
  let expected = fixtureText(fixture.afterBytes);
  patch.operation = operation;
  if (operation === "add") {
    before = original.replace(`color: blue${newline}`, "");
    const carrier = renderDesignResourceProposalScalarCarrier(
      "visual.color",
      ["color"],
      "red",
    );
    expected = before.replace(
      "layout: compact",
      `${carrier}${newline}layout: compact`,
    );
    delta.operation = "add";
    delta.before_semantics = null;
    patch.before_text = "layout: compact";
    patch.after_text = `${carrier}${newline}layout: compact`;
    patch.semantic_binding.before_text_projection = null;
    const scalar = canonicalValueJson("red");
    patch.semantic_binding.after_text_projection = {
      semantic_path: ["color"],
      start_offset: patch.after_text.indexOf(scalar),
      end_offset: patch.after_text.indexOf(scalar) + scalar.length,
    };
  } else if (operation === "remove") {
    const carrier = renderDesignResourceProposalScalarCarrier(
      "visual.color",
      ["color"],
      "blue",
    );
    before = original.replace("color: blue", carrier);
    expected = before.replace(`${carrier}${newline}`, "");
    delta.operation = "remove";
    delta.after_semantics = null;
    patch.before_text = `${carrier}${newline}`;
    patch.after_text = "";
    const scalar = canonicalValueJson("blue");
    patch.semantic_binding.before_text_projection = {
      semantic_path: ["color"],
      start_offset: patch.before_text.indexOf(scalar),
      end_offset: patch.before_text.indexOf(scalar) + scalar.length,
    };
    patch.semantic_binding.after_text_projection = null;
  }
  patch.before_text_sha256 = sha256(patch.before_text);
  patch.after_text_sha256 = sha256(patch.after_text);
  patch.semantic_binding.before_semantics_sha256 = sha256Hex(
    canonicalValueJson(delta.before_semantics),
  );
  patch.semantic_binding.after_semantics_sha256 = sha256Hex(
    canonicalValueJson(delta.after_semantics),
  );
  const spanStart = before.indexOf(patch.before_text);
  assert.notEqual(spanStart, -1);
  patch.source_span = {
    coordinate_system: "utf16-code-unit-v1",
    start_offset: spanStart,
    end_offset: spanStart + patch.before_text.length,
    before_text_sha256: patch.before_text_sha256,
  };
  const beforeBytes = Buffer.from(before, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  await writeFile(path.join(fixture.root, "proposal.md"), beforeBytes);
  input.writeback.pre_write_raw_byte_digest = sha256(beforeBytes);
  input.writeback.expected_post_write_raw_byte_digest = sha256(expectedBytes);
  audit.writeback_target_raw_byte_digest =
    input.writeback.expected_post_write_raw_byte_digest;
  refreshPatchIdentity(input);
  return expectedBytes;
}

function configureExplicitProductColor(input) {
  input.deltas[0].semantic_kind = "product";
  input.deltas[0].origin = "user-direct";
  input.deltas[0].decision_authority = "explicit-user";
  input.deltas[0].source_refs = ["source.product-explicit-decision"];
  input.audit_expectations.resource_decisions[0].semantic_kind = "product";
}

async function configureDelegatedNonvisualColor(fixture, input, independent) {
  input.deltas[0].semantic_kind = "product";
  input.audit_expectations.resource_decisions[0].semantic_kind = "product";
  input.delegations[0].allowed_semantic_kinds.push("product");
  await updateAuthorityProjection(
    fixture,
    input,
    "visual-color-delegation",
    (projection) => projection.allowed_semantic_kinds.push("product"),
    (projection) => projection.mode === "delegation",
  );
  const meaningProjection = {
    schema_version: "ty-dra-authority-v1",
    mode: "explicit-user",
    target_keys: ["visual.color"],
    semantic_kinds: ["product"],
    allowed_origins: ["provider-suggested"],
    meaning_sha256: sha256Hex(canonicalValueJson({ color: "red" })),
  };
  await appendAuthorityProjection(
    fixture,
    input,
    "visual-color-delegation",
    meaningProjection,
  );
  if (independent !== "none")
    input.deltas[0].source_refs.push("source.layout-stable");
  if (independent === "matching")
    await appendAuthorityProjection(
      fixture,
      input,
      "layout-stable",
      meaningProjection,
    );
}

async function extendDelegationTarget(fixture, input, target) {
  input.delegations[0].allowed_target_keys.push(target);
  await updateAuthorityProjection(
    fixture,
    input,
    "visual-color-delegation",
    (projection) => projection.allowed_target_keys.push(target),
    (projection) => projection.mode === "delegation",
  );
}

async function updateAuthorityProjection(
  fixture,
  input,
  itemKey,
  mutate,
  predicate,
) {
  await mutateAuthorityItem(fixture, input, itemKey, (body) => {
    let count = 0;
    const lines = body.split("\n").map((line) => {
      const match = /^<!-- ty-dra-authority-v1 (\{.*\}) -->$/u.exec(line);
      if (!match) return line;
      const projection = JSON.parse(match[1]);
      if (!predicate(projection)) return line;
      mutate(projection);
      count += 1;
      return `<!-- ty-dra-authority-v1 ${JSON.stringify(projection)} -->`;
    });
    assert.equal(count, 1);
    return lines.join("\n");
  });
}

async function appendAuthorityProjection(fixture, input, itemKey, projection) {
  await mutateAuthorityItem(
    fixture,
    input,
    itemKey,
    (body) =>
      `${body}\n<!-- ty-dra-authority-v1 ${JSON.stringify(projection)} -->`,
  );
}

async function mutateAuthorityItem(fixture, input, itemKey, mutate) {
  const absolute = path.join(fixture.root, ...input.base.locator.split("/"));
  const current = await readFile(absolute, "utf8");
  const newline = current.includes("\r\n") ? "\r\n" : "\n";
  const marker = `<!-- ty-source-item:start key=${itemKey} kind=`;
  const markerStart = current.indexOf(marker);
  assert.notEqual(markerStart, -1);
  const bodyStart = current.indexOf(newline, markerStart) + newline.length;
  const bodyEnd = current.indexOf(
    `${newline}<!-- ty-source-item:end -->`,
    bodyStart,
  );
  assert.notEqual(bodyEnd, -1);
  const body = current.slice(bodyStart, bodyEnd).replace(/\r\n?|\n/gu, "\n");
  const nextBody = mutate(body);
  const next = `${current.slice(0, bodyStart)}${nextBody.replace(/\n/gu, newline)}${current.slice(bodyEnd)}`;
  const bytes = Buffer.from(next, "utf8");
  await writeFile(absolute, bytes);
  const rawDigest = sha256(bytes);
  input.base.raw_byte_digest = rawDigest;
  for (const source of input.authority_sources)
    if (source.locator === input.base.locator)
      source.raw_byte_digest = rawDigest;
  const source = input.authority_sources.find(
    (row) => row.source_item_key === itemKey,
  );
  assert.ok(source);
  source.source_item_text_sha256 = sha256(nextBody);
}

function refreshPatchIdentity(input) {
  input.writeback.patch_identity = sha256Hex(
    canonicalValueJson(input.writeback.patch),
  );
}

function fixtureText(bytes) {
  return bytes.toString("utf8");
}
