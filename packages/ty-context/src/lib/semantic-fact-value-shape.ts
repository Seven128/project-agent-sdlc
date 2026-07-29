import type { SemanticFactLocatedValueV1 } from "./semantic-fact-types.js";
import { SEMANTIC_FACT_LOCATOR_KINDS } from "./semantic-fact-shape-constants.js";
import {
  semanticArray,
  semanticLiteral,
  semanticObject,
  semanticSha256,
  semanticStableRef,
  semanticString,
} from "./semantic-fact-shape-primitives.js";

export function parseSemanticFactAxisValues(value: unknown, label: string) {
  return semanticArray(value, label).map((item, index) => {
    const itemLabel = `${label}[${index}]`;
    const row = semanticObject(item, itemLabel, ["axis_ref", "value_ref"]);
    return {
      axis_ref: semanticStableRef(row.axis_ref, `${itemLabel}.axis_ref`),
      value_ref: semanticStableRef(row.value_ref, `${itemLabel}.value_ref`),
    };
  });
}

export function parseSemanticFactLocatedValue(
  value: unknown,
  label: string,
): SemanticFactLocatedValueV1 {
  const preliminary = semanticObject(
    value,
    label,
    ["representation", "locator", "sha256"],
    ["value"],
  );
  const representation = semanticLiteral(
    preliminary.representation,
    ["inline", "located", "digest_only"] as const,
    `${label}.representation`,
  );
  if (representation === "inline" && !Object.hasOwn(preliminary, "value"))
    throw new Error(
      `semantic_fact_manifest_invalid:${label}.value:required for inline representation`,
    );
  if (representation !== "inline" && Object.hasOwn(preliminary, "value"))
    throw new Error(
      `semantic_fact_manifest_invalid:${label}.value:forbidden for ${representation} representation`,
    );
  return {
    representation,
    locator: parseSemanticFactLocator(preliminary.locator, `${label}.locator`),
    sha256: semanticSha256(preliminary.sha256, `${label}.sha256`),
    ...(representation === "inline" ? { value: preliminary.value } : {}),
  };
}

export function parseSemanticFactLocator(value: unknown, label: string) {
  const row = semanticObject(value, label, ["material_ref", "kind", "value"]);
  return {
    material_ref: semanticStableRef(row.material_ref, `${label}.material_ref`),
    kind: semanticLiteral(
      row.kind,
      SEMANTIC_FACT_LOCATOR_KINDS,
      `${label}.kind`,
    ),
    value: semanticString(row.value, `${label}.value`),
  };
}

export function parseSemanticFactBoolean(
  value: unknown,
  label: string,
): boolean {
  if (typeof value !== "boolean")
    throw new Error(`semantic_fact_manifest_invalid:${label}:must be boolean`);
  return value;
}
