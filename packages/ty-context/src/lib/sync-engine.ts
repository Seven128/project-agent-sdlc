import path from "node:path";
import { promises as fs } from "node:fs";
import { readConfig } from "./config.js";
import { harnessPath, harnessRoot } from "./harness-root.js";
import {
  copyTree,
  listFiles,
  pathExists,
  readText,
  writeTextIfChanged,
} from "./fs.js";
import {
  AGENTS_BLOCK_MARKERS,
  GITHUB_WORKFLOW_BLOCK_END,
  GITHUB_WORKFLOW_BLOCK_MARKERS,
  GITHUB_WORKFLOW_BLOCK_START,
  MAKEFILE_BLOCK_END,
  MAKEFILE_BLOCK_MARKERS,
  MAKEFILE_BLOCK_START,
  MANAGED_BLOCK_END,
  MANAGED_BLOCK_START,
  type ManagedBlockMarkers,
} from "./managed-file.js";
import { packageAssetPath } from "./paths.js";
import type { ManagedFile } from "./types.js";
import { assertSupportedSchema } from "./schema-guard.js";
import {
  installLongTaskHooks,
  uninstallLongTaskHooks,
} from "./long-task-hook-install.js";
import { syncLongTaskCodexAgentProfile } from "./long-task-codex-agent-profile.js";
import { enabledManagedSkillNames, isProfileEnabled } from "./profiles.js";
import type { HarnessConfig } from "./types.js";

export interface SyncReport {
  changed: string[];
  skipped: string[];
  blocked: string[];
  notices?: string[];
}

export function emptySyncReport(): SyncReport {
  return {
    changed: [],
    skipped: [],
    blocked: [],
  };
}

export async function runSync(projectRoot: string): Promise<SyncReport> {
  await assertSupportedSchema(projectRoot, "sync");
  const root = await harnessRoot(projectRoot);
  const config = await readConfig(projectRoot);
  const report = emptySyncReport();

  await blockDeprecatedSkillOverrides(projectRoot, root, report);
  if (report.blocked.length > 0) {
    return report;
  }

  for (const managedFile of config.managed_files) {
    await syncManagedFile(projectRoot, root, managedFile, report, config);
  }
  const longTaskEnabled = isProfileEnabled(config, "long-task");
  await syncLongTaskCodexAgentProfile(
    projectRoot,
    root,
    longTaskEnabled,
    report,
  );
  if (longTaskEnabled) {
    await installLongTaskHooks(projectRoot, report);
  } else {
    await uninstallLongTaskHooks(projectRoot, report);
  }

  return report;
}

async function syncManagedFile(
  projectRoot: string,
  root: string,
  managedFile: ManagedFile,
  report: SyncReport,
  config: HarnessConfig,
): Promise<void> {
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
    await syncSkillsTree(
      packageAssetPath("skills"),
      path.join(projectRoot, root, "skills"),
      report,
      enabledManagedSkillNames(config),
    );
    return;
  }
  const managedPath = normalizeManagedPath(managedFile.path);
  if (managedPath === harnessPath(root, "ty-context-managed", "templates")) {
    await syncTree(packageAssetPath("templates"), destination, report);
    return;
  }
  if (
    managedPath === harnessPath(root, "ty-context-managed", "context_templates")
  ) {
    await syncTree(packageAssetPath("context_templates"), destination, report, {
      prune: true,
    });
    return;
  }
  if (managedPath === harnessPath(root, "ty-context-managed", "policies")) {
    await syncTree(packageAssetPath("policies"), destination, report);
    return;
  }
  if (
    managedPath ===
    harnessPath(root, "ty-context-managed", "make", "ty-context.mk")
  ) {
    await syncFile(
      packageAssetPath("make", "ty-context.mk"),
      destination,
      report,
      "skip-if-missing",
    );
    return;
  }
  if (managedFile.path === "tools") {
    await syncTree(packageAssetPath("tools"), destination, report);
    return;
  }
  if (managedFile.path === ".github/workflows/harness.yml") {
    await syncGithubWorkflow(
      packageAssetPath("github", "harness.yml"),
      destination,
      managedFile.path,
      report,
    );
    return;
  }
  report.skipped.push(managedFile.path);
}

function isSkillsManagedPath(managedPath: string, root: string): boolean {
  const normalized = normalizeManagedPath(managedPath);
  return (
    normalized === harnessPath(root, "skills") ||
    normalized === ".harness/agents/skills" ||
    (normalized === ".agents/skills" && root !== ".agents")
  );
}

function normalizeManagedPath(managedPath: string): string {
  return managedPath.replace(/\\/g, "/");
}

async function syncAgentsBlock(
  destination: string,
  root: string,
  report: SyncReport,
): Promise<void> {
  const corePath = packageAssetPath("agents", "AGENTS_CORE.md");
  if (!(await pathExists(corePath))) {
    report.skipped.push("AGENTS.md");
    return;
  }
  const core = renderAgentsCore(await readText(corePath), root);
  const block = `${MANAGED_BLOCK_START}\n${core.trim()}\n${MANAGED_BLOCK_END}`;
  const existing = (await pathExists(destination))
    ? await readText(destination)
    : "";
  const next = mergeManagedBlock({
    existing,
    block,
    markers: AGENTS_BLOCK_MARKERS,
    pathLabel: "AGENTS.md",
    insert: "append",
    report,
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

async function syncMakefileInclude(
  destination: string,
  root: string,
  report: SyncReport,
): Promise<void> {
  const existing = (await pathExists(destination))
    ? await readText(destination)
    : "";
  const resetDefaultGoal = shouldResetMakeDefaultGoal(existing);
  const includePath = `${root.replace(/\\/g, "/")}/ty-context-managed/make/ty-context.mk`;
  const blockLines = [
    MAKEFILE_BLOCK_START,
    "# Included before project targets so project recipes win on name conflicts.",
    `-include ${includePath}`,
    MAKEFILE_BLOCK_END,
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
    report,
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
  | {
      status: "found";
      markers: ManagedBlockMarkers;
      startIndex: number;
      endIndex: number;
    }
  | { status: "missing" }
  | { status: "invalid"; reason: string };

function findManagedBlock(
  existing: string,
  markersList: ManagedBlockMarkers[],
): ManagedBlockSearchResult {
  const matches: Array<{
    markers: ManagedBlockMarkers;
    startIndex: number;
    endIndex: number;
  }> = [];

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
    return {
      status: "invalid",
      reason: "conflicting managed block marker namespaces",
    };
  }
  return matches[0]
    ? { status: "found", ...matches[0] }
    : { status: "missing" };
}

async function syncTree(
  source: string,
  destination: string,
  report: SyncReport,
  options: { prune?: boolean } = {},
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
  const changed = await copyTree(source, destination, { skipGitkeep: true });
  if (options.prune) {
    changed.push(...(await removeStaleManagedFiles(source, destination)));
  }
  report.changed.push(...changed);
}

async function removeStaleManagedFiles(
  source: string,
  destination: string,
): Promise<string[]> {
  if (!(await pathExists(destination))) {
    return [];
  }
  const sourceFiles = new Set(
    (await listFiles(source))
      .filter((file) => !file.endsWith(".gitkeep"))
      .map((file) => path.relative(source, file).split(path.sep).join("/")),
  );
  const removed: string[] = [];
  for (const destinationFile of await listFiles(destination)) {
    const relative = path
      .relative(destination, destinationFile)
      .split(path.sep)
      .join("/");
    if (sourceFiles.has(relative)) {
      continue;
    }
    await fs.rm(destinationFile, { force: true });
    removed.push(destinationFile);
  }
  return removed;
}

async function syncSkillsTree(
  source: string,
  destination: string,
  report: SyncReport,
  enabledSkillNames: ReadonlySet<string>,
): Promise<void> {
  if (!(await pathExists(source))) {
    report.skipped.push(path.basename(destination));
    return;
  }
  const files = await listFiles(source);
  const allManagedSkillNames = new Set(
    files
      .map((file) => path.relative(source, file).split(path.sep)[0])
      .filter(Boolean),
  );
  const realFiles = files
    .filter((file) => !file.endsWith(".gitkeep"))
    .filter((file) =>
      enabledSkillNames.has(path.relative(source, file).split(path.sep)[0]),
    );
  if (realFiles.length === 0) {
    report.skipped.push(path.basename(destination));
    return;
  }

  for (const file of realFiles) {
    const relative = path.relative(source, file);
    const destinationFile = path.join(destination, relative);
    if (await writeTextIfChanged(destinationFile, await readText(file))) {
      report.changed.push(destinationFile);
    } else {
      report.skipped.push(destinationFile);
    }
  }
  const managedSkillNames = new Set(
    realFiles
      .map((file) => path.relative(source, file).split(path.sep)[0])
      .filter(Boolean),
  );
  for (const skillName of managedSkillNames) {
    report.changed.push(
      ...(await removeStaleManagedFiles(
        path.join(source, skillName),
        path.join(destination, skillName),
      )),
    );
  }
  for (const skillName of allManagedSkillNames) {
    if (enabledSkillNames.has(skillName)) continue;
    const disabled = path.join(destination, skillName);
    if (!(await pathExists(disabled))) continue;
    await fs.rm(disabled, { recursive: true, force: true });
    report.changed.push(disabled);
  }
}

async function blockDeprecatedSkillOverrides(
  projectRoot: string,
  root: string,
  report: SyncReport,
): Promise<void> {
  for (const overrideRoot of skillOverrideRoots(projectRoot, root)) {
    if (!(await pathExists(overrideRoot.absolute))) {
      continue;
    }

    const deprecatedFiles = (await listFiles(overrideRoot.absolute))
      .filter((file) => path.basename(file) !== ".gitkeep")
      .map((file) =>
        path.relative(overrideRoot.absolute, file).split(path.sep).join("/"),
      )
      .sort();
    if (deprecatedFiles.length === 0) {
      continue;
    }

    report.blocked.push(
      `${overrideRoot.relative}: deprecated Skill overrides block sync because package-managed default Skills are overwritten during managed asset refresh. Move these rules into a separate project-local Skill such as ${root.replace(/\\/g, "/")}/skills/product_plan/SKILL.md, ${root.replace(/\\/g, "/")}/skills/uiux_design/SKILL.md or ${root.replace(/\\/g, "/")}/skills/development_engineer/SKILL.md. Deprecated files: ${deprecatedFiles.join(", ")}`,
    );
  }
}

function skillOverrideRoots(
  projectRoot: string,
  root: string,
): Array<{ absolute: string; relative: string }> {
  return [
    {
      absolute: path.join(
        projectRoot,
        root,
        "ty-context-managed",
        "override_skills",
      ),
      relative: path
        .join(root, "ty-context-managed", "override_skills")
        .split(path.sep)
        .join("/"),
    },
    {
      absolute: path.join(
        projectRoot,
        root,
        "pjsdlc_managed",
        "override_skills",
      ),
      relative: path
        .join(root, "pjsdlc_managed", "override_skills")
        .split(path.sep)
        .join("/"),
    },
  ];
}

async function syncFile(
  source: string,
  destination: string,
  report: SyncReport,
  missingMode: "block-if-missing" | "skip-if-missing",
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

async function syncGithubWorkflow(
  source: string,
  destination: string,
  relativePath: string,
  report: SyncReport,
): Promise<void> {
  if (!(await pathExists(source))) {
    report.skipped.push(relativePath);
    return;
  }

  const sourceContent = await readText(source);
  if (!(await pathExists(destination))) {
    if (await writeTextIfChanged(destination, sourceContent)) {
      report.changed.push(relativePath);
    } else {
      report.skipped.push(relativePath);
    }
    return;
  }

  const existing = await readText(destination);
  const markerState = workflowMarkerState(existing);
  if (markerState === "invalid") {
    report.blocked.push(`${relativePath}: incomplete managed workflow markers`);
    return;
  }
  if (
    markerState === "managed" ||
    normalizeWorkflow(existing) ===
      normalizeWorkflow(stripWorkflowMarkers(sourceContent))
  ) {
    if (await writeTextIfChanged(destination, sourceContent)) {
      report.changed.push(relativePath);
    } else {
      report.skipped.push(relativePath);
    }
    return;
  }
  report.skipped.push(`${relativePath}: customized`);
}

function workflowMarkerState(
  content: string,
): "managed" | "missing" | "invalid" {
  const found = findManagedBlock(content, GITHUB_WORKFLOW_BLOCK_MARKERS);
  if (found.status === "missing") {
    return "missing";
  }
  if (found.status === "invalid") {
    return "invalid";
  }
  return "managed";
}

function stripWorkflowMarkers(content: string): string {
  return content
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.trim() !== GITHUB_WORKFLOW_BLOCK_START &&
        line.trim() !== GITHUB_WORKFLOW_BLOCK_END,
    )
    .join("\n");
}

function normalizeWorkflow(content: string): string {
  return content.replace(/\r\n/g, "\n").trim();
}
