import path from "node:path";
import { assertSupportedSchema } from "./schema-guard.js";
import {
  artifactReport,
  buildManifest,
  pruneTimestampedExports,
  readPackageVersion,
  writeArtifactSet,
} from "./source-pack-manifest.js";
import type { PendingArtifact } from "./source-pack-manifest.js";
import {
  mergePatterns,
  parseContextAreas,
  readSourcePackProfile,
  validatePatternList,
} from "./source-pack-config.js";
import {
  collectCodeRecords,
  collectContextArtifacts,
  countRedactionWarnings,
  repoRelative,
} from "./source-pack-records.js";
import {
  renderBundleArtifact,
  renderCodeIndexArtifact,
  renderFullProjectContextArtifact,
  renderTaskContextArtifact,
} from "./source-pack-render.js";
import type {
  SourcePackOmitted,
  SourcePackOptions,
  SourcePackRecord,
  SourcePackReport,
} from "./source-pack-types.js";

const DEFAULT_EXPORT_DIR = "tmp/ty-context/context-exports";
const DEFAULT_MAX_PACK_FILES = 5;
const DEFAULT_MAX_BUNDLE_CHARACTERS = 800_000;
type BundleStrategy = "auto" | "area" | "topdir" | "config";

export async function runSourcePackExport(
  projectRoot: string,
  options: SourcePackOptions,
): Promise<SourcePackReport> {
  if (!options.check)
    await assertSupportedSchema(projectRoot, "export-context");
  const maxPackFiles = options.maxPackFiles ?? DEFAULT_MAX_PACK_FILES;
  validateMaxPackFiles(options.mode, maxPackFiles);
  const now = options.now ?? new Date();
  const outputDir = path.join(
    projectRoot,
    ...DEFAULT_EXPORT_DIR.split("/"),
    "latest",
  );
  const generatedAt = now.toISOString();
  const warnings: string[] = [];
  const areas = await parseContextAreas(projectRoot);
  const profile = await readSourcePackProfile(projectRoot, options.profile);
  const includeCode = mergePatterns(
    profile.code,
    validatePatternList(options.includeCode ?? [], "include code path"),
  );
  const includeContext = mergePatterns(
    profile.context,
    validatePatternList(options.includeContext ?? [], "include context path"),
  );
  const exclude = mergePatterns(profile.exclude);
  const maxBundleCharacters =
    options.maxBundleCharacters ??
    profile.maxBundleCharacters ??
    DEFAULT_MAX_BUNDLE_CHARACTERS;
  const bundleStrategy = options.bundleStrategy ?? "auto";
  const records = await collectCodeRecords(projectRoot, warnings, {
    include: includeCode.length > 0 ? includeCode : undefined,
    exclude,
    areas,
  });
  const contexts = await collectContextArtifacts(
    projectRoot,
    warnings,
    options.mode === "task-context" && includeContext.length > 0
      ? includeContext
      : undefined,
  );
  const taskName = options.taskName ?? "";
  const command = options.command ?? commandFor(options);
  const toolVersion = await readPackageVersion();
  const recommendedUploadSets = uploadSets(options.mode, taskName);
  const artifacts: PendingArtifact[] = [];

  if (
    options.mode === "code-index" ||
    options.mode === "source-pack" ||
    options.mode === "code-bundles" ||
    options.mode === "task-context"
  ) {
    assignBundles(records, maxBundleCharacters, bundleStrategy);
    artifacts.push(
      markdownArtifact(
        "code-index",
        "code-index.md",
        renderCodeIndexArtifact(
          records,
          areas,
          warnings,
          meta(generatedAt, "code-index.md", command, toolVersion),
        ),
        records.length,
        sumLines(records),
        warnings.length,
      ),
    );
  }
  if (options.mode === "source-pack" || options.mode === "task-context") {
    artifacts.splice(
      0,
      0,
      markdownArtifact(
        "full-project-context",
        "full-project-context.md",
        renderFullProjectContextArtifact(
          contexts,
          warnings,
          meta(generatedAt, "full-project-context.md", command, toolVersion),
        ),
        contexts.length,
        sumContextLines(contexts),
        warnings.length,
      ),
    );
  }
  if (options.mode === "source-pack" || options.mode === "code-bundles") {
    addDefaultBundles(
      artifacts,
      records,
      contexts,
      maxPackFiles,
      warnings,
      generatedAt,
      command,
      toolVersion,
    );
  }
  if (options.mode === "task-context") {
    addTaskArtifacts(
      artifacts,
      records,
      contexts,
      profile.verification,
      maxPackFiles,
      warnings,
      generatedAt,
      command,
      toolVersion,
      taskName,
      maxBundleCharacters,
      bundleStrategy,
    );
  }

  const omitted = omittedSummary(records);
  const nonManifestArtifacts = artifacts.slice();
  const manifestPath = `${DEFAULT_EXPORT_DIR}/latest/source-pack-manifest.json`;
  const manifest = await buildManifest({
    projectRoot,
    generatedAt,
    command,
    maxPackFiles,
    artifacts: nonManifestArtifacts.map((artifact) => ({
      ...artifact,
      relativePath: `${DEFAULT_EXPORT_DIR}/latest/${artifact.name}`,
    })),
    warnings,
    omitted,
    recommendedUploadSets,
  });
  artifacts.unshift({
    kind: "manifest",
    name: "source-pack-manifest.json",
    relativePath: manifestPath,
    content: manifest,
    sourceCount: 0,
    sourceLineCount: 0,
    warningCount: warnings.length,
  });
  for (const artifact of artifacts) {
    if (!artifact.relativePath) {
      artifact.relativePath = `${DEFAULT_EXPORT_DIR}/latest/${artifact.name}`;
    }
  }
  if (artifacts.length > maxPackFiles) {
    throw new Error(
      `Source Pack mode ${options.mode} planned ${artifacts.length} files; max is ${maxPackFiles}`,
    );
  }
  const redactionCount = countRedactionWarnings(warnings);
  if (options.redactionStrict && redactionCount > 0) {
    throw new Error(
      `export-context --redaction-strict found ${redactionCount} redaction warning(s)`,
    );
  }
  if (!options.check) {
    await writeArtifactSet(projectRoot, outputDir, artifacts);
    await pruneTimestampedExports(projectRoot, options.prune ?? 0);
  }
  return {
    mode: options.mode,
    outputDirectory: outputDir,
    outputRelativePath: repoRelative(projectRoot, outputDir),
    artifacts: artifacts.map(artifactReport),
    sourceFiles: records.map((record) => record.relative),
    sourceCodeCount: records.length,
    totalLines: sumLines(records),
    totalCharacters: records.reduce(
      (sum, record) => sum + record.characters,
      0,
    ),
    redactionCount,
    warnings,
    omitted,
    recommendedUploadSets,
    wrote: !options.check,
  };
}

function addDefaultBundles(
  artifacts: PendingArtifact[],
  records: SourcePackRecord[],
  contexts: {
    relative: string;
    lines: number;
    content: string;
    characters: number;
  }[],
  maxPackFiles: number,
  warnings: string[],
  generatedAt: string,
  command: string,
  toolVersion: string,
): void {
  const omitted = omittedSummary(records);
  const slots = maxPackFiles - artifacts.length - 1;
  const core = records.filter((record) => record.bundle === "core");
  const extended = records.filter((record) => record.bundle === "extended");
  if (slots >= 1 && core.length > 0) {
    artifacts.push(
      markdownArtifact(
        "code-bundle-core",
        "code-bundle-core.md",
        renderBundleArtifact(
          "Code Bundle Core",
          core,
          contexts,
          omitted,
          warnings,
          meta(generatedAt, "code-bundle-core.md", command, toolVersion),
          "Deterministic score-first selection of entry/API/CLI/contract/UI/test files; routing buckets are export routing only.",
        ),
        core.length,
        sumLines(core),
        warnings.length,
      ),
    );
  }
  if (slots >= 2 && extended.length > 0) {
    artifacts.push(
      markdownArtifact(
        "code-bundle-extended",
        "code-bundle-extended.md",
        renderBundleArtifact(
          "Code Bundle Extended",
          extended,
          contexts,
          omitted,
          warnings,
          meta(generatedAt, "code-bundle-extended.md", command, toolVersion),
          "Next highest deterministic scores after core bundle until the bundle character budget is reached.",
        ),
        extended.length,
        sumLines(extended),
        warnings.length,
      ),
    );
  }
}

function addTaskArtifacts(
  artifacts: PendingArtifact[],
  records: SourcePackRecord[],
  contexts: {
    relative: string;
    lines: number;
    content: string;
    characters: number;
  }[],
  verification: string[],
  maxPackFiles: number,
  warnings: string[],
  generatedAt: string,
  command: string,
  toolVersion: string,
  taskName: string,
  maxBundleCharacters: number,
  bundleStrategy: BundleStrategy,
): void {
  const slug = taskSlug(taskName);
  const sorted = sortedRecords(records, bundleStrategy);
  assignTaskBundles(sorted, maxBundleCharacters);
  const taskRecords = sorted.filter((record) => record.bundle === "task");
  const supportRecords = sorted.filter(
    (record) => record.bundle === "task-support",
  );
  const omitted = omittedSummary(sorted);
  artifacts.push(
    markdownArtifact(
      "task-context",
      `task-contexts/task-context-${slug}.md`,
      renderTaskContextArtifact(
        taskName,
        contexts,
        taskRecords,
        verification,
        omitted,
        warnings,
        meta(
          generatedAt,
          `task-contexts/task-context-${slug}.md`,
          command,
          toolVersion,
        ),
      ),
      contexts.length + taskRecords.length,
      sumContextLines(contexts) + sumLines(taskRecords),
      warnings.length,
    ),
  );
  const slots = maxPackFiles - artifacts.length - 1;
  if (slots >= 1 && supportRecords.length > 0) {
    artifacts.push(
      markdownArtifact(
        "code-bundle-task-support",
        "code-bundle-task-support.md",
        renderBundleArtifact(
          "Code Bundle Task Support",
          supportRecords,
          contexts,
          omitted,
          warnings,
          meta(
            generatedAt,
            "code-bundle-task-support.md",
            command,
            toolVersion,
          ),
          "Deterministic support files selected after the main task-context body.",
        ),
        supportRecords.length,
        sumLines(supportRecords),
        warnings.length,
      ),
    );
  }
}

function assignBundles(
  records: SourcePackRecord[],
  maxCharacters: number,
  bundleStrategy: BundleStrategy,
): void {
  let coreCharacters = 0;
  let extendedCharacters = 0;
  for (const record of sortedRecords(records, bundleStrategy)) {
    if (coreCharacters + record.characters <= maxCharacters) {
      record.bundle = "core";
      coreCharacters += record.characters;
    } else if (extendedCharacters + record.characters <= maxCharacters) {
      record.bundle = "extended";
      extendedCharacters += record.characters;
    } else {
      record.bundle = "omitted";
    }
  }
}

function assignTaskBundles(
  records: SourcePackRecord[],
  maxCharacters: number,
): void {
  let taskCharacters = 0;
  let supportCharacters = 0;
  for (const record of records) {
    if (taskCharacters + record.characters <= maxCharacters) {
      record.bundle = "task";
      taskCharacters += record.characters;
    } else if (supportCharacters + record.characters <= maxCharacters) {
      record.bundle = "task-support";
      supportCharacters += record.characters;
    } else {
      record.bundle = "omitted";
    }
  }
}

function sortedRecords(
  records: SourcePackRecord[],
  bundleStrategy: BundleStrategy,
): SourcePackRecord[] {
  return [...records].sort((left, right) => {
    if (bundleStrategy === "area" || bundleStrategy === "config") {
      return (
        left.bucket.localeCompare(right.bucket) ||
        right.score - left.score ||
        left.relative.localeCompare(right.relative)
      );
    }
    if (bundleStrategy === "topdir") {
      return (
        topDir(left).localeCompare(topDir(right)) ||
        right.score - left.score ||
        left.relative.localeCompare(right.relative)
      );
    }
    return (
      right.score - left.score ||
      left.bucket.localeCompare(right.bucket) ||
      left.relative.localeCompare(right.relative)
    );
  });
}

function topDir(record: SourcePackRecord): string {
  return record.relative.split("/")[0] || ".";
}

function omittedSummary(records: SourcePackRecord[]): SourcePackOmitted {
  const omitted = records.filter((record) => record.bundle === "omitted");
  return {
    source_file_count: omitted.length,
    reason_counts: omitted.length > 0 ? { bundle_budget: omitted.length } : {},
  };
}

function markdownArtifact(
  kind: string,
  name: string,
  content: string,
  sourceCount: number,
  sourceLineCount: number,
  warningCount: number,
): PendingArtifact {
  return {
    kind,
    name,
    relativePath: "",
    content,
    sourceCount,
    sourceLineCount,
    warningCount,
  };
}

function meta(
  generatedAt: string,
  artifactName: string,
  command: string,
  toolVersion: string,
) {
  return {
    generatedAt,
    outputPath: `tmp/ty-context/context-exports/latest/${artifactName}`,
    command,
    toolVersion,
  };
}

function uploadSets(mode: string, taskName: string): Record<string, string[]> {
  const base = `${DEFAULT_EXPORT_DIR}/latest`;
  const sets: Record<string, string[]> = {
    daily_planning: [
      `${base}/full-project-context.md`,
      `${base}/code-index.md`,
    ],
    cross_module_review: [
      `${base}/full-project-context.md`,
      `${base}/code-index.md`,
      `${base}/code-bundle-core.md`,
      `${base}/code-bundle-extended.md`,
    ],
    full_fallback: [
      `${base}/full-project-context.md`,
      `${base}/code-index.md`,
      `${DEFAULT_EXPORT_DIR}/code-level-implementation-<timestamp>/code-level-implementation.md`,
    ],
  };
  if (mode === "task-context") {
    sets.focused_task_handoff = [
      `${base}/full-project-context.md`,
      `${base}/code-index.md`,
      `${base}/task-contexts/task-context-${taskSlug(taskName)}.md`,
    ];
  }
  return sets;
}

function validateMaxPackFiles(mode: string, maxPackFiles: number): void {
  if (!Number.isInteger(maxPackFiles) || maxPackFiles <= 0) {
    throw new Error(
      "export-context --max-pack-files requires a positive integer",
    );
  }
  if (maxPackFiles > DEFAULT_MAX_PACK_FILES) {
    throw new Error(
      "export-context --max-pack-files cannot exceed 5 for Source Pack modes",
    );
  }
  const required =
    mode === "code-index"
      ? 2
      : mode === "task-context"
        ? 4
        : mode === "code-bundles"
          ? 3
          : 3;
  if (maxPackFiles < required) {
    throw new Error(
      `export-context ${mode} requires --max-pack-files >= ${required}`,
    );
  }
}

function commandFor(options: SourcePackOptions): string {
  const flag =
    options.mode === "task-context"
      ? `--task-context ${options.taskName ?? ""}`
      : `--${options.mode}`;
  return `ty-context export-context ${flag}`;
}

function taskSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "task"
  );
}

function sumLines(records: SourcePackRecord[]): number {
  return records.reduce((sum, record) => sum + record.lines, 0);
}

function sumContextLines(contexts: { lines: number }[]): number {
  return contexts.reduce((sum, context) => sum + context.lines, 0);
}
