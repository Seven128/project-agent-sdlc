import { compileClaimReachability } from "./long-task-acceptance-reachability-claims.js";
import { compileDesignFactReachability } from "./long-task-acceptance-reachability-design.js";
import {
  addUnboundBlockingConfirmationRows,
  validateExternalDeclarations,
} from "./long-task-acceptance-reachability-external.js";
import { compileSemanticFactReachability } from "./long-task-acceptance-reachability-semantic.js";
import {
  effectiveExternalRouteRef,
  pendingExternalRow,
} from "./long-task-acceptance-reachability-helpers.js";
import { claimApplicabilityProfile } from "./long-task-applicability-identity.js";
import { effectiveExternalObligationSemanticIdentity } from "./long-task-obligation-semantic-identity.js";
import type {
  AcceptanceObligationReachabilityV1,
  AcceptanceReachabilityInputV1,
  AcceptanceReachabilityV1,
  EffectiveExternalObligationV1,
  ExpectedExternalObligation,
} from "./long-task-acceptance-reachability-types.js";

export type {
  AcceptanceObligationReachabilityV1,
  AcceptanceReachabilityStatusV1,
  AcceptanceReachabilityV1,
  EffectiveExternalObligationV1,
} from "./long-task-acceptance-reachability-types.js";

export function compileAcceptanceReachability(
  input: AcceptanceReachabilityInputV1,
): AcceptanceReachabilityV1 {
  const rows: AcceptanceObligationReachabilityV1[] = [];
  const expectedExternal: ExpectedExternalObligation[] = [];
  compileClaimReachability(input, rows, expectedExternal);
  compileSemanticFactReachability(input, rows, expectedExternal);
  compileDesignFactReachability(input, rows, expectedExternal);
  addUnboundBlockingConfirmationRows(input.contract, rows, expectedExternal);
  const externalMatches = validateExternalDeclarations(
    input.contract,
    input.manifest,
    expectedExternal,
    input.compiled_checks,
  );
  const effectiveExternal = applyExternalReachability(
    input,
    rows,
    expectedExternal,
    externalMatches,
  );
  const sorted = rows.sort((left, right) =>
    left.source_obligation_ref.localeCompare(right.source_obligation_ref),
  );
  return {
    completion_authority:
      input.contract.task.target_profile.completion_authority,
    total: sorted.length,
    machine_admitted: sorted.filter((row) => row.status === "machine_admitted")
      .length,
    external_fulfillable: sorted.filter(
      (row) => row.status === "external_fulfillable",
    ).length,
    unreachable: sorted.filter((row) => row.status === "unreachable").length,
    obligations: sorted,
    effective_external_routes: effectiveExternal.sort((left, right) =>
      effectiveExternalRouteRef(
        left.confirmation_ref!,
        left.source_obligation_ref,
      ).localeCompare(
        effectiveExternalRouteRef(
          right.confirmation_ref!,
          right.source_obligation_ref,
        ),
      ),
    ),
  };
}

export function assertAcceptanceReachable(
  reachability: AcceptanceReachabilityV1,
): void {
  const unreachable = reachability.obligations.filter(
    (row) => row.status === "unreachable",
  );
  if (unreachable.length)
    throw new Error(
      `acceptance_obligation_unreachable:${unreachable
        .map((row) => `${row.source_obligation_ref}:${row.reason}`)
        .join(",")}`,
    );
}

function applyExternalReachability(
  input: AcceptanceReachabilityInputV1,
  rows: AcceptanceObligationReachabilityV1[],
  expectedExternal: ExpectedExternalObligation[],
  matches: Map<string, { obligation_key: string; session_group: string }>,
): EffectiveExternalObligationV1[] {
  const effective: EffectiveExternalObligationV1[] = [];
  for (const expected of expectedExternal) {
    const row = rows.find(
      (candidate) =>
        candidate.source_obligation_ref === expected.source_obligation_ref &&
        candidate.confirmation_ref === expected.confirmation_ref,
    );
    if (
      expected.completion_role === "blocking" &&
      input.contract.task.target_profile.completion_authority === "machine_only"
    ) {
      if (row) {
        row.status = "unreachable";
        row.reason = "completion_authority_machine_only";
      }
      continue;
    }
    const match = matches.get(
      effectiveExternalRouteRef(
        expected.confirmation_ref,
        expected.source_obligation_ref,
      ),
    );
    if (!match) {
      if (row) {
        row.status = "unreachable";
        row.reason = "external_confirmation_decomposition_invalid";
      } else {
        rows.push({
          ...pendingExternalRow(
            expected.source_obligation_ref,
            expected.outcome_key,
            expected.claim_ref,
            expected.applicability_ref,
            expected.fact_ref,
            expected.proof_ref,
            expected.method,
            expected.proof_surface,
            expected.evidence_capabilities,
            expected.confirmation_ref,
          ),
          authority: "none",
          reason: "external_confirmation_decomposition_invalid",
        });
      }
      continue;
    }
    const applicability = claimApplicabilityProfile(
      input.contract,
      expected.outcome_key,
      expected.applicability_ref,
    );
    if (!applicability) {
      if (row) {
        row.status = "unreachable";
        row.reason = "external_confirmation_decomposition_invalid";
      }
      continue;
    }
    const semanticIdentity = effectiveExternalObligationSemanticIdentity(
      input,
      expected,
    );
    if (!semanticIdentity) {
      if (row) {
        row.status = "unreachable";
        row.reason = "external_confirmation_decomposition_invalid";
      }
      continue;
    }
    if (row) {
      row.obligation_ref = match.obligation_key;
      row.status = "external_fulfillable";
      row.reason = null;
      row.session_group = match.session_group;
    }
    effective.push({
      obligation_ref: match.obligation_key,
      source_obligation_ref: expected.source_obligation_ref,
      outcome_key: expected.outcome_key,
      claim_ref: expected.claim_ref,
      local_claim_ref: expected.local_claim_ref,
      applicability_ref: expected.applicability_ref,
      target_ref: applicability.target_ref,
      fact_ref: expected.fact_ref,
      proof_ref: expected.proof_ref,
      method: expected.method,
      proof_surface: expected.proof_surface,
      required_evidence_capabilities: [
        ...expected.evidence_capabilities,
      ].sort(),
      expected_authority_ref: expected.expected_authority_ref,
      required_polarity: expected.required_polarity,
      authority: "external_confirmation",
      confirmation_ref: expected.confirmation_ref,
      status: "external_fulfillable",
      reason: null,
      session_group: match.session_group,
      completion_role: expected.completion_role,
      acceptance_effect: expected.acceptance_effect,
      semantic_identity: semanticIdentity,
      machine_obligation_ref: expected.machine_obligation_ref,
    });
  }
  return effective;
}
