import { validateSemanticFactContractProjection } from "./long-task-semantic-fact-contract-closure.js";
import {
  assertSameSemanticFactClosureSet,
  semanticFactClosureInvalid,
} from "./long-task-semantic-fact-closure-primitives.js";
import {
  collectDesignOwnedSemanticFactSourceItems,
  projectDesignOwnedSemanticFacts,
  validateSemanticFactInputInventory,
} from "./long-task-semantic-fact-input-closure.js";
import type { LongTaskDesignHandoffPreflight } from "./long-task-design-resource-handoff.js";
import { validateSemanticFactBasisClosure } from "./long-task-semantic-fact-provenance-closure.js";
import { validateSemanticFactLocatedValues } from "./long-task-semantic-fact-value-closure.js";
import {
  validateSourceSemanticConservation,
  type SourceSemanticConservationV2,
} from "./long-task-source-conservation.js";
import type {
  CompiledSourceItemV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import {
  semanticFactCollectionIdentity,
  validateSemanticFactManifestPolicy,
} from "./semantic-fact-policy.js";
import { loadSemanticFactManifest } from "./semantic-fact-source-parser.js";
import type {
  SemanticFactExpectationV2,
  SemanticFactManifestV1,
} from "./semantic-fact-types.js";

export interface LongTaskSemanticFactClosureV2 {
  manifest: SemanticFactManifestV1;
  manifest_sha256: string;
  manifest_source_path: string;
  expectations_by_check: Map<string, SemanticFactExpectationV2[]>;
  source_conservation: SourceSemanticConservationV2;
}

export async function validateLongTaskSemanticFactClosure(
  contract: DeliveryContractV2,
  repository: string,
  sourceItems: CompiledSourceItemV2[],
  contextFiles: string[],
  designHandoffs?: LongTaskDesignHandoffPreflight[],
): Promise<LongTaskSemanticFactClosureV2> {
  const parsed = await loadSemanticFactManifest(
    repository,
    contract.task.source_paths,
  );
  const manifest = parsed.manifest;
  validateManifestReference(contract, parsed);
  const designProjection = designHandoffs
    ? projectDesignOwnedSemanticFacts(designHandoffs)
    : {
        source_items: await collectDesignOwnedSemanticFactSourceItems(
          repository,
          contract.task.source_paths,
        ),
        facts: [],
      };
  const index = validateSemanticFactManifestPolicy(
    manifest,
    new Set(designProjection.facts.map((fact) => fact.key)),
  );
  const materialInputs = await validateSemanticFactInputInventory(
    repository,
    sourceItems,
    contextFiles,
    manifest,
    designProjection,
  );
  const sourceConservation = validateSourceSemanticConservation(
    sourceItems,
    manifest,
    designProjection,
    materialInputs,
    semanticFactClaimPolarities(contract),
  );
  validateSemanticFactBasisClosure(manifest, sourceItems);
  await validateSemanticFactLocatedValues(repository, manifest, sourceItems);
  const expectations = validateSemanticFactContractProjection(
    contract,
    manifest,
    index,
    new Map(
      parsed.fact_revisions.map((item) => [item.key, item.revision_digest]),
    ),
    new Map(
      parsed.obligation_revisions.map((item) => [
        item.key,
        item.revision_digest,
      ]),
    ),
    parsed.carrier === "compact_v1",
  );
  return {
    manifest,
    manifest_sha256: parsed.sha256,
    manifest_source_path: parsed.source_path,
    expectations_by_check: expectations,
    source_conservation: sourceConservation,
  };
}

function semanticFactClaimPolarities(
  contract: DeliveryContractV2,
): Map<string, ReadonlySet<"positive" | "negative">> {
  const result = new Map<string, Set<"positive" | "negative">>();
  for (const outcome of contract.outcomes)
    for (const binding of outcome.semantic_fact_bindings.facts) {
      const values = result.get(binding.fact_ref) ?? new Set();
      values.add(binding.required_polarity ?? "positive");
      result.set(binding.fact_ref, values);
    }
  for (const binding of contract.global.semantic_fact_bindings?.obligations ??
    []) {
    const values = result.get(binding.fact_ref) ?? new Set();
    values.add(binding.required_polarity);
    result.set(binding.fact_ref, values);
  }
  return result;
}

function validateManifestReference(
  contract: DeliveryContractV2,
  parsed: Awaited<ReturnType<typeof loadSemanticFactManifest>>,
): void {
  const declared = contract.semantic_fact_manifest;
  if (
    declared.key !== parsed.manifest.key ||
    declared.source_path !== parsed.source_path ||
    declared.sha256 !== parsed.sha256
  )
    semanticFactClosureInvalid("manifest_identity_mismatch", {
      expected: declared,
      actual: {
        key: parsed.manifest.key,
        source_path: parsed.source_path,
        sha256: parsed.sha256,
      },
    });
  if (!contract.task.source_paths.includes(declared.source_path))
    semanticFactClosureInvalid(
      "manifest_source_not_declared",
      declared.source_path,
    );
  assertSameSemanticFactClosureSet(
    parsed.manifest.scope.outcome_refs,
    contract.outcomes.map((item) => item.key),
    "manifest_outcome_universe",
  );
  for (const outcome of contract.outcomes)
    if (
      outcome.semantic_fact_bindings.manifest_ref !==
      contract.semantic_fact_manifest.key
    )
      semanticFactClosureInvalid(
        "outcome_manifest_ref_mismatch",
        `${outcome.key}:${outcome.semantic_fact_bindings.manifest_ref}`,
      );
  if (
    contract.global.semantic_fact_bindings &&
    contract.global.semantic_fact_bindings.manifest_ref !==
      contract.semantic_fact_manifest.key
  )
    semanticFactClosureInvalid(
      "global_manifest_ref_mismatch",
      contract.global.semantic_fact_bindings.manifest_ref,
    );
}

export const semantic_fact_manifest = "semantic-fact-manifest-v1";
export const semantic_fact_contract_projection_enabled = true;
export const expected_semantic_fact_universe = semanticFactCollectionIdentity;
