import type {
  ClaimCoverageSummaryV2,
  DeliveryContractV2,
  SourceClaimV2,
} from "./long-task-delivery-types.js";
import { resolveAcceptanceAssertion } from "./long-task-acceptance-reference.js";
import { evidenceAdapterForRunner } from "./long-task-evidence-adapter-policy.js";

type AcceptanceDisposition = Extract<
  SourceClaimV2["disposition"],
  { type: "acceptance" }
>;

export function explainAcceptanceLinks(
  contract: DeliveryContractV2,
  coverage: ClaimCoverageSummaryV2,
  disposition: AcceptanceDisposition,
) {
  return disposition.refs.map((reference) => {
    const resolved = resolveAcceptanceAssertion(contract, reference);
    if (!resolved) return missingAcceptanceLink(reference);
    const { assertion, check } = resolved;
    const required: Record<string, string[]> = {};
    const covered: Record<string, string[]> = {};
    for (const claim of assertion.claims) {
      if (resolved.scope === "outcome") {
        const proof =
          coverage.claims_by_outcome[resolved.outcome_key!]?.[claim];
        required[claim] = proof ? proof.required_surfaces : [];
        covered[claim] = proof ? proof.covered_surfaces : [];
      } else {
        const proof = coverage.claims_by_global[claim];
        required[claim] = [];
        covered[claim] = proof
          ? [...new Set(proof.proofs.map((item) => item.proof_surface))].sort()
          : [];
      }
    }
    const counterfactuals = acceptanceCounterfactuals(
      contract,
      resolved.scope,
      resolved.outcome_key,
      resolved.check_key,
      resolved.assertion_key,
    );
    return {
      type: disposition.type,
      reference,
      scope: resolved.scope,
      outcome_key: resolved.outcome_key,
      criterion: assertion.criterion ?? null,
      claims: assertion.claims,
      source_backed_claims: assertion.claims.filter((claim) =>
        sourceBacked(contract, resolved.scope, resolved.outcome_key, claim),
      ),
      required_proof_surfaces: required,
      covered_proof_surfaces: covered,
      proof_surface: check.proof_surface,
      evidence_adapter: evidenceAdapterForRunner(check.runner.type),
      observation: assertion.observation,
      counterfactuals,
    };
  });
}

function missingAcceptanceLink(reference: string) {
  return {
    type: "acceptance",
    reference,
    scope: null,
    outcome_key: null,
    criterion: null,
    claims: [],
    source_backed_claims: [],
    required_proof_surfaces: {},
    covered_proof_surfaces: {},
    proof_surface: null,
    evidence_adapter: null,
    observation: null,
    counterfactuals: [],
  };
}

function sourceBacked(
  contract: DeliveryContractV2,
  scope: "global" | "outcome",
  outcomeKey: string | null,
  claim: string,
) {
  if (scope === "global")
    return contract.source_claims.some(
      (source) =>
        source.disposition.type === "global_constraint" &&
        source.disposition.refs.includes(claim),
    );
  const reference = `${outcomeKey}.${claim}`;
  return contract.source_claims.some((source) => {
    const disposition = source.disposition;
    return (
      (disposition.type === "claim" || disposition.type === "outcome_result") &&
      (disposition.type === "outcome_result"
        ? disposition.ref === reference
        : disposition.refs.includes(reference))
    );
  });
}

function acceptanceCounterfactuals(
  contract: DeliveryContractV2,
  scope: "global" | "outcome",
  outcomeKey: string | null,
  checkKey: string,
  assertionKey: string,
) {
  if (scope === "global")
    return contract.global.acceptance.counterfactual_controls
      .filter(
        (control) =>
          control.check_key === checkKey &&
          control.expected_assertion_failures.includes(assertionKey),
      )
      .map((control) => ({
        key: control.key,
        claims: control.claims,
        binding_ref: control.binding_ref,
        owning_outcome_key: control.binding_ref.split(".")[0],
        expected_assertion_failures: control.expected_assertion_failures,
        preserved_assertions: control.preserved_assertions,
        allowed_fanout_assertions: control.allowed_fanout_assertions,
      }));
  const outcome = contract.outcomes.find((item) => item.key === outcomeKey);
  return (outcome?.acceptance.counterfactual_controls ?? [])
    .filter(
      (control) =>
        control.check_key === checkKey &&
        control.expected_assertion_failures.includes(assertionKey),
    )
    .map((control) => ({
      key: control.key,
      claims: control.claims,
      binding_key: control.binding_key,
      owning_outcome_key: outcomeKey,
      expected_assertion_failures: control.expected_assertion_failures,
      preserved_assertions: control.preserved_assertions,
      allowed_fanout_assertions: control.allowed_fanout_assertions,
    }));
}
