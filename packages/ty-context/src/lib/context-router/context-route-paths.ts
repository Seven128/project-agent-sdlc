import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { CLI_EXIT_CODES, CliCommandError } from "../cli-exit.js";
import {
  compareUtf8Paths,
  isPathWithin,
  normalizeContextPath,
  resolveProjectPath,
} from "../context-catalog/catalog-paths.js";
import type {
  CatalogFile,
  ContextCatalog,
} from "../context-catalog/catalog-types.js";
import type {
  ContextRouteAmbiguity,
  ContextRouteAreaCandidate,
  ContextRouteUnresolved,
} from "./context-route-types.js";
import {
  compareRouteAmbiguities,
  compareRouteUnresolved,
} from "./context-route-order.js";

export interface ContextRoutePathMatch {
  input: string;
  normalized_path: string;
  area: ContextRouteAreaCandidate;
}

export interface ContextRoutePathResult {
  matches: ContextRoutePathMatch[];
  ambiguous: ContextRouteAmbiguity[];
  unresolved: ContextRouteUnresolved[];
}

export function matchContextAreas(
  catalog: ContextCatalog,
  inputs: string[],
): ContextRoutePathResult {
  const matches: ContextRoutePathMatch[] = [];
  const ambiguous: ContextRouteAmbiguity[] = [];
  const unresolved: ContextRouteUnresolved[] = [];
  for (const normalized of normalizeRepositoryInputs(inputs, "--path")) {
    const candidates = catalog.areas
      .map((area) => ({
        id: area.id.normalize("NFC"),
        root: normalizeAreaRoot(area.root),
        context: normalizeContextPath(area.context),
      }))
      .filter((area) => areaContains(area.root, normalized));
    if (candidates.length === 0) {
      unresolved.push({
        kind: "path",
        input: normalized,
        reason: "no Area root contains the repository-relative path",
      });
      continue;
    }
    const maximum = Math.max(...candidates.map(areaScore));
    const deepest = candidates
      .filter((area) => areaScore(area) === maximum)
      .sort((left, right) =>
        compareUtf8Paths(
          `${left.root}\0${left.id}\0${left.context}`,
          `${right.root}\0${right.id}\0${right.context}`,
        ),
      );
    if (deepest.length > 1) {
      ambiguous.push({
        kind: "area_path",
        input: normalized,
        candidates: deepest,
        reason: "multiple Area roots tie at the deepest matching root",
      });
      continue;
    }
    matches.push({
      input: normalized,
      normalized_path: normalized,
      area: deepest[0],
    });
  }
  return {
    matches: matches.sort(comparePathMatches),
    ambiguous: ambiguous.sort(compareRouteAmbiguities),
    unresolved: unresolved.sort(compareRouteUnresolved),
  };
}

export async function resolveManualIncludes(
  catalog: ContextCatalog,
  inputs: string[],
): Promise<CatalogFile[]> {
  const files = new Map(catalog.context_files.map((file) => [file.path, file]));
  const contextRoot = resolveProjectPath(
    catalog.project_root,
    "project_context",
  );
  const realContextRoot = await realpath(contextRoot);
  const result = new Map<string, CatalogFile>();
  for (const normalized of normalizeRepositoryInputs(inputs, "--include")) {
    if (
      !normalized.startsWith("project_context/") ||
      !normalized.endsWith(".md")
    )
      throw new CliCommandError(
        CLI_EXIT_CODES.io,
        `route include must name an existing Markdown file under project_context/: ${normalized}`,
      );
    const file = files.get(normalized);
    if (!file)
      throw new CliCommandError(
        CLI_EXIT_CODES.io,
        `route include is missing or is not an eligible Context file: ${normalized}`,
      );
    const metadata = await lstat(file.absolute_path);
    if (!metadata.isFile() || metadata.isSymbolicLink())
      throw new CliCommandError(
        CLI_EXIT_CODES.io,
        `route include must be a regular no-follow file: ${normalized}`,
      );
    const identity = await realpath(file.absolute_path);
    if (!isPathWithin(realContextRoot, identity))
      throw new CliCommandError(
        CLI_EXIT_CODES.io,
        `route include resolves outside project_context/: ${normalized}`,
      );
    result.set(normalized, file);
  }
  return [...result.values()].sort((left, right) =>
    compareUtf8Paths(left.path, right.path),
  );
}

export function normalizeRepositoryInput(value: string, flag: string): string {
  const normalized = normalizeContextPath(value.trim());
  if (!normalized)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      `route ${flag} requires a non-empty repository-relative path`,
    );
  if (
    path.posix.isAbsolute(normalized) ||
    path.win32.isAbsolute(normalized) ||
    normalized.split("/").includes("..") ||
    /^[A-Za-z]:/u.test(normalized)
  )
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      `route ${flag} path must stay repository-relative: ${value}`,
    );
  return normalized;
}

export function normalizeRepositoryInputs(
  values: readonly string[],
  flag: string,
): string[] {
  return [
    ...new Set(values.map((value) => normalizeRepositoryInput(value, flag))),
  ].sort(compareUtf8Paths);
}

function normalizeAreaRoot(value: string): string {
  const normalized = normalizeContextPath(value.trim());
  return normalized === "" || normalized === "."
    ? "."
    : normalized.replace(/\/$/u, "");
}

function comparePathMatches(
  left: ContextRoutePathMatch,
  right: ContextRoutePathMatch,
): number {
  return (
    compareUtf8Paths(left.normalized_path, right.normalized_path) ||
    compareUtf8Paths(left.area.root, right.area.root) ||
    compareUtf8Paths(left.area.id, right.area.id) ||
    compareUtf8Paths(left.area.context, right.area.context)
  );
}

function areaContains(root: string, candidate: string): boolean {
  return root === "." || candidate === root || candidate.startsWith(`${root}/`);
}

function areaScore(area: ContextRouteAreaCandidate): number {
  if (area.root === ".") return 0;
  const depth = area.root.split("/").length;
  return depth * 1_000_000 + Buffer.byteLength(area.root, "utf8");
}
