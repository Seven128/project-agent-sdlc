import type { SemanticFactManifestV1 } from "./long-task-delivery-types.js";
import {
  semanticFactProofCapabilityFloor,
  validateSemanticFactProofProfileClosure,
} from "./long-task-semantic-proof-profile.js";

export function validateSemanticFactProofFloors(
  manifest: SemanticFactManifestV1,
): void {
  validateSemanticFactProofProfileClosure(manifest);
  const facts = new Map(manifest.facts.map((fact) => [fact.key, fact]));
  for (const proof of manifest.proof_obligations) {
    const fact = facts.get(proof.fact_ref)!;
    const required = semanticFactProofCapabilityFloor(manifest, fact, proof);
    const missing = [...required].filter(
      (capability) => !proof.evidence_capabilities.includes(capability),
    );
    if (missing.length)
      fail(
        "semantic_fact_proof_adequacy_capability_missing",
        `${proof.key}:${missing.sort().join(",")}`,
      );
    if (
      required.has("population_coverage") &&
      proof.comparison.comparator !== "set_equality" &&
      proof.method !== "population_set_equality"
    )
      fail("semantic_fact_population_set_equality_required", proof.key);
  }
}

function fail(code: string, detail: string): never {
  throw new Error(`delivery_contract_invalid:${code}:${detail}`);
}
