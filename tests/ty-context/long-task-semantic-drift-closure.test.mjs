import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { deliveryContractStructureDiagnostics } from "../../packages/ty-context/dist/lib/long-task-delivery-validation.js";
import {
  evaluateEvidenceCapabilities,
  validateEvidenceCapabilityDeclarations,
} from "../../packages/ty-context/dist/lib/long-task-evidence-capability-policy.js";
import { evaluateExactDigestComparison } from "../../packages/ty-context/dist/lib/long-task-exact-comparison.js";
import {
  addProductionControlBinding,
  completeControl,
  deliveryContract,
  designFactExpectationFixture,
  designFactResultFixture,
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
    capabilities: ["native-runtime", "cold-start", "production-root"],
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
  contract.outcomes[0].applicability.push({
    key: "first-native-success",
    target_ref: "fixture-native",
    journey_role: "success",
    dimensions: [{ key: "fixture-state", value: "loaded" }],
    given_refs: ["fixture-loaded"],
    when_refs: ["read-outcome"],
  });
  contract.outcomes[0].product.result_applicability_refs.push(
    "first-native-success",
  );
  nativeCheck.execution_target.target_ref = "fixture-native";
  nativeCheck.runner.type = "project_binary";
  nativeCheck.runner.target = "tests/oracle.mjs";
  nativeCheck.positive_assertions = [
    {
      ...nativeCheck.positive_assertions[0],
      key: "first-native-result",
      applicability_ref: "first-native-success",
      observation: "result_copy",
    },
    {
      ...nativeCheck.positive_assertions.find(
        (assertion) => assertion.key === "first-liveness",
      ),
      key: "first-native-liveness",
    },
  ];
  nativeCheck.negative_assertions = [];
  contract.outcomes[0].acceptance.checks.push(nativeCheck);
  contract.outcomes[0].acceptance.counterfactual_controls.push({
    key: "replace-native-semantics",
    binding_key: "state-first",
    claims: ["result"],
    check_key: "first-native-check",
    mutation: {
      type: "replace_json_value",
      path: "src/state.json",
      pointer: "/first",
      value: false,
    },
    expected_assertion_failures: ["first-native-result"],
    preserved_assertions: ["first-native-liveness"],
  });
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
      capabilities: ["native-runtime", "cold-start", "production-root"],
    },
    {
      key: "fixture-browser",
      description: "A detached browser support route.",
      role: "support",
      runtime_family: "browser",
      root_entrypoint: "/map",
      capabilities: ["browser-runtime"],
    },
  );
  proxyUi.task.target_profile.required_target_refs.push("fixture-native");
  const proxyOutcome = proxyUi.outcomes[0];
  proxyOutcome.applicability.push({
    key: "first-native-success",
    target_ref: "fixture-native",
    journey_role: "success",
    dimensions: [{ key: "fixture-state", value: "loaded" }],
    given_refs: ["fixture-loaded"],
    when_refs: ["read-outcome"],
  });
  proxyOutcome.product.result_applicability_refs.push("first-native-success");
  const mapControl = completeControl({
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
  for (const coverage of mapControl.field_coverage)
    if (coverage.state !== "unresolved")
      coverage.applicability_refs = ["first-native-success"];
  proxyOutcome.product.controls.push(mapControl);
  proxyOutcome.product.control_relation_closure = {
    state: "not_applicable",
    statement:
      "Only one Control is declared, so no cross-Control relation applies.",
    applicability_refs: ["first-root-success", "first-native-success"],
  };
  const nativeShell = structuredClone(proxyOutcome.acceptance.checks[0]);
  nativeShell.key = "native-shell";
  nativeShell.execution_target.target_ref = "fixture-native";
  nativeShell.runner.type = "project_binary";
  nativeShell.runner.target = "tests/oracle.mjs";
  nativeShell.positive_assertions = [
    {
      ...nativeShell.positive_assertions[0],
      key: "native-shell-result",
      applicability_ref: "first-native-success",
      observation: "result_copy",
    },
    {
      ...nativeShell.positive_assertions.find(
        (assertion) => assertion.key === "first-liveness",
      ),
      key: "native-shell-liveness",
    },
  ];
  for (const assertion of nativeShell.negative_assertions)
    if (assertion.claims.includes("control_relation_closure"))
      assertion.applicability_ref = "first-native-success";
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
      applicability_ref: "first-native-success",
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
    rootClaimRef: "control.map-tab.navigation_result",
  });
  const nativeNavigation = nativeShell.positive_assertions.find(
    (assertion) => assertion.key === "map-tab-navigation-result-proof",
  );
  nativeShell.positive_assertions = nativeShell.positive_assertions.filter(
    (assertion) => assertion !== nativeNavigation,
  );
  const nativeClaimAssertions = [
    ...nativeShell.positive_assertions,
    ...nativeShell.negative_assertions,
  ].filter((assertion) => assertion.claims.length);
  const nativeSensitivity = {
    key: "replace-native-shell-semantics",
    binding_key: "state-first",
    claims: nativeClaimAssertions.flatMap((assertion) => assertion.claims),
    check_key: "native-shell",
    mutation: {
      type: "replace_json_value",
      path: "src/state.json",
      pointer: "/first",
      value: false,
    },
    expected_assertion_failures: nativeClaimAssertions.map(
      (assertion) => assertion.key,
    ),
    preserved_assertions: ["native-shell-liveness"],
  };
  proxyOutcome.acceptance.counterfactual_controls.push(nativeSensitivity);
  const proxyDiagnostics = deliveryContractStructureDiagnostics(proxyUi);
  assert.ok(
    proxyDiagnostics.some(
      (item) =>
        item.includes("claim_applicability_target_mismatch") &&
        item.includes("detached-map-navigation"),
    ),
    JSON.stringify(proxyDiagnostics),
  );
  proxyOutcome.acceptance.checks = proxyOutcome.acceptance.checks.filter(
    (check) => check.key !== "detached-map",
  );
  nativeShell.positive_assertions.push(nativeNavigation);
  nativeSensitivity.claims.push(...nativeNavigation.claims);
  nativeSensitivity.expected_assertion_failures.push(nativeNavigation.key);
  assert.doesNotThrow(() => parse(proxyUi));
});

test("[critical:selected-design-fact-closure] selected design targets require exact fact-bound comparison evidence and blocker disposition", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  outcome.product.controls.push(
    completeControl({
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
    }),
  );
  outcome.product.control_relation_closure = {
    state: "not_applicable",
    statement:
      "Only one Control is declared, so no cross-Control relation applies.",
    applicability_refs: ["first-root-success"],
  };
  const check = outcome.acceptance.checks[0];
  check.verification_inputs.push("design/map-target.png");
  check.artifact_globs = ["artifacts/**"];
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
        conformance_assertion_ref: "map-tab-location-proof",
        verification_method_bindings: [
          {
            method: "layout_geometry",
            assertion_ref: "map-tab-location-proof",
            evidence_artifacts: [
              {
                condition_key: "phone",
                path: "artifacts/map-layout-phone.json",
                observation_path: "artifacts/map-layout-phone-observation.json",
                fact_refs: ["map.layout.phone"],
                fact_expectations: [
                  designFactExpectationFixture("map.layout.phone"),
                ],
              },
              {
                condition_key: "dark",
                path: "artifacts/map-layout-dark.json",
                observation_path: "artifacts/map-layout-dark-observation.json",
                fact_refs: ["map.layout.dark"],
                fact_expectations: [
                  designFactExpectationFixture("map.layout.dark"),
                ],
              },
              {
                condition_key: "default",
                path: "artifacts/map-layout-default.json",
                observation_path:
                  "artifacts/map-layout-default-observation.json",
                fact_refs: ["map.layout.default"],
                fact_expectations: [
                  designFactExpectationFixture("map.layout.default"),
                ],
              },
            ],
          },
        ],
        actual_artifact_path: "artifacts/map-actual.png",
        comparison_artifact_path: "artifacts/map-diff.json",
      },
    ],
  });
  const conformanceAssertion = check.positive_assertions.find(
    (assertion) => assertion.key === "map-tab-location-proof",
  );
  conformanceAssertion.evidence_capabilities.push(
    "visual_render",
    "design_conformance",
    "design_method",
  );
  assert.doesNotThrow(() => parse(contract));

  const compiled = compiledCheck(contract, check, "first");
  const assertionKey = conformanceAssertion.key;
  compiled.positive_assertions = [
    compiled.positive_assertions.find(
      (assertion) => assertion.key === assertionKey,
    ),
  ];
  compiled.negative_assertions = [];
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
      capability: "visual_render",
      artifact_path: "artifacts/map-actual.png",
      artifact_sha256: ONE,
    },
  ];
  const artifacts = {
    "artifacts/map-actual.png": ONE,
    "artifacts/map-diff.json": TWO,
    "artifacts/map-layout-phone.json": "3".repeat(64),
    "artifacts/map-layout-dark.json": "4".repeat(64),
    "artifacts/map-layout-default.json": "5".repeat(64),
    "artifacts/map-layout-phone-observation.json": "6".repeat(64),
    "artifacts/map-layout-dark-observation.json": "7".repeat(64),
    "artifacts/map-layout-default-observation.json": "8".repeat(64),
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

  const conformanceRecords = [
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
    {
      assertion_key: assertionKey,
      capability: "design_method",
      design_target_ref: "map-default",
      target_ref: "fixture-app",
      method: "layout_geometry",
      cells: [
        {
          condition_key: "phone",
          artifact_path: "artifacts/map-layout-phone.json",
          observation_artifact_path:
            "artifacts/map-layout-phone-observation.json",
          fact_refs: ["map.layout.phone"],
          fact_results: [
            designFactResultFixture(
              designFactExpectationFixture("map.layout.phone"),
              {
                artifactPath: "artifacts/map-layout-phone.json",
                observationPath: "artifacts/map-layout-phone-observation.json",
                artifactSha256: "3".repeat(64),
                observationSha256: "6".repeat(64),
              },
            ),
          ],
        },
        {
          condition_key: "dark",
          artifact_path: "artifacts/map-layout-dark.json",
          observation_artifact_path:
            "artifacts/map-layout-dark-observation.json",
          fact_refs: ["map.layout.dark"],
          fact_results: [
            designFactResultFixture(
              designFactExpectationFixture("map.layout.dark"),
              {
                artifactPath: "artifacts/map-layout-dark.json",
                observationPath: "artifacts/map-layout-dark-observation.json",
                artifactSha256: "4".repeat(64),
                observationSha256: "7".repeat(64),
              },
            ),
          ],
        },
        {
          condition_key: "default",
          artifact_path: "artifacts/map-layout-default.json",
          observation_artifact_path:
            "artifacts/map-layout-default-observation.json",
          fact_refs: ["map.layout.default"],
          fact_results: [
            designFactResultFixture(
              designFactExpectationFixture("map.layout.default"),
              {
                artifactPath: "artifacts/map-layout-default.json",
                observationPath:
                  "artifacts/map-layout-default-observation.json",
                artifactSha256: "5".repeat(64),
                observationSha256: "8".repeat(64),
              },
            ),
          ],
        },
      ],
    },
  ];
  const conformed = evaluateEvidenceCapabilities(
    compiled,
    conformanceRecords,
    artifacts,
  );
  assert.equal(conformed.complete[assertionKey], false);
  assert.ok(
    conformed.findings.some(
      (item) => item.actual === "machine_observer_not_admitted",
    ),
    "project-submitted layout evidence remains syntactically checked but cannot close a machine Claim without a package-admitted observer",
  );

  const selectedFact = conformanceRecords.find(
    (record) => record.capability === "design_method",
  ).cells[0].fact_results[0];
  const exactAuthority = {
    identity: {
      kind: "selected_design_ground_v1",
      fact_ref: selectedFact.fact_ref,
      subject_ref: selectedFact.subject_ref,
      variation_ref: selectedFact.variation_ref,
      property_ref: selectedFact.property_ref,
    },
    actual_value_sha256: selectedFact.actual_observation.value_sha256,
    expected_value_sha256: selectedFact.expected.sha256,
    comparator: selectedFact.comparison.comparator,
    mode: selectedFact.comparison.mode,
    parameters_sha256: selectedFact.comparison.parameters.sha256,
    tolerance_sha256: null,
    mask_sha256: null,
  };
  assert.equal(evaluateExactDigestComparison(exactAuthority).passed, true);
  assert.equal(
    evaluateExactDigestComparison({
      ...exactAuthority,
      actual_value_sha256: "9".repeat(64),
      submitted_passed: true,
      submitted_verdict: "passed",
    }).passed,
    false,
  );

  const blockerMissing = structuredClone(contract);
  blockerMissing.outcomes[0].product.surface_bindings[0].acceptance_blockers = [
    {
      key: "native-haptics",
      status: "machine_claim",
      refs: [],
      source_item_refs: ["map-design"],
      verification_methods: ["layout_geometry"],
      required_capabilities: ["haptic-output"],
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
        required_capabilities: ["haptic-output"],
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
  degradationOnly.outcomes[0].applicability[0].journey_role = "degradation";
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

test("multi-Outcome Stage Gates validate cross-surface records but require an admitted observer", () => {
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
  check.positive_assertions = [check.positive_assertions[0]];
  check.negative_assertions = [];
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
  assert.equal(valid.complete[check.positive_assertions[0].key], false);
  assert.ok(
    valid.findings.some(
      (item) => item.actual === "machine_observer_not_admitted",
    ),
  );
});

test("variable inputs and external effects validate typed records but remain external without admitted observers", () => {
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
  assert.equal(varied.complete[assertionKey], false);
  assert.ok(
    varied.findings.some(
      (item) => item.actual === "machine_observer_not_admitted",
    ),
  );

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
    capabilities: ["external-runtime"],
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
  assert.equal(evidence.complete[observedKey], false);
  assert.ok(
    evidence.findings.some(
      (item) => item.actual === "machine_observer_not_admitted",
    ),
  );
});

function assertFactResultDriftClosure({
  compiled,
  conformanceRecords,
  artifacts,
  assertionKey,
}) {
  const factResultDrifts = [
    [
      "missing result",
      (record) => {
        record.cells[0].fact_results = [];
      },
      "design_method_fact_results_mismatch",
    ],
    [
      "extra result",
      (record) => {
        const result = structuredClone(record.cells[0].fact_results[0]);
        result.fact_ref = "map.layout.unbound";
        record.cells[0].fact_results.push(result);
      },
      "design_method_fact_results_mismatch",
    ],
    [
      "fact identity",
      (record) => {
        record.cells[0].fact_results[0].subject_ref = "subject.drift";
      },
      "design_method_fact_identity_mismatch",
    ],
    [
      "observation sensitivity authority",
      (record) => {
        record.cells[0].fact_results[0].actual_observation.sensitivity =
          "protected";
        record.cells[0].fact_results[0].actual_observation.redaction = {
          policy_ref: "policy.fixture-redaction",
          representation: "digest_only",
          raw_persisted: false,
        };
      },
      "design_method_fact_identity_mismatch",
    ],
    [
      "expected value",
      (record) => {
        record.cells[0].fact_results[0].expected.sha256 = "9".repeat(64);
      },
      "design_method_expected_value_mismatch",
    ],
    [
      "comparator authority",
      (record) => {
        record.cells[0].fact_results[0].comparison.comparator = "content_equal";
      },
      "design_method_comparison_authority_mismatch",
    ],
    [
      "tolerance authority",
      (record) => {
        record.cells[0].fact_results[0].comparison.tolerance = {
          locator: {
            resource_ref: "resource.fixture",
            kind: "json_pointer",
            value: "/tolerance/drift",
          },
          sha256: "9".repeat(64),
        };
      },
      "design_method_comparison_authority_mismatch",
    ],
    [
      "oracle identity",
      (record) => {
        record.cells[0].fact_results[0].oracle.identity = "other-oracle";
      },
      "design_method_oracle_environment_mismatch",
    ],
    [
      "environment digest",
      (record) => {
        record.cells[0].fact_results[0].environment.definition.sha256 =
          "9".repeat(64);
      },
      "design_method_oracle_environment_mismatch",
    ],
    [
      "actual observation",
      (record) => {
        record.cells[0].fact_results[0].actual_observation.artifact_sha256 =
          "9".repeat(64);
      },
      "design_method_actual_observation_mismatch",
    ],
    [
      "exact value mismatch cannot be overridden by submitted pass fields",
      (record) => {
        record.cells[0].fact_results[0].actual_observation.value_sha256 =
          "9".repeat(64);
        record.cells[0].fact_results[0].comparison.passed = true;
        record.cells[0].fact_results[0].verdict = "passed";
      },
      "design_method_exact_value_mismatch",
    ],
    [
      "comparison result identity is recomputed",
      (record) => {
        record.cells[0].fact_results[0].comparison.result_sha256 =
          "9".repeat(64);
      },
      "design_method_comparison_result_identity_mismatch",
    ],
    [
      "actual environment",
      (record) => {
        record.cells[0].fact_results[0].actual_environment.value_sha256 =
          "9".repeat(64);
      },
      "design_method_actual_environment_mismatch",
    ],
    [
      "comparison artifact",
      (record) => {
        record.cells[0].fact_results[0].comparison.artifact_sha256 = "9".repeat(
          64,
        );
      },
      "design_method_comparison_artifact_mismatch",
    ],
    [
      "failed verdict",
      (record) => {
        record.cells[0].fact_results[0].verdict = "failed";
        record.cells[0].fact_results[0].comparison.passed = false;
      },
      "design_method_fact_failed",
    ],
  ];
  for (const [name, mutate, expectedCode] of factResultDrifts) {
    const records = structuredClone(conformanceRecords);
    const methodRecord = records.find(
      (record) => record.capability === "design_method",
    );
    mutate(methodRecord);
    const result = evaluateEvidenceCapabilities(compiled, records, artifacts);
    assert.equal(result.complete[assertionKey], false, name);
    assert.ok(
      result.findings.some((item) => item.actual === expectedCode),
      `${name}: ${JSON.stringify(result.findings)}`,
    );
  }
}

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
