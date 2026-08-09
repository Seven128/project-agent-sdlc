import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { evaluateDeliveryAssertion } from "../../packages/ty-context/dist/lib/long-task-assertions-v2.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import { evaluateCheckEvidence } from "../../packages/ty-context/dist/lib/long-task-evidence-v2.js";
import { deliveryContract } from "./long-task-delivery-fixtures.mjs";

const binaryOperators = [
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
  "set_equals",
  "subset_of",
  "superset_of",
];
const presenceOrUnaryOperators = ["exists", "truthy", "falsy"];

test("all active Assertion operators fail closed for missing Observations", () => {
  for (const operator of [...presenceOrUnaryOperators, ...binaryOperators]) {
    const assertion = {
      key: "safety",
      claims: ["result"],
      observation: "missing.value",
      evidence_capabilities: ["presence"],
      operator,
      ...(binaryOperators.includes(operator)
        ? { expected: expected(operator) }
        : {}),
    };
    assert.equal(evaluateDeliveryAssertion(assertion, {}), false, operator);
  }
});

test("not_exists is rejected by the Runtime Parser and absent from the JSON Schema", async () => {
  const contract = deliveryContract();
  contract.outcomes[0].acceptance.checks[0].positive_assertions[0].operator =
    "not_exists";
  delete contract.outcomes[0].acceptance.checks[0].positive_assertions[0]
    .expected;
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(contract)),
    /operator.*must be one of/u,
  );
  const schema = await deliverySchema();
  assert.equal(
    schema.$defs.assertion.properties.operator.enum.includes("not_exists"),
    false,
  );
  assert.equal(
    JSON.stringify(schema.$defs.assertion).includes("not_exists"),
    false,
  );
});

test("Parser statically validates expected presence, type, and regular expressions", () => {
  for (const operator of binaryOperators) {
    const contract = contractWithAssertion(operator);
    delete contract.outcomes[0].acceptance.checks[0].positive_assertions[0]
      .expected;
    assert.throws(
      () => parseDeliveryContractText(YAML.stringify(contract)),
      /assertion_expected_required/u,
      operator,
    );
  }
  for (const operator of presenceOrUnaryOperators) {
    const contract = contractWithAssertion(operator);
    contract.outcomes[0].acceptance.checks[0].positive_assertions[0].expected = true;
    assert.throws(
      () => parseDeliveryContractText(YAML.stringify(contract)),
      /assertion_expected_forbidden/u,
      operator,
    );
  }
  for (const operator of [...presenceOrUnaryOperators, ...binaryOperators])
    assert.doesNotThrow(
      () =>
        parseDeliveryContractText(
          YAML.stringify(contractWithAssertion(operator)),
        ),
      operator,
    );

  const invalidRegex = contractWithAssertion("matches");
  invalidRegex.outcomes[0].acceptance.checks[0].positive_assertions[0].expected =
    "[";
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(invalidRegex)),
    /assertion_expected_invalid_regex/u,
  );
  const invalidNumeric = contractWithAssertion("greater_than");
  invalidNumeric.outcomes[0].acceptance.checks[0].positive_assertions[0].expected =
    "1";
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(invalidNumeric)),
    /assertion_expected_finite_number_required/u,
  );
  const invalidSet = contractWithAssertion("set_equals");
  invalidSet.outcomes[0].acceptance.checks[0].positive_assertions[0].expected =
    {};
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(invalidSet)),
    /assertion_expected_array_required/u,
  );
});

test("negative operators cannot pass through incomparable Observation types", () => {
  assert.equal(
    evaluateDeliveryAssertion(assertion("not_contains", "value"), {
      value: 123,
    }),
    false,
  );
  assert.equal(
    evaluateDeliveryAssertion(assertion("not_contains", "value"), {
      value: { nested: true },
    }),
    false,
  );
  assert.equal(
    evaluateDeliveryAssertion(assertion("not_matches", ".*"), {
      value: 123,
    }),
    false,
  );
  assert.equal(
    evaluateDeliveryAssertion(assertion("less_than", 10), {
      value: Number.POSITIVE_INFINITY,
    }),
    false,
  );
  assert.equal(
    evaluateDeliveryAssertion(assertion("subset_of", []), {
      value: "not-an-array",
    }),
    false,
  );
  assert.equal(
    evaluateDeliveryAssertion(assertion("equals", false), {
      value: false,
    }),
    true,
  );
});

test("missing admitted Observation produces invalid_evidence without Claim proof", async () => {
  const check = {
    internal_id: "CHECK.safety.missing",
    outcome_key: "safety",
    key: "missing",
    proof_surface: "runtime_behavior",
    runner: {
      type: "node_oracle",
      target: "tests/missing.mjs",
      argv: [],
      cwd: ".",
      timeout_ms: 1000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
      executable: process.execPath,
      executable_argv_prefix: [],
      resolved_cwd: "",
      resolved_target: "tests/missing.mjs",
      definition_sha256: "missing",
      frozen_files: {},
      package_script: null,
      raw_execution_identity: "missing",
      execution_identity: "missing",
    },
    verification_input_hashes: {},
    input_paths: [],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [],
    negative_assertions: [
      {
        key: "missing-result",
        claims: ["OUT.safety.result"],
        observation: "missing",
        evidence_capabilities: ["presence"],
        operator: "equals",
        expected: false,
      },
    ],
    environment_requirements: [],
  };
  const result = await evaluateCheckEvidence(
    check,
    {
      raw_execution_identity: "missing",
      execution_identity: "missing",
      execution_status: "completed",
      exit_code: 0,
      observations: {},
      stdout_sha256: "stdout",
      stderr_sha256: "stderr",
      attempts: 1,
      duration_ms: 1,
      error: null,
    },
    path.resolve("."),
  );
  assert.equal(result.status, "invalid_evidence");
  assert.deepEqual(result.claim_proofs, []);
  assert.ok(
    result.findings.some(
      (finding) => finding.actual === "machine_observer_not_admitted",
    ),
  );
});

test("a Check emits Claim Proof only when its complete status is passed", async () => {
  const base = compiledCheck();
  const passingRaw = rawExecution(base, {
    result: true,
    population: {
      universe_ids: ["first"],
      eligible_ids: ["first"],
      observed_ids: [],
      excluded_items: [],
    },
  });
  const passing = await evaluateCheckEvidence(
    base,
    passingRaw,
    path.resolve("."),
  );
  assert.equal(passing.status, "passed");
  assert.equal(passing.claim_proofs.length, 1);

  const exitFailure = await evaluateCheckEvidence(
    base,
    { ...passingRaw, exit_code: 1 },
    path.resolve("."),
  );
  assert.equal(exitFailure.status, "test_failed");
  assert.deepEqual(exitFailure.claim_proofs, []);

  const artifactCheck = {
    ...structuredClone(base),
    artifact_globs: ["artifacts/definitely-missing.json"],
  };
  const artifactFailure = await evaluateCheckEvidence(
    artifactCheck,
    passingRaw,
    path.resolve("."),
  );
  assert.equal(artifactFailure.status, "invalid_evidence");
  assert.deepEqual(artifactFailure.claim_proofs, []);

  const assertionCheck = structuredClone(base);
  assertionCheck.positive_assertions[0].expected = false;
  const assertionFailure = await evaluateCheckEvidence(
    assertionCheck,
    passingRaw,
    path.resolve("."),
  );
  assert.equal(assertionFailure.status, "assertion_failed");
  assert.deepEqual(assertionFailure.claim_proofs, []);

  const populationOutcome = {
    key: "safety",
    product: { owner: { path_globs: ["src/**"] } },
    acceptance: {
      population: {
        check_key: base.key,
        universe_binding_key: "state-first",
        claims: ["result"],
        observations: {
          universe_ids: "population.universe_ids",
          eligible_ids: "population.eligible_ids",
          observed_ids: "population.observed_ids",
          excluded_items: "population.excluded_items",
        },
        exclusion_rules: [],
      },
    },
  };
  const populationFailure = await evaluateCheckEvidence(
    base,
    passingRaw,
    path.resolve("."),
    populationOutcome,
  );
  assert.equal(populationFailure.status, "assertion_failed");
  assert.deepEqual(populationFailure.claim_proofs, []);
});

function contractWithAssertion(operator) {
  const contract = deliveryContract();
  const coverage = structuredClone(
    contract.outcomes[0].acceptance.checks[0].positive_assertions,
  );
  contract.outcomes[0].acceptance.checks[0].positive_assertions = [
    {
      key: "assertion",
      criterion: "Auxiliary operator parsing remains well-defined.",
      claims: [],
      observation: "auxiliary",
      evidence_capabilities: ["presence"],
      operator,
      ...(binaryOperators.includes(operator)
        ? { expected: expected(operator) }
        : {}),
    },
    ...coverage,
  ];
  return contract;
}

function assertion(operator, expectedValue) {
  return {
    key: "negative",
    claims: ["result"],
    observation: "value",
    evidence_capabilities: ["presence"],
    operator,
    expected: expectedValue,
  };
}

function expected(operator) {
  if (
    ["greater_than", "greater_or_equal", "less_than", "less_or_equal"].includes(
      operator,
    )
  )
    return 0;
  if (["set_equals", "subset_of", "superset_of"].includes(operator)) return [];
  if (["matches", "not_matches"].includes(operator)) return ".*";
  if (["contains", "not_contains"].includes(operator)) return "value";
  return true;
}

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

function compiledCheck() {
  return {
    internal_id: "CHECK.safety.complete",
    outcome_key: "safety",
    key: "complete",
    proof_surface: "runtime_behavior",
    evidence_adapter: "structured_json_v2",
    runner: {
      type: "node_oracle",
      target: "tests/oracle.mjs",
      argv: [],
      cwd: ".",
      timeout_ms: 1000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
      executable: process.execPath,
      executable_argv_prefix: [],
      resolved_cwd: "",
      resolved_target: "tests/oracle.mjs",
      definition_sha256: "complete",
      frozen_files: {},
      package_script: null,
      execution_identity: "complete",
    },
    verification_inputs: ["tests/oracle.mjs"],
    verification_input_hashes: {},
    raw_execution_identity: "complete",
    input_paths: [],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [
      {
        key: "result",
        criterion: "The complete Check result is true.",
        claims: ["result"],
        observation: "result",
        evidence_capabilities: ["presence"],
        operator: "equals",
        expected: true,
      },
    ],
    negative_assertions: [],
    environment_requirements: [],
    observation_authorities: [
      {
        actual_projection: "raw_exact",
        assertion_ref: "result",
        authority: "package_static_json_exact",
        carrier_refs: [],
        claim_refs: ["result"],
        comparison: {
          comparator: "exact_value",
          mask_sha256: null,
          mode: "exact",
          parameters_sha256: digest("exact-parameters"),
          tolerance_sha256: null,
        },
        evidence_capabilities: ["presence"],
        expected_identity: digest("expected-result"),
        expected_value_sha256: digest(JSON.stringify(true)),
        fact_ref: null,
        locator_policy: {
          kind: "fixed_json_pointer",
          value: "/observations/assertion.safety.complete.result",
        },
        method: "exact_value",
        obligation_ref: "assertion.safety.complete.result",
        observation_identity: "assertion.safety.complete.result",
        proof_surface: "static_structure",
        runtime_requirements: {
          declared_root_argv: [],
          declared_root_entrypoint: "tests/oracle.mjs",
          direct_root_match: false,
          effect: "read_only",
          entrypoint: "root",
          resolved_runner_argv: [],
          resolved_runner_target: "tests/oracle.mjs",
          runner_type: "node_oracle",
          runtime_family: "process",
          target_role: "product",
        },
        target_ref: "safety-target",
      },
    ],
  };
}

function rawExecution(check, observations) {
  return {
    raw_execution_identity: check.raw_execution_identity,
    execution_identity: check.raw_execution_identity,
    execution_status: "completed",
    exit_code: 0,
    observations,
    evidence_records: [],
    package_observations: [packageObservation(check, true)],
    stdout_sha256: "stdout",
    stderr_sha256: "stderr",
    attempts: 1,
    duration_ms: 1,
    error: null,
  };
}

function packageObservation(check, rawValue) {
  const authority = check.observation_authorities[0];
  return {
    authority: authority.authority,
    observation_identity: authority.observation_identity,
    assertion_ref: authority.assertion_ref,
    obligation_ref: authority.obligation_ref,
    method: authority.method,
    raw_value: rawValue,
    observation: {
      capability: "json-pointer-exact-v1",
      artifact_path: "static-observation.json",
      artifact_sha256: digest("static-observation"),
      locator: {
        kind: "json_pointer",
        value: authority.locator_policy.value,
      },
      value_sha256: digest(JSON.stringify(rawValue)),
      canonical_value_bytes: Buffer.byteLength(JSON.stringify(rawValue)),
      sensitivity: "plain",
    },
    reason: null,
  };
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
