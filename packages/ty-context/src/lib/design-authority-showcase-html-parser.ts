const VOID_ELEMENTS = new Set([
  "area",
  "basefont",
  "bgsound",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

export interface ShowcaseHtmlTag {
  name: string;
  attributes: Readonly<Record<string, string>>;
  offset: number;
  ancestor_sections: string[];
}

export interface ParsedShowcaseHtml {
  tags: ShowcaseHtmlTag[];
  inline_css: string[];
}

type RootState = "before" | "inside" | "after";

export function parseRestrictedShowcaseHtml(
  content: string,
): ParsedShowcaseHtml {
  if (!content.trimStart().toLowerCase().startsWith("<!doctype html>"))
    invalid("html_doctype_required");
  const tags: ShowcaseHtmlTag[] = [];
  const stack: ShowcaseHtmlTag[] = [];
  let cursor = 0;
  let doctypeCount = 0;
  let rootState: RootState = "before";
  while (cursor < content.length) {
    const start = content.indexOf("<", cursor);
    if (start < 0) {
      inspectOutsideRootText(content.slice(cursor), rootState);
      cursor = content.length;
      break;
    }
    inspectOutsideRootText(content.slice(cursor, start), rootState);
    if (content.startsWith("<!--", start)) {
      const end = content.indexOf("-->", start + 4);
      if (end < 0) invalid("html_comment_unclosed");
      cursor = end + 3;
      continue;
    }
    const doctype = /^<!doctype html\s*>/iu.exec(content.slice(start));
    if (doctype) {
      if (rootState !== "before" || stack.length)
        invalid("html_doctype_outside_prologue");
      doctypeCount += 1;
      cursor = start + doctype[0].length;
      continue;
    }
    const end = tagEnd(content, start + 1);
    if (end < 0) invalid("html_tag_unclosed");
    const raw = content.slice(start, end + 1);
    rootState = applyTag(raw, start, stack, tags, rootState);
    cursor = end + 1;
  }
  if (doctypeCount !== 1) invalid(`html_doctype_count:${doctypeCount}`);
  if (stack.length)
    invalid(`html_tag_unclosed:${stack.map((item) => item.name).join(",")}`);
  if (rootState !== "after") invalid(`html_root_state:${rootState}`);
  return { tags, inline_css: styleBodies(content) };
}

function inspectOutsideRootText(value: string, rootState: RootState): void {
  if (rootState !== "inside" && value.trim())
    invalid(`html_text_outside_root:${diagnostic(value)}`);
}

function applyTag(
  raw: string,
  offset: number,
  stack: ShowcaseHtmlTag[],
  tags: ShowcaseHtmlTag[],
  rootState: RootState,
): RootState {
  const match = /^<\s*(\/?)\s*([a-z][a-z0-9:-]*)([\s\S]*?)>$/u.exec(raw);
  if (!match || match[2] !== match[2].toLowerCase())
    invalid(`html_tag_unsupported:${diagnostic(raw)}`);
  const name = match[2];
  if (match[1] === "/") {
    if (match[3].trim()) invalid(`html_closing_tag_attributes:${name}`);
    const opened = stack.pop();
    if (!opened || opened.name !== name)
      invalid(`html_tag_nesting:${opened?.name ?? "none"}:${name}`);
    return name === "html" ? "after" : rootState;
  }

  const selfClosing = /\/\s*$/u.test(match[3]);
  const attributeSource = selfClosing
    ? match[3].replace(/\/\s*$/u, "")
    : match[3];
  const attributes = parseAttributes(attributeSource, name);
  let nextRootState = rootState;
  if (name === "html") {
    if (rootState !== "before" || stack.length || selfClosing)
      invalid("html_root_position");
    nextRootState = "inside";
  } else if (!stack.length) invalid(`html_tag_outside_root:${name}`);
  const tag: ShowcaseHtmlTag = {
    name,
    attributes,
    offset,
    ancestor_sections: stack
      .map((item) => item.attributes["data-ty-showcase-section"])
      .filter((item): item is string => Boolean(item)),
  };
  tags.push(tag);
  if (!selfClosing && !VOID_ELEMENTS.has(name)) stack.push(tag);
  return nextRootState;
}

function parseAttributes(
  source: string,
  tag: string,
): Readonly<Record<string, string>> {
  const attributes: Record<string, string> = {};
  let cursor = 0;
  while (cursor < source.length) {
    const whitespace = /^\s+/u.exec(source.slice(cursor));
    if (!whitespace) {
      if (!source.slice(cursor).trim()) break;
      invalid(
        `html_attribute_syntax:${tag}:${diagnostic(source.slice(cursor))}`,
      );
    }
    cursor += whitespace[0].length;
    if (cursor >= source.length) break;
    const match = /^([a-z][a-z0-9:._-]*)="([^"<>]*)"/u.exec(
      source.slice(cursor),
    );
    if (!match || match[1] !== match[1].toLowerCase())
      invalid(
        `html_attribute_syntax:${tag}:${diagnostic(source.slice(cursor))}`,
      );
    if (Object.hasOwn(attributes, match[1]))
      invalid(`html_attribute_duplicate:${tag}:${match[1]}`);
    attributes[match[1]] = match[2];
    cursor += match[0].length;
  }
  return Object.freeze(attributes);
}

function styleBodies(content: string): string[] {
  const starts = [...content.matchAll(/<style(?:\s[^<>]*)?>/gu)];
  const bodies = [
    ...content.matchAll(/<style(?:\s[^<>]*)?>([\s\S]*?)<\/style>/gu),
  ].map((match) => match[1]);
  if (starts.length !== bodies.length) invalid("html_style_element_malformed");
  return bodies;
}

function tagEnd(content: string, offset: number): number {
  let quoted = false;
  for (let index = offset; index < content.length; index += 1) {
    if (content[index] === '"') quoted = !quoted;
    else if (content[index] === ">" && !quoted) return index;
  }
  return -1;
}

function diagnostic(value: string): string {
  return JSON.stringify(
    value.length <= 200 ? value : `${value.slice(0, 200)}…`,
  );
}

function invalid(reason: string): never {
  throw new Error(`design_authority_showcase_invalid:${reason}`);
}
