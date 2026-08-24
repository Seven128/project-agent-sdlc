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
  designFactRefsBySource: ReadonlyMap<string, string[]>,
): void {
  const supersedingSources = projection.basis_refs
    .map((ref) => projectionBasisSourceItem(ref, manifest, sourceByKey))
    .filter((ref): ref is string => Boolean(ref))
    .filter((ref) => ref !== material.source_item_ref);
  if (!supersedingSources.length)
    semanticFactClosureInvalid(
      "source_supersession_basis_required",
      material.key,
    );
  for (const ref of supersedingSources)
    validateSupersedingSource({
      ref,
      material,
      facts,
      factClasses,
      factDomains,
      sourceDomains,
      manifest,
      designFactRefsBySource,
    });
}

function validateSupersedingSource(input: {
  ref: string;
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2;
  facts: ReadonlyMap<string, SourceConservationFactProjectionV2>;
  factClasses: Record<string, SemanticFactClassV2>;
  factDomains: Record<string, SourceAuthorityDomain>;
  sourceDomains: ReadonlyMap<string, SourceAuthorityDomain>;
  manifest: SemanticFactManifestV1;
  designFactRefsBySource: ReadonlyMap<string, string[]>;
}): void {
  if (input.sourceDomains.get(input.ref) !== input.material.authority_domain)
    semanticFactClosureInvalid(
      "source_supersession_domain_mismatch",
      `${input.material.key}:${input.ref}:${input.material.authority_domain}:${input.sourceDomains.get(input.ref)}`,
    );
  if (
    !supersedingSourceHasDeliveryProjection(
      input.ref,
      input.material.authority_domain,
      input.facts,
      input.factClasses,
      input.factDomains,
      input.manifest,
      input.designFactRefsBySource,
    )
  )
    semanticFactClosureInvalid(
      "source_supersession_basis_not_fact_bearing",
      `${input.material.key}:${input.ref}`,
    );
}

export function validateSameDomainScopeExclusion(
  projection: ResolvedSourceProjectionV2,
  material: MaterialSourceFragmentV2 | SemanticSourceAnchorV2,
  sourceDomains: ReadonlyMap<string, SourceAuthorityDomain>,
  sourceByKey: ReadonlyMap<string, CompiledSourceItemV2>,
  manifest: SemanticFactManifestV1,
): void {
  const exclusion = manifest.scope.exclusions.find((row) =>
    row.affected_refs.includes(projection.input_key),
  );
  if (!exclusion)
    semanticFactClosureInvalid(
      "source_projection_scope_exclusion_missing",
      `${material.key}:${projection.input_key}`,
    );
  const basisSources = [...exclusion.basis_refs, ...exclusion.source_item_refs]
    .map((ref) => projectionBasisSourceItem(ref, manifest, sourceByKey))
    .filter((ref): ref is string => Boolean(ref))
    .filter((ref) => ref !== material.source_item_ref);
  if (
    !basisSources.some(
      (ref) => sourceDomains.get(ref) === material.authority_domain,
    )
  )
    semanticFactClosureInvalid(
      "source_scope_exclusion_same_domain_basis_required",
      `${material.key}:${material.authority_domain}`,
    );
}

function supersedingSourceHasDeliveryProjection(
  sourceRef: string,
  domain: SourceAuthorityDomain,
  facts: ReadonlyMap<string, SourceConservationFactProjectionV2>,
  factClasses: Record<string, SemanticFactClassV2>,
  factDomains: Record<string, SourceAuthorityDomain>,
  manifest: SemanticFactManifestV1,
  designFactRefsBySource: ReadonlyMap<string, string[]>,
): boolean {
  if (
    (designFactRefsBySource.get(sourceRef) ?? []).some(
      (factRef) =>
        facts.has(factRef) &&
        factClasses[factRef] === "delivery_semantic" &&
        factDomains[factRef] === domain &&
        facts.get(factRef)!.source_item_refs.includes(sourceRef),
    )
  )
    return true;
  return manifest.inputs
    .filter((input) => inputProjectsSource(input, sourceRef))
    .some(
      (input) =>
        input.disposition !== "supporting_only" &&
        input.disposition !== "supporting_basis" &&
        input.disposition !== "excluded_by_scope" &&
        input.disposition !== "scope_excluded" &&
        input.disposition !== "superseded" &&
        input.disposition !== "decision_required" &&
        input.fact_refs.some(
          (factRef) =>
            facts.has(factRef) &&
            factClasses[factRef] === "delivery_semantic" &&
            factDomains[factRef] === domain &&
            facts.get(factRef)!.source_item_refs.includes(sourceRef),
        ),
    );
}

function inputProjectsSource(
  input: SemanticFactManifestV1["inputs"][number],
  sourceRef: string,
): boolean {
  return (
    (input.kind === "source_item" && input.source_ref === sourceRef) ||
    ((input.kind === "source_fragment" || input.kind === "semantic_anchor") &&
      input.source_ref.startsWith(`${sourceRef}#fragment:`))
  );
}

function projectionBasisSourceItem(
  ref: string,
  manifest: SemanticFactManifestV1,
  sourceByKey: ReadonlyMap<string, CompiledSourceItemV2>,
): string | null {
  if (sourceByKey.has(ref)) return ref;
  const input = manifest.inputs.find((item) => item.key === ref);
  if (!input) return null;
  if (input.kind === "source_item") return input.source_ref;
  if (input.kind === "source_fragment" || input.kind === "semantic_anchor") {
    const separator = input.source_ref.indexOf("#fragment:");
    return separator > 0 ? input.source_ref.slice(0, separator) : null;
  }
  return null;
}
