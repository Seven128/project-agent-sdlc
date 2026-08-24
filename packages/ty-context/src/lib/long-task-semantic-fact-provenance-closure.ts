import { semanticFactClosureInvalid } from "./long-task-semantic-fact-closure-primitives.js";
import type { CompiledSourceItemV2 } from "./long-task-source-authority-types.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export function validateSemanticFactProvenance(
  manifest: SemanticFactManifestV1,
  sourceItems: CompiledSourceItemV2[],
): void {
  const sourceRefs = new Set(sourceItems.map((item) => item.key));
  const inputByKey = new Map(manifest.inputs.map((item) => [item.key, item]));
  const materialInputRefs = new Set(
    manifest.inputs
      .filter((item) =>
        ["non_ui_material", "fact_bearing"].includes(item.disposition),
      )
      .map((item) => item.key),
  );
  const facts = new Map(manifest.facts.map((item) => [item.key, item]));
  const isMaterialAuthority = (ref: string) =>
    sourceRefs.has(ref) || materialInputRefs.has(ref);
  for (const fact of manifest.facts)
    validateFactAuthority(
      fact,
      facts,
      sourceRefs,
      inputByKey,
      isMaterialAuthority,
    );
  const grounded = new Map<string, boolean>();
  const visit = (factRef: string, active: Set<string>): boolean => {
    const cached = grounded.get(factRef);
    if (cached !== undefined) return cached;
    if (active.has(factRef))
      semanticFactClosureInvalid(
        "fact_provenance_cycle",
        [...active, factRef].join("->"),
      );
    const fact = facts.get(factRef)!;
    const next = new Set(active);
    next.add(factRef);
    const result = fact.provenance.basis_refs.some(
      (ref) => isMaterialAuthority(ref) || (facts.has(ref) && visit(ref, next)),
    );
    grounded.set(factRef, result);
    return result;
  };
  for (const fact of manifest.facts)
    if (!visit(fact.key, new Set()))
      semanticFactClosureInvalid("fact_provenance_ungrounded", fact.key);
}

function validateFactAuthority(
  fact: SemanticFactManifestV1["facts"][number],
  facts: Map<string, SemanticFactManifestV1["facts"][number]>,
  sourceRefs: Set<string>,
  inputByKey: Map<string, SemanticFactManifestV1["inputs"][number]>,
  isMaterialAuthority: (ref: string) => boolean,
): void {
  const authorityRef = fact.provenance.authority_ref;
  if (!fact.provenance.basis_refs.includes(authorityRef))
    semanticFactClosureInvalid(
      "fact_authority_basis_missing",
      `${fact.key}:${authorityRef}`,
    );
  if (authorityRef === fact.key)
    semanticFactClosureInvalid("fact_authority_self_reference", fact.key);
  if (!isMaterialAuthority(authorityRef) && !facts.has(authorityRef))
    semanticFactClosureInvalid(
      "fact_authority_not_groundable",
      `${fact.key}:${authorityRef}`,
    );
  if (
    fact.provenance.kind !== "logically_derived" &&
    !isMaterialAuthority(authorityRef)
  )
    semanticFactClosureInvalid(
      "fact_direct_authority_required",
      `${fact.key}:${fact.provenance.kind}:${authorityRef}`,
    );
  if (
    sourceRefs.has(authorityRef) &&
    !fact.source_item_refs.includes(authorityRef)
  )
    semanticFactClosureInvalid(
      "fact_authority_source_lineage_mismatch",
      `${fact.key}:${authorityRef}`,
    );
  const authorityInput = inputByKey.get(authorityRef);
  if (authorityInput && !authorityInput.fact_refs.includes(fact.key))
    semanticFactClosureInvalid(
      "fact_authority_input_lineage_mismatch",
      `${fact.key}:${authorityRef}`,
    );
  if (
    fact.provenance.kind === "explicitly_delegated" &&
    authorityInput &&
    authorityInput.kind !== "delegated_instruction" &&
    authorityInput.kind !== "source_item"
  )
    semanticFactClosureInvalid(
      "delegated_fact_authority_kind_mismatch",
      `${fact.key}:${authorityInput.kind}`,
    );
  if (
    fact.provenance.kind === "evidence_backed_preservation" &&
    authorityInput &&
    !["repository_preservation", "context", "source_item"].includes(
      authorityInput.kind,
    )
  )
    semanticFactClosureInvalid(
      "preservation_fact_authority_kind_mismatch",
      `${fact.key}:${authorityInput.kind}`,
    );
}

export function validateSemanticFactBasisClosure(
  manifest: SemanticFactManifestV1,
  sourceItems: CompiledSourceItemV2[],
): void {
  const known = semanticFactKnownBasisRefs(manifest, sourceItems);
  const rows: Array<{ label: string; refs: string[] }> = [];
  const collect = (
    label: string,
    values: Array<{ key: string; basis_refs: string[] }>,
  ) =>
    rows.push(
      ...values.map((item) => ({
        label: `${label}:${item.key}`,
        refs: item.basis_refs,
      })),
    );
  collect("scope_exclusion", manifest.scope.exclusions);
  collect("input", manifest.inputs);
  collect("census", manifest.inspector.census);
  collect("family", manifest.family_dispositions);
  collect("subject", manifest.subjects);
  collect("relation", manifest.relations);
  collect("population", manifest.populations);
  collect("axis", manifest.axis_dispositions);
  collect(
    "axis_value",
    manifest.axis_dispositions.flatMap((item) => item.values),
  );
  collect("condition_rule", manifest.condition_rules);
  collect("condition", manifest.conditions);
  collect("condition_exclusion", manifest.condition_exclusions);
  collect("property", manifest.property_dispositions);
  collect("fact_cell", manifest.fact_cells);
  addSpecialBasisRows(manifest, rows);
  for (const row of rows)
    for (const ref of row.refs)
      if (!known.has(ref))
        semanticFactClosureInvalid("basis_ref_unknown", `${row.label}:${ref}`);
}

function semanticFactKnownBasisRefs(
  manifest: SemanticFactManifestV1,
  sourceItems: CompiledSourceItemV2[],
): Set<string> {
  return new Set<string>([
    manifest.key,
    ...sourceItems.map((item) => item.key),
    ...manifest.scope.exclusions.map((item) => item.key),
    ...manifest.inputs.map((item) => item.key),
    ...manifest.inspector.census.map((item) => item.key),
    ...manifest.family_dispositions.map((item) => item.key),
    ...manifest.subjects.map((item) => item.key),
    ...manifest.relations.map((item) => item.key),
    ...manifest.populations.map((item) => item.key),
    ...manifest.axis_dispositions.map((item) => item.key),
    ...manifest.axis_dispositions.flatMap((item) =>
      item.values.map((value) => value.key),
    ),
    ...manifest.condition_rules.map((item) => item.key),
    ...manifest.conditions.map((item) => item.key),
    ...manifest.condition_exclusions.map((item) => item.key),
    ...manifest.property_dispositions.map((item) => item.key),
    ...manifest.fact_cells.map((item) => item.key),
    ...manifest.facts.map((item) => item.key),
    ...manifest.proof_obligations.map((item) => item.key),
    ...manifest.oracles.map((item) => item.key),
    ...manifest.environments.map((item) => item.key),
    ...manifest.blockers.map((item) => item.key),
  ]);
}

function addSpecialBasisRows(
  manifest: SemanticFactManifestV1,
  rows: Array<{ label: string; refs: string[] }>,
): void {
  for (const fact of manifest.facts)
    rows.push({
      label: `fact_provenance:${fact.key}`,
      refs: fact.provenance.basis_refs,
    });
  for (const proof of manifest.proof_obligations)
    rows.push({
      label: `proof_counterfactual:${proof.key}`,
      refs: proof.counterfactual.basis_refs,
    });
  for (const exclusion of manifest.scope.exclusions)
    rows.push({
      label: `scope_exclusion_affected:${exclusion.key}`,
      refs: exclusion.affected_refs,
    });
  for (const population of manifest.populations)
    rows.push({
      label: `population_exclusions:${population.key}`,
      refs: population.exclusion_refs,
    });
  for (const blocker of manifest.blockers)
    rows.push({
      label: `blocker_affected:${blocker.key}`,
      refs: blocker.affected_refs,
    });
  for (const fact of manifest.facts)
    rows.push({
      label: `fact_authority:${fact.key}`,
      refs: [fact.provenance.authority_ref],
    });
}
