import {
  designFactComparatorSupportsMethod,
  designFactEvidenceSupportsMethod,
  designFactMethodIsCompatible,
  designFactOracleSupportsMethod,
} from "./design-resource-fact-policy.js";
import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import {
  invalidDesignResourceHandoff,
  requireKnownDesignResourceRef,
  requireUniqueDesignResourceValues,
} from "./design-resource-handoff-validation-primitives.js";

export function validateDesignResourceProofObligations(
  handoff: DesignResourceHandoffV1,
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
): void {
  const facts = new Map(handoff.facts.map((item) => [item.key, item]));
  const oracles = new Map(handoff.oracles.map((item) => [item.key, item]));
  const environments = new Map(
    handoff.environments.map((item) => [item.key, item]),
  );
  const proofByFact = new Map<string, number>();
  const factMethodPairs: string[] = [];
  for (const proof of handoff.proof_obligations) {
    validateProofReferences(proof, facts, oracles, environments);
    validateProofMethod(
      proof,
      facts.get(proof.fact_ref)!,
      oracles.get(proof.oracle_ref)!,
      evidence,
    );
    validateProofResources(
      proof,
      facts.get(proof.fact_ref)!,
      environments,
      resources,
      targets,
    );
    validateProofComparison(proof);
    proofByFact.set(proof.fact_ref, (proofByFact.get(proof.fact_ref) ?? 0) + 1);
    factMethodPairs.push(`${proof.fact_ref}\0${proof.method}`);
  }
  requireUniqueDesignResourceValues(
    factMethodPairs,
    "fact_verification_method_obligation_duplicate",
  );
  for (const fact of handoff.facts)
    if (!proofByFact.has(fact.key))
      invalidDesignResourceHandoff(
        "fact_verification_method_required",
        fact.key,
      );
  for (const environment of handoff.environments)
    requireKnownDesignResourceRef(
      resources,
      environment.definition.locator.resource_ref,
      "environment_resource",
    );
}

function validateProofReferences(
  proof: DesignResourceHandoffV1["proof_obligations"][number],
  facts: Map<string, DesignResourceHandoffV1["facts"][number]>,
  oracles: Map<string, DesignResourceHandoffV1["oracles"][number]>,
  environments: Map<string, DesignResourceHandoffV1["environments"][number]>,
): void {
  requireKnownDesignResourceRef(facts, proof.fact_ref, "proof_fact");
  requireKnownDesignResourceRef(oracles, proof.oracle_ref, "proof_oracle");
  requireKnownDesignResourceRef(
    environments,
    proof.environment_ref,
    "proof_environment",
  );
}

function validateProofMethod(
  proof: DesignResourceHandoffV1["proof_obligations"][number],
  fact: DesignResourceHandoffV1["facts"][number],
  oracle: DesignResourceHandoffV1["oracles"][number],
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
): void {
  if (!designFactMethodIsCompatible(fact.dimension, proof.method))
    invalidDesignResourceHandoff(
      "proof_verification_method_incompatible",
      `${proof.key}:${fact.dimension}:${proof.method}`,
    );
  if (
    !fact.evidence_refs.some((ref) =>
      designFactEvidenceSupportsMethod(proof.method, evidence.get(ref)!.kind),
    )
  )
    invalidDesignResourceHandoff(
      "proof_method_evidence_missing",
      `${proof.key}:${proof.fact_ref}:${proof.method}`,
    );
  if (
    !designFactComparatorSupportsMethod(
      proof.method,
      proof.comparison.comparator,
    )
  )
    invalidDesignResourceHandoff(
      "proof_comparator_method_incompatible",
      `${proof.key}:${proof.method}:${proof.comparison.comparator}`,
    );
  if (!designFactOracleSupportsMethod(proof.method, oracle.capability_refs))
    invalidDesignResourceHandoff(
      "proof_oracle_capability_missing",
      `${proof.key}:${proof.oracle_ref}:${proof.method}`,
    );
}

function validateProofResources(
  proof: DesignResourceHandoffV1["proof_obligations"][number],
  fact: DesignResourceHandoffV1["facts"][number],
  environments: Map<string, DesignResourceHandoffV1["environments"][number]>,
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
): void {
  const target = targets.get(fact.target_ref)!;
  const environmentResourceRef = environments.get(proof.environment_ref)!
    .definition.locator.resource_ref;
  if (!target.resource_refs.includes(environmentResourceRef))
    invalidDesignResourceHandoff(
      "proof_environment_outside_target",
      `${proof.key}:${proof.environment_ref}:${environmentResourceRef}`,
    );
  for (const located of [
    proof.comparison.parameters,
    proof.comparison.tolerance,
    proof.comparison.mask,
  ])
    if (located) {
      requireKnownDesignResourceRef(
        resources,
        located.locator.resource_ref,
        "proof_resource",
      );
      if (!target.resource_refs.includes(located.locator.resource_ref))
        invalidDesignResourceHandoff(
          "proof_resource_outside_target",
          `${proof.key}:${located.locator.resource_ref}`,
        );
    }
}

function validateProofComparison(
  proof: DesignResourceHandoffV1["proof_obligations"][number],
): void {
  if (
    proof.comparison.mode === "exact" &&
    (proof.comparison.tolerance !== null || proof.comparison.mask !== null)
  )
    invalidDesignResourceHandoff("proof_exact_tolerance_forbidden", proof.key);
  if (
    proof.comparison.mode === "tolerance" &&
    proof.comparison.tolerance === null
  )
    invalidDesignResourceHandoff("proof_tolerance_required", proof.key);
  if (
    proof.comparison.mask !== null &&
    proof.comparison.comparator !== "pixel_diff" &&
    !proof.comparison.comparator.startsWith("custom.")
  )
    invalidDesignResourceHandoff(
      "proof_mask_comparator_incompatible",
      `${proof.key}:${proof.comparison.comparator}`,
    );
}
