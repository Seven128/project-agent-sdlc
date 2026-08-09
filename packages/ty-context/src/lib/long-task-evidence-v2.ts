import { copyFile, rm, stat } from "node:fs/promises";
import { evaluatePopulation } from "./long-task-assertions-v2.js";
import {
  collectCheckArtifacts,
  prepareAdmittedObservations,
} from "./long-task-artifacts.js";
import { executeCheckRunner } from "./long-task-check-runner.js";
import { prepareExecutionObservationGroup } from "./long-task-execution-observation.js";
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
import {
  admittedObservationAuthorityKey,
  classifyMachineObservationCarrierRoleConflict,
} from "./long-task-admitted-observation.js";
import { applyNarrowSemanticMutation } from "./long-task-semantic-mutation.js";
import { evaluateEvidenceCapabilities } from "./long-task-evidence-capability-policy.js";
import { validateCounterfactualObservationImpact } from "./long-task-evidence-sensitivity-policy.js";
import {
  matchesRepoPattern,
  normalizeRepositoryFile,
} from "./long-task-paths.js";
import { resolveInsideRepository } from "./long-task-workspace.js";
import { canonicalValueJson } from "./strict-codec.js";

export async function evaluateCheckEvidence(
  check: CompiledCheckV2,
  raw: RawCommandExecutionV2,
  snapshotRoot: string,
  outcome?: CompiledOutcomeV2,
  observationAuthorityPaths: readonly string[] = [],
): Promise<CheckExecutionResultV2> {
  const artifacts = await collectCheckArtifacts(check, snapshotRoot);
  const admittedObservations = await prepareAdmittedObservations({
    check,
    records: raw.evidence_records ?? [],
    snapshot_root: snapshotRoot,
    authority_paths: observationAuthorityPaths,
    package_observations: (raw.package_observations ?? []).filter((candidate) =>
      (check.observation_authorities ?? []).some(
        (authority) =>
          authority.authority === candidate.authority &&
          authority.observation_identity === candidate.observation_identity &&
          authority.assertion_ref === candidate.assertion_ref &&
          authority.obligation_ref === candidate.obligation_ref &&
          authority.method === candidate.method,
      ),
    ),
  });
  const derived = packageDerivedAssertionObservations(
    check,
    raw.observations,
    admittedObservations,
  );
  const authoritativeRaw = { ...raw, observations: derived.observations };
  const assertionResults = evaluateAssertionResults(
    check,
    authoritativeRaw.observations,
  );
  const executionCompleted = raw.execution_status === "completed";
  const findings = collectExecutionFindings(
    check,
    authoritativeRaw,
    outcome,
    artifacts,
    assertionResults,
    admittedObservations,
  );
  findings.push(...derived.findings);

  const population = outcome?.acceptance.population;
  let populationPassed = true;
  if (executionCompleted && population?.check_key === check.key) {
    const result = evaluatePopulation(
      population,
      authoritativeRaw.observations,
    );
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
    observations: authoritativeRaw.observations,
    evidence_records: raw.evidence_records ?? [],
    artifact_hashes: artifacts.hashes,
    claim_proofs: claimProofs,
    findings,
    attempts: raw.attempts,
    duration_ms: raw.duration_ms,
  };
}

function packageDerivedAssertionObservations(
  check: CompiledCheckV2,
  submitted: Record<string, unknown>,
  admitted: Awaited<ReturnType<typeof prepareAdmittedObservations>>,
): { observations: Record<string, unknown>; findings: LongTaskFindingV2[] } {
  const observations = { ...submitted };
  const findings: LongTaskFindingV2[] = [];
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ]) {
    const authorities = (check.observation_authorities ?? []).filter(
      (authority) => authority.assertion_ref === assertion.key,
    );
    if (!authorities.length) continue;
    const entries = authorities.map((authority) =>
      admitted.by_authority_key.get(admittedObservationAuthorityKey(authority)),
    );
    if (
      entries.some(
        (entry) =>
          !entry || entry.reason || !entry.observation || !entry.comparison,
      )
    )
      continue;
    const factBound = authorities.some(
      (authority) => authority.fact_ref !== null,
    );
    const derivedValue = factBound
      ? entries.every((entry) => entry!.comparison!.passed)
      : entries.length === 1
        ? entries[0]!.raw_value
        : entries.every((entry) => entry!.comparison!.passed);
    if (
      Object.hasOwn(submitted, assertion.observation) &&
      canonicalValueJson(submitted[assertion.observation]) !==
        canonicalValueJson(derivedValue)
    )
      findings.push({
        ...checkFinding(
          check,
          "project_submitted_verdict_disagrees_with_harness",
          `Project-submitted observation ${assertion.observation} disagrees with the package-derived current Actual.`,
          "Remove the compatibility copy or make it agree with the Harness-derived observation; it cannot act as Authority.",
        ),
        assertion_key: assertion.key,
        claim_keys: assertion.claims,
        expected: derivedValue,
        actual: submitted[assertion.observation],
      });
    observations[assertion.observation] = derivedValue;
  }
  return { observations, findings };
}

function collectExecutionFindings(
  check: CompiledCheckV2,
  raw: RawCommandExecutionV2,
  outcome: CompiledOutcomeV2 | undefined,
  artifacts: Awaited<ReturnType<typeof collectCheckArtifacts>>,
  assertionResults: CheckExecutionResultV2["assertion_results"],
  admittedObservations: Awaited<ReturnType<typeof prepareAdmittedObservations>>,
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
    admittedObservations,
    raw,
  );
  const passedAssertions = new Set(
    assertionResults
      .filter((result) => result.passed)
      .map((result) => result.key),
  );
  findings.push(
    ...capabilityEvaluation.findings.filter(
      (finding) =>
        !finding.assertion_key ||
        passedAssertions.has(finding.assertion_key) ||
        isObservationAuthorityFailureFinding(finding),
    ),
  );
  for (const result of assertionResults)
    result.evidence_complete =
      result.passed && capabilityEvaluation.complete[result.key] === true;
  return findings;
}

function isObservationAuthorityFailureFinding(
  finding: LongTaskFindingV2,
): boolean {
  if (typeof finding.actual !== "string") return false;
  return /^(?:admitted_observation_|counterfactual_admitted_observation_|host_attestation_|machine_observer_|observation_|process_observation_|process_observer_|project_submitted_|static_observation_|unsupported_observer_)/u.test(
    finding.actual,
  );
}

export async function evaluateOutcomeCounterfactuals(
  outcome: CompiledOutcomeV2,
  snapshotRoot: string,
  manifest?: WorkspaceManifestV2,
  protectedAuthorityPaths: readonly string[] = [],
  baselineResults: readonly CheckExecutionResultV2[] = [],
  baselineExecutions: ReadonlyMap<string, RawCommandExecutionV2> = new Map(),
  executionUniverse: readonly CompiledCheckV2[] = outcome.acceptance.checks,
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
    baselineResults,
    baselineExecutions,
    executionUniverse,
  );
}

export async function evaluateGlobalCounterfactuals(
  compiled: CompiledDeliveryContractV2,
  snapshotRoot: string,
  selectedCheckKeys?: ReadonlySet<string>,
  manifest?: WorkspaceManifestV2,
  baselineResults: readonly CheckExecutionResultV2[] = [],
  baselineExecutions: ReadonlyMap<string, RawCommandExecutionV2> = new Map(),
  executionUniverse: readonly CompiledCheckV2[] = [
    ...compiled.global.acceptance.checks,
    ...compiled.outcomes.flatMap((outcome) => outcome.acceptance.checks),
  ],
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
    compiledAuthorityPaths(compiled),
    baselineResults,
    baselineExecutions,
    executionUniverse,
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
  baselineResults: readonly CheckExecutionResultV2[] = [],
  baselineExecutions: ReadonlyMap<string, RawCommandExecutionV2> = new Map(),
  executionUniverse: readonly CompiledCheckV2[] = [],
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
      const mutationTargets = counterfactualMutationTargets(control);
      const missingTargets = await missingCounterfactualMutationTargets(
        root,
        mutationTargets,
      );
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
      await applyCounterfactualMutation(root, control);
      const raw = await executeCounterfactualCheck(
        check,
        root,
        manifest,
        protectedAuthorityPaths,
        executionUniverse,
      );
      const result = await evaluateCheckEvidence(
        check,
        raw,
        root,
        entry.evidenceOutcome,
        protectedAuthorityPaths,
      );
      const observationImpactIssue = await counterfactualObservationImpactIssue(
        entry,
        baselineResults,
        baselineExecutions.get(check.raw_execution_identity),
        result,
        raw,
        snapshotRoot,
        root,
        mutationTargets,
        owningBinding?.carrier_paths ?? [],
        protectedAuthorityPaths,
        executionUniverse,
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
      const allowedFanout = [
        ...(control.allowed_fanout_assertions ?? []),
      ].sort();
      const acceptedExit = playwrightClassification
        ? playwrightClassification.accepted_test_failure_exit
        : raw.exit_code === 0;
      const valid =
        raw.execution_status === "completed" &&
        acceptedExit &&
        observationImpactIssue === null &&
        isValidCounterfactualCheckResult(
          sensitivityResult,
          expected,
          allowedFanout,
        );
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
                  execution_error: raw.error,
                  result_status: result.status,
                  failed_assertions: failedAssertions,
                  finding_codes: result.findings.map((finding) => finding.code),
                  observation_impact_issue: observationImpactIssue,
                },
          ),
        );
    } finally {
      await sandbox.dispose();
    }
  }
  return findings;
}

async function executeCounterfactualCheck(
  check: CompiledCheckV2,
  root: string,
  manifest: WorkspaceManifestV2 | undefined,
  protectedAuthorityPaths: readonly string[],
  executionUniverse: readonly CompiledCheckV2[],
): Promise<RawCommandExecutionV2> {
  const packageAuthorities = (check.observation_authorities ?? []).filter(
    (authority) => authority.authority !== "external_confirmation",
  );
  if (!packageAuthorities.length) return executeCheckRunner(check, root);
  if (!manifest)
    return {
      raw_execution_identity: check.raw_execution_identity,
      execution_identity: check.raw_execution_identity,
      execution_status: "invalid_evidence",
      exit_code: -1,
      observations: {},
      evidence_records: [],
      stdout_sha256: "",
      stderr_sha256: "",
      attempts: 0,
      duration_ms: 0,
      error: "counterfactual_admitted_observation_required",
      package_observations: [],
      host_execution_attestation: null,
    };
  const group = executionUniverse.filter(
    (candidate) =>
      candidate.raw_execution_identity === check.raw_execution_identity,
  );
  const prepared = await prepareExecutionObservationGroup({
    checks: group.length ? group : [check],
    snapshot_root: root,
    workspace_manifest: manifest,
    protected_authority_paths: protectedAuthorityPaths,
  });
  try {
    return await prepared.finalize(
      await executeCheckRunner(
        check,
        prepared.execution_root,
        prepared.runner_context,
      ),
    );
  } finally {
    await prepared.dispose();
  }
}

function counterfactualMutationTargets(
  control: RuntimeCounterfactual["control"],
): string[] {
  return control.mutation.type === "remove_paths"
    ? control.mutation.paths
    : [control.mutation.path];
}

async function missingCounterfactualMutationTargets(
  root: string,
  targets: string[],
): Promise<string[]> {
  const missing: string[] = [];
  for (const target of targets)
    if (
      !(await stat(
        resolveInsideRepository(root, target, "counterfactual.target"),
      ).catch(() => null))
    )
      missing.push(target);
  return missing;
}

async function applyCounterfactualMutation(
  root: string,
  control: RuntimeCounterfactual["control"],
): Promise<void> {
  if (control.mutation.type === "remove_paths") {
    for (const target of control.mutation.paths)
      await rm(
        resolveInsideRepository(root, target, "counterfactual.remove_paths"),
        { recursive: true, force: true },
      );
    return;
  }
  if (control.mutation.type === "replace_file") {
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
    return;
  }
  await applyNarrowSemanticMutation(root, control.mutation);
}

async function counterfactualObservationImpactIssue(
  entry: RuntimeCounterfactual,
  baselineResults: readonly CheckExecutionResultV2[],
  baselineRaw: RawCommandExecutionV2 | undefined,
  mutatedResult: CheckExecutionResultV2,
  mutatedRaw: RawCommandExecutionV2,
  baselineRoot: string,
  mutatedRoot: string,
  mutationTargets: string[],
  bindingCarrierPaths: string[],
  protectedAuthorityPaths: readonly string[],
  executionUniverse: readonly CompiledCheckV2[],
): Promise<string | null> {
  const baselineResult = baselineResults.find(
    (candidate) => candidate.internal_id === entry.check.internal_id,
  );
  const machineClosing = [
    ...entry.check.positive_assertions,
    ...entry.check.negative_assertions,
  ].some((assertion) => assertion.claims.length > 0);
  if (!baselineResult || !baselineRaw)
    return machineClosing
      ? "counterfactual_admitted_observation_required"
      : null;
  const processObserved = (entry.check.observation_authorities ?? []).some(
    (authority) => authority.authority === "package_process_json_exact",
  );
  const processClosure = processObserved
    ? entry.check.process_runtime_closure
    : null;
  if (processObserved) {
    if (!processClosure) return "process_runtime_closure_identity_mismatch";
    const normalizedMutationTargets = mutationTargets.map((target, index) =>
      normalizeRepositoryFile(
        target,
        `counterfactual.mutation_targets[${index}]`,
      ),
    );
    if (
      normalizedMutationTargets.some(
        (target) => !processClosure.production_carrier_files.includes(target),
      )
    )
      return "counterfactual_runtime_reachability_unproven";
  }
  const observationChecks = counterfactualObservationChecks(
    entry.check,
    executionUniverse,
    processObserved,
  );
  const observationSets = await Promise.all(
    observationChecks.map(async (check) => {
      const baselineCheckResult = baselineResults.find(
        (candidate) => candidate.internal_id === check.internal_id,
      );
      const [baseline, mutated] = await Promise.all([
        prepareAdmittedObservations({
          check,
          records: baselineCheckResult?.evidence_records ?? [],
          snapshot_root: baselineRoot,
          authority_paths: protectedAuthorityPaths,
          package_observations: packageObservationsForCheck(
            check,
            baselineRaw.package_observations ?? [],
          ),
        }),
        prepareAdmittedObservations({
          check,
          records:
            check.internal_id === entry.check.internal_id
              ? mutatedResult.evidence_records
              : [],
          snapshot_root: mutatedRoot,
          authority_paths: protectedAuthorityPaths,
          package_observations: packageObservationsForCheck(
            check,
            mutatedRaw.package_observations ?? [],
          ),
        }),
      ]);
      return { check, baseline, mutated };
    }),
  );
  const baselineEntries = observationSets.flatMap(({ check, baseline }) =>
    baseline.entries.map((candidate) => ({
      candidate,
      check,
      identity: scopedObservationImpactIdentity(check, candidate),
    })),
  );
  const mutatedEntries = observationSets.flatMap(({ check, mutated }) =>
    mutated.entries.map((candidate) => ({
      candidate,
      check,
      identity: scopedObservationImpactIdentity(check, candidate),
    })),
  );
  if (!baselineEntries.length || !mutatedEntries.length)
    return machineClosing
      ? "counterfactual_admitted_observation_required"
      : null;
  const baselineIssue = baselineEntries.find(
    ({ candidate }) => candidate.reason || !candidate.observation,
  );
  if (baselineIssue)
    return `counterfactual_baseline_observation_invalid:${baselineIssue.candidate.reason ?? "missing"}`;
  const mutatedIssue = mutatedEntries.find(
    ({ candidate }) => candidate.reason || !candidate.observation,
  );
  if (mutatedIssue)
    return `counterfactual_mutated_observation_invalid:${mutatedIssue.candidate.reason ?? "missing"}`;
  if (processClosure) {
    const baselineClosureIdentity =
      baselineRaw.host_execution_attestation
        ?.process_runtime_closure_identity ?? null;
    const mutatedClosureIdentity =
      mutatedRaw.host_execution_attestation?.process_runtime_closure_identity ??
      null;
    if (
      baselineClosureIdentity !== processClosure.closure_identity ||
      mutatedClosureIdentity !== processClosure.closure_identity ||
      baselineClosureIdentity !== mutatedClosureIdentity
    )
      return "process_runtime_closure_identity_mismatch";
  }
  const baselineKeys = baselineEntries.map(({ identity }) => identity).sort();
  const mutatedKeys = mutatedEntries.map(({ identity }) => identity).sort();
  if (canonicalValueJson(baselineKeys) !== canonicalValueJson(mutatedKeys))
    return "counterfactual_obligation_universe_changed";
  const baselineByFact = Object.fromEntries(
    baselineEntries.map(({ candidate, identity }) => [
      identity,
      candidate.observation!.value_sha256,
    ]),
  );
  const mutatedByFact = Object.fromEntries(
    mutatedEntries.map(({ candidate, identity }) => [
      identity,
      candidate.observation!.value_sha256,
    ]),
  );
  const expectedAssertions = new Set(entry.control.expected_assertion_failures);
  const preservedAssertions = new Set(entry.control.preserved_assertions);
  const allowedFanoutAssertions = new Set(
    entry.control.allowed_fanout_assertions ?? [],
  );
  const expectedFactRefs = baselineEntries
    .filter(
      ({ candidate, check }) =>
        check.internal_id === entry.check.internal_id &&
        expectedAssertions.has(candidate.assertion_key),
    )
    .map(({ identity }) => identity);
  if (!expectedFactRefs.length)
    return "counterfactual_expected_fact_observation_missing";
  const preservedFactRefs = baselineEntries
    .filter(
      ({ candidate, check }) =>
        check.internal_id === entry.check.internal_id &&
        preservedAssertions.has(candidate.assertion_key),
    )
    .map(({ identity }) => identity);
  const allowedFanoutFactRefs = baselineEntries
    .filter(
      ({ candidate, check }) =>
        check.internal_id === entry.check.internal_id &&
        allowedFanoutAssertions.has(candidate.assertion_key),
    )
    .map(({ identity }) => identity);
  const targetLive = entry.control.preserved_assertions.every((key) =>
    mutatedResult.assertion_results.some(
      (assertion) => assertion.key === key && assertion.passed,
    ),
  );
  let carrierRole: "product" | "evidence" = "product";
  if (!processObserved) {
    const carrierRoleConflict = mutationTargets
      .map((target) =>
        classifyMachineObservationCarrierRoleConflict({
          carrier_pattern: target,
          expected_authority_patterns: [
            ...entry.check.verification_inputs,
            ...protectedAuthorityPaths,
          ],
          evidence_role_patterns: [
            ...entry.check.expected_output_paths,
            ...entry.check.artifact_globs,
          ],
        }),
      )
      .find((candidate) => candidate !== null);
    if (carrierRoleConflict)
      return `counterfactual_static_carrier_${carrierRoleConflict}_forbidden`;
    carrierRole = mutationTargets.every(
      (target) =>
        bindingCarrierPaths.some((pattern) =>
          matchesRepoPattern(target, pattern),
        ) &&
        entry.check.input_paths.some((pattern) =>
          matchesRepoPattern(target, pattern),
        ),
    )
      ? "product"
      : "evidence";
  }
  return validateCounterfactualObservationImpact({
    baseline_by_fact: baselineByFact,
    mutated_by_fact: mutatedByFact,
    expected_affected_fact_refs: expectedFactRefs,
    preserved_fact_refs: preservedFactRefs,
    allowed_fanout_fact_refs: allowedFanoutFactRefs,
    target_live: targetLive,
    carrier_role: carrierRole,
  });
}

function counterfactualObservationChecks(
  check: CompiledCheckV2,
  executionUniverse: readonly CompiledCheckV2[],
  processObserved: boolean,
): CompiledCheckV2[] {
  if (!processObserved) return [check];
  const checks = new Map<string, CompiledCheckV2>([[check.internal_id, check]]);
  for (const candidate of executionUniverse)
    if (
      candidate.raw_execution_identity === check.raw_execution_identity &&
      (candidate.observation_authorities ?? []).some(
        (authority) => authority.authority !== "external_confirmation",
      )
    )
      checks.set(candidate.internal_id, candidate);
  return [...checks.values()].sort((left, right) =>
    left.internal_id.localeCompare(right.internal_id),
  );
}

function packageObservationsForCheck(
  check: CompiledCheckV2,
  observations: readonly NonNullable<
    RawCommandExecutionV2["package_observations"]
  >[number][],
): NonNullable<RawCommandExecutionV2["package_observations"]> {
  return observations.filter((candidate) =>
    (check.observation_authorities ?? []).some(
      (authority) =>
        authority.authority === candidate.authority &&
        authority.observation_identity === candidate.observation_identity &&
        authority.assertion_ref === candidate.assertion_ref &&
        authority.obligation_ref === candidate.obligation_ref &&
        authority.method === candidate.method,
    ),
  );
}

function observationImpactIdentity(
  candidate: Awaited<
    ReturnType<typeof prepareAdmittedObservations>
  >["entries"][number],
): string {
  return (
    candidate.authority_key ??
    `${candidate.assertion_key}\0${candidate.obligation_ref ?? candidate.identity_ref}\0${candidate.method}`
  );
}

function scopedObservationImpactIdentity(
  check: CompiledCheckV2,
  candidate: Awaited<
    ReturnType<typeof prepareAdmittedObservations>
  >["entries"][number],
): string {
  return `${check.internal_id}\0${observationImpactIdentity(candidate)}`;
}

function compiledAuthorityPaths(
  compiled: CompiledDeliveryContractV2,
): string[] {
  return [
    compiled.contract_file,
    ...Object.keys(compiled.contract_files),
    ...Object.keys(compiled.source_hashes),
    ...compiled.context_snapshot.files,
  ];
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
  allowedFanoutAssertions: string[] = [],
): boolean {
  const expected = [...expectedAssertionFailures].sort();
  const allowed = new Set([...expected, ...allowedFanoutAssertions]);
  const failedAssertions = result.assertion_results
    .filter((assertion) => !assertion.passed)
    .map((assertion) => assertion.key)
    .sort();
  return (
    result.status === "assertion_failed" &&
    result.findings.length === failedAssertions.length &&
    result.findings.every(
      (finding) =>
        Boolean(finding.assertion_key) && allowed.has(finding.assertion_key!),
    ) &&
    result.findings.every(
      (finding) => finding.code === "assertion_value_mismatch",
    ) &&
    result.assertion_results
      .filter((assertion) => !assertion.passed)
      .every((assertion) => assertion.status === "assertion_value_mismatch") &&
    expected.every((item) => failedAssertions.includes(item)) &&
    failedAssertions.every((item) => allowed.has(item))
  );
}
