import path from "node:path";
import {
  markdownDestinationSpans,
  type MarkdownDestinationKind,
} from "./markdown-link-spans.js";

export interface MarkdownLinkChange {
  kind: MarkdownDestinationKind;
  line: number;
  column: number;
  previous_destination: string;
  next_destination: string;
  target_before: string;
  target_after: string;
  range: [number, number];
}

export interface MarkdownLocalReference {
  kind: MarkdownDestinationKind;
  line: number;
  column: number;
  destination: string;
  target_path: string | null;
  status: "local" | "invalid" | "outside";
  detail?: string;
}

export interface MarkdownLinkPatchResult {
  content: string;
  changes: MarkdownLinkChange[];
  references: MarkdownLocalReference[];
}

export function patchMarkdownLinksForContextMove(input: {
  content: string;
  source_path: string;
  source_physical_path: string;
  from_path: string;
  from_physical_path: string;
  to_path: string;
  to_physical_path: string;
}): MarkdownLinkPatchResult {
  const changes: MarkdownLinkChange[] = [];
  const references: MarkdownLocalReference[] = [];
  for (const span of markdownDestinationSpans(input.content)) {
    const resolved = resolveLocalDestination(
      span.destination,
      input.source_path,
      input.source_physical_path,
    );
    if (resolved.status === "ignored") continue;
    if (resolved.status !== "local") {
      references.push({
        kind: span.kind,
        line: span.line,
        column: span.column,
        destination: span.destination,
        target_path: null,
        status: resolved.status,
        detail: resolved.detail,
      });
      continue;
    }
    references.push({
      kind: span.kind,
      line: span.line,
      column: span.column,
      destination: span.destination,
      target_path: resolved.target_path,
      status: "local",
    });
    const sourceMoves = input.source_path === input.from_path;
    if (sourceMoves && input.source_physical_path !== input.from_physical_path)
      throw new Error("context_move_source_physical_path_mismatch");
    const targetMoves = resolved.target_path === input.from_path;
    if (!targetMoves && !(sourceMoves && resolved.style === "relative"))
      continue;
    const targetAfter = targetMoves ? input.to_path : resolved.target_path;
    const sourcePhysicalAfter = sourceMoves
      ? input.to_physical_path
      : input.source_physical_path;
    const targetPhysicalAfter = targetMoves
      ? input.to_physical_path
      : resolved.physical_target_path;
    const next = renderDestination(
      resolved,
      sourcePhysicalAfter,
      targetPhysicalAfter,
    );
    if (next === span.destination) continue;
    changes.push({
      kind: span.kind,
      line: span.line,
      column: span.column,
      previous_destination: span.destination,
      next_destination: next,
      target_before: resolved.target_path,
      target_after: targetAfter,
      range: [span.start, span.end],
    });
  }
  let content = input.content;
  for (const change of [...changes].sort(
    (left, right) => right.range[0] - left.range[0],
  ))
    content = `${content.slice(0, change.range[0])}${change.next_destination}${content.slice(change.range[1])}`;
  return { content, changes, references };
}

type LocalDestination = {
  status: "local";
  target_path: string;
  physical_target_path: string;
  style: "root" | "repository" | "relative";
  suffix: string;
  encoded: boolean;
  windows: boolean;
  explicit_dot: boolean;
};

type ResolvedDestination =
  | LocalDestination
  | { status: "ignored" }
  | { status: "invalid" | "outside"; detail: string };

function resolveLocalDestination(
  destination: string,
  sourcePath: string,
  sourcePhysicalPath: string,
): ResolvedDestination {
  if (
    !destination ||
    destination.startsWith("#") ||
    destination.startsWith("//") ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(destination)
  )
    return { status: "ignored" };
  const boundary = firstBoundary(destination);
  const rawPath = destination.slice(0, boundary);
  const suffix = destination.slice(boundary);
  const windows = rawPath.includes("\\") && !rawPath.includes("/");
  const markdownDecoded = windows
    ? rawPath.replaceAll("\\", "/")
    : rawPath.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/gu, "$1");
  let decoded: string;
  try {
    decoded = decodeURIComponent(markdownDecoded).replaceAll("\\", "/");
  } catch {
    return { status: "invalid", detail: "invalid URL encoding" };
  }
  const style = decoded.startsWith("/")
    ? "root"
    : decoded.startsWith("project_context/")
      ? "repository"
      : "relative";
  const logicalCandidate =
    style === "root"
      ? decoded.slice(1)
      : style === "repository"
        ? decoded
        : path.posix.join(path.posix.dirname(sourcePath), decoded);
  const physicalCandidate =
    style === "root"
      ? decoded.slice(1)
      : style === "repository"
        ? decoded
        : path.posix.join(path.posix.dirname(sourcePhysicalPath), decoded);
  const normalized = path.posix.normalize(logicalCandidate).normalize("NFC");
  const physicalNormalized = path.posix.normalize(physicalCandidate);
  if (
    !normalized ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized)
  )
    return { status: "outside", detail: "destination escapes repository" };
  if (
    !physicalNormalized ||
    physicalNormalized === ".." ||
    physicalNormalized.startsWith("../") ||
    path.posix.isAbsolute(physicalNormalized)
  )
    return { status: "outside", detail: "destination escapes repository" };
  return {
    status: "local",
    target_path: normalized,
    physical_target_path: physicalNormalized,
    style,
    suffix,
    encoded: /%[0-9A-Fa-f]{2}/u.test(rawPath),
    windows,
    explicit_dot: decoded.startsWith("./"),
  };
}

function renderDestination(
  original: LocalDestination,
  sourcePhysicalAfter: string,
  targetPhysicalAfter: string,
): string {
  let rendered =
    original.style === "root"
      ? `/${targetPhysicalAfter}`
      : original.style === "repository"
        ? targetPhysicalAfter
        : path.posix.relative(
            path.posix.dirname(sourcePhysicalAfter),
            targetPhysicalAfter,
          );
  if (!rendered) rendered = path.posix.basename(targetPhysicalAfter);
  if (
    original.explicit_dot &&
    original.style === "relative" &&
    !rendered.startsWith(".")
  )
    rendered = `./${rendered}`;
  if (original.encoded || /[\s<>()]/u.test(rendered))
    rendered = rendered.split("/").map(encodeURIComponent).join("/");
  if (original.windows) rendered = rendered.replaceAll("/", "\\");
  return `${rendered}${original.suffix}`;
}

function firstBoundary(value: string): number {
  const hash = value.indexOf("#");
  const query = value.indexOf("?");
  const candidates = [hash, query].filter((entry) => entry >= 0);
  return candidates.length ? Math.min(...candidates) : value.length;
}
