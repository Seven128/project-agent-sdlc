import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import test from "node:test";
import YAML from "yaml";
import { compileProductClaimCoverage } from "../../packages/ty-context/dist/lib/long-task-claims.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { classifyWorkspaceScope } from "../../packages/ty-context/dist/lib/long-task-workspace-scope.js";
import {
  createDeliveryFixture,
  deliveryContract,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { addGlobalClaim } from "./long-task-global-evidence-sensitivity-fixture.mjs";

test("Global non-goals, constraints, and forbidden shortcuts require Global Check coverage", () => {
  const nonGoal = deliveryContract();
  nonGoal.global.product.non_goals.push({
    key: "no-legacy",
    statement: "Legacy behavior is not allowed.",
    applicability_refs: [ensureGlobalApplicability(nonGoal)],
  });
  assert.throws(
    () => parse(nonGoal),
    /global_claim_uncovered:GLOBAL\.non_goal\.no-legacy/u,
  );

  const constraint = deliveryContract();
  constraint.global.technical.constraints.push({
    key: "stable-runtime",
    statement: "Runtime behavior remains stable.",
    applicability_refs: [ensureGlobalApplicability(constraint)],
  });
  assert.throws(
    () => parse(constraint),
    /global_claim_uncovered:GLOBAL\.constraint\.stable-runtime/u,
  );

  const shortcut = deliveryContract();
  shortcut.global.technical.forbidden_shortcuts.push({
    key: "self-report",
    statement: "Self-report is not proof.",
    applicability_refs: [ensureGlobalApplicability(shortcut)],
  });
  shortcut.global.acceptance.checks.push(
    makeGlobalCheck(shortcut, {
      positive: ["forbidden_shortcut.self-report"],
    }),
  );
  assert.throws(
    () => parse(shortcut),
    /global_negative_claim_proof_required:forbidden_shortcut\.self-report/u,
  );
});

test("negative Global non-goal/shortcut proof and positive constraint proof compile", () => {
  const contract = deliveryContract();
  contract.global.product.non_goals.push({
    key: "no-legacy",
    statement: "Legacy behavior is not allowed.",
    applicability_refs: [ensureGlobalApplicability(contract)],
  });
  contract.global.technical.constraints.push({
    key: "stable-runtime",
    statement: "Runtime behavior remains stable.",
    applicability_refs: [ensureGlobalApplicability(contract)],
  });
  contract.global.technical.forbidden_shortcuts.push({
    key: "self-report",
    statement: "Self-report is not proof.",
    applicability_refs: [ensureGlobalApplicability(contract)],
  });
  contract.global.acceptance.checks.push(
    makeGlobalCheck(contract, {
      positive: ["constraint.stable-runtime"],
      negative: ["non_goal.no-legacy", "forbidden_shortcut.self-report"],
    }),
  );
  const parsed = parse(contract);
  const coverage = compileProductClaimCoverage(parsed);
  assert.equal(coverage.summary.claims_total, 10);
  assert.equal(
    coverage.summary.claims_by_global["non_goal.no-legacy"].covered,
    true,
  );
  assert.equal(
    coverage.summary.claims_by_global["constraint.stable-runtime"].covered,
    true,
  );
  assert.equal(
    coverage.summary.claims_by_global["forbidden_shortcut.self-report"].covered,
    true,
  );
});

test("Global and Outcome Assertions cannot cross Claim scope", () => {
  const globalToOutcome = deliveryContract();
  globalToOutcome.global.acceptance.checks.push(
    makeGlobalCheck(globalToOutcome, { positive: ["first.result"] }),
  );
  assert.throws(
    () => parse(globalToOutcome),
    /global_assertion_claim_cross_scope:first\.result/u,
  );

  const outcomeToGlobal = deliveryContract();
  outcomeToGlobal.global.technical.constraints.push({
    key: "stable-runtime",
    statement: "Runtime behavior remains stable.",
    applicability_refs: [ensureGlobalApplicability(outcomeToGlobal)],
  });
  outcomeToGlobal.global.acceptance.checks.push(
    makeGlobalCheck(outcomeToGlobal, {
      positive: ["constraint.stable-runtime"],
    }),
  );
  outcomeToGlobal.outcomes[0].acceptance.checks[0].positive_assertions[0].claims =
    ["constraint.stable-runtime"];
  assert.throws(
    () => parse(outcomeToGlobal),
    /assertion_claim_cross_scope:first:constraint\.stable-runtime/u,
  );

  const unknown = deliveryContract();
  unknown.global.acceptance.checks.push(
    makeGlobalCheck(unknown, { positive: ["constraint.missing"] }),
  );
  assert.throws(
    () => parse(unknown),
    /global_assertion_claim_unknown:constraint\.missing/u,
  );
});

test("Source Claims cannot cite an uncovered Global Claim", () => {
  const contract = deliveryContract();
  contract.global.technical.constraints.push({
    key: "stable-runtime",
    statement: "Runtime behavior remains stable.",
    applicability_refs: [ensureGlobalApplicability(contract)],
  });
  contract.source_claims[0].disposition = {
    type: "global_constraint",
    refs: ["constraint.stable-runtime"],
  };
  assert.throws(
    () => parse(contract),
    /source_claim_global_ref_uncovered:first-observable:constraint\.stable-runtime/u,
  );
});

test("Global forbidden paths stay outside Claim coverage and remain statically enforced", () => {
  const contract = deliveryContract();
  const parsed = parse(contract);
  const coverage = compileProductClaimCoverage(parsed);
  assert.equal(coverage.by_global.length, 0);
  assert.deepEqual(
    classifyWorkspaceScope(contract, ["secrets/token.txt"], []).forbidden,
    ["secrets/token.txt"],
  );
});

test("Global coverage appears in compile/explain and a failing Global Check blocks Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await addGlobalClaim(fixture, { counterfactual: true });
    const globalCheck = fixture.contract.global.acceptance.checks.find(
      (check) => check.key === "global-state-check",
    );
    assert.ok(globalCheck);
    globalCheck.positive_assertions[0].expected = false;
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    const compiled = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.equal(
      compiled.claim_coverage.claims_by_global["constraint.global-state"]
        .covered,
      true,
    );
    const explained = await runCli(fixture.root, [
      "long-task",
      "explain",
      fixture.workdir,
    ]);
    assert.ok(
      explained.claims.some(
        (claim) => claim.claim === "GLOBAL.constraint.global-state",
      ),
    );
    assert.ok(
      explained.claims.some((claim) => claim.claim === "OUTCOME.first.result"),
    );

    const receipt = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(receipt.workflow_status, "needs_work");
    assert.ok(
      receipt.check_results.some(
        (check) =>
          check.outcome_key === null &&
          check.check_key === "global-state-check" &&
          check.status !== "passed",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function makeGlobalCheck(
  contract,
  { positive = [], negative = [], expected = true },
) {
  const applicabilityRef = ensureGlobalApplicability(contract);
  const check = structuredClone(contract.outcomes[0].acceptance.checks[0]);
  check.key = "global-claim-check";
  check.positive_assertions = positive.length
    ? [
        ...positive.map((claim, index) => ({
          key: index === 0 ? "global-positive" : `global-positive-${index + 1}`,
          criterion: "The declared Global positive Claim is satisfied.",
          claims: [claim],
          applicability_ref: applicabilityRef,
          observation: `global_positive_${index + 1}`,
          evidence_capabilities: ["target_runtime", "presence"],
          operator: "equals",
          expected,
        })),
        {
          key: "global-liveness",
          criterion: "The product target remains live.",
          claims: [],
          observation: "target_live",
          evidence_capabilities: ["target_runtime"],
          operator: "equals",
          expected: true,
        },
      ]
    : [];
  check.negative_assertions = negative.length
    ? negative.map((claim, index) => ({
        key: index === 0 ? "global-negative" : `global-negative-${index + 1}`,
        criterion: "The declared Global negative Claim is satisfied.",
        claims: [claim],
        applicability_ref: applicabilityRef,
        observation: `global_negative_${index + 1}`,
        evidence_capabilities: ["target_runtime", "presence"],
        operator: "equals",
        expected: false,
      }))
    : [];
  return check;
}

function ensureGlobalApplicability(contract) {
  const key = "global-root-success";
  if (!contract.global.applicability.some((item) => item.key === key))
    contract.global.applicability.push({
      key,
      target_ref: "fixture-app",
      journey_role: "success",
      dimensions: [{ key: "fixture-state", value: "loaded" }],
      given_refs: ["fixture-loaded"],
      when_refs: ["read-outcome"],
    });
  return key;
}

function parse(contract) {
  return parseDeliveryContractText(YAML.stringify(contract));
}
