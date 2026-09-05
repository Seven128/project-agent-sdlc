import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import type { Dirent } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import {
  ensureDir,
  listFiles,
  pathExists,
  readText,
  writeTextIfChanged,
} from "./fs.js";
import { harnessRoot } from "./harness-root.js";
import { assertSupportedSchema } from "./schema-guard.js";
import { withMaintenanceLock } from "./maintenance-lock.js";
import { writeMaintenanceText } from "./maintenance-write.js";
import {
  SAFE_EXAMPLE_FILE_NAMES,
  shouldExcludeRelativePath,
  shouldIncludeCodeFile,
  toPosix,
} from "./source-files.js";

export type ExportContextMode = "full" | "code";

export interface ExportContextOptions {
  full?: boolean;
  code?: boolean;
  output?: string;
  check?: boolean;
  now?: Date;
}

export interface ExportContextReport {
  mode: ExportContextMode;
  outputPath: string;
  outputRelativePath: string;
  sourceFiles: string[];
  sourceContextCount: number;
  sourceCodeCount?: number;
  totalLines?: number;
  totalCharacters?: number;
  warnings: string[];
  wrote: boolean;
}

interface RedactionResult {
  content: string;
  count: number;
}

interface CodeFileRecord {
  relative: string;
  language: string;
  lines: number;
  characters: number;
  sha256: string;
  summary: string;
  content: string;
}

const execFileAsync = promisify(execFile);

const EXPORT_HEADER =
  "Export artifact. Do not reference from project_context/context.toml.";
const DEFAULT_EXPORT_DIR = "tmp/ty-context/context-exports";
const CODE_EXPORT_FILE_NAME = "code-level-implementation.md";
const MAX_TREE_ENTRIES = 300;
const MAX_TREE_DEPTH = 4;
const GIT_LS_MAX_BUFFER = 64 * 1024 * 1024;
const APPROX_TEXT_TOKEN_LIMIT_CHARS = 8_000_000;

const SENSITIVE_ASSIGNMENT_PATTERN =
  /^(\s*(?:[-*]\s*)?(?:[`"']?[\w.-]*(?:secret|token|cookie|password|api[_-]?key)[\w.-]*[`"']?\s*[:=]\s*))(.+?)\s*$/i;

export async function runExportContext(
  projectRoot: string,
  options: ExportContextOptions = {},
): Promise<ExportContextReport> {
  if (!options.check)
    await assertSupportedSchema(projectRoot, "export-context");
  const requestedModeCount =
    Number(options.full === true) + Number(options.code === true);
  if (requestedModeCount !== 1) {
    throw new Error("export-context requires exactly one of --full or --code");
  }

  const execute = () =>
    options.code
      ? runCodeImplementationExport(projectRoot, options)
      : runFullContextExport(projectRoot, options);
  if (options.check) return execute();
  return withMaintenanceLock(projectRoot, "export", async () => {
    await assertSupportedSchema(projectRoot, "export-context");
    return execute();
  });
}

async function runFullContextExport(
  projectRoot: string,
  options: ExportContextOptions,
): Promise<ExportContextReport> {
  const outputPath = resolveOutputPath(
    projectRoot,
    options.output,
    options.now,
    "full",
  );
  const outputRelativePath = repoRelative(projectRoot, outputPath);
  const warnings: string[] = [];
  const sourceFiles = await collectSourceFiles(projectRoot, warnings);
  const sourceRelativeFiles = sourceFiles
    .map((file) => repoRelative(projectRoot, file))
    .sort();
  const sourceContextCount = sourceRelativeFiles.filter(
    (file) =>
      file === "project_context/context.toml" ||
      file.startsWith("project_context/"),
  ).length;

  const sourceSections: string[] = [];
  const contextEntrySections: string[] = [];

  for (const file of sourceFiles) {
    const relative = repoRelative(projectRoot, file);
    const rawContent = await readText(file);
    const redacted = redactSensitiveAssignments(rawContent);
    if (redacted.count > 0) {
      warnings.push(
        `${relative}: redacted ${redacted.count} sensitive assignment line(s)`,
      );
    }
    if (relative.startsWith("project_context/") && relative.endsWith(".md")) {
      const codeEntries = extractSection(redacted.content, "Code Entry Points");
      if (codeEntries) {
        contextEntrySections.push(`### ${relative}\n\n${codeEntries}`);
      }
    }
    sourceSections.push(renderSourceSection(relative, redacted.content));
  }

  const makefileSummary = await buildMakefileVerificationSummary(projectRoot);
  const directoryTree = await buildDirectoryTree(projectRoot, warnings);
  const generatedAt = (options.now ?? new Date()).toISOString();
  const content = [
    "# Full Project Context Export",
    "",
    `> ${EXPORT_HEADER}`,
    "",
    "## Export Metadata",
    "",
    `- generated_at: ${generatedAt}`,
    `- workspace_root: ${projectRoot}`,
    `- output_path: ${outputRelativePath}`,
    `- source_context_count: ${sourceContextCount}`,
    "- source_file_list:",
    ...sourceRelativeFiles.map((file) => `  - ${file}`),
    "- warnings:",
    ...(warnings.length > 0
      ? warnings.map((warning) => `  - ${warning}`)
      : ["  - none"]),
    "",
    "## Directory Tree Summary",
    "",
    directoryTree,
    "",
    "## Makefile Verification Entry Summary",
    "",
    makefileSummary,
    "",
    "## Context Code Entry Point Index",
    "",
    contextEntrySections.length > 0
      ? contextEntrySections.join("\n\n")
      : "- No Code Entry Points sections found in exported Context Markdown.",
    "",
    "## Source Files",
    "",
    sourceSections.join("\n\n"),
    "",
  ].join("\n");

  if (!options.check) {
    await writeMaintenanceText(projectRoot, outputRelativePath, content);
  }

  return {
    mode: "full",
    outputPath,
    outputRelativePath,
    sourceFiles: sourceRelativeFiles,
    sourceContextCount,
    warnings,
    wrote: !options.check,
  };
}

async function runCodeImplementationExport(
  projectRoot: string,
  options: ExportContextOptions,
): Promise<ExportContextReport> {
  const outputPath = resolveOutputPath(
    projectRoot,
    options.output,
    options.now,
    "code",
  );
  const outputRelativePath = repoRelative(projectRoot, outputPath);
  const warnings: string[] = [];
  const sourceFiles = await collectCodeSourceFiles(projectRoot);
  const records: CodeFileRecord[] = [];

  for (const file of sourceFiles) {
    const relative = repoRelative(projectRoot, file);
    const rawContent = await readText(file);
    const redacted = redactSensitiveAssignments(rawContent);
    if (redacted.count > 0) {
      warnings.push(
        `${relative}: redacted ${redacted.count} sensitive assignment line(s)`,
      );
    }
    const content = redacted.content;
    const language = languageFor(relative) || "text";
    records.push({
      relative,
      language,
      lines: countLines(content),
      characters: content.length,
      sha256: sha256(content),
      summary: summarizeCodeFile(relative, content, language),
      content,
    });
  }

  records.sort((left, right) => left.relative.localeCompare(right.relative));
  const sourceRelativeFiles = records.map((record) => record.relative);
  const totalLines = records.reduce((sum, record) => sum + record.lines, 0);
  const totalCharacters = records.reduce(
    (sum, record) => sum + record.characters,
    0,
  );
  if (totalCharacters > APPROX_TEXT_TOKEN_LIMIT_CHARS) {
    warnings.push(
      `export is ${totalCharacters} characters; it may approach or exceed ChatGPT text/document ingestion limits and should be reviewed before upload`,
    );
  }

  const generatedAt = (options.now ?? new Date()).toISOString();
  const content = [
    "# Code-Level Implementation Export",
    "",
    `> ${EXPORT_HEADER}`,
    "",
    "## Export Metadata",
    "",
    `- generated_at: ${generatedAt}`,
    `- workspace_root: ${projectRoot}`,
    `- output_path: ${outputRelativePath}`,
    `- source_file_count: ${records.length}`,
    `- total_lines: ${totalLines}`,
    `- total_characters: ${totalCharacters}`,
    "- warnings:",
    ...(warnings.length > 0
      ? warnings.map((warning) => `  - ${warning}`)
      : ["  - none"]),
    "",
    "## Implementation Guide",
    "",
    buildImplementationGuide(records),
    "",
    "## Source File Index",
    "",
    renderCodeFileIndex(records),
    "",
    "## Source Files",
    "",
    records.map(renderCodeFileSection).join("\n\n"),
    "",
  ].join("\n");

  if (!options.check) {
    await writeMaintenanceText(projectRoot, outputRelativePath, content);
  }

  return {
    mode: "code",
    outputPath,
    outputRelativePath,
    sourceFiles: sourceRelativeFiles,
    sourceContextCount: 0,
    sourceCodeCount: records.length,
    totalLines,
    totalCharacters,
    warnings,
    wrote: !options.check,
  };
}

function resolveOutputPath(
  projectRoot: string,
  requestedOutput: string | undefined,
  now: Date | undefined,
  mode: ExportContextMode,
): string {
  const timestamp = timestampForFile(now ?? new Date());
  const defaultOutput =
    mode === "code"
      ? path.join(
          DEFAULT_EXPORT_DIR,
          `code-level-implementation-${timestamp}`,
          CODE_EXPORT_FILE_NAME,
        )
      : path.join(DEFAULT_EXPORT_DIR, `full-project-context-${timestamp}.md`);
  const rawOutput = requestedOutput?.trim() || defaultOutput;
  const absoluteOutput = path.resolve(projectRoot, rawOutput);
  const relative = repoRelative(projectRoot, absoluteOutput);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      "export-context --output must stay inside the workspace; use tmp/ty-context/context-exports/<name>.md",
    );
  }
  const normalized = toPosix(relative);
  if (
    normalized === "project_context" ||
    normalized.startsWith("project_context/")
  ) {
    throw new Error(
      "export-context output is a temporary artifact; use tmp/ty-context/context-exports/** instead of project_context/**",
    );
  }
  if (!normalized.startsWith(`${DEFAULT_EXPORT_DIR}/`)) {
    throw new Error(
      "export-context only writes temporary artifacts under tmp/ty-context/context-exports/**",
    );
  }
  if (!normalized.endsWith(".md")) {
    throw new Error(
      "export-context --output must be a Markdown file under tmp/ty-context/context-exports/**",
    );
  }
  return absoluteOutput;
}

async function collectSourceFiles(
  projectRoot: string,
  warnings: string[],
): Promise<string[]> {
  const files = new Set<string>();
  await addIfExists(projectRoot, files, warnings, "AGENTS.md", true);
  await addIfExists(projectRoot, files, warnings, "README.md", false);
  await addIfExists(projectRoot, files, warnings, "DESIGN.md", false);
  await addIfExists(
    projectRoot,
    files,
    warnings,
    "project_context/global.md",
    true,
  );
  await addIfExists(
    projectRoot,
    files,
    warnings,
    "project_context/architecture.md",
    true,
  );
  await addIfExists(
    projectRoot,
    files,
    warnings,
    "project_context/context.toml",
    true,
  );

  const contextRoot = path.join(projectRoot, "project_context");
  for (const file of await listFiles(contextRoot)) {
    const relative = repoRelative(projectRoot, file);
    if (
      (relative.endsWith(".md") || relative.endsWith(".toml")) &&
      !shouldExcludeRelativePath(relative)
    ) {
      files.add(file);
    }
  }

  const root = await harnessRoot(projectRoot);
  const skillRoot = path.join(projectRoot, root, "skills");
  for (const file of await listFiles(skillRoot)) {
    const relative = repoRelative(projectRoot, file);
    if (
      relative.endsWith("/SKILL.md") &&
      !shouldExcludeRelativePath(relative)
    ) {
      files.add(file);
    }
  }

  for (const file of await listCandidateFiles(projectRoot)) {
    const relative = repoRelative(projectRoot, file);
    const base = path.basename(file);
    if (
      ["README.md", "AGENTS.md", "DESIGN.md"].includes(base) &&
      !shouldExcludeRelativePath(relative)
    ) {
      files.add(file);
    }
  }

  return [...files].sort((left, right) =>
    repoRelative(projectRoot, left).localeCompare(
      repoRelative(projectRoot, right),
    ),
  );
}

async function collectCodeSourceFiles(projectRoot: string): Promise<string[]> {
  const gitCandidates = await listGitCandidateFiles(projectRoot);
  const candidates = gitCandidates ?? (await listCandidateFiles(projectRoot));
  const files = new Set<string>();

  for (const file of candidates) {
    const relative = repoRelative(projectRoot, file);
    if (shouldIncludeCodeFile(relative) && (await isRegularFile(file))) {
      files.add(file);
    }
  }

  return [...files].sort((left, right) =>
    repoRelative(projectRoot, left).localeCompare(
      repoRelative(projectRoot, right),
    ),
  );
}

async function listGitCandidateFiles(
  projectRoot: string,
): Promise<string[] | undefined> {
  try {
    const result = await execFileAsync(
      "git",
      [
        "-C",
        projectRoot,
        "ls-files",
        "--cached",
        "--others",
        "--exclude-standard",
        "-z",
      ],
      {
        encoding: "utf8",
        maxBuffer: GIT_LS_MAX_BUFFER,
      },
    );
    const stdout: string = result.stdout;
    return stdout
      .split("\0")
      .filter(Boolean)
      .map((relative: string) =>
        path.join(projectRoot, ...toPosix(relative).split("/")),
      );
  } catch {
    return undefined;
  }
}

async function isRegularFile(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isFile();
  } catch {
    return false;
  }
}

async function addIfExists(
  projectRoot: string,
  files: Set<string>,
  warnings: string[],
  relative: string,
  required: boolean,
): Promise<void> {
  const target = path.join(projectRoot, ...relative.split("/"));
  if (await pathExists(target)) {
    files.add(target);
  } else if (required) {
    warnings.push(`${relative}: missing expected source file`);
  }
}

async function listCandidateFiles(projectRoot: string): Promise<string[]> {
  const files: string[] = [];
  await walkCandidates(projectRoot, projectRoot, files);
  return files;
}

async function walkCandidates(
  projectRoot: string,
  current: string,
  files: string[],
): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(current, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const fullPath = path.join(current, entry.name);
    const relative = repoRelative(projectRoot, fullPath);
    if (entry.isDirectory()) {
      if (!shouldExcludeRelativePath(relative)) {
        await walkCandidates(projectRoot, fullPath, files);
      }
      continue;
    }
    if (entry.isFile() && !shouldExcludeRelativePath(relative)) {
      files.push(fullPath);
    }
  }
}

async function buildDirectoryTree(
  projectRoot: string,
  warnings: string[],
): Promise<string> {
  const lines: string[] = ["."];
  let count = 0;
  let truncated = false;

  async function walk(
    current: string,
    prefix: string,
    depth: number,
  ): Promise<void> {
    if (depth >= MAX_TREE_DEPTH || truncated) {
      return;
    }
    let entries: Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    const visibleEntries = entries
      .filter(
        (entry) =>
          !shouldExcludeRelativePath(
            repoRelative(projectRoot, path.join(current, entry.name)),
          ),
      )
      .sort(
        (left, right) =>
          Number(right.isDirectory()) - Number(left.isDirectory()) ||
          left.name.localeCompare(right.name),
      );
    for (const entry of visibleEntries) {
      if (count >= MAX_TREE_ENTRIES) {
        truncated = true;
        warnings.push(
          `directory tree truncated at ${MAX_TREE_ENTRIES} entries`,
        );
        return;
      }
      count += 1;
      const fullPath = path.join(current, entry.name);
      const marker = entry.isDirectory() ? "/" : "";
      lines.push(`${prefix}- ${entry.name}${marker}`);
      if (entry.isDirectory()) {
        await walk(fullPath, `${prefix}  `, depth + 1);
      }
    }
  }

  await walk(projectRoot, "", 0);
  return lines.join("\n");
}

async function buildMakefileVerificationSummary(
  projectRoot: string,
): Promise<string> {
  const makefilePath = path.join(projectRoot, "Makefile");
  if (!(await pathExists(makefilePath))) {
    return "- No root Makefile found.";
  }
  const lines = (await readText(makefilePath)).split(/\r?\n/);
  const summary: string[] = [];
  let includeTarget = false;
  for (const line of lines) {
    const target = /^([A-Za-z0-9_.-]+):/.exec(line);
    if (target) {
      includeTarget = /validate|test|lint|build|smoke|doctor|check/i.test(
        target[1],
      );
      if (includeTarget) {
        summary.push(`- ${line.trim()}`);
      }
      continue;
    }
    if (includeTarget && /^\t/.test(line)) {
      summary.push(`  ${line.trim()}`);
    }
  }
  return summary.length > 0
    ? summary.join("\n")
    : "- No obvious verification targets found in root Makefile.";
}

function redactSensitiveAssignments(content: string): RedactionResult {
  let count = 0;
  const lines = content.split(/\r?\n/).map((line) => {
    const match = SENSITIVE_ASSIGNMENT_PATTERN.exec(line);
    if (!match) {
      return line;
    }
    count += 1;
    return `${match[1]}[REDACTED]`;
  });
  return { content: lines.join("\n"), count };
}

function renderSourceSection(relative: string, content: string): string {
  const fence = fenceFor(content);
  const language = languageFor(relative);
  return [
    `### ${relative}`,
    "",
    `${fence}${language}`,
    content.trimEnd(),
    fence,
  ].join("\n");
}

function renderCodeFileSection(record: CodeFileRecord): string {
  const fence = fenceFor(record.content);
  return [
    `## ${record.relative}`,
    "",
    `Summary: ${record.summary}`,
    "",
    "Metadata:",
    `- language: ${record.language}`,
    `- lines: ${record.lines}`,
    `- characters: ${record.characters}`,
    `- sha256: ${record.sha256}`,
    "",
    `${fence}${record.language}`,
    record.content.trimEnd(),
    fence,
  ].join("\n");
}

function renderCodeFileIndex(records: CodeFileRecord[]): string {
  if (records.length === 0) {
    return "- No source files matched the code export include rules.";
  }
  return [
    "| Path | Type | Lines | Characters | SHA256 | Summary |",
    "|---|---:|---:|---:|---|---|",
    ...records.map(
      (record) =>
        `| ${escapeTableCell(record.relative)} | ${escapeTableCell(record.language)} | ${record.lines} | ${record.characters} | ${record.sha256.slice(
          0,
          12,
        )} | ${escapeTableCell(record.summary)} |`,
    ),
  ].join("\n");
}

function buildImplementationGuide(records: CodeFileRecord[]): string {
  if (records.length === 0) {
    return "- This export did not find matching source or engineering configuration files.";
  }
  const moduleCounts = new Map<string, number>();
  for (const record of records) {
    const key = moduleKey(record.relative);
    moduleCounts.set(key, (moduleCounts.get(key) ?? 0) + 1);
  }
  const modules = [...moduleCounts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .slice(0, 10)
    .map(([key, count]) => `${key} (${count})`)
    .join(", ");
  const entrypoints = records
    .filter((record) => isLikelyEntrypoint(record.relative))
    .slice(0, 12)
    .map((record) => record.relative);
  return [
    `- This export includes ${records.length} current source or engineering configuration files after Git ignore and Harness safety exclusions.`,
    `- Main modules: ${modules || "no obvious modules identified"}.`,
    `- Key entry points: ${entrypoints.length > 0 ? entrypoints.join(", ") : "no obvious entry points identified"}.`,
    "- Each file block keeps the relative path, heuristic summary, line count, character count, SHA256 and redacted source body.",
    "- This file is a temporary implementation snapshot, not durable Context; durable project facts still belong in project_context/**.",
  ].join("\n");
}

function summarizeCodeFile(
  relative: string,
  content: string,
  language: string,
): string {
  const lower = relative.toLowerCase();
  const base = path.posix.basename(relative);
  const symbols = extractSymbolSummary(content, language);
  if (base === "package.json") {
    const packageName = extractJsonString(content, "name");
    return packageName
      ? `Defines npm package ${packageName} metadata, scripts and dependency declarations.`
      : "Defines npm package metadata, scripts and dependency declarations.";
  }
  if (base.toLowerCase() === "makefile") {
    return summarizeMakefile(content);
  }
  if (
    base.toLowerCase().startsWith("dockerfile") ||
    lower.endsWith(".dockerfile")
  ) {
    const image = /^FROM\s+(.+)$/im.exec(content)?.[1]?.trim();
    return image
      ? `Defines a Docker image build starting from ${image}.`
      : "Defines a Docker image build.";
  }
  if (
    lower.endsWith("docker-compose.yml") ||
    lower.endsWith("docker-compose.yaml") ||
    base.toLowerCase().startsWith("compose.")
  ) {
    const services = extractYamlTopLevelMapKeys(content, "services").slice(
      0,
      6,
    );
    return services.length > 0
      ? `Defines Docker Compose services ${services.join(", ")}.`
      : "Defines Docker Compose services and local runtime wiring.";
  }
  if (
    language === "yaml" ||
    language === "toml" ||
    language === "json" ||
    language === "jsonc"
  ) {
    return symbols.length > 0
      ? `Defines project configuration around ${symbols.slice(0, 6).join(", ")}.`
      : "Defines project configuration used by the implementation or tooling.";
  }
  if (symbols.length > 0) {
    return `${describeFilePurpose(relative, language)}; exposes ${symbols.slice(0, 8).join(", ")}.`;
  }
  return `${describeFilePurpose(relative, language)}.`;
}

function extractSymbolSummary(content: string, language: string): string[] {
  const symbols = new Set<string>();
  const patterns =
    language === "python"
      ? [
          /^(?:async\s+)?def\s+([A-Za-z_][\w]*)/gm,
          /^class\s+([A-Za-z_][\w]*)/gm,
        ]
      : language === "go"
        ? [
            /^func\s+(?:\([^)]+\)\s*)?([A-Za-z_][\w]*)/gm,
            /^type\s+([A-Za-z_][\w]*)/gm,
          ]
        : language === "sql"
          ? [
              /\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|VIEW|FUNCTION|PROCEDURE|INDEX|TRIGGER)\s+([A-Za-z0-9_."]+)/gim,
            ]
          : language === "yaml" ||
              language === "toml" ||
              language === "json" ||
              language === "jsonc"
            ? [/^["']?([A-Za-z0-9_.-]+)["']?\s*[:=]/gm]
            : [
                /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
                /(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/g,
                /(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/g,
                /(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/g,
                /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)/g,
              ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) && symbols.size < 12) {
      symbols.add(match[1]);
    }
  }

  const routes = extractRouteSummary(content);
  for (const route of routes) {
    if (symbols.size >= 12) {
      break;
    }
    symbols.add(route);
  }

  return [...symbols];
}

function extractRouteSummary(content: string): string[] {
  const routes = new Set<string>();
  const routePatterns = [
    /\.(get|post|put|patch|delete|head|options)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
    /\bHandleFunc\s*\(\s*["'`]([^"'`]+)["'`]/g,
    /\bHandle\s*\(\s*["'`]([^"'`]+)["'`]/g,
  ];
  for (const pattern of routePatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) && routes.size < 8) {
      if (match.length === 3) {
        routes.add(`${match[1].toUpperCase()} ${match[2]}`);
      } else {
        routes.add(`route ${match[1]}`);
      }
    }
  }
  return [...routes];
}

function summarizeMakefile(content: string): string {
  const targets = [...content.matchAll(/^([A-Za-z0-9_.-]+):/gm)]
    .map((match) => match[1])
    .slice(0, 8);
  return targets.length > 0
    ? `Defines Make targets ${targets.join(", ")} for local build, validation or automation.`
    : "Defines Make targets for local build, validation or automation.";
}

function extractYamlTopLevelMapKeys(content: string, parent: string): string[] {
  const lines = content.split(/\r?\n/);
  const keys: string[] = [];
  let inParent = false;
  for (const line of lines) {
    if (!inParent) {
      inParent = new RegExp(`^${parent}:\\s*$`).test(line);
      continue;
    }
    if (/^\S/.test(line)) {
      break;
    }
    const match = /^\s{2}([A-Za-z0-9_.-]+):\s*$/.exec(line);
    if (match) {
      keys.push(match[1]);
    }
  }
  return keys;
}

function extractJsonString(content: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`"${escaped}"\\s*:\\s*"([^"]+)"`).exec(content)?.[1];
}

function describeFilePurpose(relative: string, language: string): string {
  const lower = relative.toLowerCase();
  if (
    lower.includes("/test") ||
    lower.includes(".test.") ||
    lower.includes(".spec.")
  ) {
    return `Contains ${language} tests for ${path.posix.basename(relative)}`;
  }
  if (
    lower.includes("/cli") ||
    lower.endsWith("/cli.ts") ||
    lower.endsWith("/cli.js")
  ) {
    return `Implements ${language} CLI behavior for ${path.posix.basename(relative)}`;
  }
  if (lower.includes("/commands/")) {
    return `Implements ${language} command handling for ${path.posix.basename(relative)}`;
  }
  if (lower.includes("/lib/") || lower.includes("/internal/")) {
    return `Implements ${language} library behavior for ${path.posix.basename(relative)}`;
  }
  if (
    lower.includes("/components/") ||
    lower.includes("/pages/") ||
    lower.includes("/app/")
  ) {
    return `Implements ${language} UI or application behavior for ${path.posix.basename(relative)}`;
  }
  return `Contains ${language} implementation for ${path.posix.basename(relative)}`;
}

function isLikelyEntrypoint(relative: string): boolean {
  const lower = relative.toLowerCase();
  const base = path.posix.basename(lower);
  return (
    base === "package.json" ||
    base === "makefile" ||
    base === "dockerfile" ||
    base === "main.go" ||
    base === "app.py" ||
    base === "server.py" ||
    base === "index.ts" ||
    base === "index.js" ||
    base === "cli.ts" ||
    base === "cli.js" ||
    lower.endsWith("/src/main.ts") ||
    lower.endsWith("/src/main.js") ||
    lower.endsWith("/src/app.ts") ||
    lower.endsWith("/src/app.js")
  );
}

function moduleKey(relative: string): string {
  const parts = relative.split("/");
  if (parts[0] === "packages" && parts.length >= 2) {
    return `packages/${parts[1]}`;
  }
  if (parts[0] === "domains" && parts.length >= 2) {
    return `domains/${parts[1]}`;
  }
  if (parts[0] === "apps" && parts.length >= 2) {
    return `apps/${parts[1]}`;
  }
  if (parts[0] === "services" && parts.length >= 2) {
    return `services/${parts[1]}`;
  }
  if (parts.length > 1) {
    return parts[0];
  }
  return ".";
}

function countLines(content: string): number {
  return content.length === 0 ? 0 : content.split(/\r\n|\r|\n/).length;
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function fenceFor(content: string): string {
  let fence = "```";
  while (content.includes(fence)) {
    fence += "`";
  }
  return fence;
}

function languageFor(relative: string): string {
  const lower = relative.toLowerCase();
  const base = path.posix.basename(lower);
  if (base === "makefile") {
    return "make";
  }
  if (
    base === "dockerfile" ||
    base.startsWith("dockerfile.") ||
    lower.endsWith(".dockerfile")
  ) {
    return "dockerfile";
  }
  if (SAFE_EXAMPLE_FILE_NAMES.has(base)) {
    return "dotenv";
  }
  if (lower.endsWith(".toml")) {
    return "toml";
  }
  if (lower.endsWith(".md")) {
    return "markdown";
  }
  if (lower.endsWith(".tsx")) {
    return "tsx";
  }
  if (lower.endsWith(".ts")) {
    return "typescript";
  }
  if (lower.endsWith(".jsx")) {
    return "jsx";
  }
  if (
    lower.endsWith(".js") ||
    lower.endsWith(".mjs") ||
    lower.endsWith(".cjs")
  ) {
    return "javascript";
  }
  if (lower.endsWith(".py")) {
    return "python";
  }
  if (lower.endsWith(".go")) {
    return "go";
  }
  if (lower.endsWith(".vue")) {
    return "vue";
  }
  if (lower.endsWith(".sql")) {
    return "sql";
  }
  if (lower.endsWith(".json")) {
    return "json";
  }
  if (lower.endsWith(".jsonc")) {
    return "jsonc";
  }
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) {
    return "yaml";
  }
  if (lower.endsWith(".sh")) {
    return "bash";
  }
  if (lower.endsWith(".ps1")) {
    return "powershell";
  }
  if (lower.endsWith(".bat") || lower.endsWith(".cmd")) {
    return "batch";
  }
  if (lower.endsWith(".graphql") || lower.endsWith(".gql")) {
    return "graphql";
  }
  if (lower.endsWith(".proto")) {
    return "protobuf";
  }
  return "";
}

function extractSection(content: string, heading: string): string | undefined {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^##\\s+${escaped}\\s*$`, "im").exec(content);
  if (!match) {
    return undefined;
  }
  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const next = /^##\s+/m.exec(rest);
  const body = (next ? rest.slice(0, next.index) : rest).trim();
  return body || undefined;
}

function timestampForFile(now: Date): string {
  return now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function repoRelative(root: string, file: string): string {
  return toPosix(path.relative(root, file));
}

function escapeTableCell(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}
