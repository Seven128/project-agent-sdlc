import {
  generateClaims,
  generateGlobalClaims,
} from "./long-task-claim-definitions.js";
import type {
  DeliveryCheckV2,
  DeliveryContractV2,
  EvidenceCapabilityV2,
  ProductClaimV2,
  SemanticFactExpectationV2,
} from "./long-task-delivery-types.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { assertionCapabilityFloor } from "./long-task-proof-capability-floor.js";
import { claimSemanticCapabilityFloor } from "./long-task-claim-semantic-proof-floor.js";
import { resolveExpectedAuthority } from "./long-task-expected-authority.js";
import { validateSemanticFactProofFloors } from "./long-task-semantic-proof-adequacy.js";

export { externalClaimCapabilityFloor } from "./long-task-proof-capability-floor.js";

export type CheckCompletionRoleV2 = "semantic" | "diagnostic";

export interface CheckProofAdequacyV2 {
  completion_role: CheckCompletionRoleV2;
  expected_authority_refs: Record<string, string>;
  required_evidence_capabilities: Record<string, EvidenceCapabilityV2[]>;
}

export type ProofAdequacyByCheckV2 = Record<string, CheckProofAdequacyV2>;

export function proofAdequacyCheckKey(
  outcomeKey: string | null,
  checkKey: string,
): string {
  return `${outcomeKey ?? "GLOBAL"}:${checkKey}`;
}

export function validateLongTaskProofAdequacy(
  contract: DeliveryContractV2,
  manifest: SemanticFactManifestV1,
  expectationsByCheck: ReadonlyMap<string, SemanticFactExpectationV2[]>,
): ProofAdequacyByCheckV2 {
  validateSemanticFactProofFloors(manifest);
  const result: ProofAdequacyByCheckV2 = {};
  const globalClaims = new Map(
    generateGlobalClaims(contract.global).map((claim) => [
      claim.local_key,
      claim,
    ]),
  );
  for (const check of contract.global.acceptance.checks)
    result[proofAdequacyCheckKey(null, check.key)] = validateCheck(
      contract,
      null,
      check,
      globalClaims,
      manifest,
      expectationsByCheck.get(check.key) ?? [],
    );
  for (const outcome of contract.outcomes) {
    const claims = new Map(
      generateClaims(outcome).map((claim) => [claim.local_key, claim]),
    );
    for (const check of outcome.acceptance.checks)
      result[proofAdequacyCheckKey(outcome.key, check.key)] = validateCheck(
        contract,
        outcome.key,
        check,
        claims,
        manifest,
        expectationsByCheck.get(check.key) ?? [],
      );
  }
  return result;
}

function validateCheck(
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  check: DeliveryCheckV2,
  claims: ReadonlyMap<
    string,
    ProductClaimV2 | ReturnType<typeof generateGlobalClaims>[number]
  >,
  manifest: SemanticFactManifestV1,
  expectations: SemanticFactExpectationV2[],
): CheckProofAdequacyV2 {
  const assertions = [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ];
  const claimBearing = assertions.filter(
    (assertion) => assertion.claims.length,
  );
  const expectedAuthorityRefs: Record<string, string> = {};
  const requiredCapabilities: Record<string, EvidenceCapabilityV2[]> = {};
  for (const assertion of claimBearing) {
    const claimRef = assertion.claims[0];
    const claim = claims.get(claimRef);
    if (!claim)
      fail(
        "proof_adequacy_claim_unknown",
        `${outcomeKey ?? "GLOBAL"}:${check.key}:${assertion.key}:${claimRef}`,
      );
    expectedAuthorityRefs[assertion.key] = resolveExpectedAuthority(
      contract,
      outcomeKey,
      assertion,
      manifest,
      expectations,
    );
    const required = assertionCapabilityFloor(
      contract,
      outcomeKey,
      check,
      assertion,
      claim,
      expectations,
      claimSemanticCapabilityFloor(
        contract,
        manifest,
        outcomeKey,
        claimRef,
        assertion.applicability_ref ?? null,
        "kind" in claim ? claim.kind : undefined,
        "required_proof_surfaces" in claim ? claim.required_proof_surfaces : [],
      ),
    );
    requiredCapabilities[assertion.key] = [...required].sort();
    const missing = [...required].filter(
      (capability) => !assertion.evidence_capabilities.includes(capability),
    );
    if (missing.length)
      fail(
        "proof_adequacy_capability_missing",
        `${outcomeKey ?? "GLOBAL"}:${check.key}:${assertion.key}:${missing.sort().join(",")}`,
      );
    if (
      required.has("population_coverage") &&
      assertion.operator !== "set_equals"
    )
      fail(
        "population_coverage_set_equality_required",
        `${outcomeKey ?? "GLOBAL"}:${check.key}:${assertion.key}`,
      );
  }
  return {
    completion_role: claimBearing.length ? "semantic" : "diagnostic",
    expected_authority_refs: expectedAuthorityRefs,
    required_evidence_capabilities: requiredCapabilities,
  };
}

function fail(code: string, detail: string): never {
  throw new Error(`delivery_contract_invalid:${code}:${detail}`);
}
