import type { ParsedDesignResourceHandoffV1 } from "./design-resource-handoff-types.js";

export type DesignResource =
  ParsedDesignResourceHandoffV1["handoff"]["resources"][number];

export function htmlAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of source.matchAll(
    /([A-Za-z_:][A-Za-z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gu,
  ))
    attributes.set(
      match[1].toLowerCase(),
      match[2] ?? match[3] ?? match[4] ?? "",
    );
  return attributes;
}

export function isTextResource(resource: DesignResource): boolean {
  return (
    resource.media_type.startsWith("text/") ||
    [
      "application/javascript",
      "application/json",
      "application/xhtml+xml",
    ].includes(resource.media_type)
  );
}
