import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  addProductionControlBinding,
  completeControl,
  runCli,
} from "./long-task-delivery-fixtures.mjs";

export function prepareSemanticAuthority(contract) {
  const outcome = contract.outcomes[0];
  contract.task.execution_targets.push({
    key: "fixture-browser",
    description: "The browser product surface.",
    role: "product",
    runtime_family: "browser",
    root_entrypoint: "/",
  });
  contract.task.target_profile.required_target_refs.push("fixture-browser");
  outcome.applicability.push({
    key: "first-browser-success",
    target_ref: "fixture-browser",
    journey_role: "success",
    given_refs: ["fixture-loaded"],
    when_refs: ["read-outcome"],
  });
  outcome.product.result_applicability_refs.push("first-browser-success");
  const submit = completeControl({
    key: "submit",
    surface: "fixture-main",
    location: "footer",
    trigger: "",
    input: "",
    validation: "invalid input remains identified",
    loading_state: "",
    empty_state: "",
    success_state: "done",
    failure_state: "error",
    recovery: "retry preserves valid input",
    feedback: "",
    accessibility: "the named control supports keyboard activation",
  });
  for (const coverage of submit.field_coverage)
    if (coverage.state !== "unresolved")
      coverage.applicability_refs = ["first-browser-success"];
  outcome.product.controls.push(submit);
  outcome.product.control_relation_closure = {
    state: "not_applicable",
    statement: "Only one Control is declared, so no cross-Control relation applies.",
  };
  outcome.product.non_completing_outcomes.push({
    key: "exit-zero-only",
    statement: "Exit zero alone is not completion.",
    applicability_refs: ["first-root-success"],
  });
  outcome.acceptance.counterfactual_controls[0].claims.push(
    "non_completing.exit-zero-only",
  );
  outcome.acceptance.checks[0].negative_assertions.push({
    key: "exit-zero-is-insufficient",
    criterion: "Exit zero alone remains insufficient.",
    claims: ["non_completing.exit-zero-only"],
    applicability_ref: "first-root-success",
    observation: "result_copy",
    evidence_capabilities: ["state_delta"],
    operator: "equals",
    expected: true,
  });
  outcome.acceptance.counterfactual_controls[0].expected_assertion_failures.push(
    "exit-zero-is-insufficient",
  );
  const uiCheck = {
    ...structuredClone(outcome.acceptance.checks[0]),
    key: "submit-ui",
    journey_roles: ["success", "stage_gate"],
    execution_target: {
      target_ref: "fixture-browser",
      entrypoint: "root",
    },
    proof_surface: "ui_browser",
    runner: {
      ...structuredClone(outcome.acceptance.checks[0].runner),
      type: "playwright_test",
      target: "tests/oracle.mjs",
    },
    positive_assertions: [
      {
        key: "submit-ui-result",
        criterion: "The browser target exposes the declared result.",
        claims: ["result"],
        applicability_ref: "first-browser-success",
        observation: "playwright.case.submit-ui-result.passed",
        evidence_capabilities: ["interaction_trace", "target_runtime"],
        operator: "equals",
        expected: true,
      },
      {
        key: "submit-ui-liveness",
        criterion: "The browser target remains live under semantic mutation.",
        claims: [],
        observation: "playwright.case.submit-ui-liveness.passed",
        evidence_capabilities: ["target_runtime"],
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [],
  };
  outcome.acceptance.checks.push(uiCheck);
  addProductionControlBinding(contract, {
    controlKey: "submit",
    surfaceRef: "fixture-main",
    targetRef: "fixture-browser",
    rootCheckRef: "submit-ui",
    rootClaimRef: "control.submit.location",
    acceptanceBlockers: [
      {
        key: "submit-accessibility-proof",
        status: "machine_claim",
        refs: ["control.submit.accessibility"],
        source_item_refs: ["submit-design"],
        verification_methods: ["accessibility_semantics"],
        rationale:
          "The target-local UI Check resolves the declared accessibility blocker.",
      },
    ],
  });
  for (const assertion of [
    ...uiCheck.positive_assertions,
    ...uiCheck.negative_assertions,
  ]) {
    assertion.observation = `playwright.case.${assertion.key}.passed`;
    assertion.evidence_capabilities = assertion.claims.length
      ? ["interaction_trace", "target_runtime"]
      : ["target_runtime"];
    assertion.operator = "equals";
    assertion.expected = true;
  }
  const uiClaimAssertions = [
    ...uiCheck.positive_assertions,
    ...uiCheck.negative_assertions,
  ].filter((assertion) => assertion.claims.length);
  outcome.acceptance.counterfactual_controls.push({
    key: "replace-submit-ui-semantics",
    binding_key: "state-first",
    claims: uiClaimAssertions.flatMap((assertion) => assertion.claims),
    check_key: "submit-ui",
    mutation: {
      type: "replace_file",
      path: "src/state.json",
      fixture_path: "tests/semantic-false.json",
    },
    expected_assertion_failures: uiClaimAssertions.map(
      (assertion) => assertion.key,
    ),
    preserved_assertions: ["submit-ui-liveness"],
  });
  contract.global.applicability.push({
    key: "global-root-success",
    target_ref: "fixture-app",
    journey_role: "success",
    given_refs: ["fixture-loaded"],
    when_refs: ["read-outcome"],
  });
  contract.global.technical.constraints.push({
    key: "stable-runtime",
    statement: "The runtime remains stable.",
    applicability_refs: ["global-root-success"],
  });
  contract.global.acceptance.checks.push({
    ...structuredClone(outcome.acceptance.checks[0]),
    key: "stable-runtime-check",
    runner: {
      ...structuredClone(outcome.acceptance.checks[0].runner),
      argv: ["first", "global"],
    },
    positive_assertions: [
      {
        key: "stable-runtime-proof",
        criterion: "The declared runtime remains stable.",
        claims: ["constraint.stable-runtime"],
        applicability_ref: "global-root-success",
        observation: "result_copy",
        evidence_capabilities: ["state_delta"],
        operator: "equals",
        expected: true,
      },
      {
        key: "stable-runtime-liveness",
        criterion: "The owning product target remains live.",
        claims: [],
        observation: "target_live",
        evidence_capabilities: ["target_runtime"],
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [],
  });
  contract.global.acceptance.counterfactual_controls.push({
    key: "replace-stable-runtime-semantics",
    binding_ref: "first.state-first",
    claims: ["constraint.stable-runtime"],
    check_key: "stable-runtime-check",
    mutation: {
      type: "replace_file",
      path: "src/state.json",
      fixture_path: "tests/semantic-false.json",
    },
    expected_assertion_failures: ["stable-runtime-proof"],
    preserved_assertions: ["stable-runtime-liveness"],
  });
}

export async function expectDecision(fixture, expectation) {
  await assert.rejects(
    () =>
      runCli(fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
        "--revise",
      ]),
    /authority_change_requires_user_decision/u,
  );
  const pending = JSON.parse(
    await readFile(
      path.join(
        fixture.workdir,
        ".ty-context",
        "authority-revision-pending.json",
      ),
      "utf8",
    ),
  );
  if ("includes" in expectation)
    assert.ok(
      pending.revision_diff[expectation.field].includes(expectation.includes),
      `${expectation.field} must include ${expectation.includes}`,
    );
  if ("equals" in expectation)
    assert.equal(pending.revision_diff[expectation.field], expectation.equals);
  assert.ok(
    pending.revision_diff.reduction_reasons.includes(expectation.reason),
    `reduction reasons must include ${expectation.reason}`,
  );
  return pending;
}
