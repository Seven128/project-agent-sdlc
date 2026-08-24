import type {
  MaterialSourceFragmentV2,
  SemanticFactClassV2,
  SemanticSourceAnchorV2,
  SourceAuthorityDomain,
} from "./long-task-source-authority-types.js";

export type SourceProjectionDispositionV2 =
  | "fact_bearing"
  | "supporting_basis"
  | "superseded"
  | "decision_required"
  | "scope_excluded";

export interface ResolvedSourceProjectionV2 {
  input_key: string;
  disposition: SourceProjectionDispositionV2;
  fact_refs: string[];
  basis_refs: string[];
  explicit: boolean;
  authority_derived: boolean;
}

export interface SourceConservationFactProjectionV2 {
  key: string;
  source_item_refs: string[];
  semantic_class: SemanticFactClassV2;
  authority_domain: SourceAuthorityDomain;
  expected_search_text: string;
}

export interface SourceSemanticConservationV2 {
  fragments: MaterialSourceFragmentV2[];
  anchors: SemanticSourceAnchorV2[];
  fact_classes: Record<string, SemanticFactClassV2>;
  fact_domains: Record<string, SourceAuthorityDomain>;
}
