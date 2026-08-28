import type {
  CompiledOutcomeV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import {
  machineAuthorizedAssertions,
  resultApplicabilityEffectivelyExternallyBlocked,
  resultApplicabilityProfiles,
} from "./long-task-acceptance-reachability-helpers.js";
import type { AcceptanceReachabilityV1 } from "./long-task-acceptance-reachability-types.js";

type Reporter = (message: string) => void;

export function validateDeliveryStages(
  contract: DeliveryContractV2,
  report?: Reporter,
  options: {
    defer_completion_authority_closure?: boolean;
    acceptance_reachability?: AcceptanceReachabilityV1 | null;
    compiled_outcomes?: readonly CompiledOutcomeV2[];
  } = {},
): void {
  unique(
    contract.stages.map((stage) => stage.key),
    "stage_key_duplicate",
    report,
  );
  const stages = new Map(contract.stages.map((stage) => [stage.key, stage]));
  const outcomes = new Map(
    contract.outcomes.map((outcome) => [outcome.key, outcome]),
  );
  for (const stage of contract.stages) {
    for (const dependency of stage.depends_on) {
      if (dependency === stage.key)
        issue(report, "stage_dependency_self", stage.key);
      else if (!stages.has(dependency))
        issue(report, "stage_dependency_unknown", `${stage.key}:${dependency}`);
    }
    const gate = outcomes.get(stage.gate_outcome);
    if (!gate)
      issue(
        report,
        "stage_gate_outcome_unknown",
        `${stage.key}:${stage.gate_outcome}`,
      );
    else if (gate.stage !== stage.key)
      issue(report, "stage_gate_outcome_mismatch", `${stage.key}:${gate.key}`);
  }
  for (const outcome of contract.outcomes)
    if (!stages.has(outcome.stage))
      issue(report, "outcome_stage_unknown", `${outcome.key}:${outcome.stage}`);
  validateStageCycles(contract, report);
  validateStageGateClosure(contract, report, options);
}

function validateStageCycles(
  contract: DeliveryContractV2,
  report?: Reporter,
): void {
  const stages = new Map(contract.stages.map((stage) => [stage.key, stage]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string): void => {
    if (visiting.has(key)) {
      issue(report, "stage_dependency_cycle", key);
      return;
    }
    if (visited.has(key)) return;
    visiting.add(key);
    for (const dependency of stages.get(key)?.depends_on ?? [])
      if (stages.has(dependency)) visit(dependency);
    visiting.delete(key);
    visited.add(key);
  };
  for (const stage of stages.keys()) visit(stage);
}

function validateStageGateClosure(
  contract: DeliveryContractV2,
  report?: Reporter,
  options: {
    defer_completion_authority_closure?: boolean;
    acceptance_reachability?: AcceptanceReachabilityV1 | null;
    compiled_outcomes?: readonly CompiledOutcomeV2[];
  } = {},
): void {
  const outcomes = new Map(
    contract.outcomes.map((outcome) => [outcome.key, outcome]),
  );
  for (const stage of contract.stages) {
    const gate = outcomes.get(stage.gate_outcome);
    if (!gate || gate.stage !== stage.key) continue;
    for (const outcome of contract.outcomes.filter(
      (candidate) =>
        candidate.stage === stage.key && candidate.key !== gate.key,
    ))
      if (!outcomeDependsOn(gate.key, outcome.key, outcomes))
        issue(
          report,
          "stage_gate_missing_outcome_dependency",
          `${stage.key}:${gate.key}:${outcome.key}`,
        );
    for (const dependency of stage.depends_on) {
      const dependencyGate = contract.stages.find(
        (candidate) => candidate.key === dependency,
      )?.gate_outcome;
      if (!dependencyGate) continue;
      for (const outcome of contract.outcomes.filter(
        (candidate) => candidate.stage === stage.key,
      ))
        if (!outcomeDependsOn(outcome.key, dependencyGate, outcomes))
          issue(
            report,
            "stage_outcome_missing_gate_dependency",
            `${stage.key}:${outcome.key}:${dependencyGate}`,
          );
    }
    const stageGateChecks = gate.acceptance.checks.filter((check) =>
      check.journey_roles.includes("stage_gate"),
    );
    if (options.defer_completion_authority_closure) continue;
    const compiledGate = options.compiled_outcomes?.find(
      (candidate) => candidate.key === gate.key,
    );
    const gateProfiles = stageGateApplicabilityProfiles(gate);
    const resultExternallyBlocked =
      gateProfiles.length > 0 &&
      gateProfiles.every((profile) =>
        resultApplicabilityEffectivelyExternallyBlocked(
          options.acceptance_reachability,
          gate.key,
          profile.key,
          profile.target_ref,
        ),
      );
    if (!stageGateChecks.length && !resultExternallyBlocked)
      issue(report, "stage_gate_check_required", `${stage.key}:${gate.key}`);
    else if (
      !resultExternallyBlocked &&
      !gateProfiles.every(
        (profile) =>
          resultApplicabilityEffectivelyExternallyBlocked(
            options.acceptance_reachability,
            gate.key,
            profile.key,
            profile.target_ref,
          ) ||
          provesGate(
            gate,
            profile.key,
            options.compiled_outcomes === undefined
              ? undefined
              : compiledGate?.acceptance.checks,
            stageGateChecks,
          ),
      )
    )
      issue(
        report,
        "stage_gate_target_runtime_result_required",
        `${stage.key}:${gate.key}`,
      );
    for (const targetRef of contract.task.target_profile.required_target_refs)
      if (
        !gateProfilesForTarget(gateProfiles, targetRef).length ||
        !gateProfilesForTarget(gateProfiles, targetRef).every(
          (profile) =>
            resultApplicabilityEffectivelyExternallyBlocked(
              options.acceptance_reachability,
              gate.key,
              profile.key,
              profile.target_ref,
            ) ||
            provesGate(
              gate,
              profile.key,
              options.compiled_outcomes === undefined
                ? undefined
                : compiledGate?.acceptance.checks,
              stageGateChecks,
              targetRef,
            ),
        )
      )
        issue(
          report,
          "stage_gate_required_target_proof_missing",
          `${stage.key}:${targetRef}`,
        );
    const stageOutcomes = contract.outcomes.filter(
      (candidate) => candidate.stage === stage.key,
    );
    if (
      !resultExternallyBlocked &&
      stageOutcomes.length > 1 &&
      !(options.compiled_outcomes === undefined
        ? stageGateChecks.some((check) =>
            [...check.positive_assertions, ...check.negative_assertions].some(
              (assertion) =>
                assertion.claims.length > 0 &&
                assertion.evidence_capabilities.includes(
                  "cross_surface_consistency",
                ),
            ),
          )
        : machineAuthorizedAssertions(compiledGate?.acceptance.checks ?? [], {
            authority_scope: "ordinary_claim",
            check_journey_role: "stage_gate",
            required_evidence_capability: "cross_surface_consistency",
          }).some(
            (match) => match.check.execution_target.entrypoint === "root",
          ))
    )
      issue(
        report,
        "stage_gate_cross_surface_consistency_required",
        `${stage.key}:${stageOutcomes.map((outcome) => outcome.key).join(",")}`,
      );
  }
  for (const outcome of contract.outcomes)
    for (const check of outcome.acceptance.checks)
      if (
        check.journey_roles.includes("stage_gate") &&
        !contract.stages.some((stage) => stage.gate_outcome === outcome.key)
      )
        issue(
          report,
          "stage_gate_role_on_non_gate",
          `${outcome.key}:${check.key}`,
        );
}

function stageGateApplicabilityProfiles(
  gate: DeliveryContractV2["outcomes"][number],
): ReturnType<typeof resultApplicabilityProfiles> {
  const exactStageProfiles = resultApplicabilityProfiles(gate, {
    journey_role: "stage_gate",
  });
  return exactStageProfiles.length
    ? exactStageProfiles
    : resultApplicabilityProfiles(gate);
}

function gateProfilesForTarget(
  profiles: ReturnType<typeof resultApplicabilityProfiles>,
  targetRef: string,
): ReturnType<typeof resultApplicabilityProfiles> {
  return profiles.filter((profile) => profile.target_ref === targetRef);
}

function provesGate(
  gate: DeliveryContractV2["outcomes"][number],
  applicabilityRef: string,
  compiledChecks:
    readonly CompiledOutcomeV2["acceptance"]["checks"][number][] | undefined,
  declaredChecks: DeliveryContractV2["outcomes"][number]["acceptance"]["checks"],
  targetRef?: string,
): boolean {
  if (compiledChecks !== undefined)
    return machineAuthorizedAssertions(compiledChecks, {
      authority_scope: "ordinary_claim",
      local_claim_ref: "result",
      applicability_ref: applicabilityRef,
      target_ref: targetRef,
      check_journey_role: "stage_gate",
      required_evidence_capability: "target_runtime",
    }).some((match) => match.check.execution_target.entrypoint === "root");
  return declaredChecks.some((check) => {
    if (
      targetRef !== undefined &&
      check.execution_target.target_ref !== targetRef
    )
      return false;
    if (check.execution_target.entrypoint !== "root") return false;
    const assertions = [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ];
    const provesResult =
      assertions.some(
        (assertion) =>
          assertion.claims.includes("result") &&
          assertion.applicability_ref === applicabilityRef &&
          assertion.evidence_capabilities.includes("target_runtime"),
      ) ||
      (gate.acceptance.population?.check_key === check.key &&
        gate.acceptance.population.claims.includes("result"));
    return provesResult;
  });
}

function outcomeDependsOn(
  start: string,
  target: string,
  outcomes: Map<string, DeliveryContractV2["outcomes"][number]>,
): boolean {
  const seen = new Set<string>();
  const visit = (key: string): boolean => {
    if (key === target) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return (outcomes.get(key)?.depends_on ?? []).some(visit);
  };
  return visit(start);
}

function unique(values: string[], code: string, report?: Reporter): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) issue(report, code, value);
    seen.add(value);
  }
}

function issue(
  report: Reporter | undefined,
  code: string,
  detail: string,
): void {
  const message = `delivery_contract_invalid:${code}:${detail}`;
  if (report) report(message);
  else throw new Error(message);
}
