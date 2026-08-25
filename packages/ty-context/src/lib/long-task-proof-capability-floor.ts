import { controlFieldFacts } from "./long-task-control-fields.js";
import type {
  DeliveryAssertionV2,
  DeliveryCheckV2,
  DeliveryContractV2,
  EvidenceCapabilityV2,
  ProductClaimV2,
  SemanticFactExpectationV2,
} from "./long-task-delivery-types.js";

const CONTROL_EXISTS_FIELDS = new Set([
  "surface",
  "region",
  "location",
  "control_type",
  "label_content",
  "visibility",
]);
const CONTROL_STATE_FIELDS = new Set([
  "availability",
  "default_value",
  "loading",
  "empty",
  "failure",
  "permission",
  "feedback",
  "accessibility",
]);
const CONTROL_PRODUCT_EFFECT_FIELDS = new Set([
  "user_task",
  "trigger",
  "input",
  "validation",
  "interaction",
  "navigation_result",
  "success",
  "recovery",
]);

export function assertionCapabilityFloor(
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  check: DeliveryCheckV2,
  assertion: DeliveryAssertionV2,
  claim: ProductClaimV2 | { kind?: string; local_key: string },
  expectations: SemanticFactExpectationV2[],
  semanticClaimFloor: ReadonlySet<EvidenceCapabilityV2> = new Set(),
): Set<EvidenceCapabilityV2> {
  const result = externalClaimCapabilityFloor(
    contract,
    outcomeKey,
    assertion.claims[0],
    check.proof_surface,
    assertion.applicability_ref ?? null,
    check.key,
  );
  if (assertion.operator === "exists") result.add("presence");
  if ("kind" in claim && claim.kind === "result") result.add("target_runtime");
  addControlCapabilityFloor(result, contract, outcomeKey, claim);
  addProofSurfaceFloor(result, check.proof_surface);
  if (check.journey_roles.includes("recovery")) {
    result.add("failure_injection");
    result.add("recovery");
  }
  const outcome = outcomeKey
    ? contract.outcomes.find((item) => item.key === outcomeKey)
    : null;
  if (
    outcome?.acceptance.population?.check_key === check.key &&
    outcome.acceptance.population.claims.includes(assertion.claims[0])
  )
    result.add("population_coverage");
  if (
    assertion.evidence_capabilities.includes("visual_render") ||
    assertion.evidence_capabilities.includes("design_conformance")
  ) {
    result.add("visual_render");
    result.add("design_conformance");
  }
  const semantic = expectations.find(
    (item) => item.assertion_ref === assertion.key,
  );
  if (semantic)
    for (const capability of semanticFactCapabilityFloor(semantic, contract))
      result.add(capability);
  for (const capability of semanticClaimFloor) result.add(capability);
  return result;
}

export function externalClaimCapabilityFloor(
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  localClaim: string,
  proofSurface: DeliveryCheckV2["proof_surface"],
  applicabilityRef: string | null,
  checkKey: string | null = null,
): Set<EvidenceCapabilityV2> {
  const result = new Set<EvidenceCapabilityV2>();
  if (localClaim === "result") result.add("target_runtime");
  addExternalControlCapabilityFloor(result, contract, outcomeKey, localClaim);
  addProofSurfaceFloor(result, proofSurface);
  const profile = applicabilityRef
    ? (outcomeKey
        ? contract.outcomes.find((item) => item.key === outcomeKey)
            ?.applicability
        : contract.global.applicability
      )?.find((item) => item.key === applicabilityRef)
    : null;
  if (profile?.journey_role === "recovery") {
    result.add("failure_injection");
    result.add("recovery");
  }
  const outcome = outcomeKey
    ? contract.outcomes.find((item) => item.key === outcomeKey)
    : null;
  if (
    outcome?.acceptance.population &&
    (!checkKey || outcome.acceptance.population.check_key === checkKey) &&
    outcome.acceptance.population.claims.includes(localClaim)
  )
    result.add("population_coverage");
  return result;
}

function addControlCapabilityFloor(
  result: Set<EvidenceCapabilityV2>,
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  claim: { kind?: string; local_key: string },
): void {
  if (!("kind" in claim) || claim.kind !== "control" || !outcomeKey) return;
  addSpecifiedControlFloor(result, contract, outcomeKey, claim.local_key);
}

function addExternalControlCapabilityFloor(
  result: Set<EvidenceCapabilityV2>,
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  localClaim: string,
): void {
  if (!localClaim.startsWith("control.") || !outcomeKey) return;
  addSpecifiedControlFloor(result, contract, outcomeKey, localClaim);
}

function addSpecifiedControlFloor(
  result: Set<EvidenceCapabilityV2>,
  contract: DeliveryContractV2,
  outcomeKey: string,
  localClaim: string,
): void {
  const field = localClaim.split(".").at(-1)!;
  if (!controlClaimSpecified(contract, outcomeKey, localClaim)) return;
  if (CONTROL_EXISTS_FIELDS.has(field)) result.add("presence");
  if (CONTROL_STATE_FIELDS.has(field)) {
    result.add("interaction_trace");
    result.add("state_delta");
  }
  if (field === "permission") {
    result.add("input_variation");
    result.add("distinct_identity");
    result.add("data_state");
    result.add("target_runtime");
  }
  if (CONTROL_PRODUCT_EFFECT_FIELDS.has(field)) {
    result.add("interaction_trace");
    result.add("input_variation");
    result.add("state_delta");
  }
}

function addProofSurfaceFloor(
  result: Set<EvidenceCapabilityV2>,
  proofSurface: DeliveryCheckV2["proof_surface"],
): void {
  if (proofSurface === "implementation_structure") result.add("presence");
  if (proofSurface === "data_state") result.add("data_state");
  if (proofSurface === "population_coverage") result.add("population_coverage");
}

function semanticFactCapabilityFloor(
  expectation: SemanticFactExpectationV2,
  contract: DeliveryContractV2,
): Set<EvidenceCapabilityV2> {
  const outcome = contract.outcomes.find(
    (item) => item.key === expectation.outcome_ref,
  );
  const binding = outcome?.semantic_fact_bindings.proofs.find(
    (item) => item.proof_ref === expectation.proof_ref,
  );
  return new Set(binding?.evidence_capabilities ?? []);
}

function controlClaimSpecified(
  contract: DeliveryContractV2,
  outcomeKey: string,
  localClaim: string,
): boolean {
  const outcome = contract.outcomes.find((item) => item.key === outcomeKey)!;
  const [, controlKey, field] = localClaim.split(".");
  const control = outcome.product.controls.find(
    (item) => item.key === controlKey,
  );
  return Boolean(
    control &&
    controlFieldFacts(control).some(
      (item) => item.claim_field === field && item.state === "specified",
    ),
  );
}
