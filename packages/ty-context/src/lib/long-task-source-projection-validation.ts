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
import { semanticExpectedContains } from "./long-task-source-conservation-facts.js";
import {
  semanticModalOccurrences,
  semanticModalPolarity,
} from "./long-task-source-anchors.js";
import { isCanonicalSourceIntegrityStatement } from "./long-task-source-projection-resolution.js";
import {
  validateSameDomainScopeExclusion,
  validateSameDomainSupersession,
} from "./long-task-source-supersession.js";

interface SourceProjectionValidationContextV2 {
  facts: Map<string, SourceConservationFactProjectionV2>;
  factClasses: Record<string, SemanticFactClassV2>;
  factDomains: Record<string, SourceAuthorityDomain>;
  sourceDomains: ReadonlyMap<string, SourceAuthorityDomain>;
  sourceByKey: ReadonlyMap<string, CompiledSourceItemV2>;
  manifest: SemanticFactManifestV1;
  designFactRefsBySource: ReadonlyMap<string, string[]>;
  factClaimPolarities: ReadonlyMap<
    string,
    ReadonlySet<"positive" | "negative">
  >;
}

export function validateAnchorProjection(
  anchor: SemanticSourceAnchorV2,
  fragmentProjection: ResolvedSourceProjectionV2,
  context: SourceProjectionValidationContextV2,
): void {
  const explicit = context.manifest.inputs.filter(
    (input) =>
      input.kind === "semantic_anchor" && input.source_ref === anchor.key,
  );
  if (explicit.length > 1)
    semanticFactClosureInvalid(
      "semantic_anchor_disposition_duplicate",
      anchor.key,
    );
  const projection = explicit.length
    ? explicitAnchorProjection(anchor, explicit[0])
    : fragmentProjection;
  validateProjection(projection, anchor, context);
  validateAnchorDisposition(anchor, projection, context);
}

function explicitAnchorProjection(
  anchor: SemanticSourceAnchorV2,
  input: SemanticFactManifestV1["inputs"][number],
): ResolvedSourceProjectionV2 {
  if (input.sha256 !== anchor.value_sha256)
    semanticFactClosureInvalid(
      "semantic_anchor_digest_mismatch",
      `${input.key}:${anchor.key}`,
    );
  return {
    input_key: input.key,
    disposition: input.disposition as ResolvedSourceProjectionV2["disposition"],
    fact_refs: input.fact_refs,
    basis_refs: input.basis_refs,
    ...(input.supporting_relation
      ? { supporting_relation: input.supporting_relation }
      : {}),
    explicit: true,
    authority_derived: false,
  };
}

function validateAnchorDisposition(
  anchor: SemanticSourceAnchorV2,
  projection: ResolvedSourceProjectionV2,
  context: SourceProjectionValidationContextV2,
): void {
  const canonicalSourceIntegrity = isCanonicalSourceIntegrityStatement(
    context.sourceByKey.get(anchor.source_item_ref),
  );
  if (
    projection.disposition === "supporting_basis" &&
    !canonicalSourceIntegrity
  )
    semanticFactClosureInvalid(
      "semantic_anchor_supporting_only_forbidden",
      anchor.key,
    );
  if (projection.disposition === "fact_bearing" && anchor.kind === "modal_term")
    validateModalProjection(anchor, projection, context);
  else if (
    projection.disposition === "fact_bearing" &&
    !projection.fact_refs.some((factRef) =>
      semanticExpectedContains(context.facts.get(factRef)!, anchor.value),
    )
  )
    semanticFactClosureInvalid(
      "semantic_anchor_expected_projection_missing",
      `${anchor.key}:${anchor.value}`,
    );
}

export function validateProjection(
  projection: ResolvedSourceProjectionV2,
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2,
  context: SourceProjectionValidationContextV2,
): void {
  if (projection.disposition === "decision_required")
    semanticFactClosureInvalid(
      "source_projection_decision_required",
      material.key,
    );
  if (projection.disposition === "fact_bearing")
    validateFactBearingProjection(projection, material, context);
  if (projection.disposition === "supporting_basis")
    validateSupportingProjection(projection, material, context);
  if (projection.disposition === "superseded")
    validateSameDomainSupersession(
      projection,
      material,
      context.facts,
      context.factClasses,
      context.factDomains,
      context.sourceDomains,
      context.sourceByKey,
      context.manifest,
    );
  if (projection.disposition === "scope_excluded")
    validateSameDomainScopeExclusion(
      projection,
      material,
      context.sourceDomains,
      context.sourceByKey,
      context.manifest,
    );
  if ("input_key" in material && projection.disposition === "fact_bearing")
    validateCompoundModalProjection(projection, material, context);
}

function validateFactBearingProjection(
  projection: ResolvedSourceProjectionV2,
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2,
  context: SourceProjectionValidationContextV2,
): void {
  if (!projection.fact_refs.length)
    semanticFactClosureInvalid("source_projection_fact_required", material.key);
  for (const factRef of projection.fact_refs) {
    const fact = context.facts.get(factRef);
    if (!fact)
      semanticFactClosureInvalid(
        "source_projection_fact_unknown",
        `${material.key}:${factRef}`,
      );
    if (context.factClasses[factRef] !== "delivery_semantic")
      semanticFactClosureInvalid(
        "source_integrity_fact_cannot_cover_semantics",
        `${material.key}:${factRef}`,
      );
    if (
      !materialAuthoritySourceRefs(material).some((ref) =>
        fact.source_item_refs.includes(ref),
      )
    )
      semanticFactClosureInvalid(
        "source_projection_fact_lineage_mismatch",
        `${material.key}:${factRef}`,
      );
    if (context.factDomains[factRef] !== material.authority_domain)
      semanticFactClosureInvalid(
        "source_projection_fact_domain_mismatch",
        `${material.key}:${factRef}:${material.authority_domain}:${context.factDomains[factRef]}`,
      );
    validateFactFragmentProvenance(fact, projection, material, context);
  }
}

function validateSupportingProjection(
  projection: ResolvedSourceProjectionV2,
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2,
  context: SourceProjectionValidationContextV2,
): void {
  const canonicalSourceIntegrity = isCanonicalSourceIntegrityStatement(
    context.sourceByKey.get(material.source_item_ref),
  );
  if (!projection.fact_refs.length)
    semanticFactClosureInvalid(
      "source_supporting_basis_fact_required",
      material.key,
    );
  for (const factRef of projection.fact_refs) {
    const fact = context.facts.get(factRef);
    if (!fact)
      semanticFactClosureInvalid(
        "source_supporting_basis_fact_unknown",
        `${material.key}:${factRef}`,
      );
    if (context.factClasses[factRef] !== "delivery_semantic")
      semanticFactClosureInvalid(
        "source_supporting_basis_delivery_fact_required",
        `${material.key}:${factRef}`,
      );
    if (
      !canonicalSourceIntegrity &&
      !materialAuthoritySourceRefs(material).some((ref) =>
        fact.source_item_refs.includes(ref),
      )
    )
      semanticFactClosureInvalid(
        "source_supporting_basis_fact_lineage_mismatch",
        `${material.key}:${factRef}`,
      );
    if (
      !canonicalSourceIntegrity &&
      context.factDomains[factRef] !== material.authority_domain
    )
      semanticFactClosureInvalid(
        "source_supporting_basis_fact_domain_mismatch",
        `${material.key}:${factRef}:${material.authority_domain}:${context.factDomains[factRef]}`,
      );
    validateFactFragmentProvenance(fact, projection, material, context);
  }
  if ("input_key" in material && !canonicalSourceIntegrity)
    validateTypedSupportingRelation(projection, material, context);
}

function validateTypedSupportingRelation(
  projection: ResolvedSourceProjectionV2,
  material: MaterialSourceFragmentV2,
  context: SourceProjectionValidationContextV2,
): void {
  const relation = projection.supporting_relation;
  if (!relation)
    semanticFactClosureInvalid(
      "source_supporting_basis_typed_relation_required",
      material.key,
    );
  const materialInput = context.manifest.inputs.find(
    (input) =>
      input.key === material.input_key ||
      (input.kind === "source_item" && input.source_ref === material.input_key),
  );
  if (materialInput?.disposition !== "supporting_only")
    semanticFactClosureInvalid(
      "source_supporting_basis_material_disposition_required",
      `${material.key}:${materialInput?.key ?? material.input_key}`,
    );
  if (
    projection.fact_refs.length !== 1 ||
    projection.fact_refs[0] !== relation.fact_ref
  )
    semanticFactClosureInvalid(
      "source_supporting_basis_relation_fact_mismatch",
      `${material.key}:${relation.fact_ref}:${projection.fact_refs.join(",")}`,
    );
  const cell = context.manifest.fact_cells.find(
    (candidate) => candidate.key === relation.fact_cell_ref,
  );
  if (!cell)
    semanticFactClosureInvalid(
      "source_supporting_basis_relation_cell_unknown",
      `${material.key}:${relation.fact_cell_ref}`,
    );
  if (cell.disposition !== "specified" || cell.fact_ref !== relation.fact_ref)
    semanticFactClosureInvalid(
      "source_supporting_basis_relation_cell_mismatch",
      `${material.key}:${relation.fact_cell_ref}:${cell.fact_ref ?? "none"}:${relation.fact_ref}`,
    );
}

function validateFactFragmentProvenance(
  fact: SourceConservationFactProjectionV2,
  projection: ResolvedSourceProjectionV2,
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2,
  context: SourceProjectionValidationContextV2,
): void {
  const fragmentInputKey = owningFragmentInputKey(
    projection,
    material,
    context.manifest,
  );
  if (!fact.basis_refs.includes(fragmentInputKey))
    semanticFactClosureInvalid(
      "source_projection_fact_fragment_provenance_missing",
      `${material.key}:${fact.key}:${fragmentInputKey}`,
    );
}

function owningFragmentInputKey(
  projection: ResolvedSourceProjectionV2,
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2,
  manifest: SemanticFactManifestV1,
): string {
  if ("input_key" in material) return projection.input_key;
  const input = manifest.inputs.find(
    (candidate) =>
      candidate.kind === "source_fragment" &&
      candidate.source_ref === material.fragment_ref,
  );
  if (!input)
    semanticFactClosureInvalid(
      "semantic_anchor_fragment_projection_missing",
      material.key,
    );
  return input.key;
}

function materialAuthoritySourceRefs(
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2,
): string[] {
  return material.authority_source_item_refs;
}

function validateModalProjection(
  anchor: SemanticSourceAnchorV2,
  projection: ResolvedSourceProjectionV2,
  context: SourceProjectionValidationContextV2,
): void {
  const polarity = semanticModalPolarity(anchor.value);
  if (!polarity)
    semanticFactClosureInvalid(
      "semantic_modal_classification_missing",
      `${anchor.key}:${anchor.value}`,
    );
  if (
    !projection.fact_refs.some((factRef) =>
      (context.factClaimPolarities.get(factRef) ?? new Set(["positive"])).has(
        polarity,
      ),
    )
  )
    semanticFactClosureInvalid(
      "semantic_modal_claim_polarity_mismatch",
      `${anchor.key}:${polarity}`,
    );
}

function validateCompoundModalProjection(
  projection: ResolvedSourceProjectionV2,
  fragment: MaterialSourceFragmentV2,
  context: SourceProjectionValidationContextV2,
): void {
  const occurrences = semanticModalOccurrences(fragment.normalized_text);
  if (occurrences.length <= 1) return;
  const facts = projection.fact_refs
    .map((factRef) => context.facts.get(factRef))
    .filter((fact): fact is SourceConservationFactProjectionV2 =>
      Boolean(fact),
    );
  const composite = facts.some((fact) =>
    ["object", "schema", "relation", "decision_table", "formula"].includes(
      fact.semantic_cell?.value_kind ?? "",
    ),
  );
  if (!composite && new Set(projection.fact_refs).size < occurrences.length)
    semanticFactClosureInvalid(
      "source_fragment_modal_fact_split_required",
      `${fragment.key}:${occurrences.length}:${projection.fact_refs.length}`,
    );
}

export function validateNoDanglingProjectionInputs(
  fragments: MaterialSourceFragmentV2[],
  anchors: SemanticSourceAnchorV2[],
  manifest: SemanticFactManifestV1,
): void {
  const fragmentRefs = new Set(fragments.map((item) => item.key));
  const anchorRefs = new Set(anchors.map((item) => item.key));
  for (const input of manifest.inputs) {
    if (input.kind === "source_fragment" && !fragmentRefs.has(input.source_ref))
      semanticFactClosureInvalid(
        "source_fragment_projection_dangling",
        `${input.key}:${input.source_ref}`,
      );
    if (input.kind === "semantic_anchor" && !anchorRefs.has(input.source_ref))
      semanticFactClosureInvalid(
        "semantic_anchor_projection_dangling",
        `${input.key}:${input.source_ref}`,
      );
  }
}
