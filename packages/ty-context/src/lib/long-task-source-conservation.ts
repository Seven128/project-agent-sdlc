import {
  deriveMaterialSourceFragments,
  deriveSemanticSourceAnchors,
} from "./long-task-source-fragments.js";
import type {
  CompiledSourceItemV2,
  SemanticSourceAnchorV2,
  SemanticFactClassV2,
  SourceAuthorityDomain,
} from "./long-task-source-authority-types.js";
import type { DesignOwnedSemanticProjectionV1 } from "./long-task-semantic-fact-input-closure.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import type {
  SourceConservationFactProjectionV2,
  SourceSemanticConservationV2,
} from "./long-task-source-conservation-types.js";
import {
  addSourceConservationFact,
  semanticFactAuthorityDomain,
  semanticFactClass,
  semanticFactExpectedSearchText,
} from "./long-task-source-conservation-facts.js";
import {
  exactlyOne,
  normalizeLegacyProjection,
  resolveFragmentProjection,
} from "./long-task-source-projection-resolution.js";
import {
  validateAnchorProjection,
  validateNoDanglingProjectionInputs,
  validateProjection,
} from "./long-task-source-projection-validation.js";

export type { SourceSemanticConservationV2 } from "./long-task-source-conservation-types.js";
export {
  semanticFactAuthorityDomain,
  semanticFactClass,
} from "./long-task-source-conservation-facts.js";

export function validateSourceSemanticConservation(
  sourceItems: CompiledSourceItemV2[],
  manifest: SemanticFactManifestV1,
  designInput: Set<string> | DesignOwnedSemanticProjectionV1,
): SourceSemanticConservationV2 {
  const designProjection =
    designInput instanceof Set
      ? { source_items: designInput, facts: [] }
      : designInput;
  const designOwnedSourceItems = designProjection.source_items;
  const sourceByKey = new Map(sourceItems.map((item) => [item.key, item]));
  const sourceDomains = sourceAuthorityDomains(
    sourceItems,
    designOwnedSourceItems,
  );
  const facts = sourceConservationFacts(
    manifest,
    designProjection,
    sourceDomains,
  );
  const factClasses = Object.fromEntries(
    [...facts.values()].map((fact) => [fact.key, fact.semantic_class]),
  ) as Record<string, SemanticFactClassV2>;
  const factDomains = Object.fromEntries(
    [...facts.values()].map((fact) => [fact.key, fact.authority_domain]),
  ) as Record<string, SourceAuthorityDomain>;
  const designFactRefsBySource = designFactsBySource(designProjection);
  const fragments = sourceItems.flatMap((item) =>
    deriveMaterialSourceFragments(item, designOwnedSourceItems.has(item.key)),
  );
  const anchors: SemanticSourceAnchorV2[] = [];
  const validationContext = {
    facts,
    factClasses,
    factDomains,
    sourceDomains,
    sourceByKey,
    manifest,
    designFactRefsBySource,
  };
  for (const sourceItem of sourceItems) {
    const itemFragments = fragments.filter(
      (fragment) => fragment.source_item_ref === sourceItem.key,
    );
    const sourceInput = exactlyOne(
      manifest.inputs.filter(
        (input) =>
          input.kind === "source_item" && input.source_ref === sourceItem.key,
      ),
      "source_item_projection",
      sourceItem.key,
    );
    for (const fragment of itemFragments) {
      const projection = normalizeLegacyProjection(
        resolveFragmentProjection(
          fragment,
          itemFragments.length,
          sourceInput,
          manifest,
          designFactRefsBySource.get(sourceItem.key) ?? [],
        ),
        fragment,
        sourceItem,
        facts,
        factClasses,
        factDomains,
      );
      validateProjection(projection, fragment, validationContext);
      const fragmentAnchors = deriveSemanticSourceAnchors(fragment);
      anchors.push(...fragmentAnchors);
      for (const anchor of fragmentAnchors)
        validateAnchorProjection(anchor, projection, validationContext);
    }
  }
  validateNoDanglingProjectionInputs(fragments, anchors, manifest);
  return {
    fragments: fragments.sort((left, right) =>
      left.key.localeCompare(right.key),
    ),
    anchors: anchors.sort((left, right) => left.key.localeCompare(right.key)),
    fact_classes: factClasses,
    fact_domains: factDomains,
  };
}

function sourceAuthorityDomains(
  sourceItems: CompiledSourceItemV2[],
  designOwned: Set<string>,
): Map<string, SourceAuthorityDomain> {
  return new Map(
    sourceItems.map((item) => [
      item.key,
      deriveMaterialSourceFragments(item, designOwned.has(item.key))[0]
        ?.authority_domain ?? "product",
    ]),
  );
}

function sourceConservationFacts(
  manifest: SemanticFactManifestV1,
  designProjection: DesignOwnedSemanticProjectionV1,
  sourceDomains: ReadonlyMap<string, SourceAuthorityDomain>,
): Map<string, SourceConservationFactProjectionV2> {
  const facts = new Map<string, SourceConservationFactProjectionV2>();
  for (const fact of manifest.facts)
    addSourceConservationFact(facts, {
      key: fact.key,
      source_item_refs: fact.source_item_refs,
      semantic_class: semanticFactClass(fact),
      authority_domain: semanticFactAuthorityDomain(fact, sourceDomains),
      expected_search_text: semanticFactExpectedSearchText(fact),
    });
  for (const fact of designProjection.facts)
    addSourceConservationFact(facts, {
      ...fact,
      semantic_class: "delivery_semantic",
      authority_domain: "design",
    });
  return facts;
}

function designFactsBySource(
  designProjection: DesignOwnedSemanticProjectionV1,
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const fact of designProjection.facts)
    for (const sourceRef of fact.source_item_refs) {
      const refs = result.get(sourceRef) ?? [];
      refs.push(fact.key);
      result.set(sourceRef, refs);
    }
  return result;
}
