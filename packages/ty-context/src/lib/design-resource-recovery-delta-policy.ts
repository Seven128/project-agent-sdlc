import { validateDesignResourceDeltaAuthority } from "./design-resource-recovery-authority-policy.js";
import type {
  DesignResourceAuthoritySourceItem,
  DesignResourceDelegation,
  DesignResourceDelta,
} from "./design-resource-recovery-types.js";
import { canonicalValueJson } from "./strict-codec.js";

export function validateDesignResourceDeltas(
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
    validateDeltaShape(delta, index, byId, scope, excluded);
    validateDesignResourceDeltaAuthority(delta, delegations, authoritySources);
    assertDisjoint(
      new Set(delta.supersedes),
      new Set(delta.proposes_replacement_of),
      `delta_replacement_relation_overlap:${delta.delta_id}`,
    );
    validateSupersession(delta, byId, superseded);
    validateProposedReplacement(delta, byId, superseded);
    byId.set(delta.delta_id, delta);
  }
  return { byId, superseded };
}

function validateDeltaShape(
  delta: DesignResourceDelta,
  index: number,
  byId: Map<string, DesignResourceDelta>,
  scope: Set<string>,
  excluded: Set<string>,
): void {
  assertUnique(delta.target_keys, `delta_target_duplicate:${delta.delta_id}`);
  assertUnique(
    delta.supersedes,
    `delta_supersedes_duplicate:${delta.delta_id}`,
  );
  assertUnique(
    delta.proposes_replacement_of,
    `delta_proposes_replacement_duplicate:${delta.delta_id}`,
  );
  assertUnique(
    delta.evidence_refs,
    `delta_evidence_ref_duplicate:${delta.delta_id}`,
  );
  assertUnique(
    delta.source_refs,
    `delta_source_ref_duplicate:${delta.delta_id}`,
  );
  assertUnique(
    delta.explicitly_unchanged_keys,
    `delta_unchanged_duplicate:${delta.delta_id}`,
  );
  if (delta.sequence !== index + 1)
    invalid(`delta_sequence:${delta.delta_id}:${delta.sequence}:${index + 1}`);
  if (byId.has(delta.delta_id)) invalid(`delta_id_duplicate:${delta.delta_id}`);
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
}

function validateSupersession(
  delta: DesignResourceDelta,
  byId: Map<string, DesignResourceDelta>,
  superseded: Set<string>,
): void {
  for (const earlier of delta.supersedes) {
    const replaced = byId.get(earlier);
    if (!replaced)
      invalid(`delta_supersedes_missing_or_later:${delta.delta_id}:${earlier}`);
    if (delta.status !== "accepted")
      invalid(`delta_superseder_not_accepted:${delta.delta_id}`);
    if (replaced.status !== "accepted")
      invalid(`delta_supersedes_nonaccepted:${delta.delta_id}:${earlier}`);
    if (superseded.has(earlier))
      invalid(`delta_superseded_more_than_once:${earlier}`);
    validateReplacementRelationship(delta, replaced, "supersedes");
    superseded.add(earlier);
  }
}

function validateProposedReplacement(
  delta: DesignResourceDelta,
  byId: Map<string, DesignResourceDelta>,
  superseded: Set<string>,
): void {
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
    validateReplacementRelationship(delta, proposed, "proposes_replacement_of");
  }
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
