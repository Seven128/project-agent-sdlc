import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyLongTaskRisk,
  validateRiskProof,
} from "../../packages/ty-context/dist/lib/long-task-risk.js";
import { validateDeliveryStages } from "../../packages/ty-context/dist/lib/long-task-stage-policy.js";
import { validateExecutionTargets } from "../../packages/ty-context/dist/lib/long-task-target-policy.js";
import {
  addProductionControlBinding,
  completeControl,
  deliveryContract,
} from "./long-task-delivery-fixtures.mjs";

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
  assert.throws(
    () => validateRiskProof(contract, decision),
    (error) => {
      assert.match(
        error.message,
        /strict_security_boundary_proof_required:second/,
      );
      assert.match(error.message, /strict_negative_assertion_required:second/);
      assert.match(
        error.message,
        /strict_counterfactual_control_required:second/,
      );
      return true;
    },
  );
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

test("raw blocking declaration cannot waive strict proof when Reachability makes it advisory", () => {
  const contract = deliveryContract();
  contract.outcomes[0].acceptance.checks = [];
  contract.outcomes[0].acceptance.counterfactual_controls = [];
  contract.risk.requested_level = "strict";
  contract.global.acceptance.external_confirmations = [
    {
      key: "unsupported-observation",
      description: "The raw declaration is not completion authority.",
      owner: "external-owner",
      kind: "field_validation",
      impact_claims: ["first.result"],
      blocks_target: true,
    },
  ];
  const advisoryReachability = {
    effective_external_routes: [
      {
        outcome_key: "first",
        claim_ref: "first.result",
        local_claim_ref: "result",
        applicability_ref: "first-root-success",
        target_ref: "fixture-app",
        authority: "external_confirmation",
        status: "external_fulfillable",
        completion_role: "advisory",
        acceptance_effect: "none",
      },
    ],
  };
  assert.throws(
    () =>
      validateRiskProof(
        contract,
        classifyLongTaskRisk(contract),
        advisoryReachability,
      ),
    (error) => {
      assert.match(error.message, /outcome_without_executable_check:first/u);
      assert.match(error.message, /strict_negative_assertion_required:first/u);
      assert.match(
        error.message,
        /strict_counterfactual_control_required:first/u,
      );
      return true;
    },
  );
});

test("an exact effective blocking result route can take over strict machine proof", () => {
  const contract = deliveryContract();
  contract.outcomes[0].acceptance.checks = [];
  contract.outcomes[0].acceptance.counterfactual_controls = [];
  contract.risk.requested_level = "strict";
  contract.task.target_profile.completion_authority = "declared_authorities";
  contract.global.acceptance.external_confirmations = [
    {
      key: "unsupported-observation",
      description: "The exact result is externally completed.",
      owner: "external-owner",
      kind: "field_validation",
      impact_claims: ["first.result"],
      blocks_target: true,
    },
  ];
  const blockingReachability = {
    effective_external_routes: [
      {
        outcome_key: "first",
        claim_ref: "first.result",
        local_claim_ref: "result",
        applicability_ref: "first-root-success",
        target_ref: "fixture-app",
        authority: "external_confirmation",
        status: "external_fulfillable",
        completion_role: "blocking",
        acceptance_effect: "required",
      },
    ],
  };
  assert.doesNotThrow(() =>
    validateRiskProof(
      contract,
      classifyLongTaskRisk(contract),
      blockingReachability,
    ),
  );
});

test("an advisory raw negative Assertion cannot satisfy strict Machine proof after Freeze", () => {
  const contract = deliveryContract();
  contract.risk.requested_level = "strict";
  const outcome = contract.outcomes[0];
  const machineCheck = outcome.acceptance.checks[0];
  const rawNegative = machineCheck.negative_assertions[0];
  assert.ok(rawNegative);
  machineCheck.negative_assertions = [];
  outcome.acceptance.counterfactual_controls = [
    {
      key: "retained-machine-counterfactual",
      binding_key: "state-first",
      claims: ["result"],
      check_key: machineCheck.key,
      mutation: {
        type: "replace_json_value",
        path: "src/state.json",
        pointer: "/first",
        value: false,
      },
      expected_assertion_failures: ["first-result"],
      preserved_assertions: ["first-liveness"],
      allowed_fanout_assertions: [],
    },
  ];
  const advisoryCheck = structuredClone(machineCheck);
  advisoryCheck.key = "advisory-negative-check";
  advisoryCheck.negative_assertions = [
    { ...structuredClone(rawNegative), key: "advisory-negative" },
  ];
  outcome.acceptance.checks.push(advisoryCheck);

  const compiledMachine = compiledCheck(contract, machineCheck, "first", [
    "first-result",
  ]);
  const advisoryLiveness = advisoryCheck.positive_assertions.find(
    (assertion) => assertion.key === "first-liveness",
  );
  assert.ok(advisoryLiveness);
  const compiledAdvisory = compiledCheck(
    contract,
    {
      ...advisoryCheck,
      positive_assertions: [advisoryLiveness],
      negative_assertions: [],
    },
    "first",
    [],
  );

  assert.throws(
    () =>
      validateRiskProof(
        contract,
        classifyLongTaskRisk(contract),
        advisoryReachability("first-root-success", "advisory"),
        [compiledOutcome(outcome, [compiledMachine, compiledAdvisory])],
      ),
    /strict_negative_assertion_required:first/u,
  );
});

test("an advisory raw stage_gate Check cannot supply Machine gate proof after Freeze", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  const machineCheck = outcome.acceptance.checks[0];
  machineCheck.journey_roles = ["success"];
  const advisoryCheck = structuredClone(machineCheck);
  advisoryCheck.key = "advisory-stage-gate";
  advisoryCheck.journey_roles = ["stage_gate"];
  advisoryCheck.positive_assertions = advisoryCheck.positive_assertions.map(
    (assertion) => ({
      ...assertion,
      key: `advisory-stage-${assertion.key}`,
    }),
  );
  outcome.acceptance.checks.push(advisoryCheck);

  const compiledMachine = compiledCheck(contract, machineCheck, "first", [
    "first-result",
  ]);
  const advisoryLiveness = advisoryCheck.positive_assertions.find(
    (assertion) => assertion.claims.length === 0,
  );
  assert.ok(advisoryLiveness);
  const compiledAdvisory = compiledCheck(
    contract,
    {
      ...advisoryCheck,
      positive_assertions: [advisoryLiveness],
      negative_assertions: [],
    },
    "first",
    [],
  );

  assert.throws(
    () =>
      validateDeliveryStages(contract, undefined, {
        acceptance_reachability: advisoryReachability(
          "first-root-success",
          "advisory",
        ),
        compiled_outcomes: [
          compiledOutcome(outcome, [compiledMachine, compiledAdvisory]),
        ],
      }),
    /stage_gate_target_runtime_result_required:first:first/u,
  );
});

test("one blocking result applicability cannot waive a second Machine applicability", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  addResultApplicability(outcome, "first-privileged-success", "success");
  outcome.acceptance.checks = [];
  outcome.acceptance.counterfactual_controls = [];
  contract.risk.requested_level = "strict";

  assert.throws(
    () =>
      validateRiskProof(
        contract,
        classifyLongTaskRisk(contract),
        blockingReachability(["first-root-success"]),
        [compiledOutcome(outcome, [])],
      ),
    /outcome_without_executable_check:first|strict_negative_assertion_required:first/u,
  );
});

test("same-target partial External takeover cannot waive the remaining target applicability", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  addResultApplicability(outcome, "first-privileged-success", "success");
  contract.risk.facts.critical_user_path = ["first"];
  const compiled = compiledCheck(
    contract,
    outcome.acceptance.checks[0],
    "first",
    [],
  );

  assert.throws(
    () =>
      validateExecutionTargets(contract, undefined, {
        acceptance_reachability: blockingReachability([
          "first-root-success",
        ]),
        compiled_outcomes: [compiledOutcome(outcome, [compiled])],
      }),
    /critical_path_required_target_proof_missing:first:fixture-app/u,
  );
});

test("a blocking success applicability cannot waive a separate stage_gate applicability", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  addResultApplicability(outcome, "first-stage-gate", "stage_gate");
  outcome.acceptance.checks = [];

  assert.throws(
    () =>
      validateDeliveryStages(contract, undefined, {
        acceptance_reachability: blockingReachability([
          "first-root-success",
        ]),
        compiled_outcomes: [compiledOutcome(outcome, [])],
      }),
    /stage_gate_check_required:first:first|stage_gate_target_runtime_result_required:first:first/u,
  );
});

test("all exact result applicabilities may be taken over by blocking External routes", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  addResultApplicability(outcome, "first-stage-gate", "stage_gate");
  outcome.acceptance.checks = [];
  outcome.acceptance.counterfactual_controls = [];
  contract.risk.requested_level = "strict";
  contract.risk.facts.critical_user_path = ["first"];
  const reachability = blockingReachability([
    "first-root-success",
    "first-stage-gate",
  ]);
  const compiledOutcomes = [compiledOutcome(outcome, [])];

  assert.doesNotThrow(() =>
    validateRiskProof(
      contract,
      classifyLongTaskRisk(contract),
      reachability,
      compiledOutcomes,
    ),
  );
  assert.doesNotThrow(() =>
    validateDeliveryStages(contract, undefined, {
      acceptance_reachability: reachability,
      compiled_outcomes: compiledOutcomes,
    }),
  );
  assert.doesNotThrow(() =>
    validateExecutionTargets(contract, undefined, {
      acceptance_reachability: reachability,
      compiled_outcomes: compiledOutcomes,
    }),
  );
});

test("UI External takeover requires every exact control Claim obligation", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  outcome.product.controls.push(
    completeControl({
      key: "main",
      surface: "fixture-main",
      location: "root",
    }),
  );
  addProductionControlBinding(contract, {
    controlKey: "main",
    surfaceRef: "fixture-main",
    rootClaimRef: "control.main.location",
  });
  const compiled = compiledCheck(contract, check, "first", ["first-result"]);
  const controlRows = [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ]
    .filter(
      (assertion) =>
        assertion.claims.length === 1 &&
        assertion.claims[0].startsWith("control.main."),
    )
    .map((assertion) => ({
      source_obligation_ref: `claim:first.${assertion.claims[0]}:first-root-success:runtime_behavior`,
      outcome_key: "first",
      claim_ref: `first.${assertion.claims[0]}`,
      local_claim_ref: assertion.claims[0],
      applicability_ref: assertion.applicability_ref,
      target_ref: "fixture-app",
      fact_ref: null,
      proof_ref: null,
      proof_surface: "runtime_behavior",
      authority: "external_confirmation",
      status: "external_fulfillable",
      completion_role: "blocking",
      acceptance_effect: "required",
    }));
  assert.ok(controlRows.length > 1);
  const compiledOutcomes = [compiledOutcome(outcome, [compiled])];

  assert.throws(
    () =>
      validateRiskProof(
        contract,
        classifyLongTaskRisk(contract),
        { effective_external_routes: controlRows.slice(0, -1) },
        compiledOutcomes,
      ),
    /ui_outcome_requires_ui_browser_proof:first/u,
  );
  assert.doesNotThrow(() =>
    validateRiskProof(
      contract,
      classifyLongTaskRisk(contract),
      { effective_external_routes: controlRows },
      compiledOutcomes,
    ),
  );
});

function addResultApplicability(outcome, key, journeyRole) {
  outcome.applicability.push({
    ...structuredClone(outcome.applicability[0]),
    key,
    journey_role: journeyRole,
    dimensions: [{ key: "fixture-state", value: key }],
  });
  outcome.product.result_applicability_refs.push(key);
}

function compiledCheck(
  contract,
  declared,
  outcomeKey,
  machineAssertionKeys,
) {
  const check = structuredClone(declared);
  const assertions = [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ];
  const selected = new Set(machineAssertionKeys);
  return {
    ...check,
    internal_id: `CHECK.${outcomeKey ?? "GLOBAL"}.${check.key}`,
    outcome_key: outcomeKey,
    execution_target_definition: contract.task.execution_targets.find(
      (target) => target.key === check.execution_target.target_ref,
    ),
    known_execution_targets: contract.task.execution_targets,
    completion_role: "semantic",
    observation_authorities: assertions
      .filter((assertion) => selected.has(assertion.key))
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

function compiledOutcome(outcome, checks) {
  return {
    ...structuredClone(outcome),
    internal_id: `OUT.${outcome.key}`,
    acceptance: {
      ...structuredClone(outcome.acceptance),
      checks,
    },
  };
}

function advisoryReachability(applicabilityRef, completionRole) {
  return {
    effective_external_routes: [
      externalRoute(applicabilityRef, completionRole),
    ],
  };
}

function blockingReachability(applicabilityRefs) {
  return {
    effective_external_routes: applicabilityRefs.map((applicabilityRef) =>
      externalRoute(applicabilityRef, "blocking"),
    ),
  };
}

function externalRoute(applicabilityRef, completionRole) {
  return {
    outcome_key: "first",
    claim_ref: "first.result",
    local_claim_ref: "result",
    applicability_ref: applicabilityRef,
    target_ref: "fixture-app",
    authority: "external_confirmation",
    status: "external_fulfillable",
    completion_role: completionRole,
    acceptance_effect: completionRole === "blocking" ? "required" : "none",
  };
}
