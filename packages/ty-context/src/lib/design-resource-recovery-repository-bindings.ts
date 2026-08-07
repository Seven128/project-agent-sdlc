import { readRecoveryRepositoryFile } from "./design-resource-recovery-files.js";
import type {
  DesignResourceRecoveryCheckpoint,
  DesignResourceRecoveryCreateInput,
} from "./design-resource-recovery-types.js";
import type { DesignResourceReconciliationAudit } from "./design-resource-reconciliation-types.js";

type RecoveryState =
  DesignResourceRecoveryCreateInput | DesignResourceRecoveryCheckpoint;

export async function validateSelectedResourceRepositoryBindings(
  repository: string,
  state: RecoveryState,
): Promise<{ external_revalidation_required: boolean }> {
  let external = false;
  for (const binding of state.selected_resource_bindings) {
    if (binding.identity_kind === "external-immutable") {
      external = true;
      continue;
    }
    const snapshot = await readRecoveryRepositoryFile(
      repository,
      binding.locator,
      `design_resource_recovery_selected_resource_${binding.key}`,
    );
    assertDigest(
      `selected_resource:${binding.key}`,
      snapshot.raw_byte_digest,
      binding.raw_byte_digest,
    );
  }
  return { external_revalidation_required: external };
}

export async function validateReconciliationDownstreamOwners(
  repository: string,
  checkpoint: DesignResourceRecoveryCheckpoint,
  audit: DesignResourceReconciliationAudit,
): Promise<{ external_revalidation_required: boolean }> {
  const selected = new Map(
    checkpoint.selected_resource_bindings.map((row) => [row.key, row]),
  );
  const current = await validateSelectedResourceRepositoryBindings(
    repository,
    checkpoint,
  );
  for (const row of audit.resource_to_requirements)
    for (const binding of row.requirement_bindings) {
      const disposition = binding.final_disposition;
      if (disposition.kind !== "resource-owned-exact-visual") continue;
      const selectedResource = selected.get(disposition.resource_ref);
      if (!selectedResource)
        invalid(`downstream_owner_resource_unselected:${binding.binding_id}`);
      if (selectedResource.identity_kind === "external-immutable")
        invalid(`external_only_final_owner:${binding.binding_id}`);
      const owner = disposition.downstream_owner;
      if (owner.kind === "selected-source-record") {
        if (
          selectedResource.identity_kind !== "repository-snapshot" ||
          owner.resource_key !== disposition.resource_ref ||
          owner.locator !== selectedResource.locator ||
          owner.raw_byte_digest !== selectedResource.raw_byte_digest
        )
          invalid(
            `selected_source_owner_identity_mismatch:${binding.binding_id}`,
          );
      } else {
        if (
          selectedResource.identity_kind !== "formal-handoff-target" ||
          owner.locator !== selectedResource.locator ||
          owner.raw_byte_digest !== selectedResource.raw_byte_digest
        )
          invalid(
            `formal_handoff_owner_binding_mismatch:${binding.binding_id}`,
          );
        if (owner.target_key !== binding.requirement_key)
          invalid(`formal_handoff_owner_target_mismatch:${binding.binding_id}`);
      }
      const snapshot = await readRecoveryRepositoryFile(
        repository,
        owner.locator,
        `design_resource_recovery_downstream_owner_${binding.binding_id}`,
      );
      assertDigest(
        `downstream_owner:${binding.binding_id}`,
        snapshot.raw_byte_digest,
        owner.raw_byte_digest,
      );
    }
  return current;
}

function assertDigest(label: string, actual: string, expected: string): void {
  if (actual !== expected)
    invalid(`${label}_digest_mismatch:${expected}:${actual}`);
}

function invalid(reason: string): never {
  throw new Error(`design_resource_recovery_invalid:${reason}`);
}
