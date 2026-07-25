import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  DesignResourceHandoffEvidenceV1,
  ParsedDesignResourceHandoffV1,
} from "./design-resource-handoff-types.js";
import {
  htmlAttributes,
  isTextResource,
  type DesignResource,
} from "./design-resource-handoff-file-primitives.js";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";
import { validateDesignResourceWebDependencyClosure } from "./design-resource-handoff-web-dependency-validation.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { markdownAnchors } from "./long-task-source-validation.js";

export async function validateDesignResourceFiles(
  repository: string,
  parsed: ParsedDesignResourceHandoffV1,
): Promise<void> {
  const resources = new Map(
    parsed.handoff.resources.map((resource) => [resource.key, resource]),
  );
  const contents = new Map<string, Buffer>();
  for (const resource of parsed.handoff.resources) {
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...resource.path.split("/")),
      `design_resource:${resource.key}`,
    );
    contents.set(resource.key, await readFile(file));
  }
  for (const evidence of parsed.handoff.evidence)
    validateLocator(
      evidence,
      resources.get(evidence.resource_ref)!,
      contents.get(evidence.resource_ref)!,
    );
  for (const target of parsed.handoff.targets)
    if (target.source_profile.kind === "implementation_web")
      validateDesignResourceWebDependencyClosure(target, resources, contents);
}

function validateLocator(
  evidence: DesignResourceHandoffEvidenceV1,
  resource: DesignResource,
  bytes: Buffer,
): void {
  const { kind, value } = evidence.locator;
  const label = `${evidence.key}:${resource.key}:${kind}:${value}`;
  validateEvidenceResourceCompatibility(evidence, resource);
  if (kind === "whole_resource") {
    if (value !== ".")
      invalidDesignResourceHandoff("locator_whole_resource_value", label);
    if (
      resource.media_type.startsWith("text/") &&
      !["asset", "motion_capture", "frame"].includes(evidence.kind)
    )
      invalidDesignResourceHandoff("locator_whole_resource_too_broad", label);
    return;
  }
  const content = bytes.toString("utf8");
  if (kind === "html_selector") {
    requireMediaType(resource, ["text/html", "application/xhtml+xml"], label);
    if (!htmlSelectorExists(content, value))
      invalidDesignResourceHandoff("locator_not_found", label);
    return;
  }
  if (kind === "markdown_anchor") {
    requireMediaType(resource, ["text/markdown"], label);
    if (value.startsWith("#") || !markdownAnchors(content).has(value))
      invalidDesignResourceHandoff("locator_not_found", label);
    return;
  }
  if (kind === "json_pointer") {
    requireMediaType(resource, ["application/json"], label);
    if (!jsonPointerExists(content, value))
      invalidDesignResourceHandoff("locator_not_found", label);
    return;
  }
  if (kind === "css_selector") {
    requireMediaType(resource, ["text/css"], label);
    if (!cssSelectorExists(content, value))
      invalidDesignResourceHandoff("locator_not_found", label);
    return;
  }
  requireMediaType(resource, ["text/css"], label);
  if (!/^--[A-Za-z0-9_-]+$/u.test(value))
    invalidDesignResourceHandoff("locator_css_custom_property_invalid", label);
  const customProperty = new RegExp(`${escapeRegExp(value)}\\s*:`, "u");
  if (!customProperty.test(content))
    invalidDesignResourceHandoff("locator_not_found", label);
}

function validateEvidenceResourceCompatibility(
  evidence: DesignResourceHandoffEvidenceV1,
  resource: DesignResource,
): void {
  const machineReadableKinds = new Set([
    "prototype_transition",
    "motion_spec",
    "responsive_spec",
    "input_spec",
    "accessibility_spec",
    "semantic_tree",
    "token_spec",
    "annotation",
  ]);
  if (machineReadableKinds.has(evidence.kind) && !isTextResource(resource))
    invalidDesignResourceHandoff(
      "evidence_resource_media_type_incompatible",
      `${evidence.key}:${evidence.kind}:${resource.media_type}`,
    );
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

function htmlSelectorExists(content: string, selector: string): boolean {
  const parsed =
    /^(?:([A-Za-z][A-Za-z0-9:-]*))?(?:#([A-Za-z][A-Za-z0-9_.:-]*))?(?:\[([A-Za-z_:][A-Za-z0-9_.:-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\])?$/u.exec(
      selector,
    );
  if (!parsed || (!parsed[1] && !parsed[2] && !parsed[3]))
    invalidDesignResourceHandoff("locator_html_selector_unsupported", selector);
  const [, expectedTag, expectedId, expectedAttribute] = parsed;
  const expectedValue = parsed[4] ?? parsed[5] ?? parsed[6];
  for (const match of content.matchAll(
    /<([A-Za-z][A-Za-z0-9:-]*)\b([^<>]*)>/gu,
  )) {
    if (expectedTag && match[1].toLowerCase() !== expectedTag.toLowerCase())
      continue;
    const attributes = htmlAttributes(match[2]);
    if (expectedId && attributes.get("id") !== expectedId) continue;
    if (expectedAttribute) {
      const attributeName = expectedAttribute.toLowerCase();
      if (!attributes.has(attributeName)) continue;
      if (
        expectedValue !== undefined &&
        attributes.get(attributeName) !== expectedValue
      )
        continue;
    }
    return true;
  }
  return false;
}

function jsonPointerExists(content: string, pointer: string): boolean {
  if (!pointer.startsWith("/")) return false;
  let current: unknown;
  try {
    current = JSON.parse(content);
  } catch {
    return false;
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
      return false;
    current = (current as Record<string, unknown>)[token];
  }
  return true;
}

function cssSelectorExists(content: string, selector: string): boolean {
  if (!selector.trim() || selector.includes("{") || selector.includes("}"))
    invalidDesignResourceHandoff("locator_css_selector_unsupported", selector);
  for (const match of content.matchAll(/(?:^|\})\s*([^@{}][^{}]*)\{/gmu))
    if (
      match[1]
        .split(",")
        .map((item) => item.trim())
        .includes(selector)
    )
      return true;
  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
