import { copyFile, rm, stat } from "node:fs/promises";
import { evaluatePopulation } from "./long-task-assertions-v2.js";
import { collectCheckArtifacts } from "./long-task-artifacts.js";
import { executeCheckRunner } from "./long-task-check-runner.js";
import { createCounterfactualSandbox } from "./long-task-counterfactual-sandbox.js";
import type {
  CheckExecutionResultV2,
  ClaimProofV2,
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  CompiledOutcomeV2,
  CounterfactualControlV2,
  GlobalCounterfactualControlV2,
  LongTaskFindingV2,
  RawCommandExecutionV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import {
  assertionFinding,
  checkFinding,
  classifyCheckStatus,
  evaluateAssertionResults,
} from "./long-task-evidence-findings.js";
import { classifyPlaywrightCounterfactual } from "./long-task-playwright-counterfactual-policy.js";
import { applyNarrowSemanticMutation } from "./long-task-semantic-mutation.js";
import { evaluateEvidenceCapabilities } from "./long-task-evidence-capability-policy.js";
import { resolveInsideRepository } from "./long-task-workspace.js";

export async function evaluateCheckEvidence(
  check: CompiledCheckV2,
  raw: RawCommandExecutionV2,
  snapshotRoot: string,
  outcome?: CompiledOutcomeV2,
): Promise<CheckExecutionResultV2> {
  const artifacts = await collectCheckArtifacts(check, snapshotRoot);
  const assertionResults = evaluateAssertionResults(check, raw.observations);
  const executionCompleted = raw.execution_status === "completed";
  const findings = collectExecutionFindings(
    check,
    raw,
    outcome,
    artifacts,
    assertionResults,
  );

  const population = outcome?.acceptance.population;
  let populationPassed = true;
  if (executionCompleted && population?.check_key === check.key) {
    const result = evaluatePopulation(population, raw.observations);
    populationPassed = result.passed;
    if (!result.passed)
      findings.push({
        ...checkFinding(
          check,
          "population_coverage_failed",
          result.reason ?? "full population coverage was not proven",
          "Fix entity enumeration/exclusion behavior and rerun the population Check.",
        ),
        expected: { coverage_percent: 100 },
        actual: result.actual,
        claim_keys: population.claims,
      });
  }

  const status = classifyCheckStatus(raw, findings);
  const claimProofs: ClaimProofV2[] =
    status === "passed"
      ? assertionResults.flatMap((result) =>
          result.evidence_complete
            ? result.claims.map((claim) => ({
                check_key: check.key,
                assertion_key: result.key,
                polarity: result.polarity,
                proof_surface: check.proof_surface,
                applicability_ref: result.applicability_ref ?? null,
              }))
            : [],
        )
      : [];
  if (
    status === "passed" &&
    population &&
    population.check_key === check.key &&
    populationPassed
  )
    claimProofs.push(
      ...population.claims.map(() => ({
        check_key: check.key,
        assertion_key: null,
        polarity: "population" as const,
        proof_surface: check.proof_surface,
        applicability_ref: null,
      })),
    );
  return {
    internal_id: check.internal_id,
    outcome_key: check.outcome_key,
    check_key: check.key,
    status,
    evidence_adapter: check.evidence_adapter,
    execution_identity: raw.raw_execution_identity,
    assertion_results: assertionResults,
    observations: raw.observations,
    evidence_records: raw.evidence_records ?? [],
    artifact_hashes: artifacts.hashes,
    claim_proofs: claimProofs,
    findings,
    attempts: raw.attempts,
    duration_ms: raw.duration_ms,
  };
}

function collectExecutionFindings(
  check: CompiledCheckV2,
  raw: RawCommandExecutionV2,
  outcome: CompiledOutcomeV2 | undefined,
  artifacts: Awaited<ReturnType<typeof collectCheckArtifacts>>,
  assertionResults: CheckExecutionResultV2["assertion_results"],
): LongTaskFindingV2[] {
  const findings: LongTaskFindingV2[] = [];
  if (raw.execution_status !== "completed") {
    findings.push(
      checkFinding(
        check,
        raw.execution_status,
        raw.error ?? raw.execution_status,
        raw.execution_status === "blocked_external"
          ? "Satisfy the declared Environment Requirement and rerun this Check."
          : "Repair the declared runner or evidence protocol and rerun this Check.",
      ),
    );
    return findings;
  }
  if (raw.exit_code !== 0)
    findings.push(
      checkFinding(
        check,
        "test_failed",
        `command exited ${raw.exit_code}`,
        "Fix the implementation or declared verification command, then rerun this Check.",
      ),
    );
  if (raw.observations["playwright.zero_or_all_skipped"] === true)
    findings.push(
      checkFinding(
        check,
        "test_failed",
        "Playwright executed zero tests or skipped every test.",
        "Make the declared Playwright target execute at least one non-skipped test.",
      ),
    );
  for (const error of artifacts.errors)
    findings.push(
      checkFinding(
        check,
        "artifact_missing",
        error,
        "Produce the artifact declared for this Check and rerun it.",
      ),
    );
  for (const result of assertionResults)
    if (!result.passed)
      findings.push(assertionFinding(check, result, raw.observations, outcome));
  const capabilityEvaluation = evaluateEvidenceCapabilities(
    check,
    raw.evidence_records,
    artifacts.hashes,
  );
  const passedAssertions = new Set(
    assertionResults
      .filter((result) => result.passed)
      .map((result) => result.key),
  );
  findings.push(
    ...capabilityEvaluation.findings.filter(
      (finding) =>
        !finding.assertion_key || passedAssertions.has(finding.assertion_key),
    ),
  );
  for (const result of assertionResults)
    result.evidence_complete =
      result.passed && capabilityEvaluation.complete[result.key] === true;
  return findings;
}

export async function evaluateOutcomeCounterfactuals(
  outcome: CompiledOutcomeV2,
  snapshotRoot: string,
  manifest?: WorkspaceManifestV2,
  protectedAuthorityPaths: readonly string[] = [],
): Promise<LongTaskFindingV2[]> {
  return evaluateCounterfactualSet(
    outcome.acceptance.counterfactual_controls.map((control) => ({
      control,
      check: outcome.acceptance.checks.find(
        (item) => item.key === control.check_key,
      )!,
      evidenceOutcome: outcome,
      findingOutcomeKey: outcome.key,
      owningOutcome: outcome,
      bindingRef: `${outcome.key}.${control.binding_key}`,
    })),
    snapshotRoot,
    manifest,
    protectedAuthorityPaths,
  );
}

export async function evaluateGlobalCounterfactuals(
  compiled: CompiledDeliveryContractV2,
  snapshotRoot: string,
  selectedCheckKeys?: ReadonlySet<string>,
  manifest?: WorkspaceManifestV2,
): Promise<LongTaskFindingV2[]> {
  return evaluateCounterfactualSet(
    (compiled.global.acceptance.counterfactual_controls ?? [])
      .filter(
        (control) =>
          !selectedCheckKeys || selectedCheckKeys.has(control.check_key),
      )
      .map((control) => {
        const [outcomeKey] = control.binding_ref.split(".");
        return {
          control,
          check: compiled.global.acceptance.checks.find(
            (item) => item.key === control.check_key,
          )!,
          findingOutcomeKey: null,
          owningOutcome: compiled.outcomes.find(
            (outcome) => outcome.key === outcomeKey,
          )!,
          bindingRef: control.binding_ref,
        };
      }),
    snapshotRoot,
    manifest,
    compiled.context_snapshot.files,
  );
}

type RuntimeCounterfactual = {
  control: CounterfactualControlV2 | GlobalCounterfactualControlV2;
  check: CompiledCheckV2;
  evidenceOutcome?: CompiledOutcomeV2;
  findingOutcomeKey: string | null;
  owningOutcome: CompiledOutcomeV2;
  bindingRef: string;
};

async function evaluateCounterfactualSet(
  entries: RuntimeCounterfactual[],
  snapshotRoot: string,
  manifest?: WorkspaceManifestV2,
  protectedAuthorityPaths: readonly string[] = [],
): Promise<LongTaskFindingV2[]> {
  const findings: LongTaskFindingV2[] = [];
  for (const entry of entries) {
    const { control, check } = entry;
    const owningBinding = entry.owningOutcome.technical.bindings.find(
      (binding) =>
        `${entry.owningOutcome.key}.${binding.key}` === entry.bindingRef,
    );
    const sandbox = await createCounterfactualSandbox(
      snapshotRoot,
      check,
      control,
      owningBinding?.carrier_paths ?? [],
      manifest,
      protectedAuthorityPaths,
    );
    const root = sandbox.root;
    try {
      const mutationTargets =
        control.mutation.type === "remove_paths"
          ? control.mutation.paths
          : [control.mutation.path];
      const missingTargets: string[] = [];
      for (const target of mutationTargets)
        if (
          !(await stat(
            resolveInsideRepository(root, target, "counterfactual.target"),
          ).catch(() => null))
        )
          missingTargets.push(target);
      if (missingTargets.length) {
        findings.push(
          counterfactualIntegrityFinding(entry, {
            execution_status: "not_run",
            finding_codes: ["counterfactual_mutation_target_missing"],
            missing_targets: missingTargets,
          }),
        );
        continue;
      }
      if (control.mutation.type === "remove_paths") {
        for (const target of control.mutation.paths)
          await rm(
            resolveInsideRepository(
              root,
              target,
              "counterfactual.remove_paths",
            ),
            { recursive: true, force: true },
          );
      } else if (control.mutation.type === "replace_file") {
        await copyFile(
          resolveInsideRepository(
            root,
            control.mutation.fixture_path,
            "counterfactual.fixture",
          ),
          resolveInsideRepository(
            root,
            control.mutation.path,
            "counterfactual.path",
          ),
        );
      } else {
        await applyNarrowSemanticMutation(root, control.mutation);
      }
      const raw = await executeCheckRunner(check, root);
      const result = await evaluateCheckEvidence(
        check,
        raw,
        root,
        entry.evidenceOutcome,
      );
      const playwrightClassification =
        result.evidence_adapter === "playwright_json_v1"
          ? classifyPlaywrightCounterfactual(raw, result, control)
          : null;
      const sensitivityResult =
        playwrightClassification?.normalized_result ?? result;
      const failedAssertions = result.assertion_results
        .filter((assertion) => !assertion.passed)
        .map((assertion) => assertion.key)
        .sort();
      const expected = [...control.expected_assertion_failures].sort();
      const acceptedExit = playwrightClassification
        ? playwrightClassification.accepted_test_failure_exit
        : raw.exit_code === 0;
      const valid =
        raw.execution_status === "completed" &&
        acceptedExit &&
        isValidCounterfactualCheckResult(sensitivityResult, expected);
      if (!valid)
        findings.push(
          counterfactualIntegrityFinding(
            entry,
            playwrightClassification
              ? playwrightCounterfactualDiagnostic(
                  raw,
                  result,
                  expected,
                  playwrightClassification.rejection_reasons,
                )
              : {
                  execution_status: raw.execution_status,
                  exit_code: raw.exit_code,
                  result_status: result.status,
                  failed_assertions: failedAssertions,
                  finding_codes: result.findings.map((finding) => finding.code),
                },
          ),
        );
    } finally {
      await sandbox.dispose();
    }
  }
  return findings;
}

function playwrightCounterfactualDiagnostic(
  raw: RawCommandExecutionV2,
  result: CheckExecutionResultV2,
  expectedAssertions: string[],
  rejectionReasons: string[],
) {
  const caseIds = result.assertion_results
    .map(
      (assertion) =>
        /^playwright\.case\.([a-z0-9][a-z0-9-]*)\.passed$/u.exec(
          assertion.observation,
        )?.[1],
    )
    .filter((item): item is string => Boolean(item));
  const unexpectedCaseIds = caseIds.filter(
    (id) => raw.observations[`playwright.case.${id}.unexpected`] === true,
  );
  const timedOutCaseIds = caseIds.filter(
    (id) =>
      Number(raw.observations[`playwright.case.${id}.timed_out_instances`]) > 0,
  );
  const interruptedCaseIds = caseIds.filter(
    (id) =>
      Number(raw.observations[`playwright.case.${id}.interrupted_instances`]) >
      0,
  );
  return {
    execution_status: raw.execution_status,
    exit_code: raw.exit_code,
    result_status: result.status,
    report_error_count:
      raw.observations["playwright.report_error_count"] ?? null,
    expected_assertions: expectedAssertions,
    unexpected_case_ids: [...new Set(unexpectedCaseIds)].sort(),
    declared_unexpected_instances:
      raw.observations["playwright.declared_unexpected_instances"] ?? null,
    unbound_unexpected_instances:
      raw.observations["playwright.unbound_unexpected_instances"] ?? null,
    timed_out_case_ids: [...new Set(timedOutCaseIds)].sort(),
    interrupted_case_ids: [...new Set(interruptedCaseIds)].sort(),
    finding_codes: result.findings.map((finding) => finding.code),
    rejection_reasons: rejectionReasons,
  };
}

function counterfactualIntegrityFinding(
  entry: RuntimeCounterfactual,
  actual: unknown,
): LongTaskFindingV2 {
  return {
    code: "counterfactual_integrity_failed",
    outcome_key: entry.findingOutcomeKey,
    check_key: entry.check.key,
    ...(entry.control.expected_assertion_failures.length === 1
      ? { assertion_key: entry.control.expected_assertion_failures[0] }
      : {}),
    claim_keys: entry.control.claims,
    binding_ref: entry.bindingRef,
    owning_outcome_key: entry.owningOutcome.key,
    owner_paths: entry.owningOutcome.product.owner.path_globs,
    message: `Counterfactual ${entry.control.key} did not fail exactly the designated Assertions.`,
    expected: [...entry.control.expected_assertion_failures].sort(),
    actual,
    next_action:
      "Repair the referenced implementation carrier or proof so only the designated Assertion value mismatches demonstrate sensitivity.",
  };
}

export function isValidCounterfactualCheckResult(
  result: CheckExecutionResultV2,
  expectedAssertionFailures: string[],
): boolean {
  const expected = [...expectedAssertionFailures].sort();
  const failedAssertions = result.assertion_results
    .filter((assertion) => !assertion.passed)
    .map((assertion) => assertion.key)
    .sort();
  return (
    result.status === "assertion_failed" &&
    result.findings.length === expected.length &&
    result.findings.filter((finding) => finding.assertion_key).length ===
      expected.length &&
    result.findings
      .filter((finding) => finding.assertion_key)
      .every((finding) =>
        expected.some((key) => finding.assertion_key === key),
      ) &&
    result.findings.every(
      (finding) => finding.code === "assertion_value_mismatch",
    ) &&
    result.assertion_results
      .filter((assertion) => !assertion.passed)
      .every((assertion) => assertion.status === "assertion_value_mismatch") &&
    failedAssertions.length === expected.length &&
    failedAssertions.every((item, index) => item === expected[index])
  );
}
