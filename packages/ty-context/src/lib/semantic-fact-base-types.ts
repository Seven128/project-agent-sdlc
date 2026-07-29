export type SemanticFactDisposition =
  "applicable" | "not_applicable" | "decision_required" | "unavailable";

export type SemanticFactAuthorityKind =
  | "direct"
  | "logically_derived"
  | "explicitly_delegated"
  | "evidence_backed_preservation";

export type SemanticFactValueKind =
  | "boolean"
  | "number"
  | "string"
  | "enum"
  | "set"
  | "ordered_list"
  | "object"
  | "schema"
  | "relation"
  | "decision_table"
  | "formula"
  | "range"
  | "duration"
  | "timestamp"
  | "rate"
  | "ratio"
  | "digest"
  | "trace"
  | "custom";

export type SemanticFactLocatorKind =
  | "source_item"
  | "manifest_pointer"
  | "json_pointer"
  | "yaml_pointer"
  | "whole_resource"
  | "schema_pointer"
  | "api_operation"
  | "code_symbol"
  | "custom";

export interface SemanticFactLocatedValueV1 {
  representation: "inline" | "located" | "digest_only";
  locator: {
    material_ref: string;
    kind: SemanticFactLocatorKind;
    value: string;
  };
  sha256: string;
  value?: unknown;
}
