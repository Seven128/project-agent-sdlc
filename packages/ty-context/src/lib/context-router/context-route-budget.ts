export const CONTEXT_ROUTE_SCHEMA_VERSION = 1;

export const CONTEXT_ROUTE_BUDGETS = Object.freeze({
  task_utf8_bytes: 8 * 1024,
  automatic_terms: 32,
  explicit_terms: 32,
  automatic_term_min_code_points: 2,
  explicit_term_min_code_points: 1,
  term_max_code_points: 128,
  candidate_files: 4096,
  per_file_scan_bytes: 1024 * 1024,
  aggregate_scan_bytes: 32 * 1024 * 1024,
  output_matches: 200,
  per_file_output_matches: 20,
} as const);

export type ContextRouteBudgetName = keyof typeof CONTEXT_ROUTE_BUDGETS;
