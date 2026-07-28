import {
  assertDesignResourceFactPolicyEnabled,
  designFactEvidenceIsCompatible,
  designFactMethodIsCompatible,
  EXACT_TARGET_FULL_TARGET_METHODS,
} from "./design-resource-fact-policy.js";
import type { DesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import {
  invalidDesignResourceHandoff,
  requireDesignSourceItemKind,
  requireKnownDesignResourceRef,
  requireNonemptyDesignResourceValues,
  requireUniqueDesignResourceValues,
} from "./design-resource-handoff-validation-primitives.js";

export function validateDesignResourceFacts(
  handoff: DesignResourceHandoffV1,
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
  conditions: Map<string, DesignResourceHandoffV1["conditions"][number]>,
  subjects: Map<string, DesignResourceHandoffV1["subjects"][number]>,
  targets: Map<string, DesignResourceHandoffV1["targets"][number]>,
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
  sourceItems: Map<string, string>,
): void {
  assertDesignResourceFactPolicyEnabled();
  for (const fact of handoff.facts) {
    requireNonemptyDesignResourceValues(
      fact.evidence_refs,
      `fact_evidence_refs_required:${fact.key}`,
    );
    requireNonemptyDesignResourceValues(
      fact.source_item_refs,
      `fact_source_item_refs_required:${fact.key}`,
    );
    requireUniqueDesignResourceValues(
      fact.evidence_refs,
      `fact_evidence_ref_duplicate:${fact.key}`,
    );
    requireUniqueDesignResourceValues(
      fact.source_item_refs,
      `fact_source_item_ref_duplicate:${fact.key}`,
    );
    requireKnownDesignResourceRef(subjects, fact.subject_ref, "subject");
    requireKnownDesignResourceRef(targets, fact.target_ref, "target");
    requireKnownDesignResourceRef(conditions, fact.condition_ref, "condition");
    const subject = subjects.get(fact.subject_ref)!;
    const target = targets.get(fact.target_ref)!;
    if (!subject.target_refs.includes(fact.target_ref))
      invalidDesignResourceHandoff(
        "fact_target_outside_subject",
        `${fact.key}:${fact.subject_ref}:${fact.target_ref}`,
      );
    if (!target.condition_refs.includes(fact.condition_ref))
      invalidDesignResourceHandoff(
        "fact_condition_outside_target",
        `${fact.key}:${fact.target_ref}:${fact.condition_ref}`,
      );
    if (
      fact.observation_scope === "full_target" &&
      (subject.kind !== "surface" ||
        !subject.stable_keys.some((key) =>
          handoff.scope.surface_keys.includes(key),
        ))
    )
      invalidDesignResourceHandoff(
        "full_target_fact_surface_required",
        `${fact.key}:${fact.subject_ref}`,
      );
    if (!designFactMethodIsCompatible(fact.dimension, fact.verification_method))
      invalidDesignResourceHandoff(
        "fact_verification_method_incompatible",
        `${fact.key}:${fact.dimension}:${fact.verification_method}`,
      );
    for (const sourceItemRef of fact.source_item_refs) {
      requireKnownDesignResourceRef(sourceItems, sourceItemRef, "source_item");
      requireDesignSourceItemKind(sourceItems, sourceItemRef);
    }
    let exactResourceEvidence = false;
    for (const evidenceRef of fact.evidence_refs) {
      requireKnownDesignResourceRef(evidence, evidenceRef, "evidence");
      const item = evidence.get(evidenceRef)!;
      if (!target.resource_refs.includes(item.resource_ref))
        invalidDesignResourceHandoff(
          "fact_evidence_outside_target",
          `${fact.key}:${evidenceRef}:${fact.target_ref}`,
        );
      if (!item.condition_refs.includes(fact.condition_ref))
        invalidDesignResourceHandoff(
          "fact_evidence_condition_mismatch",
          `${fact.key}:${evidenceRef}:${fact.condition_ref}`,
        );
      if (!designFactEvidenceIsCompatible(fact.dimension, item.kind))
        invalidDesignResourceHandoff(
          "fact_evidence_kind_incompatible",
          `${fact.key}:${fact.dimension}:${evidenceRef}:${item.kind}`,
        );
      if (resources.get(item.resource_ref)?.role === "exact_target")
        exactResourceEvidence = true;
    }
    if (fact.observation_scope === "full_target" && !exactResourceEvidence)
      invalidDesignResourceHandoff(
        "full_target_fact_exact_resource_required",
        fact.key,
      );
  }
  validateExactTargetFacts(handoff);
  validateResourceFactClosure(handoff, resources, evidence);
}

function validateExactTargetFacts(handoff: DesignResourceHandoffV1): void {
  for (const target of handoff.targets) {
    if (target.interpretation !== "exact_target") continue;
    for (const conditionRef of target.condition_refs)
      for (const method of EXACT_TARGET_FULL_TARGET_METHODS)
        if (
          !handoff.facts.some(
            (fact) =>
              fact.target_ref === target.key &&
              fact.condition_ref === conditionRef &&
              fact.observation_scope === "full_target" &&
              fact.verification_method === method,
          )
        )
          invalidDesignResourceHandoff(
            "exact_target_full_target_fact_missing",
            `${target.key}:${conditionRef}:${method}`,
          );
  }
}

function validateResourceFactClosure(
  handoff: DesignResourceHandoffV1,
  resources: Map<string, DesignResourceHandoffV1["resources"][number]>,
  evidence: Map<string, DesignResourceHandoffV1["evidence"][number]>,
): void {
  const closuresByResource = new Map<string, string>();
  for (const closure of handoff.resource_fact_closure) {
    requireKnownDesignResourceRef(
      resources,
      closure.resource_ref,
      "resource_fact_closure_resource",
    );
    if (closuresByResource.has(closure.resource_ref))
      invalidDesignResourceHandoff(
        "resource_fact_closure_duplicate",
        closure.resource_ref,
      );
    closuresByResource.set(closure.resource_ref, closure.key);
    requireUniqueDesignResourceValues(
      closure.fact_refs,
      `resource_fact_closure_fact_ref_duplicate:${closure.key}`,
    );
    const expected = handoff.facts
      .filter((fact) =>
        fact.evidence_refs.some(
          (evidenceRef) =>
            evidence.get(evidenceRef)?.resource_ref === closure.resource_ref,
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
    const resource = resources.get(closure.resource_ref)!;
    if (
      closure.disposition === "material_with_facts" &&
      closure.fact_refs.length === 0
    )
      invalidDesignResourceHandoff(
        "resource_fact_closure_facts_required",
        closure.key,
      );
    if (
      closure.disposition === "supporting_only" &&
      closure.fact_refs.length > 0
    )
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
  for (const resource of handoff.resources)
    if (!closuresByResource.has(resource.key))
      invalidDesignResourceHandoff(
        "resource_fact_closure_missing",
        resource.key,
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
