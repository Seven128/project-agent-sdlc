import type {
  CompiledCheckV2,
  DeliveryContractV2,
  EffectiveRiskLevel,
} from "./long-task-delivery-types.js";
import { machineAuthorizedAssertionExists } from "./long-task-acceptance-reachability-helpers.js";
import { allOutcomeResultsFullyEffectivelyExternallyBlocked } from "./long-task-effective-external-takeover.js";
import type { AcceptanceReachabilityV1 } from "./long-task-acceptance-reachability-types.js";

type Reporter = (message: string) => void;

export function semanticConformanceRequired(
  contract: DeliveryContractV2,
  _effectiveRisk?: EffectiveRiskLevel,
): boolean {
  const productFamilies = new Set(
    contract.task.execution_targets
      .filter((target) =>
        contract.task.target_profile.required_target_refs.includes(target.key),
      )
      .map((target) => target.runtime_family),
  );
  return (
    contract.risk.facts.weak_observability.length > 0 &&
    (productFamilies.size > 1 || contract.stages.length > 1)
  );
}

export function validateSemanticConformance(
  contract: DeliveryContractV2,
  effectiveRisk: EffectiveRiskLevel,
  compiledChecks: CompiledCheckV2[],
  report?: Reporter,
  reachability?: AcceptanceReachabilityV1 | null,
): void {
  const declared = contract.global.acceptance.checks.filter((check) =>
    check.journey_roles.includes("conformance"),
  );
  if (
    semanticConformanceRequired(contract, effectiveRisk) &&
    !declared.length &&
    !allOutcomeResultsFullyEffectivelyExternallyBlocked(contract, reachability)
  ) {
    issue(report, "semantic_conformance_check_required", contract.task.id);
    return;
  }
  for (const check of declared) {
    if (check.runner.effect !== "read_only")
      issue(report, "conformance_check_must_be_read_only", check.key);
    if (
      !machineAuthorizedAssertionExists(compiledChecks, {
        authority_scope: "ordinary_claim",
        outcome_key: null,
        check_key: check.key,
        check_journey_role: "conformance",
        required_evidence_capability: "target_runtime",
      })
    )
      issue(report, "conformance_target_runtime_evidence_required", check.key);
    const compiled = compiledChecks.find(
      (candidate) =>
        candidate.outcome_key === null && candidate.key === check.key,
    );
    if (!compiled) continue;
    if (
      compiledChecks.some(
        (candidate) =>
          candidate.internal_id !== compiled.internal_id &&
          candidate.outcome_key !== null &&
          candidate.raw_execution_identity === compiled.raw_execution_identity,
      )
    )
      issue(report, "conformance_raw_execution_must_be_independent", check.key);
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
