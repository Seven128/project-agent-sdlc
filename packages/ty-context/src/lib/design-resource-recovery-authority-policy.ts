import type {
  DesignResourceAuthoritySourceItem,
  DesignResourceDelegation,
  DesignResourceDelta,
  DesignResourceRecoveryCheckpoint,
  DesignResourceRecoveryCreateInput,
} from "./design-resource-recovery-types.js";

const AUTHORITATIVE_MEANING_SOURCE_KINDS = new Set([
  "outcome_result",
  "requirement",
  "control",
  "acceptance",
  "technical_obligation",
  "risk_fact",
]);

export function isDesignResourceAuthoritativeMeaningSourceKind(
  kind: string,
): boolean {
  return AUTHORITATIVE_MEANING_SOURCE_KINDS.has(kind);
}

type RecoveryState =
  DesignResourceRecoveryCreateInput | DesignResourceRecoveryCheckpoint;

export function validateDesignResourceDeltaAuthority(
  delta: DesignResourceDelta,
  delegations: Map<string, DesignResourceDelegation>,
  authoritySources: Map<string, DesignResourceAuthoritySourceItem>,
): void {
  validateDeltaSourceReferences(delta, authoritySources);
  validateAcceptedAuthorityPresence(delta, authoritySources);
  const delegation = validateDeltaDelegation(delta, delegations);
  validateNonvisualMeaningSource(delta, delegation, authoritySources);
}

export function indexDesignResourceDelegations(
  values: DesignResourceDelegation[],
  scope: Set<string>,
  authoritySources: Map<string, DesignResourceAuthoritySourceItem>,
): Map<string, DesignResourceDelegation> {
  const result = new Map<string, DesignResourceDelegation>();
  for (const value of values) {
    if (result.has(value.key)) invalid(`delegation_duplicate:${value.key}`);
    assertUnique(
      value.allowed_origins,
      `delegation_origin_duplicate:${value.key}`,
    );
    assertUnique(
      value.allowed_semantic_kinds,
      `delegation_semantic_kind_duplicate:${value.key}`,
    );
    assertUnique(
      value.allowed_target_keys,
      `delegation_target_duplicate:${value.key}`,
    );
    const source = authoritySources.get(value.source_ref);
    if (!source) invalid(`delegation_source_ref_unresolved:${value.key}`);
    if (source.source_item_kind !== "decision")
      invalid(`delegation_source_not_decision:${value.key}`);
    assertSubset(
      new Set(value.allowed_target_keys),
      scope,
      `delegation_target_outside_scope:${value.key}`,
    );
    result.set(value.key, value);
  }
  return result;
}

export function indexDesignResourceAuthoritySources(
  values: DesignResourceAuthoritySourceItem[],
): Map<string, DesignResourceAuthoritySourceItem> {
  const result = new Map<string, DesignResourceAuthoritySourceItem>();
  const identities = new Set<string>();
  for (const value of values) {
    if (result.has(value.source_ref))
      invalid(`authority_source_ref_duplicate:${value.source_ref}`);
    const identity = `${value.locator}\u0000${value.source_item_key}`;
    if (identities.has(identity))
      invalid(
        `authority_source_item_aliased:${value.locator}:${value.source_item_key}`,
      );
    identities.add(identity);
    result.set(value.source_ref, value);
  }
  return result;
}

export function validateDesignResourceBaseMaterialization(
  state: RecoveryState,
  authoritySources: Map<string, DesignResourceAuthoritySourceItem>,
): void {
  if (state.base.materialization.kind !== "authorized-recovery-snapshot")
    return;
  const source = authoritySources.get(
    state.base.materialization.authorization_ref,
  );
  if (!source) invalid("base_snapshot_authorization_ref_unresolved");
  if (source.source_item_kind !== "decision")
    invalid("base_snapshot_authorization_not_decision");
}

function validateDeltaSourceReferences(
  delta: DesignResourceDelta,
  authoritySources: Map<string, DesignResourceAuthoritySourceItem>,
): void {
  for (const sourceRef of delta.source_refs)
    if (!authoritySources.has(sourceRef))
      invalid(`delta_source_ref_unresolved:${delta.delta_id}:${sourceRef}`);
}

function validateAcceptedAuthorityPresence(
  delta: DesignResourceDelta,
  authoritySources: Map<string, DesignResourceAuthoritySourceItem>,
): void {
  if (delta.status !== "accepted") return;
  if (
    delta.origin !== "necessary-derived" &&
    delta.decision_authority === "none"
  )
    invalid(`accepted_delta_authority_required:${delta.delta_id}`);
  if (
    delta.origin === "provider-suggested" &&
    delta.decision_authority !== "explicit-user" &&
    !delta.decision_authority.startsWith("delegated:")
  )
    invalid(`provider_suggestion_not_authorized:${delta.delta_id}`);
  if (delta.origin === "provider-suggested" && !delta.evidence_refs.length)
    invalid(`provider_suggestion_evidence_required:${delta.delta_id}`);
  if (
    delta.decision_authority === "explicit-user" &&
    !delta.source_refs.some(
      (sourceRef) =>
        authoritySources.get(sourceRef)?.source_item_kind === "decision",
    )
  )
    invalid(`explicit_user_source_decision_required:${delta.delta_id}`);
}

function validateDeltaDelegation(
  delta: DesignResourceDelta,
  delegations: Map<string, DesignResourceDelegation>,
): DesignResourceDelegation | undefined {
  if (!delta.decision_authority.startsWith("delegated:")) return undefined;
  const key = delta.decision_authority.slice("delegated:".length);
  const delegation = delegations.get(key);
  if (!delegation) invalid(`delegation_not_found:${delta.delta_id}:${key}`);
  if (!delta.source_refs.includes(delegation.source_ref))
    invalid(`delegation_source_not_bound:${delta.delta_id}:${key}`);
  if (!delegation.allowed_origins.includes(delta.origin))
    invalid(`delegation_origin_not_allowed:${delta.delta_id}:${key}`);
  if (!delegation.allowed_semantic_kinds.includes(delta.semantic_kind))
    invalid(`delegation_semantic_kind_not_allowed:${delta.delta_id}:${key}`);
  assertSubset(
    new Set(delta.target_keys),
    new Set(delegation.allowed_target_keys),
    `delegation_target_not_allowed:${delta.delta_id}:${key}`,
  );
  return delegation;
}

function validateNonvisualMeaningSource(
  delta: DesignResourceDelta,
  delegation: DesignResourceDelegation | undefined,
  authoritySources: Map<string, DesignResourceAuthoritySourceItem>,
): void {
  if (delta.status !== "accepted" || delta.semantic_kind === "exact-visual")
    return;
  const found = delta.source_refs.some((sourceRef) => {
    if (sourceRef === delegation?.source_ref) return false;
    const kind = authoritySources.get(sourceRef)?.source_item_kind ?? "";
    return (
      isDesignResourceAuthoritativeMeaningSourceKind(kind) ||
      (delta.decision_authority === "explicit-user" && kind === "decision")
    );
  });
  if (!found) invalid(`nonvisual_meaning_source_required:${delta.delta_id}`);
}

function assertUnique(values: string[], code: string): void {
  if (new Set(values).size !== values.length) invalid(code);
}

function assertSubset(
  candidate: Set<string>,
  owner: Set<string>,
  code: string,
): void {
  const outside = [...candidate].filter((value) => !owner.has(value));
  if (outside.length) invalid(`${code}:${outside.sort(compareText).join(",")}`);
}

function invalid(code: string): never {
  throw new Error(`design_resource_recovery_invalid:${code}`);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
