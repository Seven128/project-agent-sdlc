import { htmlAttributes } from "./design-resource-handoff-file-primitives.js";
import { invalidDesignResourceHandoff } from "./design-resource-handoff-validation-primitives.js";

export function cssRuleBody(
  content: string,
  selector: string,
  detail: string,
): string {
  const bodies: string[] = [];
  for (const match of content.matchAll(
    /(?:^|\})\s*([^@{}][^{}]*)\{([^{}]*)\}/gmu,
  )) {
    if (
      match[1]
        .split(",")
        .map((item) => item.trim())
        .includes(selector)
    )
      bodies.push(match[2]);
  }
  if (bodies.length !== 1)
    invalidDesignResourceHandoff(
      bodies.length ? "locator_ambiguous" : "locator_not_found",
      detail,
    );
  return bodies[0];
}

export function htmlOpeningTag(
  content: string,
  selector: string,
  detail: string,
): string {
  const matches = matchingHtmlTags(content, selector, detail);
  if (matches.length !== 1)
    invalidDesignResourceHandoff(
      matches.length ? "locator_ambiguous" : "locator_not_found",
      detail,
    );
  return matches[0].tag;
}

export function htmlAttribute(
  content: string,
  selector: string,
  attribute: string,
  detail: string,
): string {
  const matches = matchingHtmlTags(content, selector, detail);
  if (matches.length !== 1)
    invalidDesignResourceHandoff(
      matches.length ? "locator_ambiguous" : "locator_not_found",
      detail,
    );
  const attributes = htmlAttributes(matches[0].attributes);
  const value = attributes.get(attribute.toLowerCase());
  if (value === undefined)
    invalidDesignResourceHandoff("locator_not_found", detail);
  return value;
}

export function elementInnerContent(
  content: string,
  selector: string,
  detail: string,
): string {
  const opening = htmlOpeningTag(content, selector, detail);
  const tagName = /^<([A-Za-z][A-Za-z0-9:-]*)\b/u.exec(opening)?.[1];
  if (!tagName || /\/\s*>$/u.test(opening))
    invalidDesignResourceHandoff("locator_element_has_no_content", detail);
  const start = content.indexOf(opening);
  const close = new RegExp(`</${escapeRegExp(tagName)}\\s*>`, "giu");
  close.lastIndex = start + opening.length;
  const match = close.exec(content);
  if (!match)
    invalidDesignResourceHandoff("locator_element_close_missing", detail);
  const inner = content.slice(start + opening.length, match.index);
  if (new RegExp(`<${escapeRegExp(tagName)}\\b`, "iu").test(inner))
    invalidDesignResourceHandoff("locator_nested_same_tag_unsupported", detail);
  return inner.trim();
}

function matchingHtmlTags(
  content: string,
  selector: string,
  detail: string,
): Array<{ tag: string; attributes: string }> {
  const parsed =
    /^(?:([A-Za-z][A-Za-z0-9:-]*))?(?:#([A-Za-z][A-Za-z0-9_.:-]*))?(?:\[([A-Za-z_:][A-Za-z0-9_.:-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\])?$/u.exec(
      selector,
    );
  if (!parsed || (!parsed[1] && !parsed[2] && !parsed[3]))
    invalidDesignResourceHandoff("locator_html_selector_unsupported", detail);
  const result: Array<{ tag: string; attributes: string }> = [];
  for (const match of content.matchAll(
    /<([A-Za-z][A-Za-z0-9:-]*)\b([^<>]*)>/gu,
  )) {
    if (parsed[1] && match[1].toLowerCase() !== parsed[1].toLowerCase())
      continue;
    const attributes = htmlAttributes(match[2]);
    if (parsed[2] && attributes.get("id") !== parsed[2]) continue;
    if (parsed[3]) {
      const expected = parsed[4] ?? parsed[5] ?? parsed[6];
      const actual = attributes.get(parsed[3].toLowerCase());
      if (
        actual === undefined ||
        (expected !== undefined && actual !== expected)
      )
        continue;
    }
    result.push({ tag: match[0], attributes: match[2] });
  }
  return result;
}

export function markdownSection(
  content: string,
  anchor: string,
  detail: string,
): string {
  const lines = content.split(/\r?\n/u);
  const slug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
      .replace(/\s+/gu, "-");
  const start = lines.findIndex((line) => {
    const match = /^(#{1,6})\s+(.+)$/u.exec(line);
    return match ? slug(match[2]) === anchor : false;
  });
  if (start < 0) invalidDesignResourceHandoff("locator_not_found", detail);
  const level = /^(#{1,6})\s/u.exec(lines[start])![1].length;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s/u.exec(lines[index]);
    if (match && match[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

export function javascriptExport(
  content: string,
  identifier: string,
  detail: string,
): string {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(identifier))
    invalidDesignResourceHandoff("locator_javascript_export_invalid", detail);
  const expression = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+${escapeRegExp(identifier)}\\s*=\\s*([^;]+);`,
    "gu",
  );
  return uniqueCapture(content, expression, detail).trim();
}

export function uniqueCapture(
  content: string,
  expression: RegExp,
  detail: string,
): string {
  const values = [...content.matchAll(expression)].map((match) => match[1]);
  if (values.length !== 1)
    invalidDesignResourceHandoff(
      values.length ? "locator_ambiguous" : "locator_not_found",
      detail,
    );
  return values[0];
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
