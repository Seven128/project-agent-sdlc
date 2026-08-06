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
  const resourceKeys = uniqueKeys(
    state.provider.resources.map((resource) => resource.key),
    "provider_resource_key_duplicate",
  );
  assertSubset(
    new Set(state.selected_resource_keys),
    resourceKeys,
    "selected_resource_not_declared",
  );
  uniqueKeys(
    state.provider.resources.map((resource) => resource.locator),
    "provider_resource_locator_duplicate",
  );
  if (!state.writeback) return;
  const writeback = state.writeback;
  if (writeback.target_locator === state.base.locator)
    invalid("writeback_target_must_not_replace_immutable_base");
  assertEqualSet(
    new Set(writeback.accepted_delta_ids),
    new Set(activeAccepted.map((delta) => delta.delta_id)),
    "writeback_accepted_delta_set_mismatch",
  );
  const patchTargets = new Set(
    writeback.patch.operations.flatMap((operation) => operation.target_keys),
  );
  assertEqualSet(patchTargets, changed, "writeback_patch_target_set_mismatch");
  uniqueKeys(
    writeback.patch.operations.map((operation) => operation.operation_id),
    "patch_operation_id_duplicate",
  );
  for (const operation of writeback.patch.operations)
    if (operation.before_text === operation.after_text)
      invalid(`patch_operation_no_change:${operation.operation_id}`);
  const patchIdentity = sha256Hex(canonicalValueJson(writeback.patch));
  if (patchIdentity !== writeback.patch_identity)
    invalid(
      `patch_identity_mismatch:${writeback.patch_identity}:${patchIdentity}`,
    );
  const resources = new Map(
    state.provider.resources.map((resource) => [resource.key, resource]),
  );
  const frozen = new Map(
    writeback.resource_identities.map((resource) => [resource.key, resource]),
  );
  assertEqualSet(
    new Set(frozen.keys()),
    new Set(state.selected_resource_keys),
    "writeback_resource_set_mismatch",
  );
  for (const [key, identity] of frozen) {
    const provider = resources.get(key);
    if (!provider || provider.raw_byte_digest !== identity.raw_byte_digest)
      invalid(`writeback_resource_identity_mismatch:${key}`);
  }
}

function uniqueKeys(values: string[], code: string): Set<string> {
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
