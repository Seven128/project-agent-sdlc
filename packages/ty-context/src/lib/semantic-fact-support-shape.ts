import {
  semanticArray,
  semanticLiteral,
  semanticNullableSha256,
  semanticObject,
  semanticStableRef,
  semanticStableRefs,
  semanticString,
} from "./semantic-fact-shape-primitives.js";
import { parseSemanticFactLocatedValue } from "./semantic-fact-value-shape.js";

export function parseSemanticFactOracles(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "trust",
      "identity",
      "version",
      "sha256",
      "capabilities",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      trust: semanticLiteral(
        row.trust,
        ["frozen_executable", "named_external_tcb"] as const,
        `${itemLabel}.trust`,
      ),
      identity: semanticString(row.identity, `${itemLabel}.identity`),
      version: semanticString(row.version, `${itemLabel}.version`),
      sha256: semanticNullableSha256(row.sha256, `${itemLabel}.sha256`),
      capabilities: semanticStableRefs(
        row.capabilities,
        `${itemLabel}.capabilities`,
      ),
    };
  });
}

export function parseSemanticFactEnvironments(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "identity",
      "definition",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      identity: semanticString(row.identity, `${itemLabel}.identity`),
      definition: parseSemanticFactLocatedValue(
        row.definition,
        `${itemLabel}.definition`,
      ),
    };
  });
}

export function parseSemanticFactBlockers(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, [
      "key",
      "kind",
      "affected_refs",
      "source_item_refs",
      "owner",
      "resolution",
    ]);
    return {
      key: semanticStableRef(row.key, `${itemLabel}.key`),
      kind: semanticLiteral(
        row.kind,
        ["decision_required", "unavailable", "conflict", "unreadable"] as const,
        `${itemLabel}.kind`,
      ),
      affected_refs: semanticStableRefs(
        row.affected_refs,
        `${itemLabel}.affected_refs`,
      ),
      source_item_refs: semanticStableRefs(
        row.source_item_refs,
        `${itemLabel}.source_item_refs`,
      ),
      owner: semanticString(row.owner, `${itemLabel}.owner`),
      resolution: semanticString(row.resolution, `${itemLabel}.resolution`),
    };
  });
}
