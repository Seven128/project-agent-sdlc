import type { RiskFactName } from "./long-task-risk-types.js";

export type SourceItemKind =
  | "outcome_result"
  | "requirement"
  | "control"
  | "acceptance"
  | "technical_obligation"
  | "non_completing"
  | "non_goal"
  | "forbidden_shortcut"
  | "risk_fact"
  | "external_confirmation"
  | "decision";

export type SourceItemAspect = "architecture";

export type SourceAuthorityDomain =
  "product" | "technical" | "design" | "acceptance" | "external";

export type MaterialSourceFragmentKind =
  | "paragraph"
  | "list_item"
  | "table_row"
  | "given_when_then"
  | "fenced_code"
  | "structured_config_line";

export type SemanticAnchorKind =
  | "code_mark"
  | "api_path"
  | "version"
  | "symbol"
  | "frozen_identifier"
  | "file_or_schema_key"
  | "number_or_unit"
  | "exact_quote"
  | "modal_term";

export interface MaterialSourceFragmentV2 {
  key: string;
  source_item_ref: string;
  source_path: string;
  authority_domain: SourceAuthorityDomain;
  kind: MaterialSourceFragmentKind;
  ordinal: number;
  start_line: number;
  end_line: number;
  normalized_text: string;
  text_sha256: string;
}

export interface SemanticSourceAnchorV2 {
  key: string;
  fragment_ref: string;
  source_item_ref: string;
  authority_domain: SourceAuthorityDomain;
  kind: SemanticAnchorKind;
  value: string;
  value_sha256: string;
}

export type SemanticFactClassV2 = "delivery_semantic" | "source_integrity";

export interface CompiledSourceItemV2 {
  key: string;
  kind: SourceItemKind;
  aspect?: SourceItemAspect;
  source_path: string;
  normalized_text: string;
  text_sha256: string;
  risk_semantics?: {
    fact: RiskFactName;
    affected_outcome: string;
  };
}
