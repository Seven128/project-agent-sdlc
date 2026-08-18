import assert from "node:assert/strict";
import { access, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { buildAuthorityRevisionDecisionBrief } from "../../packages/ty-context/dist/lib/long-task-authority-revision-brief.js";
import {
  createDeliveryFixture,
  fixtureArchitectureSourceItem,
  fixtureExecutionTargetSourceItem,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("[critical:protected-revision-classification] semantic or proof changes are previewed but never candidate-executed", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    const runtimeBefore = await readRuntimeProjection(fixture.workdir);

    const candidate = structuredClone(fixture.contract);
    candidate.outcomes[0].product.owner.path_globs.push("shared/**");
    candidate.outcomes[1].product.owner.label = "changed product owner";
    candidate.outcomes[0].acceptance.checks[0].artifact_globs = [
      "artifacts/replacement.json",
    ];
    await writeContract(fixture.workdir, candidate);
    const diagnosis = await runCli(fixture.root, [
      "long-task",
      "diagnose-revision",
      fixture.workdir,
    ]);
    assert.equal(diagnosis.status, "protected_change_previewed");
    assert.equal(
      diagnosis.revision.change_class,
      "protected_semantic_or_proof_change",
    );
    assert.equal(diagnosis.diagnostics_executed, false);
    assert.deepEqual(diagnosis.check_results, []);
    assert.equal(
      diagnosis.revision.approval_summary.product_semantics_changed,
      true,
    );
    assert.equal(
      diagnosis.revision.approval_summary.acceptance_or_proof_weakened,
      true,
    );
    assert.equal(
      diagnosis.revision.approval_summary.write_scope_expanded,
      true,
    );
    assert.deepEqual(diagnosis.revision.approval_summary.affected_outcomes, [
      "first",
      "second",
    ]);
    assert.ok(
      diagnosis.revision.approval_summary.protected_reasons.includes(
        "artifact_removed",
      ),
    );
    assert.equal(diagnosis.revision.user_decision_required, true);
    assert.match(
      diagnosis.revision.decision_brief.overview,
      /proposed replacement of the locked delivery contract/iu,
    );
    assert.match(
      diagnosis.revision.decision_brief.headline,
      /User decision required/iu,
    );
    assert.match(
      diagnosis.revision.decision_brief.approval_reason,
      /protected delivery meaning|proof|execution authority/iu,
    );
    assert.ok(
      diagnosis.revision.decision_brief.material_changes.some((change) =>
        /Product Claims or semantics changed/iu.test(change),
      ),
    );
    assert.ok(
      diagnosis.revision.decision_brief.material_changes.some((change) =>
        /Acceptance or proof was reduced/iu.test(change),
      ),
    );
    assert.deepEqual(diagnosis.revision.decision_brief.affected_outcomes, [
      "first",
      "second",
    ]);
    assert.ok(
      diagnosis.revision.approval_summary.protected_reasons.includes(
        "owner_path_expanded",
      ),
    );
    assert.deepEqual(
      await readRuntimeProjection(fixture.workdir),
      runtimeBefore,
    );

    const pending = await runCliFailure(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(
      pending.pending_authority_revision.revision_identity,
      diagnosis.revision.revision_identity,
    );
    assert.deepEqual(
      pending.pending_authority_revision.decision_brief,
      diagnosis.revision.decision_brief,
    );
    assert.match(pending.next_action, /Authority Revision brief:/u);
    assert.match(
      pending.next_action,
      new RegExp(diagnosis.revision.revision_identity, "u"),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("additive verification dependencies remain automatic and are summarized", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

    await writeFile(
      path.join(fixture.root, "tests", "extra.mjs"),
      "export const extraProofDependency = true;\n",
    );
    fixture.contract.outcomes[0].acceptance.checks[0].verification_inputs.push(
      "tests/extra.mjs",
    );
    await writeContract(fixture.workdir, fixture.contract);
    const revised = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(revised.status, "compiled");
    assert.equal(revised.lifecycle_event, "authority_revision_adopted");
    assert.equal(revised.delivery_completed_by_this_event, false);
    assert.equal(revised.native_goal_effect, "none");
    assert.match(revised.next_action, /rolling implementation|repair/iu);
    assert.equal(revised.authority_revision, 2);
    assert.equal(
      revised.authority_revision_change.change_class,
      "monotonic_evidence_strengthening",
    );
    assert.equal(revised.authority_revision_change.approval_required, false);
    assert.deepEqual(
      revised.authority_revision_change.approval_summary
        .added_verification_dependencies,
      ["first.first-check:tests/extra.mjs"],
    );
    assert.match(
      revised.authority_revision_change.decision_brief.headline,
      /No user decision is required/iu,
    );
    assert.match(
      revised.authority_revision_change.decision_brief.if_approved[0],
      /may be atomically adopted without user approval/iu,
    );
    assert.equal(
      await exists(
        path.join(
          fixture.workdir,
          ".ty-context",
          "authority-revision-pending.json",
        ),
      ),
      false,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("widening Counterfactual allowed fan-out is a protected proof reduction", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

    const control =
      fixture.contract.outcomes[0].acceptance.counterfactual_controls[0];
    control.allowed_fanout_assertions = ["first-relations-na"];
    await writeContract(fixture.workdir, fixture.contract);

    const diagnosis = await runCli(fixture.root, [
      "long-task",
      "diagnose-revision",
      fixture.workdir,
    ]);
    assert.equal(diagnosis.status, "protected_change_previewed");
    assert.equal(
      diagnosis.revision.change_class,
      "protected_semantic_or_proof_change",
    );
    assert.equal(diagnosis.revision.user_decision_required, true);
    assert.equal(
      diagnosis.revision.approval_summary.acceptance_or_proof_weakened,
      true,
    );
    assert.ok(
      diagnosis.revision.approval_summary.protected_reasons.includes(
        "counterfactual_removed",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("narrowing Counterfactual allowed fan-out preserves authority coverage", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const control =
      fixture.contract.outcomes[0].acceptance.counterfactual_controls[0];
    control.allowed_fanout_assertions = ["first-relations-na"];
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

    control.allowed_fanout_assertions = [];
    await writeContract(fixture.workdir, fixture.contract);
    const revised = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(revised.status, "compiled");
    assert.equal(
      revised.authority_revision_change.change_class,
      "monotonic_evidence_strengthening",
    );
    assert.equal(revised.authority_revision_change.approval_required, false);
    assert.equal(
      revised.authority_revision_change.approval_summary.protected_reasons.includes(
        "counterfactual_removed",
      ),
      false,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("protected summaries enumerate removed Source and external-confirmation keys", async () => {
  const fixture = await createDeliveryFixture({ externalConfirmation: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await writeFile(
      path.join(fixture.root, "source.md"),
      `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->
<a id="fixture-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=first-observable kind=requirement -->
The first outcome must be observable.
<!-- ty-source-item:end -->

${fixtureArchitectureSourceItem()}

${fixtureExecutionTargetSourceItem()}
`,
    );
    fixture.contract.source_claims = fixture.contract.source_claims.filter(
      (claim) => claim.key !== "fixture-external",
    );
    fixture.contract.global.acceptance.external_confirmations = [];
    await writeContract(fixture.workdir, fixture.contract);

    const pending = await runCliFailure(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    const summary = pending.pending_authority_revision.approval_summary;
    assert.equal(pending.delivery_completed_by_this_event, false);
    assert.equal(pending.native_goal_effect, "none");
    assert.deepEqual(summary.source_claim_changes, [
      "fixture-external:removed",
    ]);
    assert.deepEqual(summary.external_confirmation_changes, [
      "fixture-external:removed",
    ]);
    assert.equal(summary.external_confirmations_changed, true);
    const brief = pending.pending_authority_revision.decision_brief;
    assert.match(
      brief.headline,
      /Source\/Claims[\s\S]*external confirmations/iu,
    );
    assert.ok(
      brief.material_changes.some((change) =>
        /fixture-external:removed/u.test(change),
      ),
    );
    assert.match(pending.next_action, /previous Authority remains active/iu);
    assert.match(pending.next_action, /do not complete delivery/iu);
    assert.match(pending.next_action, /Final Gate remains mandatory/iu);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("decision brief names verifier, runner, and risk changes without raw payloads", () => {
  const brief = buildAuthorityRevisionDecisionBrief(
    {
      product_semantics_changed: false,
      global_or_technical_semantics_changed: false,
      source_or_claims_changed: false,
      context_authority_changed: false,
      acceptance_or_proof_weakened: false,
      verifier_or_runner_changed: true,
      verifier_content_changed: false,
      verifier_files_changed: [],
      write_scope_expanded: false,
      risk_changed: true,
      external_confirmations_changed: false,
      semantic_fields_changed: [],
      source_claim_changes: [],
      product_claim_changes: [],
      proof_reductions: [],
      external_confirmation_changes: [],
      added_verification_dependencies: [],
      expanded_owner_paths: [],
      expanded_expected_change_paths: [],
      expanded_allowed_support_paths: [],
      user_decision_reasons: [],
      mechanically_bounded_reasons: [],
      protected_reasons: [
        "runner_definition_changed",
        "risk_changed_requires_review",
      ],
      affected_outcomes: ["first"],
    },
    "protected_semantic_or_proof_change",
    true,
  );

  assert.match(brief.headline, /verifier\/runner[\s\S]*risk/iu);
  assert.deepEqual(brief.material_changes, [
    "Verifier or runner authority changed.",
    "The effective risk authority changed.",
  ]);
  assert.deepEqual(brief.affected_outcomes, ["first"]);
});

async function exists(file) {
  return access(file).then(
    () => true,
    () => false,
  );
}

async function readRuntimeProjection(workdir) {
  const runtimeRoot = path.join(workdir, ".ty-context");
  const progressFolder = path.join(runtimeRoot, "progress");
  const progressNames = await readdir(progressFolder).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  return {
    compiled: await optionalText(
      path.join(runtimeRoot, "compiled-contract.json"),
    ),
    pending: await optionalText(
      path.join(runtimeRoot, "authority-revision-pending.json"),
    ),
    approved: await optionalText(
      path.join(runtimeRoot, "authority-revision-approved.json"),
    ),
    final: await optionalText(path.join(runtimeRoot, "final-receipt.json")),
    progress: await Promise.all(
      progressNames
        .filter((name) => name.endsWith(".json"))
        .sort()
        .map(async (name) => [
          name,
          await readFile(path.join(progressFolder, name), "utf8"),
        ]),
    ),
  };
}

async function optionalText(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
