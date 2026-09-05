import { getStaticTOMLValue, parseTOML, type AST } from "toml-eslint-parser";
import type { ContextRole } from "../context-catalog/catalog-portable-contract.js";
import { normalizeContextPath } from "../context-catalog/catalog-paths.js";

export interface ManifestContextBlockInput {
  path: string;
  role: ContextRole;
  read_policy: string;
  read_when?: string;
  triggers?: string[];
  default_children?: string[];
}

export interface ManifestAppendResult {
  content: string;
  inserted_block: string;
  line_ending: "lf" | "crlf";
}

export interface ManifestPathReplacementResult {
  content: string;
  previous_literal: string;
  next_literal: string;
  range: [number, number];
  replacements: Array<{
    kind: "owner" | "default_child";
    previous_literal: string;
    next_literal: string;
    range: [number, number];
  }>;
}

export function appendContextManifestBlock(
  manifestContent: string,
  input: ManifestContextBlockInput,
): ManifestAppendResult {
  parseManifest(manifestContent);
  const eol = manifestLineEnding(manifestContent);
  const block = renderContextBlock(input, eol);
  const separator = appendSeparator(manifestContent, eol);
  const content = `${manifestContent}${separator}${block}`;
  parseManifest(content);
  return {
    content,
    inserted_block: block,
    line_ending: eol === "\r\n" ? "crlf" : "lf",
  };
}

export function replaceContextManifestPath(
  manifestContent: string,
  fromPathInput: string,
  toPathInput: string,
): ManifestPathReplacementResult {
  const ast = parseManifest(manifestContent);
  const fromPath = normalizeContextPath(fromPathInput);
  const toPath = normalizeContextPath(toPathInput);
  const owners: AST.TOMLStringValue[] = [];
  const children: AST.TOMLStringValue[] = [];
  for (const node of ast.body[0].body) {
    if (node.type === "TOMLKeyValue" && staticKey(node) === "default_files") {
      if (node.value.type !== "TOMLArray")
        invalid("default_files_array_required");
      for (const element of node.value.elements)
        collectExactString(element, fromPath, children);
      continue;
    }
    if (
      node.type !== "TOMLTable" ||
      node.kind !== "array" ||
      node.key.keys.length !== 1
    )
      continue;
    const table = getStaticTOMLValue(node.key)[0];
    if (table !== "context" && table !== "areas") continue;
    const ownerKey = table === "context" ? "path" : "context";
    const ownerValues = node.body.filter(
      (entry) => staticKey(entry) === ownerKey,
    );
    if (ownerValues.length !== 1) invalid(`${table}_owner_path_key_not_unique`);
    collectExactString(ownerValues[0].value, fromPath, owners);
    if (table !== "context") continue;
    for (const entry of node.body) {
      if (staticKey(entry) !== "default_children") continue;
      if (entry.value.type !== "TOMLArray")
        invalid("default_children_array_required");
      for (const element of entry.value.elements)
        collectExactString(element, fromPath, children);
    }
  }
  if (owners.length === 0) invalid(`context_path_not_found:${fromPath}`);
  if (owners.length !== 1) invalid(`context_path_ambiguous:${fromPath}`);
  const values = [
    ...owners.map((value) => ({ kind: "owner" as const, value })),
    ...children.map((value) => ({ kind: "default_child" as const, value })),
  ];
  for (const { value } of values)
    if (value.style !== "basic" || value.multiline)
      invalid(`context_path_literal_unsupported:${fromPath}`);
  const nextLiteral = tomlBasicString(toPath);
  const replacements = values.map(({ kind, value }) => ({
    kind,
    previous_literal: manifestContent.slice(value.range[0], value.range[1]),
    next_literal: nextLiteral,
    range: [value.range[0], value.range[1]] as [number, number],
  }));
  let content = manifestContent;
  for (const replacement of [...replacements].sort(
    (left, right) => right.range[0] - left.range[0],
  ))
    content = `${content.slice(0, replacement.range[0])}${replacement.next_literal}${content.slice(replacement.range[1])}`;
  const reparsed = parseManifest(content);
  if (
    !manifestHasExactOwnerPath(reparsed, toPath) ||
    manifestHasExactManifestPath(reparsed, fromPath)
  )
    invalid(`context_path_replacement_unverified:${toPath}`);
  const primary = replacements.find((entry) => entry.kind === "owner")!;
  return {
    content,
    previous_literal: primary.previous_literal,
    next_literal: nextLiteral,
    range: primary.range,
    replacements,
  };
}

function staticKey(entry: AST.TOMLKeyValue): unknown {
  return entry.key.keys.length === 1
    ? getStaticTOMLValue(entry.key)[0]
    : undefined;
}

function collectExactString(
  value: AST.TOMLContentNode,
  expected: string,
  output: AST.TOMLStringValue[],
): void {
  if (
    value.type === "TOMLValue" &&
    value.kind === "string" &&
    normalizeContextPath(value.value) === expected
  )
    output.push(value);
}

function renderContextBlock(
  input: ManifestContextBlockInput,
  eol: "\n" | "\r\n",
): string {
  const lines = [
    "[[context]]",
    `path = ${tomlBasicString(input.path)}`,
    `role = ${tomlBasicString(input.role)}`,
    `read_policy = ${tomlBasicString(input.read_policy)}`,
  ];
  if (input.read_when)
    lines.push(`read_when = ${tomlBasicString(input.read_when)}`);
  if (input.triggers?.length)
    lines.push(`triggers = ${tomlStringArray(input.triggers)}`);
  if (input.default_children?.length)
    lines.push(`default_children = ${tomlStringArray(input.default_children)}`);
  return `${lines.join(eol)}${eol}`;
}

function parseManifest(content: string): AST.TOMLProgram {
  if (content.charCodeAt(0) === 0xfeff) invalid("bom_not_allowed");
  try {
    return parseTOML(content, { tomlVersion: "1.0" });
  } catch (error) {
    invalid(`parse_failed:${message(error)}`);
  }
}

function manifestLineEnding(content: string): "\n" | "\r\n" {
  const withoutCrLf = content.replaceAll("\r\n", "");
  if (withoutCrLf.includes("\r")) invalid("bare_cr_not_supported");
  if (content.includes("\r\n") && withoutCrLf.includes("\n"))
    invalid("mixed_line_endings_not_supported");
  return content.includes("\r\n") ? "\r\n" : "\n";
}

function appendSeparator(content: string, eol: "\n" | "\r\n"): string {
  if (content.length === 0) return "";
  if (content.endsWith(`${eol}${eol}`)) return "";
  if (content.endsWith(eol)) return eol;
  return `${eol}${eol}`;
}

function tomlStringArray(values: string[]): string {
  return `[${values.map(tomlBasicString).join(", ")}]`;
}

function tomlBasicString(value: string): string {
  let result = '"';
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    if (character === "\\") result += "\\\\";
    else if (character === '"') result += '\\"';
    else if (character === "\b") result += "\\b";
    else if (character === "\t") result += "\\t";
    else if (character === "\n") result += "\\n";
    else if (character === "\f") result += "\\f";
    else if (character === "\r") result += "\\r";
    else if (codePoint < 0x20 || codePoint === 0x7f)
      result += `\\u${codePoint.toString(16).padStart(4, "0")}`;
    else result += character;
  }
  return `${result}"`;
}

function manifestHasExactOwnerPath(
  ast: AST.TOMLProgram,
  expected: string,
): boolean {
  return ast.body[0].body.some((node) => {
    if (
      node.type !== "TOMLTable" ||
      node.kind !== "array" ||
      node.key.keys.length !== 1 ||
      !["context", "areas"].includes(String(getStaticTOMLValue(node.key)[0]))
    )
      return false;
    const table = getStaticTOMLValue(node.key)[0];
    const key = table === "context" ? "path" : "context";
    return node.body.some(
      (entry) =>
        entry.key.keys.length === 1 &&
        getStaticTOMLValue(entry.key)[0] === key &&
        entry.value.type === "TOMLValue" &&
        entry.value.kind === "string" &&
        normalizeContextPath(entry.value.value) === expected,
    );
  });
}

function manifestHasExactManifestPath(
  ast: AST.TOMLProgram,
  expected: string,
): boolean {
  for (const node of ast.body[0].body) {
    if (
      node.type === "TOMLKeyValue" &&
      staticKey(node) === "default_files" &&
      containsExactString(node.value, expected)
    )
      return true;
    if (
      node.type !== "TOMLTable" ||
      node.kind !== "array" ||
      node.key.keys.length !== 1
    )
      continue;
    const table = getStaticTOMLValue(node.key)[0];
    if (table !== "context" && table !== "areas") continue;
    for (const entry of node.body) {
      const key = staticKey(entry);
      if (
        (key === (table === "context" ? "path" : "context") ||
          (table === "context" && key === "default_children")) &&
        containsExactString(entry.value, expected)
      )
        return true;
    }
  }
  return false;
}

function containsExactString(
  value: AST.TOMLContentNode,
  expected: string,
): boolean {
  if (value.type === "TOMLArray")
    return value.elements.some((element) =>
      containsExactString(element, expected),
    );
  return (
    value.type === "TOMLValue" &&
    value.kind === "string" &&
    normalizeContextPath(value.value) === expected
  );
}

function invalid(reason: string): never {
  throw new Error(`context_manifest_patch_invalid:${reason}`);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
