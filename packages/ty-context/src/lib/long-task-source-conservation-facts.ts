import { semanticFactClosureInvalid } from "./long-task-semantic-fact-closure-primitives.js";
import type {
  SemanticFactClassV2,
  SourceAuthorityDomain,
} from "./long-task-source-authority-types.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import type { SourceConservationFactProjectionV2 } from "./long-task-source-conservation-types.js";

export function addSourceConservationFact(
  facts: Map<string, SourceConservationFactProjectionV2>,
  fact: SourceConservationFactProjectionV2,
): void {
  if (facts.has(fact.key))
    semanticFactClosureInvalid("source_projection_fact_duplicate", fact.key);
  facts.set(fact.key, fact);
}

export function semanticFactClass(
  fact: SemanticFactManifestV1["facts"][number],
): SemanticFactClassV2 {
  const structuralLocator = [
    "source_item",
    "whole_resource",
    "code_symbol",
  ].includes(fact.expected.locator.kind);
  return fact.observation_scope === "implementation_structure" &&
    (fact.value_kind === "digest" ||
      fact.expected.representation === "digest_only" ||
      structuralLocator)
    ? "source_integrity"
    : "delivery_semantic";
}

export function semanticFactAuthorityDomain(
  fact: SemanticFactManifestV1["facts"][number],
  sourceDomains: ReadonlyMap<string, SourceAuthorityDomain>,
): SourceAuthorityDomain {
  const available = new Set(
    fact.source_item_refs
      .map((ref) => sourceDomains.get(ref))
      .filter((value): value is SourceAuthorityDomain => Boolean(value)),
  );
  if (available.size === 1) return [...available][0];
  const preferred: SourceAuthorityDomain =
    fact.observation_scope === "external_boundary"
      ? "external"
      : fact.observation_scope === "product_boundary"
        ? "product"
        : "technical";
  if (available.has(preferred)) return preferred;
  for (const candidate of [
    "acceptance",
    "product",
    "technical",
    "external",
    "design",
  ] as const)
    if (available.has(candidate)) return candidate;
  semanticFactClosureInvalid("fact_authority_domain_missing", fact.key);
}

export function semanticExpectedContains(
  fact: SourceConservationFactProjectionV2,
  value: string,
): boolean {
  return fact.expected_search_text.includes(value);
}

export function semanticFactExpectedSearchText(
  fact: SemanticFactManifestV1["facts"][number],
): string {
  return [
    fact.expected.representation === "inline"
      ? JSON.stringify(fact.expected.value)
      : "",
    fact.expected.locator.value,
    fact.property_ref,
    fact.unit_ref,
    fact.owner_ref,
  ].join("\n");
}
