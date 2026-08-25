import { pendingExternalRow } from "./long-task-acceptance-reachability-helpers.js";
import type {
  AcceptanceObligationReachabilityV1,
  AcceptanceReachabilityInputV1,
  ExpectedExternalObligation,
  MachineAuthorityRouteV1,
} from "./long-task-acceptance-reachability-types.js";
import { resolveObligationAuthority } from "./long-task-obligation-authority-resolution.js";

export function compileSemanticFactReachability(
  input: AcceptanceReachabilityInputV1,
  rows: AcceptanceObligationReachabilityV1[],
  external: ExpectedExternalObligation[],
): void {
  const facts = new Map(input.manifest.facts.map((fact) => [fact.key, fact]));
  for (const proof of input.manifest.proof_obligations) {
    const fact = facts.get(proof.fact_ref)!;
    const outcome = input.contract.outcomes.find(
      (item) => item.key === fact.outcome_ref,
    )!;
    const factBinding = outcome.semantic_fact_bindings.facts.find(
      (item) => item.fact_ref === fact.key,
    )!;
    const binding = outcome.semantic_fact_bindings.proofs.find(
      (item) => item.proof_ref === proof.key,
    )!;
    const fullClaim = `${outcome.key}.${factBinding.claim_ref}`;
    const machineCandidates =
      binding.authority === "machine"
        ? admittedSemanticMachineRoutes(
            input,
            proof.key,
            outcome.key,
            binding.check_ref,
            binding.assertion_ref,
          )
        : [];
    const exactExternal =
      input.contract.global.acceptance.external_confirmations
        .filter(
          (confirmation) =>
            confirmation.blocks_target &&
            confirmation.obligations?.some(
              (obligation) =>
                obligation.claim_ref === fullClaim &&
                obligation.applicability_ref ===
                  factBinding.applicability_ref &&
                obligation.fact_ref === fact.key &&
                obligation.proof_ref === proof.key &&
                obligation.method === proof.method &&
                obligation.proof_surface === proof.proof_surface,
            ),
        )
        .map((confirmation) => ({
          confirmation_ref: confirmation.key,
          proof_surface: proof.proof_surface,
        }));
    const externalCandidates =
      binding.authority === "external_confirmation"
        ? uniqueExternalCandidates([
            ...exactExternal,
            {
              confirmation_ref: binding.confirmation_ref,
              proof_surface: proof.proof_surface,
            },
          ])
        : machineCandidates.length
          ? exactExternal
          : [];
    const resolution = resolveObligationAuthority({
      source_obligation_ref: proof.key,
      machine_candidates: machineCandidates,
      external_candidates: externalCandidates,
    });
    if (resolution.status === "machine_admitted") {
      rows.push({
        obligation_ref: proof.key,
        source_obligation_ref: proof.key,
        outcome_key: outcome.key,
        claim_ref: fullClaim,
        applicability_ref: factBinding.applicability_ref,
        fact_ref: fact.key,
        proof_ref: proof.key,
        method: proof.method,
        proof_surface: proof.proof_surface,
        required_evidence_capabilities: [...proof.evidence_capabilities].sort(),
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
        source_obligation_ref: proof.key,
        outcome_key: outcome.key,
        claim_ref: fullClaim,
        local_claim_ref: factBinding.claim_ref,
        applicability_ref: factBinding.applicability_ref,
        fact_ref: fact.key,
        proof_ref: proof.key,
        method: proof.method,
        proof_surface: proof.proof_surface,
        evidence_capabilities: [...proof.evidence_capabilities].sort(),
        expected_authority_ref: `semantic-proof:${proof.key}`,
        confirmation_ref: resolution.external.confirmation_ref,
      };
      external.push(expected);
      rows.push(
        pendingExternalRow(
          proof.key,
          outcome.key,
          fullClaim,
          factBinding.applicability_ref,
          fact.key,
          proof.key,
          proof.method,
          proof.proof_surface,
          expected.evidence_capabilities,
          expected.confirmation_ref,
        ),
      );
      continue;
    }
    rows.push({
      ...pendingExternalRow(
        proof.key,
        outcome.key,
        fullClaim,
        factBinding.applicability_ref,
        fact.key,
        proof.key,
        proof.method,
        proof.proof_surface,
        [...proof.evidence_capabilities].sort(),
        null,
      ),
      authority: "none",
      reason:
        resolution.reason === "no_admitted_proof_route" &&
        binding.authority === "machine"
          ? "machine_observer_not_admitted"
          : resolution.reason,
    });
  }
}

function admittedSemanticMachineRoutes(
  input: AcceptanceReachabilityInputV1,
  proofRef: string,
  outcomeKey: string,
  checkRef: string,
  assertionRef: string,
): MachineAuthorityRouteV1[] {
  return input.compiled_checks.flatMap((check) =>
    check.outcome_key === outcomeKey &&
    check.key === checkRef &&
    check.completion_role === "semantic" &&
    check.observation_authorities.some(
      (authority) =>
        authority.obligation_ref === proofRef &&
        authority.assertion_ref === assertionRef &&
        authority.authority !== "external_confirmation",
    )
      ? [
          {
            check_key: checkRef,
            assertion_key: assertionRef,
            proof_surface: check.proof_surface,
            required_evidence_capabilities:
              check.required_evidence_capabilities[assertionRef] ?? [],
          },
        ]
      : [],
  );
}

function uniqueExternalCandidates<T extends { confirmation_ref: string }>(
  candidates: T[],
): T[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.confirmation_ref)) return false;
    seen.add(candidate.confirmation_ref);
    return true;
  });
}
