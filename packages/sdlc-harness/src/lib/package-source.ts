import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { copyTree, ensureDir, listFiles, pathExists, readText, writeTextIfChanged } from "./fs.js";
import { AGENTS_BLOCK_MARKERS } from "./managed-file.js";
import { SOURCE_MAPPINGS_PATH } from "./paths.js";
import type { SourceMapping, SourceMappingsFile } from "./types.js";
import { parseYaml } from "./yaml.js";

export interface PackageSourceSyncReport {
  changed: string[];
}

export interface PackageSourceCheckReport {
  drift: string[];
}

export async function syncSource(projectRoot: string): Promise<PackageSourceSyncReport> {
  const report: PackageSourceSyncReport = { changed: [] };
  for (const mapping of await readSourceMappings(projectRoot)) {
    const changed = await applyMapping(projectRoot, mapping);
    report.changed.push(...changed);
  }
  return report;
}

export async function checkSource(projectRoot: string): Promise<PackageSourceCheckReport> {
  const drift: string[] = [];
  for (const mapping of await readSourceMappings(projectRoot)) {
    const expected = await renderMapping(projectRoot, mapping);
    const target = path.join(projectRoot, mapping.target);
    if (typeof expected === "string") {
      const existing = (await pathExists(target)) ? await readText(target) : "";
      if (normalize(existing) !== normalize(expected)) {
        drift.push(mapping.target);
      }
      continue;
    }
    const sourceHashes = new Map<string, string>();
    for (const item of expected) {
      sourceHashes.set(item.relative, hash(item.content));
      const targetFile = path.join(target, item.relative);
      const existing = (await pathExists(targetFile)) ? await readText(targetFile) : "";
      if (hash(existing) !== hash(item.content)) {
        drift.push(`${mapping.target}/${item.relative}`);
      }
    }
    const targetFiles = await listFiles(target);
    for (const targetFile of targetFiles) {
      if (path.basename(targetFile) === ".gitkeep") {
        continue;
      }
      const relative = path.relative(target, targetFile);
      if (!sourceHashes.has(relative)) {
        drift.push(`${mapping.target}/${relative}`);
      }
    }
  }
  return { drift };
}

async function readSourceMappings(projectRoot: string): Promise<SourceMapping[]> {
  const mappingPath = path.join(projectRoot, SOURCE_MAPPINGS_PATH);
  const parsed = parseYaml(await readText(mappingPath)) as SourceMappingsFile;
  return parsed.source_mappings ?? [];
}

async function applyMapping(projectRoot: string, mapping: SourceMapping): Promise<string[]> {
  const target = path.join(projectRoot, mapping.target);
  const rendered = await renderMapping(projectRoot, mapping);
  if (typeof rendered === "string") {
    return (await writeTextIfChanged(target, rendered)) ? [mapping.target] : [];
  }
  await fs.rm(target, { recursive: true, force: true });
  await ensureDir(target);
  const changed: string[] = [];
  for (const item of rendered) {
    const targetFile = path.join(target, item.relative);
    if (await writeTextIfChanged(targetFile, item.content)) {
      changed.push(`${mapping.target}/${item.relative}`);
    }
  }
  return changed;
}

async function renderMapping(
  projectRoot: string,
  mapping: SourceMapping
): Promise<string | Array<{ relative: string; content: string }>> {
  const source = path.join(projectRoot, mapping.source);
  if (mapping.mode === "copy-file") {
    return readText(source);
  }
  if (mapping.mode === "copy-tree") {
    const files = await listFiles(source);
    const rendered: Array<{ relative: string; content: string }> = [];
    for (const file of files) {
      if (path.basename(file) === ".gitkeep") {
        continue;
      }
      rendered.push({ relative: path.relative(source, file), content: await readText(file) });
    }
    return rendered;
  }
  if (mapping.mode === "extract-managed-block") {
    const content = await readText(source);
    for (const markers of AGENTS_BLOCK_MARKERS) {
      const start = content.indexOf(markers.start);
      const end = content.indexOf(markers.end);
      if (start >= 0 && end > start) {
        return `${content.slice(start + markers.start.length, end).trim()}\n`;
      }
    }
    return content;
  }
  if (mapping.mode === "extract-harness-targets") {
    return readText(source);
  }
  throw new Error(`Unsupported source mapping mode: ${mapping.mode}`);
}

function normalize(content: string): string {
  return content.replace(/\r\n/g, "\n").trimEnd();
}

function hash(content: string): string {
  return createHash("sha256").update(normalize(content)).digest("hex");
}
