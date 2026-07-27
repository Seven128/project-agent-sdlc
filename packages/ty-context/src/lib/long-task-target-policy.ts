import type { CompiledClaimsV2 } from "./long-task-claims.js";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";

type Reporter = (message: string) => void;
type ExecutionTarget = DeliveryContractV2["task"]["execution_targets"][number];
type DeliveryCheck =
  DeliveryContractV2["global"]["acceptance"]["checks"][number];
const FAMILY_CAPABILITY = {
  browser: "browser-runtime",
  native: "native-runtime",
  desktop: "desktop-runtime",
  service: "service-runtime",
  process: "process-runtime",
  external: "external-runtime",
} as const;

export function validateExecutionTargets(
  contract: DeliveryContractV2,
  report?: Reporter,
): void {
  const targets = indexExecutionTargets(contract, report);
  const requiredTargetRefs = contract.task.target_profile.required_target_refs;
  validateRequiredTargetRefs(contract, targets, report);
  for (const [outcomeKey, check] of allChecks(contract))
    validateCheckTarget(outcomeKey, check, targets, report);
  validateCriticalPathTargets(contract, requiredTargetRefs, report);
}

function indexExecutionTargets(
  contract: DeliveryContractV2,
  report?: Reporter,
): Map<string, ExecutionTarget> {
  const targets = new Map<string, ExecutionTarget>();
  for (const target of contract.task.execution_targets) {
    if (targets.has(target.key))
      issue(report, "execution_target_key_duplicate", target.key);
    targets.set(target.key, target);
    if (!target.capabilities.length)
      issue(report, "execution_target_capability_required", target.key);
    if (new Set(target.capabilities).size !== target.capabilities.length)
      issue(report, "execution_target_capability_duplicate", target.key);
    const familyCapability = FAMILY_CAPABILITY[target.runtime_family];
    if (!target.capabilities.includes(familyCapability))
      issue(
        report,
        "execution_target_family_capability_required",
        `${target.key}:${familyCapability}`,
      );
  }
  if (![...targets.values()].some((target) => target.role === "product"))
    issue(report, "product_execution_target_required", contract.task.id);
  return targets;
}

function validateRequiredTargetRefs(
  contract: DeliveryContractV2,
  targets: Map<string, ExecutionTarget>,
  report?: Reporter,
): void {
  const required = contract.task.target_profile.required_target_refs;
  if (!required.length)
    issue(
      report,
      "target_profile_required_target_refs_required",
      contract.task.id,
    );
  if (new Set(required).size !== required.length)
    issue(
      report,
      "target_profile_required_target_refs_duplicate",
      contract.task.id,
    );
  for (const targetRef of required) {
    const target = targets.get(targetRef);
    if (!target)
      issue(report, "target_profile_required_target_ref_unknown", targetRef);
    else if (target.role !== "product")
      issue(
        report,
        "target_profile_required_target_must_be_product",
        targetRef,
      );
    else {
      for (const capability of ["cold-start", "production-root"] as const)
        if (!target.capabilities.includes(capability))
          issue(
            report,
            "required_target_capability_missing",
            `${targetRef}:${capability}`,
          );
    }
  }
}

function validateCheckTarget(
  outcomeKey: string | null,
  check: DeliveryCheck,
  targets: Map<string, ExecutionTarget>,
  report?: Reporter,
): void {
  const target = targets.get(check.execution_target.target_ref);
  const label = `${outcomeKey ?? "GLOBAL"}:${check.key}`;
  if (!target) {
    issue(
      report,
      "check_execution_target_unknown",
      `${label}:${check.execution_target.target_ref}`,
    );
    return;
  }
  if (
    (check.runner.type === "playwright_test" ||
      check.proof_surface === "ui_browser") &&
    target.runtime_family !== "browser"
  )
    issue(report, "browser_check_target_mismatch", `${label}:${target.key}`);
  if (
    provesTargetRuntime(check) &&
    target.runtime_family === "browser" &&
    check.runner.type !== "playwright_test"
  )
    issue(
      report,
      "browser_target_runtime_requires_playwright",
      `${label}:${target.key}`,
    );
  if (
    provesTargetRuntime(check) &&
    ["native", "desktop"].includes(target.runtime_family) &&
    check.runner.type !== "project_binary"
  )
    issue(
      report,
      "native_target_runtime_requires_project_binary",
      `${label}:${target.key}`,
    );
  validateStageGateTarget(label, check, target, report);
  validateConformanceTarget(outcomeKey, check, target, report);
}

function validateStageGateTarget(
  label: string,
  check: DeliveryCheck,
  target: ExecutionTarget,
  report?: Reporter,
): void {
  if (!check.journey_roles.includes("stage_gate")) return;
  if (target.role !== "product")
    issue(
      report,
      "stage_gate_product_target_required",
      `${label}:${target.key}`,
    );
  if (check.execution_target.entrypoint !== "root")
    issue(report, "stage_gate_root_entrypoint_required", label);
}

function validateConformanceTarget(
  outcomeKey: string | null,
  check: DeliveryCheck,
  target: ExecutionTarget,
  report?: Reporter,
): void {
  if (!check.journey_roles.includes("conformance")) return;
  if (outcomeKey !== null)
    issue(
      report,
      "conformance_check_must_be_global",
      `${outcomeKey}:${check.key}`,
    );
  if (target.role !== "product" || check.execution_target.entrypoint !== "root")
    issue(report, "conformance_root_product_target_required", check.key);
}

function validateCriticalPathTargets(
  contract: DeliveryContractV2,
  requiredTargetRefs: string[],
  report?: Reporter,
): void {
  for (const outcomeKey of contract.risk.facts.critical_user_path) {
    const outcome = contract.outcomes.find(
      (candidate) => candidate.key === outcomeKey,
    );
    if (!outcome) continue;
    for (const targetRef of requiredTargetRefs)
      if (
        !outcome.acceptance.checks.some((check) =>
          provesSuccess(check, targetRef),
        )
      )
        issue(
          report,
          "critical_path_required_target_proof_missing",
          `${outcome.key}:${targetRef}`,
        );
  }
}

function provesSuccess(check: DeliveryCheck, targetRef: string): boolean {
  return (
    check.execution_target.target_ref === targetRef &&
    check.journey_roles.includes("success") &&
    check.execution_target.entrypoint === "root" &&
    provesTargetRuntime(check)
  );
}

function provesTargetRuntime(check: DeliveryCheck): boolean {
  return [...check.positive_assertions, ...check.negative_assertions].some(
    (assertion) => assertion.evidence_capabilities.includes("target_runtime"),
  );
}

export function validateExternalConfirmationImpacts(
  contract: DeliveryContractV2,
  claims: CompiledClaimsV2,
  report?: Reporter,
): void {
  const claimRefs = new Set<string>();
  for (const [outcomeKey, values] of Object.entries(claims.by_outcome))
    for (const claim of values)
      claimRefs.add(`${outcomeKey}.${claim.local_key}`);
  for (const claim of claims.by_global)
    claimRefs.add(`GLOBAL.${claim.local_key}`);
  for (const confirmation of contract.global.acceptance
    .external_confirmations) {
    if (!confirmation.impact_claims.length)
      issue(report, "external_confirmation_impact_required", confirmation.key);
    for (const claim of confirmation.impact_claims)
      if (!claimRefs.has(claim))
        issue(
          report,
          "external_confirmation_impact_unknown",
          `${confirmation.key}:${claim}`,
        );
    if (
      confirmation.kind === "functional_prerequisite" &&
      !confirmation.blocks_target
    )
      issue(
        report,
        "functional_prerequisite_must_block_target",
        confirmation.key,
      );
    if (
      confirmation.kind === "production_release_gate" &&
      contract.task.target_profile.required_state ===
        "production_release_ready" &&
      !confirmation.blocks_target
    )
      issue(
        report,
        "production_gate_must_block_release_target",
        confirmation.key,
      );
  }
}

function allChecks(contract: DeliveryContractV2) {
  return [
    ...contract.global.acceptance.checks.map((check) => [null, check] as const),
    ...contract.outcomes.flatMap((outcome) =>
      outcome.acceptance.checks.map((check) => [outcome.key, check] as const),
    ),
  ];
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
