import path from "node:path";
import { readConfig } from "./config.js";
import { harnessRoot } from "./harness-root.js";
import {
  copyTree,
  listFiles,
  pathExists,
  readText,
  writeTextIfChanged
} from "./fs.js";
import {
  AGENTS_BLOCK_MARKERS,
  MAKEFILE_BLOCK_END,
  MAKEFILE_BLOCK_MARKERS,
  MAKEFILE_BLOCK_START,
  MANAGED_BLOCK_END,
  MANAGED_BLOCK_START,
  type ManagedBlockMarkers
} from "./managed-file.js";
import { packageAssetPath } from "./paths.js";
import type { ManagedFile } from "./types.js";
import { parseYaml, stringifyYaml } from "./yaml.js";

export interface SyncReport {
  changed: string[];
  skipped: string[];
  blocked: string[];
}

export function emptySyncReport(): SyncReport {
  return {
    changed: [],
    skipped: [],
    blocked: []
  };
}

type SkillOverride =
  | { mode: "snippet"; relativePath: string; content: string }
  | { mode: "full-skill"; relativePath: string; content: string; description: string };

interface SkillFrontmatter {
  metadata: Record<string, unknown>;
  body: string;
}

export async function runSync(projectRoot: string): Promise<SyncReport> {
  const root = await harnessRoot(projectRoot);
  const config = await readConfig(projectRoot);
  const report = emptySyncReport();

  for (const managedFile of config.managed_files) {
    await syncManagedFile(projectRoot, root, managedFile, report);
  }

  return report;
}

async function syncManagedFile(projectRoot: string, root: string, managedFile: ManagedFile, report: SyncReport): Promise<void> {
  const destination = path.join(projectRoot, managedFile.path);
  if (managedFile.path === "AGENTS.md") {
    await syncAgentsBlock(destination, root, report);
    return;
  }
  if (managedFile.path === "Makefile") {
    await syncMakefileInclude(destination, root, report);
    return;
  }
  if (isSkillsManagedPath(managedFile.path, root)) {
    await syncSkillsTree(packageAssetPath("skills"), path.join(projectRoot, root, "skills"), projectRoot, root, report);
    return;
  }
  if (managedFile.path === path.join(root, "pjsdlc_managed", "templates")) {
    await syncTree(packageAssetPath("templates"), destination, report);
    return;
  }
  if (managedFile.path === path.join(root, "pjsdlc_managed", "policies")) {
    await syncTree(packageAssetPath("policies"), destination, report);
    return;
  }
  if (managedFile.path === path.join(root, "pjsdlc_managed", "make", "sdlc-harness.mk")) {
    await syncFile(packageAssetPath("make", "sdlc-harness.mk"), destination, report, "skip-if-missing");
    return;
  }
  if (managedFile.path === ".github/workflows/harness.yml") {
    if (await pathExists(destination)) {
      report.skipped.push(managedFile.path);
      return;
    }
    await syncFile(packageAssetPath("github", "harness.yml"), destination, report, "skip-if-missing");
    return;
  }
  report.skipped.push(managedFile.path);
}

function isSkillsManagedPath(managedPath: string, root: string): boolean {
  return (
    managedPath === path.join(root, "skills") ||
    managedPath === ".harness/agents/skills" ||
    (managedPath === ".agents/skills" && root !== ".agents")
  );
}

async function syncAgentsBlock(destination: string, root: string, report: SyncReport): Promise<void> {
  const corePath = packageAssetPath("agents", "AGENTS_CORE.md");
  if (!(await pathExists(corePath))) {
    report.skipped.push("AGENTS.md");
    return;
  }
  const core = renderAgentsCore(await readText(corePath), root);
  const block = `${MANAGED_BLOCK_START}\n${core.trim()}\n${MANAGED_BLOCK_END}`;
  const existing = (await pathExists(destination)) ? await readText(destination) : "";
  const next = mergeManagedBlock({
    existing,
    block,
    markers: AGENTS_BLOCK_MARKERS,
    pathLabel: "AGENTS.md",
    insert: "append",
    report
  });
  if (!next) {
    return;
  }
  if (await writeTextIfChanged(destination, next)) {
    report.changed.push("AGENTS.md");
  } else {
    report.skipped.push("AGENTS.md");
  }
}

function renderAgentsCore(content: string, root: string): string {
  return content.replaceAll(".agent", root).replaceAll(".codex", root);
}

async function syncMakefileInclude(destination: string, root: string, report: SyncReport): Promise<void> {
  const existing = (await pathExists(destination)) ? await readText(destination) : "";
  const resetDefaultGoal = shouldResetMakeDefaultGoal(existing);
  const includePath = `${root.replace(/\\/g, "/")}/pjsdlc_managed/make/sdlc-harness.mk`;
  const blockLines = [
    MAKEFILE_BLOCK_START,
    "# Included before project targets so project recipes win on name conflicts.",
    `-include ${includePath}`,
    MAKEFILE_BLOCK_END
  ];
  if (resetDefaultGoal) {
    blockLines.splice(3, 0, ".DEFAULT_GOAL :=");
  }
  const block = blockLines.join("\n");
  const next = mergeManagedBlock({
    existing,
    block,
    markers: MAKEFILE_BLOCK_MARKERS,
    pathLabel: "Makefile",
    insert: "prepend",
    report
  });
  if (!next) {
    return;
  }
  if (await writeTextIfChanged(destination, next)) {
    report.changed.push("Makefile");
  } else {
    report.skipped.push("Makefile");
  }
}

function shouldResetMakeDefaultGoal(existing: string): boolean {
  if (!existing.trim()) {
    return false;
  }
  const block = findManagedBlock(existing, MAKEFILE_BLOCK_MARKERS);
  if (block.status === "missing") {
    return true;
  }
  if (block.status === "invalid") {
    return false;
  }
  const before = existing.slice(0, block.startIndex);
  const after = existing.slice(block.endIndex + block.markers.end.length);
  return !before.trim() && Boolean(after.trim());
}

function mergeManagedBlock(options: {
  existing: string;
  block: string;
  markers: ManagedBlockMarkers[];
  pathLabel: string;
  insert: "append" | "prepend";
  report: SyncReport;
}): string | undefined {
  const { existing, block, markers, pathLabel, insert, report } = options;
  const found = findManagedBlock(existing, markers);

  if (found.status === "invalid") {
    report.blocked.push(`${pathLabel}: ${found.reason}`);
    return undefined;
  }
  if (found.status === "found") {
    const before = existing.slice(0, found.startIndex);
    const after = existing.slice(found.endIndex + found.markers.end.length);
    return `${before}${block}${after}`;
  }
  if (!existing.trim()) {
    return `${block}\n`;
  }
  if (insert === "prepend") {
    return `${block}\n\n${existing}`;
  }
  return `${existing.trimEnd()}\n\n${block}\n`;
}

type ManagedBlockSearchResult =
  | { status: "found"; markers: ManagedBlockMarkers; startIndex: number; endIndex: number }
  | { status: "missing" }
  | { status: "invalid"; reason: string };

function findManagedBlock(existing: string, markersList: ManagedBlockMarkers[]): ManagedBlockSearchResult {
  const matches: Array<{ markers: ManagedBlockMarkers; startIndex: number; endIndex: number }> = [];

  for (const markers of markersList) {
    const startIndex = existing.indexOf(markers.start);
    const endIndex = existing.indexOf(markers.end);
    const hasStart = startIndex >= 0;
    const hasEnd = endIndex >= 0;

    if (!hasStart && !hasEnd) {
      continue;
    }
    if (hasStart !== hasEnd || endIndex < startIndex) {
      return { status: "invalid", reason: "incomplete managed block markers" };
    }
    if (
      existing.indexOf(markers.start, startIndex + markers.start.length) >= 0 ||
      existing.indexOf(markers.end, endIndex + markers.end.length) >= 0
    ) {
      return { status: "invalid", reason: "duplicate managed block markers" };
    }
    matches.push({ markers, startIndex, endIndex });
  }

  if (matches.length > 1) {
    return { status: "invalid", reason: "conflicting managed block marker namespaces" };
  }
  return matches[0] ? { status: "found", ...matches[0] } : { status: "missing" };
}

async function syncTree(source: string, destination: string, report: SyncReport): Promise<void> {
  if (!(await pathExists(source))) {
    report.skipped.push(path.basename(destination));
    return;
  }
  const files = await listFiles(source);
  const realFiles = files.filter((file) => !file.endsWith(".gitkeep"));
  if (realFiles.length === 0) {
    report.skipped.push(path.basename(destination));
    return;
  }
  const changed = await copyTree(source, destination, { skipGitkeep: true });
  report.changed.push(...changed);
}

async function syncSkillsTree(
  source: string,
  destination: string,
  projectRoot: string,
  root: string,
  report: SyncReport
): Promise<void> {
  if (!(await pathExists(source))) {
    report.skipped.push(path.basename(destination));
    return;
  }
  const files = await listFiles(source);
  const realFiles = files.filter((file) => !file.endsWith(".gitkeep"));
  if (realFiles.length === 0) {
    report.skipped.push(path.basename(destination));
    return;
  }

  const knownSkills = new Set<string>();
  for (const file of realFiles) {
    const skillName = skillNameForSourceFile(source, file);
    if (skillName) {
      knownSkills.add(skillName);
    }
  }

  const blockedBefore = report.blocked.length;
  const overrides = await readSkillOverrides(projectRoot, root, knownSkills, report);
  if (report.blocked.length > blockedBefore) {
    return;
  }

  for (const file of realFiles) {
    const relative = path.relative(source, file);
    const destinationFile = path.join(destination, relative);
    const skillName = skillNameForSourceFile(source, file);
    const baseContent = await readText(file);
    const content = skillName ? renderSkillWithOverride(baseContent, overrides.get(skillName)) : baseContent;
    if (await writeTextIfChanged(destinationFile, content)) {
      report.changed.push(destinationFile);
    } else {
      report.skipped.push(destinationFile);
    }
  }
}

async function readSkillOverrides(
  projectRoot: string,
  root: string,
  knownSkills: Set<string>,
  report: SyncReport
): Promise<Map<string, SkillOverride>> {
  const overrides = new Map<string, SkillOverride>();
  const overrideRoot = skillOverrideRoot(projectRoot, root);
  if (!(await pathExists(overrideRoot))) {
    return overrides;
  }

  for (const file of await listFiles(overrideRoot)) {
    if (path.basename(file) === ".gitkeep") {
      continue;
    }
    const relativePath = path.relative(overrideRoot, file).split(path.sep).join("/");
    const match = relativePath.match(/^([^/]+)\.md$/);
    if (!match || !knownSkills.has(match[1])) {
      report.blocked.push(`unknown skill override: ${path.join(root, "pjsdlc_managed", "override_skills", relativePath)}`);
      continue;
    }
    const content = await readText(file);
    if (content.trim()) {
      const fullSkill = parseFullSkillOverride(content);
      if (fullSkill) {
        if (fullSkill.name !== match[1]) {
          report.blocked.push(
            `skill override name mismatch: ${path.join(root, "pjsdlc_managed", "override_skills", relativePath)} declares name ${fullSkill.name}`
          );
          continue;
        }
        overrides.set(match[1], {
          relativePath: path.join(root, "pjsdlc_managed", "override_skills", relativePath),
          mode: "full-skill",
          content: fullSkill.body,
          description: fullSkill.description
        });
        continue;
      }
      overrides.set(match[1], {
        relativePath: path.join(root, "pjsdlc_managed", "override_skills", relativePath),
        mode: "snippet",
        content
      });
    }
  }
  return overrides;
}

function skillOverrideRoot(projectRoot: string, root: string): string {
  return path.join(projectRoot, root, "pjsdlc_managed", "override_skills");
}

function skillNameForSourceFile(sourceRoot: string, file: string): string | undefined {
  const relative = path.relative(sourceRoot, file).split(path.sep).join("/");
  const match = relative.match(/^([^/]+)\/SKILL\.md$/);
  return match?.[1];
}

function renderSkillWithOverride(
  baseContent: string,
  override?: SkillOverride
): string {
  if (!override) {
    return baseContent;
  }
  const renderedBase = override.mode === "full-skill" ? mergeSkillDescription(baseContent, override.description) : baseContent;
  const guidance =
    override.mode === "full-skill"
      ? "The following project-local full Skill extension is appended by `sdlc-harness sync`. Its frontmatter has been merged into the generated Skill metadata; the body below remains the project-local extension."
      : "The following project-local snippet is appended by `sdlc-harness sync`.";
  const header = [
    "",
    "",
    "## Local Override",
    "",
    `Source: \`${override.relativePath.split(path.sep).join("/")}\``,
    "",
    `${guidance} Keep package-managed Skill files unchanged; edit the override source instead.`,
    "",
    "After sync, review the merged Skill for semantic conflicts between the package base and local override, especially phase boundaries, `allowed_paths`, `required_gates`, commit/release rules and completion checks.",
    ""
  ].join("\n");
  return `${renderedBase.trimEnd()}${header}\n${override.content.trim()}\n`;
}

function parseFullSkillOverride(content: string): { name: string; description: string; body: string } | undefined {
  const parsed = parseFrontmatter(content);
  if (!parsed) {
    return undefined;
  }
  const name = parsed.metadata.name;
  const description = parsed.metadata.description;
  if (typeof name !== "string" || typeof description !== "string") {
    return undefined;
  }
  return { name, description, body: parsed.body };
}

function mergeSkillDescription(baseContent: string, overrideDescription: string): string {
  const parsed = parseFrontmatter(baseContent);
  if (!parsed || typeof parsed.metadata.name !== "string" || typeof parsed.metadata.description !== "string") {
    return baseContent;
  }
  const metadata = {
    ...parsed.metadata,
    name: parsed.metadata.name,
    description: `${parsed.metadata.description} Project override: ${overrideDescription}`
  };
  return `---\n${stringifyYaml(metadata).trimEnd()}\n---\n${parsed.body.trimStart()}`;
}

function parseFrontmatter(content: string): SkillFrontmatter | undefined {
  if (!content.startsWith("---\n")) {
    return undefined;
  }
  const endIndex = content.indexOf("\n---", 4);
  if (endIndex < 0) {
    return undefined;
  }
  let metadata: unknown;
  try {
    metadata = parseYaml(content.slice(4, endIndex));
  } catch {
    return undefined;
  }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }
  const bodyStart = content.indexOf("\n", endIndex + 4);
  const body = bodyStart < 0 ? "" : content.slice(bodyStart + 1);
  return { metadata: metadata as Record<string, unknown>, body };
}

async function syncFile(
  source: string,
  destination: string,
  report: SyncReport,
  missingMode: "block-if-missing" | "skip-if-missing"
): Promise<void> {
  if (!(await pathExists(source))) {
    if (missingMode === "block-if-missing") {
      report.blocked.push(source);
    } else {
      report.skipped.push(destination);
    }
    return;
  }
  if (await writeTextIfChanged(destination, await readText(source))) {
    report.changed.push(destination);
  } else {
    report.skipped.push(destination);
  }
}
