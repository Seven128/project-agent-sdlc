import {
  inspectDesignAuthorityShowcaseCss,
  resolveDesignAuthorityShowcaseAsset,
} from "./design-authority-showcase-css.js";
import {
  parseRestrictedShowcaseHtml,
  type ShowcaseHtmlTag,
} from "./design-authority-showcase-html-parser.js";
import {
  DESIGN_AUTHORITY_SHOWCASE_ARTIFACT_CATEGORY,
  DESIGN_AUTHORITY_SHOWCASE_HTML_PATH,
  type DesignAuthorityShowcaseManifestV1,
} from "./design-authority-showcase-types.js";

const FORBIDDEN_ELEMENTS = new Set([
  "animate",
  "animatemotion",
  "animatetransform",
  "base",
  "discard",
  "embed",
  "foreignobject",
  "form",
  "iframe",
  "object",
  "portal",
  "script",
  "set",
]);
const URL_ATTRIBUTES = new Set([
  "action",
  "background",
  "cite",
  "formaction",
  "href",
  "longdesc",
  "manifest",
  "ping",
  "poster",
  "profile",
  "src",
  "usemap",
  "xlink:href",
]);

export function inspectDesignAuthorityShowcaseHtml(input: {
  content: string;
  manifest: DesignAuthorityShowcaseManifestV1;
}): string[] {
  const parsed = parseRestrictedShowcaseHtml(input.content);
  const declaredAssets = new Set(
    input.manifest.assets.map((item) => item.path),
  );
  const referencedAssets = new Set<string>();
  const fragmentLinks: string[] = [];
  for (const tag of parsed.tags)
    inspectTag(tag, declaredAssets, referencedAssets, fragmentLinks);
  for (const css of parsed.inline_css)
    for (const asset of inspectDesignAuthorityShowcaseCss({
      source_path: DESIGN_AUTHORITY_SHOWCASE_HTML_PATH,
      content: css,
      declared_assets: declaredAssets,
    }))
      referencedAssets.add(asset);
  inspectStructure(parsed.tags, input.manifest, fragmentLinks);
  return [...referencedAssets].sort(compare);
}

function inspectTag(
  tag: ShowcaseHtmlTag,
  declaredAssets: ReadonlySet<string>,
  referencedAssets: Set<string>,
  fragmentLinks: string[],
): void {
  if (FORBIDDEN_ELEMENTS.has(tag.name)) invalid(`active_element:${tag.name}`);
  if (tag.name === "meta" && Object.hasOwn(tag.attributes, "http-equiv"))
    invalid("meta_http_equiv_forbidden");
  for (const [name, value] of Object.entries(tag.attributes)) {
    if (/^on/iu.test(name) || name === "srcdoc" || name === "style")
      invalid(`active_attribute:${tag.name}:${name}`);
    if (
      name !== "xmlns" &&
      /(?:javascript|data|https?|file|ftp)\s*:|^\/\//iu.test(value)
    )
      invalid(`external_or_active_url:${tag.name}:${name}`);
    if (name === "srcset") invalid(`unsupported_url_attribute:${name}`);
    if (!URL_ATTRIBUTES.has(name)) continue;
    if (value !== value.trim() || /[\u0000-\u0020\u007f&]/u.test(value))
      invalid(`url_attribute_not_literal:${tag.name}:${name}`);
    if (value.startsWith("#")) {
      if (value.length === 1) invalid(`empty_fragment:${tag.name}:${name}`);
      fragmentLinks.push(value.slice(1));
      continue;
    }
    referencedAssets.add(
      resolveDesignAuthorityShowcaseAsset(
        DESIGN_AUTHORITY_SHOWCASE_HTML_PATH,
        value,
        declaredAssets,
      ),
    );
  }
}

function inspectStructure(
  tags: ShowcaseHtmlTag[],
  manifest: DesignAuthorityShowcaseManifestV1,
  fragmentLinks: string[],
): void {
  const html = tags.filter((tag) => tag.name === "html");
  if (html.length !== 1) invalid(`html_root_count:${html.length}`);
  exactAttribute(
    html[0],
    "data-ty-showcase-artifact",
    DESIGN_AUTHORITY_SHOWCASE_ARTIFACT_CATEGORY,
  );
  exactAttribute(html[0], "data-ty-showcase-status", "adopted");
  exactAttribute(
    html[0],
    "data-ty-showcase-authority-digest",
    manifest.authority.closure_digest,
  );
  const byId = new Map<string, ShowcaseHtmlTag>();
  for (const tag of tags) {
    const id = tag.attributes.id;
    if (!id) continue;
    if (byId.has(id)) invalid(`html_id_duplicate:${id}`);
    byId.set(id, tag);
  }
  for (const fragment of fragmentLinks)
    if (!byId.has(fragment)) invalid(`fragment_target_missing:${fragment}`);
  inspectCoverage(tags, byId, manifest);
  inspectIndex(
    tags,
    byId,
    manifest.token_families,
    "data-ty-showcase-token-family",
    "token_family",
  );
  inspectIndex(
    tags,
    byId,
    manifest.components,
    "data-ty-showcase-component",
    "component",
  );
  inspectTargetConditions(tags, byId, manifest);
}

function inspectCoverage(
  tags: ShowcaseHtmlTag[],
  byId: ReadonlyMap<string, ShowcaseHtmlTag>,
  manifest: DesignAuthorityShowcaseManifestV1,
): void {
  const marked = tags.filter((tag) =>
    Object.hasOwn(tag.attributes, "data-ty-showcase-section"),
  );
  const rendered = manifest.coverage.filter(
    (item): item is Extract<typeof item, { disposition: "rendered" }> =>
      item.disposition === "rendered",
  );
  for (const required of [
    "identity",
    "component-catalog",
    "component-contracts",
    "implementation-provenance",
    "supplemental-validation",
  ])
    if (!rendered.some((item) => item.key === required))
      invalid(`required_section_not_rendered:${required}`);
  if (marked.length !== rendered.length)
    invalid(`section_marker_count:${marked.length}:${rendered.length}`);
  let priorOffset = -1;
  for (const item of manifest.coverage) {
    const matches = marked.filter(
      (tag) => tag.attributes["data-ty-showcase-section"] === item.key,
    );
    if (item.disposition === "not_applicable") {
      if (matches.length)
        invalid(`not_applicable_section_rendered:${item.key}`);
      continue;
    }
    if (matches.length !== 1)
      invalid(`section_marker_count:${item.key}:${matches.length}`);
    if (
      matches[0].attributes.id !== item.anchor ||
      byId.get(item.anchor) !== matches[0]
    )
      invalid(`section_anchor_mismatch:${item.key}:${item.anchor}`);
    if (matches[0].offset <= priorOffset)
      invalid(`section_order_invalid:${item.key}`);
    priorOffset = matches[0].offset;
  }
}

function inspectIndex(
  tags: ShowcaseHtmlTag[],
  byId: ReadonlyMap<string, ShowcaseHtmlTag>,
  expected: Array<{ key: string; anchor: string }>,
  attribute: string,
  label: string,
): void {
  const marked = tags.filter((tag) => Object.hasOwn(tag.attributes, attribute));
  if (marked.length !== expected.length)
    invalid(`${label}_marker_count:${marked.length}:${expected.length}`);
  for (const item of expected) {
    const matches = marked.filter(
      (tag) => tag.attributes[attribute] === item.key,
    );
    if (matches.length !== 1)
      invalid(`${label}_marker_count:${item.key}:${matches.length}`);
    if (
      matches[0].attributes.id !== item.anchor ||
      byId.get(item.anchor) !== matches[0]
    )
      invalid(`${label}_anchor_mismatch:${item.key}:${item.anchor}`);
    if (
      matches[0].attributes["data-ty-showcase-section"] ===
        "supplemental-validation" ||
      matches[0].ancestor_sections.includes("supplemental-validation")
    )
      invalid(`${label}_declared_by_supplemental_gallery:${item.key}`);
  }
}

function inspectTargetConditions(
  tags: ShowcaseHtmlTag[],
  byId: ReadonlyMap<string, ShowcaseHtmlTag>,
  manifest: DesignAuthorityShowcaseManifestV1,
): void {
  const marked = tags.filter(
    (tag) =>
      Object.hasOwn(tag.attributes, "data-ty-showcase-target") ||
      Object.hasOwn(tag.attributes, "data-ty-showcase-condition"),
  );
  if (marked.length !== manifest.target_conditions.length)
    invalid(
      `target_condition_marker_count:${marked.length}:${manifest.target_conditions.length}`,
    );
  for (const item of manifest.target_conditions) {
    const matches = marked.filter(
      (tag) =>
        tag.attributes["data-ty-showcase-target"] === item.target_key &&
        tag.attributes["data-ty-showcase-condition"] === item.condition_key,
    );
    if (matches.length !== 1)
      invalid(
        `target_condition_marker_count:${item.target_key}:${item.condition_key}:${matches.length}`,
      );
    if (
      matches[0].attributes.id !== item.anchor ||
      byId.get(item.anchor) !== matches[0]
    )
      invalid(
        `target_condition_anchor_mismatch:${item.target_key}:${item.condition_key}`,
      );
    if (
      matches[0].attributes["data-ty-showcase-section"] !==
        "supplemental-validation" &&
      !matches[0].ancestor_sections.includes("supplemental-validation")
    )
      invalid(
        `target_condition_outside_supplemental_gallery:${item.target_key}:${item.condition_key}`,
      );
  }
}

function exactAttribute(
  tag: ShowcaseHtmlTag,
  name: string,
  expected: string,
): void {
  if (tag.attributes[name] !== expected)
    invalid(`html_root_attribute:${name}:expected:${expected}`);
}

function compare(left: string, right: string): number {
  return Buffer.from(left).compare(Buffer.from(right));
}

function invalid(reason: string): never {
  throw new Error(`design_authority_showcase_invalid:${reason}`);
}
