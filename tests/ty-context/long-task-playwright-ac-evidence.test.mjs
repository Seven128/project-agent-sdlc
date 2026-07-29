import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { decodeCheckEvidence } from "../../packages/ty-context/dist/lib/long-task-check-evidence-decoder.js";
import { evaluateCheckEvidence } from "../../packages/ty-context/dist/lib/long-task-evidence-v2.js";
import {
  designFactExpectationFixture,
  designFactResultFixture,
} from "./long-task-delivery-fixtures.mjs";

test("Playwright exposes independent AC observations and localizes a failed case", async () => {
  const check = compiledPlaywrightCheck();
  const decoded = decode(
    check,
    report([
      ac("ac-one", "expected", "passed"),
      ac("ac-two", "unexpected", "failed"),
    ]),
    1,
  );
  assert.equal(decoded.observations["playwright.case.ac-one.passed"], true);
  assert.equal(decoded.observations["playwright.case.ac-two.passed"], false);

  const result = await evaluateCheckEvidence(
    check,
    raw(check, decoded),
    path.resolve("."),
  );
  assert.deepEqual(result.claim_proofs, []);
  const finding = result.findings.find(
    (item) => item.assertion_key === "ac-two",
  );
  assert.equal(finding?.code, "acceptance_case_unexpected");
  assert.deepEqual(finding?.claim_keys, ["requirement.two"]);
});

test("missing and skipped Playwright AC cases have distinct findings", async () => {
  const check = compiledPlaywrightCheck();
  const missingDecoded = decode(
    check,
    report([ac("ac-one", "expected", "passed")]),
    0,
  );
  const missing = await evaluateCheckEvidence(
    check,
    raw(check, missingDecoded),
    path.resolve("."),
  );
  assert.equal(
    missing.findings.find((item) => item.assertion_key === "ac-two")?.code,
    "acceptance_case_not_executed",
  );
  assert.equal(
    Object.hasOwn(missingDecoded.observations, "playwright.case.ac-two.passed"),
    false,
  );
  assert.equal(
    Object.hasOwn(
      missingDecoded.observations,
      "playwright.case.ac-two.skipped",
    ),
    false,
  );

  const skippedDecoded = decode(
    check,
    report([
      ac("ac-one", "expected", "passed"),
      ac("ac-two", "skipped", "skipped"),
    ]),
    0,
  );
  const skipped = await evaluateCheckEvidence(
    check,
    raw(check, skippedDecoded),
    path.resolve("."),
  );
  assert.equal(
    skipped.findings.find((item) => item.assertion_key === "ac-two")?.code,
    "acceptance_case_skipped",
  );
});

test("duplicate Playwright AC ids are invalid evidence", () => {
  const check = compiledPlaywrightCheck();
  const decoded = decode(
    check,
    report([
      ac("ac-one", "expected", "passed"),
      ac("ac-one", "expected", "passed"),
    ]),
    0,
  );
  assert.equal(decoded.execution_status, "invalid_evidence");
  assert.equal(decoded.error, "playwright_ac_id_duplicate:ac-one:default");
});

test("new [ac:key] tokens bind exactly one declared AC", () => {
  const check = compiledPlaywrightCheck();
  const decoded = decode(
    check,
    report([ac("ac-one", "expected", "passed")]),
    0,
  );
  assert.equal(decoded.execution_status, "completed");
  assert.equal(decoded.observations["playwright.case.ac-one.passed"], true);
  assert.deepEqual(decoded.observations["playwright.case_ids"], ["ac-one"]);
});

test("ordinary and undeclared Playwright tags never become AC observations", () => {
  const check = compiledPlaywrightCheck();
  const decoded = decode(
    check,
    report([
      tagged("[smoke] [mobile] helper", "expected", "passed"),
      tagged("[ac:unknown] [unknown] helper", "expected", "passed"),
    ]),
    0,
  );
  assert.equal(decoded.execution_status, "completed");
  assert.deepEqual(decoded.observations["playwright.case_ids"], []);
  for (const id of ["smoke", "mobile", "unknown"])
    assert.equal(
      Object.hasOwn(decoded.observations, `playwright.case.${id}.passed`),
      false,
      id,
    );
});

test("legacy [key] tokens remain compatible only for declared AC keys", () => {
  const check = compiledPlaywrightCheck();
  const decoded = decode(
    check,
    report([
      tagged("[ac-one] legacy declared", "expected", "passed"),
      tagged("[unknown] legacy helper", "expected", "passed"),
    ]),
    0,
  );
  assert.equal(decoded.execution_status, "completed");
  assert.equal(decoded.observations["playwright.case.ac-one.passed"], true);
  assert.deepEqual(decoded.observations["playwright.case_ids"], ["ac-one"]);
  assert.equal(
    Object.hasOwn(decoded.observations, "playwright.case.unknown.passed"),
    false,
  );
});

test("one Playwright Test Instance cannot bind multiple declared AC ids", () => {
  const check = compiledPlaywrightCheck();
  const decoded = decode(
    check,
    report([
      tagged("[ac:ac-one] [ac:ac-two] copied proof", "expected", "passed"),
    ]),
    0,
  );
  assert.equal(decoded.execution_status, "invalid_evidence");
  assert.match(decoded.error, /^playwright_test_multiple_ac_ids:/u);
});

test("the same AC aggregates independently across Playwright projects", () => {
  const check = compiledPlaywrightCheck();
  const decoded = decode(
    check,
    report([
      ac("ac-one", "expected", "passed", "chromium"),
      ac("ac-one", "expected", "passed", "firefox"),
      ac("ac-one", "expected", "passed", "webkit"),
      ac("ac-two", "expected", "passed", "chromium"),
    ]),
    0,
  );
  assert.equal(decoded.execution_status, "completed");
  assert.equal(decoded.observations["playwright.case.ac-one.passed"], true);
  assert.deepEqual(decoded.observations["playwright.case.ac-one.project_ids"], [
    "chromium",
    "firefox",
    "webkit",
  ]);
  assert.equal(
    decoded.observations["playwright.case.ac-one.executed_instances"],
    3,
  );

  const failed = decode(
    check,
    report([
      ac("ac-one", "expected", "passed", "chromium"),
      ac("ac-one", "unexpected", "failed", "firefox"),
      ac("ac-two", "expected", "passed", "chromium"),
    ]),
    1,
  );
  assert.equal(failed.observations["playwright.case.ac-one.passed"], false);
  assert.equal(
    failed.observations["playwright.case.ac-one.failed_instances"],
    1,
  );
});

test("an executed Playwright AC emits its compiled design-conformance record", () => {
  const check = compiledPlaywrightCheck();
  check.positive_assertions[0].evidence_capabilities.push(
    "design_conformance",
    "design_method",
    "target_runtime",
  );
  check.design_conformance_targets = [
    {
      key: "map-default",
      target_ref: "browser-app",
      condition_keys: ["phone", "dark", "default"],
      conformance_assertion_ref: "root-conformance",
      verification_method_bindings: [
        {
          method: "layout_geometry",
          assertion_ref: "ac-one",
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
              observation_path: "artifacts/map-layout-default-observation.json",
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
  ];
  const withoutMethodAttachments = decode(
    check,
    report([ac("ac-one", "expected", "passed")]),
    0,
  );
  assert.equal(
    withoutMethodAttachments.evidence_records.some(
      (record) => record.capability === "design_method",
    ),
    false,
  );
  const methodAttachmentNames = ["phone", "dark", "default"].flatMap(
    (condition) => [
      `ty-context-design-method:map-default:layout_geometry:${condition}:record`,
      `ty-context-design-method:map-default:layout_geometry:${condition}:observation`,
    ],
  );
  const methodAttachmentPayloads = Object.fromEntries(
    ["phone", "dark", "default"].map((condition) => {
      const factRef = `map.layout.${condition}`;
      return [
        `ty-context-design-method:map-default:layout_geometry:${condition}:record`,
        {
          schema_version: "design-method-fact-results-v1",
          fact_results: [
            designFactResultFixture(designFactExpectationFixture(factRef), {
              artifactPath: `artifacts/map-layout-${condition}.json`,
              observationPath: `artifacts/map-layout-${condition}-observation.json`,
            }),
          ],
        },
      ];
    }),
  );
  const decoded = decode(
    check,
    report([
      ac(
        "ac-one",
        "expected",
        "passed",
        "default",
        methodAttachmentNames,
        methodAttachmentPayloads,
      ),
    ]),
    0,
  );
  assert.deepEqual(
    decoded.evidence_records.filter(
      (record) => record.capability === "design_conformance",
    ),
    [
      {
        assertion_key: "ac-one",
        capability: "design_conformance",
        design_target_ref: "map-default",
        target_ref: "browser-app",
        condition_keys: ["phone", "dark", "default"],
        actual_artifact_path: "artifacts/map-actual.png",
        comparison_artifact_path: "artifacts/map-diff.json",
      },
    ],
  );
  assert.ok(
    decoded.evidence_records.some(
      (record) =>
        record.capability === "target_runtime" &&
        record.target_ref === "browser-app" &&
        record.cold_start,
    ),
  );
  assert.deepEqual(
    decoded.evidence_records.filter(
      (record) => record.capability === "design_method",
    ),
    [
      {
        assertion_key: "ac-one",
        capability: "design_method",
        design_target_ref: "map-default",
        target_ref: "browser-app",
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
                  observationPath:
                    "artifacts/map-layout-phone-observation.json",
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
                },
              ),
            ],
          },
        ],
      },
    ],
  );
});

function compiledPlaywrightCheck() {
  return {
    internal_id: "CHECK.first.ui",
    outcome_key: "first",
    key: "ui",
    journey_roles: ["success"],
    execution_target: { target_ref: "browser-app", entrypoint: "root" },
    execution_target_definition: {
      key: "browser-app",
      description: "The browser fixture.",
      role: "product",
      runtime_family: "browser",
      root_entrypoint: "/",
      capabilities: ["browser-runtime", "cold-start", "production-root"],
    },
    known_execution_targets: [
      {
        key: "browser-app",
        description: "The browser fixture.",
        role: "product",
        runtime_family: "browser",
        root_entrypoint: "/",
        capabilities: ["browser-runtime", "cold-start", "production-root"],
      },
    ],
    scenario: {
      given: [{ key: "fixture-loaded", statement: "Load the fixture." }],
      when: [{ key: "read-outcome", statement: "Read the outcome." }],
    },
    proof_surface: "ui_browser",
    runner: {
      type: "playwright_test",
      target: "tests/ui.spec.ts",
      argv: [],
      cwd: ".",
      timeout_ms: 30000,
      effect: "test_sandbox",
      retry_policy: "none",
      idempotent: false,
      executable: process.execPath,
      executable_argv_prefix: [],
      resolved_cwd: "",
      resolved_target: "tests/ui.spec.ts",
      definition_sha256: "playwright",
      frozen_files: {},
      package_script: null,
      execution_identity: "playwright",
    },
    evidence_adapter: "playwright_json_v1",
    verification_inputs: ["tests/ui.spec.ts"],
    verification_input_hashes: {},
    raw_execution_identity: "playwright",
    design_conformance_targets: [],
    input_paths: [],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [
      {
        key: "ac-one",
        criterion: "The first acceptance case passes.",
        claims: ["requirement.one"],
        observation: "playwright.case.ac-one.passed",
        evidence_capabilities: ["interaction_trace"],
        operator: "equals",
        expected: true,
      },
      {
        key: "ac-two",
        criterion: "The second acceptance case passes.",
        claims: ["requirement.two"],
        observation: "playwright.case.ac-two.passed",
        evidence_capabilities: ["interaction_trace"],
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [],
    environment_requirements: [],
  };
}

function report(cases) {
  const counts = {
    expected: cases.filter((item) => item.test.status === "expected").length,
    unexpected: cases.filter((item) => item.test.status === "unexpected")
      .length,
    skipped: cases.filter((item) => item.test.status === "skipped").length,
    flaky: cases.filter((item) => item.test.status === "flaky").length,
  };
  return {
    stats: counts,
    suites: [
      {
        specs: cases.map((item) => ({
          title: item.title,
          tests: [item.test],
        })),
      },
    ],
  };
}

function ac(
  id,
  status,
  resultStatus,
  projectId = "default",
  attachmentNames = [],
  attachmentPayloads = {},
) {
  return {
    id,
    title: `[ac:${id}] ${id}`,
    test: {
      projectId,
      status,
      results: [
        {
          status: resultStatus,
          steps: [
            { title: "[given:fixture-loaded]" },
            { title: "[action:read-outcome]" },
          ],
          attachments: attachmentNames.map((name) => ({
            name,
            contentType: "application/json",
            path: `artifacts/${name}.json`,
            ...(attachmentPayloads[name]
              ? {
                  body: Buffer.from(
                    JSON.stringify(attachmentPayloads[name]),
                  ).toString("base64"),
                }
              : {}),
          })),
        },
      ],
    },
  };
}

function tagged(title, status, resultStatus, projectId = "default") {
  return {
    id: title,
    title,
    test: {
      projectId,
      status,
      results: [
        {
          status: resultStatus,
          steps: [
            { title: "[given:fixture-loaded]" },
            { title: "[action:read-outcome]" },
          ],
        },
      ],
    },
  };
}

function decode(check, value, exitCode) {
  return decodeCheckEvidence(
    check,
    exitCode,
    Buffer.from(JSON.stringify(value)),
    Buffer.alloc(0),
  );
}

function raw(check, decoded) {
  return {
    raw_execution_identity: check.raw_execution_identity,
    execution_identity: check.raw_execution_identity,
    ...decoded,
    stdout_sha256: "stdout",
    stderr_sha256: "stderr",
    attempts: 1,
    duration_ms: 1,
  };
}
