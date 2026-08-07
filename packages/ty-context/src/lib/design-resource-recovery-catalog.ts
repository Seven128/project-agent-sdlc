import type {
  DesignResourceAuthoritySourceItem,
  DesignResourceDelta,
  DesignResourceRecoveryCheckpoint,
  DesignResourceRecoveryCreateInput,
  DesignResourceSelectedResourceBinding,
} from "./design-resource-recovery-types.js";
import {
  indexDesignResourceSelectedResources,
  validateDesignResourceConditions,
  validateDesignResourceDecisionCatalog,
} from "./design-resource-recovery-catalog-resources.js";

type RecoveryState =
  DesignResourceRecoveryCreateInput | DesignResourceRecoveryCheckpoint;

export interface ValidatedRecoveryCatalog {
  changed: Set<string>;
  unchanged: Set<string>;
  selectedResources: Map<string, DesignResourceSelectedResourceBinding>;
}

export function validateDesignResourceRecoveryCatalog(
  state: RecoveryState,
  deltasById: Map<string, DesignResourceDelta>,
  activeAccepted: DesignResourceDelta[],
  superseded: Set<string>,
  authoritySources: Map<string, DesignResourceAuthoritySourceItem>,
): ValidatedRecoveryCatalog {
  const catalog = state.audit_expectations;
  uniqueRows(
    catalog.changed.map((row) => row.key),
    "changed_key",
  );
  uniqueRows(
    catalog.unchanged.map((row) => row.key),
    "unchanged_key",
  );
  uniqueRows(
    catalog.resource_decisions.map((row) => row.key),
    "resource_decision_key",
  );
  uniqueRows(
    catalog.blast_radius.map((row) => row.key),
    "blast_radius_key",
  );
  uniqueRows(
    catalog.inactive_delta_leakage.map((row) => row.delta_id),
    "inactive_delta_id",
  );
  const selectedResources = indexDesignResourceSelectedResources(state);
  const activeChangedByTarget = activeChangedTargetIndex(activeAccepted);
  const changed = new Set(activeChangedByTarget.keys());
  const unchanged = new Set(catalog.unchanged.map((row) => row.key));
  assertExactSet(
    catalog.changed.map((row) => row.key),
    [...changed],
    "audit_expectation_changed_keys",
  );
  assertDisjoint(changed, unchanged, "changed_and_unchanged_overlap");
  const scope = new Set(state.base.in_scope_keys);
  assertSubset(unchanged, scope, "explicit_unchanged_outside_scope");
  for (const delta of activeAccepted) {
    if (delta.operation === "preserve")
      assertSubset(
        new Set(delta.target_keys),
        unchanged,
        `preserve_delta_not_explicitly_unchanged:${delta.delta_id}`,
      );
  }
  for (const delta of state.deltas)
    assertSubset(
      new Set(delta.explicitly_unchanged_keys),
      unchanged,
      `delta_unchanged_not_declared:${delta.delta_id}`,
    );
  for (const row of catalog.changed) {
    assertExactSet(
      row.delta_ids,
      activeChangedByTarget.get(row.key) ?? [],
      `audit_expectation_changed_delta_ids:${row.key}`,
    );
    validateDesignResourceConditions(
      row.resource_refs,
      row.condition_refs,
      selectedResources,
      `audit_expectation_changed:${row.key}`,
    );
  }
  for (const row of catalog.unchanged) {
    validateDesignResourceConditions(
      row.resource_refs,
      row.condition_refs,
      selectedResources,
      `audit_expectation_unchanged:${row.key}`,
    );
    requireNonEmpty(row.basis_source_refs, `unchanged_basis_empty:${row.key}`);
    for (const sourceRef of row.basis_source_refs)
      if (!authoritySources.has(sourceRef))
        invalid(`unchanged_basis_source_unresolved:${row.key}:${sourceRef}`);
  }
  const blast = new Set(catalog.blast_radius.map((row) => row.key));
  assertSubset(
    new Set(state.base.explicitly_excluded_keys),
    blast,
    "explicit_exclusions_missing_from_blast_universe",
  );
  validateInactiveCatalog(state, catalog.inactive_delta_leakage, superseded);
  validateDesignResourceDecisionCatalog(
    catalog.resource_decisions,
    deltasById,
    activeChangedByTarget,
    superseded,
    selectedResources,
  );
  return { changed, unchanged, selectedResources };
}

function activeChangedTargetIndex(
  activeAccepted: DesignResourceDelta[],
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const delta of activeAccepted) {
    if (delta.operation === "preserve") continue;
    for (const target of delta.target_keys) {
      const owners = result.get(target) ?? [];
      owners.push(delta.delta_id);
      result.set(target, owners);
    }
  }
  for (const [target, owners] of result)
    if (owners.length !== 1)
      invalid(`active_accepted_target_collision:${target}:${owners.join(",")}`);
  return result;
}

function validateInactiveCatalog(
  state: RecoveryState,
  rows: RecoveryState["audit_expectations"]["inactive_delta_leakage"],
  superseded: Set<string>,
): void {
  const expected = new Map<string, string>();
  for (const delta of state.deltas) {
    if (delta.status === "rejected") expected.set(delta.delta_id, "rejected");
    else if (delta.status === "unresolved")
      expected.set(delta.delta_id, "unresolved");
  }
  for (const deltaId of superseded) expected.set(deltaId, "superseded");
  assertExactSet(
    rows.map((row) => row.delta_id),
    [...expected.keys()],
    "inactive_delta_expectation_ids",
  );
  for (const row of rows)
    if (expected.get(row.delta_id) !== row.reason)
      invalid(`inactive_delta_reason_mismatch:${row.delta_id}`);
}

function requireNonEmpty(values: unknown[], code: string): void {
  if (!values.length) invalid(code);
}

function uniqueRows(values: string[], code: string): void {
  if (new Set(values).size !== values.length) invalid(`duplicate:${code}`);
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

function assertExactSet(
  actual: string[],
  expected: string[],
  code: string,
): void {
  uniqueRows(actual, `${code}:actual`);
  uniqueRows(expected, `${code}:expected`);
  const left = [...actual].sort(compareText);
  const right = [...expected].sort(compareText);
  if (
    left.length !== right.length ||
    left.some((value, index) => value !== right[index])
  )
    invalid(code);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function invalid(code: string): never {
  throw new Error(`design_resource_recovery_invalid:${code}`);
}
