import type { DesignResourceTypedLocatorV1 } from "./design-resource-fact-manifest-types.js";
import {
  isTextResource,
  type DesignResource,
} from "./design-resource-handoff-file-primitives.js";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";
import {
  cssRuleBody,
  elementInnerContent,
  escapeRegExp,
  htmlAttribute,
  htmlOpeningTag,
  javascriptExport,
  markdownSection,
  uniqueCapture,
} from "./design-resource-fact-locator-extractors.js";

export function resolveDesignResourceLocatorValue(
  locator: DesignResourceTypedLocatorV1,
  resource: DesignResource,
  bytes: Buffer,
  label: string,
): Buffer {
  const detail = `${label}:${resource.key}:${locator.kind}:${locator.value}`;
  if (locator.kind === "whole_resource") {
    if (locator.value !== ".")
      invalidDesignResourceHandoff("locator_whole_resource_value", detail);
    return bytes;
  }
  if (!isTextResource(resource))
    invalidDesignResourceHandoff(
      "located_value_text_resource_required",
      `${detail}:${resource.media_type}`,
    );
  const content = bytes.toString("utf8");
  return resolveTextLocator(locator, resource, content, detail);
}

function resolveTextLocator(
  locator: DesignResourceTypedLocatorV1,
  resource: DesignResource,
  content: string,
  detail: string,
): Buffer {
  switch (locator.kind) {
    case "json_pointer":
      requireMediaType(resource, ["application/json"], detail);
      return Buffer.from(resolveJsonPointer(content, locator.value, detail));
    case "css_custom_property":
      requireMediaType(resource, ["text/css"], detail);
      return Buffer.from(
        uniqueCapture(
          content,
          new RegExp(`${escapeRegExp(locator.value)}\\s*:\\s*([^;{}]+)`, "gu"),
          detail,
        ).trim(),
      );
    case "css_declaration":
      return cssDeclaration(content, locator.value, resource, detail);
    case "css_selector":
      requireMediaType(resource, ["text/css"], detail);
      return Buffer.from(cssRuleBody(content, locator.value, detail).trim());
    case "html_attribute":
    case "svg_attribute":
      return markupAttribute(content, locator, resource, detail);
    case "html_selector":
    case "svg_selector":
      requireMarkupMediaType(locator.kind, resource, detail);
      return Buffer.from(htmlOpeningTag(content, locator.value, detail));
    case "html_inner_html":
    case "svg_inner_xml":
      requireMarkupMediaType(locator.kind, resource, detail);
      return Buffer.from(elementInnerContent(content, locator.value, detail));
    case "markdown_anchor":
      requireMediaType(resource, ["text/markdown"], detail);
      return Buffer.from(markdownSection(content, locator.value, detail));
    case "javascript_export":
      requireMediaType(
        resource,
        [
          "text/javascript",
          "application/javascript",
          "text/typescript",
          "application/typescript",
        ],
        detail,
      );
      return Buffer.from(javascriptExport(content, locator.value, detail));
    default:
      invalidDesignResourceHandoff("located_value_locator_unsupported", detail);
  }
}

function cssDeclaration(
  content: string,
  value: string,
  resource: DesignResource,
  detail: string,
): Buffer {
  requireMediaType(resource, ["text/css"], detail);
  const [selector, property] = splitCompoundLocator(value, detail);
  const body = cssRuleBody(content, selector, detail);
  return Buffer.from(
    uniqueCapture(
      body,
      new RegExp(`(?:^|;)\\s*${escapeRegExp(property)}\\s*:\\s*([^;]+)`, "gu"),
      detail,
    ).trim(),
  );
}

function markupAttribute(
  content: string,
  locator: DesignResourceTypedLocatorV1,
  resource: DesignResource,
  detail: string,
): Buffer {
  requireMarkupMediaType(locator.kind, resource, detail);
  const [selector, attribute] = splitCompoundLocator(locator.value, detail);
  return Buffer.from(htmlAttribute(content, selector, attribute, detail));
}

function requireMarkupMediaType(
  kind: DesignResourceTypedLocatorV1["kind"],
  resource: DesignResource,
  detail: string,
): void {
  requireMediaType(
    resource,
    kind.startsWith("svg_")
      ? ["image/svg+xml"]
      : ["text/html", "application/xhtml+xml"],
    detail,
  );
}

function resolveJsonPointer(
  content: string,
  pointer: string,
  detail: string,
): string {
  if (!pointer.startsWith("/"))
    invalidDesignResourceHandoff("locator_json_pointer_invalid", detail);
  let current: unknown;
  try {
    current = JSON.parse(content);
  } catch {
    invalidDesignResourceHandoff("locator_json_resource_invalid", detail);
  }
  for (const token of pointer
    .slice(1)
    .split("/")
    .map((part) => part.replace(/~1/gu, "/").replace(/~0/gu, "~"))) {
    if (
      current === null ||
      typeof current !== "object" ||
      !Object.hasOwn(current, token)
    )
      invalidDesignResourceHandoff("locator_not_found", detail);
    current = (current as Record<string, unknown>)[token];
  }
  return typeof current === "string" ? current : stableJson(current);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function splitCompoundLocator(value: string, detail: string): [string, string] {
  const parts = value.split("@@");
  if (parts.length !== 2 || parts.some((part) => !part.trim()))
    invalidDesignResourceHandoff("locator_compound_value_invalid", detail);
  return [parts[0].trim(), parts[1].trim()];
}

function requireMediaType(
  resource: DesignResource,
  expected: string[],
  detail: string,
): void {
  if (!expected.includes(resource.media_type))
    invalidDesignResourceHandoff(
      "locator_media_type_incompatible",
      `${detail}:${resource.media_type}`,
    );
}
