import { readFile } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { semanticFactClosureInvalid } from "./long-task-semantic-fact-closure-primitives.js";
import { sourceAuthorityDomain } from "./long-task-source-fragments.js";
import type {
  CompiledSourceItemV2,
  MaterialTextInputV2,
  SourceAuthorityDomain,
} from "./long-task-source-authority-types.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { sha256Hex } from "./strict-codec.js";

const MATERIAL_RESOURCE_KINDS = new Set([
  "attachment",
  "canonical_spec",
  "repository_preservation",
  "external_constraint",
  "delegated_instruction",
  "design_resource",
]);

export async function deriveMaterialTextInputs(
  repository: string,
  sourceItems: CompiledSourceItemV2[],
  manifest: SemanticFactManifestV1,
  designOwnedSourceItems: ReadonlySet<string>,
): Promise<MaterialTextInputV2[]> {
  const sourceByKey = new Map(sourceItems.map((item) => [item.key, item]));
  const result: MaterialTextInputV2[] = sourceItems.map((item) => ({
    input_key: item.key,
    input_kind: "source_item",
    source_ref: item.source_path,
    sha256: item.text_sha256,
    authority_source_item_refs: [item.key],
    authority_domain: sourceAuthorityDomain(
      item,
      designOwnedSourceItems.has(item.key),
    ),
    normalized_text: normalizeText(item.normalized_text),
  }));
  for (const input of manifest.inputs) {
    if (!MATERIAL_RESOURCE_KINDS.has(input.kind)) continue;
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...input.source_ref.split("/")),
      `material_text_input:${input.key}`,
    );
    const bytes = await readFile(file);
    if (sha256Hex(bytes) !== input.sha256)
      semanticFactClosureInvalid(
        "material_text_input_digest_mismatch",
        `${input.key}:${input.source_ref}`,
      );
    const decoded = decodeStrictUtf8(bytes);
    if (decoded === null) {
      if (input.kind === "design_resource" && input.disposition === "ui_design")
        continue;
      semanticFactClosureInvalid(
        "material_text_input_invalid_utf8",
        `${input.key}:${input.source_ref}`,
      );
    }
    if (!decoded.trim())
      semanticFactClosureInvalid(
        "material_text_input_empty_or_ambiguous",
        `${input.key}:${input.source_ref}`,
      );
    const authoritySourceItemRefs = authoritySources(
      input,
      manifest,
      sourceByKey,
    );
    const authorityDomain =
      input.kind === "design_resource"
        ? "design"
        : oneAuthorityDomain(
            input.key,
            authoritySourceItemRefs.map((ref) =>
              sourceAuthorityDomain(
                sourceByKey.get(ref)!,
                designOwnedSourceItems.has(ref),
              ),
            ),
          );
    result.push({
      input_key: input.key,
      input_kind: input.kind as MaterialTextInputV2["input_kind"],
      source_ref: input.source_ref,
      sha256: input.sha256,
      authority_source_item_refs: authoritySourceItemRefs,
      authority_domain: authorityDomain,
      normalized_text: normalizeText(decoded),
    });
  }
  return result.sort((left, right) =>
    left.input_key.localeCompare(right.input_key),
  );
}

function authoritySources(
  input: SemanticFactManifestV1["inputs"][number],
  manifest: SemanticFactManifestV1,
  sourceByKey: ReadonlyMap<string, CompiledSourceItemV2>,
): string[] {
  const facts = new Map(manifest.facts.map((fact) => [fact.key, fact]));
  const directRefs = new Set<string>();
  for (const basisRef of input.basis_refs)
    if (sourceByKey.has(basisRef)) directRefs.add(basisRef);
  if (directRefs.size) return [...directRefs].sort();
  const refs = new Set<string>();
  for (const factRef of input.fact_refs)
    for (const sourceRef of facts.get(factRef)?.source_item_refs ?? [])
      if (sourceByKey.has(sourceRef)) refs.add(sourceRef);
  if (!refs.size)
    semanticFactClosureInvalid(
      "material_text_input_authority_source_required",
      input.key,
    );
  return [...refs].sort();
}

function oneAuthorityDomain(
  inputKey: string,
  domains: SourceAuthorityDomain[],
): SourceAuthorityDomain {
  const unique = [...new Set(domains)];
  if (unique.length !== 1)
    semanticFactClosureInvalid(
      "material_text_input_authority_domain_ambiguous",
      `${inputKey}:${unique.sort().join(",")}`,
    );
  return unique[0];
}

function decodeStrictUtf8(bytes: Buffer): string | null {
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return decoded.includes("\0") ? null : decoded;
  } catch {
    return null;
  }
}

function normalizeText(value: string): string {
  return value.replace(/\r\n?/gu, "\n");
}
