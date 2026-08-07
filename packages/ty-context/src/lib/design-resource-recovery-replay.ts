import type {
  DesignResourceDelta,
  DesignResourceRecoveryCheckpoint,
  DesignResourceRecoveryCreateInput,
  DesignResourceReplayProjection,
} from "./design-resource-recovery-types.js";
import {
  indexDesignResourceAuthoritySources,
  indexDesignResourceDelegations,
  validateDesignResourceBaseMaterialization,
} from "./design-resource-recovery-authority-policy.js";
import { validateDesignResourceDeltas } from "./design-resource-recovery-delta-policy.js";
import { validateDesignResourceRecoveryCatalog } from "./design-resource-recovery-catalog.js";
import { validateRecoveryProviderAndWriteback } from "./design-resource-recovery-writeback-policy.js";

type RecoveryState =
  DesignResourceRecoveryCreateInput | DesignResourceRecoveryCheckpoint;

export function validateDesignResourceRecoverySemantics(
  state: RecoveryState,
): void {
  validateTopLevelUniqueness(state);
  const scope = new Set(state.base.in_scope_keys);
  const excluded = new Set(state.base.explicitly_excluded_keys);
  assertDisjoint(scope, excluded, "base_scope_and_exclusions_overlap");
  const authoritySources = indexDesignResourceAuthoritySources(
    state.authority_sources,
  );
  validateDesignResourceBaseMaterialization(state, authoritySources);
  const delegations = indexDesignResourceDelegations(
    state.delegations,
    scope,
    authoritySources,
  );
  const { byId, superseded } = validateDesignResourceDeltas(
    state.deltas,
    scope,
    excluded,
    delegations,
    authoritySources,
  );
  assertDecisionSets(state, byId);
  const activeAccepted = activeAcceptedDesignResourceDeltas(
    state.deltas,
    superseded,
  );
  validateActiveAcceptedTargetUniqueness(activeAccepted);
  validateDesignResourceRecoveryCatalog(
    state,
    byId,
    activeAccepted,
    superseded,
    authoritySources,
  );
  if (
    state.selected_resource_bindings.length &&
    !state.audit_expectations.resource_decisions.length
  )
    invalid("resource_decision_universe_required");
  validateRecoveryProviderAndWriteback(state, activeAccepted);
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
    explicitly_unchanged_keys: checkpoint.audit_expectations.unchanged.map(
      (row) => row.key,
    ),
    design_authority: checkpoint.design_authority,
    external_revalidation_required: external.sort(compareText),
  };
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
    assertUnique(values, `decision_set_duplicate:${key}`);
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

function validateTopLevelUniqueness(state: RecoveryState): void {
  assertUnique(state.base.in_scope_keys, "base_in_scope_duplicate");
  assertUnique(
    state.base.explicitly_excluded_keys,
    "base_explicit_exclusion_duplicate",
  );
  assertUnique(
    state.provider.resources.map((resource) => resource.key),
    "provider_resource_key_duplicate",
  );
  assertUnique(
    state.provider.resources.map((resource) => resource.locator),
    "provider_resource_locator_duplicate",
  );
}

function validateActiveAcceptedTargetUniqueness(
  activeAccepted: DesignResourceDelta[],
): void {
  const owner = new Map<string, string>();
  for (const delta of activeAccepted)
    for (const target of delta.target_keys) {
      const prior = owner.get(target);
      if (prior)
        invalid(
          `active_accepted_target_collision:${target}:${prior},${delta.delta_id}`,
        );
      owner.set(target, delta.delta_id);
    }
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
