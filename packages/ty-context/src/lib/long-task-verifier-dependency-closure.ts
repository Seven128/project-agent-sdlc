import { readFile } from "node:fs/promises";
import path from "node:path";
import type { WorkspaceManifestV2 } from "./long-task-delivery-types.js";
import {
  classifyRepositoryPatternOverlap,
  matchesRepoPattern,
} from "./long-task-paths.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import { sha256Hex } from "./strict-codec.js";

const SCRIPT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
]);
const RESOLUTION_EXTENSIONS = [
  "",
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".mts",
  ".cts",
  ".tsx",
  ".json",
];

export async function freezeLocalVerifierDependencyClosure(
  repository: string,
  roots: Iterable<string>,
  manifest: WorkspaceManifestV2,
  runtimeOwnedPatterns: readonly string[] = [],
): Promise<Record<string, string>> {
  const available = new Set(manifest.files.map((file) => file.path));
  const result: Record<string, string> = {};
  const queued = [...new Set(roots)].filter((file) =>
    SCRIPT_EXTENSIONS.has(path.posix.extname(file).toLowerCase()),
  );
  const visited = new Set<string>();
  while (queued.length) {
    const relative = queued.shift()!;
    if (visited.has(relative)) continue;
    visited.add(relative);
    if (!available.has(relative))
      throw new Error(`verification_dependency_not_found:${relative}`);
    const absolute = await assertProtectedRepositoryFile(
      repository,
      path.join(repository, ...relative.split("/")),
      "verification_dependency",
    );
    const bytes = await readFile(absolute);
    result[relative] = sha256Hex(bytes);
    const source = bytes.toString("utf8");
    if (hasNonLiteralLoader(source))
      throw new Error(`verification_dependency_dynamic_unresolved:${relative}`);
    for (const specifier of staticSpecifiers(source)) {
      if (!isLocalSpecifier(specifier)) continue;
      const dependency = resolveLocalSpecifier(relative, specifier, available);
      const unresolvedBase = localSpecifierBase(relative, specifier);
      if (
        (dependency &&
          runtimeOwnedPatterns.some((pattern) =>
            matchesRepoPattern(dependency, pattern),
          )) ||
        (!dependency &&
          unresolvedBase &&
          runtimeOwnedPatterns.some((pattern) =>
            runtimePatternOwns(unresolvedBase, pattern),
          ))
      )
        continue;
      if (!dependency)
        throw new Error(
          `verification_dependency_not_found:${relative}:${specifier}`,
        );
      if (SCRIPT_EXTENSIONS.has(path.posix.extname(dependency).toLowerCase()))
        queued.push(dependency);
      else {
        const dependencyFile = await assertProtectedRepositoryFile(
          repository,
          path.join(repository, ...dependency.split("/")),
          "verification_dependency",
        );
        result[dependency] = sha256Hex(await readFile(dependencyFile));
      }
    }
  }
  return sortRecord(result);
}

export function packageScriptVerifierRoots(
  script: string,
  packageFile: string,
  manifest: WorkspaceManifestV2,
): string[] {
  const tokens = staticPackageScriptTokens(script);
  if (!tokens.length || !["node", "node.exe"].includes(tokens[0].toLowerCase()))
    throw new Error(
      "package_script_dependency_closure_unresolved:node_entry_required",
    );
  if (tokens.length < 2 || tokens[1].startsWith("-"))
    throw new Error(
      "package_script_dependency_closure_unresolved:static_entry_required",
    );
  const packageDirectory = path.posix.dirname(packageFile);
  const candidate = path.posix.normalize(
    path.posix.join(
      packageDirectory === "." ? "" : packageDirectory,
      tokens[1],
    ),
  );
  if (
    candidate === ".." ||
    candidate.startsWith("../") ||
    !manifest.files.some((file) => file.path === candidate) ||
    !SCRIPT_EXTENSIONS.has(path.posix.extname(candidate).toLowerCase())
  )
    throw new Error(
      `package_script_dependency_closure_unresolved:entry_not_found:${tokens[1]}`,
    );
  return [candidate];
}

function staticPackageScriptTokens(script: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < script.length; index += 1) {
    const character = script[index];
    if (!quote && /\s/u.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    if (character === "'" || character === '"') {
      if (!quote) {
        quote = character;
        continue;
      }
      if (quote === character) {
        quote = null;
        continue;
      }
    }
    if (
      (!quote && /[&|;<>()]/u.test(character)) ||
      character === "`" ||
      character === "$" ||
      character === "%" ||
      character === "!"
    )
      throw new Error(
        "package_script_dependency_closure_unresolved:dynamic_shell_syntax",
      );
    current += character;
  }
  if (quote)
    throw new Error(
      "package_script_dependency_closure_unresolved:unterminated_quote",
    );
  if (current) tokens.push(current);
  return tokens;
}

function staticSpecifiers(source: string): string[] {
  const result: string[] = [];
  const patterns = [
    /\b(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/gu,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/gu,
    /\brequire\.resolve\s*\(\s*["']([^"']+)["']\s*\)/gu,
    /\bmodule\.require\s*\(\s*["']([^"']+)["']\s*\)/gu,
    /\bnew\s+URL\s*\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/gu,
  ];
  for (const pattern of patterns)
    for (const match of source.matchAll(pattern)) result.push(match[1]);
  return [...new Set(result)];
}

function hasNonLiteralLoader(source: string): boolean {
  return (
    /\b(?:import|require)\s*\(\s*(?!["'])[^)]/u.test(source) ||
    /\brequire\.resolve\s*\(\s*(?!["'])[^)]/u.test(source) ||
    /\bmodule\.require\s*\(\s*(?!["'])[^)]/u.test(source) ||
    /\bnew\s+URL\s*\(\s*(?!["'])[^,]+,\s*import\.meta\.url\s*\)/u.test(
      source,
    ) ||
    /\bcreateRequire\b/u.test(source)
  );
}

function isLocalSpecifier(specifier: string): boolean {
  return (
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    specifier.startsWith("/")
  );
}

function resolveLocalSpecifier(
  importer: string,
  specifier: string,
  available: Set<string>,
): string | null {
  const base = localSpecifierBase(importer, specifier);
  if (!base) return null;
  if (base.startsWith("../") || base === "..") return null;
  for (const extension of RESOLUTION_EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (available.has(candidate)) return candidate;
  }
  for (const extension of RESOLUTION_EXTENSIONS.slice(1)) {
    const candidate = `${base}/index${extension}`;
    if (available.has(candidate)) return candidate;
  }
  return null;
}

function localSpecifierBase(
  importer: string,
  specifier: string,
): string | null {
  const base = specifier.startsWith("/")
    ? specifier.slice(1)
    : path.posix.normalize(
        path.posix.join(path.posix.dirname(importer), specifier),
      );
  return base === ".." || base.startsWith("../") ? null : base;
}

function runtimePatternOwns(base: string, pattern: string): boolean {
  return (
    matchesRepoPattern(base, pattern) ||
    classifyRepositoryPatternOverlap(`${base}/**`, pattern).status ===
      "proven_overlap"
  );
}

function sortRecord<T>(value: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left.localeCompare(right)),
  );
}
