import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { parseControls } from "../../packages/ty-context/dist/lib/long-task-product-shape.js";
import { parseSurfaceBindings } from "../../packages/ty-context/dist/lib/long-task-ui-surface-shape.js";
import {
  completeControl,
  createDeliveryFixture,
  deliveryContract,
  designFactExpectationFixture,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const activeOperators = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "matches",
  "not_matches",
  "greater_than",
  "greater_or_equal",
  "less_than",
  "less_or_equal",
  "truthy",
  "falsy",
  "exists",
  "set_equals",
  "subset_of",
  "superset_of",
];

test("Control Schema and Parser preserve the complete control-level UI vocabulary", async () => {
  const input = completeControl({
    key: "submit",
    surface: "settings",
    region: "footer",
    location: "settings footer",
    control_type: "button",
    label_content: "Save",
    user_task: "Save settings",
    visibility: "visible while editing",
    availability: "enabled when valid",
    trigger: "click",
    input: "form values",
    validation: "identify invalid fields",
    default_value: "persisted values",
    interaction: "commit once",
    navigation_result: "remain on settings",
    loading_state: "pending",
    empty_state: "disabled",
    success_state: "saved",
    failure_state: "actionable error",
    recovery: "retry without data loss",
    permission: "read-only when denied",
    feedback: "announce result",
    accessibility: "named keyboard-operable button",
  });
  const [parsed] = parseControls([input], "controls");
  const schema = await deliverySchema();
  assert.deepEqual(
    Object.keys(parsed).sort(),
    Object.keys(schema.$defs.control.properties).sort(),
  );
  assert.deepEqual(parsed, input);
  assert.deepEqual(schema.$defs.control.required, ["key", "field_coverage"]);
});

test("production surface bindings and design conformance have Schema/Parser parity", async () => {
  const input = {
    key: "settings-native",
    surface_ref: "settings",
    target_ref: "fixture-app",
    control_refs: ["save"],
    route_binding_ref: "settings-route",
    component_binding_refs: ["settings-screen"],
    root_journey_check_ref: "settings-root",
    entry_action_ref: "open-settings",
    design_targets: [
      {
        key: "settings-default",
        interpretation: "exact_target",
        source_paths: ["design/settings.png"],
        condition_keys: ["phone", "dark", "default"],
        claim_refs: ["control.save.location"],
        conformance_check_ref: "settings-root",
        conformance_assertion_ref: "settings-conformance",
        verification_method_bindings: [
          {
            method: "layout_geometry",
            assertion_ref: "settings-layout",
            evidence_artifacts: [
              {
                condition_key: "phone",
                path: "artifacts/settings-layout-phone.json",
                observation_path:
                  "artifacts/settings-layout-phone-observation.json",
                fact_refs: ["settings.layout.phone"],
                fact_expectations: [
                  designFactExpectationFixture("settings.layout.phone"),
                ],
              },
              {
                condition_key: "dark",
                path: "artifacts/settings-layout-dark.json",
                observation_path:
                  "artifacts/settings-layout-dark-observation.json",
                fact_refs: ["settings.layout.dark"],
                fact_expectations: [
                  designFactExpectationFixture("settings.layout.dark"),
                ],
              },
              {
                condition_key: "default",
                path: "artifacts/settings-layout-default.json",
                observation_path:
                  "artifacts/settings-layout-default-observation.json",
                fact_refs: ["settings.layout.default"],
                fact_expectations: [
                  designFactExpectationFixture("settings.layout.default"),
                ],
              },
            ],
          },
        ],
        actual_artifact_path: "artifacts/settings-actual.png",
        comparison_artifact_path: "artifacts/settings-diff.json",
      },
    ],
    acceptance_blockers: [
      {
        key: "save-validation",
        status: "machine_claim",
        refs: ["control.save.validation"],
        source_item_refs: ["settings-design"],
        verification_methods: ["component_state"],
        required_capabilities: ["browser-runtime"],
        rationale: "The target-local validation Claim resolves the blocker.",
      },
    ],
  };
  const [parsed] = parseSurfaceBindings([input], "surface_bindings");
  const schema = await deliverySchema();
  assert.deepEqual(
    Object.keys(parsed).sort(),
    Object.keys(schema.$defs.surfaceBinding.properties).sort(),
  );
  assert.deepEqual(
    Object.keys(parsed.design_targets[0]).sort(),
    Object.keys(schema.$defs.designTarget.properties).sort(),
  );
  assert.deepEqual(
    Object.keys(parsed.acceptance_blockers[0]).sort(),
    Object.keys(schema.$defs.designAcceptanceBlocker.properties).sort(),
  );
  assert.ok(
    schema.$defs.evidenceCapability.enum.includes("design_conformance"),
  );
  assert.deepEqual(
    schema.$defs.designAcceptanceBlocker.properties.status.enum,
    ["machine_claim", "external_confirmation"],
  );

  const legacy = deliveryContract();
  legacy.outcomes[0].product.controls.push({
    key: "save",
    location: "footer",
    trigger: "",
    input: "",
    loading_state: "",
    empty_state: "",
    success_state: "",
    failure_state: "",
    feedback: "",
  });
  delete legacy.outcomes[0].product.surface_bindings;
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(legacy)),
    /semantic_drift_migration_required:outcomes\[0\]\.product\.surface_bindings/u,
  );
  assert.ok(
    schema.$defs.product.allOf[0].then.required.includes("surface_bindings"),
  );
});

test("negative-only Global Check and zero positive Assertions have Schema/Parser parity", async () => {
  const contract = deliveryContract();
  contract.global.applicability.push({
    key: "global-root-success",
    target_ref: "fixture-app",
    journey_role: "success",
    dimensions: [{ key: "delivery-state", value: "success" }],
    given_refs: ["fixture-loaded"],
    when_refs: ["read-outcome"],
  });
  contract.global.product.non_goals.push({
    key: "no-legacy",
    statement: "Legacy fallback is forbidden.",
    applicability_refs: ["global-root-success"],
  });
  const check = structuredClone(contract.outcomes[0].acceptance.checks[0]);
  check.key = "negative-only";
  check.positive_assertions = [];
  check.negative_assertions = [
    {
      key: "legacy-absent",
      criterion: "The retired legacy behavior remains absent.",
      claims: ["non_goal.no-legacy"],
      applicability_ref: "global-root-success",
      observation: "negative",
      evidence_capabilities: ["state_delta"],
      operator: "equals",
      expected: false,
    },
  ];
  contract.global.acceptance.checks.push(check);
  assert.doesNotThrow(() =>
    parseDeliveryContractText(YAML.stringify(contract)),
  );
  const schema = await deliverySchema();
  assert.equal(
    Object.hasOwn(
      schema.$defs.check.properties.positive_assertions,
      "minItems",
    ),
    false,
  );
});

test("Assertion operator and expected rules stay aligned across Schema and Parser", async () => {
  const schema = await deliverySchema();
  assert.deepEqual(
    [...schema.$defs.assertion.properties.operator.enum].sort(),
    [...activeOperators].sort(),
  );
  assert.equal(
    schema.$defs.assertion.properties.operator.enum.includes("not_exists"),
    false,
  );

  const invalid = deliveryContract();
  invalid.outcomes[0].acceptance.checks[0].positive_assertions[0].operator =
    "invalid_operator";
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(invalid)),
    /operator.*must be one of/u,
  );

  const missingExpected = deliveryContract();
  delete missingExpected.outcomes[0].acceptance.checks[0].positive_assertions[0]
    .expected;
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(missingExpected)),
    /assertion_expected_required/u,
  );
  const expectedRequired = schema.$defs.assertion.allOf.find((rule) =>
    rule.then?.required?.includes("expected"),
  );
  assert.ok(expectedRequired);

  const unaryExpected = deliveryContract();
  unaryExpected.outcomes[0].acceptance.checks[0].positive_assertions[0] = {
    key: "exists",
    criterion: "The result carrier exists.",
    claims: ["result"],
    applicability_ref: "first-root-success",
    observation: "result",
    evidence_capabilities: ["presence"],
    operator: "exists",
    expected: true,
  };
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(unaryExpected)),
    /assertion_expected_forbidden/u,
  );
  const expectedForbidden = schema.$defs.assertion.allOf.find((rule) =>
    rule.then?.not?.required?.includes("expected"),
  );
  assert.deepEqual(expectedForbidden.then.not.required, ["expected"]);

  const invalidRegex = deliveryContract();
  invalidRegex.outcomes[0].acceptance.checks[0].positive_assertions[0] = {
    key: "regex",
    criterion: "The result matches the declared pattern.",
    claims: ["result"],
    applicability_ref: "first-root-success",
    observation: "result",
    evidence_capabilities: ["state_delta"],
    operator: "matches",
    expected: "[",
  };
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(invalidRegex)),
    /assertion_expected_invalid_regex/u,
  );
  assert.equal(
    schema.$defs.assertion.allOf.find(
      (rule) => rule.then?.properties?.expected?.format === "regex",
    ).then.properties.expected.format,
    "regex",
  );
});

test("Source authority cardinality and retired dispositions stay aligned across Schema and Parser", async () => {
  const schema = await deliverySchema();
  assert.equal(schema.properties.task.properties.source_paths.minItems, 1);
  assert.equal(schema.properties.source_claims.minItems, 1);
  assert.equal(
    Object.hasOwn(schema.properties.source_claims, "default"),
    false,
  );
  const acceptance = schema.$defs.sourceClaim.properties.disposition.oneOf.find(
    (candidate) => candidate.properties.type.const === "acceptance",
  );
  assert.equal(acceptance.properties.refs.minItems, 1);
  assert.equal(acceptance.properties.refs.maxItems, 1);
  assert.equal(JSON.stringify(schema).includes("out_of_scope"), false);

  const multipleAcceptanceRefs = deliveryContract();
  multipleAcceptanceRefs.source_claims[0].disposition = {
    type: "acceptance",
    refs: ["first.first-check.first-result", "first.first-check.other"],
  };
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(multipleAcceptanceRefs)),
    /source_claim_acceptance_ref_count/u,
  );
});

test("Requirement and Obligation proof surfaces are non-empty and unique in both Schema and Parser", async () => {
  const schema = await deliverySchema();
  for (const definition of ["requirement", "obligation"]) {
    const surfaces =
      schema.$defs[definition].properties.required_proof_surfaces;
    assert.equal(surfaces.minItems, 1, `${definition} minItems`);
    assert.equal(surfaces.uniqueItems, true, `${definition} uniqueItems`);
  }

  for (const [name, select] of [
    ["Requirement", (contract) => contract.outcomes[0].product.requirements[0]],
    ["Obligation", (contract) => contract.outcomes[0].technical.obligations[0]],
  ]) {
    const empty = deliveryContract();
    select(empty).required_proof_surfaces = [];
    assert.throws(
      () => parseDeliveryContractText(YAML.stringify(empty)),
      /required_proof_surfaces_empty/u,
      `${name} empty`,
    );

    const duplicate = deliveryContract();
    select(duplicate).required_proof_surfaces = [
      "runtime_behavior",
      "runtime_behavior",
    ];
    assert.throws(
      () => parseDeliveryContractText(YAML.stringify(duplicate)),
      /required_proof_surface_duplicate/u,
      `${name} duplicate`,
    );
  }
});

test("Preflight and direct Compile reject the same operator and proof-surface safety errors", async () => {
  const scenarios = [
    {
      code: "claim_assertion_explicit_expected_required",
      mutate(contract) {
        const assertion =
          contract.outcomes[0].acceptance.checks[0].positive_assertions[0];
        assertion.operator = "truthy";
        delete assertion.expected;
      },
    },
    ...[
      [
        "Requirement",
        (contract) => contract.outcomes[0].product.requirements[0],
      ],
      [
        "Obligation",
        (contract) => contract.outcomes[0].technical.obligations[0],
      ],
    ].flatMap(([name, select]) => [
      {
        code: "required_proof_surfaces_empty",
        name: `${name} empty`,
        mutate(contract) {
          select(contract).required_proof_surfaces = [];
        },
      },
      {
        code: "required_proof_surface_duplicate",
        name: `${name} duplicate`,
        mutate(contract) {
          select(contract).required_proof_surfaces = [
            "runtime_behavior",
            "runtime_behavior",
          ];
        },
      },
    ]),
  ];
  for (const scenario of scenarios) {
    const fixture = await createDeliveryFixture();
    try {
      scenario.mutate(fixture.contract);
      await writeContract(fixture.workdir, fixture.contract);
      const preflight = await preflightDeliveryContract(
        fixture.workdir,
        fixture.root,
      );
      assert.equal(preflight.status, "not_ready", scenario.name);
      assert.ok(
        preflight.diagnostics.some((item) => item.code === scenario.code),
        `${scenario.name ?? scenario.code}: missing ${scenario.code}`,
      );
      await assert.rejects(
        compileDeliveryContract(fixture.workdir, fixture.root, {
          require_completion_gate: false,
        }),
        new RegExp(scenario.code, "u"),
        scenario.name,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

async function deliverySchema() {
  const repo = fileURLToPath(new URL("../..", import.meta.url));
  return JSON.parse(
    await readFile(
      path.join(
        repo,
        "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
      ),
      "utf8",
    ),
  );
}
