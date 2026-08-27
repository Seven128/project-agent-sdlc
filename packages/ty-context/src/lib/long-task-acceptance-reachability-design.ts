import {
  designFactObligationDescriptors,
  externalDesignObligationMatches,
} from "./long-task-design-obligation.js";
import { pendingExternalRow } from "./long-task-acceptance-reachability-helpers.js";
import type {
  AcceptanceObligationReachabilityV1,
  AcceptanceReachabilityInputV1,
  ExpectedExternalObligation,
  MachineAuthorityRouteV1,
} from "./long-task-acceptance-reachability-types.js";
import { resolveObligationAuthority } from "./long-task-obligation-authority-resolution.js";

export function compileDesignFactReachability(
  input: AcceptanceReachabilityInputV1,
  rows: AcceptanceObligationReachabilityV1[],
  external: ExpectedExternalObligation[],
): void {
  const seen = new Set<string>();
  for (const descriptor of designFactObligationDescriptors(input.contract)) {
    if (seen.has(descriptor.source_obligation_ref))
      throw new Error(
        `design_obligation_identity_duplicate:${descriptor.source_obligation_ref}`,
      );
    seen.add(descriptor.source_obligation_ref);
    const machineCandidates = admittedDesignMachineRoutes(input, descriptor);
    const externalCandidates =
      input.contract.global.acceptance.external_confirmations
        .filter(
          (confirmation) =>
            confirmation.blocks_target &&
            confirmation.obligations?.some((obligation) =>
              externalDesignObligationMatches(obligation, descriptor),
            ),
        )
        .map((confirmation) => ({
          confirmation_ref: confirmation.key,
          proof_surface: descriptor.proof_surface,
          method: descriptor.method,
          required_evidence_capabilities: descriptor.evidence_capabilities,
        }));
    const resolution = resolveObligationAuthority({
      source_obligation_ref: descriptor.source_obligation_ref,
      proof_surface_selection: "required",
      machine_candidates: machineCandidates,
      external_candidates: externalCandidates,
    });
    if (resolution.status === "machine_admitted") {
      rows.push({
        obligation_ref: descriptor.source_obligation_ref,
        source_obligation_ref: descriptor.source_obligation_ref,
        outcome_key: descriptor.outcome_key,
        claim_ref: descriptor.claim_ref,
        applicability_ref: descriptor.applicability_ref,
        fact_ref: descriptor.fact_ref,
        proof_ref: descriptor.source_obligation_ref,
        method: descriptor.method,
        proof_surface: descriptor.proof_surface,
        required_evidence_capabilities: descriptor.evidence_capabilities,
        authority: "machine",
        confirmation_ref: null,
        status: "machine_admitted",
        reason: null,
        session_group: null,
      });
      continue;
    }
    if (resolution.status === "external_candidate") {
      const expected: ExpectedExternalObligation = {
        source_obligation_ref: descriptor.source_obligation_ref,
        outcome_key: descriptor.outcome_key,
        claim_ref: descriptor.claim_ref,
        local_claim_ref: descriptor.local_claim_ref,
        applicability_ref: descriptor.applicability_ref,
        fact_ref: descriptor.fact_ref,
        proof_ref: descriptor.source_obligation_ref,
        method: descriptor.method,
        proof_surface: descriptor.proof_surface,
        evidence_capabilities: descriptor.evidence_capabilities,
        expected_authority_ref: descriptor.expected_authority_ref,
        confirmation_ref: resolution.external.confirmation_ref,
        required_polarity: "positive",
        completion_role: "blocking",
        acceptance_effect: "required",
        semantic_identity: null,
        machine_obligation_ref: null,
      };
      external.push(expected);
      rows.push(
        pendingExternalRow(
          descriptor.source_obligation_ref,
          descriptor.outcome_key,
          descriptor.claim_ref,
          descriptor.applicability_ref,
          descriptor.fact_ref,
          descriptor.source_obligation_ref,
          descriptor.method,
          descriptor.proof_surface,
          descriptor.evidence_capabilities,
          expected.confirmation_ref,
        ),
      );
      continue;
    }
    rows.push({
      ...pendingExternalRow(
        descriptor.source_obligation_ref,
        descriptor.outcome_key,
        descriptor.claim_ref,
        descriptor.applicability_ref,
        descriptor.fact_ref,
        descriptor.source_obligation_ref,
        descriptor.method,
        descriptor.proof_surface,
        descriptor.evidence_capabilities,
        null,
      ),
      authority: "none",
      reason:
        resolution.reason === "no_admitted_proof_route"
          ? "machine_observer_not_admitted"
          : resolution.reason,
    });
  }
}

function admittedDesignMachineRoutes(
  input: AcceptanceReachabilityInputV1,
  descriptor: ReturnType<typeof designFactObligationDescriptors>[number],
): MachineAuthorityRouteV1[] {
  return input.compiled_checks.flatMap((check) =>
    check.outcome_key === descriptor.outcome_key &&
    check.key === descriptor.check_key &&
    check.completion_role === "semantic" &&
    check.observation_authorities.some(
      (authority) =>
        authority.obligation_ref === descriptor.source_obligation_ref &&
        authority.assertion_ref === descriptor.assertion_ref &&
        authority.authority !== "external_confirmation",
    )
      ? [
          {
            check_key: check.key,
            assertion_key: descriptor.assertion_ref,
            proof_surface: descriptor.proof_surface,
            method: descriptor.method,
            required_evidence_capabilities: descriptor.evidence_capabilities,
          },
        ]
      : [],
  );
}
