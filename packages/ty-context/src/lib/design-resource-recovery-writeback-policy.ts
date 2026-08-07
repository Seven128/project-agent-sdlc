import type {
  DesignResourceExactPatchOperation,
  DesignResourcePatchSemanticBinding,
  DesignResourceTextSemanticProjection,
} from "./design-resource-recovery-patch-types.js";
import type {
  DesignResourceDelta,
  DesignResourceRecoveryCheckpoint,
  DesignResourceRecoveryCreateInput,
} from "./design-resource-recovery-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

type RecoveryState =
  DesignResourceRecoveryCreateInput | DesignResourceRecoveryCheckpoint;

export function validateRecoveryProviderAndWriteback(
  state: RecoveryState,
  activeAccepted: DesignResourceDelta[],
): void {
  const resourceKeys = uniqueValues(
    state.provider.resources.map((resource) => resource.key),
    "provider_resource_key_duplicate",
  );
  uniqueValues(
    state.provider.resources.map((resource) => resource.locator),
    "provider_resource_locator_duplicate",
  );
  const selectedKeys = uniqueValues(
    state.selected_resource_bindings.map((resource) => resource.key),
    "selected_resource_key_duplicate",
  );
  assertSubset(selectedKeys, resourceKeys, "selected_resource_not_declared");
  const proposalBindings = frozenProposalBindings(state, activeAccepted);
  if (!proposalBindings.size) {
    if (state.writeback) invalid("writeback_without_proposal_owner");
    return;
  }
  if (!state.writeback) invalid("proposal_owner_writeback_required");
  const writeback = state.writeback;
  if (writeback.target_locator === state.base.locator)
    invalid("writeback_target_must_not_replace_immutable_base");
  assertExactSet(
    writeback.proposal_written_delta_ids,
    [...new Set([...proposalBindings.values()].map((row) => row.deltaId))],
    "writeback_proposal_delta_set_mismatch",
  );
  validatePatch(writeback.patch.operations, activeAccepted, proposalBindings);
  const patchIdentity = sha256Hex(canonicalValueJson(writeback.patch));
  if (patchIdentity !== writeback.patch_identity)
    invalid(
      `patch_identity_mismatch:${writeback.patch_identity}:${patchIdentity}`,
    );
  uniqueValues(
    writeback.resource_identities.map((resource) => resource.key),
    "writeback_resource_identity_duplicate",
  );
  const resources = new Map(
    state.provider.resources.map((resource) => [resource.key, resource]),
  );
  assertExactSet(
    writeback.resource_identities.map((row) => row.key),
    [...selectedKeys],
    "writeback_resource_set_mismatch",
  );
  for (const identity of writeback.resource_identities) {
    const provider = resources.get(identity.key);
    if (!provider || provider.raw_byte_digest !== identity.raw_byte_digest)
      invalid(`writeback_resource_identity_mismatch:${identity.key}`);
  }
}

interface FrozenProposalBinding {
  deltaId: string;
  targetKey: string;
  operationId: string;
}

function frozenProposalBindings(
  state: RecoveryState,
  activeAccepted: DesignResourceDelta[],
): Map<string, FrozenProposalBinding> {
  const active = new Set(
    activeAccepted
      .filter((delta) => delta.operation !== "preserve")
      .flatMap((delta) =>
        delta.target_keys.map((target) => deltaTarget(delta.delta_id, target)),
      ),
  );
  const result = new Map<string, FrozenProposalBinding>();
  const operationIds: string[] = [];
  for (const row of state.audit_expectations.resource_decisions)
    for (const binding of row.bindings) {
      if (binding.final_disposition.kind !== "proposal-written") continue;
      const identity = deltaTarget(binding.delta_id, binding.target_key);
      if (!active.has(identity))
        invalid(`proposal_owner_inactive:${binding.binding_id}`);
      if (result.has(identity))
        invalid(`proposal_owner_duplicate:${binding.binding_id}`);
      const item = {
        deltaId: binding.delta_id,
        targetKey: binding.target_key,
        operationId: binding.final_disposition.operation_id,
      };
      result.set(identity, item);
      operationIds.push(item.operationId);
    }
  uniqueValues(operationIds, "proposal_owner_operation_duplicate");
  return result;
}

function validatePatch(
  operations: DesignResourceExactPatchOperation[],
  activeAccepted: DesignResourceDelta[],
  expectedBindings: Map<string, FrozenProposalBinding>,
): void {
  uniqueValues(
    operations.map((operation) => operation.operation_id),
    "patch_operation_id_duplicate",
  );
  const activeById = new Map(
    activeAccepted.map((delta) => [delta.delta_id, delta]),
  );
  const bindingIdentities: string[] = [];
  uniqueValues(
    operations.map((operation) => operation.before_text_sha256),
    "patch_source_span_duplicate",
  );
  for (const operation of operations) {
    if (operation.before_text === operation.after_text)
      invalid(`patch_operation_no_change:${operation.operation_id}`);
    assertDigest(
      operation.before_text_sha256,
      sha256Hex(operation.before_text),
      `patch_before_text_digest:${operation.operation_id}`,
    );
    assertDigest(
      operation.after_text_sha256,
      sha256Hex(operation.after_text),
      `patch_after_text_digest:${operation.operation_id}`,
    );
    const operationBinding = validateSemanticBinding(
      operation,
      operation.semantic_binding,
      activeById,
    );
    const frozen = expectedBindings.get(operationBinding.identity);
    if (!frozen)
      invalid(
        `patch_binding_not_proposal_owned:${operation.operation_id}:${operationBinding.identity}`,
      );
    if (frozen.operationId !== operation.operation_id)
      invalid(`patch_operation_owner_mismatch:${operation.operation_id}`);
    bindingIdentities.push(operationBinding.identity);
  }
  uniqueValues(bindingIdentities, "patch_binding_duplicate_global");
  assertExactSet(
    bindingIdentities,
    [...expectedBindings.keys()],
    "writeback_patch_binding_universe_mismatch",
  );
}

function validateSemanticBinding(
  operation: DesignResourceExactPatchOperation,
  binding: DesignResourcePatchSemanticBinding,
  activeById: Map<string, DesignResourceDelta>,
): { identity: string } {
  const operationId = operation.operation_id;
  const delta = activeById.get(binding.delta_id);
  if (!delta)
    invalid(
      `patch_binding_inactive_or_unknown:${operationId}:${binding.delta_id}`,
    );
  if (delta.operation === "preserve")
    invalid(`patch_binding_preserve_delta:${operationId}:${binding.delta_id}`);
  if (
    operation.delta_id !== binding.delta_id ||
    operation.target_key !== binding.target_key
  )
    invalid(`patch_operation_binding_identity:${operationId}`);
  if (!delta.target_keys.includes(binding.target_key))
    invalid(
      `patch_binding_target_mismatch:${operationId}:${binding.delta_id}:${binding.target_key}`,
    );
  if (operation.operation !== delta.operation)
    invalid(`patch_operation_semantic_operation:${operationId}`);
  assertDigest(
    binding.before_semantics_sha256,
    sha256Hex(canonicalValueJson(delta.before_semantics)),
    `patch_before_semantics:${operationId}:${binding.delta_id}:${binding.target_key}`,
  );
  assertDigest(
    binding.after_semantics_sha256,
    sha256Hex(canonicalValueJson(delta.after_semantics)),
    `patch_after_semantics:${operationId}:${binding.delta_id}:${binding.target_key}`,
  );
  validateOperationProjection(operation, delta, binding);
  return { identity: deltaTarget(binding.delta_id, binding.target_key) };
}

function validateOperationProjection(
  operation: DesignResourceExactPatchOperation,
  delta: DesignResourceDelta,
  binding: DesignResourcePatchSemanticBinding,
): void {
  const operationId = operation.operation_id;
  if (operation.operation === "add") {
    if (
      delta.before_semantics !== null ||
      delta.after_semantics === null ||
      binding.before_text_projection !== null ||
      !operation.after_text.length
    )
      invalid(`patch_add_shape:${operationId}`);
    validateTextProjection(
      operationId,
      "after",
      operation.after_text,
      delta.after_semantics,
      binding.after_text_projection,
    );
    return;
  }
  if (operation.operation === "remove") {
    if (
      delta.before_semantics === null ||
      delta.after_semantics !== null ||
      binding.after_text_projection !== null ||
      operation.after_text !== ""
    )
      invalid(`patch_remove_shape:${operationId}`);
    validateTextProjection(
      operationId,
      "before",
      operation.before_text,
      delta.before_semantics,
      binding.before_text_projection,
    );
    return;
  }
  if (
    delta.before_semantics === null ||
    delta.after_semantics === null ||
    !operation.after_text.length
  )
    invalid(`patch_replace_shape:${operationId}`);
  validateTextProjection(
    operationId,
    "before",
    operation.before_text,
    delta.before_semantics,
    binding.before_text_projection,
  );
  validateTextProjection(
    operationId,
    "after",
    operation.after_text,
    delta.after_semantics,
    binding.after_text_projection,
  );
}

function validateTextProjection(
  operationId: string,
  side: "before" | "after",
  text: string,
  semantics: unknown,
  projection: DesignResourceTextSemanticProjection | null,
): void {
  if (!projection)
    invalid(`patch_${side}_semantic_projection_required:${operationId}`);
  const leaf = uniqueScalarLeaf(semantics, operationId, side);
  if (!samePath(projection.semantic_path, leaf.path))
    invalid(`patch_${side}_semantic_path:${operationId}`);
  if (
    projection.start_offset < 0 ||
    projection.end_offset <= projection.start_offset ||
    projection.end_offset > text.length
  )
    invalid(`patch_${side}_projection_range:${operationId}`);
  const actual = text.slice(projection.start_offset, projection.end_offset);
  if (actual !== renderSemanticScalar(leaf.value, operationId, side))
    invalid(`patch_${side}_semantic_text_mismatch:${operationId}`);
}

function uniqueScalarLeaf(
  semantics: unknown,
  operationId: string,
  side: "before" | "after",
): { path: string[]; value: string | number | boolean | null } {
  const leaves: Array<{
    path: string[];
    value: string | number | boolean | null;
  }> = [];
  collectScalarLeaves(semantics, [], leaves, operationId, side);
  if (leaves.length !== 1)
    invalid(
      `patch_${side}_semantic_leaf_count:${operationId}:${leaves.length}`,
    );
  return leaves[0];
}

function collectScalarLeaves(
  value: unknown,
  path: string[],
  leaves: Array<{
    path: string[];
    value: string | number | boolean | null;
  }>,
  operationId: string,
  side: string,
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    leaves.push({ path, value });
    return;
  }
  if (typeof value !== "object" || Array.isArray(value))
    invalid(`patch_${side}_semantic_scalar_tree:${operationId}`);
  for (const key of Object.keys(value).sort())
    collectScalarLeaves(
      (value as Record<string, unknown>)[key],
      [...path, key],
      leaves,
      operationId,
      side,
    );
}

function samePath(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function renderSemanticScalar(
  value: string | number | boolean | null,
  operationId: string,
  side: string,
): string {
  if (typeof value === "string") {
    if (!value.length || value.includes("\0"))
      invalid(`patch_${side}_semantic_scalar:${operationId}`);
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  if (value === null) return "null";
  invalid(`patch_${side}_semantic_scalar_required:${operationId}`);
}

function deltaTarget(deltaId: string, target: string): string {
  return `${deltaId}\u0000${target}`;
}

function assertDigest(actual: string, expected: string, code: string): void {
  if (actual !== expected) invalid(`${code}:${actual}:${expected}`);
}

function uniqueValues(values: string[], code: string): Set<string> {
  const result = new Set(values);
  if (result.size !== values.length) invalid(code);
  return result;
}

function assertSubset(
  candidate: Set<string>,
  owner: Set<string>,
  code: string,
): void {
  const outside = [...candidate].filter((value) => !owner.has(value));
  if (outside.length) invalid(`${code}:${outside.sort().join(",")}`);
}

function assertExactSet(
  actual: string[],
  expected: string[],
  code: string,
): void {
  uniqueValues(actual, `${code}:actual_duplicate`);
  uniqueValues(expected, `${code}:expected_duplicate`);
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (
    left.length !== right.length ||
    left.some((value, index) => value !== right[index])
  )
    invalid(code);
}

function invalid(code: string): never {
  throw new Error(`design_resource_recovery_invalid:${code}`);
}
