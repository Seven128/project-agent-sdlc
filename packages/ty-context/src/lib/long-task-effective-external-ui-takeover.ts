import type {
  DeliveryContractV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import { controlFieldFacts } from "./long-task-control-fields.js";
import { designFactObligationDescriptors } from "./long-task-design-obligation.js";
import type { AcceptanceReachabilityV1 } from "./long-task-acceptance-reachability-types.js";
import { effectiveBlockingExternalRows } from "./long-task-effective-external-takeover.js";

type DeliveryOutcomeV2 = DeliveryContractV2["outcomes"][number];
type DeliveryCheckV2 = DeliveryOutcomeV2["acceptance"]["checks"][number];
type DeliveryAssertionV2 = DeliveryCheckV2["positive_assertions"][number];
type DesignTargetV2 =
  DeliveryOutcomeV2["product"]["surface_bindings"][number]["design_targets"][number];
type EffectiveExternalRouteV1 =
  AcceptanceReachabilityV1["effective_external_routes"][number];
type DesignObligationV1 = ReturnType<
  typeof designFactObligationDescriptors
>[number];

interface UiClaimCoordinateV1 {
  local_claim_ref: string;
  applicability_ref: string;
  target_ref: string;
  proof_surface: ProofSurface;
}

function designObligationEffectivelyBlocked(
  descriptor: DesignObligationV1,
  rows: readonly EffectiveExternalRouteV1[],
): boolean {
  return (
    rows.filter(
      (row) =>
        row.source_obligation_ref === descriptor.source_obligation_ref &&
        row.claim_ref === descriptor.claim_ref &&
        row.local_claim_ref === descriptor.local_claim_ref &&
        row.applicability_ref === descriptor.applicability_ref &&
        row.proof_surface === descriptor.proof_surface &&
        row.fact_ref === descriptor.fact_ref &&
        row.proof_ref === descriptor.source_obligation_ref,
    ).length === 1
  );
}

function claimApplicabilityKey(
  localClaimRef: string,
  applicabilityRef: string,
): string {
  return `${localClaimRef}\0${applicabilityRef}`;
}

function controlClaimApplicabilities(outcome: DeliveryOutcomeV2): Set<string> {
  const entries = new Set<string>();
  for (const control of outcome.product.controls)
    for (const fact of controlFieldFacts(control))
      for (const applicabilityRef of fact.applicability_refs)
        entries.add(
          claimApplicabilityKey(
            `control.${control.key}.${fact.claim_field}`,
            applicabilityRef,
          ),
        );
  return entries;
}

function designTargetAssertionRefs(target: DesignTargetV2): Set<string> {
  return new Set([
    target.conformance_assertion_ref,
    ...target.verification_method_bindings.map(
      (binding) => binding.assertion_ref,
    ),
    ...(target.symbolic_method_bindings ?? []).map(
      (binding) => binding.assertion_ref,
    ),
    ...(target.symbolic_certificate_binding
      ? [target.symbolic_certificate_binding.assertion_ref]
      : []),
  ]);
}

function addDesignAssertionClaimApplicabilities(
  entries: Set<string>,
  check: DeliveryCheckV2,
  assertionRefs: ReadonlySet<string>,
): void {
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ])
    if (
      assertionRefs.has(assertion.key) &&
      assertion.claims.length === 1 &&
      assertion.applicability_ref
    )
      entries.add(
        claimApplicabilityKey(assertion.claims[0], assertion.applicability_ref),
      );
}

function allUiClaimApplicabilities(
  outcome: DeliveryOutcomeV2,
): Set<string> | null {
  const entries = controlClaimApplicabilities(outcome);
  for (const surface of outcome.product.surface_bindings)
    for (const target of surface.design_targets) {
      const check = outcome.acceptance.checks.find(
        (candidate) => candidate.key === target.conformance_check_ref,
      );
      if (!check) return null;
      addDesignAssertionClaimApplicabilities(
        entries,
        check,
        designTargetAssertionRefs(target),
      );
    }
  return entries;
}

function matchingCoordinates(
  outcome: DeliveryOutcomeV2,
  localClaimRef: string,
  applicabilityRef: string,
  targetRef: string,
): UiClaimCoordinateV1[] {
  return outcome.acceptance.checks.flatMap((check) =>
    [...check.positive_assertions, ...check.negative_assertions]
      .filter((assertion: DeliveryAssertionV2) =>
        assertionMatchesClaimApplicability(
          assertion,
          localClaimRef,
          applicabilityRef,
        ),
      )
      .map(() => ({
        local_claim_ref: localClaimRef,
        applicability_ref: applicabilityRef,
        target_ref: targetRef,
        proof_surface: check.proof_surface,
      })),
  );
}

function assertionMatchesClaimApplicability(
  assertion: DeliveryAssertionV2,
  localClaimRef: string,
  applicabilityRef: string,
): boolean {
  return (
    assertion.claims.length === 1 &&
    assertion.claims[0] === localClaimRef &&
    assertion.applicability_ref === applicabilityRef
  );
}

function coordinateKey(coordinate: UiClaimCoordinateV1): string {
  return [
    coordinate.local_claim_ref,
    coordinate.applicability_ref,
    coordinate.target_ref,
    coordinate.proof_surface,
  ].join("\0");
}

function uiClaimCoordinates(
  outcome: DeliveryOutcomeV2,
): Map<string, UiClaimCoordinateV1> | null {
  const entries = allUiClaimApplicabilities(outcome);
  if (!entries) return null;
  const profiles = new Map(
    outcome.applicability.map((profile) => [profile.key, profile]),
  );
  const coordinates = new Map<string, UiClaimCoordinateV1>();
  for (const entry of entries) {
    const [localClaimRef, applicabilityRef] = entry.split("\0");
    const profile = profiles.get(applicabilityRef);
    if (!profile) return null;
    const matching = matchingCoordinates(
      outcome,
      localClaimRef,
      applicabilityRef,
      profile.target_ref,
    );
    if (!matching.length) return null;
    for (const coordinate of matching)
      coordinates.set(coordinateKey(coordinate), coordinate);
  }
  return coordinates;
}

function ordinaryUiCoordinateEffectivelyBlocked(
  outcomeKey: string,
  coordinate: UiClaimCoordinateV1,
  rows: readonly EffectiveExternalRouteV1[],
): boolean {
  return (
    rows.filter(
      (row) =>
        row.claim_ref === `${outcomeKey}.${coordinate.local_claim_ref}` &&
        row.local_claim_ref === coordinate.local_claim_ref &&
        row.applicability_ref === coordinate.applicability_ref &&
        row.target_ref === coordinate.target_ref &&
        row.proof_surface === coordinate.proof_surface &&
        row.fact_ref === null &&
        row.proof_ref === null,
    ).length === 1
  );
}

export function outcomeUiProofFullyEffectivelyExternallyBlocked(
  contract: DeliveryContractV2,
  outcome: DeliveryOutcomeV2,
  reachability: AcceptanceReachabilityV1 | null | undefined,
): boolean {
  const rows = effectiveBlockingExternalRows(reachability).filter(
    (row) => row.outcome_key === outcome.key,
  );
  const designObligations = designFactObligationDescriptors(contract).filter(
    (descriptor) => descriptor.outcome_key === outcome.key,
  );
  if (
    !designObligations.every((descriptor) =>
      designObligationEffectivelyBlocked(descriptor, rows),
    )
  )
    return false;
  const coordinates = uiClaimCoordinates(outcome);
  if (!coordinates) return false;
  if (!designObligations.length && !coordinates.size) return false;
  return [...coordinates.values()].every((coordinate) =>
    ordinaryUiCoordinateEffectivelyBlocked(outcome.key, coordinate, rows),
  );
}
