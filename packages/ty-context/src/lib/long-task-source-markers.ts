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
  return { key, reason };
}

export function parseSourceItemStartMarker(
  sourcePath: string,
  line: number,
  declaration: string,
): Pick<CompiledSourceItemV2, "key" | "kind" | "risk_semantics"> {
  const attributes = markerAttributes(sourcePath, line, declaration, "item");
  for (const name of attributes.keys())
    if (!["key", "kind", "fact", "outcome"].includes(name))
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
): Pick<CompiledSourceItemV2, "key" | "kind" | "risk_semantics"> {
  const fact = attributes.get("fact");
  const outcome = attributes.get("outcome");
  if (kind !== "risk_fact") {
    if (fact !== undefined || outcome !== undefined)
      throw new Error(
        `source_item_marker_attributes_forbidden:${sourcePath}:${key}:${kind}`,
      );
    return { key, kind };
  }
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

export function normalizeSourceItemText(value: string): string {
  const lines = value
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/gu, ""));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines.at(-1)!.trim()) lines.pop();
  return lines.join("\n");
}
