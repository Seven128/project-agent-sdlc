import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  compareUtf8Paths,
  normalizeContextPath,
} from "../context-catalog/catalog-paths.js";

const MAX_FILES = 4096;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const MAX_MATCHES = 500;
const SKIPPED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".artifacts",
  "tmp",
]);
const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".toml",
  ".yaml",
  ".yml",
  ".json",
  ".jsonc",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rs",
  ".go",
  ".java",
  ".kt",
  ".sh",
  ".ps1",
  ".bat",
  ".cmd",
  ".xml",
  ".html",
  ".css",
  ".scss",
]);

export interface ContextMoveLiteralMatch {
  path: string;
  line: number;
  column: number;
  matched: string;
  kind: "markdown_non_link" | "code_or_config";
}

export interface ContextMoveLiteralScan {
  complete: boolean;
  files_scanned: number;
  bytes_scanned: number;
  matches: ContextMoveLiteralMatch[];
  limits_exceeded: string[];
}

export async function scanStagedRepositoryForContextPath(input: {
  repository: string;
  context_path: string;
  file_overrides: ReadonlyMap<string, Uint8Array | null>;
}): Promise<ContextMoveLiteralScan> {
  const discovered = await discoverTextFiles(input.repository);
  const paths = new Map<string, string>();
  const limits = new Set<string>(discovered.limits);
  for (const file of discovered.files) {
    const existing = paths.get(file.path);
    if (existing !== undefined && existing !== file.physical_path) {
      limits.add(`path_unicode_collision:${file.path}`);
      continue;
    }
    paths.set(file.path, file.physical_path);
  }
  for (const [file, bytes] of input.file_overrides) {
    const logical = normalizeContextPath(file);
    if (bytes === null) paths.delete(logical);
    else if (isTextCandidate(logical) && !paths.has(logical))
      paths.set(logical, file);
  }
  const ordered = [...paths].sort(([left], [right]) =>
    compareUtf8Paths(left, right),
  );
  if (ordered.length > MAX_FILES) limits.add(`file_count>${MAX_FILES}`);
  const matches: ContextMoveLiteralMatch[] = [];
  let filesScanned = 0;
  let bytesScanned = 0;
  for (const [file, physicalFile] of ordered.slice(0, MAX_FILES)) {
    const override = input.file_overrides.get(file);
    let bytes: Buffer;
    try {
      bytes =
        override === undefined
          ? await readFile(
              path.join(input.repository, ...physicalFile.split("/")),
            )
          : Buffer.from(override ?? []);
    } catch (error) {
      limits.add(`read_failed:${file}:${message(error)}`);
      continue;
    }
    if (bytes.length > MAX_FILE_BYTES) {
      limits.add(`file_bytes>${MAX_FILE_BYTES}:${file}`);
      continue;
    }
    if (bytesScanned + bytes.length > MAX_TOTAL_BYTES) {
      limits.add(`total_bytes>${MAX_TOTAL_BYTES}`);
      break;
    }
    bytesScanned += bytes.length;
    filesScanned += 1;
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      continue;
    }
    for (const literal of literals(input.context_path)) {
      let cursor = 0;
      while ((cursor = content.indexOf(literal, cursor)) >= 0) {
        if (!hasPathBoundaries(content, cursor, literal.length)) {
          cursor += Math.max(1, literal.length);
          continue;
        }
        const location = lineColumn(content, cursor);
        matches.push({
          path: file,
          ...location,
          matched: literal,
          kind: file.toLowerCase().endsWith(".md")
            ? "markdown_non_link"
            : "code_or_config",
        });
        cursor += Math.max(1, literal.length);
        if (matches.length >= MAX_MATCHES) {
          limits.add(`matches>=${MAX_MATCHES}`);
          break;
        }
      }
      if (matches.length >= MAX_MATCHES) break;
    }
    if (matches.length >= MAX_MATCHES) break;
  }
  return {
    complete: limits.size === 0,
    files_scanned: filesScanned,
    bytes_scanned: bytesScanned,
    matches,
    limits_exceeded: [...limits].sort(),
  };
}

async function discoverTextFiles(repository: string): Promise<{
  files: Array<{ path: string; physical_path: string }>;
  limits: string[];
}> {
  const result: Array<{ path: string; physical_path: string }> = [];
  const limits = new Set<string>();
  let stopped = false;
  async function visit(relative: string): Promise<void> {
    if (stopped) return;
    const absolute = relative
      ? path.join(repository, ...relative.split("/"))
      : repository;
    const entries = await readdir(absolute, { withFileTypes: true });
    for (const entry of entries.sort((left, right) =>
      compareUtf8Paths(left.name, right.name),
    )) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (SKIPPED_DIRECTORIES.has(entry.name) || child === ".codex/work")
        continue;
      if (entry.isSymbolicLink()) {
        limits.add(`symlink_skipped:${child}`);
        continue;
      }
      if (entry.isDirectory()) {
        await visit(child);
      } else if (entry.isFile() && isTextCandidate(child)) {
        result.push({
          path: normalizeContextPath(child),
          physical_path: child,
        });
        if (result.length > MAX_FILES) {
          limits.add(`file_count>${MAX_FILES}`);
          stopped = true;
          return;
        }
      }
    }
  }
  await visit("");
  return { files: result, limits: [...limits] };
}

function isTextCandidate(file: string): boolean {
  const lower = file.toLowerCase();
  const extension = path.posix.extname(lower);
  return (
    TEXT_EXTENSIONS.has(extension) ||
    ["makefile", "dockerfile"].includes(path.posix.basename(lower))
  );
}

function literals(contextPath: string): string[] {
  const encoded = contextPath.split("/").map(encodeURIComponent).join("/");
  const windows = contextPath.replaceAll("/", "\\");
  return [
    ...new Set([
      contextPath,
      `/${contextPath}`,
      windows,
      `\\${windows}`,
      encoded,
      `/${encoded}`,
    ]),
  ]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
}

function hasPathBoundaries(
  content: string,
  start: number,
  length: number,
): boolean {
  const before = start === 0 ? "" : content[start - 1];
  const after = content[start + length] ?? "";
  const pathCharacter = /[A-Za-z0-9_.%/\\-]/u;
  return (
    (!before || !pathCharacter.test(before)) &&
    (!after || !pathCharacter.test(after))
  );
}

function lineColumn(
  content: string,
  offset: number,
): { line: number; column: number } {
  const lines = content.slice(0, offset).split(/\r\n?|\n/u);
  return {
    line: lines.length,
    column: Array.from(lines.at(-1) ?? "").length + 1,
  };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
