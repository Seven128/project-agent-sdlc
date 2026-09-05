import type {
  AuthorityMaterialHashesV2,
  CompiledDeliveryContractV2,
  CompiledSourceItemV2,
  ContextAuthoritySnapshotV2,
  DeliveryContractV2,
  GlobalSemanticProjectionV2,
  NextAuthorityMaterialsV2,
  ProductSemanticProjectionV2,
} from "./long-task-delivery-types.js";
import { normalizeContextAuthoritySnapshot } from "./long-task-context-authority.js";
import {
  projectDesignAuthorityMaterials,
  type DesignAuthorityMaterialProjectionV2,
} from "./long-task-design-authority-materials.js";
import type { LongTaskDesignHandoffPreflight } from "./long-task-design-resource-handoff.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export function computeAuthorityMaterials(
  contract: DeliveryContractV2,
  sourceHashes: Record<string, string>,
  sourceItems: CompiledSourceItemV2[],
  contextSnapshot: ContextAuthoritySnapshotV2,
  designHandoffs: readonly LongTaskDesignHandoffPreflight[] = [],
  semanticFactManifest: SemanticFactManifestV1 | null = null,
): NextAuthorityMaterialsV2 {
  const design = projectDesignAuthorityMaterials(
    contract,
    sourceHashes,
    sourceItems,
    designHandoffs,
    semanticFactManifest,
  );
  return {
    source_hashes: sortRecord(sourceHashes),
    source_items: [...sourceItems].sort((left, right) =>
      left.key.localeCompare(right.key),
    ),
    context_snapshot: normalizeContextAuthoritySnapshot(contextSnapshot),
    product_semantics: projectProductSemantics(contract),
    global_semantics: projectGlobalSemantics(contract),
    ...design,
  };
}

export function compiledAuthorityMaterials(
  compiled: CompiledDeliveryContractV2,
): NextAuthorityMaterialsV2 {
  const stored = (
    compiled as CompiledDeliveryContractV2 & {
      authority_materials?: NextAuthorityMaterialsV2;
    }
  ).authority_materials;
  if (!stored) {
    const compatibilityContract: DeliveryContractV2 = {
      ...compiled,
      schema_version: "long-task-delivery-v2",
    };
    return computeAuthorityMaterials(
      compatibilityContract,
      compiled.source_hashes,
      compiled.source_items,
      compiled.context_snapshot,
    );
  }
  const compatibility = stored as NextAuthorityMaterialsV2 &
    Partial<DesignAuthorityMaterialProjectionV2>;
  return {
    ...stored,
    design_semantics: compatibility.design_semantics ?? [],
    design_implementation_bindings:
      compatibility.design_implementation_bindings ?? [],
    design_non_binding_contract_sha256:
      compatibility.design_non_binding_contract_sha256 ?? hash(compiled),
    design_non_binding_source_sha256:
      compatibility.design_non_binding_source_sha256 ??
      hash({
        source_hashes: stored.source_hashes,
        source_items: stored.source_items,
      }),
  };
}

export function authorityMaterialHashes(
  materials: NextAuthorityMaterialsV2,
): AuthorityMaterialHashesV2 {
  return {
    source_hashes_sha256: hash(materials.source_hashes),
    context_snapshot_sha256: hash(materials.context_snapshot),
    product_semantics_sha256: hash(materials.product_semantics),
    global_semantics_sha256: hash(materials.global_semantics),
    design_semantics_sha256: hash(materials.design_semantics),
    design_implementation_bindings_sha256: hash(
      materials.design_implementation_bindings,
    ),
    design_non_binding_contract_sha256:
      materials.design_non_binding_contract_sha256,
    design_non_binding_source_sha256:
      materials.design_non_binding_source_sha256,
  };
}

export function authorityMaterialsChanged(
  previous: NextAuthorityMaterialsV2,
  next: NextAuthorityMaterialsV2,
): boolean {
  return canonicalValueJson(previous) !== canonicalValueJson(next);
}

export function projectProductSemantics(
  contract: Pick<DeliveryContractV2, "task" | "global" | "outcomes" | "stages">,
): ProductSemanticProjectionV2 {
  return {
    task_goal: contract.task.goal,
    target_profile: contract.task.target_profile,
    execution_targets: [...contract.task.execution_targets].sort(keyOrder),
    stages: [...contract.stages].sort(keyOrder),
    global_non_goals: applicableStatements(contract.global.product.non_goals),
    outcomes: [...contract.outcomes].sort(keyOrder).map((outcome) => ({
      key: outcome.key,
      title: outcome.title,
      stage: outcome.stage,
      applicability: [...outcome.applicability].sort(keyOrder).map((item) => ({
        ...item,
        given_refs: [...item.given_refs],
        when_refs: [...item.when_refs],
      })),
      observable_result: outcome.product.observable_result,
      result_applicability_refs: [
        ...outcome.product.result_applicability_refs,
      ].sort(),
      success_path_required: outcome.product.success_path_required,
      degradation_path_required: outcome.product.degradation_path_required,
      owner: {
        label: outcome.product.owner.label,
        owner_surfaces: [...outcome.product.owner_surfaces].sort(),
      },
      requirements: [...outcome.product.requirements]
        .sort(keyOrder)
        .map((requirement) => ({
          key: requirement.key,
          statement: requirement.statement,
          required_proof_surfaces: [
            ...requirement.required_proof_surfaces,
          ].sort(),
          applicability_refs: [...requirement.applicability_refs].sort(),
        })),
      controls: [...outcome.product.controls].sort(keyOrder).map((control) => ({
        key: control.key,
        surface: control.surface,
        region: control.region,
        location: control.location,
        control_type: control.control_type,
        label_content: control.label_content,
        user_task: control.user_task,
        visibility: control.visibility,
        availability: control.availability,
        trigger: control.trigger,
        input: control.input,
        validation: control.validation,
        default_value: control.default_value,
        interaction: control.interaction,
        navigation_result: control.navigation_result,
        loading_state: control.loading_state,
        empty_state: control.empty_state,
        success_state: control.success_state,
        failure_state: control.failure_state,
        recovery: control.recovery,
        permission: control.permission,
        feedback: control.feedback,
        accessibility: control.accessibility,
        field_coverage: [...control.field_coverage].map((entry) => ({
          ...entry,
          fields: [...entry.fields].sort(),
          applicability_refs: [...entry.applicability_refs].sort(),
        })),
      })),
      control_relation_closure: outcome.product.control_relation_closure,
      control_relations: [...outcome.product.control_relations]
        .sort(keyOrder)
        .map((relation) => ({
          ...relation,
          control_refs: [...relation.control_refs].sort(),
          required_proof_surfaces: [...relation.required_proof_surfaces].sort(),
          applicability_refs: [...relation.applicability_refs].sort(),
        })),
      surface_bindings: [...(outcome.product.surface_bindings ?? [])]
        .sort(keyOrder)
        .map((binding) => ({
          ...binding,
          control_refs: [...binding.control_refs].sort(),
          component_binding_refs: [...binding.component_binding_refs].sort(),
          design_targets: [...binding.design_targets]
            .sort(keyOrder)
            .map((target) => {
              const { source_paths: _sourcePaths, ...semanticTarget } = target;
              return {
                ...semanticTarget,
                condition_keys: [...target.condition_keys].sort(),
                claim_refs: [...target.claim_refs].sort(),
              };
            }),
          acceptance_blockers: [...binding.acceptance_blockers]
            .sort(keyOrder)
            .map((blocker) => ({
              ...blocker,
              refs: [...blocker.refs].sort(),
              source_item_refs: [...blocker.source_item_refs].sort(),
              verification_methods: [...blocker.verification_methods].sort(),
              required_capabilities: [...blocker.required_capabilities].sort(),
            })),
        })),
      non_completing_outcomes: applicableStatements(
        outcome.product.non_completing_outcomes,
      ),
    })),
  };
}

export function projectGlobalSemantics(
  contract: Pick<DeliveryContractV2, "global">,
): GlobalSemanticProjectionV2 {
  return {
    applicability: [...contract.global.applicability]
      .sort(keyOrder)
      .map((item) => ({
        ...item,
        given_refs: [...item.given_refs],
        when_refs: [...item.when_refs],
      })),
    semantic_fact_bindings: contract.global.semantic_fact_bindings
      ? {
          manifest_ref: contract.global.semantic_fact_bindings.manifest_ref,
          obligations: [...contract.global.semantic_fact_bindings.obligations]
            .sort((left, right) =>
              globalSemanticObligationKey(left).localeCompare(
                globalSemanticObligationKey(right),
              ),
            )
            .map((item) => ({ ...item })),
        }
      : null,
    constraints: applicableStatements(contract.global.technical.constraints),
    forbidden_shortcuts: applicableStatements(
      contract.global.technical.forbidden_shortcuts,
    ),
  };
}

function globalSemanticObligationKey(
  item: NonNullable<
    DeliveryContractV2["global"]["semantic_fact_bindings"]
  >["obligations"][number],
): string {
  return [
    item.claim_ref,
    item.applicability_ref,
    item.target_ref,
    item.outcome_ref,
    item.fact_ref,
    item.proof_ref,
    item.method,
  ].join("\0");
}

function keyedStatements<T extends { key: string; statement: string }>(
  values: T[],
): Array<{ key: string; statement: string }> {
  return [...values]
    .sort(keyOrder)
    .map(({ key, statement }) => ({ key, statement }));
}

function applicableStatements<
  T extends {
    key: string;
    statement: string;
    applicability_refs: string[];
  },
>(
  values: T[],
): Array<{ key: string; statement: string; applicability_refs: string[] }> {
  return [...values]
    .sort(keyOrder)
    .map(({ key, statement, applicability_refs }) => ({
      key,
      statement,
      applicability_refs: [...applicability_refs].sort(),
    }));
}

function keyOrder(left: { key: string }, right: { key: string }): number {
  return left.key.localeCompare(right.key);
}

function sortRecord<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function hash(value: unknown): string {
  return sha256Hex(canonicalValueJson(value));
}
