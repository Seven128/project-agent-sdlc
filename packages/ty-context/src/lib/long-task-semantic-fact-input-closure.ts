import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  containsDesignResourceHandoff,
  parseDesignResourceHandoffMarkdown,
} from "./design-resource-handoff-parser.js";
import {
  assertSameSemanticFactClosureSet,
  semanticFactClosureInvalid,
  uniqueSemanticFactClosureValues,
} from "./long-task-semantic-fact-closure-primitives.js";
import { validateSemanticFactProvenance } from "./long-task-semantic-fact-provenance-closure.js";
import type { CompiledSourceItemV2 } from "./long-task-source-authority-types.js";
import type { LongTaskDesignHandoffPreflight } from "./long-task-design-resource-handoff.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { sha256Hex } from "./strict-codec.js";

export interface DesignOwnedSemanticFactProjectionV1 {
  key: string;
  source_item_refs: string[];
  expected_search_text: string;
}

export interface DesignOwnedSemanticProjectionV1 {
  source_items: Set<string>;
  facts: DesignOwnedSemanticFactProjectionV1[];
}

export function projectDesignOwnedSemanticFacts(
  preflights: LongTaskDesignHandoffPreflight[],
): DesignOwnedSemanticProjectionV1 {
  const sourceItems = new Set<string>();
  const facts = new Map<string, DesignOwnedSemanticFactProjectionV1>();
  for (const preflight of preflights) {
    for (const key of preflight.source_item_keys) sourceItems.add(key);
    if ("preflight_schema_version" in preflight)
      for (const rule of preflight.manifest.fact_rules)
        addDesignFactProjection(facts, {
          key: `design-resource-fact-rule:${preflight.handoff_path}#${rule.key}`,
          source_item_refs: [...rule.source_item_refs],
          expected_search_text: [
            rule.key,
            rule.subject_or_relation_ref,
            rule.target_ref,
            rule.property_ref,
            rule.population_ref ?? "",
            rule.quantifier,
            rule.value_kind,
            rule.provenance_ref,
            rule.observation_scope,
            rule.expected.locator.resource_ref,
            rule.expected.locator.kind,
            rule.expected.locator.value,
            rule.expected.sha256,
            JSON.stringify(rule.region),
            ...rule.evidence_refs,
            ...rule.census_refs,
            ...rule.semantic_obligation_refs,
          ].join("\n"),
        });
    else
      for (const fact of preflight.handoff.facts)
        addDesignFactProjection(facts, {
          key: `design-resource-fact:${preflight.handoff_path}#${fact.key}`,
          source_item_refs: [...fact.source_item_refs],
          expected_search_text: [
            fact.key,
            fact.cell_ref,
            fact.subject_ref,
            fact.target_ref,
            fact.condition_ref,
            fact.variation_ref,
            fact.property_ref,
            fact.dimension,
            fact.observation_scope,
            fact.value_kind,
            fact.value.locator.resource_ref,
            fact.value.locator.kind,
            fact.value.locator.value,
            fact.value.sha256,
            fact.lineage.design_system_ref ?? "",
            ...fact.lineage.token_chain_refs,
            ...fact.lineage.override_chain_refs,
            fact.lineage.resolved_value.locator.resource_ref,
            fact.lineage.resolved_value.locator.kind,
            fact.lineage.resolved_value.locator.value,
            fact.lineage.resolved_value.sha256,
            ...fact.evidence_refs,
          ].join("\n"),
        });
  }
  return {
    source_items: sourceItems,
    facts: [...facts.values()].sort((left, right) =>
      left.key.localeCompare(right.key),
    ),
  };
}

function addDesignFactProjection(
  facts: Map<string, DesignOwnedSemanticFactProjectionV1>,
  fact: DesignOwnedSemanticFactProjectionV1,
): void {
  if (facts.has(fact.key))
    semanticFactClosureInvalid("design_fact_projection_duplicate", fact.key);
  facts.set(fact.key, fact);
}

export async function collectDesignOwnedSemanticFactSourceItems(
  repository: string,
  sourcePaths: string[],
): Promise<Set<string>> {
  const result = new Set<string>();
  for (const sourcePath of sourcePaths) {
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...sourcePath.split("/")),
      `semantic_fact_design_source:${sourcePath}`,
    );
    const content = await readFile(file, "utf8");
    if (!containsDesignResourceHandoff(content)) continue;
    const parsed = parseDesignResourceHandoffMarkdown(sourcePath, content);
    for (const key of parsed.source_item_keys) result.add(key);
  }
  return result;
}

export async function validateSemanticFactInputInventory(
  repository: string,
  sourceItems: CompiledSourceItemV2[],
  contextFiles: string[],
  manifest: SemanticFactManifestV1,
  designOwnedSourceItems: Set<string>,
): Promise<void> {
  const sourceItemByKey = new Map(sourceItems.map((item) => [item.key, item]));
  const sourceInputs = manifest.inputs.filter(
    (item) => item.kind === "source_item",
  );
  assertSameSemanticFactClosureSet(
    manifest.scope.source_item_refs,
    sourceItems.map((item) => item.key),
    "manifest_source_item_universe",
  );
  assertSameSemanticFactClosureSet(
    sourceInputs.map((item) => item.source_ref),
    sourceItems.map((item) => item.key),
    "input_source_item_universe",
  );
  validateSourceInputDigests(
    sourceInputs,
    sourceItemByKey,
    designOwnedSourceItems,
  );
  const contextInputs = manifest.inputs.filter(
    (item) => item.kind === "context",
  );
  assertSameSemanticFactClosureSet(
    contextInputs.map((item) => item.source_ref),
    contextFiles,
    "input_context_universe",
  );
  for (const input of manifest.inputs)
    await validateInput(repository, manifest, input, designOwnedSourceItems);
  validateInputFactLineage(manifest, sourceInputs);
  validateSemanticFactProvenance(manifest, sourceItems);
}

function validateSourceInputDigests(
  sourceInputs: SemanticFactManifestV1["inputs"],
  sourceItemByKey: Map<string, CompiledSourceItemV2>,
  designOwnedSourceItems: Set<string>,
): void {
  for (const input of sourceInputs) {
    const sourceItem = sourceItemByKey.get(input.source_ref)!;
    if (input.sha256 !== sourceItem.text_sha256)
      semanticFactClosureInvalid(
        "input_source_item_digest_mismatch",
        `${input.key}:${input.source_ref}`,
      );
    const designOwned = designOwnedSourceItems.has(input.source_ref);
    if (
      designOwned
        ? !["ui_design", "non_ui_material"].includes(input.disposition)
        : input.disposition !== "non_ui_material"
    )
      semanticFactClosureInvalid(
        "material_source_item_disposition_mismatch",
        `${input.key}:${input.source_ref}:${input.disposition}:${
          designOwned ? "ui_design_or_non_ui_material" : "non_ui_material"
        }`,
      );
  }
}

async function validateInput(
  repository: string,
  manifest: SemanticFactManifestV1,
  input: SemanticFactManifestV1["inputs"][number],
  designOwnedSourceItems: Set<string>,
): Promise<void> {
  const projectionInput =
    input.kind === "source_fragment" || input.kind === "semantic_anchor";
  const projectionDispositions = [
    "fact_bearing",
    "supporting_basis",
    "superseded",
    "decision_required",
    "scope_excluded",
  ];
  const resourceDispositions = [
    "non_ui_material",
    "ui_design",
    "supporting_only",
    "excluded_by_scope",
  ];
  if (
    projectionInput
      ? !projectionDispositions.includes(input.disposition)
      : !resourceDispositions.includes(input.disposition)
  )
    semanticFactClosureInvalid(
      "input_disposition_kind_mismatch",
      `${input.key}:${input.kind}:${input.disposition}`,
    );
  uniqueSemanticFactClosureValues(
    input.fact_refs,
    `input_fact_refs:${input.key}`,
  );
  uniqueSemanticFactClosureValues(
    input.basis_refs,
    `input_basis_refs:${input.key}`,
  );
  const factBearing = ["non_ui_material", "fact_bearing"].includes(
    input.disposition,
  );
  const requiresFactRefs =
    factBearing || input.disposition === "supporting_basis";
  if (requiresFactRefs ? !input.fact_refs.length : input.fact_refs.length)
    semanticFactClosureInvalid(
      "input_fact_disposition_mismatch",
      `${input.key}:${input.disposition}`,
    );
  if (!factBearing && !input.rationale.trim())
    semanticFactClosureInvalid(
      "input_disposition_rationale_required",
      input.key,
    );
  if (
    ["canonical_spec", "external_constraint", "delegated_instruction"].includes(
      input.kind,
    ) &&
    input.disposition !== "non_ui_material"
  )
    semanticFactClosureInvalid(
      "material_input_disposition_mismatch",
      `${input.key}:${input.kind}:${input.disposition}`,
    );
  const uiDesignInput =
    input.kind === "design_resource" ||
    (input.kind === "source_item" &&
      designOwnedSourceItems.has(input.source_ref));
  if (
    uiDesignInput
      ? !["ui_design", "non_ui_material"].includes(input.disposition)
      : input.disposition === "ui_design"
  )
    semanticFactClosureInvalid(
      "ui_design_input_kind_mismatch",
      `${input.key}:${input.kind}:${input.disposition}`,
    );
  if (
    ["excluded_by_scope", "scope_excluded"].includes(input.disposition) &&
    !manifest.scope.exclusions.some((exclusion) =>
      exclusion.affected_refs.includes(input.key),
    )
  )
    semanticFactClosureInvalid("input_scope_exclusion_missing", input.key);
  if (input.kind === "source_item" || projectionInput) return;
  const file = await assertProtectedRepositoryFile(
    repository,
    path.resolve(repository, ...input.source_ref.split("/")),
    `semantic_fact_input:${input.key}`,
  );
  const digest = sha256Hex(await readFile(file));
  if (digest !== input.sha256)
    semanticFactClosureInvalid(
      "input_resource_digest_mismatch",
      `${input.key}:${input.source_ref}`,
    );
}

function validateInputFactLineage(
  manifest: SemanticFactManifestV1,
  sourceInputs: SemanticFactManifestV1["inputs"],
): void {
  const facts = new Map(manifest.facts.map((item) => [item.key, item]));
  for (const input of manifest.inputs)
    for (const factRef of input.fact_refs)
      if (!facts.has(factRef))
        semanticFactClosureInvalid(
          "input_fact_unknown",
          `${input.key}:${factRef}`,
        );
      else {
        const fact = facts.get(factRef)!;
        const projectedSourceRef = projectionSourceItemRef(input);
        if (
          input.kind === "source_item"
            ? !fact.source_item_refs.includes(input.source_ref)
            : projectedSourceRef
              ? !fact.source_item_refs.includes(projectedSourceRef)
              : !fact.provenance.basis_refs.includes(input.key)
        )
          semanticFactClosureInvalid(
            "input_fact_lineage_mismatch",
            `${input.key}:${factRef}`,
          );
      }
  for (const fact of manifest.facts) {
    const sourceInputRefs = fact.source_item_refs.map((sourceItemRef) => {
      const input = sourceInputs.find(
        (item) => item.source_ref === sourceItemRef,
      );
      if (!input)
        semanticFactClosureInvalid(
          "fact_source_input_missing",
          `${fact.key}:${sourceItemRef}`,
        );
      if (
        input.disposition !== "non_ui_material" ||
        !input.fact_refs.includes(fact.key)
      )
        semanticFactClosureInvalid(
          "fact_source_input_lineage_mismatch",
          `${fact.key}:${input.key}`,
        );
      return input.key;
    });
    if (!sourceInputRefs.length)
      semanticFactClosureInvalid("fact_source_input_required", fact.key);
  }
}

function projectionSourceItemRef(
  input: SemanticFactManifestV1["inputs"][number],
): string | null {
  if (input.kind !== "source_fragment" && input.kind !== "semantic_anchor")
    return null;
  const separator = input.source_ref.indexOf("#fragment:");
  return separator > 0 ? input.source_ref.slice(0, separator) : null;
}
