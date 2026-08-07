import type {
  DesignResourceDelta,
  DesignResourceRecoveryCheckpoint,
  DesignResourceRecoveryCreateInput,
  DesignResourceSelectedResourceBinding,
} from "./design-resource-recovery-types.js";

type RecoveryState =
  DesignResourceRecoveryCreateInput | DesignResourceRecoveryCheckpoint;

export function indexDesignResourceSelectedResources(
  state: RecoveryState,
): Map<string, DesignResourceSelectedResourceBinding> {
  uniqueRows(
    state.selected_resource_bindings.map((row) => row.key),
    "selected_resource_key",
  );
  uniqueRows(
    state.selected_resource_bindings.map((row) => row.locator),
    "selected_resource_locator",
  );
  const provider = new Map(
    state.provider.resources.map((row) => [row.key, row]),
  );
  const result = new Map<string, DesignResourceSelectedResourceBinding>();
  for (const row of state.selected_resource_bindings) {
    requireNonEmpty(
      row.condition_refs,
      `selected_resource_conditions:${row.key}`,
    );
    uniqueRows(row.condition_refs, `selected_resource_condition:${row.key}`);
    const declared = provider.get(row.key);
    if (!declared) invalid(`selected_resource_not_declared:${row.key}`);
    if (declared.raw_byte_digest !== row.raw_byte_digest)
      invalid(`selected_resource_digest_mismatch:${row.key}`);
    result.set(row.key, row);
  }
  return result;
}

export function validateDesignResourceDecisionCatalog(
  rows: RecoveryState["audit_expectations"]["resource_decisions"],
  deltasById: Map<string, DesignResourceDelta>,
  activeChangedByTarget: Map<string, string[]>,
  superseded: Set<string>,
  selectedResources: Map<string, DesignResourceSelectedResourceBinding>,
): void {
  const bindingIds: string[] = [];
  const bindingTuples: string[] = [];
  const activeOwnerTuples: string[] = [];
  for (const row of rows) {
    validateDesignResourceConditions(
      [row.resource_ref],
      row.condition_refs,
      selectedResources,
      `resource_decision_expectation:${row.key}`,
    );
    uniqueRows(
      row.bindings.map((binding) => binding.binding_id),
      `resource_decision_binding_id:${row.key}`,
    );
    for (const binding of row.bindings) {
      bindingIds.push(binding.binding_id);
      bindingTuples.push(
        resourceBindingIdentity(
          row.resource_ref,
          binding.target_key,
          binding.delta_id,
        ),
      );
      const delta = deltasById.get(binding.delta_id);
      if (!delta)
        invalid(
          `resource_decision_delta_unknown:${row.key}:${binding.delta_id}`,
        );
      if (!delta.target_keys.includes(binding.target_key))
        invalid(
          `resource_decision_target_mismatch:${row.key}:${binding.target_key}:${binding.delta_id}`,
        );
      if (delta.semantic_kind !== row.semantic_kind)
        invalid(
          `resource_decision_semantic_kind_mismatch:${row.key}:${binding.delta_id}`,
        );
      const isActiveChanged =
        delta.status === "accepted" &&
        !superseded.has(delta.delta_id) &&
        delta.operation !== "preserve";
      validateFrozenDisposition(
        row,
        binding,
        delta,
        isActiveChanged,
        selectedResources,
      );
      if (isActiveChanged) activeOwnerTuples.push(deltaTarget(binding));
    }
  }
  uniqueRows(bindingIds, "resource_decision_binding_id_global");
  uniqueRows(bindingTuples, "resource_decision_binding_tuple_global");
  const expectedActive = [...activeChangedByTarget].flatMap(
    ([target, deltaIds]) =>
      deltaIds.map((deltaId) => `${deltaId}\u0000${target}`),
  );
  assertExactSet(
    activeOwnerTuples,
    expectedActive,
    "resource_decision_active_owner_universe",
  );
}

export function validateDesignResourceConditions(
  resourceRefs: string[],
  conditionRefs: string[],
  selected: Map<string, DesignResourceSelectedResourceBinding>,
  label: string,
): void {
  requireNonEmpty(resourceRefs, `${label}:resource_refs_empty`);
  requireNonEmpty(conditionRefs, `${label}:condition_refs_empty`);
  uniqueRows(resourceRefs, `${label}:resource_ref`);
  uniqueRows(conditionRefs, `${label}:condition_ref`);
  for (const resourceRef of resourceRefs) {
    const resource = selected.get(resourceRef);
    if (!resource) invalid(`${label}:resource_unselected:${resourceRef}`);
    for (const condition of conditionRefs)
      if (!resource.condition_refs.includes(condition))
        invalid(`${label}:condition_undeclared:${resourceRef}:${condition}`);
  }
}

function validateFrozenDisposition(
  row: RecoveryState["audit_expectations"]["resource_decisions"][number],
  binding: RecoveryState["audit_expectations"]["resource_decisions"][number]["bindings"][number],
  delta: DesignResourceDelta,
  isActiveChanged: boolean,
  selectedResources: Map<string, DesignResourceSelectedResourceBinding>,
): void {
  const disposition = binding.final_disposition;
  if (!isActiveChanged) {
    const required =
      delta.status === "unresolved" ? "unresolved" : "not-adopted";
    if (disposition.kind !== required)
      invalid(
        `resource_decision_inactive_disposition:${row.key}:${binding.binding_id}:${required}`,
      );
    return;
  }
  if (disposition.kind === "proposal-written") return;
  if (disposition.kind !== "resource-owned-exact-visual")
    invalid(
      `resource_decision_active_disposition:${row.key}:${binding.binding_id}`,
    );
  if (delta.semantic_kind !== "exact-visual")
    invalid(`resource_decision_nonvisual_resource_owner:${row.key}`);
  if (disposition.resource_ref !== row.resource_ref)
    invalid(`resource_decision_owner_resource:${binding.binding_id}`);
  assertExactSet(
    disposition.condition_refs,
    row.condition_refs,
    `resource_decision_owner_conditions:${binding.binding_id}`,
  );
  const selected = selectedResources.get(disposition.resource_ref);
  if (!selected)
    invalid(`resource_decision_owner_unselected:${binding.binding_id}`);
  const owner = disposition.downstream_owner;
  if (
    owner.resource_key !== disposition.resource_ref ||
    owner.locator !== selected.locator ||
    owner.raw_byte_digest !== selected.raw_byte_digest
  )
    invalid(`resource_decision_owner_identity:${binding.binding_id}`);
  const requiredOwnerKind =
    selected.identity_kind === "repository-snapshot"
      ? "selected-source-record"
      : "external-immutable";
  if (owner.kind !== requiredOwnerKind)
    invalid(`resource_decision_owner_kind:${binding.binding_id}`);
}

function deltaTarget(binding: {
  delta_id: string;
  target_key: string;
}): string {
  return `${binding.delta_id}\u0000${binding.target_key}`;
}

function resourceBindingIdentity(
  resourceRef: string,
  targetKey: string,
  deltaId: string,
): string {
  return `${resourceRef}\u0000${targetKey}\u0000${deltaId}`;
}

function requireNonEmpty(values: unknown[], code: string): void {
  if (!values.length) invalid(code);
}

function uniqueRows(values: string[], code: string): void {
  if (new Set(values).size !== values.length) invalid(`duplicate:${code}`);
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
