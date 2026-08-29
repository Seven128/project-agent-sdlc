import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import type { CatalogFile } from "../context-catalog/catalog-types.js";
import {
  compareUtf8Paths,
  isPathWithin,
  normalizeContextPath,
} from "../context-catalog/catalog-paths.js";
import { extractContextMarkdown } from "./context-markdown-extract.js";
import type {
  ContextLongLine,
  ContextMarkdownCatalogAnalysis,
  ContextMarkdownFileAnalysis,
  ContextMarkdownRawReference,
  ContextMarkdownReference,
  ContextStableKeyConflict,
  ContextStableKeyDeclaration,
} from "./context-markdown-types.js";

export async function analyzeContextMarkdownCatalog(input: {
  project_root: string;
  files: CatalogFile[];
  long_line_threshold: number;
  file_overrides?: ReadonlyMap<string, Uint8Array | null>;
}): Promise<ContextMarkdownCatalogAnalysis> {
  const files: ContextMarkdownFileAnalysis[] = [];
  for (const file of [...input.files].sort((left, right) =>
    compareUtf8Paths(left.path, right.path),
  ))
    files.push(
      await analyzeContextMarkdownFile({
        project_root: input.project_root,
        file,
        long_line_threshold: input.long_line_threshold,
        file_overrides: input.file_overrides,
      }),
    );
  const declarations = files.flatMap((file) => file.declarations);
  return {
    files,
    references: files.flatMap((file) => file.references),
    declarations,
    invalid_declarations: files.flatMap((file) => file.invalid_declarations),
    declaration_conflicts: declarationConflicts(declarations),
  };
}

export async function analyzeContextMarkdownFile(input: {
  project_root: string;
  file: CatalogFile;
  long_line_threshold: number;
  file_overrides?: ReadonlyMap<string, Uint8Array | null>;
}): Promise<ContextMarkdownFileAnalysis> {
  const override = input.file_overrides?.get(input.file.path);
  const content =
    override === undefined
      ? await readFile(input.file.absolute_path, "utf8")
      : Buffer.from(override ?? []).toString("utf8");
  const extracted = extractContextMarkdown(content, input.file.path);
  const lengths = lineLengths(content, input.long_line_threshold);
  const references: ContextMarkdownReference[] = [];
  for (const reference of extracted.references) {
    const resolved = await resolveReference(
      input.project_root,
      input.file.path,
      reference,
      input.file_overrides,
    );
    if (resolved) references.push(resolved);
  }
  return {
    path: input.file.path,
    bytes: Buffer.byteLength(content, "utf8"),
    max_line_code_points: lengths.maximum,
    long_lines: lengths.long,
    references,
    declarations: extracted.declarations,
    invalid_declarations: extracted.invalid_declarations,
  };
}

async function resolveReference(
  projectRoot: string,
  sourcePath: string,
  reference: ContextMarkdownRawReference,
  fileOverrides?: ReadonlyMap<string, Uint8Array | null>,
): Promise<ContextMarkdownReference | null> {
  const split = splitDestination(reference.destination);
  if (split.disposition === "ignored") return null;
  if (split.disposition === "invalid")
    return {
      ...reference,
      source_path: sourcePath,
      target_path: null,
      fragment: split.fragment,
      status: "invalid",
      detail: split.detail,
    };
  const normalizedDestination = split.local.replaceAll("\\", "/");
  const absolute = normalizedDestination.startsWith("/")
    ? path.resolve(projectRoot, normalizedDestination.slice(1))
    : normalizedDestination.startsWith("project_context/")
      ? path.resolve(projectRoot, normalizedDestination)
      : path.resolve(
          path.dirname(path.join(projectRoot, sourcePath)),
          normalizedDestination,
        );
  const targetPath = normalizeContextPath(path.relative(projectRoot, absolute));
  if (!isPathWithin(projectRoot, absolute))
    return {
      ...reference,
      source_path: sourcePath,
      target_path: targetPath,
      fragment: split.fragment,
      status: "outside_repository",
      detail: "local Markdown destination resolves outside the repository",
    };
  if (fileOverrides?.has(targetPath)) {
    if (fileOverrides.get(targetPath) === null)
      return {
        ...reference,
        source_path: sourcePath,
        target_path: targetPath,
        fragment: split.fragment,
        status: "missing",
      };
    return {
      ...reference,
      source_path: sourcePath,
      target_path: targetPath,
      fragment: split.fragment,
      status: "valid",
    };
  }
  try {
    await lstat(absolute);
  } catch (error) {
    if (isMissing(error))
      return {
        ...reference,
        source_path: sourcePath,
        target_path: targetPath,
        fragment: split.fragment,
        status: "missing",
      };
    throw error;
  }
  const identity = await realpath(absolute);
  if (!isPathWithin(await realpath(projectRoot), identity))
    return {
      ...reference,
      source_path: sourcePath,
      target_path: targetPath,
      fragment: split.fragment,
      status: "outside_repository",
      detail:
        "local Markdown destination resolves through a link outside the repository",
    };
  return {
    ...reference,
    source_path: sourcePath,
    target_path: targetPath,
    fragment: split.fragment,
    status: "valid",
  };
}

type SplitDestination =
  | { disposition: "local"; local: string; fragment: string | null }
  | { disposition: "ignored"; fragment: string | null }
  | {
      disposition: "invalid";
      fragment: string | null;
      detail: string;
    };

function splitDestination(value: string): SplitDestination {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#"))
    return {
      disposition: "ignored",
      fragment: trimmed.slice(1) || null,
    };
  if (trimmed.startsWith("//") || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(trimmed))
    return { disposition: "ignored", fragment: null };
  const fragmentIndex = trimmed.indexOf("#");
  const queryIndex = trimmed.indexOf("?");
  const boundary = [fragmentIndex, queryIndex]
    .filter((entry) => entry >= 0)
    .reduce((lowest, entry) => Math.min(lowest, entry), trimmed.length);
  const encodedPath = trimmed.slice(0, boundary);
  const fragment = fragmentIndex >= 0 ? trimmed.slice(fragmentIndex + 1) : null;
  try {
    return {
      disposition: "local",
      local: decodeURIComponent(encodedPath),
      fragment,
    };
  } catch {
    return {
      disposition: "invalid",
      fragment,
      detail: "local Markdown destination contains invalid URL encoding",
    };
  }
}

function lineLengths(
  content: string,
  threshold: number,
): { maximum: number; long: ContextLongLine[] } {
  let maximum = 0;
  const long: ContextLongLine[] = [];
  for (const [index, line] of content.split(/\r\n?|\n/u).entries()) {
    const codePoints = Array.from(line).length;
    maximum = Math.max(maximum, codePoints);
    if (codePoints > threshold)
      long.push({ line: index + 1, code_points: codePoints });
  }
  return { maximum, long };
}

function declarationConflicts(
  declarations: ContextStableKeyDeclaration[],
): ContextStableKeyConflict[] {
  const groups = new Map<string, ContextStableKeyDeclaration[]>();
  for (const declaration of declarations) {
    const key = `${declaration.type}\0${declaration.id}`;
    groups.set(key, [...(groups.get(key) ?? []), declaration]);
  }
  const conflicts: ContextStableKeyConflict[] = [];
  for (const declarationsForKey of groups.values()) {
    const owners = new Map<string, number>();
    for (const declaration of declarationsForKey)
      if (!owners.has(declaration.path))
        owners.set(declaration.path, declaration.line);
    if (owners.size < 2) continue;
    conflicts.push({
      type: declarationsForKey[0].type,
      id: declarationsForKey[0].id,
      owners: [...owners.entries()]
        .sort(([left], [right]) => compareUtf8Paths(left, right))
        .map(([ownerPath, line]) => ({ path: ownerPath, line })),
    });
  }
  return conflicts.sort((left, right) =>
    compareUtf8Paths(`${left.type}:${left.id}`, `${right.type}:${right.id}`),
  );
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
