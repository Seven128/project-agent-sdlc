import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { extractContextMarkdown } from "./context-markdown/context-markdown-extract.js";
import {
  DESIGN_AUTHORITY_LIMITS,
  compareDesignAuthorityDiagnostics,
  type DesignAuthorityDiagnostic,
} from "./design-authority-types.js";

export interface DesignAuthorityMarkdownSource {
  path: string;
  content: string;
}

export async function analyzeDesignAuthorityLinks(input: {
  repository: string;
  sources: DesignAuthorityMarkdownSource[];
  declared_paths: ReadonlySet<string>;
}): Promise<DesignAuthorityDiagnostic[]> {
  const diagnostics = await discoverExtraDesignFiles(
    input.repository,
    input.declared_paths,
  );
  for (const source of input.sources) {
    const extracted = extractContextMarkdown(source.content, source.path);
    for (const reference of extracted.references) {
      const resolved = resolveLocalDestination(
        input.repository,
        source.path,
        reference.destination,
      );
      if (resolved.disposition === "invalid")
        diagnostics.push({
          severity: "error",
          code: "invalid_local_authority_link",
          path: source.path,
          detail: `${reference.line}:${reference.column}: ${resolved.detail}`,
        });
      else if (
        resolved.disposition === "local" &&
        resolved.path.startsWith("design_system/") &&
        !input.declared_paths.has(resolved.path)
      )
        diagnostics.push({
          severity: "error",
          code: "authority_closure_link_unlisted",
          path: source.path,
          detail: `${reference.line}:${reference.column}: ${resolved.path}`,
        });
    }
  }
  return diagnostics.sort(compareDesignAuthorityDiagnostics);
}

async function discoverExtraDesignFiles(
  repository: string,
  declared: ReadonlySet<string>,
): Promise<DesignAuthorityDiagnostic[]> {
  const root = path.join(repository, "design_system");
  const status = await lstatOrNull(root);
  if (!status) return [];
  if (status.isSymbolicLink() || !status.isDirectory())
    throw new Error("design_authority_invalid:design_system_not_directory");
  const canonicalRepository = await realpath(repository);
  if (!inside(canonicalRepository, await realpath(root)))
    throw new Error(
      "design_authority_invalid:design_system_outside_repository",
    );
  const diagnostics: DesignAuthorityDiagnostic[] = [];
  const pending = [root];
  let discovered = 0;
  while (pending.length) {
    const directory = pending.pop()!;
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) =>
      Buffer.from(left.name).compare(Buffer.from(right.name)),
    );
    for (const entry of entries) {
      discovered += 1;
      if (discovered > DESIGN_AUTHORITY_LIMITS.max_members)
        throw new Error("design_authority_invalid:discovery_limit_exceeded");
      const absolute = path.join(directory, entry.name);
      const relative = path
        .relative(repository, absolute)
        .replace(/\\/gu, "/")
        .normalize("NFC");
      if (entry.isDirectory()) {
        pending.push(absolute);
        continue;
      }
      if (declared.has(relative)) continue;
      diagnostics.push({
        severity: "warning",
        code: entry.isFile()
          ? "unlisted_design_system_file"
          : "unlisted_design_system_non_file",
        path: relative,
        detail: "not part of the Design Authority closure",
      });
    }
  }
  return diagnostics;
}

type ResolvedDestination =
  | { disposition: "ignored" }
  | { disposition: "invalid"; detail: string }
  | { disposition: "local"; path: string };

function resolveLocalDestination(
  repository: string,
  sourcePath: string,
  destination: string,
): ResolvedDestination {
  const trimmed = destination.trim();
  if (!trimmed || trimmed.startsWith("#")) return { disposition: "ignored" };
  if (trimmed.startsWith("//") || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(trimmed))
    return { disposition: "ignored" };
  const boundary = [trimmed.indexOf("#"), trimmed.indexOf("?")]
    .filter((index) => index >= 0)
    .reduce((lowest, index) => Math.min(lowest, index), trimmed.length);
  let local: string;
  try {
    local = decodeURIComponent(trimmed.slice(0, boundary)).replaceAll(
      "\\",
      "/",
    );
  } catch {
    return { disposition: "invalid", detail: "invalid URL encoding" };
  }
  const absolute = local.startsWith("/")
    ? path.resolve(repository, local.slice(1))
    : local.startsWith("design_system/")
      ? path.resolve(repository, local)
      : path.resolve(repository, path.dirname(sourcePath), local);
  if (!inside(path.resolve(repository), absolute))
    return { disposition: "invalid", detail: "path escapes the repository" };
  return {
    disposition: "local",
    path: path
      .relative(repository, absolute)
      .replace(/\\/gu, "/")
      .normalize("NFC"),
  };
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

async function lstatOrNull(target: string) {
  try {
    return await lstat(target);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "ENOENT"
    )
      return null;
    throw error;
  }
}
