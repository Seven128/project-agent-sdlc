import type {
  CompiledDeliveryContractV2,
  DeliveryContractV2,
  GlobalSemanticProjectionV2,
  NextAuthorityMaterialsV2,
  ProductSemanticProjectionV2,
  SourceClaimV2,
} from "./long-task-delivery-types.js";
import { compiledAuthorityMaterials } from "./long-task-authority-materials.js";
import { contextAuthorityChanged } from "./long-task-context-authority.js";
import { canonicalValueJson } from "./strict-codec.js";

export interface AuthorityMaterialRevisionDiffV2 {
  product_semantics_changed: string[];
  global_semantics_changed: string[];
  source_files_added: string[];
  source_files_removed: string[];
  source_files_changed: string[];
  context_snapshot_mode_changed: boolean;
  context_topology_changed: boolean;
  context_files_added: string[];
  context_files_removed: string[];
  context_files_changed: string[];
  design_semantics_changed: string[];
  design_implementation_bindings_changed: string[];
  reduction_reasons: string[];
}

export function authorityMaterialRevisionDiff(
  previous: CompiledDeliveryContractV2,
  nextMaterials: NextAuthorityMaterialsV2,
): AuthorityMaterialRevisionDiffV2 {
  const previousMaterials = compiledAuthorityMaterials(previous);
  const productSemanticsChanged = changedProjectionFields(
    flattenProductSemantics(previousMaterials.product_semantics),
    flattenProductSemantics(nextMaterials.product_semantics),
  );
  const globalSemanticsChanged = changedProjectionFields(
    flattenGlobalSemantics(previousMaterials.global_semantics),
    flattenGlobalSemantics(nextMaterials.global_semantics),
  );
  const sourceFilesAdded = recordKeysAdded(
    previousMaterials.source_hashes,
    nextMaterials.source_hashes,
  );
  const sourceFilesRemoved = recordKeysRemoved(
    previousMaterials.source_hashes,
    nextMaterials.source_hashes,
  );
  const sourceFilesChanged = recordValuesChanged(
    previousMaterials.source_hashes,
    nextMaterials.source_hashes,
  );
  const contextSnapshotModeChanged =
    previousMaterials.context_snapshot.mode !==
    nextMaterials.context_snapshot.mode;
  const contextTopologyChanged =
    previousMaterials.context_snapshot.topology_sha256 !==
    nextMaterials.context_snapshot.topology_sha256;
  const contextFilesAdded = recordKeysAdded(
    previousMaterials.context_snapshot.sha256,
    nextMaterials.context_snapshot.sha256,
  );
  const contextFilesRemoved = recordKeysRemoved(
    previousMaterials.context_snapshot.sha256,
    nextMaterials.context_snapshot.sha256,
  );
  const contextFilesChanged = recordValuesChanged(
    previousMaterials.context_snapshot.sha256,
    nextMaterials.context_snapshot.sha256,
  );
  const controllingContextChanged = contextAuthorityChanged(
    previousMaterials.context_snapshot,
    nextMaterials.context_snapshot,
  );
  const designSemanticsChanged = changedKeyedProjectionRows(
    previousMaterials.design_semantics,
    nextMaterials.design_semantics,
    "target_key",
  );
  const designImplementationBindingsChanged = changedKeyedProjectionRows(
    previousMaterials.design_implementation_bindings,
    nextMaterials.design_implementation_bindings,
    "target_key",
  );
  return {
    product_semantics_changed: productSemanticsChanged,
    global_semantics_changed: globalSemanticsChanged,
    source_files_added: sourceFilesAdded,
    source_files_removed: sourceFilesRemoved,
    source_files_changed: sourceFilesChanged,
    context_snapshot_mode_changed: contextSnapshotModeChanged,
    context_topology_changed: contextTopologyChanged,
    context_files_added: contextFilesAdded,
    context_files_removed: contextFilesRemoved,
    context_files_changed: contextFilesChanged,
    design_semantics_changed: designSemanticsChanged,
    design_implementation_bindings_changed: designImplementationBindingsChanged,
    reduction_reasons: [
      ...(productSemanticsChanged.length ? ["product_semantics_changed"] : []),
      ...(globalSemanticsChanged.length ? ["global_semantics_changed"] : []),
      ...(sourceFilesAdded.length ||
      sourceFilesRemoved.length ||
      sourceFilesChanged.length
        ? ["source_file_content_changed"]
        : []),
      ...(controllingContextChanged ? ["context_authority_changed"] : []),
      ...(designSemanticsChanged.length ? ["design_semantics_changed"] : []),
    ],
  };
}

function changedKeyedProjectionRows<
  T extends Record<K, string>,
  K extends keyof T,
>(previous: T[], next: T[], key: K): string[] {
  const before = new Map(previous.map((row) => [row[key], row]));
  const after = new Map(next.map((row) => [row[key], row]));
  return [...new Set([...before.keys(), ...after.keys()])]
    .filter(
      (identity) =>
        !before.has(identity) ||
        !after.has(identity) ||
        canonicalValueJson(before.get(identity)) !==
          canonicalValueJson(after.get(identity)),
    )
    .sort((left, right) => left.localeCompare(right));
}

export function sourceClaimAdditions(
  beforeClaims: SourceClaimV2[],
  afterClaims: SourceClaimV2[],
): string[] {
  const before = new Set(beforeClaims.map((claim) => claim.key));
  return afterClaims
    .filter((claim) => !before.has(claim.key))
    .map((claim) => `${claim.key}:added`)
    .sort();
}

export function changedProductClaimSemantics(
  previous: CompiledDeliveryContractV2,
  next: DeliveryContractV2,
): string[] {
  const before = productClaimSemantics(previous);
  const after = productClaimSemantics(next);
  return [...before.keys()]
    .filter(
      (claim) =>
        after.has(claim) &&
        canonicalValueJson(before.get(claim)) !==
          canonicalValueJson(after.get(claim)),
    )
    .sort();
}

function productClaimSemantics(
  contract: Pick<DeliveryContractV2, "outcomes">,
): Map<string, unknown> {
  const result = new Map<string, unknown>();
  for (const outcome of contract.outcomes) {
    result.set(`${outcome.key}.result`, outcome.product.observable_result);
    for (const item of outcome.product.requirements)
      result.set(`${outcome.key}.requirement.${item.key}`, {
        statement: item.statement,
        required_proof_surfaces: [...item.required_proof_surfaces].sort(),
      });
    for (const control of outcome.product.controls)
      for (const [field, value] of [
        ["surface", control.surface],
        ["region", control.region],
        ["location", control.location],
        ["control_type", control.control_type],
        ["label_content", control.label_content],
        ["user_task", control.user_task],
        ["visibility", control.visibility],
        ["availability", control.availability],
        ["trigger", control.trigger],
        ["input", control.input],
        ["validation", control.validation],
        ["default_value", control.default_value],
        ["interaction", control.interaction],
        ["navigation_result", control.navigation_result],
        ["loading", control.loading_state],
        ["empty", control.empty_state],
        ["success", control.success_state],
        ["failure", control.failure_state],
        ["recovery", control.recovery],
        ["permission", control.permission],
        ["feedback", control.feedback],
        ["accessibility", control.accessibility],
      ] as const)
        if (value.trim())
          result.set(`${outcome.key}.control.${control.key}.${field}`, value);
    for (const item of outcome.product.non_completing_outcomes)
      result.set(`${outcome.key}.non_completing.${item.key}`, item.statement);
    for (const item of outcome.technical.obligations)
      result.set(`${outcome.key}.obligation.${item.key}`, item.statement);
    for (const item of outcome.technical.forbidden_shortcuts)
      result.set(
        `${outcome.key}.forbidden_shortcut.${item.key}`,
        item.statement,
      );
  }
  return result;
}

function flattenProductSemantics(
  projection: ProductSemanticProjectionV2,
): Map<string, unknown> {
  const fields = new Map<string, unknown>([
    ["task.goal", projection.task_goal],
    ["task.target_profile.key", projection.target_profile.key],
    ["task.target_profile.description", projection.target_profile.description],
    [
      "task.target_profile.required_state",
      projection.target_profile.required_state,
    ],
    [
      "task.target_profile.required_target_refs",
      [...projection.target_profile.required_target_refs].sort(),
    ],
    [
      "task.target_profile.completion_authority",
      projection.target_profile.completion_authority,
    ],
  ]);
  for (const target of projection.execution_targets) {
    const prefix = `task.execution_targets.${target.key}`;
    fields.set(`${prefix}.description`, target.description);
    fields.set(`${prefix}.role`, target.role);
    fields.set(`${prefix}.runtime_family`, target.runtime_family);
    fields.set(`${prefix}.root_entrypoint`, target.root_entrypoint);
    fields.set(`${prefix}.root_argv`, target.root_argv ?? null);
  }
  for (const stage of projection.stages) {
    const prefix = `stages.${stage.key}`;
    fields.set(`${prefix}.title`, stage.title);
    fields.set(`${prefix}.depends_on`, [...stage.depends_on].sort());
    fields.set(`${prefix}.gate_outcome`, stage.gate_outcome);
  }
  for (const item of projection.global_non_goals)
    fields.set(`global.product.non_goals.${item.key}`, item.statement);
  for (const outcome of projection.outcomes) {
    const prefix = `outcomes.${outcome.key}`;
    fields.set(`${prefix}.title`, outcome.title);
    fields.set(`${prefix}.stage`, outcome.stage);
    fields.set(`${prefix}.observable_result`, outcome.observable_result);
    fields.set(
      `${prefix}.success_path_required`,
      outcome.success_path_required,
    );
    fields.set(
      `${prefix}.degradation_path_required`,
      outcome.degradation_path_required,
    );
    fields.set(`${prefix}.owner.label`, outcome.owner.label);
    fields.set(`${prefix}.owner.owner_surfaces`, outcome.owner.owner_surfaces);
    for (const requirement of outcome.requirements) {
      fields.set(
        `${prefix}.requirements.${requirement.key}`,
        requirement.statement,
      );
      fields.set(
        `${prefix}.requirements.${requirement.key}.required_proof_surfaces`,
        requirement.required_proof_surfaces,
      );
    }
    for (const control of outcome.controls)
      for (const field of [
        "surface",
        "region",
        "location",
        "control_type",
        "label_content",
        "user_task",
        "visibility",
        "availability",
        "trigger",
        "input",
        "validation",
        "default_value",
        "interaction",
        "navigation_result",
        "loading_state",
        "empty_state",
        "success_state",
        "failure_state",
        "recovery",
        "permission",
        "feedback",
        "accessibility",
      ] as const)
        fields.set(
          `${prefix}.controls.${control.key}.${field}`,
          control[field],
        );
    for (const binding of outcome.surface_bindings ?? []) {
      const bindingPrefix = `${prefix}.surface_bindings.${binding.key}`;
      fields.set(`${bindingPrefix}.surface_ref`, binding.surface_ref);
      fields.set(`${bindingPrefix}.target_ref`, binding.target_ref);
      fields.set(`${bindingPrefix}.control_refs`, binding.control_refs);
      fields.set(
        `${bindingPrefix}.route_binding_ref`,
        binding.route_binding_ref,
      );
      fields.set(
        `${bindingPrefix}.component_binding_refs`,
        binding.component_binding_refs,
      );
      fields.set(
        `${bindingPrefix}.root_journey_check_ref`,
        binding.root_journey_check_ref,
      );
      fields.set(`${bindingPrefix}.entry_action_ref`, binding.entry_action_ref);
      for (const target of binding.design_targets)
        fields.set(`${bindingPrefix}.design_targets.${target.key}`, target);
      for (const blocker of binding.acceptance_blockers)
        fields.set(
          `${bindingPrefix}.acceptance_blockers.${blocker.key}`,
          blocker,
        );
    }
    for (const item of outcome.non_completing_outcomes)
      fields.set(`${prefix}.non_completing.${item.key}`, item.statement);
  }
  return fields;
}

function flattenGlobalSemantics(
  projection: GlobalSemanticProjectionV2,
): Map<string, unknown> {
  const fields = new Map<string, unknown>();
  for (const item of projection.constraints)
    fields.set(`global.technical.constraints.${item.key}`, item.statement);
  for (const item of projection.forbidden_shortcuts)
    fields.set(
      `global.technical.forbidden_shortcuts.${item.key}`,
      item.statement,
    );
  return fields;
}

function changedProjectionFields(
  previous: Map<string, unknown>,
  next: Map<string, unknown>,
): string[] {
  return [...new Set([...previous.keys(), ...next.keys()])]
    .filter(
      (field) =>
        !previous.has(field) ||
        !next.has(field) ||
        canonicalValueJson(previous.get(field)) !==
          canonicalValueJson(next.get(field)),
    )
    .sort();
}

function recordKeysAdded(
  previous: Record<string, string>,
  next: Record<string, string>,
): string[] {
  return Object.keys(next)
    .filter((key) => !(key in previous))
    .sort();
}

function recordKeysRemoved(
  previous: Record<string, string>,
  next: Record<string, string>,
): string[] {
  return Object.keys(previous)
    .filter((key) => !(key in next))
    .sort();
}

function recordValuesChanged(
  previous: Record<string, string>,
  next: Record<string, string>,
): string[] {
  return Object.keys(previous)
    .filter((key) => key in next && previous[key] !== next[key])
    .sort();
}
