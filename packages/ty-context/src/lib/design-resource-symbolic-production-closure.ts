import { Buffer } from "node:buffer";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type {
  DesignResourceSymbolicHandoffTargetV2,
  DesignResourceSymbolicNoninterferenceCertificateV2,
  DesignResourceSymbolicNoninterferenceFailureWitnessV1,
} from "./design-resource-symbolic-fact-types.js";
import { symbolicNoninterferenceCertificateScopeSha256 } from "./design-resource-symbolic-noninterference-scope.js";
import { DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_MEDIA_TYPE } from "./design-resource-symbolic-source-ir-types.js";
import { canonicalJson } from "./strict-codec.js";

const SAFE_STATIC_HTML_TAGS = new Set([
  "article",
  "aside",
  "body",
  "br",
  "div",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "html",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "section",
  "span",
  "strong",
  "ul",
]);
const SAFE_STATIC_HTML_ATTRIBUTE =
  /^(?:aria-[a-z0-9-]+|class|data-[a-z0-9-]+|dir|id|lang|role|title)$/u;
const HTML_TOKEN = /<!doctype\s+html\s*>|<\/?[A-Za-z][A-Za-z0-9]*\b[^<>]*>/giu;
const HTML_TAG = /^<(\/)?([A-Za-z][A-Za-z0-9]*)([^<>]*)>$/u;
const HTML_ATTRIBUTE =
  /\s+([A-Za-z_:][A-Za-z0-9_.:-]*)(?:\s*=\s*(?:"[^"]*"|'[^']*'))?/guy;

export function productionClosureFailure(
  target: DesignResourceSymbolicHandoffTargetV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
): DesignResourceSymbolicNoninterferenceFailureWitnessV1 | null {
  for (const resourceRef of target.resource_refs) {
    const resource = resources.get(resourceRef);
    const bytes = contents.get(resourceRef);
    if (!resource || !bytes) continue;
    if (resourceRef === target.source_profile.entry_resource_ref) {
      if (resource.media_type !== "text/html")
        return witness(
          certificate,
          resource,
          null,
          `unsupported_entry_media:${resource.media_type}`,
        );
      const failure = staticHtmlFailure(bytes.toString("utf8"));
      if (failure)
        return witness(
          certificate,
          resource,
          failure.offset,
          failure.detail,
          bytes.toString("utf8"),
        );
      continue;
    }
    if (
      resource.media_type !== "application/json" &&
      resource.media_type !== DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_MEDIA_TYPE
    )
      return witness(
        certificate,
        resource,
        null,
        `unsupported_dependency_media:${resource.media_type}`,
      );
    try {
      const parsed = JSON.parse(bytes.toString("utf8"));
      if (
        resource.media_type === DESIGN_RESOURCE_SYMBOLIC_SOURCE_IR_MEDIA_TYPE &&
        canonicalJson(parsed) !== bytes.toString("utf8")
      )
        return witness(
          certificate,
          resource,
          null,
          "noncanonical_symbolic_source_ir",
        );
    } catch {
      return witness(certificate, resource, null, "invalid_inert_json");
    }
  }
  return null;
}

function staticHtmlFailure(
  source: string,
): { offset: number; detail: string } | null {
  let cursor = 0;
  let doctypeSeen = false;
  for (const match of source.matchAll(HTML_TOKEN)) {
    const token = match[0];
    const offset = match.index;
    if (source.slice(cursor, offset).includes("<"))
      return {
        offset: cursor + source.slice(cursor, offset).indexOf("<"),
        detail: "unsupported_html_token",
      };
    cursor = offset + token.length;
    if (/^<!doctype/iu.test(token)) {
      if (doctypeSeen || source.slice(0, offset).trim())
        return { offset, detail: "misplaced_or_duplicate_doctype" };
      doctypeSeen = true;
      continue;
    }
    const parsed = HTML_TAG.exec(token);
    if (!parsed) return { offset, detail: "unsupported_html_token" };
    const closing = parsed[1] === "/";
    const tag = parsed[2].toLowerCase();
    if (!SAFE_STATIC_HTML_TAGS.has(tag))
      return { offset, detail: `unsupported_html_tag:${tag}` };
    const attributes = parsed[3];
    if (closing) {
      if (attributes.trim())
        return { offset, detail: "closing_tag_attributes" };
      continue;
    }
    const attributeFailure = staticAttributeFailure(attributes);
    if (attributeFailure)
      return {
        offset: offset + token.indexOf(attributes) + attributeFailure.offset,
        detail: attributeFailure.detail,
      };
  }
  const remainder = source.slice(cursor);
  if (remainder.includes("<"))
    return {
      offset: cursor + remainder.indexOf("<"),
      detail: "unsupported_html_token",
    };
  return null;
}

function staticAttributeFailure(
  source: string,
): { offset: number; detail: string } | null {
  const value = source.endsWith("/") ? source.slice(0, -1) : source;
  let cursor = 0;
  HTML_ATTRIBUTE.lastIndex = 0;
  while (cursor < value.length) {
    HTML_ATTRIBUTE.lastIndex = cursor;
    const match = HTML_ATTRIBUTE.exec(value);
    if (!match || match.index !== cursor)
      return { offset: cursor, detail: "unsupported_html_attribute_syntax" };
    const name = match[1].toLowerCase();
    if (!SAFE_STATIC_HTML_ATTRIBUTE.test(name))
      return { offset: cursor, detail: `unsupported_html_attribute:${name}` };
    cursor = HTML_ATTRIBUTE.lastIndex;
  }
  return null;
}

function witness(
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  resource: DesignResource,
  byteOffset: number | null,
  detail: string,
  source = "",
): DesignResourceSymbolicNoninterferenceFailureWitnessV1 {
  const axisRef = certificate.omitted_axis_refs.find((axis) =>
    source.includes(axis),
  );
  return {
    kind: axisRef ? "omitted_axis_dependency" : "unsupported_dependency",
    side: "production",
    certificate_scope_sha256:
      symbolicNoninterferenceCertificateScopeSha256(certificate),
    axis_ref: axisRef ?? null,
    fact_rule_ref: null,
    resource_ref: resource.key,
    path: resource.path,
    locator: null,
    node_ref: null,
    byte_offset:
      byteOffset === null
        ? null
        : Buffer.byteLength(source.slice(0, byteOffset)),
    assignment: null,
    detail,
  };
}
