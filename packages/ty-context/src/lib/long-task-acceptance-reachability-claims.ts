import type {
  EvidenceCapabilityV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import { externalClaimCapabilityFloor } from "./long-task-proof-adequacy.js";
import { claimSemanticCapabilityFloor } from "./long-task-claim-semantic-proof-floor.js";
import { resolveObligationAuthority } from "./long-task-obligation-authority-resolution.js";
import {
  claimObligationRef,
  claimProofMethod,
  externalConfirmationSessionMatchesApplicability,
  objectiveMachineClaimActualAuthority,
  pendingExternalRow,
  resolveObjectiveExternalClaimActualAuthority,
  selectOptionalSurface,
} from "./long-task-acceptance-reachability-helpers.js";
import { objectiveClaimSemanticIdentity } from "./long-task-obligation-semantic-identity.js";
import type {
  AcceptanceObligationReachabilityV1,
  AcceptanceReachabilityInputV1,
  ExternalAuthorityRouteV1,
  ExpectedExternalObligation,
  MachineAuthorityRouteV1,
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
  if (!requiredSurfaces.length) {
    addOptionalClaimObligation(
      input,
      rows,
      external,
      outcomeKey,
      localClaim,
      fullClaim,
      applicabilityRef,
      matching,
      requiredPolarity,
    );
    return;
  }
  for (const surface of requiredSurfaces)
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
      requiredPolarity,
    );
}

function addOptionalClaimObligation(
  input: AcceptanceReachabilityInputV1,
  rows: AcceptanceObligationReachabilityV1[],
  external: ExpectedExternalObligation[],
  outcomeKey: string | null,
  localClaim: string,
  fullClaim: string,
  applicabilityRef: string,
  matching: ClaimProofCandidate[],
  requiredPolarity: "positive" | "negative",
): void {
  const surfaces = [...new Set(matching.map((proof) => proof.proof_surface))];
  if (!surfaces.length) surfaces.push("runtime_behavior");
  const profiles = surfaces.map((surface) =>
    claimSurfaceAuthorityProfile(
      input,
      outcomeKey,
      localClaim,
      fullClaim,
      applicabilityRef,
      matching,
      surface,
      requiredPolarity,
    ),
  );
  const selectedSurface = selectOptionalSurface(matching);
  const selectedProfile =
    profiles.find((profile) => profile.surface === selectedSurface) ??
    profiles[0];
  const resolution = resolveObligationAuthority({
    source_obligation_ref: selectedProfile.sourceObligationRef,
    proof_surface_selection: "optional",
    machine_candidates: profiles.flatMap(
      (profile) => profile.machineCandidates,
    ),
    external_candidates: profiles.flatMap(
      (profile) => profile.externalCandidates,
    ),
  });
  const resolvedSurface =
    resolution.status === "machine_admitted"
      ? resolution.machine.proof_surface
      : resolution.status === "external_candidate"
        ? resolution.external.proof_surface
        : selectedProfile.surface;
  if (resolution.status === "machine_admitted") {
    const machineProfile =
      profiles.find(
        (profile) => profile.surface === resolution.machine.proof_surface,
      ) ?? selectedProfile;
    for (const profile of profiles)
      for (const route of profile.externalCandidates) {
        if (!route.expected_authority_ref) continue;
        external.push({
          source_obligation_ref: profile.sourceObligationRef,
          outcome_key: outcomeKey,
          claim_ref: fullClaim,
          local_claim_ref: localClaim,
          applicability_ref: applicabilityRef,
          fact_ref: null,
          proof_ref: null,
          method: route.method ?? profile.method,
          proof_surface: route.proof_surface,
          evidence_capabilities: [
            ...(route.required_evidence_capabilities ?? []),
          ].sort(),
          expected_authority_ref: route.expected_authority_ref,
          confirmation_ref: route.confirmation_ref,
          required_polarity: requiredPolarity,
          completion_role: "advisory",
          acceptance_effect: "none",
          semantic_identity: route.semantic_identity ?? null,
          machine_obligation_ref: machineProfile.sourceObligationRef,
        });
      }
  }
  emitClaimAuthorityResolution(
    rows,
    external,
    outcomeKey,
    localClaim,
    fullClaim,
    applicabilityRef,
    profiles.find((profile) => profile.surface === resolvedSurface) ??
      selectedProfile,
    resolution,
    requiredPolarity,
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
  matching: ClaimProofCandidate[],
  surface: ProofSurface,
  requiredPolarity: "positive" | "negative",
): void {
  const profile = claimSurfaceAuthorityProfile(
    input,
    outcomeKey,
    localClaim,
    fullClaim,
    applicabilityRef,
    matching,
    surface,
    requiredPolarity,
  );
  const resolution = resolveObligationAuthority({
    source_obligation_ref: profile.sourceObligationRef,
    proof_surface_selection: "required",
    machine_candidates: profile.machineCandidates,
    external_candidates: profile.externalCandidates,
  });
  emitClaimAuthorityResolution(
    rows,
    external,
    outcomeKey,
    localClaim,
    fullClaim,
    applicabilityRef,
    profile,
    resolution,
    requiredPolarity,
  );
}

interface ClaimProofCandidate {
  check_key: string;
  assertion_key: string | null;
  proof_surface: ProofSurface;
}

interface ClaimSurfaceAuthorityProfile {
  surface: ProofSurface;
  sourceObligationRef: string;
  method: string;
  capabilityFloor: EvidenceCapabilityV2[];
  machineCandidates: MachineAuthorityRouteV1[];
  externalCandidates: ExternalAuthorityRouteV1[];
}

function claimSurfaceAuthorityProfile(
  input: AcceptanceReachabilityInputV1,
  outcomeKey: string | null,
  localClaim: string,
  fullClaim: string,
  applicabilityRef: string,
  matching: ClaimProofCandidate[],
  surface: ProofSurface,
  requiredPolarity: "positive" | "negative",
): ClaimSurfaceAuthorityProfile {
  const capabilityFloorSet = externalClaimCapabilityFloor(
    input.contract,
    outcomeKey,
    localClaim,
    surface,
    applicabilityRef,
  );
  for (const capability of claimSemanticCapabilityFloor(
    input.contract,
    input.manifest,
    outcomeKey,
    localClaim,
    applicabilityRef,
  ))
    capabilityFloorSet.add(capability);
  const capabilityFloor = [...capabilityFloorSet].sort();
  const method = claimProofMethod(capabilityFloor);
  const candidates = matching.filter(
    (proof) => proof.proof_surface === surface,
  );
  const sourceObligationRef = claimObligationRef(
    fullClaim,
    applicabilityRef,
    surface,
  );
  const machineCandidates = candidates.flatMap((proof) => {
    if (!proof.assertion_key) return [];
    const check = input.compiled_checks.find(
      (item) => item.outcome_key === outcomeKey && item.key === proof.check_key,
    );
    if (!check) return [];
    const authority = objectiveMachineClaimActualAuthority(
      input.compiled_checks,
      outcomeKey,
      proof.check_key,
      proof.assertion_key,
      localClaim,
    );
    if (!authority) return [];
    const requiredCapabilities =
      check.required_evidence_capabilities[proof.assertion_key] ?? [];
    const expectedAuthorityRef =
      check.expected_authority_refs?.[proof.assertion_key];
    if (!expectedAuthorityRef) return [];
    return [
      {
        check_key: proof.check_key,
        assertion_key: proof.assertion_key,
        proof_surface: proof.proof_surface,
        method,
        required_evidence_capabilities: requiredCapabilities,
        semantic_identity: objectiveClaimSemanticIdentity({
          contract: input.contract,
          outcome_key: outcomeKey,
          claim_ref: fullClaim,
          local_claim_ref: localClaim,
          applicability_ref: applicabilityRef,
          required_polarity: requiredPolarity,
          expected_authority_ref: expectedAuthorityRef,
          method,
          required_evidence_capabilities: requiredCapabilities,
          observation_authority: authority,
        }),
      },
    ];
  });
  const externalCandidates = candidates
    .filter((proof) => proof.check_key.startsWith("EXTERNAL."))
    .flatMap((proof) => {
      const confirmationRef = proof.check_key.slice("EXTERNAL.".length);
      const confirmation =
        input.contract.global.acceptance.external_confirmations.find(
          (row) => row.key === confirmationRef,
        );
      if (!confirmation) return [];
      return (confirmation.obligations ?? [])
        .filter(
          (obligation) =>
            obligation.claim_ref === fullClaim &&
            obligation.applicability_ref === applicabilityRef &&
            obligation.proof_surface === surface &&
            obligation.fact_ref === null &&
            obligation.proof_ref === null,
        )
        .map((obligation) => {
          const authorityResolution =
            resolveObjectiveExternalClaimActualAuthority(
              input.compiled_checks,
              {
                source_obligation_ref: sourceObligationRef,
                outcome_key: outcomeKey,
                claim_ref: fullClaim,
                local_claim_ref: localClaim,
                fact_ref: null,
                proof_ref: null,
                method: obligation.method,
                proof_surface: obligation.proof_surface,
              },
            );
          const authority =
            authorityResolution.status === "resolved"
              ? authorityResolution.authority
              : null;
          const compiledExpectedAuthorityRef =
            authorityResolution.status === "resolved"
              ? authorityResolution.expected_authority_ref
              : null;
          const expectedAuthorityMatches =
            compiledExpectedAuthorityRef !== null &&
            obligation.expected_authority_ref === compiledExpectedAuthorityRef;
          const objectiveActual =
            obligation.result_kind === "actual" &&
            obligation.judgment_basis === undefined;
          const semanticIdentity =
            authority && expectedAuthorityMatches
              ? objectiveClaimSemanticIdentity({
                  contract: input.contract,
                  outcome_key: outcomeKey,
                  claim_ref: fullClaim,
                  local_claim_ref: localClaim,
                  applicability_ref: applicabilityRef,
                  required_polarity: requiredPolarity,
                  expected_authority_ref: compiledExpectedAuthorityRef,
                  method: obligation.method,
                  required_evidence_capabilities:
                    obligation.evidence_capabilities,
                  observation_authority: authority,
                })
              : null;
          return {
            confirmation_ref: confirmationRef,
            obligation_key: obligation.key,
            proof_surface: obligation.proof_surface,
            method: obligation.method,
            required_evidence_capabilities: [
              ...obligation.evidence_capabilities,
            ].sort(),
            authority_ambiguous: authorityResolution.status === "ambiguous",
            authority_unresolved:
              objectiveActual &&
              (authorityResolution.status !== "resolved" ||
                !expectedAuthorityMatches),
            expected_authority_ref: objectiveActual
              ? (compiledExpectedAuthorityRef ?? undefined)
              : obligation.expected_authority_ref,
            semantic_identity: semanticIdentity,
            advisory_to_machine:
              semanticIdentity !== null &&
              expectedAuthorityMatches &&
              objectiveActual &&
              externalConfirmationSessionMatchesApplicability(
                input.contract,
                outcomeKey,
                applicabilityRef,
                confirmation,
              ),
          };
        });
    });
  return {
    surface,
    sourceObligationRef,
    method,
    capabilityFloor,
    machineCandidates,
    externalCandidates,
  };
}

function emitClaimAuthorityResolution(
  rows: AcceptanceObligationReachabilityV1[],
  external: ExpectedExternalObligation[],
  outcomeKey: string | null,
  localClaim: string,
  fullClaim: string,
  applicabilityRef: string,
  profile: ClaimSurfaceAuthorityProfile,
  resolution: ReturnType<typeof resolveObligationAuthority>,
  requiredPolarity: "positive" | "negative",
): void {
  const { sourceObligationRef, method, surface, capabilityFloor } = profile;
  if (resolution.status === "external_candidate") {
    const confirmationRef = resolution.external.confirmation_ref;
    const expectedAuthorityRef = resolution.external.expected_authority_ref;
    if (!expectedAuthorityRef) {
      rows.push(
        pendingExternalRow(
          sourceObligationRef,
          outcomeKey,
          fullClaim,
          applicabilityRef,
          null,
          null,
          method,
          resolution.external.proof_surface,
          capabilityFloor,
          confirmationRef,
        ),
      );
      return;
    }
    external.push({
      source_obligation_ref: sourceObligationRef,
      outcome_key: outcomeKey,
      claim_ref: fullClaim,
      local_claim_ref: localClaim,
      applicability_ref: applicabilityRef,
      fact_ref: null,
      proof_ref: null,
      method,
      proof_surface: resolution.external.proof_surface,
      evidence_capabilities: capabilityFloor,
      expected_authority_ref: expectedAuthorityRef,
      confirmation_ref: confirmationRef,
      required_polarity: requiredPolarity,
      completion_role: "blocking",
      acceptance_effect: "required",
      semantic_identity: resolution.external.semantic_identity ?? null,
      machine_obligation_ref: null,
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
        resolution.external.proof_surface,
        capabilityFloor,
        confirmationRef,
      ),
    );
    return;
  }
  if (resolution.status === "machine_admitted") {
    const machine = resolution.machine;
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
      required_evidence_capabilities: machine.required_evidence_capabilities,
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
    reason: resolution.reason,
  });
}
