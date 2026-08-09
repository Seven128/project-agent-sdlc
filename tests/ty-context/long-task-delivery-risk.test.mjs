import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyLongTaskRisk,
  validateRiskProof,
} from "../../packages/ty-context/dist/lib/long-task-risk.js";
import { deliveryContract } from "./long-task-delivery-fixtures.mjs";

test("ordinary Contract is standard and explicit strict raises it", () => {
  const standard = deliveryContract({ twoOutcomes: true });
  assert.equal(classifyLongTaskRisk(standard).effective_level, "standard");
  standard.risk.requested_level = "strict";
  assert.equal(classifyLongTaskRisk(standard).effective_level, "strict");
});

for (const fact of [
  "security_boundary_change",
  "permission_boundary_change",
  "data_migration",
  "persistent_data_change",
  "public_api_or_schema_change",
  "full_population_operation",
  "irreversible_external_effect",
]) {
  test(`${fact} binds strict risk to its Outcome`, () => {
    const contract = deliveryContract();
    contract.risk.facts[fact] = ["first"];
    const decision = classifyLongTaskRisk(contract);
    assert.equal(decision.effective_level, "strict");
    assert.ok(decision.reasons.includes(`${fact}:first`));
    assert.ok(decision.reasons_by_outcome.first.includes(fact));
  });
}

test("unknown risk Outcome and multi-repository delivery fail closed", () => {
  const unknown = deliveryContract();
  unknown.risk.facts.security_boundary_change = ["missing"];
  assert.throws(() => classifyLongTaskRisk(unknown), /risk_outcome_unknown/);
  const multi = deliveryContract();
  multi.risk.facts.multi_repository_change = ["first"];
  assert.throws(
    () => classifyLongTaskRisk(multi),
    /multi_repository_delivery_not_supported_v2/,
  );
});

test("critical user path triggers strict only on the same weakly observable Outcome", () => {
  const contract = deliveryContract({ twoOutcomes: true });
  contract.risk.facts.critical_user_path = ["first"];
  contract.risk.facts.weak_observability = ["second"];
  assert.equal(classifyLongTaskRisk(contract).effective_level, "standard");
  contract.risk.facts.weak_observability = ["first"];
  const decision = classifyLongTaskRisk(contract);
  assert.equal(decision.effective_level, "strict");
  assert.ok(
    decision.reasons.includes(
      "critical_user_path_with_weak_observability:first",
    ),
  );
});

test("requested standard below the deterministic floor fails", () => {
  const contract = deliveryContract();
  contract.risk.requested_level = "standard";
  contract.risk.facts.security_boundary_change = ["first"];
  assert.throws(
    () => classifyLongTaskRisk(contract),
    /risk_level_below_required/,
  );
});

test("strict security proof is required on the affected Outcome, not elsewhere", () => {
  const contract = deliveryContract({ twoOutcomes: true });
  contract.risk.facts.security_boundary_change = ["second"];
  const firstCheck = contract.outcomes[0].acceptance.checks[0];
  contract.outcomes[1].acceptance.checks[0].negative_assertions = [];
  firstCheck.proof_surface = "security_boundary";
  firstCheck.negative_assertions.push({
    key: "first-negative",
    criterion: "The strict negative proof remains explicit.",
    claims: ["result"],
    observation: "result",
    evidence_capabilities: ["state_delta"],
    operator: "not_equals",
    expected: false,
  });
  contract.outcomes[0].acceptance.counterfactual_controls.push({
    key: "first-counterfactual",
    binding_key: "state-first",
    claims: ["obligation.implement-first"],
    check_key: firstCheck.key,
    mutation: { type: "remove_paths", paths: ["src/state.json"] },
    expected_assertion_failures: ["first-result"],
  });
  const decision = classifyLongTaskRisk(contract);
  assert.throws(() => validateRiskProof(contract, decision), (error) => {
    assert.match(error.message, /strict_security_boundary_proof_required:second/);
    assert.match(error.message, /strict_negative_assertion_required:second/);
    assert.match(error.message, /strict_counterfactual_control_required:second/);
    return true;
  });
});

test("user-requested strict requires falsifiable proof on every Outcome", () => {
  const contract = deliveryContract({ twoOutcomes: true });
  contract.risk.requested_level = "strict";
  contract.outcomes[0].acceptance.checks[0].negative_assertions = [];
  assert.throws(
    () => validateRiskProof(contract, classifyLongTaskRisk(contract)),
    /strict_negative_assertion_required:first[\s\S]*strict_counterfactual_control_required:second/,
  );
});

test("a blocking result External Confirmation permits no machine Check but a non-blocking confirmation does not", () => {
  const contract = deliveryContract();
  contract.outcomes[0].acceptance.checks = [];
  contract.risk.facts.critical_user_path = ["first"];
  contract.risk.facts.weak_observability = ["first"];
  contract.global.acceptance.external_confirmations = [
    {
      key: "unsupported-observation",
      description: "The unsupported result remains externally blocked.",
      owner: "external-owner",
      kind: "field_validation",
      impact_claims: ["first.result"],
      blocks_target: true,
    },
  ];
  assert.doesNotThrow(() =>
    validateRiskProof(contract, classifyLongTaskRisk(contract)),
  );

  contract.global.acceptance.external_confirmations[0].blocks_target = false;
  assert.throws(
    () => validateRiskProof(contract, classifyLongTaskRisk(contract)),
    /outcome_without_executable_check:first[\s\S]*strict_critical_path_observable_proof_required:first/u,
  );
});
