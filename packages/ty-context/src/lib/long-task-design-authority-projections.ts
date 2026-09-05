import type {
  CompiledSourceItemV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import type { LongTaskDesignHandoffPreflight } from "./long-task-design-resource-handoff.js";
import { designOwnedSemanticFactProjectionKey } from "./long-task-semantic-fact-input-closure.js";
import { normalizeSemanticFactManifestForCompactAuthoring } from "./semantic-fact-compact-authoring.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export interface ProjectedSemanticFactManifestBinding {
  source_path: string;
  sha256: string;
}

export function projectHandoffSemantics(
  handoff: LongTaskDesignHandoffPreflight["handoff"],
): unknown {
  return {
    ...handoff,
    technical_feasibility_inputs: handoff.technical_feasibility_inputs.map(
      ({ path: _path, sha256: _sha256, ...semanticInput }) => semanticInput,
    ),
  };
}

export function projectFeasibilitySemantics(
  feasibility: LongTaskDesignHandoffPreflight["technical_feasibility_documents"][number],
  implementationPaths: ReadonlySet<string>,
): unknown {
  return {
    schema_version: feasibility.schema_version,
    key: feasibility.key,
    target_ref: feasibility.target_ref,
    realization_mode: feasibility.realization_mode,
    source_records: [...feasibility.source_records]
      .sort(designAuthorityKeyOrder)
      .map((record) => {
        const normalized = implementationPaths.has(record.path)
          ? {
              ...record,
              path: "@design-implementation-binding",
              sha256: "@design-implementation-binding",
              locator: "@design-implementation-binding",
            }
          : record;
        return { ...normalized, roles: [...record.roles].sort() };
      }),
    substrate_observations: [...feasibility.substrate_observations].sort(
      (left, right) => left.kind.localeCompare(right.kind),
    ),
    condition_model: feasibility.condition_model,
    component_family_cells: [...feasibility.component_family_cells]
      .sort(designAuthorityKeyOrder)
      .map((cell) => ({
        ...cell,
        feasible_realizations: cell.feasible_realizations.map(
          (realization) => ({
            ...realization,
            owner_candidates: realization.owner_candidates.map((candidate) =>
              candidate.kind === "existing_path" &&
              implementationPaths.has(candidate.locator)
                ? {
                    ...candidate,
                    locator: "@design-implementation-binding",
                  }
                : candidate,
            ),
          }),
        ),
      })),
    blockers: [...feasibility.blockers].sort(designAuthorityKeyOrder),
  };
}

export function projectNonBindingContract(
  contract: DeliveryContractV2,
  replaceablePathsByTarget: ReadonlyMap<string, ReadonlySet<string>>,
  designBindingKeys: ReadonlyMap<string, ReadonlySet<string>>,
  handoffIdentitiesByPath: ReadonlyMap<string, string>,
  designSemanticIdentities: ReadonlyMap<string, string> = new Map(),
  semanticFactManifestSha256: string | null = null,
): unknown {
  const projected = structuredClone(contract);
  if (semanticFactManifestSha256)
    projected.semantic_fact_manifest.sha256 = semanticFactManifestSha256;
  projected.task.source_paths = projected.task.source_paths
    .map((sourcePath) => handoffIdentitiesByPath.get(sourcePath) ?? sourcePath)
    .sort();
  projected.source_claims = projected.source_claims.map((claim) => ({
    ...claim,
    source_ref: projectSourceRef(claim.source_ref, handoffIdentitiesByPath),
  }));
  for (const outcome of projected.outcomes) {
    const bindingKeys = designBindingKeys.get(outcome.key) ?? new Set();
    outcome.technical.bindings = outcome.technical.bindings.map((binding) =>
      bindingKeys.has(binding.key)
        ? {
            ...binding,
            target: "@design-implementation-binding",
            carrier_paths: [],
          }
        : binding,
    );
    const checkBindingPaths = new Map<string, Set<string>>();
    for (const surface of outcome.product.surface_bindings)
      for (const target of surface.design_targets) {
        const bindingPaths =
          replaceablePathsByTarget.get(target.key) ?? new Set<string>();
        target.source_paths = target.source_paths
          .filter((sourcePath) => !bindingPaths.has(sourcePath))
          .sort();
        const checkPaths =
          checkBindingPaths.get(target.conformance_check_ref) ??
          new Set<string>();
        for (const bindingPath of bindingPaths) checkPaths.add(bindingPath);
        checkBindingPaths.set(target.conformance_check_ref, checkPaths);
      }
    for (const check of outcome.acceptance.checks) {
      const bindingPaths =
        checkBindingPaths.get(check.key) ?? new Set<string>();
      check.verification_inputs = check.verification_inputs
        .filter((input) => !bindingPaths.has(input))
        .sort();
    }
  }
  return projectExactIdentities(projected, designSemanticIdentities);
}

export function projectNonBindingSource(
  sourceHashes: Record<string, string>,
  sourceItems: readonly CompiledSourceItemV2[],
  handoffIdentitiesByPath: ReadonlyMap<string, string>,
  semanticFactManifest: ProjectedSemanticFactManifestBinding | null,
): unknown {
  return {
    source_hashes: Object.fromEntries(
      Object.entries(sourceHashes)
        .filter(([sourcePath]) => !handoffIdentitiesByPath.has(sourcePath))
        .map(([sourcePath, sha256]) => [
          sourcePath,
          semanticFactManifest?.source_path === sourcePath
            ? semanticFactManifest.sha256
            : sha256,
        ])
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
    source_items: projectSourceItems(sourceItems, handoffIdentitiesByPath).sort(
      designAuthorityKeyOrder,
    ),
  };
}

export function projectSourceItems(
  sourceItems: readonly CompiledSourceItemV2[],
  handoffIdentitiesByPath: ReadonlyMap<string, string>,
): CompiledSourceItemV2[] {
  return sourceItems.map((item) => ({
    ...item,
    source_path:
      handoffIdentitiesByPath.get(item.source_path) ?? item.source_path,
  }));
}

export function designHandoffSemanticIdentity(
  targetKeys: readonly string[],
): string {
  return `@design-handoff:${JSON.stringify(
    [...new Set(targetKeys)].sort((left, right) => left.localeCompare(right)),
  )}`;
}

export function designSemanticIdentityMap(
  preflights: readonly LongTaskDesignHandoffPreflight[],
): ReadonlyMap<string, string> {
  const identities = new Map<string, string>();
  const stableIdentities = new Set<string>();
  for (const preflight of preflights) {
    const rows =
      "preflight_schema_version" in preflight
        ? preflight.manifest.fact_rules.map((rule) => ({
            kind: "fact_rule" as const,
            key: rule.key,
            target_ref: rule.target_ref,
          }))
        : preflight.handoff.facts.map((fact) => ({
            kind: "fact" as const,
            key: fact.key,
            target_ref: fact.target_ref,
          }));
    for (const row of rows) {
      const current = designOwnedSemanticFactProjectionKey(
        row.kind,
        preflight.handoff_path,
        row.key,
      );
      const stable = `@design-semantic:${JSON.stringify([
        row.kind,
        row.target_ref,
        row.key,
      ])}`;
      if (identities.has(current) || stableIdentities.has(stable))
        throw new Error(
          `design_semantic_projection_identity_duplicate:${stable}`,
        );
      identities.set(current, stable);
      stableIdentities.add(stable);
    }
  }
  return identities;
}

export function projectSemanticFactManifest(
  manifest: SemanticFactManifestV1,
  designSemanticIdentities: ReadonlyMap<string, string>,
): SemanticFactManifestV1 {
  return normalizeSemanticFactManifestForCompactAuthoring(
    projectExactIdentities(
      manifest,
      designSemanticIdentities,
    ) as SemanticFactManifestV1,
  );
}

function projectExactIdentities(
  value: unknown,
  identities: ReadonlyMap<string, string>,
): unknown {
  if (typeof value === "string") return identities.get(value) ?? value;
  if (Array.isArray(value)) {
    const projected = value.map((item) =>
      projectExactIdentities(item, identities),
    );
    return value.every((item) => typeof item === "string") &&
      value.some((item) => identities.has(item as string))
      ? (projected as string[]).sort((left, right) => left.localeCompare(right))
      : projected;
  }
  if (!value || typeof value !== "object") return value;
  const projected = new Map<string, unknown>();
  for (const [key, item] of Object.entries(value)) {
    const projectedKey = identities.get(key) ?? key;
    if (projected.has(projectedKey))
      throw new Error(
        `design_semantic_projection_key_collision:${projectedKey}`,
      );
    projected.set(projectedKey, projectExactIdentities(item, identities));
  }
  return Object.fromEntries(projected);
}

function projectSourceRef(
  sourceRef: string,
  handoffIdentitiesByPath: ReadonlyMap<string, string>,
): string {
  const separator = sourceRef.indexOf("#");
  const sourcePath = separator < 0 ? sourceRef : sourceRef.slice(0, separator);
  const projectedPath = handoffIdentitiesByPath.get(sourcePath);
  if (!projectedPath) return sourceRef;
  return `${projectedPath}${separator < 0 ? "" : sourceRef.slice(separator)}`;
}

export function designAuthorityKeyOrder(
  left: { key: string },
  right: { key: string },
): number {
  return left.key.localeCompare(right.key);
}
