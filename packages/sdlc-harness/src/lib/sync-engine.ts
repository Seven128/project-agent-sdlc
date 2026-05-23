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
import { MANAGED_BLOCK_END, MANAGED_BLOCK_START } from "./managed-file.js";
import { packageAssetPath } from "./paths.js";
import type { ManagedFile } from "./types.js";

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
  if (managedFile.path === path.join(root, "skills") || managedFile.path === ".harness/agents/skills") {
    await syncTree(packageAssetPath("skills"), destination, report);
    return;
  }
  if (managedFile.path === ".agents/skills" && root !== ".agents") {
    await syncTree(packageAssetPath("skills"), destination, report);
    return;
  }
  if (managedFile.path === path.join(root, "managed", "templates") || managedFile.path === ".harness/templates") {
    await syncTree(packageAssetPath("templates"), destination, report);
    return;
  }
  if (managedFile.path === path.join(root, "managed", "policies") || managedFile.path === ".harness/policies") {
    await syncTree(packageAssetPath("policies"), destination, report);
    return;
  }
  if (
    managedFile.path === path.join(root, "managed", "make", "sdlc-harness.mk") ||
    managedFile.path === ".harness/make/sdlc-harness.mk"
  ) {
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

async function syncAgentsBlock(destination: string, root: string, report: SyncReport): Promise<void> {
  const corePath = packageAssetPath("agents", "AGENTS_CORE.md");
  if (!(await pathExists(corePath))) {
    report.skipped.push("AGENTS.md");
    return;
  }
  const core = renderAgentsCore(await readText(corePath), root);
  const block = `${MANAGED_BLOCK_START}\n${core.trim()}\n${MANAGED_BLOCK_END}`;
  const existing = (await pathExists(destination)) ? await readText(destination) : "";
  let next: string;
  if (existing.includes(MANAGED_BLOCK_START) && existing.includes(MANAGED_BLOCK_END)) {
    const before = existing.slice(0, existing.indexOf(MANAGED_BLOCK_START));
    const after = existing.slice(existing.indexOf(MANAGED_BLOCK_END) + MANAGED_BLOCK_END.length);
    next = `${before}${block}${after}`;
  } else if (existing.trim()) {
    next = `${existing.trimEnd()}\n\n${block}\n`;
  } else {
    next = `${block}\n`;
  }
  if (await writeTextIfChanged(destination, next)) {
    report.changed.push("AGENTS.md");
  } else {
    report.skipped.push("AGENTS.md");
  }
}

function renderAgentsCore(content: string, root: string): string {
  return content.replaceAll(".agent", root);
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
