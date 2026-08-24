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
  if (
    projection.disposition === "fact_bearing" &&
    anchor.kind !== "modal_term" &&
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
      context.designFactRefsBySource,
    );
  if (projection.disposition === "scope_excluded")
    validateSameDomainScopeExclusion(
      projection,
      material,
      context.sourceDomains,
      context.sourceByKey,
      context.manifest,
    );
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
    if (!fact.source_item_refs.includes(material.source_item_ref))
      semanticFactClosureInvalid(
        "source_projection_fact_lineage_mismatch",
        `${material.key}:${factRef}`,
      );
    if (context.factDomains[factRef] !== material.authority_domain)
      semanticFactClosureInvalid(
        "source_projection_fact_domain_mismatch",
        `${material.key}:${factRef}:${material.authority_domain}:${context.factDomains[factRef]}`,
      );
  }
}

function validateSupportingProjection(
  projection: ResolvedSourceProjectionV2,
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2,
  context: SourceProjectionValidationContextV2,
): void {
  if (!projection.fact_refs.length)
    semanticFactClosureInvalid(
      "source_supporting_basis_fact_required",
      material.key,
    );
  for (const factRef of projection.fact_refs) {
    if (!context.facts.has(factRef))
      semanticFactClosureInvalid(
        "source_supporting_basis_fact_unknown",
        `${material.key}:${factRef}`,
      );
    if (context.factClasses[factRef] !== "delivery_semantic")
      semanticFactClosureInvalid(
        "source_supporting_basis_delivery_fact_required",
        `${material.key}:${factRef}`,
      );
  }
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
