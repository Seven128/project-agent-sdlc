import type {
  EvidenceCapabilityV2,
  SemanticFactManifestV1,
} from "./long-task-delivery-types.js";

export function validateSemanticFactProofFloors(
  manifest: SemanticFactManifestV1,
): void {
  const facts = new Map(manifest.facts.map((fact) => [fact.key, fact]));
  for (const proof of manifest.proof_obligations) {
    const fact = facts.get(proof.fact_ref)!;
    const required = semanticFactProofCapabilityFloor(fact, proof);
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

function semanticFactProofCapabilityFloor(
  fact: SemanticFactManifestV1["facts"][number],
  proof: SemanticFactManifestV1["proof_obligations"][number],
): Set<EvidenceCapabilityV2> {
  const result = new Set<EvidenceCapabilityV2>(["semantic_fact"]);
  const semanticText = `${fact.property_ref} ${proof.method}`.toLocaleLowerCase(
    "en-US",
  );
  if (fact.observation_scope === "implementation_structure")
    result.add("presence");
  if (fact.observation_scope === "data_boundary") result.add("data_state");
  if (fact.quantifier.kind !== "one") result.add("population_coverage");
  if (semanticText.includes("interaction")) {
    result.add("interaction_trace");
    result.add("state_delta");
  }
  if (
    ["effect", "result_change", "product_result"].some((term) =>
      semanticText.includes(term),
    )
  ) {
    result.add("interaction_trace");
    result.add("input_variation");
    result.add("state_delta");
  }
  if (
    ["persist", "durable", "readback"].some((term) =>
      semanticText.includes(term),
    )
  )
    result.add("durable_readback");
  if (semanticText.includes("identity")) {
    result.add("distinct_identity");
    result.add("data_state");
  }
  if (["failure", "recovery"].some((term) => semanticText.includes(term))) {
    result.add("failure_injection");
    result.add("recovery");
  }
  if (
    proof.proof_surface === "api_contract" &&
    ["provider", "invocation", "call"].some((term) =>
      semanticText.includes(term),
    )
  ) {
    result.add("boundary_invocation");
    result.add("actual_provenance");
  }
  if (
    proof.proof_surface === "ui_browser" &&
    ["visual", "layout", "pixel", "geometry"].some((term) =>
      semanticText.includes(term),
    )
  ) {
    result.add("visual_render");
    result.add("design_conformance");
  }
  return result;
}

function fail(code: string, detail: string): never {
  throw new Error(`delivery_contract_invalid:${code}:${detail}`);
}
