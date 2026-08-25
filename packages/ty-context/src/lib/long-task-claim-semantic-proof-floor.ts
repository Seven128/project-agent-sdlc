import type {
  DeliveryContractV2,
  EvidenceCapabilityV2,
  ProductClaimV2,
} from "./long-task-delivery-types.js";
import { semanticFactClosureInvalid } from "./long-task-semantic-fact-closure-primitives.js";
import { semanticFactProofCapabilityFloor } from "./long-task-semantic-proof-profile.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

const FACT_REQUIRED_CLAIM_KINDS = new Set<ProductClaimV2["kind"]>([
  "result",
  "requirement",
  "obligation",
  "non_completing",
  "forbidden_shortcut",
]);

export function claimSemanticCapabilityFloor(
  contract: DeliveryContractV2,
  manifest: SemanticFactManifestV1,
  outcomeKey: string | null,
  localClaim: string,
  applicabilityRef: string | null,
  claimKind?: ProductClaimV2["kind"] | string,
  requiredProofSurfaces: readonly string[] = [],
): Set<EvidenceCapabilityV2> {
  if (!outcomeKey) return new Set();
  const outcome = contract.outcomes.find((row) => row.key === outcomeKey);
  if (!outcome) return new Set();
  const applicableFactRefs = new Set(
    outcome.semantic_fact_bindings.facts
      .filter(
        (binding) =>
          !applicabilityRef || binding.applicability_ref === applicabilityRef,
      )
      .map((binding) => binding.fact_ref),
  );
  const directBinding = outcome.semantic_fact_bindings.facts.find(
    (binding) => binding.claim_ref === localClaim,
  );
  let selected = directBinding ? [directBinding.fact_ref] : [];
  if (!selected.length) {
    const fullClaim = `${outcomeKey}.${localClaim}`;
    const sourceRefs = contract.source_claims
      .filter((source) => sourceOwnsClaim(source.disposition, fullClaim))
      .map((source) => source.key);
    selected = manifest.facts
      .filter(
        (fact) =>
          fact.outcome_ref === outcomeKey &&
          applicableFactRefs.has(fact.key) &&
          sourceRefs.some((sourceRef) =>
            fact.source_item_refs.includes(sourceRef),
          ),
      )
      .map((fact) => fact.key);
  }
  if (!selected.length)
    selected = manifest.facts
      .filter(
        (fact) =>
          fact.outcome_ref === outcomeKey && applicableFactRefs.has(fact.key),
      )
      .map((fact) => fact.key);

  const pureStructure =
    requiredProofSurfaces.length > 0 &&
    requiredProofSurfaces.every(
      (surface) => surface === "implementation_structure",
    );
  if (
    claimKind &&
    FACT_REQUIRED_CLAIM_KINDS.has(claimKind as ProductClaimV2["kind"]) &&
    !pureStructure &&
    !selected.length
  )
    semanticFactClosureInvalid(
      "broad_claim_semantic_fact_required",
      `${outcomeKey}:${localClaim}:${applicabilityRef ?? "none"}`,
    );

  const facts = new Map(manifest.facts.map((fact) => [fact.key, fact]));
  const result = new Set<EvidenceCapabilityV2>();
  for (const factRef of selected) {
    const fact = facts.get(factRef)!;
    for (const proof of manifest.proof_obligations.filter(
      (row) => row.fact_ref === factRef,
    ))
      for (const capability of semanticFactProofCapabilityFloor(
        manifest,
        fact,
        proof,
      ))
        if (capability !== "semantic_fact") result.add(capability);
  }
  return result;
}

function sourceOwnsClaim(
  disposition: DeliveryContractV2["source_claims"][number]["disposition"],
  fullClaim: string,
): boolean {
  if (disposition.type === "claim") return disposition.refs.includes(fullClaim);
  if (disposition.type === "outcome_result")
    return disposition.ref === fullClaim;
  return false;
}
