import type { ClaimCoverageSummaryV2 } from "./long-task-delivery-types.js";
import type { AcceptanceReachabilityV1 } from "./long-task-acceptance-reachability.js";

export interface AuthoringPreflightDiagnosticV1 {
  level: "error" | "decision_required" | "warning" | "info";
  code: string;
  message: string;
  outcome_key?: string;
  check_key?: string;
  refs?: string[];
  repair_hint?: string;
  occurrences?: number;
  diagnostic_id?: string;
  repair_group?: string;
  repair_priority?: "primary" | "dependent";
  blocked_by?: string[];
}

export interface SourceCoverageV1 {
  total: number;
  resolved: number;
  mapped_to_product_claims: number;
  mapped_to_acceptance: number;
  mapped_to_outcome_results: number;
  mapped_to_global_constraints: number;
  mapped_to_risk_facts: number;
  mapped_to_external_confirmations: number;
  decision_required: number;
  unresolved: string[];
}

export interface AuthoringRevisionPreviewV1 {
  active: boolean;
  authority_revision: number | null;
  contract_changed: boolean;
  source_or_context_changed: boolean;
  declared_authority_sections_changed: string[];
}

export interface AuthoringPreflightResultV1 {
  schema_version: "long-task-authoring-preflight-v1";
  status: "ready" | "not_ready";
  would_create_authority_lock: boolean;
  outcomes: string[];
  source_coverage: SourceCoverageV1;
  claim_coverage: ClaimCoverageSummaryV2;
  acceptance_reachability: AcceptanceReachabilityV1;
  revision_preview: AuthoringRevisionPreviewV1;
  diagnostics: AuthoringPreflightDiagnosticV1[];
}

export function emptyClaimCoverage(): ClaimCoverageSummaryV2 {
  return {
    claims_total: 0,
    claims_covered: 0,
    uncovered_claims: [],
    claims_by_global: {},
    claims_by_outcome: {},
  };
}

export function emptyPreflightResult(
  diagnostics: AuthoringPreflightDiagnosticV1[],
): AuthoringPreflightResultV1 {
  return {
    schema_version: "long-task-authoring-preflight-v1",
    status: "not_ready",
    would_create_authority_lock: false,
    outcomes: [],
    source_coverage: {
      total: 0,
      resolved: 0,
      mapped_to_product_claims: 0,
      mapped_to_acceptance: 0,
      mapped_to_outcome_results: 0,
      mapped_to_global_constraints: 0,
      mapped_to_risk_facts: 0,
      mapped_to_external_confirmations: 0,
      decision_required: 0,
      unresolved: [],
    },
    claim_coverage: emptyClaimCoverage(),
    acceptance_reachability: {
      completion_authority: "machine_only",
      total: 0,
      machine_admitted: 0,
      external_fulfillable: 0,
      unreachable: 0,
      obligations: [],
    },
    revision_preview: {
      active: false,
      authority_revision: null,
      contract_changed: false,
      source_or_context_changed: false,
      declared_authority_sections_changed: [],
    },
    diagnostics,
  };
}
