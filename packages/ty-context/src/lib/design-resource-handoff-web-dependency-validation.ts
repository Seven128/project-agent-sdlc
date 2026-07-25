import path from "node:path";
import type { ParsedDesignResourceHandoffV1 } from "./design-resource-handoff-types.js";
import {
  htmlAttributes,
  isTextResource,
  type DesignResource,
} from "./design-resource-handoff-file-primitives.js";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";

export function validateDesignResourceWebDependencyClosure(
  target: ParsedDesignResourceHandoffV1["handoff"]["targets"][number],
  resources: Map<string, DesignResource>,
  contents: Map<string, Buffer>,
): void {
  const declaredPaths = new Set(
    target.resource_refs.map((ref) => resources.get(ref)!.path),
  );
  for (const resourceRef of target.resource_refs) {
    const resource = resources.get(resourceRef)!;
    if (!isTextResource(resource)) continue;
    const content = contents.get(resourceRef)!.toString("utf8");
    for (const reference of localDependencyReferences(
      content,
      resource.media_type,
    )) {
      const resolved = resolveResourceReference(resource.path, reference);
      if (!declaredPaths.has(resolved))
        invalidDesignResourceHandoff(
          "implementation_dependency_undeclared",
          `${target.key}:${resource.path}:${reference}:${resolved}`,
        );
    }
  }
}

function localDependencyReferences(
  content: string,
  mediaType: string,
): Set<string> {
  const values = new Set<string>();
  if (["text/html", "application/xhtml+xml"].includes(mediaType)) {
    for (const tag of content.matchAll(
      /<(script|img|source|video|audio|track|iframe|embed|input|link|object|use|image)\b([^<>]*)>/giu,
    )) {
      const attributes = htmlAttributes(tag[2]);
      for (const name of ["src", "href", "poster"])
        addLocalReference(values, attributes.get(name));
      if (tag[1].toLowerCase() === "object")
        addLocalReference(values, attributes.get("data"));
      for (const candidate of (attributes.get("srcset") ?? "").split(","))
        addLocalReference(values, candidate.trim().split(/\s+/u)[0]);
    }
  }
  if (
    mediaType === "text/css" ||
    ["text/html", "application/xhtml+xml"].includes(mediaType)
  )
    for (const match of content.matchAll(
      /(?:url\(\s*["']?([^"')\s]+)|@import\s+(?:url\(\s*)?["']([^"']+))/giu,
    ))
      addLocalReference(values, match[1] ?? match[2]);
  if (
    [
      "text/javascript",
      "application/javascript",
      "text/typescript",
      "application/typescript",
      "text/ecmascript",
      "application/ecmascript",
      "text/html",
    ].includes(mediaType)
  ) {
    for (const match of content.matchAll(
      /(?:\b(?:from|import)\s*|\bimport\s*\(|\brequire\s*\()\s*["']([^"']+)["']/gu,
    ))
      addLocalReference(values, match[1]);
    for (const match of content.matchAll(
      /(?:\bfetch\s*\(|\bnew\s+(?:Shared)?Worker\s*\(|\bnew\s+URL\s*\()\s*["']([^"']+)["']/gu,
    ))
      addLocalReference(values, match[1]);
  }
  return values;
}

function addLocalReference(values: Set<string>, raw: string | undefined): void {
  if (!raw) return;
  const value = raw.trim();
  if (
    !value ||
    value.startsWith("#") ||
    /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(value)
  )
    return;
  values.add(value.replace(/[?#].*$/u, ""));
}

function resolveResourceReference(from: string, reference: string): string {
  if (reference.startsWith("/"))
    invalidDesignResourceHandoff(
      "implementation_dependency_path_unsafe",
      `${from}:${reference}`,
    );
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(from), reference),
  );
  if (
    resolved === ".." ||
    resolved.startsWith("../") ||
    path.posix.isAbsolute(resolved)
  )
    invalidDesignResourceHandoff(
      "implementation_dependency_path_unsafe",
      `${from}:${reference}`,
    );
  return resolved;
}
