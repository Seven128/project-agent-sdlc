import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import {
  applicabilityProfile,
  objectiveExternalActualAdmitted,
  sameSet,
} from "./long-task-acceptance-reachability-helpers.js";
import type {
  AcceptanceObligationReachabilityV1,
  ExpectedExternalObligation,
} from "./long-task-acceptance-reachability-types.js";

export function validateExternalDeclarations(
  contract: DeliveryContractV2,
  manifest: SemanticFactManifestV1,
  expected: ExpectedExternalObligation[],
): Map<string, { obligation_key: string; session_group: string }> {
  const result = new Map<
    string,
    { obligation_key: string; session_group: string }
  >();
  for (const confirmation of contract.global.acceptance
    .external_confirmations) {
    if (!confirmation.blocks_target) continue;
    const expectedRows = expected.filter(
      (row) => row.confirmation_ref === confirmation.key,
    );
    const obligations = confirmation.obligations ?? [];
    if (!confirmationShapeComplete(confirmation, obligations.length)) continue;
    if (!confirmationSetsMatch(confirmation, obligations, expectedRows))
      continue;
    const matched = matchConfirmationRows(
      contract,
      manifest,
      confirmation,
      obligations,
      expectedRows,
    );
    if (!matched) continue;
    const sessionGroup = sha256Hex(
      canonicalValueJson({
        owner: confirmation.owner,
        actor: confirmation.actor,
        target_ref: confirmation.target_ref,
        environment_identity: confirmation.environment_identity,
        scenario: confirmation.scenario,
        evidence_requirements: confirmation.evidence_requirements,
      }),
    );
    for (const match of matched)
      result.set(match.source_obligation_ref, {
        obligation_key: match.obligation_key,
        session_group: sessionGroup,
      });
  }
  return result;
}

export function addUnboundBlockingConfirmationRows(
  contract: DeliveryContractV2,
  rows: AcceptanceObligationReachabilityV1[],
  expected: ExpectedExternalObligation[],
): void {
  for (const confirmation of contract.global.acceptance
    .external_confirmations) {
    if (
      !confirmation.blocks_target ||
      expected.some((row) => row.confirmation_ref === confirmation.key)
    )
      continue;
    const claimRef = confirmation.impact_claims[0] ?? "GLOBAL.unbound";
    const outcomeKey =
      contract.outcomes.find(
        (outcome) =>
          claimRef === outcome.key || claimRef.startsWith(`${outcome.key}.`),
      )?.key ?? null;
    rows.push({
      obligation_ref: `external-confirmation:${confirmation.key}`,
      source_obligation_ref: `external-confirmation:${confirmation.key}`,
      outcome_key: outcomeKey,
      claim_ref: claimRef,
      applicability_ref: "unbound",
      fact_ref: null,
      proof_ref: null,
      method: "unbound",
      proof_surface: "runtime_behavior",
      required_evidence_capabilities: [],
      authority: "external_confirmation",
      confirmation_ref: confirmation.key,
      status: "unreachable",
      reason: "blocking_confirmation_has_no_exact_proof_obligations",
      session_group: null,
    });
  }
}

function confirmationShapeComplete(
  confirmation: DeliveryContractV2["global"]["acceptance"]["external_confirmations"][number],
  obligationCount: number,
): boolean {
  return Boolean(
    confirmation.actor &&
    confirmation.target_ref &&
    confirmation.environment_identity &&
    confirmation.scenario?.given.length &&
    confirmation.scenario.when.length &&
    confirmation.evidence_requirements?.length &&
    obligationCount,
  );
}

function confirmationSetsMatch(
  confirmation: DeliveryContractV2["global"]["acceptance"]["external_confirmations"][number],
  obligations: NonNullable<typeof confirmation.obligations>,
  expectedRows: ExpectedExternalObligation[],
): boolean {
  return (
    new Set(obligations.map((row) => row.key)).size === obligations.length &&
    sameSet(confirmation.impact_claims, [
      ...new Set(obligations.map((row) => row.claim_ref)),
    ]) &&
    obligations.length === expectedRows.length
  );
}

function matchConfirmationRows(
  contract: DeliveryContractV2,
  manifest: SemanticFactManifestV1,
  confirmation: DeliveryContractV2["global"]["acceptance"]["external_confirmations"][number],
  obligations: NonNullable<typeof confirmation.obligations>,
  expectedRows: ExpectedExternalObligation[],
): Array<{ source_obligation_ref: string; obligation_key: string }> | null {
  const used = new Set<string>();
  const matched: Array<{
    source_obligation_ref: string;
    obligation_key: string;
  }> = [];
  for (const expectedRow of expectedRows) {
    const candidates = obligations.filter((actual) =>
      externalObligationMatches(actual, expectedRow),
    );
    const actual = candidates[0];
    if (candidates.length !== 1 || !actual || used.has(actual.key)) return null;
    const profile = applicabilityProfile(
      contract,
      expectedRow.outcome_key,
      expectedRow.applicability_ref,
    );
    if (
      !profile ||
      confirmation.target_ref !== profile.target_ref ||
      !sameSet(
        confirmation.scenario!.given.map((step) => step.key),
        profile.given_refs,
      ) ||
      confirmation.scenario!.when.map((step) => step.key).join("\0") !==
        profile.when_refs.join("\0") ||
      (actual.result_kind === "judgment" &&
        confirmation.actor?.authority_kind === "external_system") ||
      (actual.result_kind === "actual" &&
        !objectiveExternalActualAdmitted(manifest, expectedRow))
    )
      return null;
    used.add(actual.key);
    matched.push({
      source_obligation_ref: expectedRow.source_obligation_ref,
      obligation_key: actual.key,
    });
  }
  return used.size === obligations.length ? matched : null;
}

function externalObligationMatches(
  actual: NonNullable<
    DeliveryContractV2["global"]["acceptance"]["external_confirmations"][number]["obligations"]
  >[number],
  expected: ExpectedExternalObligation,
): boolean {
  return (
    actual.claim_ref === expected.claim_ref &&
    actual.applicability_ref === expected.applicability_ref &&
    actual.fact_ref === expected.fact_ref &&
    actual.proof_ref === expected.proof_ref &&
    actual.method === expected.method &&
    actual.proof_surface === expected.proof_surface &&
    sameSet(actual.evidence_capabilities, expected.evidence_capabilities) &&
    actual.expected_authority_ref === expected.expected_authority_ref
  );
}
