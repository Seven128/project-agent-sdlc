import { semanticFactClosureInvalid } from "./long-task-semantic-fact-closure-primitives.js";
import type {
  CompiledSourceItemV2,
  MaterialSourceFragmentV2,
} from "./long-task-source-authority-types.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { canonicalValueJson } from "./strict-codec.js";
import type {
  ResolvedSourceProjectionV2,
  SourceProjectionDispositionV2,
} from "./long-task-source-conservation-types.js";

export function resolveFragmentProjection(
  fragment: MaterialSourceFragmentV2,
  manifest: SemanticFactManifestV1,
): ResolvedSourceProjectionV2 {
  const explicit = manifest.inputs.filter(
    (input) =>
      input.kind === "source_fragment" && input.source_ref === fragment.key,
  );
  if (explicit.length > 1)
    semanticFactClosureInvalid(
      "source_fragment_disposition_duplicate",
      fragment.key,
    );
  if (explicit.length !== 1)
    semanticFactClosureInvalid(
      "source_fragment_disposition_missing",
      fragment.key,
    );
  const input = explicit[0];
  if (input.sha256 !== fragment.text_sha256)
    semanticFactClosureInvalid(
      "source_fragment_digest_mismatch",
      `${input.key}:${fragment.key}`,
    );
  return {
    input_key: input.key,
    disposition: input.disposition as SourceProjectionDispositionV2,
    fact_refs: input.fact_refs,
    basis_refs: input.basis_refs,
    ...(input.supporting_relation
      ? { supporting_relation: input.supporting_relation }
      : {}),
    explicit: true,
    authority_derived: false,
  };
}

export function isCanonicalSourceIntegrityStatement(
  item: CompiledSourceItemV2 | undefined,
): boolean {
  const prefix = "Execution target authority: ";
  if (
    item?.kind !== "technical_obligation" ||
    !item.normalized_text.startsWith(`${prefix}{`) ||
    !item.normalized_text.endsWith("}.")
  )
    return false;
  const encoded = item.normalized_text.slice(prefix.length, -1);
  try {
    const value: unknown = JSON.parse(encoded);
    if (!value || typeof value !== "object" || Array.isArray(value))
      return false;
    const record = value as Record<string, unknown>;
    if (
      !sameStrings(Object.keys(record).sort(), [
        "capabilities",
        "key",
        "role",
        "root_argv",
        "root_entrypoint",
        "runtime_family",
      ]) ||
      !["key", "role", "root_entrypoint", "runtime_family"].every(
        (key) => typeof record[key] === "string" && record[key].length > 0,
      ) ||
      !["capabilities", "root_argv"].every(
        (key) =>
          Array.isArray(record[key]) &&
          record[key].every((entry) => typeof entry === "string"),
      )
    )
      return false;
    return canonicalValueJson(record) === encoded;
  } catch {
    return false;
  }
}

function sameStrings(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
