import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ps1",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

export const DEFAULT_ACTIVE_SOURCE_PORTABILITY_SURFACES = Object.freeze([
  {
    key: "managed-guidance",
    type: "tree",
    path: ".codex/ty-context-managed",
  },
  {
    key: "package-managed-assets",
    type: "tree",
    path: "packages/ty-context/assets",
  },
  {
    key: "public-executable-docs",
    type: "files",
    paths: [
      "README.md",
      "README.zh-CN.md",
      "PROJECT_SPEC.md",
      "packages/ty-context/README.md",
      "docs/launch/github-release-0.12.0.md",
    ],
  },
  {
    key: "durable-context",
    type: "tree",
    path: "project_context",
  },
  {
    key: "managed-source-mapping",
    type: "files",
    paths: ["packages/ty-context/source-mappings.yaml"],
  },
  {
    key: "runtime-resolved-source",
    type: "files",
    paths: [
      "packages/ty-context/migrations/README.md",
    ],
  },
]);

const WINDOWS_USER_HOME =
  /[A-Za-z]:[\\/]+Users[\\/]+([^\\/\s"'`<>]+)(?=[\\/]|$)/giu;
const POSIX_USER_HOME =
  /(?<![A-Za-z0-9._-])\/(?:Users|home)\/([^/\s"'`<>]+)(?=[/]|$)/gu;

export async function verifyActiveSourcePortability(options = {}) {
  const repository = path.resolve(options.repository ?? REPOSITORY);
  const surfaces =
    options.surfaces ?? DEFAULT_ACTIVE_SOURCE_PORTABILITY_SURFACES;
  const activeSources = options.activeSources ?? [];
  const categoryFiles = new Map();
  const uniqueFiles = new Map();

  for (const surface of surfaces) {
    const files = await resolveSurfaceFiles(repository, surface);
    categoryFiles.set(surface.key, files.map((file) => file.relative));
    for (const file of files) uniqueFiles.set(file.relative, file.absolute);
  }

  if (activeSources.length > 0) {
    const files = [];
    for (const activeSource of activeSources) {
      const file = await resolveProtectedRegularFile(
        repository,
        activeSource,
        "active_source",
      );
      files.push(file);
      uniqueFiles.set(file.relative, file.absolute);
    }
    categoryFiles.set(
      "caller-declared-active-source",
      files.map((file) => file.relative),
    );
  }

  const violations = [];
  for (const [relative, absolute] of [...uniqueFiles].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const content = await readFile(absolute, "utf8");
    violations.push(...findUserHomeLocatorViolations(content, relative));
  }

  return {
    schema_version: "active-source-portability-report-v1",
    status: violations.length === 0 ? "passed" : "failed",
    checked_file_count: uniqueFiles.size,
    categories: [...categoryFiles].map(([key, files]) => ({
      key,
      file_count: files.length,
      files: [...files].sort(),
    })),
    violations,
    historical_scope:
      "not_inferred; frozen Contracts, Receipts, snapshots, migrations and fixtures require an exact active-source selection",
  };
}

export function findUserHomeLocatorViolations(content, source = "input") {
  const violations = [];
  const lines = content.split(/\r?\n/u);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    collectMatches(
      lines[lineIndex],
      WINDOWS_USER_HOME,
      "windows_user_home",
      source,
      lineIndex,
      violations,
    );
    collectMatches(
      lines[lineIndex],
      POSIX_USER_HOME,
      "posix_user_home",
      source,
      lineIndex,
      violations,
    );
  }
  return violations;
}

function collectMatches(line, pattern, kind, source, lineIndex, violations) {
  pattern.lastIndex = 0;
  for (const match of line.matchAll(pattern)) {
    if (
      kind === "posix_user_home" &&
      /^[A-Za-z]:$/u.test(line.slice(Math.max(0, match.index - 2), match.index))
    )
      continue;
    if (isExplicitPlaceholder(match[1])) continue;
    violations.push({
      source,
      line: lineIndex + 1,
      column: match.index + 1,
      kind,
      locator:
        kind === "windows_user_home"
          ? "<drive>:/Users/<redacted>/"
          : "/<home-root>/<redacted>/",
    });
  }
}

function isExplicitPlaceholder(segment) {
  return /^(?:user|username|your[-_]?user(?:name)?|example[-_]?user|%[^%]+%|\$\{?[^}]+\}?)$/iu.test(
    segment,
  );
}

async function resolveSurfaceFiles(repository, surface) {
  if (!surface || typeof surface.key !== "string")
    throw new Error("active_source_portability_surface_key_invalid");
  if (surface.type === "tree") {
    const root = resolveProtectedPath(repository, surface.path, surface.key);
    return collectTreeFiles(repository, root, surface.key);
  }
  if (surface.type === "files" && Array.isArray(surface.paths)) {
    const files = [];
    for (const item of surface.paths)
      files.push(
        await resolveProtectedRegularFile(repository, item, surface.key),
      );
    return files;
  }
  throw new Error(`active_source_portability_surface_type_invalid:${surface.key}`);
}

async function collectTreeFiles(repository, directory, label) {
  const metadata = await lstat(directory);
  if (metadata.isSymbolicLink())
    throw new Error(`active_source_portability_link_forbidden:${label}`);
  if (!metadata.isDirectory())
    throw new Error(`active_source_portability_tree_expected:${label}`);

  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const absolute = path.join(directory, entry.name);
    const relative = repositoryRelative(repository, absolute);
    if (entry.isSymbolicLink())
      throw new Error(`active_source_portability_link_forbidden:${relative}`);
    if (entry.isDirectory()) {
      files.push(...(await collectTreeFiles(repository, absolute, relative)));
      continue;
    }
    if (!entry.isFile())
      throw new Error(`active_source_portability_non_regular:${relative}`);
    if (TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      files.push({ absolute, relative });
  }
  return files;
}

async function resolveProtectedRegularFile(repository, candidate, label) {
  const absolute = resolveProtectedPath(repository, candidate, label);
  const metadata = await lstat(absolute);
  const relative = repositoryRelative(repository, absolute);
  if (metadata.isSymbolicLink())
    throw new Error(`active_source_portability_link_forbidden:${relative}`);
  if (!metadata.isFile())
    throw new Error(`active_source_portability_file_expected:${relative}`);
  if (!TEXT_EXTENSIONS.has(path.extname(absolute).toLowerCase()))
    throw new Error(`active_source_portability_text_file_expected:${relative}`);
  return { absolute, relative };
}

function resolveProtectedPath(repository, candidate, label) {
  if (typeof candidate !== "string" || !candidate.trim())
    throw new Error(`active_source_portability_path_missing:${label}`);
  const absolute = path.resolve(repository, candidate);
  const relative = path.relative(repository, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error(`active_source_portability_path_unsafe:${label}`);
  return absolute;
}

function repositoryRelative(repository, absolute) {
  return path.relative(repository, absolute).split(path.sep).join("/");
}

function parseArguments(arguments_) {
  const activeSources = [];
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--active-source") {
      const value = arguments_[++index];
      if (!value)
        throw new Error("active_source_portability_active_source_missing");
      activeSources.push(value);
      continue;
    }
    throw new Error(`active_source_portability_unknown_argument:${argument}`);
  }
  return { activeSources };
}

async function main() {
  const report = await verifyActiveSourcePortability(
    parseArguments(process.argv.slice(2)),
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== "passed") process.exitCode = 1;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (invokedPath === import.meta.url)
  main().catch((error) => {
    process.stderr.write(
      `${JSON.stringify({
        schema_version: "active-source-portability-error-v1",
        error: error instanceof Error ? error.message : String(error),
      })}\n`,
    );
    process.exitCode = 2;
  });
