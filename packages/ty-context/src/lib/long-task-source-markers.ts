import type {
  CompiledSourceItemV2,
  SourceItemKind,
} from "./long-task-delivery-types.js";
import { RISK_FACT_NAMES, type RiskFactName } from "./long-task-risk-types.js";

const KINDS = new Set<SourceItemKind>([
  "outcome_result",
  "requirement",
  "control",
  "acceptance",
  "technical_obligation",
  "non_completing",
  "non_goal",
  "forbidden_shortcut",
  "risk_fact",
  "external_confirmation",
  "decision",
]);
const RISK_FACTS = new Set<RiskFactName>(RISK_FACT_NAMES);
const BACKGROUND_REASONS = new Set(["markdown-structure", "provenance"]);

export const SOURCE_ITEM_START =
  /^\s*<!--\s*ty-source-item:start\s+(.+?)\s*-->\s*$/u;
export const SOURCE_ITEM_END = /^\s*<!--\s*ty-source-item:end\s*-->\s*$/u;
export const SOURCE_BACKGROUND_START =
  /^\s*<!--\s*ty-source-background:start\s+(.+?)\s*-->\s*$/u;
export const SOURCE_BACKGROUND_END =
  /^\s*<!--\s*ty-source-background:end\s*-->\s*$/u;

export function parseSourceBackgroundMarker(
  sourcePath: string,
  line: number,
  declaration: string,
): { key: string; reason: string } {
  const attributes = markerAttributes(
    sourcePath,
    line,
    declaration,
    "background",
  );
  for (const name of attributes.keys())
    if (!["key", "reason"].includes(name))
      throw new Error(
        `source_background_marker_attribute_unknown:${sourcePath}:${line}:${name}`,
      );
  const key = attributes.get("key") ?? "";
  const reason = attributes.get("reason") ?? "";
  if (
    !/^[a-z0-9][a-z0-9-]*$/u.test(key) ||
    !/^[a-z0-9][a-z0-9-]*$/u.test(reason)
  )
    throw new Error(`source_background_marker_invalid:${sourcePath}:${line}`);
  if (!BACKGROUND_REASONS.has(reason))
    throw new Error(
      `source_background_reason_unknown:${sourcePath}:${line}:${reason}`,
    );
  return { key, reason };
}

export function parseSourceItemStartMarker(
  sourcePath: string,
  line: number,
  declaration: string,
): Pick<CompiledSourceItemV2, "key" | "kind" | "aspect" | "risk_semantics"> {
  const attributes = markerAttributes(sourcePath, line, declaration, "item");
  for (const name of attributes.keys())
    if (!["key", "kind", "aspect", "fact", "outcome"].includes(name))
      throw new Error(
        `source_item_marker_attribute_unknown:${sourcePath}:${line}:${name}`,
      );
  const key = attributes.get("key") ?? "";
  const kind = (attributes.get("kind") ?? "") as SourceItemKind;
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(key) || !KINDS.has(kind))
    throw new Error(`source_item_marker_invalid:${sourcePath}:${line}`);
  return sourceItemMarkerWithRiskSemantics(sourcePath, key, kind, attributes);
}

function markerAttributes(
  sourcePath: string,
  line: number,
  declaration: string,
  marker: "item" | "background",
): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const token of declaration.trim().split(/\s+/u)) {
    const match = /^([a-z_]+)=([^\s=]+)$/u.exec(token);
    if (!match)
      throw new Error(`source_${marker}_marker_invalid:${sourcePath}:${line}`);
    if (attributes.has(match[1]))
      throw new Error(
        `source_${marker}_marker_attribute_duplicate:${sourcePath}:${line}:${match[1]}`,
      );
    attributes.set(match[1], match[2]);
  }
  return attributes;
}

function sourceItemMarkerWithRiskSemantics(
  sourcePath: string,
  key: string,
  kind: SourceItemKind,
  attributes: Map<string, string>,
): Pick<CompiledSourceItemV2, "key" | "kind" | "aspect" | "risk_semantics"> {
  const fact = attributes.get("fact");
  const outcome = attributes.get("outcome");
  const aspect = attributes.get("aspect");
  if (aspect !== undefined) {
    if (kind !== "technical_obligation" || aspect !== "architecture")
      throw new Error(
        `source_item_aspect_invalid:${sourcePath}:${key}:${kind}:${aspect}`,
      );
  }
  if (kind !== "risk_fact") {
    if (fact !== undefined || outcome !== undefined)
      throw new Error(
        `source_item_marker_attributes_forbidden:${sourcePath}:${key}:${kind}`,
      );
    return {
      key,
      kind,
      ...(aspect === "architecture" ? { aspect } : {}),
    };
  }
  if (aspect !== undefined)
    throw new Error(
      `source_item_marker_attributes_forbidden:${sourcePath}:${key}:${kind}`,
    );
  if (!fact || !outcome)
    throw new Error(`source_item_risk_semantics_required:${sourcePath}:${key}`);
  if (!RISK_FACTS.has(fact as RiskFactName))
    throw new Error(
      `source_item_risk_fact_invalid:${sourcePath}:${key}:${fact}`,
    );
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(outcome))
    throw new Error(
      `source_item_risk_outcome_invalid:${sourcePath}:${key}:${outcome}`,
    );
  return {
    key,
    kind,
    risk_semantics: {
      fact: fact as RiskFactName,
      affected_outcome: outcome,
    },
  };
}

export function validateSourceBackgroundLine(
  sourcePath: string,
  blockKey: string,
  reason: string,
  lineNumber: number,
  value: string,
): void {
  if (!value.trim()) return;
  const valid =
    reason === "markdown-structure"
      ? isMarkdownStructure(value)
      : reason === "provenance"
        ? isStructuredProvenance(value)
        : false;
  if (!valid)
    throw new Error(
      `source_background_content_invalid:${sourcePath}:${blockKey}:${reason}:${lineNumber}`,
    );
}

function isMarkdownStructure(value: string): boolean {
  return (
    /^\s*<a\s+(?:id|name)="[A-Za-z0-9_.:-]+"\s*><\/a>\s*$/u.test(value) ||
    /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/u.test(value)
  );
}

function isStructuredProvenance(value: string): boolean {
  const declaration = /^\s*<!--\s*ty-source-provenance\s+(.+?)\s*-->\s*$/u.exec(
    value,
  )?.[1];
  if (!declaration) return false;
  const attributes = new Map<string, string>();
  for (const token of declaration.split(/\s+/u)) {
    const match = /^([a-z][a-z0-9_-]*)=([^\s=>]+)$/u.exec(token);
    if (!match || attributes.has(match[1])) return false;
    attributes.set(match[1], match[2]);
  }
  if (
    [...attributes.keys()].some(
      (name) => !["input", "mode", "source", "sha256"].includes(name),
    )
  )
    return false;
  const input = attributes.get("input") ?? "";
  const mode = attributes.get("mode") ?? "";
  const source = attributes.get("source");
  const digest = attributes.get("sha256");
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(input)) return false;
  if (!["direct", "derived", "delegated", "evidence-backed"].includes(mode))
    return false;
  if (mode !== "direct" && !source) return false;
  if (source && !/^[a-z0-9][a-z0-9-]*$/u.test(source)) return false;
  if (digest && !/^[a-f0-9]{64}$/u.test(digest)) return false;
  return true;
}

export function normalizeSourceItemText(value: string): string {
  const lines = value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/gu, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines.at(-1)!.trim()) lines.pop();
  return lines.join("\n");
}
