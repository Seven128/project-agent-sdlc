import type {
  DesignResourceDecisionOrigin,
  DesignResourceDelegation,
  DesignResourceDelta,
  DesignResourceRecoveryCheckpoint,
  DesignResourceRecoveryCreateInput,
  DesignResourceReplayProjection,
} from "./design-resource-recovery-types.js";
import { validateRecoveryProviderAndWriteback } from "./design-resource-recovery-writeback-policy.js";
import { canonicalValueJson } from "./strict-codec.js";

type RecoveryState =
  DesignResourceRecoveryCreateInput | DesignResourceRecoveryCheckpoint;

export function validateDesignResourceRecoverySemantics(
  state: RecoveryState,
): void {
  const scope = new Set(state.base.in_scope_keys);
  const excluded = new Set(state.base.explicitly_excluded_keys);
  assertDisjoint(scope, excluded, "base_scope_and_exclusions_overlap");
  const delegations = indexDelegations(state.delegations, scope);
  const { byId, superseded } = validateDeltas(
    state.deltas,
    scope,
    excluded,
    delegations,
  );
  assertDecisionSets(state, byId);
  const unchanged = new Set(state.explicitly_unchanged_keys);
  assertSubset(unchanged, scope, "explicit_unchanged_outside_scope");
  const activeAccepted = state.deltas.filter(
    (delta) => delta.status === "accepted" && !superseded.has(delta.delta_id),
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
  validateRecoveryProviderAndWriteback(state, activeAccepted, changed);
}

export function createDesignResourceReplayProjection(
  checkpoint: DesignResourceRecoveryCheckpoint,
): DesignResourceReplayProjection {
  validateDesignResourceRecoverySemantics(checkpoint);
  const superseded = new Set(
    checkpoint.deltas.flatMap((delta) => delta.supersedes),
  );
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
    ordered_active_accepted_deltas: checkpoint.deltas.filter(
      (delta) => delta.status === "accepted" && !superseded.has(delta.delta_id),
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
    validateDecisionAuthority(delta, delegations);
    for (const earlier of delta.supersedes) {
      if (!byId.has(earlier))
        invalid(
          `delta_supersedes_missing_or_later:${delta.delta_id}:${earlier}`,
        );
      if (superseded.has(earlier))
        invalid(`delta_superseded_more_than_once:${earlier}`);
      superseded.add(earlier);
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
  if (delta.status === "accepted" && !delta.source_refs.length)
    invalid(`accepted_delta_source_refs_required:${delta.delta_id}`);
}

function validateDecisionAuthority(
  delta: DesignResourceDelta,
  delegations: Map<string, DesignResourceDelegation>,
): void {
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
  if (!delta.decision_authority.startsWith("delegated:")) return;
  const key = delta.decision_authority.slice("delegated:".length);
  const delegation = delegations.get(key);
  if (!delegation) invalid(`delegation_not_found:${delta.delta_id}:${key}`);
  if (!delegation.allowed_origins.includes(delta.origin))
    invalid(`delegation_origin_not_allowed:${delta.delta_id}:${key}`);
  assertSubset(
    new Set(delta.target_keys),
    new Set(delegation.allowed_target_keys),
    `delegation_target_not_allowed:${delta.delta_id}:${key}`,
  );
}

function indexDelegations(
  values: DesignResourceDelegation[],
  scope: Set<string>,
): Map<string, DesignResourceDelegation> {
  const result = new Map<string, DesignResourceDelegation>();
  for (const value of values) {
    if (result.has(value.key)) invalid(`delegation_duplicate:${value.key}`);
    if (new Set(value.allowed_origins).size !== value.allowed_origins.length)
      invalid(`delegation_origin_duplicate:${value.key}`);
    assertSubset(
      new Set(value.allowed_target_keys),
      scope,
      `delegation_target_outside_scope:${value.key}`,
    );
    result.set(value.key, value);
  }
  return result;
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
