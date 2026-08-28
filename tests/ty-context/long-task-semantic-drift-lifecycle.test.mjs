import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import {
  computeAuthorityHashes,
  isMonotonicAcceptanceStrengthening,
} from "../../packages/ty-context/dist/lib/long-task-authority.js";
import {
  semanticConformanceRequired,
  validateSemanticConformance,
} from "../../packages/ty-context/dist/lib/long-task-conformance-policy.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { createUpgradePlan } from "../../packages/ty-context/dist/lib/migrations.js";
import {
  commitCandidate,
  createDeliveryFixture,
  deliveryContract,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("read-only Product Conformance is required only for weak, complex deliveries", () => {
  const simple = deliveryContract();
  simple.risk.facts.weak_observability = ["first"];
  assert.equal(semanticConformanceRequired(simple, "strict"), false);

  const staged = deliveryContract({ twoOutcomes: true });
  staged.risk.facts.weak_observability = ["first"];
  assert.equal(semanticConformanceRequired(staged, "strict"), true);
  assert.throws(
    () => validateSemanticConformance(staged, "strict", []),
    /semantic_conformance_check_required/u,
  );

  staged.global.acceptance.external_confirmations = [
    {
      key: "unsupported-conformance",
      description:
        "All cross-stage semantic conformance remains externally blocked.",
      owner: "external-owner",
      kind: "field_validation",
      impact_claims: ["first.result", "second.result"],
      blocks_target: true,
    },
  ];
  const blockingReachability = {
    effective_external_routes: staged.outcomes.map((outcome) => ({
      outcome_key: outcome.key,
      claim_ref: `${outcome.key}.result`,
      local_claim_ref: "result",
      applicability_ref: outcome.product.result_applicability_refs[0],
      target_ref: "fixture-app",
      authority: "external_confirmation",
      status: "external_fulfillable",
      completion_role: "blocking",
      acceptance_effect: "required",
    })),
  };
  assert.doesNotThrow(() =>
    validateSemanticConformance(
      staged,
      "strict",
      [],
      undefined,
      blockingReachability,
    ),
  );
  staged.global.acceptance.external_confirmations[0].blocks_target = false;
  assert.throws(
    () => validateSemanticConformance(staged, "strict", []),
    /semantic_conformance_check_required/u,
  );
  staged.global.acceptance.external_confirmations = [];

  const conformance = structuredClone(staged.outcomes[0].acceptance.checks[0]);
  conformance.key = "product-conformance";
  conformance.journey_roles = ["conformance"];
  conformance.positive_assertions[0].key = "product-conformance-result";
  conformance.positive_assertions[0].claims = ["global-conformance"];
  conformance.runner.effect = "read_only";
  staged.global.acceptance.checks.push(conformance);
  const compiled = compiledCheck(staged, conformance, null);
  compiled.raw_execution_identity = "independent-conformance-runtime";
  assert.doesNotThrow(() =>
    validateSemanticConformance(staged, "strict", [compiled]),
  );
});

test("an advisory raw global Check cannot supply Machine conformance after Freeze", () => {
  const contract = deliveryContract({ twoOutcomes: true });
  contract.risk.facts.weak_observability = ["first"];
  const advisory = structuredClone(
    contract.outcomes[0].acceptance.checks[0],
  );
  advisory.key = "advisory-conformance";
  advisory.journey_roles = ["conformance"];
  advisory.runner.effect = "read_only";
  advisory.positive_assertions[0].key = "advisory-conformance-result";
  advisory.positive_assertions[0].claims = ["global-conformance"];
  contract.global.acceptance.checks.push(advisory);

  const projected = compiledCheck(contract, advisory, null);
  projected.positive_assertions = projected.positive_assertions.filter(
    (assertion) => assertion.claims.length === 0,
  );
  projected.negative_assertions = [];
  projected.observation_authorities = [];
  projected.raw_execution_identity = "independent-advisory-conformance";

  assert.throws(
    () => validateSemanticConformance(contract, "strict", [projected]),
    /conformance_target_runtime_evidence_required:advisory-conformance/u,
  );
});

test("partial result applicability takeover cannot waive Machine conformance", () => {
  const contract = deliveryContract({ twoOutcomes: true });
  contract.risk.facts.weak_observability = ["first"];
  const first = contract.outcomes[0];
  const privileged = {
    ...structuredClone(first.applicability[0]),
    key: "first-privileged-success",
    dimensions: [{ key: "fixture-user", value: "privileged" }],
  };
  first.applicability.push(privileged);
  first.product.result_applicability_refs.push(privileged.key);
  const blockingRow = (outcome, applicabilityRef) => ({
    outcome_key: outcome.key,
    claim_ref: `${outcome.key}.result`,
    local_claim_ref: "result",
    applicability_ref: applicabilityRef,
    target_ref: outcome.applicability.find(
      (profile) => profile.key === applicabilityRef,
    ).target_ref,
    authority: "external_confirmation",
    status: "external_fulfillable",
    completion_role: "blocking",
    acceptance_effect: "required",
  });
  const partialReachability = {
    effective_external_routes: [
      blockingRow(first, "first-root-success"),
      blockingRow(
        contract.outcomes[1],
        contract.outcomes[1].product.result_applicability_refs[0],
      ),
    ],
  };

  assert.throws(
    () =>
      validateSemanticConformance(
        contract,
        "strict",
        [],
        undefined,
        partialReachability,
      ),
    /semantic_conformance_check_required/u,
  );
  partialReachability.effective_external_routes.push(
    blockingRow(first, privileged.key),
  );
  assert.doesNotThrow(() =>
    validateSemanticConformance(
      contract,
      "strict",
      [],
      undefined,
      partialReachability,
    ),
  );
});

test("Verifier capability strengthening is monotonic while weakening and target changes are protected", () => {
  const baseline = deliveryContract({ externalConfirmation: true });
  const strengthened = structuredClone(baseline);
  strengthened.outcomes[0].acceptance.checks[0].positive_assertions[0].evidence_capabilities.push(
    "input_variation",
  );
  assert.equal(
    isMonotonicAcceptanceStrengthening(baseline, strengthened),
    true,
  );
  assert.equal(
    isMonotonicAcceptanceStrengthening(strengthened, baseline),
    false,
  );

  const changedExternal = structuredClone(baseline);
  changedExternal.global.acceptance.external_confirmations[0].kind =
    "functional_prerequisite";
  changedExternal.global.acceptance.external_confirmations[0].blocks_target = true;
  assert.equal(
    isMonotonicAcceptanceStrengthening(baseline, changedExternal),
    false,
  );

  const changedTarget = structuredClone(baseline);
  changedTarget.task.target_profile.required_state = "production_release_ready";
  assert.notEqual(
    computeAuthorityHashes(baseline).product_authority_hash,
    computeAuthorityHashes(changedTarget).product_authority_hash,
  );
});

test("old V2 Contracts receive an indexed manual migration instead of synthesized proof", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const old = structuredClone(fixture.contract);
    delete old.task.target_profile.required_target_refs;
    delete old.outcomes[0].stage;
    delete old.outcomes[0].acceptance.checks[0].scenario;
    delete old.outcomes[0].acceptance.checks[0].positive_assertions[0]
      .evidence_capabilities;
    old.global.acceptance.external_confirmations = [
      {
        key: "legacy-blocking-external",
        description: "Legacy blocking confirmation without exact authority.",
        owner: "product-owner",
        kind: "field_validation",
        impact_claims: ["first.result"],
        blocks_target: true,
      },
    ];
    delete old.task.target_profile.completion_authority;
    await writeContract(fixture.workdir, old);

    assert.throws(
      () => parseDeliveryContractText(YAML.stringify(old)),
      /long_task_delivery_v2_semantic_drift_migration_required:[\s\S]*task\.target_profile\.required_target_refs/u,
    );
    const plan = await createUpgradePlan(fixture.root);
    const migration = plan.manual_required.find(
      (item) => item.id === "long-task-v2-semantic-drift-authority",
    );
    assert.ok(migration);
    assert.match(migration.message, /Re-author these meanings from Source/u);
    assert.match(migration.message, /required_target_refs/u);
    assert.match(migration.message, /identity_assurance|actor/u);
    assert.match(
      migration.message,
      /completion_authority=declared_authorities_or_remove_blocking_external/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("[critical:terminal-state-current-evidence] Stage frontier and terminal target state derive from current evidence and the Final Gate", async () => {
  const fixture = await createDeliveryFixture({
    twoOutcomes: true,
    checkTimeoutMs: 60_000,
  });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

    let status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.deepEqual(status.stages, { first: "ready", second: "locked" });
    assert.deepEqual(status.ready_outcomes, ["first"]);
    assert.equal(status.target_state, "not_accepted");

    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.stages.first, "progress_passing");
    assert.equal(status.stages.second, "ready");
    assert.deepEqual(status.ready_outcomes, ["second"]);

    const failed = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(failed.workflow_status, "needs_work");
    assert.equal(failed.target_state, "not_accepted");
    assert.deepEqual(failed.stage_results, {
      first: "passed",
      second: "failed",
    });

    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({
        first: true,
        second: true,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    await commitCandidate(fixture.root);
    const accepted = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(accepted.workflow_status, "machine_accepted");
    assert.equal(accepted.target_state, "target_profile_usable");
    assert.deepEqual(accepted.stage_results, {
      first: "passed",
      second: "passed",
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("targeted verification is not gated by the acceptance frontier", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);

    const before = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.deepEqual(before.ready_outcomes, ["first"]);
    assert.deepEqual(before.ready_for_implementation, ["first"]);
    assert.equal(before.stages.second, "locked");
    const resumed = await runCli(fixture.root, [
      "long-task",
      "resume",
      fixture.workdir,
    ]);
    assert.match(
      resumed.next_safe_action,
      /advisory acceptance\/verification frontier/u,
    );
    assert.match(
      resumed.next_safe_action,
      /Implementation order remains Goal-owned/u,
    );
    assert.doesNotMatch(
      resumed.next_safe_action,
      /Implement and verify ready Outcome/u,
    );

    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({
        first: true,
        second: true,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    const verified = await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "second",
    ]);
    assert.equal(verified.acceptance_authorized, false);
    assert.equal(verified.check_results[0].status, "passed");

    const after = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(after.outcomes.first, "unverified");
    assert.equal(after.outcomes.second, "progress_passing");
    assert.equal(after.stages.second, "locked");
    assert.deepEqual(after.ready_outcomes, ["first"]);
    assert.deepEqual(after.ready_for_implementation, ["first"]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function compiledCheck(contract, declared, outcomeKey) {
  const check = structuredClone(declared);
  const target = contract.task.execution_targets.find(
    (candidate) => candidate.key === check.execution_target.target_ref,
  );
  const assertions = [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ];
  return {
    ...check,
    internal_id: `CHECK.${outcomeKey ?? "GLOBAL"}.${check.key}`,
    outcome_key: outcomeKey,
    execution_target_definition: target,
    known_execution_targets: contract.task.execution_targets,
    completion_role: "semantic",
    observation_authorities: assertions
      .filter((assertion) => assertion.claims.length > 0)
      .map((assertion) => ({
        assertion_ref: assertion.key,
        claim_refs: assertion.claims,
        target_ref: check.execution_target.target_ref,
        proof_surface: check.proof_surface,
        evidence_capabilities: assertion.evidence_capabilities,
        authority: "package_process_json_exact",
      })),
    raw_execution_identity: `raw-${check.key}`,
  };
}
