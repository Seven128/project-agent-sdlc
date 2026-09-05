import type {
  CompiledSourceItemV2,
  DeliveryBindingV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import type { LongTaskDesignHandoffPreflight } from "./long-task-design-resource-handoff.js";
import type {
  DesignImplementationBindingMaterialV2,
  DesignSemanticAuthorityMaterialV2,
} from "./long-task-authority-types.js";
import {
  designSemanticIdentityMap,
  designHandoffSemanticIdentity,
  designAuthorityKeyOrder,
  projectFeasibilitySemantics,
  projectHandoffSemantics,
  projectNonBindingContract,
  projectNonBindingSource,
  projectSemanticFactManifest,
  projectSourceItems,
} from "./long-task-design-authority-projections.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export interface DesignAuthorityMaterialProjectionV2 {
  design_semantics: DesignSemanticAuthorityMaterialV2[];
  design_implementation_bindings: DesignImplementationBindingMaterialV2[];
  design_non_binding_contract_sha256: string;
  design_non_binding_source_sha256: string;
}

export function projectDesignAuthorityMaterials(
  contract: DeliveryContractV2,
  sourceHashes: Record<string, string>,
  sourceItems: readonly CompiledSourceItemV2[],
  preflights: readonly LongTaskDesignHandoffPreflight[],
  semanticFactManifest: SemanticFactManifestV1 | null = null,
): DesignAuthorityMaterialProjectionV2 {
  const targets = contract.outcomes.flatMap((outcome) =>
    outcome.product.surface_bindings.flatMap((surface) =>
      surface.design_targets.map((target) => ({ outcome, surface, target })),
    ),
  );
  const targetsByKey = new Map(
    targets.map((entry) => [entry.target.key, entry]),
  );
  const handoffIdentitiesByPath = new Map(
    preflights.map((preflight) => [
      preflight.handoff_path,
      designHandoffSemanticIdentity(
        preflight.handoff.targets.map((target) => target.key),
      ),
    ]),
  );
  const designSemanticIdentities = designSemanticIdentityMap(preflights);
  const projectedSemanticFactManifest = semanticFactManifest
    ? projectSemanticFactManifest(
        semanticFactManifest,
        designSemanticIdentities,
      )
    : null;
  const projectedSemanticFactManifestSha256 = projectedSemanticFactManifest
    ? digest(projectedSemanticFactManifest)
    : null;
  const designSourcePaths = new Set(
    preflights.flatMap((preflight) => [
      preflight.handoff_path,
      ...preflight.handoff.resources.map((resource) => resource.path),
    ]),
  );
  const protectedSourcePaths = new Set([
    ...contract.task.source_paths,
    ...contract.task.context_refs,
    contract.semantic_fact_manifest.source_path,
    ...sourceItems.map((item) => item.source_path),
    ...contract.source_claims.map(sourceClaimPath),
    ...designSourcePaths,
  ]);
  const semantics: DesignSemanticAuthorityMaterialV2[] = [];
  const bindings: DesignImplementationBindingMaterialV2[] = [];
  const replaceablePathsByTarget = new Map<string, Set<string>>();

  for (const preflight of [...preflights].sort((left, right) =>
    left.handoff_path.localeCompare(right.handoff_path),
  )) {
    const handoffSemanticIdentity = handoffIdentitiesByPath.get(
      preflight.handoff_path,
    );
    if (!handoffSemanticIdentity)
      throw new Error(
        `design_handoff_semantic_identity_missing:${preflight.handoff_path}`,
      );
    const handoffSemantics = projectHandoffSemantics(preflight.handoff);
    const handoffSemanticsSha256 = digest(handoffSemantics);
    const authoritySha256 = preflight.project_design_authority_resolution
      .identity
      ? digest(preflight.project_design_authority_resolution.identity)
      : null;
    for (const target of [...preflight.handoff.targets].sort(
      designAuthorityKeyOrder,
    )) {
      const contractTarget = targetsByKey.get(target.key);
      if (!contractTarget) continue;
      const feasibility = preflight.technical_feasibility_documents.find(
        (document) => document.target_ref === target.key,
      );
      const feasibilityInput = preflight.handoff.technical_feasibility_inputs
        .filter((input) => input.target_ref === target.key)
        .sort(designAuthorityKeyOrder);
      const feasibilityIdentity = preflight.technical_feasibility_identities
        .filter((identity) => identity.target_ref === target.key)
        .sort(designAuthorityKeyOrder);
      const sourceRecords = feasibility
        ? [...feasibility.source_records].sort(designAuthorityKeyOrder)
        : [];
      const referencedBindingKeys = new Set([
        contractTarget.surface.route_binding_ref,
        ...contractTarget.surface.component_binding_refs,
      ]);
      const technicalBindings = contractTarget.outcome.technical.bindings;
      const selectedBindings = technicalBindings
        .filter((binding) => referencedBindingKeys.has(binding.key))
        .sort(designAuthorityKeyOrder);
      const bindingOnlySourceRecords = sourceRecords.filter((record) =>
        isBindingOnlySourceRecord(record, protectedSourcePaths),
      );
      const implementationPaths = new Set(
        uniqueSorted([
          ...bindingOnlySourceRecords.map((record) => record.path),
          ...selectedBindings.flatMap((binding) => [
            binding.target,
            ...binding.carrier_paths,
          ]),
        ]).filter((candidate) => !protectedSourcePaths.has(candidate)),
      );
      const bindingPaths = uniqueSorted([
        preflight.handoff_path,
        ...feasibilityInput.map((input) => input.path),
        ...implementationPaths,
      ]);
      const sourceItemSemantics = preflight.source_item_keys
        .map((key) => sourceItems.find((item) => item.key === key))
        .filter((item): item is CompiledSourceItemV2 => item !== undefined)
        .sort(designAuthorityKeyOrder);
      semantics.push({
        target_key: target.key,
        handoff_identity: handoffSemanticIdentity,
        handoff_semantics_sha256: handoffSemanticsSha256,
        project_design_authority_sha256: authoritySha256,
        feasibility_semantics_sha256: feasibility
          ? digest(
              projectFeasibilitySemantics(feasibility, implementationPaths),
            )
          : null,
        source_item_semantics_sha256: digest(
          projectSourceItems(sourceItemSemantics, handoffIdentitiesByPath),
        ),
      });
      bindings.push({
        target_key: target.key,
        handoff_path: preflight.handoff_path,
        binding_paths: bindingPaths,
        target_source_paths: [...contractTarget.target.source_paths].sort(),
        technical_feasibility_inputs: feasibilityInput,
        technical_feasibility_identities: feasibilityIdentity,
        technical_source_records: bindingOnlySourceRecords,
        route_binding: bindingFor(
          technicalBindings,
          contractTarget.surface.route_binding_ref,
        ),
        component_bindings: selectedBindings,
      });
      replaceablePathsByTarget.set(target.key, new Set(bindingPaths));
    }
  }

  const designSemantics = semantics.sort((left, right) =>
    left.target_key.localeCompare(right.target_key),
  );
  const designBindings = bindings.sort((left, right) =>
    left.target_key.localeCompare(right.target_key),
  );
  const designBindingKeys = new Map<string, Set<string>>();
  for (const { outcome, surface } of targets) {
    const keys = designBindingKeys.get(outcome.key) ?? new Set<string>();
    keys.add(surface.route_binding_ref);
    for (const key of surface.component_binding_refs) keys.add(key);
    designBindingKeys.set(outcome.key, keys);
  }
  return {
    design_semantics: designSemantics,
    design_implementation_bindings: designBindings,
    design_non_binding_contract_sha256: digest(
      projectNonBindingContract(
        contract,
        replaceablePathsByTarget,
        designBindingKeys,
        handoffIdentitiesByPath,
        designSemanticIdentities,
        projectedSemanticFactManifestSha256,
      ),
    ),
    design_non_binding_source_sha256: digest(
      projectNonBindingSource(
        sourceHashes,
        sourceItems,
        handoffIdentitiesByPath,
        projectedSemanticFactManifestSha256
          ? {
              source_path: contract.semantic_fact_manifest.source_path,
              sha256: projectedSemanticFactManifestSha256,
            }
          : null,
      ),
    ),
  };
}

function isBindingOnlySourceRecord(
  record: LongTaskDesignHandoffPreflight["technical_feasibility_documents"][number]["source_records"][number],
  protectedSourcePaths: ReadonlySet<string>,
): boolean {
  return (
    record.locator.kind !== "source_item" &&
    !record.roles.includes("technical_authority") &&
    !record.roles.includes("planned_owner_authorization") &&
    !protectedSourcePaths.has(record.path)
  );
}

function sourceClaimPath(
  claim: DeliveryContractV2["source_claims"][number],
): string {
  const separator = claim.source_ref.indexOf("#");
  return separator < 0
    ? claim.source_ref
    : claim.source_ref.slice(0, separator);
}

function bindingFor(
  bindings: readonly DeliveryBindingV2[],
  key: string,
): DeliveryBindingV2 | null {
  return bindings.find((binding) => binding.key === key) ?? null;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function digest(value: unknown): string {
  return sha256Hex(canonicalValueJson(value));
}
