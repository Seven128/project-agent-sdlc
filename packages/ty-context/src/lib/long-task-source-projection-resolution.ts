import { semanticFactClosureInvalid } from "./long-task-semantic-fact-closure-primitives.js";
import type {
  CompiledSourceItemV2,
  MaterialSourceFragmentV2,
  SemanticFactClassV2,
  SourceAuthorityDomain,
} from "./long-task-source-authority-types.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { canonicalValueJson } from "./strict-codec.js";
import type {
  ResolvedSourceProjectionV2,
  SourceConservationFactProjectionV2,
  SourceProjectionDispositionV2,
} from "./long-task-source-conservation-types.js";

export function resolveFragmentProjection(
  fragment: MaterialSourceFragmentV2,
  fragmentCount: number,
  sourceInput: SemanticFactManifestV1["inputs"][number],
  manifest: SemanticFactManifestV1,
  designFactRefs: string[],
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
  if (explicit.length === 1) {
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
      explicit: true,
      authority_derived: false,
    };
  }
  if (fragmentCount !== 1)
    semanticFactClosureInvalid(
      "source_fragment_disposition_missing",
      fragment.key,
    );
  return {
    input_key: sourceInput.key,
    disposition:
      sourceInput.disposition === "ui_design"
        ? "fact_bearing"
        : legacyProjectionDisposition(sourceInput.disposition),
    fact_refs:
      sourceInput.disposition === "ui_design"
        ? designFactRefs
        : sourceInput.fact_refs,
    basis_refs: sourceInput.basis_refs,
    explicit: false,
    authority_derived: sourceInput.disposition === "ui_design",
  };
}

export function normalizeLegacyProjection(
  projection: ResolvedSourceProjectionV2,
  fragment: MaterialSourceFragmentV2,
  sourceItem: CompiledSourceItemV2,
  facts: ReadonlyMap<string, SourceConservationFactProjectionV2>,
  factClasses: Record<string, SemanticFactClassV2>,
  factDomains: Record<string, SourceAuthorityDomain>,
): ResolvedSourceProjectionV2 {
  if (
    !projection.explicit &&
    !projection.authority_derived &&
    projection.disposition === "fact_bearing" &&
    isCanonicalSourceIntegrityStatement(sourceItem)
  )
    return { ...projection, disposition: "supporting_basis" };
  if (
    projection.explicit ||
    projection.authority_derived ||
    projection.disposition !== "fact_bearing" ||
    projection.fact_refs.some(
      (ref) =>
        facts.has(ref) &&
        factClasses[ref] === "delivery_semantic" &&
        factDomains[ref] === fragment.authority_domain,
    )
  )
    return projection;
  return { ...projection, disposition: "supporting_basis" };
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

export function exactlyOne<T>(values: T[], code: string, detail: string): T {
  if (values.length !== 1)
    semanticFactClosureInvalid(
      values.length ? `${code}_duplicate` : `${code}_missing`,
      detail,
    );
  return values[0];
}

function legacyProjectionDisposition(
  value: string,
): SourceProjectionDispositionV2 {
  if (value === "non_ui_material") return "fact_bearing";
  if (value === "excluded_by_scope") return "scope_excluded";
  return "supporting_basis";
}

function sameStrings(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
