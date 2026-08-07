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
import {
  applyDesignResourceRecoveryWriteback,
  createDesignResourceRecoveryCheckpoint,
  inspectDesignResourceRecovery,
  previewDesignResourceRecoveryWriteback,
  removeDesignResourceRecoveryCheckpoint,
  updateDesignResourceRecoveryCheckpoint,
} from "../../packages/ty-context/dist/lib/design-resource-recovery.js";
import {
  canonicalValueJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
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
            "design-resource-recovery-input-v3",
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
    input.audit_expectations.resource_decisions[0].allowed_final_dispositions =
      ["proposal-written"];
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
        },
      ],
      condition_refs: ["condition.default"],
      allowed_final_dispositions: ["unresolved"],
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
    ).allowed_final_dispositions = ["not-adopted"];
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
        input.writeback.accepted_delta_ids = [
          delta.delta_id,
          "delta.layout-preserved",
        ];
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

test("resource-owned exact visual is an allowed single final owner", async () => {
  const fixture = await createRecoveryFixture({
    sessionId: "resource-owned-visual",
  });
  try {
    await createDesignResourceRecoveryCheckpoint(fixture.root, fixture.input);
    const audit = clone(fixture.audit);
    audit.resource_to_requirements[0].requirement_bindings[0].final_disposition =
      {
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
    await writeFile(
      path.join(fixture.root, fixture.auditLocator),
      `${JSON.stringify(audit)}\n`,
    );
    const result = await applyDesignResourceRecoveryWriteback(
      fixture.root,
      fixture.input.session_id,
      fixture.auditLocator,
    );
    assert.equal(result.status, "writeback-applied");
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
      /superseded_before_text_leakage/u,
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

test("downstream owner must be structured, readable and digest-current", async () => {
  const arbitrary = await createRecoveryFixture({
    sessionId: "arbitrary-owner",
  });
  try {
    await createDesignResourceRecoveryCheckpoint(
      arbitrary.root,
      arbitrary.input,
    );
    const audit = clone(arbitrary.audit);
    audit.resource_to_requirements[0].requirement_bindings[0].final_disposition =
      {
        kind: "resource-owned-exact-visual",
        resource_ref: "resource.main",
        condition_refs: ["condition.default"],
        downstream_owner: "some-text",
      };
    await writeAudit(arbitrary, audit);
    await assert.rejects(
      applyDesignResourceRecoveryWriteback(
        arbitrary.root,
        arbitrary.input.session_id,
        arbitrary.auditLocator,
      ),
      /downstream_owner:object_required/u,
    );
  } finally {
    await arbitrary.cleanup();
  }

  for (const [name, configure, pattern] of [
    [
      "external-only",
      (input, audit) => {
        input.selected_resource_bindings[0].identity_kind =
          "external-immutable";
        input.selected_resource_bindings[0].locator =
          "provider://resource/main";
        audit.resource_to_requirements[0].requirement_bindings[0].final_disposition =
          {
            kind: "resource-owned-exact-visual",
            resource_ref: "resource.main",
            condition_refs: ["condition.default"],
            downstream_owner: {
              kind: "selected-source-record",
              locator: "provider://resource/main",
              raw_byte_digest: audit.resource_identities[0].raw_byte_digest,
              resource_key: "resource.main",
            },
          };
      },
      /external_only_final_owner/u,
    ],
    [
      "digest-drift",
      (_input, audit) => {
        audit.resource_to_requirements[0].requirement_bindings[0].final_disposition =
          {
            kind: "resource-owned-exact-visual",
            resource_ref: "resource.main",
            condition_refs: ["condition.default"],
            downstream_owner: {
              kind: "selected-source-record",
              locator: "resources/main.json",
              raw_byte_digest: "0".repeat(64),
              resource_key: "resource.main",
            },
          };
      },
      /selected_source_owner_identity_mismatch/u,
    ],
    [
      "formal-handoff-kind-mismatch",
      (_input, audit) => {
        audit.resource_to_requirements[0].requirement_bindings[0].final_disposition =
          {
            kind: "resource-owned-exact-visual",
            resource_ref: "resource.main",
            condition_refs: ["condition.default"],
            downstream_owner: {
              kind: "formal-handoff-target",
              locator: "resources/main.json",
              raw_byte_digest: audit.resource_identities[0].raw_byte_digest,
              target_key: "visual.color",
            },
          };
      },
      /formal_handoff_owner_binding_mismatch/u,
    ],
  ]) {
    const fixture = await createRecoveryFixture({
      sessionId: `owner-${name}`,
    });
    try {
      const input = clone(fixture.input);
      const audit = clone(fixture.audit);
      configure(input, audit);
      await createDesignResourceRecoveryCheckpoint(fixture.root, input);
      await writeAudit(fixture, audit);
      const result = await applyDesignResourceRecoveryWriteback(
        fixture.root,
        input.session_id,
        fixture.auditLocator,
      );
      assert.equal(result.status, "blocked");
      assert.match(result.reconciliation.findings.join("\n"), pattern);
    } finally {
      await fixture.cleanup();
    }
  }
});

test("v2 recovery and audit state are never interpreted as v3", async () => {
  const fixture = await createRecoveryFixture({ sessionId: "v2-fail-closed" });
  try {
    const inputV2 = clone(fixture.input);
    inputV2.schema_version = "design-resource-recovery-input-v2";
    assert.throws(
      () => parseDesignResourceRecoveryCreateInput(JSON.stringify(inputV2)),
      /schema_version.*design-resource-recovery-input-v3/u,
    );
    const auditV2 = clone(fixture.audit);
    auditV2.schema_version = "design-resource-reconciliation-audit-v2";
    await writeAudit(fixture, auditV2);
    await createDesignResourceRecoveryCheckpoint(fixture.root, fixture.input);
    await assert.rejects(
      applyDesignResourceRecoveryWriteback(
        fixture.root,
        fixture.input.session_id,
        fixture.auditLocator,
      ),
      /schema_version.*design-resource-reconciliation-audit-v3/u,
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
  input.writeback.accepted_delta_ids = [
    "delta.color.v2",
    "delta.layout-preserved",
  ];
  input.audit_expectations.changed[0].delta_ids = ["delta.color.v2"];
  const decision = input.audit_expectations.resource_decisions.find(
    (row) => row.key === "resource-decision.color",
  );
  decision.bindings = [
    {
      binding_id: "binding.color.v2",
      delta_id: "delta.color.v2",
      target_key: "visual.color",
    },
  ];
  input.audit_expectations.inactive_delta_leakage.push({
    delta_id: "delta.color",
    reason: "superseded",
  });
  const operation = input.writeback.patch.operations[0];
  operation.delta_ids = ["delta.color.v2"];
  operation.before_text = "color: red";
  operation.after_text = `color: ${color}`;
  operation.before_text_sha256 = sha256(operation.before_text);
  operation.after_text_sha256 = sha256(operation.after_text);
  operation.semantic_bindings = [
    {
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
    },
  ];
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
  audit.accepted_delta_ids = clone(input.writeback.accepted_delta_ids);
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

function fixtureText(bytes) {
  return bytes.toString("utf8");
}
