import type { DesignResourceValueKind } from "./design-resource-fact-manifest-types.js";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";

type ValueValidator = (text: string, structured: unknown | null) => boolean;

const VALUE_VALIDATORS: Record<DesignResourceValueKind, ValueValidator> = {
  boolean: (text) => /^(?:true|false)$/u.test(text),
  color: (text) =>
    !text.includes("|") &&
    (/^#[a-f0-9]{3,8}$/iu.test(text) ||
      /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|var)\(.+\)$/iu.test(
        text,
      ) ||
      /^(?:transparent|currentcolor|[a-z]+)$/iu.test(text)),
  digest: (text) => /^[a-f0-9]{64}$/u.test(text),
  enum: (text) => /^[a-z0-9][a-z0-9._:-]*$/iu.test(text),
  length: (text, structured) => isLength(text, structured),
  list: (text, structured) =>
    structured === null
      ? !text.includes("|")
      : Array.isArray(structured) || typeof structured === "object",
  locator: () => true,
  number: (text) => isFiniteNumber(text),
  ratio: (text, structured) => isRatio(text, structured),
  relation: (_text, structured) => isStructuredCollection(structured),
  semantic: (text, structured) =>
    structured !== null || /^[a-z0-9][a-z0-9._:-]*$/iu.test(text),
  string: () => true,
  timeline: (_text, structured) => isStructuredCollection(structured),
  token_ref: (text, structured) =>
    structured !== null ||
    /^(?:--[a-z0-9_-]+|[a-z0-9][a-z0-9._/-]*)$/iu.test(text),
  trace: (_text, structured) => isStructuredCollection(structured),
};

export function validateDesignResourceValueKind(
  kind: DesignResourceValueKind,
  value: Buffer,
  label: string,
): void {
  const text = value.toString("utf8").trim();
  const structured = text ? parseStructuredValue(text) : null;
  if (!text || !VALUE_VALIDATORS[kind](text, structured)) {
    invalidDesignResourceHandoff(
      "located_value_kind_mismatch",
      `${label}:${kind}`,
    );
  }
}

function parseStructuredValue(value: string): unknown | null {
  if (!value.startsWith("{") && !value.startsWith("[")) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isStructuredCollection(value: unknown | null): boolean {
  return value !== null && typeof value === "object";
}

function isFiniteNumber(value: string): boolean {
  if (!/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/iu.test(value)) return false;
  return Number.isFinite(Number(value));
}

function isLength(value: string, structured: unknown | null): boolean {
  if (
    structured &&
    typeof structured === "object" &&
    !Array.isArray(structured)
  ) {
    const row = structured as Record<string, unknown>;
    return (
      typeof row.value === "number" &&
      Number.isFinite(row.value) &&
      typeof row.unit === "string" &&
      /^[a-z%][a-z0-9%_-]*$/iu.test(row.unit)
    );
  }
  return (
    /^(?:0|-?(?:\d+\.?\d*|\.\d+)(?:px|dp|sp|pt|pc|in|cm|mm|q|em|rem|ex|ch|cap|ic|lh|rlh|vw|vh|vi|vb|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|cqw|cqh|cqi|cqb|cqmin|cqmax|%))$/iu.test(
      value,
    ) ||
    /^(?:calc|min|max|clamp|fit-content|var|env)\(.+\)$/iu.test(value) ||
    /^(?:auto|min-content|max-content|stretch|normal|hairline)$/iu.test(value)
  );
}

function isRatio(value: string, structured: unknown | null): boolean {
  if (isFiniteNumber(value)) return true;
  if (/^-?(?:\d+\.?\d*|\.\d+)\s*\/\s*-?(?:\d+\.?\d*|\.\d+)$/u.test(value))
    return true;
  if (Array.isArray(structured)) {
    return (
      structured.length === 2 &&
      structured.every(
        (item) => typeof item === "number" && Number.isFinite(item),
      )
    );
  }
  if (!structured || typeof structured !== "object") return false;
  const row = structured as Record<string, unknown>;
  return (
    typeof row.width === "number" &&
    Number.isFinite(row.width) &&
    typeof row.height === "number" &&
    Number.isFinite(row.height)
  );
}
