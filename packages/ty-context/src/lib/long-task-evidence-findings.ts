import {
  evaluateDeliveryAssertionDetailed,
  observationValue,
} from "./long-task-assertions-v2.js";
import type {
  CheckExecutionResultV2,
  CompiledCheckV2,
  CompiledOutcomeV2,
  LongTaskFindingV2,
  RawCommandExecutionV2,
} from "./long-task-delivery-types.js";

export function evaluateAssertionResults(
  check: CompiledCheckV2,
  observations: Record<string, unknown>,
): CheckExecutionResultV2["assertion_results"] {
  const assertions = [
    ...check.positive_assertions.map((assertion) => ({
      assertion,
      polarity: "positive" as const,
    })),
    ...check.negative_assertions.map((assertion) => ({
      assertion,
      polarity: "negative" as const,
    })),
  ];
  return assertions.map(({ assertion, polarity }) => {
    const evaluation = evaluateDeliveryAssertionDetailed(
      assertion,
      observations,
    );
    return {
      key: assertion.key,
      ...(assertion.criterion ? { criterion: assertion.criterion } : {}),
      polarity,
      passed: evaluation.passed,
      claims: assertion.claims,
      ...(assertion.applicability_ref
        ? { applicability_ref: assertion.applicability_ref }
        : {}),
      observation: assertion.observation,
      evidence_capabilities: assertion.evidence_capabilities,
      evidence_complete: false,
      status: evaluation.status,
      ...(Object.hasOwn(evaluation, "expected")
        ? { expected: evaluation.expected }
        : {}),
      ...(Object.hasOwn(evaluation, "actual")
        ? { actual: evaluation.actual }
        : {}),
    };
  });
}

export function classifyCheckStatus(
  raw: RawCommandExecutionV2,
  findings: LongTaskFindingV2[],
): CheckExecutionResultV2["status"] {
  if (raw.execution_status !== "completed") return raw.execution_status;
  if (
    raw.exit_code !== 0 ||
    findings.some((item) => item.code === "test_failed")
  )
    return "test_failed";
  if (
    findings.some(
      (item) =>
        item.code === "invalid_evidence" ||
        item.code === "artifact_missing" ||
        item.code === "evidence_capability_invalid",
    )
  )
    return "invalid_evidence";
  if (
    findings.some((item) => item.assertion_key) ||
    findings.some((item) => item.code === "population_coverage_failed")
  )
    return "assertion_failed";
  return "passed";
}

export function assertionFinding(
  check: CompiledCheckV2,
  result: CheckExecutionResultV2["assertion_results"][number],
  observations: Record<string, unknown>,
  outcome?: CompiledOutcomeV2,
): LongTaskFindingV2 {
  const ac = playwrightCase(result.observation);
  let code: string = result.status;
  let message = `Assertion ${result.key} did not match its expected value.`;
  let nextAction =
    "Fix the observable behavior or the named acceptance assertion, then rerun this Check.";
  if (ac) {
    const prefix = `playwright.case.${ac}`;
    const executed = observationValue(observations, `${prefix}.executed`);
    const skipped = observationValue(observations, `${prefix}.skipped`);
    const flaky = observationValue(observations, `${prefix}.flaky`);
    const unexpected = observationValue(observations, `${prefix}.unexpected`);
    if (flaky.found && flaky.value === true) {
      code = "acceptance_case_flaky";
      message = `Acceptance case ${ac} was flaky.`;
      nextAction =
        "Remove flakiness from every declared Playwright project instance and rerun this Check.";
    } else if (unexpected.found && unexpected.value === true) {
      code = "acceptance_case_unexpected";
      message = `Acceptance case ${ac} had an unexpected result.`;
      nextAction =
        "Fix the unexpected Playwright result in every declared project and rerun this Check.";
    } else if (skipped.found && skipped.value === true) {
      code = "acceptance_case_skipped";
      message = `Acceptance case ${ac} was skipped.`;
      nextAction =
        "Make the declared [ac:<key>] Playwright case executable and rerun this Check.";
    } else if (executed.found && executed.value === false) {
      code = "acceptance_case_not_executed";
      message = `Acceptance case ${ac} was not executed.`;
      nextAction =
        "Add or restore the declared [ac:<key>] Playwright case and rerun this Check.";
    }
  } else if (result.status === "observation_missing") {
    message = `Observation ${result.observation} was missing.`;
    nextAction =
      "Emit the declared Observation from the Check evidence and rerun it.";
  } else if (result.status === "observation_type_mismatch") {
    message = `Observation ${result.observation} had an incompatible type.`;
    nextAction =
      "Fix the Observation type or the Contract operator and rerun this Check.";
  }
  return {
    ...checkFinding(check, code, message, nextAction),
    claim_keys: result.claims,
    assertion_key: result.key,
    ...(result.criterion ? { criterion: result.criterion } : {}),
    observation: result.observation,
    ...(Object.hasOwn(result, "expected") ? { expected: result.expected } : {}),
    ...(Object.hasOwn(result, "actual") ? { actual: result.actual } : {}),
    ...(outcome ? { owner_paths: outcome.product.owner.path_globs } : {}),
  };
}

export function checkFinding(
  check: CompiledCheckV2,
  code: string,
  message: string,
  nextAction: string,
): LongTaskFindingV2 {
  return {
    code,
    outcome_key: check.outcome_key,
    check_key: check.key,
    message,
    next_action: nextAction,
  };
}

function playwrightCase(observation: string): string | null {
  return (
    /^playwright\.case\.([a-z0-9][a-z0-9-]*)\.passed$/u.exec(
      observation,
    )?.[1] ?? null
  );
}
