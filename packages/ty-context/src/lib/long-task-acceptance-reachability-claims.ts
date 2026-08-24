import type { ProofSurface } from "./long-task-delivery-types.js";
import { externalClaimCapabilityFloor } from "./long-task-proof-adequacy.js";
import {
  claimObligationRef,
  claimProofMethod,
  machineProofAdmitted,
  pendingExternalRow,
  selectOptionalSurface,
} from "./long-task-acceptance-reachability-helpers.js";
import type {
  AcceptanceObligationReachabilityV1,
  AcceptanceReachabilityInputV1,
  ExpectedExternalObligation,
} from "./long-task-acceptance-reachability-types.js";

export function compileClaimReachability(
  input: AcceptanceReachabilityInputV1,
  rows: AcceptanceObligationReachabilityV1[],
  external: ExpectedExternalObligation[],
): void {
  compileGlobalClaimReachability(input, rows, external);
  compileOutcomeClaimReachability(input, rows, external);
}

function compileGlobalClaimReachability(
  input: AcceptanceReachabilityInputV1,
  rows: AcceptanceObligationReachabilityV1[],
  external: ExpectedExternalObligation[],
): void {
  for (const claim of input.claims.by_global) {
    const summary = input.claims.summary.claims_by_global[claim.local_key];
    for (const applicabilityRef of claim.applicability_refs)
      addClaimObligation(
        input,
        rows,
        external,
        null,
        claim.local_key,
        claim.id,
        applicabilityRef,
        summary?.proofs ?? [],
        [],
        claim.required_polarity,
      );
  }
}

function compileOutcomeClaimReachability(
  input: AcceptanceReachabilityInputV1,
  rows: AcceptanceObligationReachabilityV1[],
  external: ExpectedExternalObligation[],
): void {
  for (const [outcomeKey, claims] of Object.entries(input.claims.by_outcome))
    for (const claim of claims) {
      if (claim.kind === "semantic_fact") continue;
      const summary =
        input.claims.summary.claims_by_outcome[outcomeKey]?.[claim.local_key];
      for (const applicabilityRef of claim.applicability_refs)
        addClaimObligation(
          input,
          rows,
          external,
          outcomeKey,
          claim.local_key,
          claim.id,
          applicabilityRef,
          summary?.proofs ?? [],
          claim.required_proof_surfaces,
          claim.required_polarity,
        );
    }
}

function addClaimObligation(
  input: AcceptanceReachabilityInputV1,
  rows: AcceptanceObligationReachabilityV1[],
  external: ExpectedExternalObligation[],
  outcomeKey: string | null,
  localClaim: string,
  fullClaim: string,
  applicabilityRef: string,
  proofs: Array<{
    check_key: string;
    assertion_key: string | null;
    polarity: string;
    proof_surface: ProofSurface;
    applicability_ref: string | null;
  }>,
  requiredSurfaces: ProofSurface[],
  requiredPolarity: "positive" | "negative",
): void {
  const matching = proofs.filter(
    (proof) =>
      proof.applicability_ref === applicabilityRef &&
      proof.polarity === requiredPolarity,
  );
  const optionalExternal = matching.find((proof) =>
    proof.check_key.startsWith("EXTERNAL."),
  );
  const surfaces = requiredSurfaces.length
    ? requiredSurfaces
    : [optionalExternal?.proof_surface ?? selectOptionalSurface(matching)];
  for (const surface of surfaces)
    addClaimSurfaceObligation(
      input,
      rows,
      external,
      outcomeKey,
      localClaim,
      fullClaim,
      applicabilityRef,
      matching,
      surface,
    );
}

function addClaimSurfaceObligation(
  input: AcceptanceReachabilityInputV1,
  rows: AcceptanceObligationReachabilityV1[],
  external: ExpectedExternalObligation[],
  outcomeKey: string | null,
  localClaim: string,
  fullClaim: string,
  applicabilityRef: string,
  matching: Array<{
    check_key: string;
    assertion_key: string | null;
    proof_surface: ProofSurface;
  }>,
  surface: ProofSurface,
): void {
  const capabilityFloor = [
    ...externalClaimCapabilityFloor(
      input.contract,
      outcomeKey,
      localClaim,
      surface,
      applicabilityRef,
    ),
  ].sort();
  const method = claimProofMethod(capabilityFloor);
  const candidates = matching.filter(
    (proof) => proof.proof_surface === surface,
  );
  const externalProof = candidates.find((proof) =>
    proof.check_key.startsWith("EXTERNAL."),
  );
  const sourceObligationRef = claimObligationRef(
    fullClaim,
    applicabilityRef,
    surface,
  );
  if (externalProof) {
    const confirmationRef = externalProof.check_key.slice("EXTERNAL.".length);
    external.push({
      source_obligation_ref: sourceObligationRef,
      outcome_key: outcomeKey,
      claim_ref: fullClaim,
      local_claim_ref: localClaim,
      applicability_ref: applicabilityRef,
      fact_ref: null,
      proof_ref: null,
      method,
      proof_surface: externalProof.proof_surface,
      evidence_capabilities: capabilityFloor,
      expected_authority_ref: `contract-claim:${fullClaim}`,
      confirmation_ref: confirmationRef,
    });
    rows.push(
      pendingExternalRow(
        sourceObligationRef,
        outcomeKey,
        fullClaim,
        applicabilityRef,
        null,
        null,
        method,
        externalProof.proof_surface,
        capabilityFloor,
        confirmationRef,
      ),
    );
    return;
  }
  const machine = candidates.find(
    (proof) =>
      proof.assertion_key &&
      machineProofAdmitted(
        input.compiled_checks,
        outcomeKey,
        proof.check_key,
        proof.assertion_key,
        localClaim,
      ),
  );
  if (machine) {
    const check = input.compiled_checks.find(
      (item) =>
        item.outcome_key === outcomeKey && item.key === machine.check_key,
    )!;
    rows.push({
      obligation_ref: sourceObligationRef,
      source_obligation_ref: sourceObligationRef,
      outcome_key: outcomeKey,
      claim_ref: fullClaim,
      applicability_ref: applicabilityRef,
      fact_ref: null,
      proof_ref: null,
      method,
      proof_surface: machine.proof_surface,
      required_evidence_capabilities:
        check.required_evidence_capabilities[machine.assertion_key!] ?? [],
      authority: "machine",
      confirmation_ref: null,
      status: "machine_admitted",
      reason: null,
      session_group: null,
    });
    return;
  }
  rows.push({
    ...pendingExternalRow(
      sourceObligationRef,
      outcomeKey,
      fullClaim,
      applicabilityRef,
      null,
      null,
      method,
      surface,
      capabilityFloor,
      null,
    ),
    authority: "none",
    status: "unreachable",
    reason: "no_admitted_proof_route",
  });
}
