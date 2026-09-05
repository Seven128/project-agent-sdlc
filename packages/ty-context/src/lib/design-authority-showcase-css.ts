import path from "node:path";
import { DESIGN_AUTHORITY_SHOWCASE_ASSET_ROOT } from "./design-authority-showcase-types.js";

const ACTIVE_CSS = /@import|expression\s*\(|behavior\s*:|-moz-binding\s*:/iu;
const URL_START = /url\s*\(/giu;
const EXTERNAL_CSS_URL =
  /(?:^|[^a-z0-9_-])(?:blob|data|file|ftp|https?|javascript|wss?)\s*:|\/\//iu;

export function inspectDesignAuthorityShowcaseCss(input: {
  source_path: string;
  content: string;
  declared_assets: ReadonlySet<string>;
}): string[] {
  if (input.content.includes("\\"))
    invalid(`css_escape_unsupported:${input.source_path}`);
  if (input.content.includes("/*") || input.content.includes("*/"))
    invalid(`css_comment_unsupported:${input.source_path}`);
  if (ACTIVE_CSS.test(input.content))
    invalid(`active_css:${input.source_path}`);
  const references = new Set<string>();
  let expectedUrls = 0;
  for (const _match of input.content.matchAll(URL_START)) expectedUrls += 1;
  let parsedUrls = 0;
  for (const match of input.content.matchAll(/url\s*\(([^)]*)\)/giu)) {
    parsedUrls += 1;
    let value = match[1].trim();
    if (value.startsWith('"') && value.endsWith('"'))
      value = value.slice(1, -1);
    else if (value.startsWith("'") || value.endsWith("'"))
      invalid(`css_url_requires_double_quotes:${input.source_path}`);
    if (!value) invalid(`css_url_empty:${input.source_path}`);
    if (value.startsWith("#")) continue;
    references.add(
      resolveDesignAuthorityShowcaseAsset(
        input.source_path,
        value,
        input.declared_assets,
      ),
    );
  }
  if (parsedUrls !== expectedUrls)
    invalid(`css_url_malformed:${input.source_path}`);
  const cssWithoutUrls = input.content.replace(
    /url\s*\(([^)]*)\)/giu,
    "@local-url",
  );
  if (EXTERNAL_CSS_URL.test(cssWithoutUrls))
    invalid(`external_css_url:${input.source_path}`);
  return [...references].sort(compare);
}

export function resolveDesignAuthorityShowcaseAsset(
  sourcePath: string,
  value: string,
  declaredAssets: ReadonlySet<string>,
): string {
  if (
    !value ||
    value !== value.trim() ||
    value.includes("\\") ||
    value.includes("%") ||
    value.includes("?") ||
    value.includes("#") ||
    value.startsWith("/") ||
    value.startsWith("//") ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value)
  )
    invalid(`asset_reference_not_local:${sourcePath}:${diagnostic(value)}`);
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(sourcePath), value),
  );
  if (
    !resolved.startsWith(DESIGN_AUTHORITY_SHOWCASE_ASSET_ROOT) ||
    !declaredAssets.has(resolved)
  )
    invalid(`asset_reference_not_declared:${sourcePath}:${resolved}`);
  return resolved;
}

function compare(left: string, right: string): number {
  return Buffer.from(left).compare(Buffer.from(right));
}

function diagnostic(value: string): string {
  return JSON.stringify(
    value.length <= 200 ? value : `${value.slice(0, 200)}…`,
  );
}

function invalid(reason: string): never {
  throw new Error(`design_authority_showcase_invalid:${reason}`);
}
