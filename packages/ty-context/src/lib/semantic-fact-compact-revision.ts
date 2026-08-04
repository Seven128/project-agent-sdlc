import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

function normalizeLocatedValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeLocatedValues);
  if (!value || typeof value !== "object") return value;
  const row = value as Record<string, unknown>;
  if (
    Object.hasOwn(row, "representation") &&
    Object.hasOwn(row, "locator") &&
    Object.hasOwn(row, "sha256")
  ) {
    const { locator: _locator, ...rest } = row;
    return Object.fromEntries(
      Object.entries(rest).map(([key, item]) => [
        key,
        normalizeLocatedValues(item),
      ]),
    );
  }
  return Object.fromEntries(
    Object.entries(row).map(([key, item]) => [
      key,
      normalizeLocatedValues(item),
    ]),
  );
}

export interface SemanticFactRevisionInput {
  key: string;
  kind: string;
  source_ref: string;
  sha256: string;
}

export function indexSemanticFactRevisionInputs(
  inputs: readonly Record<string, unknown>[],
): Map<string, SemanticFactRevisionInput[]> {
  const result = new Map<string, SemanticFactRevisionInput[]>();
  for (const input of inputs) {
    const revision = {
      key: String(input.key),
      kind: String(input.kind),
      source_ref: String(input.source_ref),
      sha256: String(input.sha256),
    };
    const factRefs = Array.isArray(input.fact_refs) ? input.fact_refs : [];
    for (const factRef of factRefs) {
      const key = String(factRef);
      const rows = result.get(key) ?? [];
      rows.push(revision);
      result.set(key, rows);
    }
  }
  for (const rows of result.values())
    rows.sort((left, right) => left.key.localeCompare(right.key));
  return result;
}

export function semanticFactRevisionDigest(
  fact: Record<string, unknown>,
  inputRevisionsByFact: ReadonlyMap<
    string,
    readonly SemanticFactRevisionInput[]
  >,
): string {
  const { key: _key, ...meaning } = fact;
  return sha256Hex(
    canonicalValueJson({
      meaning: normalizeLocatedValues(meaning),
      input_revisions: inputRevisionsByFact.get(String(fact.key)) ?? [],
    }),
  );
}

export function semanticObligationRevisionDigest(
  obligation: Record<string, unknown>,
  factRevisionDigest: string,
): string {
  const { key: _key, ...meaning } = obligation;
  return sha256Hex(
    canonicalValueJson({
      meaning: normalizeLocatedValues(meaning),
      fact_revision_digest: factRevisionDigest,
    }),
  );
}

export function legacySemanticFactRevisionDigest(
  fact: Record<string, unknown>,
): string {
  const { key: _key, ...meaning } = fact;
  return sha256Hex(canonicalValueJson(normalizeLocatedValues(meaning)));
}

export function legacySemanticObligationRevisionDigest(
  obligation: Record<string, unknown>,
): string {
  const { key: _key, ...meaning } = obligation;
  return sha256Hex(canonicalValueJson(normalizeLocatedValues(meaning)));
}
