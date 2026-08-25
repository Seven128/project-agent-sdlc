import type {
  MaterialSourceFragmentV2,
  SemanticAnchorKind,
  SemanticSourceAnchorV2,
} from "./long-task-source-authority-types.js";
import { sha256Hex } from "./strict-codec.js";

const POSITIVE_MODAL_TERMS = [
  "must",
  "shall",
  "required",
  "必须",
  "应当",
] as const;

const NEGATIVE_MODAL_TERMS = [
  "must not",
  "shall not",
  "forbidden",
  "never",
  "不得",
  "禁止",
  "不可",
  "只能",
  "仅可",
] as const;

export type SemanticModalPolarity = "positive" | "negative";

export interface SemanticModalOccurrenceV2 {
  value: string;
  polarity: SemanticModalPolarity;
}

export function semanticSourceAnchorRef(
  anchor: Pick<
    SemanticSourceAnchorV2,
    "fragment_ref" | "kind" | "value_sha256"
  >,
): string {
  return `${anchor.fragment_ref}#anchor:${anchor.kind}:${anchor.value_sha256.slice(0, 16)}`;
}

export function deriveSemanticSourceAnchors(
  fragment: MaterialSourceFragmentV2,
): SemanticSourceAnchorV2[] {
  const found: Array<{ kind: SemanticAnchorKind; value: string }> = [];
  collectMatches(
    found,
    fragment.normalized_text,
    "code_mark",
    /`([^`\n]+)`/gu,
    1,
  );
  collectMatches(
    found,
    fragment.normalized_text,
    "exact_quote",
    /["“”'‘’]([^"“”'‘’\n]{2,})["“”'‘’]/gu,
    1,
  );
  collectMatches(
    found,
    fragment.normalized_text,
    "api_path",
    /(?:^|[\s`"'(])((?:\/[A-Za-z0-9._~!$&*+,;=:@%{}-]*[A-Za-z0-9_~!$&*+=@%{}-])+)(?=$|[\s`"'),.;:])/gu,
    1,
  );
  collectMatches(
    found,
    fragment.normalized_text,
    "version",
    /\bv?\d+\.\d+(?:\.\d+)?(?:[-+][A-Za-z0-9.-]+)?\b/gu,
  );
  collectMatches(
    found,
    fragment.normalized_text,
    "symbol",
    /\b[A-Z][A-Z0-9_]{2,}\b/gu,
  );
  collectMatches(
    found,
    fragment.normalized_text,
    "frozen_identifier",
    /(?:\b(?:[Pp]rovider|[Pp]rotocol)\b|(?:提供商|供应商|协议))\s*(?:(?:[:：=]|is\b|named\b|called\b|为|是|采用|使用)\s*)?([A-Z][A-Za-z0-9]*(?:[-._][A-Za-z0-9]+)*)/gu,
    1,
  );
  collectMatches(
    found,
    fragment.normalized_text,
    "file_or_schema_key",
    /\b[A-Za-z_][\w-]*(?:\.[A-Za-z_][\w-]*)+\b/gu,
  );
  collectMatches(
    found,
    fragment.normalized_text,
    "file_or_schema_key",
    /\b([A-Za-z_][\w.-]*)\s*(?=[:=])/gu,
    1,
  );
  collectMatches(
    found,
    fragment.normalized_text,
    "number_or_unit",
    /\b\d+(?:\.\d+)?(?:\s*(?:-|–|—|\.\.)\s*\d+(?:\.\d+)?)?(?:\s*(?:ms|s|sec|seconds?|min|minutes?|h|hours?|bytes?|KB|MB|GB|%|px|rem|em|rps|qps))?\b/giu,
  );
  addModalAnchors(found, fragment.normalized_text);
  return materializeAnchors(fragment, found);
}

function addModalAnchors(
  found: Array<{ kind: SemanticAnchorKind; value: string }>,
  text: string,
): void {
  for (const occurrence of semanticModalOccurrences(text))
    found.push({ kind: "modal_term", value: occurrence.value });
}

export function semanticModalOccurrences(
  text: string,
): SemanticModalOccurrenceV2[] {
  const alternatives = [...NEGATIVE_MODAL_TERMS, ...POSITIVE_MODAL_TERMS].sort(
    (left, right) => right.length - left.length,
  );
  const pattern = new RegExp(
    `(?:^|[^a-z])(${alternatives
      .filter((term) => !/[\u3400-\u9fff]/u.test(term))
      .map(escapeRegex)
      .join("|")})(?=$|[^a-z])|(${alternatives
      .filter((term) => /[\u3400-\u9fff]/u.test(term))
      .map(escapeRegex)
      .join("|")})`,
    "giu",
  );
  const negative = new Set<string>(NEGATIVE_MODAL_TERMS);
  return [...text.matchAll(pattern)].map((match) => {
    const value = (match[1] ?? match[2]).toLocaleLowerCase("en-US");
    return {
      value,
      polarity: negative.has(value) ? "negative" : "positive",
    };
  });
}

export function semanticModalPolarity(
  value: string,
): SemanticModalPolarity | null {
  const normalized = value.toLocaleLowerCase("en-US");
  if ((NEGATIVE_MODAL_TERMS as readonly string[]).includes(normalized))
    return "negative";
  if ((POSITIVE_MODAL_TERMS as readonly string[]).includes(normalized))
    return "positive";
  return null;
}

function materializeAnchors(
  fragment: MaterialSourceFragmentV2,
  found: Array<{ kind: SemanticAnchorKind; value: string }>,
): SemanticSourceAnchorV2[] {
  const seen = new Set<string>();
  return found
    .map(({ kind, value }) => ({ kind, value: value.trim() }))
    .filter(({ kind, value }) => {
      if (!value) return false;
      const identity = `${kind}\0${value}`;
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    })
    .map(({ kind, value }) => {
      const valueSha256 = sha256Hex(value);
      const base = {
        fragment_ref: fragment.key,
        source_item_ref: fragment.source_item_ref,
        authority_source_item_refs: [...fragment.authority_source_item_refs],
        authority_domain: fragment.authority_domain,
        kind,
        value,
        value_sha256: valueSha256,
      };
      return { ...base, key: semanticSourceAnchorRef(base) };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

function collectMatches(
  result: Array<{ kind: SemanticAnchorKind; value: string }>,
  value: string,
  kind: SemanticAnchorKind,
  pattern: RegExp,
  group = 0,
): void {
  for (const match of value.matchAll(pattern))
    if (match[group]) result.push({ kind, value: match[group] });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
