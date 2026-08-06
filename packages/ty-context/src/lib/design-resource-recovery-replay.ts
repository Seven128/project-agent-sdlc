import type {
  DesignResourceAuthoritySourceItem,
  DesignResourceDecisionOrigin,
  DesignResourceDelegation,
  DesignResourceDelta,
  DesignResourceRecoveryCheckpoint,
  DesignResourceRecoveryCreateInput,
  DesignResourceReplayProjection,
} from "./design-resource-recovery-types.js";
import { validateRecoveryProviderAndWriteback } from "./design-resource-recovery-writeback-policy.js";
import { canonicalValueJson } from "./strict-codec.js";

const AUTHORITATIVE_MEANING_SOURCE_KINDS = new Set([
  "outcome_result",
  "requirement",
  "control",
  "acceptance",
  "technical_obligation",
  "risk_fact",
]);

type RecoveryState =
  DesignResourceRecoveryCreateInput | DesignResourceRecoveryCheckpoint;

export function validateDesignResourceRecoverySemantics(
  state: RecoveryState,
): void {
  const scope = new Set(state.base.in_scope_keys);
  const excluded = new Set(state.base.explicitly_excluded_keys);
  assertDisjoint(scope, excluded, "base_scope_and_exclusions_overlap");
  const authoritySources = indexAuthoritySources(state.authority_sources);
  validateBaseMaterialization(state, authoritySources);
  const delegations = indexDelegations(
    state.delegations,
    scope,
    authoritySources,
  );
  const { byId, superseded } = validateDeltas(
    state.deltas,
    scope,
    excluded,
    delegations,
    authoritySources,
  );
  assertDecisionSets(state, byId);
  const unchanged = new Set(state.explicitly_unchanged_keys);
  assertSubset(unchanged, scope, "explicit_unchanged_outside_scope");
  const activeAccepted = activeAcceptedDesignResourceDeltas(
    state.deltas,
    superseded,
  );
  const changed = new Set(
    activeAccepted.flatMap((delta) =>
      delta.operation === "preserve" ? [] : delta.target_keys,
    ),
  );
  assertDisjoint(changed, unchanged, "changed_and_unchanged_overlap");
  for (const delta of activeAccepted)
    if (delta.operation === "preserve")
      assertSubset(
        new Set(delta.target_keys),
        unchanged,
        `preserve_delta_not_explicitly_unchanged:${delta.delta_id}`,
      );
  for (const delta of state.deltas)
    assertSubset(
      new Set(delta.explicitly_unchanged_keys),
      unchanged,
      `delta_unchanged_not_declared:${delta.delta_id}`,
    );
  assertSubset(
    excluded,
    new Set(state.blast_radius_keys),
    "explicit_exclusions_missing_from_blast_universe",
  );
  if (
    state.selected_resource_keys.length &&
    !state.resource_decision_keys.length
  )
    invalid("resource_decision_universe_required");
  validateRecoveryProviderAndWriteback(state, activeAccepted, changed);
}

export function createDesignResourceReplayProjection(
  checkpoint: DesignResourceRecoveryCheckpoint,
): DesignResourceReplayProjection {
  validateDesignResourceRecoverySemantics(checkpoint);
  const superseded = acceptedSupersededDeltaIds(checkpoint.deltas);
  const external = [
    `provider-project:${checkpoint.provider.project.key}`,
    `provider-run:${checkpoint.provider.run.key}`,
    ...checkpoint.provider.resources.map(
      (resource) => `provider-resource:${resource.key}`,
    ),
  ];
  if (checkpoint.design_authority.kind === "external-immutable")
    external.push(`design-authority:${checkpoint.design_authority.locator}`);
  return {
    status: "replayable",
    base: checkpoint.base,
    ordered_active_accepted_deltas: activeAcceptedDesignResourceDeltas(
      checkpoint.deltas,
      superseded,
    ),
    rejected_deltas: checkpoint.deltas.filter(
      (delta) => delta.status === "rejected",
    ),
    unresolved_deltas: checkpoint.deltas.filter(
      (delta) => delta.status === "unresolved",
    ),
    superseded_delta_ids: [...superseded].sort(compareText),
    explicitly_unchanged_keys: checkpoint.explicitly_unchanged_keys,
    design_authority: checkpoint.design_authority,
    external_revalidation_required: external.sort(compareText),
  };
}

function validateDeltas(
  deltas: DesignResourceDelta[],
  scope: Set<string>,
  excluded: Set<string>,
  delegations: Map<string, DesignResourceDelegation>,
  authoritySources: Map<string, DesignResourceAuthoritySourceItem>,
): { byId: Map<string, DesignResourceDelta>; superseded: Set<string> } {
  const byId = new Map<string, DesignResourceDelta>();
  const superseded = new Set<string>();
  for (let index = 0; index < deltas.length; index += 1) {
    const delta = deltas[index];
    if (delta.sequence !== index + 1)
      invalid(
        `delta_sequence:${delta.delta_id}:${delta.sequence}:${index + 1}`,
      );
    if (byId.has(delta.delta_id))
      invalid(`delta_id_duplicate:${delta.delta_id}`);
    assertSubset(
      new Set(delta.target_keys),
      scope,
      `delta_target_outside_scope:${delta.delta_id}`,
    );
    assertDisjoint(
      new Set(delta.target_keys),
      excluded,
      `delta_target_excluded:${delta.delta_id}`,
    );
    assertDisjoint(
      new Set(delta.target_keys),
      new Set(delta.explicitly_unchanged_keys),
      `delta_changed_and_unchanged_overlap:${delta.delta_id}`,
    );
    validateOperationSemantics(delta);
    validateDecisionAuthority(delta, delegations, authoritySources);
    assertDisjoint(
      new Set(delta.supersedes),
      new Set(delta.proposes_replacement_of),
      `delta_replacement_relation_overlap:${delta.delta_id}`,
    );
    for (const earlier of delta.supersedes) {
      const replaced = byId.get(earlier);
      if (!replaced)
        invalid(
          `delta_supersedes_missing_or_later:${delta.delta_id}:${earlier}`,
        );
      if (delta.status !== "accepted")
        invalid(`delta_superseder_not_accepted:${delta.delta_id}`);
      if (replaced.status !== "accepted")
        invalid(`delta_supersedes_nonaccepted:${delta.delta_id}:${earlier}`);
      if (superseded.has(earlier))
        invalid(`delta_superseded_more_than_once:${earlier}`);
      validateReplacementRelationship(delta, replaced, "supersedes");
      superseded.add(earlier);
    }
    for (const earlier of delta.proposes_replacement_of) {
      const proposed = byId.get(earlier);
      if (!proposed)
        invalid(
          `delta_proposes_replacement_missing_or_later:${delta.delta_id}:${earlier}`,
        );
      if (delta.status === "accepted")
        invalid(`accepted_delta_uses_proposal_relation:${delta.delta_id}`);
      if (proposed.status !== "accepted" || superseded.has(earlier))
        invalid(
          `delta_proposes_replacement_of_inactive:${delta.delta_id}:${earlier}`,
        );
      validateReplacementRelationship(
        delta,
        proposed,
        "proposes_replacement_of",
      );
    }
    byId.set(delta.delta_id, delta);
  }
  return { byId, superseded };
}

function validateOperationSemantics(delta: DesignResourceDelta): void {
  const before = canonicalValueJson(delta.before_semantics);
  const after = canonicalValueJson(delta.after_semantics);
  if (delta.operation === "add" && delta.before_semantics !== null)
    invalid(`delta_add_before_must_be_null:${delta.delta_id}`);
  if (delta.operation === "remove" && delta.after_semantics !== null)
    invalid(`delta_remove_after_must_be_null:${delta.delta_id}`);
  if (delta.operation === "preserve" && before !== after)
    invalid(`delta_preserve_semantics_changed:${delta.delta_id}`);
  if (delta.operation !== "preserve" && before === after)
    invalid(`delta_change_semantics_equal:${delta.delta_id}`);
  if (
    delta.operation === "preserve" &&
    (delta.supersedes.length || delta.proposes_replacement_of.length)
  )
    invalid(`delta_preserve_cannot_replace:${delta.delta_id}`);
  if (delta.status === "accepted" && !delta.source_refs.length)
    invalid(`accepted_delta_source_refs_required:${delta.delta_id}`);
}

function validateDecisionAuthority(
  delta: DesignResourceDelta,
  delegations: Map<string, DesignResourceDelegation>,
  authoritySources: Map<string, DesignResourceAuthoritySourceItem>,
): void {
  for (const sourceRef of delta.source_refs)
    if (!authoritySources.has(sourceRef))
      invalid(`delta_source_ref_unresolved:${delta.delta_id}:${sourceRef}`);
  if (
    delta.status === "accepted" &&
    delta.origin !== "necessary-derived" &&
    delta.decision_authority === "none"
  )
    invalid(`accepted_delta_authority_required:${delta.delta_id}`);
  if (
    delta.status === "accepted" &&
    delta.origin === "provider-suggested" &&
    delta.decision_authority !== "explicit-user" &&
    !delta.decision_authority.startsWith("delegated:")
  )
    invalid(`provider_suggestion_not_authorized:${delta.delta_id}`);
  if (
    delta.status === "accepted" &&
    delta.origin === "provider-suggested" &&
    !delta.evidence_refs.length
  )
    invalid(`provider_suggestion_evidence_required:${delta.delta_id}`);
  if (
    delta.status === "accepted" &&
    delta.decision_authority === "explicit-user" &&
    !delta.source_refs.some(
      (sourceRef) =>
        authoritySources.get(sourceRef)?.source_item_kind === "decision",
    )
  )
    invalid(`explicit_user_source_decision_required:${delta.delta_id}`);
  let delegation: DesignResourceDelegation | undefined;
  if (delta.decision_authority.startsWith("delegated:")) {
    const key = delta.decision_authority.slice("delegated:".length);
    delegation = delegations.get(key);
    if (!delegation) invalid(`delegation_not_found:${delta.delta_id}:${key}`);
    if (!delta.source_refs.includes(delegation.source_ref))
      invalid(`delegation_source_not_bound:${delta.delta_id}:${key}`);
    if (!delegation.allowed_origins.includes(delta.origin))
      invalid(`delegation_origin_not_allowed:${delta.delta_id}:${key}`);
    assertSubset(
      new Set(delta.target_keys),
      new Set(delegation.allowed_target_keys),
      `delegation_target_not_allowed:${delta.delta_id}:${key}`,
    );
  }
  if (
    delta.status === "accepted" &&
    delta.semantic_kind !== "exact-visual" &&
    !delta.source_refs.some((sourceRef) => {
      if (sourceRef === delegation?.source_ref) return false;
      const kind = authoritySources.get(sourceRef)?.source_item_kind ?? "";
      return (
        AUTHORITATIVE_MEANING_SOURCE_KINDS.has(kind) ||
        (delta.decision_authority === "explicit-user" && kind === "decision")
      );
    })
  )
    invalid(`nonvisual_meaning_source_required:${delta.delta_id}`);
}

function indexDelegations(
  values: DesignResourceDelegation[],
  scope: Set<string>,
  authoritySources: Map<string, DesignResourceAuthoritySourceItem>,
): Map<string, DesignResourceDelegation> {
  const result = new Map<string, DesignResourceDelegation>();
  for (const value of values) {
    if (result.has(value.key)) invalid(`delegation_duplicate:${value.key}`);
    if (new Set(value.allowed_origins).size !== value.allowed_origins.length)
      invalid(`delegation_origin_duplicate:${value.key}`);
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

function indexAuthoritySources(
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

function validateBaseMaterialization(
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

function validateReplacementRelationship(
  replacement: DesignResourceDelta,
  previous: DesignResourceDelta,
  relation: "supersedes" | "proposes_replacement_of",
): void {
  assertEqualSet(
    new Set(replacement.target_keys),
    new Set(previous.target_keys),
    `delta_${relation}_target_mismatch:${replacement.delta_id}:${previous.delta_id}`,
  );
  if (
    canonicalValueJson(replacement.before_semantics) !==
    canonicalValueJson(previous.after_semantics)
  )
    invalid(
      `delta_${relation}_semantic_mismatch:${replacement.delta_id}:${previous.delta_id}`,
    );
  if (replacement.semantic_kind !== previous.semantic_kind)
    invalid(
      `delta_${relation}_semantic_kind_mismatch:${replacement.delta_id}:${previous.delta_id}`,
    );
}

export function acceptedSupersededDeltaIds(
  deltas: DesignResourceDelta[],
): Set<string> {
  return new Set(
    deltas
      .filter((delta) => delta.status === "accepted")
      .flatMap((delta) => delta.supersedes),
  );
}

export function activeAcceptedDesignResourceDeltas(
  deltas: DesignResourceDelta[],
  superseded = acceptedSupersededDeltaIds(deltas),
): DesignResourceDelta[] {
  return deltas.filter(
    (delta) => delta.status === "accepted" && !superseded.has(delta.delta_id),
  );
}

function assertDecisionSets(
  state: RecoveryState,
  byId: Map<string, DesignResourceDelta>,
): void {
  const expected = {
    accepted_delta_ids: state.deltas
      .filter((delta) => delta.status === "accepted")
      .map((delta) => delta.delta_id),
    rejected_delta_ids: state.deltas
      .filter((delta) => delta.status === "rejected")
      .map((delta) => delta.delta_id),
    unresolved_delta_ids: state.deltas
      .filter((delta) => delta.status === "unresolved")
      .map((delta) => delta.delta_id),
  };
  for (const [key, values] of Object.entries(state.decision_sets)) {
    for (const value of values)
      if (!byId.has(value))
        invalid(`decision_set_delta_missing:${key}:${value}`);
    assertEqualSet(
      new Set(values),
      new Set(expected[key as keyof typeof expected]),
      `decision_set_mismatch:${key}`,
    );
  }
}

function assertSubset(
  candidate: Set<string>,
  owner: Set<string>,
  code: string,
): void {
  const outside = [...candidate].filter((value) => !owner.has(value));
  if (outside.length) invalid(`${code}:${outside.sort(compareText).join(",")}`);
}

function assertDisjoint(
  left: Set<string>,
  right: Set<string>,
  code: string,
): void {
  const overlap = [...left].filter((value) => right.has(value));
  if (overlap.length) invalid(`${code}:${overlap.sort(compareText).join(",")}`);
}

function assertEqualSet(
  left: Set<string>,
  right: Set<string>,
  code: string,
): void {
  if (left.size !== right.size || [...left].some((value) => !right.has(value)))
    invalid(code);
}

function invalid(code: string): never {
  throw new Error(`design_resource_recovery_invalid:${code}`);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
