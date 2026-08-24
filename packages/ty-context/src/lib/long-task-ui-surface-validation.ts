import type { CompiledClaimsV2 } from "./long-task-claims.js";
import type {
  DeliveryCheckV2,
  DeliveryOutcomeV2,
  ProductClaimV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import { proveRepositoryPatternSubset } from "./long-task-paths.js";

export type Reporter = (message: string) => void;

export function bindingCarriers(
  routeRef: string,
  componentRefs: string[],
  bindings: Map<string, DeliveryOutcomeV2["technical"]["bindings"][number]>,
  label: string,
  report?: Reporter,
  options: { allowEmptyComponentRefs?: boolean } = {},
): string[] {
  if (!componentRefs.length && !options.allowEmptyComponentRefs)
    issue(report, "ui_surface_binding_component_ref_required", label);
  unique(
    componentRefs,
    "ui_surface_binding_component_ref_duplicate",
    label,
    report,
  );
  const carriers: string[] = [];
  for (const ref of [routeRef, ...componentRefs]) {
    const binding = bindings.get(ref);
    if (!binding) {
      issue(
        report,
        "ui_surface_binding_technical_binding_unknown",
        `${label}:${ref}`,
      );
      continue;
    }
    if (!binding.carrier_paths.length)
      issue(report, "ui_surface_binding_carrier_required", `${label}:${ref}`);
    carriers.push(...binding.carrier_paths);
  }
  return [...new Set(carriers)].sort();
}

export function validateRootJourney(
  binding: DeliveryOutcomeV2["product"]["surface_bindings"][number],
  check: DeliveryCheckV2,
  label: string,
  report?: Reporter,
): void {
  if (
    check.execution_target.target_ref !== binding.target_ref ||
    check.execution_target.entrypoint !== "root"
  )
    issue(report, "ui_surface_binding_root_target_mismatch", label);
  if (!check.journey_roles.includes("success"))
    issue(report, "ui_surface_binding_root_success_required", label);
  if (
    !check.scenario.when.some((step) => step.key === binding.entry_action_ref)
  )
    issue(
      report,
      "ui_surface_binding_entry_action_unknown",
      `${label}:${binding.entry_action_ref}`,
    );
}

export function validateTargetLocalClaimProof(
  outcome: DeliveryOutcomeV2,
  claim: ProductClaimV2,
  targetRef: string,
  expectedSurface: ProofSurface | null,
  claims: CompiledClaimsV2,
  checks: Map<string, DeliveryCheckV2>,
  label: string,
  report?: Reporter,
): void {
  const proofs =
    claims.summary.claims_by_outcome[outcome.key]?.[claim.local_key]?.proofs ??
    [];
  const matched = proofs.some((proof) => {
    const check = checks.get(proof.check_key);
    return (
      check?.execution_target.target_ref === targetRef &&
      (expectedSurface === null || proof.proof_surface === expectedSurface)
    );
  });
  if (!matched)
    issue(
      report,
      "ui_surface_binding_target_claim_proof_missing",
      `${label}:${claim.local_key}:${targetRef}:${expectedSurface ?? "any"}`,
    );
}

export function expectedControlProofSurface(
  runtimeFamily: string | undefined,
): ProofSurface {
  return runtimeFamily === "browser" ? "ui_browser" : "runtime_behavior";
}

export function controlClaims(
  claims: Map<string, ProductClaimV2>,
  controlRef: string,
): ProductClaimV2[] {
  return [...claims.values()].filter(
    (claim) =>
      claim.kind === "control" &&
      claim.local_key.startsWith(`control.${controlRef}.`),
  );
}

export function validateCarrierInputs(
  check: DeliveryCheckV2,
  carriers: string[],
  label: string,
  report?: Reporter,
): void {
  for (const carrier of carriers)
    if (
      !check.input_paths.some(
        (input) =>
          proveRepositoryPatternSubset(carrier, input).status ===
          "proven_subset",
      )
    )
      issue(
        report,
        "ui_surface_binding_carrier_outside_check_inputs",
        `${label}:${check.key}:${carrier}`,
      );
}

export function unique(
  values: string[],
  code: string,
  detail: string,
  report?: Reporter,
): void {
  if (new Set(values).size !== values.length) issue(report, code, detail);
}

export function issue(
  report: Reporter | undefined,
  code: string,
  detail: string,
): void {
  const message = `delivery_contract_invalid:${code}:${detail}`;
  if (report) report(message);
  else throw new Error(message);
}
