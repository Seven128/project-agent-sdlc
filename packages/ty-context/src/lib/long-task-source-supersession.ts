import { semanticFactClosureInvalid } from "./long-task-semantic-fact-closure-primitives.js";
import type {
  CompiledSourceItemV2,
  MaterialSourceFragmentV2,
  SemanticFactClassV2,
  SemanticSourceAnchorV2,
  SourceAuthorityDomain,
} from "./long-task-source-authority-types.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import type {
  ResolvedSourceProjectionV2,
  SourceConservationFactProjectionV2,
} from "./long-task-source-conservation-types.js";

export function validateSameDomainSupersession(
  projection: ResolvedSourceProjectionV2,
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2,
  facts: ReadonlyMap<string, SourceConservationFactProjectionV2>,
  factClasses: Record<string, SemanticFactClassV2>,
  factDomains: Record<string, SourceAuthorityDomain>,
  sourceDomains: ReadonlyMap<string, SourceAuthorityDomain>,
  sourceByKey: ReadonlyMap<string, CompiledSourceItemV2>,
  manifest: SemanticFactManifestV1,
): void {
  if (!projection.fact_refs.length)
    semanticFactClosureInvalid(
      "source_supersession_successor_fact_required",
      material.key,
    );
  const oldFactRefs = materialInputFactRefs(material, manifest);
  if (!oldFactRefs.length)
    semanticFactClosureInvalid(
      "source_supersession_prior_fact_required",
      material.key,
    );
  const oldCells = semanticCells(
    oldFactRefs,
    material,
    facts,
    factClasses,
    factDomains,
  );
  const successorCells = semanticCells(
    projection.fact_refs,
    material,
    facts,
    factClasses,
    factDomains,
  );
  if (!sameSet(oldCells, successorCells))
    semanticFactClosureInvalid(
      "source_supersession_semantic_cell_mismatch",
      `${material.key}:${[...oldCells].sort().join(",")}:${[...successorCells]
        .sort()
        .join(",")}`,
    );

  const priorSources = new Set(material.authority_source_item_refs);
  const supersedingSources = projection.basis_refs
    .flatMap((ref) => projectionBasisSourceItems(ref, manifest, sourceByKey))
    .filter((ref) => !priorSources.has(ref));
  if (!supersedingSources.length)
    semanticFactClosureInvalid(
      "source_supersession_basis_required",
      material.key,
    );
  for (const sourceRef of [...new Set(supersedingSources)]) {
    if (sourceDomains.get(sourceRef) !== material.authority_domain)
      semanticFactClosureInvalid(
        "source_supersession_domain_mismatch",
        `${material.key}:${sourceRef}:${material.authority_domain}:${sourceDomains.get(sourceRef)}`,
      );
    for (const factRef of projection.fact_refs) {
      const fact = facts.get(factRef)!;
      if (
        !fact.source_item_refs.includes(sourceRef) ||
        !hasFactBearingSuccessorFragment(
          sourceRef,
          factRef,
          fact.basis_refs,
          manifest,
        )
      )
        semanticFactClosureInvalid(
          "source_supersession_basis_not_fact_bearing",
          `${material.key}:${sourceRef}:${factRef}`,
        );
    }
  }
}

export function validateSameDomainScopeExclusion(
  projection: ResolvedSourceProjectionV2,
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2,
  sourceDomains: ReadonlyMap<string, SourceAuthorityDomain>,
  sourceByKey: ReadonlyMap<string, CompiledSourceItemV2>,
  manifest: SemanticFactManifestV1,
): void {
  const exclusions = manifest.scope.exclusions.filter((row) =>
    row.affected_refs.includes(projection.input_key),
  );
  if (exclusions.length !== 1)
    semanticFactClosureInvalid(
      exclusions.length
        ? "source_projection_scope_exclusion_ambiguous"
        : "source_projection_scope_exclusion_missing",
      `${material.key}:${projection.input_key}`,
    );
  const exclusion = exclusions[0];
  if (!projection.basis_refs.includes(exclusion.key))
    semanticFactClosureInvalid(
      "source_scope_exclusion_projection_binding_missing",
      `${material.key}:${exclusion.key}`,
    );
  const affectedFactRefs = exactAffectedFactRefs(
    exclusion.affected_refs,
    manifest,
  );
  if (!affectedFactRefs.length)
    semanticFactClosureInvalid(
      "source_scope_exclusion_exact_obligation_required",
      `${material.key}:${exclusion.key}`,
    );
  const materialFactRefs = new Set(materialInputFactRefs(material, manifest));
  if (affectedFactRefs.some((factRef) => !materialFactRefs.has(factRef)))
    semanticFactClosureInvalid(
      "source_scope_exclusion_exact_binding_mismatch",
      `${material.key}:${exclusion.key}:${affectedFactRefs.join(",")}`,
    );
  const excludedSources = new Set(material.authority_source_item_refs);
  for (const ref of exclusion.source_item_refs)
    if (excludedSources.has(ref))
      semanticFactClosureInvalid(
        "source_scope_exclusion_owner_not_independent",
        `${material.key}:${ref}`,
      );
  const owners = exclusion.source_item_refs.filter((ref) => {
    if (sourceDomains.get(ref) !== material.authority_domain) return false;
    const item = sourceByKey.get(ref);
    if (!item || !["decision", "non_goal"].includes(item.kind)) return false;
    const sourceInput = manifest.inputs.find(
      (input) => input.kind === "source_item" && input.source_ref === ref,
    );
    return affectedFactRefs.every((factRef) =>
      sourceInput?.fact_refs.includes(factRef),
    );
  });
  if (
    !exclusion.source_item_refs.length ||
    owners.length !== exclusion.source_item_refs.length
  )
    semanticFactClosureInvalid(
      "source_scope_exclusion_same_domain_owner_required",
      `${material.key}:${material.authority_domain}`,
    );
}

function materialInputFactRefs(
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2,
  manifest: SemanticFactManifestV1,
): string[] {
  const inputKey =
    "input_key" in material
      ? material.input_key
      : material.fragment_ref.split("#fragment:", 1)[0];
  const input = manifest.inputs.find(
    (candidate) =>
      candidate.key === inputKey ||
      (candidate.kind === "source_item" && candidate.source_ref === inputKey),
  );
  return input?.fact_refs ?? [];
}

function semanticCells(
  refs: string[],
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2,
  facts: ReadonlyMap<string, SourceConservationFactProjectionV2>,
  factClasses: Record<string, SemanticFactClassV2>,
  factDomains: Record<string, SourceAuthorityDomain>,
): Set<string> {
  const result = new Set<string>();
  for (const factRef of refs) {
    const fact = facts.get(factRef);
    if (!fact)
      semanticFactClosureInvalid(
        "source_supersession_fact_unknown",
        `${material.key}:${factRef}`,
      );
    if (
      factClasses[factRef] !== "delivery_semantic" ||
      factDomains[factRef] !== material.authority_domain ||
      !fact.semantic_cell
    )
      semanticFactClosureInvalid(
        "source_supersession_delivery_cell_required",
        `${material.key}:${factRef}`,
      );
    result.add(semanticCellIdentity(fact.semantic_cell));
  }
  return result;
}

function semanticCellIdentity(
  cell: NonNullable<SourceConservationFactProjectionV2["semantic_cell"]>,
): string {
  return [
    cell.outcome_ref,
    cell.unit_ref,
    cell.family_ref,
    cell.condition_ref,
    cell.property_ref,
    cell.value_kind,
  ].join("\0");
}

function sameSet(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
): boolean {
  return (
    left.size === right.size && [...left].every((value) => right.has(value))
  );
}

function projectionBasisSourceItems(
  ref: string,
  manifest: SemanticFactManifestV1,
  sourceByKey: ReadonlyMap<string, CompiledSourceItemV2>,
): string[] {
  if (sourceByKey.has(ref)) return [ref];
  const input = manifest.inputs.find((item) => item.key === ref);
  if (!input) return [];
  if (input.kind === "source_item") return [input.source_ref];
  if (input.kind === "source_fragment" || input.kind === "semantic_anchor") {
    const inputKey = input.source_ref.split("#fragment:", 1)[0];
    if (sourceByKey.has(inputKey)) return [inputKey];
    const materialInput = manifest.inputs.find((item) => item.key === inputKey);
    if (!materialInput) return [];
    return materialInput.basis_refs.filter((basisRef) =>
      sourceByKey.has(basisRef),
    );
  }
  return input.basis_refs.filter((basisRef) => sourceByKey.has(basisRef));
}

function hasFactBearingSuccessorFragment(
  sourceRef: string,
  factRef: string,
  factBasisRefs: string[],
  manifest: SemanticFactManifestV1,
): boolean {
  return manifest.inputs.some(
    (input) =>
      input.kind === "source_fragment" &&
      input.source_ref.startsWith(`${sourceRef}#fragment:`) &&
      input.disposition === "fact_bearing" &&
      input.fact_refs.includes(factRef) &&
      factBasisRefs.includes(input.key),
  );
}

function exactAffectedFactRefs(
  refs: string[],
  manifest: SemanticFactManifestV1,
): string[] {
  const facts = new Set(manifest.facts.map((fact) => fact.key));
  const result = new Set<string>();
  for (const ref of refs) {
    if (facts.has(ref)) result.add(ref);
    const cell = manifest.fact_cells.find((candidate) => candidate.key === ref);
    if (cell?.fact_ref) result.add(cell.fact_ref);
    const proof = manifest.proof_obligations.find(
      (candidate) => candidate.key === ref,
    );
    if (proof) result.add(proof.fact_ref);
  }
  return [...result].sort();
}
