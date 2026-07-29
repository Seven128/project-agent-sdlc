import { EXACT_TARGET_FULL_TARGET_METHODS } from "./design-resource-fact-policy.js";
import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import {
  invalidDesignResourceHandoff,
  requireKnownDesignResourceRef,
  requireUniqueDesignResourceValues,
} from "./design-resource-handoff-validation-primitives.js";

export function validateDesignResourceExactTargetFacts(
  handoff: DesignResourceHandoffV1,
): void {
  const proofsByFact = new Map<string, string[]>();
  for (const proof of handoff.proof_obligations) {
    const methods = proofsByFact.get(proof.fact_ref) ?? [];
    methods.push(proof.method);
    proofsByFact.set(proof.fact_ref, methods);
  }
  for (const target of handoff.targets) {
    if (target.interpretation !== "exact_target") continue;
    for (const conditionRef of target.condition_refs)
      for (const method of EXACT_TARGET_FULL_TARGET_METHODS)
        if (
          !hasExactTargetFact(
            handoff,
            target.key,
            conditionRef,
            method,
            proofsByFact,
          )
        )
          invalidDesignResourceHandoff(
            "exact_target_full_target_fact_missing",
            `${target.key}:${conditionRef}:${method}`,
          );
  }
}

function hasExactTargetFact(
  handoff: DesignResourceHandoffV1,
  targetRef: string,
  conditionRef: string,
  method: string,
  proofsByFact: Map<string, string[]>,
): boolean {
  return handoff.facts.some(
    (fact) =>
      fact.target_ref === targetRef &&
      fact.condition_ref === conditionRef &&
      fact.observation_scope === "full_target" &&
      (proofsByFact.get(fact.key) ?? []).includes(method),
  );
}

export function validateDesignResourceResourceFactClosure(
  handoff: DesignResourceHandoffV1,
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
): void {
  const lineageNodes = new Map(
    handoff.lineage_nodes.map((item) => [item.key, item]),
  );
  const proofsByFact = new Map(
    handoff.facts.map((fact) => [
      fact.key,
      handoff.proof_obligations.filter((proof) => proof.fact_ref === fact.key),
    ]),
  );
  const environments = new Map(
    handoff.environments.map((environment) => [environment.key, environment]),
  );
  const closuresByResource = new Map<string, string>();
  for (const closure of handoff.resource_fact_closure) {
    validateResourceClosure(
      closure,
      handoff,
      resources,
      evidence,
      lineageNodes,
      proofsByFact,
      environments,
    );
    if (closuresByResource.has(closure.resource_ref))
      invalidDesignResourceHandoff(
        "resource_fact_closure_duplicate",
        closure.resource_ref,
      );
    closuresByResource.set(closure.resource_ref, closure.key);
  }
  for (const resource of handoff.resources)
    if (!closuresByResource.has(resource.key))
      invalidDesignResourceHandoff(
        "resource_fact_closure_missing",
        resource.key,
      );
}

function validateResourceClosure(
  closure: DesignResourceHandoffV1["resource_fact_closure"][number],
  handoff: DesignResourceHandoffV1,
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
  lineageNodes: Map<string, DesignResourceHandoffV1["lineage_nodes"][number]>,
  proofsByFact: Map<string, DesignResourceHandoffV1["proof_obligations"]>,
  environments: Map<string, DesignResourceHandoffV1["environments"][number]>,
): void {
  requireKnownDesignResourceRef(
    resources,
    closure.resource_ref,
    "resource_fact_closure_resource",
  );
  requireUniqueDesignResourceValues(
    closure.fact_refs,
    `resource_fact_closure_fact_ref_duplicate:${closure.key}`,
  );
  const expected = handoff.facts
    .filter((fact) =>
      factUsesResource(
        fact,
        closure.resource_ref,
        proofsByFact.get(fact.key) ?? [],
        environments,
        lineageNodes,
        evidence,
      ),
    )
    .map((fact) => fact.key);
  for (const factRef of closure.fact_refs)
    if (!handoff.facts.some((fact) => fact.key === factRef))
      invalidDesignResourceHandoff(
        "resource_fact_closure_fact_unknown",
        `${closure.key}:${factRef}`,
      );
  assertSameSet(
    closure.fact_refs,
    expected,
    "resource_fact_closure_mismatch",
    closure.resource_ref,
  );
  validateClosureDisposition(closure, resources.get(closure.resource_ref)!);
}

function factUsesResource(
  fact: DesignResourceHandoffV1["facts"][number],
  resourceRef: string,
  proofs: DesignResourceHandoffV1["proof_obligations"],
  environments: Map<string, DesignResourceHandoffV1["environments"][number]>,
  lineageNodes: Map<string, DesignResourceHandoffV1["lineage_nodes"][number]>,
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
): boolean {
  const proofResources = proofs.flatMap((proof) => [
    proof.comparison.parameters.locator.resource_ref,
    proof.comparison.tolerance?.locator.resource_ref,
    proof.comparison.mask?.locator.resource_ref,
    environments.get(proof.environment_ref)?.definition.locator.resource_ref,
  ]);
  const lineageResources = [
    ...fact.lineage.token_chain_refs,
    ...fact.lineage.override_chain_refs,
  ].map((ref) => lineageNodes.get(ref)?.value.locator.resource_ref);
  return (
    fact.value.locator.resource_ref === resourceRef ||
    fact.lineage.resolved_value.locator.resource_ref === resourceRef ||
    lineageResources.includes(resourceRef) ||
    proofResources.includes(resourceRef) ||
    fact.evidence_refs.some(
      (evidenceRef) => evidence.get(evidenceRef)?.resource_ref === resourceRef,
    )
  );
}

function validateClosureDisposition(
  closure: DesignResourceHandoffV1["resource_fact_closure"][number],
  resource: DesignResourceHandoffV1["resources"][number],
): void {
  if (
    closure.disposition === "material_with_facts" &&
    closure.fact_refs.length === 0
  )
    invalidDesignResourceHandoff(
      "resource_fact_closure_facts_required",
      closure.key,
    );
  if (closure.disposition === "supporting_only" && closure.fact_refs.length > 0)
    invalidDesignResourceHandoff(
      "supporting_only_resource_fact_forbidden",
      closure.key,
    );
  if (
    resource.role !== "supporting" &&
    closure.disposition !== "material_with_facts"
  )
    invalidDesignResourceHandoff(
      "target_resource_fact_closure_required",
      `${closure.key}:${resource.role}`,
    );
}

function assertSameSet(
  actual: string[],
  expected: string[],
  code: string,
  detail: string,
): void {
  const left = [...new Set(actual)].sort();
  const right = [...new Set(expected)].sort();
  if (
    left.length !== right.length ||
    left.some((item, index) => item !== right[index])
  )
    invalidDesignResourceHandoff(
      code,
      `${detail}:${left.join(",")}:${right.join(",")}`,
    );
}
