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
  changed: Set<string>,
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
  if (!state.writeback) return;
  const writeback = state.writeback;
  if (writeback.target_locator === state.base.locator)
    invalid("writeback_target_must_not_replace_immutable_base");
  assertExactSet(
    writeback.accepted_delta_ids,
    activeAccepted.map((delta) => delta.delta_id),
    "writeback_accepted_delta_set_mismatch",
  );
  validatePatch(writeback.patch.operations, activeAccepted, changed);
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

function validatePatch(
  operations: DesignResourceExactPatchOperation[],
  activeAccepted: DesignResourceDelta[],
  changed: Set<string>,
): void {
  uniqueValues(
    operations.map((operation) => operation.operation_id),
    "patch_operation_id_duplicate",
  );
  const activeById = new Map(
    activeAccepted.map((delta) => [delta.delta_id, delta]),
  );
  const bindingIdentities: string[] = [];
  const patchTargets: string[] = [];
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
    uniqueValues(
      operation.target_keys,
      `patch_operation_target_duplicate:${operation.operation_id}`,
    );
    uniqueValues(
      operation.delta_ids,
      `patch_operation_delta_duplicate:${operation.operation_id}`,
    );
    const operationBindings = operation.semantic_bindings.map((binding) =>
      validateSemanticBinding(
        operation.operation_id,
        operation.before_text,
        operation.after_text,
        binding,
        activeById,
      ),
    );
    uniqueValues(
      operationBindings.map((binding) => binding.identity),
      `patch_operation_binding_duplicate:${operation.operation_id}`,
    );
    assertExactSet(
      operation.target_keys,
      operationBindings.map((binding) => binding.targetKey),
      `patch_operation_target_binding_mismatch:${operation.operation_id}`,
    );
    assertExactSet(
      operation.delta_ids,
      operationBindings.map((binding) => binding.deltaId),
      `patch_operation_delta_binding_mismatch:${operation.operation_id}`,
    );
    for (const binding of operationBindings) {
      bindingIdentities.push(binding.identity);
      patchTargets.push(binding.targetKey);
    }
  }
  uniqueValues(bindingIdentities, "patch_binding_duplicate_global");
  const expectedBindings = activeAccepted.flatMap((delta) =>
    delta.operation === "preserve"
      ? []
      : delta.target_keys.map((target) => deltaTarget(delta.delta_id, target)),
  );
  assertExactSet(
    bindingIdentities,
    expectedBindings,
    "writeback_patch_binding_universe_mismatch",
  );
  assertExactSet(
    patchTargets,
    [...changed],
    "writeback_patch_target_set_mismatch",
  );
}

function validateSemanticBinding(
  operationId: string,
  beforeText: string,
  afterText: string,
  binding: DesignResourcePatchSemanticBinding,
  activeById: Map<string, DesignResourceDelta>,
): { identity: string; deltaId: string; targetKey: string } {
  const delta = activeById.get(binding.delta_id);
  if (!delta)
    invalid(
      `patch_binding_inactive_or_unknown:${operationId}:${binding.delta_id}`,
    );
  if (delta.operation === "preserve")
    invalid(`patch_binding_preserve_delta:${operationId}:${binding.delta_id}`);
  if (!delta.target_keys.includes(binding.target_key))
    invalid(
      `patch_binding_target_mismatch:${operationId}:${binding.delta_id}:${binding.target_key}`,
    );
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
  validateTextProjection(
    operationId,
    "before",
    beforeText,
    delta.before_semantics,
    binding.before_text_projection,
  );
  validateTextProjection(
    operationId,
    "after",
    afterText,
    delta.after_semantics,
    binding.after_text_projection,
  );
  return {
    identity: deltaTarget(binding.delta_id, binding.target_key),
    deltaId: binding.delta_id,
    targetKey: binding.target_key,
  };
}

function validateTextProjection(
  operationId: string,
  side: "before" | "after",
  text: string,
  semantics: unknown,
  projection: DesignResourceTextSemanticProjection | null,
): void {
  if (semantics === null) {
    if (projection !== null)
      invalid(`patch_${side}_null_semantics_projection:${operationId}`);
    return;
  }
  if (!projection)
    invalid(`patch_${side}_semantic_projection_required:${operationId}`);
  if (
    projection.start_offset < 0 ||
    projection.end_offset <= projection.start_offset ||
    projection.end_offset > text.length
  )
    invalid(`patch_${side}_projection_range:${operationId}`);
  const value = resolveSemanticPath(
    semantics,
    projection.semantic_path,
    operationId,
    side,
  );
  const expected = renderSemanticScalar(value, operationId, side);
  const actual = text.slice(projection.start_offset, projection.end_offset);
  if (actual !== expected)
    invalid(`patch_${side}_semantic_text_mismatch:${operationId}`);
}

function resolveSemanticPath(
  semantics: unknown,
  path: string[],
  operationId: string,
  side: string,
): unknown {
  let current = semantics;
  for (const segment of path) {
    if (
      !current ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      !Object.hasOwn(current, segment)
    )
      invalid(`patch_${side}_semantic_path:${operationId}:${segment}`);
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function renderSemanticScalar(
  value: unknown,
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
