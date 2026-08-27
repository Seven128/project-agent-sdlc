import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import { outcomeResultEffectivelyExternallyBlocked } from "./long-task-acceptance-reachability-helpers.js";
import type { AcceptanceReachabilityV1 } from "./long-task-acceptance-reachability-types.js";

type Reporter = (message: string) => void;

export function validateDeliveryStages(
  contract: DeliveryContractV2,
  report?: Reporter,
  options: {
    defer_completion_authority_closure?: boolean;
    acceptance_reachability?: AcceptanceReachabilityV1 | null;
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
    const resultExternallyBlocked = outcomeResultEffectivelyExternallyBlocked(
      options.acceptance_reachability,
      gate.key,
    );
    if (!stageGateChecks.length && !resultExternallyBlocked)
      issue(report, "stage_gate_check_required", `${stage.key}:${gate.key}`);
    else if (
      !resultExternallyBlocked &&
      !stageGateChecks.some((check) => provesGate(check, gate))
    )
      issue(
        report,
        "stage_gate_target_runtime_result_required",
        `${stage.key}:${gate.key}`,
      );
    for (const targetRef of contract.task.target_profile.required_target_refs)
      if (
        !outcomeResultEffectivelyExternallyBlocked(
          options.acceptance_reachability,
          gate.key,
          targetRef,
        ) &&
        !stageGateChecks.some(
          (check) =>
            check.execution_target.target_ref === targetRef &&
            check.execution_target.entrypoint === "root" &&
            provesGate(check, gate),
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
      !stageGateChecks.some((check) =>
        [...check.positive_assertions, ...check.negative_assertions].some(
          (assertion) =>
            assertion.evidence_capabilities.includes(
              "cross_surface_consistency",
            ),
        ),
      )
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

function provesGate(
  check: DeliveryContractV2["outcomes"][number]["acceptance"]["checks"][number],
  gate: DeliveryContractV2["outcomes"][number],
): boolean {
  const assertions = [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ];
  const provesResult =
    assertions.some((assertion) => assertion.claims.includes("result")) ||
    (gate.acceptance.population?.check_key === check.key &&
      gate.acceptance.population.claims.includes("result"));
  return (
    provesResult &&
    assertions.some((assertion) =>
      assertion.evidence_capabilities.includes("target_runtime"),
    )
  );
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
