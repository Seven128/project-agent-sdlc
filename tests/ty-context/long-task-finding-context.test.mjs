import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
} from "./long-task-delivery-fixtures.mjs";

test("Verify, Status and Resume retain Source-Claim-AC repair context", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({
        first: false,
        second: false,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    await writeFile(
      path.join(fixture.root, "tests", "semantic-false.json"),
      `${JSON.stringify({
        first: false,
        second: true,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const failed = await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    const finding = failed.findings.find(
      (item) => item.assertion_key === "first-requirement",
    );
    assert.equal(finding.code, "assertion_value_mismatch");
    assert.deepEqual(finding.source_claim_keys, ["first-observable"]);
    assert.ok(finding.claim_keys.includes("requirement.observe-first"));
    assert.equal(
      finding.criterion,
      "first satisfies its observable requirement.",
    );
    assert.equal(finding.observation, "requirement_result");
    assert.equal(finding.expected, true);
    assert.equal(finding.actual, false);
    assert.deepEqual(finding.owner_paths, [
      "src/**",
      "bin/**",
      "tests/oracle.mjs",
      "tests/legacy-oracle.mjs",
    ]);
    assert.ok(finding.source_fragment_refs.length > 0);
    assert.ok(finding.expected_authority_refs.length > 0);
    assert.ok(
      finding.actual_evidence_refs.some((reference) =>
        reference.startsWith("execution:"),
      ),
    );
    assert.deepEqual(finding.implementation_owner, {
      label: "fixture",
      path_globs: [
        "src/**",
        "bin/**",
        "tests/oracle.mjs",
        "tests/legacy-oracle.mjs",
      ],
    });
    assert.equal(finding.verification_owner.kind, "machine_check");
    assert.equal(finding.verification_owner.check_key, "first-check");
    assert.ok(
      finding.invalidation_reasons.includes("assertion_value_mismatch"),
    );
    assert.ok(finding.rerun_obligation_refs.length > 0);
    assert.match(finding.next_action, /acceptance assertion/u);

    const semanticFinding = failed.findings.find(
      (item) => item.assertion_key === "first-semantic-fact",
    );
    assert.deepEqual(semanticFinding.fact_refs, ["fact.first.observable"]);
    assert.deepEqual(semanticFinding.proof_obligation_refs, [
      "proof.first.observable.exact",
    ]);
    assert.ok(
      semanticFinding.expected_authority_refs.some((reference) =>
        reference.includes("proof.first.observable.exact"),
      ),
    );

    assert.equal(
      failed.repair_frontier.schema_version,
      "long-task-repair-frontier-v1",
    );
    assert.equal(failed.repair_frontier.authority_scope, "derived_diagnostic_only");
    assert.equal(failed.repair_frontier.acceptance_authorized, false);
    assert.equal(failed.repair_frontier.persisted, false);
    assert.deepEqual(
      failed.repair_frontier.minimum_diagnostic_reverify.map(
        (check) => check.check_ref,
      ),
      ["first.first-check"],
    );
    assert.equal(
      failed.repair_frontier.final_gate_requirement,
      "complete_one_snapshot_rerun_still_required",
    );
    assert.ok(
      failed.repair_frontier.forbidden_authority_changes_without_revision.fields.includes(
        "Expected",
      ),
    );
    assert.ok(
      failed.repair_frontier.forbidden_authority_changes_without_revision.protected_paths.includes(
        "source.md",
      ),
    );

    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.deepEqual(
      status.findings.find((item) => item.assertion_key === "first-requirement")
        .source_claim_keys,
      ["first-observable"],
    );
    assert.equal(status.repair_frontier.persisted, false);
    assert.deepEqual(
      status.repair_frontier.minimum_diagnostic_reverify.map(
        (check) => check.check_ref,
      ),
      ["first.first-check"],
    );
    const resume = await runCli(fixture.root, [
      "long-task",
      "resume",
      fixture.workdir,
    ]);
    assert.equal(
      resume.recent_findings.find(
        (item) => item.assertion_key === "first-requirement",
      ).observation,
      "requirement_result",
    );
    assert.equal(
      resume.repair_frontier.final_gate_requirement,
      "complete_one_snapshot_rerun_still_required",
    );

    const explain = await runCli(fixture.root, [
      "long-task",
      "explain",
      fixture.workdir,
    ]);
    const source = explain.source_items.find(
      (item) => item.key === "first-observable",
    );
    assert.deepEqual(source.links[0].assertions, ["first-requirement"]);
    assert.deepEqual(source.links[0].checks, ["first-check"]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Repair Frontier preserves unrelated fresh diagnostic progress", async () => {
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
    const second = await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "second",
    ]);
    assert.deepEqual(
      second.repair_frontier.minimum_diagnostic_reverify.map(
        (check) => check.check_ref,
      ),
      ["second.second-check"],
    );
    assert.ok(
      second.repair_frontier.still_valid_diagnostic_evidence.some(
        (reference) => reference.startsWith("progress:first.first-check:passed:"),
      ),
    );

    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.deepEqual(
      status.repair_frontier.minimum_diagnostic_reverify.map(
        (check) => check.check_ref,
      ),
      ["second.second-check"],
    );
    assert.equal(
      status.repair_frontier.summary.still_valid_progress_records,
      1,
    );
    assert.equal(status.repair_frontier.acceptance_authorized, false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
