import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { deliveryContractStructureDiagnostics } from "../../packages/ty-context/dist/lib/long-task-delivery-validation.js";
import {
  evaluateEvidenceCapabilities,
  validateEvidenceCapabilityDeclarations,
} from "../../packages/ty-context/dist/lib/long-task-evidence-capability-policy.js";
import {
  addProductionControlBinding,
  deliveryContract,
} from "./long-task-delivery-fixtures.mjs";

const ZERO = "0".repeat(64);
const ONE = "1".repeat(64);
const TWO = "2".repeat(64);

test("[critical:target-runtime-non-substitution] required target refs prevent a passing Web/process route from substituting for Native", () => {
  const contract = deliveryContract();
  contract.task.execution_targets.push({
    key: "fixture-native",
    description: "The required native application root.",
    role: "product",
    runtime_family: "native",
    root_entrypoint: "fixture-native.exe",
  });
  contract.task.target_profile.required_target_refs.push("fixture-native");
  contract.risk.facts.critical_user_path = ["first"];

  const diagnostics = deliveryContractStructureDiagnostics(contract);
  assert.ok(
    diagnostics.some((item) =>
      item.includes(
        "stage_gate_required_target_proof_missing:first:fixture-native",
      ),
    ),
  );
  assert.ok(
    diagnostics.some((item) =>
      item.includes(
        "critical_path_required_target_proof_missing:first:fixture-native",
      ),
    ),
  );

  const nativeCheck = structuredClone(
    contract.outcomes[0].acceptance.checks[0],
  );
  nativeCheck.key = "first-native-check";
  nativeCheck.execution_target.target_ref = "fixture-native";
  nativeCheck.runner.type = "project_binary";
  nativeCheck.runner.target = "tests/oracle.mjs";
  nativeCheck.positive_assertions[0].key = "first-native-result";
  nativeCheck.positive_assertions[0].observation = "result_copy";
  contract.outcomes[0].acceptance.checks.push(nativeCheck);
  assert.doesNotThrow(() => parse(contract));

  const wrongAdapter = structuredClone(contract);
  wrongAdapter.outcomes[0].acceptance.checks[1].runner.type = "node_oracle";
  assert.throws(
    () => parse(wrongAdapter),
    /native_target_runtime_requires_project_binary/u,
  );

  const proxyUi = deliveryContract();
  proxyUi.task.execution_targets.push(
    {
      key: "fixture-native",
      description: "The required native application root.",
      role: "product",
      runtime_family: "native",
      root_entrypoint: "fixture-native.exe",
    },
    {
      key: "fixture-browser",
      description: "A detached browser support route.",
      role: "support",
      runtime_family: "browser",
      root_entrypoint: "/map",
    },
  );
  proxyUi.task.target_profile.required_target_refs.push("fixture-native");
  const proxyOutcome = proxyUi.outcomes[0];
  proxyOutcome.product.controls.push({
    key: "map-tab",
    surface: "mobile-shell",
    region: "",
    location: "bottom navigation",
    control_type: "",
    label_content: "",
    user_task: "",
    visibility: "",
    availability: "",
    trigger: "",
    input: "",
    validation: "",
    default_value: "",
    interaction: "",
    navigation_result: "open the complete Map page",
    loading_state: "",
    empty_state: "",
    success_state: "",
    failure_state: "",
    recovery: "",
    permission: "",
    feedback: "",
    accessibility: "",
  });
  const nativeShell = structuredClone(proxyOutcome.acceptance.checks[0]);
  nativeShell.key = "native-shell";
  nativeShell.execution_target.target_ref = "fixture-native";
  nativeShell.runner.type = "project_binary";
  nativeShell.runner.target = "tests/oracle.mjs";
  nativeShell.positive_assertions[0].key = "native-shell-map-tab";
  nativeShell.positive_assertions[0].observation = "result_copy";
  nativeShell.positive_assertions[0].claims = [
    "result",
    "control.map-tab.surface",
    "control.map-tab.location",
  ];
  nativeShell.positive_assertions[0].evidence_capabilities = [
    "interaction_trace",
    "target_runtime",
  ];
  const detachedMap = structuredClone(proxyOutcome.acceptance.checks[0]);
  detachedMap.key = "detached-map";
  detachedMap.journey_roles = ["success"];
  detachedMap.execution_target = {
    target_ref: "fixture-browser",
    entrypoint: "internal",
  };
  detachedMap.proof_surface = "ui_browser";
  detachedMap.runner.type = "playwright_test";
  detachedMap.runner.target = "tests/oracle.mjs";
  detachedMap.positive_assertions = [
    {
      key: "detached-map-navigation",
      criterion: "The detached route shows the Map page.",
      claims: ["control.map-tab.navigation_result"],
      observation: "playwright.case.detached-map-navigation.passed",
      evidence_capabilities: ["interaction_trace"],
      operator: "equals",
      expected: true,
    },
  ];
  detachedMap.negative_assertions = [];
  proxyOutcome.acceptance.checks.push(nativeShell, detachedMap);
  addProductionControlBinding(proxyUi, {
    controlKey: "map-tab",
    surfaceRef: "mobile-shell",
    targetRef: "fixture-native",
    rootCheckRef: "native-shell",
    rootClaimRef: null,
  });
  const proxyDiagnostics = deliveryContractStructureDiagnostics(proxyUi);
  assert.ok(
    proxyDiagnostics.some(
      (item) =>
        item.includes("ui_surface_binding_root_control_proof_missing") &&
        item.includes("control.map-tab.navigation_result"),
    ),
    JSON.stringify(proxyDiagnostics),
  );
  nativeShell.positive_assertions[0].claims.push(
    "control.map-tab.navigation_result",
  );
  assert.doesNotThrow(() => parse(proxyUi));
});

test("selected design targets require root-bound comparison evidence and blocker disposition", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  outcome.product.controls.push({
    key: "map-tab",
    surface: "mobile-shell",
    location: "bottom navigation",
    trigger: "",
    input: "",
    loading_state: "",
    empty_state: "",
    success_state: "",
    failure_state: "",
    feedback: "",
  });
  const check = outcome.acceptance.checks[0];
  check.verification_inputs.push("design/map-target.png");
  check.artifact_globs = ["artifacts/**"];
  check.positive_assertions[0].claims.push("control.map-tab.surface");
  check.positive_assertions[0].evidence_capabilities.push(
    "visual_render",
    "design_conformance",
  );
  addProductionControlBinding(contract, {
    controlKey: "map-tab",
    surfaceRef: "mobile-shell",
    rootClaimRef: "control.map-tab.location",
    designTargets: [
      {
        key: "map-default",
        interpretation: "exact_target",
        source_paths: ["design/map-target.png"],
        condition_keys: ["phone", "dark", "default"],
        claim_refs: ["control.map-tab.location"],
        conformance_check_ref: "first-check",
        conformance_assertion_ref: "first-result",
        verification_method_bindings: [
          { method: "layout_geometry", assertion_ref: "first-result" },
        ],
        actual_artifact_path: "artifacts/map-actual.png",
        comparison_artifact_path: "artifacts/map-diff.json",
      },
    ],
  });
  assert.doesNotThrow(() => parse(contract));

  const compiled = compiledCheck(contract, check, "first");
  const assertionKey = check.positive_assertions[0].key;
  const commonRecords = [
    {
      assertion_key: assertionKey,
      capability: "interaction_trace",
      target_ref: "fixture-app",
      given_keys: ["fixture-loaded"],
      action_keys: ["read-outcome"],
    },
    {
      assertion_key: assertionKey,
      capability: "target_runtime",
      target_ref: "fixture-app",
      root_entrypoint: "tests/oracle.mjs",
      session_id: "fixture-map-session",
      cold_start: true,
    },
    {
      assertion_key: assertionKey,
      capability: "state_delta",
      before_sha256: ZERO,
      after_sha256: ONE,
      changed_fields: ["selected-tab"],
    },
    {
      assertion_key: assertionKey,
      capability: "visual_render",
      artifact_path: "artifacts/map-actual.png",
      artifact_sha256: ONE,
    },
  ];
  const artifacts = {
    "artifacts/map-actual.png": ONE,
    "artifacts/map-diff.json": TWO,
  };
  const integrityOnly = evaluateEvidenceCapabilities(
    compiled,
    commonRecords,
    artifacts,
  );
  assert.equal(integrityOnly.complete[assertionKey], false);
  assert.ok(
    integrityOnly.findings.some(
      (item) =>
        item.expected === "design_conformance" &&
        item.actual === "record_missing",
    ),
  );

  const conformed = evaluateEvidenceCapabilities(
    compiled,
    [
      ...commonRecords,
      {
        assertion_key: assertionKey,
        capability: "design_conformance",
        design_target_ref: "map-default",
        target_ref: "fixture-app",
        condition_keys: ["dark", "default", "phone"],
        actual_artifact_path: "artifacts/map-actual.png",
        comparison_artifact_path: "artifacts/map-diff.json",
      },
    ],
    artifacts,
  );
  assert.equal(conformed.complete[assertionKey], true);
  assert.deepEqual(conformed.findings, []);

  const blockerMissing = structuredClone(contract);
  blockerMissing.outcomes[0].product.surface_bindings[0].acceptance_blockers = [
    {
      key: "native-haptics",
      status: "machine_claim",
      refs: [],
      source_item_refs: ["map-design"],
      verification_methods: ["layout_geometry"],
      rationale: "Native haptics remain unresolved.",
    },
  ];
  assert.throws(
    () => parse(blockerMissing),
    /ui_design_blocker_ref_required:first:map-tab-fixture-app:native-haptics/u,
  );

  const nonBlockingConfirmation = structuredClone(contract);
  nonBlockingConfirmation.global.acceptance.external_confirmations.push({
    key: "native-haptics-review",
    description: "A device reviewer confirms native haptics.",
    owner: "native-reviewer",
    kind: "field_validation",
    impact_claims: ["first.control.map-tab.location"],
    blocks_target: false,
  });
  nonBlockingConfirmation.outcomes[0].product.surface_bindings[0].acceptance_blockers =
    [
      {
        key: "native-haptics",
        status: "external_confirmation",
        refs: ["native-haptics-review"],
        source_item_refs: ["map-design"],
        verification_methods: ["layout_geometry"],
        rationale: "Native haptics require device review.",
      },
    ];
  assert.throws(
    () => parse(nonBlockingConfirmation),
    /ui_design_blocker_confirmation_must_block_target:first:map-tab-fixture-app:native-haptics:native-haptics-review/u,
  );

  nonBlockingConfirmation.global.acceptance.external_confirmations[0].blocks_target = true;
  assert.doesNotThrow(() => parse(nonBlockingConfirmation));
});

test("behavior Claims cannot be proved by presence text and success cannot be replaced by degradation", () => {
  const presenceOnly = deliveryContract();
  presenceOnly.outcomes[0].acceptance.checks[0].positive_assertions[0].evidence_capabilities =
    ["presence"];
  assert.ok(
    deliveryContractStructureDiagnostics(presenceOnly).some((item) =>
      item.includes("presence_cannot_prove_behavior"),
    ),
  );

  const mergedJourneys = deliveryContract();
  mergedJourneys.outcomes[0].product.degradation_path_required = true;
  mergedJourneys.outcomes[0].acceptance.checks[0].journey_roles.push(
    "degradation",
  );
  assert.throws(
    () => parse(mergedJourneys),
    /success_degradation_check_must_be_distinct/u,
  );

  const degradationOnly = deliveryContract();
  degradationOnly.outcomes[0].product.degradation_path_required = true;
  degradationOnly.outcomes[0].acceptance.checks[0].journey_roles = [
    "degradation",
    "stage_gate",
  ];
  assert.throws(() => parse(degradationOnly), /success_path_check_required/u);

  const deepLinkGate = deliveryContract();
  deepLinkGate.outcomes[0].acceptance.checks[0].execution_target.entrypoint =
    "internal";
  assert.ok(
    deliveryContractStructureDiagnostics(deepLinkGate).some((item) =>
      item.includes("stage_gate_root_entrypoint_required"),
    ),
  );
});

test("multi-Outcome Stage Gates require typed cross-surface consistency evidence", () => {
  const contract = deliveryContract({ twoOutcomes: true });
  contract.stages = [
    { key: "first", title: "First", depends_on: [], gate_outcome: "second" },
  ];
  contract.outcomes[1].stage = "first";
  contract.outcomes[0].acceptance.checks[0].journey_roles = ["success"];

  assert.throws(
    () => parse(contract),
    /stage_gate_cross_surface_consistency_required/u,
  );
  const gateCheck = contract.outcomes[1].acceptance.checks[0];
  gateCheck.positive_assertions[0].evidence_capabilities.push(
    "cross_surface_consistency",
  );
  assert.doesNotThrow(() => parse(contract));

  const check = compiledCheck(contract, gateCheck, "second", [
    "cross_surface_consistency",
  ]);
  const invalid = evaluateEvidenceCapabilities(
    check,
    [
      {
        assertion_key: check.positive_assertions[0].key,
        capability: "cross_surface_consistency",
        surfaces: [
          { surface_ref: "map", target_ref: "fixture-app", state_sha256: ONE },
          { surface_ref: "map", target_ref: "fixture-app", state_sha256: ONE },
        ],
      },
    ],
    {},
  );
  assert.equal(invalid.complete[check.positive_assertions[0].key], false);
  assert.equal(invalid.findings[0].actual, "two_surfaces_required");

  const valid = evaluateEvidenceCapabilities(
    check,
    [
      {
        assertion_key: check.positive_assertions[0].key,
        capability: "cross_surface_consistency",
        surfaces: [
          { surface_ref: "map", target_ref: "fixture-app", state_sha256: ONE },
          { surface_ref: "trip", target_ref: "fixture-app", state_sha256: ONE },
        ],
      },
    ],
    {},
  );
  assert.equal(valid.complete[check.positive_assertions[0].key], true);
  assert.deepEqual(valid.findings, []);
});

test("variable inputs and external effects require independent typed runtime evidence", () => {
  const contract = deliveryContract();
  const baseCheck = contract.outcomes[0].acceptance.checks[0];
  const variation = compiledCheck(contract, baseCheck, "first", [
    "input_variation",
  ]);
  const assertionKey = variation.positive_assertions[0].key;
  const fixed = evaluateEvidenceCapabilities(
    variation,
    [
      {
        assertion_key: assertionKey,
        capability: "input_variation",
        cases: [
          { input_sha256: ZERO, output_sha256: ONE },
          { input_sha256: TWO, output_sha256: ONE },
        ],
        failure_case_observed: false,
      },
    ],
    {},
  );
  assert.equal(fixed.complete[assertionKey], false);
  assert.equal(fixed.findings[0].actual, "input_must_reach_output");

  const varied = evaluateEvidenceCapabilities(
    variation,
    [
      {
        assertion_key: assertionKey,
        capability: "input_variation",
        cases: [
          { input_sha256: ZERO, output_sha256: ONE },
          { input_sha256: TWO, output_sha256: TWO },
        ],
        failure_case_observed: true,
      },
    ],
    {},
  );
  assert.equal(varied.complete[assertionKey], true);

  baseCheck.positive_assertions[0].evidence_capabilities.push(
    "external_side_effect",
  );
  assert.throws(
    () => validateEvidenceCapabilityDeclarations(contract),
    /observer_check_target_required/u,
  );

  contract.task.execution_targets.push({
    key: "fixture-observer",
    description: "An independent external observer.",
    role: "observer",
    runtime_family: "external",
    root_entrypoint: "observer://fixture",
  });
  baseCheck.execution_target.target_ref = "fixture-observer";
  baseCheck.journey_roles = ["success"];
  assert.doesNotThrow(() => validateEvidenceCapabilityDeclarations(contract));

  const observed = compiledCheck(contract, baseCheck, "first", [
    "external_side_effect",
  ]);
  const observedKey = observed.positive_assertions[0].key;
  const evidence = evaluateEvidenceCapabilities(
    observed,
    [
      {
        assertion_key: observedKey,
        capability: "external_side_effect",
        boundary: "fixture-queue",
        effect_id: "effect-1",
        effect_sha256: ONE,
        observer_target_ref: "fixture-observer",
      },
    ],
    {},
  );
  assert.equal(evidence.complete[observedKey], true);
});

function parse(contract) {
  return parseDeliveryContractText(YAML.stringify(contract));
}

function compiledCheck(contract, declared, outcomeKey, capabilities = null) {
  const check = structuredClone(declared);
  if (capabilities)
    check.positive_assertions[0].evidence_capabilities = capabilities;
  const target = contract.task.execution_targets.find(
    (candidate) => candidate.key === check.execution_target.target_ref,
  );
  return {
    ...check,
    internal_id: `CHECK.${outcomeKey ?? "GLOBAL"}.${check.key}`,
    outcome_key: outcomeKey,
    execution_target_definition: target,
    known_execution_targets: contract.task.execution_targets,
    design_conformance_targets:
      contract.outcomes
        .find((outcome) => outcome.key === outcomeKey)
        ?.product.surface_bindings.flatMap((binding) =>
          binding.design_targets
            .filter((target) => target.conformance_check_ref === check.key)
            .map((target) => ({
              ...target,
              surface_binding_ref: binding.key,
              surface_ref: binding.surface_ref,
              target_ref: binding.target_ref,
            })),
        ) ?? [],
    raw_execution_identity: `raw-${check.key}`,
  };
}
