import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import {
  ensureSafeRepositoryDirectory,
  assertProtectedRepositoryDirectory,
  normalizeRepositoryFile,
} from "./repository-path-safety.js";
import { captureMutationFileState } from "./context-mutation/mutation-file-state.js";
import {
  writeMaintenanceText,
  removeMaintenanceFile,
} from "./maintenance-write.js";
import { withMaintenanceLock } from "./maintenance-lock.js";
import { assertSupportedSchema } from "./schema-guard.js";
import { repoRelative, sha256 } from "./source-pack-records.js";
import type {
  SourcePackArtifactReport,
  SourcePackMode,
  SourcePackOmitted,
} from "./source-pack-types.js";

const execFileAsync = promisify(execFile);

export interface PendingArtifact {
  kind: string;
  name: string;
  relativePath: string;
  content: string;
  sourceCount: number;
  sourceLineCount: number;
  warningCount: number;
}

export async function buildManifest(params: {
  projectRoot: string;
  generatedAt: string;
  command: string;
  maxPackFiles: number;
  artifacts: PendingArtifact[];
  warnings: string[];
  omitted: SourcePackOmitted;
  recommendedUploadSets: Record<string, string[]>;
}): Promise<string> {
  const git = await gitInfo(params.projectRoot);
  const manifest = {
    schema_version: "source-pack-v1",
    generated_at: params.generatedAt,
    tool: "ty-context export-context",
    tool_version: await readPackageVersion(),
    git_sha: git.sha,
    git_dirty: git.dirty,
    command: params.command,
    max_pack_files: params.maxPackFiles,
    artifacts: params.artifacts.map((artifact) => artifactReport(artifact)),
    warnings: params.warnings,
    omitted: params.omitted,
    recommended_upload_sets: params.recommendedUploadSets,
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function artifactReport(
  artifact: PendingArtifact,
): SourcePackArtifactReport {
  return {
    kind: artifact.kind,
    name: artifact.name,
    path: artifact.relativePath,
    sha256: sha256(artifact.content),
    characters: artifact.content.length,
    source_count: artifact.sourceCount,
    source_line_count: artifact.sourceLineCount,
    warning_count: artifact.warningCount,
  };
}

export async function writeArtifactSet(
  projectRoot: string,
  outputDir: string,
  artifacts: PendingArtifact[],
): Promise<void> {
  const relative = repoRelative(projectRoot, outputDir);
  if (relative !== "tmp/ty-context/context-exports/latest")
    throw Error("Source Pack output must use its owned latest directory");
  await withMaintenanceLock(projectRoot, "export", async () => {
    await assertSupportedSchema(projectRoot, "export-context");
    await ensureSafeRepositoryDirectory(
      projectRoot,
      relative,
      "source_pack_output",
    );
    const previous = await ownedArtifacts(projectRoot, relative);
    const planned = [];
    for (const artifact of artifacts) {
      if (normalizeRepositoryFile(artifact.name) !== artifact.name)
        throw Error("invalid Source Pack artifact name");
      const file = relative + "/" + artifact.name,
        before = await captureMutationFileState(projectRoot, file);
      if (
        before.exists &&
        artifact.name !== "source-pack-manifest.json" &&
        previous.get(artifact.name) !== before.sha256
      )
        throw Error("export_conflict:" + file + "; preserve user edits");
      planned.push({ file, before, artifact });
    }
    const obsolete = [];
    for (const [name, hash] of previous) {
      const file = relative + "/" + name,
        before = await captureMutationFileState(projectRoot, file);
      if (before.exists && before.sha256 !== hash)
        throw Error("export_conflict:" + file + "; preserve user edits");
      if (!artifacts.some((artifact) => artifact.name === name))
        obsolete.push({ file, before });
    }
    for (const entry of planned)
      await writeMaintenanceText(
        projectRoot,
        entry.file,
        entry.artifact.content,
        entry.before,
      );
    for (const entry of obsolete)
      await removeMaintenanceFile(projectRoot, entry.file, entry.before);
  });
}

// Only manifest-listed, byte-matching generated files are cleanup-owned.
// Unlisted user files and historical directories without such a manifest remain.
async function ownedArtifacts(
  root: string,
  directory: string,
): Promise<Map<string, string>> {
  const state = await captureMutationFileState(
    root,
    directory + "/source-pack-manifest.json",
  );
  if (!state.exists) return new Map();
  const value = JSON.parse(
    Buffer.from(state.bytes_base64!, "base64").toString("utf8"),
  );
  if (
    value.schema_version !== "source-pack-v1" ||
    value.tool !== "ty-context export-context" ||
    !Array.isArray(value.artifacts)
  )
    throw Error("unrecognized export manifest:" + directory);
  const entries = new Map<string, string>();
  for (const row of value.artifacts) {
    if (
      typeof row.name !== "string" ||
      normalizeRepositoryFile(row.name) !== row.name ||
      row.name === "source-pack-manifest.json" ||
      !/^[0-9a-f]{64}$/.test(row.sha256) ||
      entries.has(row.name)
    )
      throw Error("invalid export ownership entry:" + directory);
    entries.set(row.name, row.sha256);
  }
  return entries;
}

export async function pruneTimestampedExports(
  projectRoot: string,
  keepCount: number,
): Promise<void> {
  if (!Number.isInteger(keepCount) || keepCount < 0)
    throw Error("export-context --prune requires a non-negative integer");
  const root = "tmp/ty-context/context-exports";
  await withMaintenanceLock(projectRoot, "export", async () => {
    await assertSupportedSchema(projectRoot, "export-context");
    const safe = await ensureSafeRepositoryDirectory(
      projectRoot,
      root,
      "export_prune_root",
    );
    const entries = (await fs.readdir(safe.absolute))
      .filter((name) => /^\d{8}T\d{6}Z$/.test(name))
      .sort()
      .reverse();
    for (const name of entries.slice(keepCount)) {
      const relative = root + "/" + name,
        directory = path.join(safe.absolute, name);
      await assertProtectedRepositoryDirectory(
        projectRoot,
        directory,
        "export_prune_directory",
      );
      const manifest = await captureMutationFileState(
        projectRoot,
        relative + "/source-pack-manifest.json",
      );
      if (!manifest.exists) continue;
      const owned = await ownedArtifacts(projectRoot, relative),
        planned = [];
      for (const [file, hash] of owned) {
        const before = await captureMutationFileState(
          projectRoot,
          relative + "/" + file,
        );
        if (before.exists && before.sha256 !== hash)
          throw Error("export_cleanup_conflict:" + relative + "/" + file);
        planned.push({ file: relative + "/" + file, before });
      }
      for (const item of planned)
        await removeMaintenanceFile(projectRoot, item.file, item.before);
      await removeMaintenanceFile(
        projectRoot,
        relative + "/source-pack-manifest.json",
        manifest,
      );
      try {
        await fs.rmdir(directory);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOTEMPTY") throw error;
      }
    }
  });
}

export function timestampForFile(now: Date): string {
  return now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

async function gitInfo(
  projectRoot: string,
): Promise<{ sha: string | null; dirty: boolean }> {
  try {
    const shaResult = await execFileAsync(
      "git",
      ["-C", projectRoot, "rev-parse", "HEAD"],
      { encoding: "utf8" },
    );
    const dirtyResult = await execFileAsync(
      "git",
      ["-C", projectRoot, "status", "--porcelain"],
      { encoding: "utf8" },
    );
    return {
      sha: shaResult.stdout.trim() || null,
      dirty: dirtyResult.stdout.trim().length > 0,
    };
  } catch {
    return { sha: null, dirty: false };
  }
}

export async function readPackageVersion(): Promise<string> {
  try {
    const packageJson = JSON.parse(
      await fs.readFile(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { version?: string };
    return packageJson.version ?? "unknown";
  } catch {
    return "unknown";
  }
}
