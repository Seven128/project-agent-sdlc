import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  resolveSemanticFactPointer,
  semanticFactClosureInvalid,
} from "./long-task-semantic-fact-closure-primitives.js";
import type { CompiledSourceItemV2 } from "./long-task-source-authority-types.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import type {
  SemanticFactLocatedValueV1,
  SemanticFactManifestV1,
} from "./semantic-fact-types.js";
import {
  canonicalValueJson,
  parseStrictYaml,
  sha256Hex,
} from "./strict-codec.js";

type Resource = { raw: string; parsed: unknown };

export async function validateSemanticFactLocatedValues(
  repository: string,
  manifest: SemanticFactManifestV1,
  sourceItems: CompiledSourceItemV2[],
): Promise<void> {
  const values = collectLocatedValues(manifest);
  const inputs = new Map(manifest.inputs.map((item) => [item.key, item]));
  const sourceItemByKey = new Map(sourceItems.map((item) => [item.key, item]));
  const resourceCache = new Map<string, Resource>();
  for (const entry of values) {
    const located = entry.value;
    if (located.representation === "digest_only") continue;
    const resolved = await resolveLocatedValue(
      repository,
      manifest,
      entry.label,
      located,
      inputs,
      sourceItemByKey,
      resourceCache,
    );
    if (resolved.external) continue;
    if (
      located.representation === "inline" &&
      canonicalValueJson(resolved.value) !== canonicalValueJson(located.value)
    )
      semanticFactClosureInvalid("inline_value_locator_mismatch", entry.label);
    const digest = sha256Hex(canonicalValueJson(resolved.value));
    if (digest !== located.sha256)
      semanticFactClosureInvalid(
        "located_value_digest_mismatch",
        `${entry.label}:${located.sha256}:${digest}`,
      );
  }
}

function collectLocatedValues(
  manifest: SemanticFactManifestV1,
): Array<{ label: string; value: SemanticFactLocatedValueV1 }> {
  return [
    ...manifest.populations.map((item) => ({
      label: `population:${item.key}:universe`,
      value: item.universe,
    })),
    ...manifest.facts.map((item) => ({
      label: `fact:${item.key}:expected`,
      value: item.expected,
    })),
    ...manifest.proof_obligations.flatMap((item) => [
      {
        label: `proof:${item.key}:parameters`,
        value: item.comparison.parameters,
      },
      ...(item.comparison.tolerance
        ? [
            {
              label: `proof:${item.key}:tolerance`,
              value: item.comparison.tolerance,
            },
          ]
        : []),
      ...(item.comparison.mask
        ? [
            {
              label: `proof:${item.key}:mask`,
              value: item.comparison.mask,
            },
          ]
        : []),
    ]),
    ...manifest.environments.map((item) => ({
      label: `environment:${item.key}`,
      value: item.definition,
    })),
  ];
}

async function resolveLocatedValue(
  repository: string,
  manifest: SemanticFactManifestV1,
  label: string,
  located: SemanticFactLocatedValueV1,
  inputs: Map<string, SemanticFactManifestV1["inputs"][number]>,
  sourceItemByKey: Map<string, CompiledSourceItemV2>,
  resourceCache: Map<string, Resource>,
): Promise<{ external: boolean; value: unknown }> {
  if (located.locator.kind === "manifest_pointer")
    return {
      external: false,
      value: resolveSemanticFactPointer(manifest, located.locator.value, label),
    };
  const input = inputs.get(located.locator.material_ref);
  if (!input)
    semanticFactClosureInvalid(
      "located_value_input_unknown",
      `${label}:${located.locator.material_ref}`,
    );
  if (located.locator.kind === "source_item") {
    if (input.kind !== "source_item")
      semanticFactClosureInvalid(
        "located_value_source_item_kind_mismatch",
        label,
      );
    const sourceItem = sourceItemByKey.get(input.source_ref);
    if (!sourceItem)
      semanticFactClosureInvalid("located_value_source_item_unknown", label);
    return { external: false, value: sourceItem.normalized_text };
  }
  const resource = await loadLocatedResource(
    repository,
    input.source_ref,
    label,
    located.locator.kind,
    resourceCache,
  );
  if (located.locator.kind === "whole_resource")
    return { external: false, value: resource.raw };
  if (
    located.locator.kind === "json_pointer" ||
    located.locator.kind === "yaml_pointer" ||
    located.locator.kind === "schema_pointer"
  )
    return {
      external: false,
      value: resolveSemanticFactPointer(
        resource.parsed,
        located.locator.value,
        label,
      ),
    };
  if (
    manifest.inspector.trust !== "named_external_tcb" ||
    !manifest.inspector.capabilities.includes(`resolve.${located.locator.kind}`)
  )
    semanticFactClosureInvalid(
      "located_value_external_resolver_required",
      `${label}:${located.locator.kind}`,
    );
  return { external: true, value: undefined };
}

async function loadLocatedResource(
  repository: string,
  sourceRef: string,
  label: string,
  locatorKind: SemanticFactLocatedValueV1["locator"]["kind"],
  cache: Map<string, Resource>,
): Promise<Resource> {
  const cached = cache.get(sourceRef);
  if (cached) return cached;
  const file = await assertProtectedRepositoryFile(
    repository,
    path.resolve(repository, ...sourceRef.split("/")),
    `semantic_fact_located_value:${label}`,
  );
  const raw = await readFile(file, "utf8");
  let parsed: unknown = raw;
  if (locatorKind === "json_pointer" || locatorKind === "schema_pointer")
    parsed = JSON.parse(raw) as unknown;
  else if (locatorKind === "yaml_pointer") parsed = parseStrictYaml(raw);
  const resource = { raw, parsed };
  cache.set(sourceRef, resource);
  return resource;
}
