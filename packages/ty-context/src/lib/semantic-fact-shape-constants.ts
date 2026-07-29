export const SEMANTIC_FACT_DISPOSITIONS = [
  "applicable",
  "not_applicable",
  "decision_required",
  "unavailable",
] as const;

export const SEMANTIC_FACT_VALUE_KINDS = [
  "boolean",
  "number",
  "string",
  "enum",
  "set",
  "ordered_list",
  "object",
  "schema",
  "relation",
  "decision_table",
  "formula",
  "range",
  "duration",
  "timestamp",
  "rate",
  "ratio",
  "digest",
  "trace",
  "custom",
] as const;

export const SEMANTIC_FACT_LOCATOR_KINDS = [
  "source_item",
  "manifest_pointer",
  "json_pointer",
  "yaml_pointer",
  "whole_resource",
  "schema_pointer",
  "api_operation",
  "code_symbol",
  "custom",
] as const;
