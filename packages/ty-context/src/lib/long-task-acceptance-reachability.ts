import { compileClaimReachability } from "./long-task-acceptance-reachability-claims.js";
import {
  addUnboundBlockingConfirmationRows,
  validateExternalDeclarations,
} from "./long-task-acceptance-reachability-external.js";
import { compileSemanticFactReachability } from "./long-task-acceptance-reachability-semantic.js";
import type {
  AcceptanceObligationReachabilityV1,
  AcceptanceReachabilityInputV1,
  AcceptanceReachabilityV1,
  ExpectedExternalObligation,
} from "./long-task-acceptance-reachability-types.js";

export type {
  AcceptanceObligationReachabilityV1,
  AcceptanceReachabilityStatusV1,
  AcceptanceReachabilityV1,
} from "./long-task-acceptance-reachability-types.js";

export function compileAcceptanceReachability(
  input: AcceptanceReachabilityInputV1,
): AcceptanceReachabilityV1 {
  const rows: AcceptanceObligationReachabilityV1[] = [];
  const expectedExternal: ExpectedExternalObligation[] = [];
  compileClaimReachability(input, rows, expectedExternal);
  compileSemanticFactReachability(input, rows, expectedExternal);
  addUnboundBlockingConfirmationRows(input.contract, rows, expectedExternal);
  const externalMatches = validateExternalDeclarations(
    input.contract,
    input.manifest,
    expectedExternal,
  );
  applyExternalReachability(input, rows, expectedExternal, externalMatches);
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
): void {
  for (const expected of expectedExternal) {
    const row = rows.find(
      (candidate) =>
        candidate.source_obligation_ref === expected.source_obligation_ref &&
        candidate.confirmation_ref === expected.confirmation_ref,
    );
    if (!row) continue;
    if (
      input.contract.task.target_profile.completion_authority === "machine_only"
    ) {
      row.status = "unreachable";
      row.reason = "completion_authority_machine_only";
      continue;
    }
    const match = matches.get(expected.source_obligation_ref);
    if (!match) {
      row.status = "unreachable";
      row.reason = "external_confirmation_decomposition_invalid";
      continue;
    }
    row.obligation_ref = match.obligation_key;
    row.status = "external_fulfillable";
    row.reason = null;
    row.session_group = match.session_group;
  }
}
