import { pendingExternalRow } from "./long-task-acceptance-reachability-helpers.js";
import type {
  AcceptanceObligationReachabilityV1,
  AcceptanceReachabilityInputV1,
  ExpectedExternalObligation,
} from "./long-task-acceptance-reachability-types.js";

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
    if (binding.authority === "machine") {
      addMachineSemanticRow(
        input,
        rows,
        proof,
        outcome.key,
        fact.key,
        fullClaim,
        factBinding.applicability_ref,
        binding.check_ref,
        binding.assertion_ref,
      );
      continue;
    }
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
      confirmation_ref: binding.confirmation_ref,
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
        binding.confirmation_ref,
      ),
    );
  }
}

function addMachineSemanticRow(
  input: AcceptanceReachabilityInputV1,
  rows: AcceptanceObligationReachabilityV1[],
  proof: AcceptanceReachabilityInputV1["manifest"]["proof_obligations"][number],
  outcomeKey: string,
  factRef: string,
  fullClaim: string,
  applicabilityRef: string,
  checkRef: string,
  assertionRef: string,
): void {
  const admitted = input.compiled_checks.some(
    (check) =>
      check.outcome_key === outcomeKey &&
      check.key === checkRef &&
      check.completion_role === "semantic" &&
      check.observation_authorities.some(
        (authority) =>
          authority.obligation_ref === proof.key &&
          authority.assertion_ref === assertionRef &&
          authority.authority !== "external_confirmation",
      ),
  );
  rows.push({
    obligation_ref: proof.key,
    source_obligation_ref: proof.key,
    outcome_key: outcomeKey,
    claim_ref: fullClaim,
    applicability_ref: applicabilityRef,
    fact_ref: factRef,
    proof_ref: proof.key,
    method: proof.method,
    proof_surface: proof.proof_surface,
    required_evidence_capabilities: [...proof.evidence_capabilities].sort(),
    authority: "machine",
    confirmation_ref: null,
    status: admitted ? "machine_admitted" : "unreachable",
    reason: admitted ? null : "machine_observer_not_admitted",
    session_group: null,
  });
}
