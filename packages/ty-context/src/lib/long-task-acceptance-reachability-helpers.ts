import type {
  ClaimApplicabilityV2,
  CompiledCheckV2,
  CompiledObservationAuthorityV2,
  CompiledOutcomeV2,
  DeliveryCheckV2,
  DeliveryContractV2,
  EvidenceCapabilityV2,
  ExternalJudgmentBasisKindV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import { DESIGN_RESOURCE_COMPARATORS } from "./design-resource-fact-enums.js";
import type {
  AcceptanceObligationReachabilityV1,
  AcceptanceReachabilityV1,
  ExpectedExternalObligation,
} from "./long-task-acceptance-reachability-types.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { findDesignFactObligation } from "./long-task-design-obligation.js";
import { semanticFactCustomPropertyHasClosedStandardProfile } from "./long-task-semantic-proof-profile.js";
import { assertionObligationRef } from "./long-task-observation-authority.js";
import { canonicalValueJson } from "./strict-codec.js";

export function claimProofMethod(
  capabilities: readonly EvidenceCapabilityV2[],
): string {
  return capabilities.includes("population_coverage")
    ? "population_set_equality"
    : "exact_value";
}

export function claimObligationRef(
  fullClaim: string,
  applicabilityRef: string,
  surface: ProofSurface,
): string {
  return `claim:${fullClaim}:${applicabilityRef}:${surface}`;
}

export function effectiveExternalRouteRef(
  confirmationRef: string,
  sourceObligationRef: string,
): string {
  return `${confirmationRef}\0${sourceObligationRef}`;
}

export interface MachineAuthorizedAssertionQueryV1 {
  authority_scope: "ordinary_claim" | "fact_bound" | "any";
  outcome_key?: string | null;
  check_key?: string;
  assertion_key?: string;
  local_claim_ref?: string;
  applicability_ref?: string;
  target_ref?: string;
  check_journey_role?: ClaimApplicabilityV2["journey_role"];
  proof_surface?: ProofSurface;
  polarity?: "positive" | "negative";
  required_evidence_capability?: EvidenceCapabilityV2;
}

export interface MachineAuthorizedAssertionV1 {
  check: CompiledCheckV2;
  assertion: CompiledCheckV2["positive_assertions"][number];
  authority: CompiledObservationAuthorityV2;
  polarity: "positive" | "negative";
}

export function machineAuthorizedAssertions(
  checks: readonly CompiledCheckV2[],
  query: MachineAuthorizedAssertionQueryV1,
): MachineAuthorizedAssertionV1[] {
  const matches: MachineAuthorizedAssertionV1[] = [];
  for (const check of checks) {
    if (check.completion_role !== "semantic") continue;
    if (
      query.outcome_key !== undefined &&
      check.outcome_key !== query.outcome_key
    )
      continue;
    if (query.check_key !== undefined && check.key !== query.check_key)
      continue;
    if (
      query.target_ref !== undefined &&
      check.execution_target.target_ref !== query.target_ref
    )
      continue;
    if (
      query.check_journey_role !== undefined &&
      !check.journey_roles.includes(query.check_journey_role)
    )
      continue;
    if (
      query.proof_surface !== undefined &&
      check.proof_surface !== query.proof_surface
    )
      continue;
    const assertionGroups = [
      ["positive", check.positive_assertions ?? []] as const,
      ["negative", check.negative_assertions ?? []] as const,
    ];
    for (const [polarity, assertions] of assertionGroups) {
      if (query.polarity !== undefined && query.polarity !== polarity) continue;
      for (const assertion of assertions) {
        if (!assertion.claims.length) continue;
        if (
          query.assertion_key !== undefined &&
          assertion.key !== query.assertion_key
        )
          continue;
        if (
          query.local_claim_ref !== undefined &&
          (assertion.claims.length !== 1 ||
            assertion.claims[0] !== query.local_claim_ref)
        )
          continue;
        if (
          query.applicability_ref !== undefined &&
          assertion.applicability_ref !== query.applicability_ref
        )
          continue;
        if (
          query.required_evidence_capability !== undefined &&
          !assertion.evidence_capabilities.includes(
            query.required_evidence_capability,
          )
        )
          continue;
        const authorities = check.observation_authorities.filter(
          (authority) =>
            authority.assertion_ref === assertion.key &&
            authority.authority !== "external_confirmation" &&
            authority.target_ref === check.execution_target.target_ref &&
            authority.proof_surface === check.proof_surface &&
            authority.claim_refs.length === assertion.claims.length &&
            authority.claim_refs.every((claimRef) =>
              assertion.claims.includes(claimRef),
            ) &&
            (query.target_ref === undefined ||
              authority.target_ref === query.target_ref) &&
            (query.required_evidence_capability === undefined ||
              authority.evidence_capabilities.includes(
                query.required_evidence_capability,
              )) &&
            machineAuthorityMatchesScope(
              check,
              assertion,
              authority,
              query.authority_scope,
            ),
        );
        if (authorities.length !== 1) continue;
        matches.push({
          check,
          assertion,
          authority: authorities[0],
          polarity,
        });
      }
    }
  }
  return matches;
}

export function machineAuthorizedAssertionExists(
  checks: readonly CompiledCheckV2[],
  query: MachineAuthorizedAssertionQueryV1,
): boolean {
  return machineAuthorizedAssertions(checks, query).length > 0;
}

export function machineProofAdmitted(
  checks: CompiledCheckV2[],
  outcomeKey: string | null,
  checkKey: string,
  assertionKey: string,
  localClaim: string,
): boolean {
  return machineAuthorizedAssertionExists(checks, {
    authority_scope: "ordinary_claim",
    outcome_key: outcomeKey,
    check_key: checkKey,
    assertion_key: assertionKey,
    local_claim_ref: localClaim,
  });
}

export function objectiveMachineClaimActualAuthority(
  checks: readonly CompiledCheckV2[],
  outcomeKey: string | null,
  checkKey: string,
  assertionKey: string,
  localClaim: string,
): CompiledObservationAuthorityV2 | null {
  const candidates = machineAuthorizedAssertions(checks, {
    authority_scope: "ordinary_claim",
    outcome_key: outcomeKey,
    check_key: checkKey,
    assertion_key: assertionKey,
    local_claim_ref: localClaim,
  });
  return candidates.length === 1 ? candidates[0].authority : null;
}

function machineAuthorityMatchesScope(
  check: CompiledCheckV2,
  assertion: CompiledCheckV2["positive_assertions"][number],
  authority: CompiledObservationAuthorityV2,
  scope: MachineAuthorizedAssertionQueryV1["authority_scope"],
): boolean {
  if (scope === "any") return true;
  if (scope === "fact_bound") return authority.fact_ref !== null;
  if (
    authority.fact_ref !== null ||
    assertion.claims.length !== 1 ||
    !assertion.applicability_ref
  )
    return false;
  const fullClaim = check.outcome_key
    ? `${check.outcome_key}.${assertion.claims[0]}`
    : `GLOBAL.${assertion.claims[0]}`;
  const exactClaimObligationRef = claimObligationRef(
    fullClaim,
    assertion.applicability_ref,
    check.proof_surface,
  );
  const exactAssertionObligationRef = assertionObligationRef(
    check.outcome_key,
    check.key,
    assertion.key,
  );
  return (
    authority.obligation_ref === exactClaimObligationRef ||
    authority.obligation_ref === exactAssertionObligationRef
  );
}

export function pendingExternalRow(
  sourceObligationRef: string,
  outcomeKey: string | null,
  claimRef: string,
  applicabilityRef: string,
  factRef: string | null,
  proofRef: string | null,
  method: string,
  proofSurface: ProofSurface,
  capabilities: EvidenceCapabilityV2[],
  confirmationRef: string | null,
): AcceptanceObligationReachabilityV1 {
  return {
    obligation_ref: sourceObligationRef,
    source_obligation_ref: sourceObligationRef,
    outcome_key: outcomeKey,
    claim_ref: claimRef,
    applicability_ref: applicabilityRef,
    fact_ref: factRef,
    proof_ref: proofRef,
    method,
    proof_surface: proofSurface,
    required_evidence_capabilities: [...capabilities].sort(),
    authority: "external_confirmation",
    confirmation_ref: confirmationRef,
    status: "unreachable",
    reason: "external_confirmation_not_fulfillable",
    session_group: null,
  };
}

export function selectOptionalSurface(
  proofs: Array<{ proof_surface: ProofSurface; check_key: string }>,
): ProofSurface {
  return (
    [...proofs].sort((left, right) => {
      const authority =
        Number(left.check_key.startsWith("EXTERNAL.")) -
        Number(right.check_key.startsWith("EXTERNAL."));
      return authority || left.proof_surface.localeCompare(right.proof_surface);
    })[0]?.proof_surface ?? "runtime_behavior"
  );
}

export function applicabilityProfile(
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  applicabilityRef: string,
): ClaimApplicabilityV2 | null {
  const profiles = outcomeKey
    ? contract.outcomes.find((item) => item.key === outcomeKey)?.applicability
    : contract.global.applicability;
  return profiles?.find((item) => item.key === applicabilityRef) ?? null;
}

export function externalConfirmationSessionMatchesApplicability(
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  applicabilityRef: string,
  confirmation: DeliveryContractV2["global"]["acceptance"]["external_confirmations"][number],
): boolean {
  const profile = applicabilityProfile(contract, outcomeKey, applicabilityRef);
  const scenario = confirmation.scenario;
  return Boolean(
    profile &&
    scenario &&
    confirmation.target_ref === profile.target_ref &&
    sameSet(
      scenario.given.map((step) => step.key),
      profile.given_refs,
    ) &&
    scenario.when.map((step) => step.key).join("\0") ===
      profile.when_refs.join("\0"),
  );
}

export function objectiveExternalActualAdmitted(
  contract: DeliveryContractV2,
  manifest: SemanticFactManifestV1,
  expected: ExpectedExternalObligation,
  compiledChecks: readonly CompiledCheckV2[] = [],
): boolean {
  if (!expected.fact_ref && !expected.proof_ref) {
    const resolved = resolveObjectiveExternalClaimActualAuthority(
      compiledChecks,
      expected,
    );
    return Boolean(
      resolved.status === "resolved" &&
      resolved.check.expected_authority_refs[
        resolved.authority.assertion_ref
      ] === expected.expected_authority_ref,
    );
  }
  if (!expected.fact_ref || !expected.proof_ref) return false;
  if (
    admittedObjectiveExternalComparator(
      manifest,
      expected.fact_ref,
      expected.proof_ref,
    ) !== null
  )
    return true;
  const design = findDesignFactObligation(contract, expected);
  return Boolean(
    design &&
    design.observation_sensitivity === "plain" &&
    DESIGN_RESOURCE_COMPARATORS.includes(
      design.comparison
        .comparator as (typeof DESIGN_RESOURCE_COMPARATORS)[number],
    ),
  );
}

export function exactExternalClaimActualObligationRefsByAssertion(
  contract: DeliveryContractV2,
  outcomeKey: string | null,
  check: DeliveryCheckV2,
  expectedAuthorityRefs: Readonly<Record<string, string>>,
): ReadonlyMap<string, string> {
  const designFactAssertionIdentities = new Set<string>();
  if (outcomeKey) {
    const outcome = contract.outcomes.find((item) => item.key === outcomeKey);
    for (const binding of outcome?.product.surface_bindings ?? [])
      for (const target of binding.design_targets)
        for (const assertionRef of [
          ...target.verification_method_bindings.map(
            (method) => method.assertion_ref,
          ),
          ...(target.symbolic_method_bindings ?? []).map(
            (method) => method.assertion_ref,
          ),
          ...(target.symbolic_certificate_binding
            ? [target.symbolic_certificate_binding.assertion_ref]
            : []),
        ])
          designFactAssertionIdentities.add(
            `${target.conformance_check_ref}\0${assertionRef}`,
          );
  }
  const scopedChecks = outcomeKey
    ? (contract.outcomes.find((outcome) => outcome.key === outcomeKey)
        ?.acceptance.checks ?? [])
    : contract.global.acceptance.checks;
  const assertionsByObligation = new Map<
    string,
    Array<{ check_key: string; assertion_key: string; signature: string }>
  >();
  for (const scopedCheck of scopedChecks)
    for (const assertion of [
      ...scopedCheck.positive_assertions,
      ...scopedCheck.negative_assertions,
    ]) {
      if (
        designFactAssertionIdentities.has(
          `${scopedCheck.key}\0${assertion.key}`,
        ) ||
        assertion.claims.length !== 1 ||
        !assertion.applicability_ref ||
        !exactExternalClaimActualOperator(assertion.operator)
      )
        continue;
      const fullClaim = outcomeKey
        ? `${outcomeKey}.${assertion.claims[0]}`
        : `GLOBAL.${assertion.claims[0]}`;
      const obligationRef = claimObligationRef(
        fullClaim,
        assertion.applicability_ref,
        scopedCheck.proof_surface,
      );
      const rows = assertionsByObligation.get(obligationRef) ?? [];
      rows.push({
        check_key: scopedCheck.key,
        assertion_key: assertion.key,
        signature: exactExternalClaimActualAssertionSignature(
          scopedCheck,
          assertion,
        ),
      });
      assertionsByObligation.set(obligationRef, rows);
    }
  const result = new Map<string, string>();
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ]) {
    if (
      designFactAssertionIdentities.has(`${check.key}\0${assertion.key}`) ||
      assertion.claims.length !== 1 ||
      !assertion.applicability_ref ||
      !exactExternalClaimActualOperator(assertion.operator)
    )
      continue;
    const fullClaim = outcomeKey
      ? `${outcomeKey}.${assertion.claims[0]}`
      : `GLOBAL.${assertion.claims[0]}`;
    const obligationRef = claimObligationRef(
      fullClaim,
      assertion.applicability_ref,
      check.proof_surface,
    );
    const expectedAuthorityRef = expectedAuthorityRefs[assertion.key];
    if (!expectedAuthorityRef) continue;
    const assertionOwners = assertionsByObligation.get(obligationRef) ?? [];
    if (
      !assertionOwners.some(
        (owner) =>
          owner.check_key === check.key &&
          owner.assertion_key === assertion.key,
      ) ||
      new Set(assertionOwners.map((owner) => owner.signature)).size !== 1
    )
      continue;
    const declared = contract.global.acceptance.external_confirmations.some(
      (confirmation) =>
        confirmation.blocks_target &&
        confirmation.impact_claims.includes(fullClaim) &&
        confirmation.obligations?.some(
          (obligation) =>
            obligation.claim_ref === fullClaim &&
            obligation.applicability_ref === assertion.applicability_ref &&
            obligation.fact_ref === null &&
            obligation.proof_ref === null &&
            obligation.method === "exact_value" &&
            obligation.proof_surface === check.proof_surface &&
            obligation.expected_authority_ref === expectedAuthorityRef &&
            obligation.result_kind === "actual" &&
            obligation.judgment_basis === undefined,
        ),
    );
    if (declared) result.set(assertion.key, obligationRef);
  }
  return result;
}

export function objectiveExternalClaimActualAuthority(
  compiledChecks: readonly CompiledCheckV2[],
  expected: Pick<
    ExpectedExternalObligation,
    | "source_obligation_ref"
    | "outcome_key"
    | "claim_ref"
    | "fact_ref"
    | "proof_ref"
    | "method"
    | "proof_surface"
  > & { local_claim_ref?: string },
): CompiledObservationAuthorityV2 | null {
  const resolved = resolveObjectiveExternalClaimActualAuthority(
    compiledChecks,
    expected,
  );
  return resolved.status === "resolved" ? resolved.authority : null;
}

export type ObjectiveExternalClaimActualAuthorityResolutionV1 =
  | {
      status: "resolved";
      check: CompiledCheckV2;
      authority: CompiledObservationAuthorityV2;
      expected_authority_ref: string;
    }
  | { status: "missing" }
  | { status: "ambiguous" };

export function resolveObjectiveExternalClaimActualAuthority(
  compiledChecks: readonly CompiledCheckV2[],
  expected: Pick<
    ExpectedExternalObligation,
    | "source_obligation_ref"
    | "outcome_key"
    | "claim_ref"
    | "fact_ref"
    | "proof_ref"
    | "method"
    | "proof_surface"
  > & { local_claim_ref?: string },
): ObjectiveExternalClaimActualAuthorityResolutionV1 {
  if (expected.fact_ref || expected.proof_ref) return { status: "missing" };
  const localClaimRef =
    expected.local_claim_ref ??
    (expected.outcome_key
      ? expected.claim_ref.slice(expected.outcome_key.length + 1)
      : expected.claim_ref.slice("GLOBAL.".length));
  const candidates = compiledChecks.flatMap((check) =>
    check.outcome_key === expected.outcome_key &&
    check.proof_surface === expected.proof_surface
      ? check.observation_authorities
          .filter(
            (authority) =>
              authority.authority === "external_confirmation" &&
              authority.obligation_ref === expected.source_obligation_ref &&
              authority.fact_ref === null &&
              authority.claim_refs.length === 1 &&
              authority.claim_refs[0] === localClaimRef &&
              authority.method === expected.method &&
              authority.comparison.comparator === "exact_value" &&
              authority.comparison.mode === "exact" &&
              authority.comparison.tolerance_sha256 === null &&
              authority.comparison.mask_sha256 === null,
          )
          .map((authority) => ({ check, authority }))
      : [],
  );
  if (candidates.length !== 1)
    return { status: candidates.length ? "ambiguous" : "missing" };
  const [{ check, authority }] = candidates;
  const expectedAuthorityRef =
    check.expected_authority_refs[authority.assertion_ref];
  if (!expectedAuthorityRef) return { status: "missing" };
  return {
    status: "resolved",
    check,
    authority,
    expected_authority_ref: expectedAuthorityRef,
  };
}

function exactExternalClaimActualOperator(
  operator: DeliveryCheckV2["positive_assertions"][number]["operator"],
): boolean {
  return ["equals", "truthy", "falsy", "exists"].includes(operator);
}

function exactExternalClaimActualAssertionSignature(
  check: DeliveryCheckV2,
  assertion: DeliveryCheckV2["positive_assertions"][number],
): string {
  const expected =
    assertion.operator === "equals"
      ? assertion.expected
      : assertion.operator === "falsy"
        ? false
        : true;
  const projection =
    assertion.operator === "equals"
      ? "raw_exact"
      : assertion.operator === "exists"
        ? "presence_boolean"
        : assertion.operator === "truthy"
          ? "truthy_boolean"
          : "falsy_boolean";
  return canonicalValueJson({
    target_ref: check.execution_target.target_ref,
    proof_surface: check.proof_surface,
    expected,
    projection,
  });
}

export function admittedObjectiveExternalComparator(
  manifest: SemanticFactManifestV1,
  factRef: string,
  proofRef: string,
): "exact_value" | "population_set_equal" | null {
  const fact = manifest.facts.find((candidate) => candidate.key === factRef);
  const proof = manifest.proof_obligations.find(
    (candidate) => candidate.key === proofRef,
  );
  if (!fact || !proof || proof.fact_ref !== fact.key) return null;
  if (
    proof.comparison.mode !== "exact" ||
    proof.comparison.tolerance !== null ||
    proof.comparison.mask !== null
  )
    return null;
  if (proof.comparison.comparator === "exact_value") return "exact_value";
  if (
    proof.method !== "population_set_equality" ||
    proof.comparison.comparator !== "population_set_equal" ||
    fact.value_kind !== "set" ||
    fact.expected.representation !== "inline" ||
    !objectivePopulationSet(fact.expected.value) ||
    !proof.evidence_capabilities.includes("semantic_fact") ||
    !proof.evidence_capabilities.includes("population_coverage")
  )
    return null;
  return "population_set_equal";
}

export function objectivePopulationSet(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length > 0) &&
    new Set(value).size === value.length
  );
}

const JUDGMENT_STANDARD_PROPERTIES = new Set([
  "goal_scope_glossary.acceptance_meaning",
  "goal_scope_glossary.decision_owner",
  "architecture_ownership.selected_design",
  "safety_compliance.expert_authority",
  "safety_compliance.human_approval",
  "privacy.preference",
  "ai_ml.human_review",
  "external_integration.external_confirmation",
]);

const OBJECTIVE_JUDGMENT_CAPABILITIES = new Set<EvidenceCapabilityV2>([
  "semantic_fact",
  "presence",
  "target_runtime",
  "interaction_trace",
  "input_variation",
  "state_delta",
  "data_state",
  "durable_readback",
  "boundary_invocation",
  "actual_provenance",
  "population_coverage",
  "distinct_identity",
  "failure_injection",
  "recovery",
]);

const OBJECTIVE_JUDGMENT_SURFACES = new Set<ProofSurface>([
  "api_contract",
  "data_state",
  "security_boundary",
  "population_coverage",
  "implementation_structure",
]);

const OBJECTIVE_JUDGMENT_FACT_SCOPES: ReadonlySet<
  SemanticFactManifestV1["facts"][number]["observation_scope"]
> = new Set([
  "data_boundary",
  "security_boundary",
  "operational_boundary",
  "implementation_structure",
  "external_boundary",
]);

type JudgmentExpectedObligation = Pick<
  ExpectedExternalObligation,
  | "claim_ref"
  | "applicability_ref"
  | "fact_ref"
  | "proof_ref"
  | "method"
  | "proof_surface"
> & {
  confirmation_ref: string | null;
  evidence_capabilities?: readonly EvidenceCapabilityV2[];
  required_evidence_capabilities?: readonly EvidenceCapabilityV2[];
};

export function sourceBackedExternalJudgmentAdmitted(
  contract: Pick<DeliveryContractV2, "source_claims" | "global">,
  manifest: SemanticFactManifestV1,
  expected: JudgmentExpectedObligation,
  basis:
    | NonNullable<
        DeliveryContractV2["global"]["acceptance"]["external_confirmations"][number]["obligations"]
      >[number]["judgment_basis"]
    | undefined,
  actorKind: "human" | "expert" | "external_system" | undefined,
): boolean {
  if (!basis || !judgmentActorMatches(basis.kind, actorKind)) return false;
  const sourceClaim = contract.source_claims.find(
    (claim) => claim.key === basis.source_ref,
  );
  const sourceBasis = sourceClaim?.judgment_basis;
  if (
    !sourceClaim ||
    !sourceBasis ||
    sourceBasis.kind !== basis.kind ||
    sourceBasis.claim_ref !== expected.claim_ref ||
    !sourceBasis.applicability_refs.includes(expected.applicability_ref) ||
    !sourceClaimOwnsClaim(contract, sourceClaim, expected, basis)
  )
    return false;
  if (!expected.fact_ref && !expected.proof_ref) {
    const capabilities =
      expected.evidence_capabilities ??
      expected.required_evidence_capabilities ??
      [];
    return (
      expected.method === "exact_value" &&
      !OBJECTIVE_JUDGMENT_SURFACES.has(expected.proof_surface) &&
      capabilities.every(
        (capability) => !OBJECTIVE_JUDGMENT_CAPABILITIES.has(capability),
      )
    );
  }
  if (
    !expected.fact_ref ||
    !expected.proof_ref ||
    expected.method !== "exact_value"
  )
    return false;
  const fact = manifest.facts.find((row) => row.key === expected.fact_ref);
  const proof = manifest.proof_obligations.find(
    (row) => row.key === expected.proof_ref,
  );
  const property = fact
    ? manifest.property_dispositions.find(
        (row) => row.key === fact.property_ref,
      )
    : null;
  const family = fact
    ? manifest.family_dispositions.find((row) => row.key === fact.family_ref)
    : null;
  if (
    !fact ||
    !proof ||
    proof.fact_ref !== fact.key ||
    proof.method !== expected.method ||
    !property ||
    !family
  )
    return false;
  if (property.standard)
    return JUDGMENT_STANDARD_PROPERTIES.has(
      `${family.family}.${property.property}`,
    );
  const capabilities = [
    ...property.required_evidence_capabilities,
    ...(expected.evidence_capabilities ??
      expected.required_evidence_capabilities ??
      []),
  ];
  return (
    semanticFactCustomPropertyHasClosedStandardProfile(property) &&
    property.required_methods.includes(expected.method) &&
    !OBJECTIVE_JUDGMENT_FACT_SCOPES.has(fact.observation_scope) &&
    capabilities.every(
      (capability) =>
        capability === "semantic_fact" ||
        !OBJECTIVE_JUDGMENT_CAPABILITIES.has(capability),
    )
  );
}

function judgmentActorMatches(
  basisKind: ExternalJudgmentBasisKindV2,
  actorKind: "human" | "expert" | "external_system" | undefined,
): boolean {
  if (basisKind === "expert_assessment") return actorKind === "expert";
  return actorKind === "human";
}

function sourceClaimOwnsClaim(
  contract: Pick<DeliveryContractV2, "global">,
  sourceClaim: DeliveryContractV2["source_claims"][number],
  expected: JudgmentExpectedObligation,
  basis: NonNullable<
    NonNullable<
      DeliveryContractV2["global"]["acceptance"]["external_confirmations"][number]["obligations"]
    >[number]["judgment_basis"]
  >,
): boolean {
  const disposition = sourceClaim.disposition;
  if (disposition.type === "claim" || disposition.type === "global_constraint")
    return disposition.refs.includes(expected.claim_ref);
  if (disposition.type === "outcome_result")
    return disposition.ref === expected.claim_ref;
  if (
    disposition.type !== "external_confirmation" ||
    !expected.confirmation_ref ||
    !disposition.refs.includes(expected.confirmation_ref)
  )
    return false;
  const confirmation = contract.global.acceptance.external_confirmations.find(
    (row) => row.key === expected.confirmation_ref,
  );
  return Boolean(
    confirmation?.obligations?.some(
      (obligation) =>
        obligation.claim_ref === expected.claim_ref &&
        obligation.applicability_ref === expected.applicability_ref &&
        obligation.fact_ref === expected.fact_ref &&
        obligation.proof_ref === expected.proof_ref &&
        obligation.method === expected.method &&
        obligation.proof_surface === expected.proof_surface &&
        sameSet(
          obligation.evidence_capabilities,
          expected.evidence_capabilities ??
            expected.required_evidence_capabilities ??
            [],
        ) &&
        obligation.judgment_basis?.kind === basis.kind &&
        obligation.judgment_basis.source_ref === sourceClaim.key,
    ),
  );
}

export function sameSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((item) => right.includes(item))
  );
}
