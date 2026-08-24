import type {
  AssertionOperator,
  BinaryAssertionOperator,
  DeliveryAssertionV2,
  DeliveryCheckV2,
  DeliveryRunnerV2,
  PresenceOrUnaryAssertionOperator,
  RunnerType,
} from "./long-task-delivery-types.js";
import {
  array,
  EVIDENCE_CAPABILITIES,
  fail,
  key,
  JOURNEY_ROLES,
  literal,
  object,
  parseEnvironmentRequirements,
  PROOF_SURFACES,
  repositoryCwd,
  repositoryFile,
  repositoryPatterns,
  string,
  strings,
} from "./long-task-delivery-shape.js";

export function parseCheck(value: unknown, label: string): DeliveryCheckV2 {
  const row = object(
    value,
    label,
    [
      "key",
      "journey_roles",
      "execution_target",
      "scenario",
      "proof_surface",
      "runner",
      "verification_inputs",
    ],
    [
      "input_paths",
      "expected_output_paths",
      "artifact_globs",
      "positive_assertions",
      "negative_assertions",
      "environment_requirements",
    ],
  );
  const executionTarget = object(
    row.execution_target,
    `${label}.execution_target`,
    ["target_ref", "entrypoint"],
  );
  const scenario = object(row.scenario, `${label}.scenario`, ["given", "when"]);
  return {
    key: key(row.key, `${label}.key`),
    journey_roles: array(row.journey_roles, `${label}.journey_roles`).map(
      (item, index) =>
        literal(item, JOURNEY_ROLES, `${label}.journey_roles[${index}]`),
    ),
    execution_target: {
      target_ref: key(
        executionTarget.target_ref,
        `${label}.execution_target.target_ref`,
      ),
      entrypoint: literal(
        executionTarget.entrypoint,
        ["root", "internal"] as const,
        `${label}.execution_target.entrypoint`,
      ),
    },
    scenario: {
      given: parseScenarioSteps(scenario.given, `${label}.scenario.given`),
      when: parseScenarioSteps(scenario.when, `${label}.scenario.when`),
    },
    proof_surface: literal(
      row.proof_surface,
      PROOF_SURFACES,
      `${label}.proof_surface`,
    ),
    runner: parseRunner(row.runner, `${label}.runner`),
    verification_inputs: repositoryPatterns(
      row.verification_inputs,
      `${label}.verification_inputs`,
    ),
    input_paths: Object.hasOwn(row, "input_paths")
      ? repositoryPatterns(row.input_paths, `${label}.input_paths`)
      : [],
    expected_output_paths: Object.hasOwn(row, "expected_output_paths")
      ? repositoryPatterns(
          row.expected_output_paths,
          `${label}.expected_output_paths`,
        )
      : [],
    artifact_globs: Object.hasOwn(row, "artifact_globs")
      ? repositoryPatterns(row.artifact_globs, `${label}.artifact_globs`)
      : [],
    positive_assertions: Object.hasOwn(row, "positive_assertions")
      ? parseAssertions(row.positive_assertions, `${label}.positive_assertions`)
      : [],
    negative_assertions: Object.hasOwn(row, "negative_assertions")
      ? parseAssertions(row.negative_assertions, `${label}.negative_assertions`)
      : [],
    environment_requirements: Object.hasOwn(row, "environment_requirements")
      ? parseEnvironmentRequirements(
          row.environment_requirements,
          `${label}.environment_requirements`,
        )
      : [],
  };
}

function parseRunner(value: unknown, label: string): DeliveryRunnerV2 {
  const row = object(
    value,
    label,
    ["type", "target", "effect"],
    ["argv", "cwd", "timeout_ms", "retry_policy", "idempotent"],
  );
  const timeout = Object.hasOwn(row, "timeout_ms")
    ? Number(row.timeout_ms)
    : 30_000;
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 3_600_000)
    fail(`${label}.timeout_ms`, "must be an integer from 100 to 3600000");
  if (Object.hasOwn(row, "idempotent") && typeof row.idempotent !== "boolean")
    fail(`${label}.idempotent`, "must be a boolean");
  const type = literal(
    row.type,
    [
      "package_script",
      "project_binary",
      "node_oracle",
      "playwright_test",
    ] as const satisfies readonly RunnerType[],
    `${label}.type`,
  );
  return {
    type,
    target:
      type === "package_script"
        ? string(row.target, `${label}.target`)
        : repositoryFile(row.target, `${label}.target`),
    argv: Object.hasOwn(row, "argv") ? strings(row.argv, `${label}.argv`) : [],
    cwd: Object.hasOwn(row, "cwd")
      ? repositoryCwd(row.cwd, `${label}.cwd`)
      : ".",
    timeout_ms: timeout,
    effect: literal(
      row.effect,
      ["read_only", "test_sandbox"] as const,
      `${label}.effect`,
    ),
    retry_policy: Object.hasOwn(row, "retry_policy")
      ? literal(
          row.retry_policy,
          ["none", "transient_once"] as const,
          `${label}.retry_policy`,
        )
      : "none",
    idempotent: Object.hasOwn(row, "idempotent")
      ? (row.idempotent as boolean)
      : false,
  };
}

function parseAssertions(value: unknown, label: string): DeliveryAssertionV2[] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(
      item,
      itemLabel,
      ["key", "claims", "observation", "operator", "evidence_capabilities"],
      ["criterion", "applicability_ref", "expected", "expected_authority_ref"],
    );
    const operator = literal(
      row.operator,
      [
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
      ] as const satisfies readonly AssertionOperator[],
      `${itemLabel}.operator`,
    );
    const hasExpected = Object.hasOwn(row, "expected");
    if (isBinaryAssertionOperator(operator) && !hasExpected)
      fail(itemLabel, "assertion_expected_required");
    if (!isBinaryAssertionOperator(operator) && hasExpected)
      fail(itemLabel, "assertion_expected_forbidden");
    if (isBinaryAssertionOperator(operator))
      validateAssertionExpected(operator, row.expected, itemLabel);
    const base = {
      key: key(row.key, `${itemLabel}.key`),
      ...(Object.hasOwn(row, "criterion")
        ? { criterion: string(row.criterion, `${itemLabel}.criterion`) }
        : {}),
      claims: strings(row.claims, `${itemLabel}.claims`),
      ...(Object.hasOwn(row, "applicability_ref")
        ? {
            applicability_ref: key(
              row.applicability_ref,
              `${itemLabel}.applicability_ref`,
            ),
          }
        : {}),
      observation: string(row.observation, `${itemLabel}.observation`),
      evidence_capabilities: array(
        row.evidence_capabilities,
        `${itemLabel}.evidence_capabilities`,
      ).map((capability, capabilityIndex) =>
        literal(
          capability,
          EVIDENCE_CAPABILITIES,
          `${itemLabel}.evidence_capabilities[${capabilityIndex}]`,
        ),
      ),
      ...(Object.hasOwn(row, "expected_authority_ref")
        ? {
            expected_authority_ref: string(
              row.expected_authority_ref,
              `${itemLabel}.expected_authority_ref`,
            ),
          }
        : {}),
      operator,
    };
    return isBinaryAssertionOperator(operator)
      ? { ...base, operator, expected: row.expected }
      : {
          ...base,
          operator: operator as PresenceOrUnaryAssertionOperator,
        };
  });
}

function parseScenarioSteps(
  value: unknown,
  label: string,
): DeliveryCheckV2["scenario"]["given"] {
  return array(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = object(item, itemLabel, ["key", "statement"]);
    return {
      key: key(row.key, `${itemLabel}.key`),
      statement: string(row.statement, `${itemLabel}.statement`),
    };
  });
}

function isBinaryAssertionOperator(
  operator: AssertionOperator,
): operator is BinaryAssertionOperator {
  return !["exists", "truthy", "falsy"].includes(operator);
}

function validateAssertionExpected(
  operator: BinaryAssertionOperator,
  expected: unknown,
  label: string,
): void {
  if (operator === "matches" || operator === "not_matches") {
    if (typeof expected !== "string")
      fail(label, "assertion_expected_string_required");
    try {
      new RegExp(expected, "u");
    } catch {
      fail(label, "assertion_expected_invalid_regex");
    }
  }
  if (
    ["greater_than", "greater_or_equal", "less_than", "less_or_equal"].includes(
      operator,
    ) &&
    (typeof expected !== "number" || !Number.isFinite(expected))
  )
    fail(label, "assertion_expected_finite_number_required");
  if (
    ["set_equals", "subset_of", "superset_of"].includes(operator) &&
    !Array.isArray(expected)
  )
    fail(label, "assertion_expected_array_required");
}
