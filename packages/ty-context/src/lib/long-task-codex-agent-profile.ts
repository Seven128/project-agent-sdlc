import { promises as fs } from "node:fs";
import path from "node:path";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { packageAssetPath } from "./paths.js";
import type { SyncReport } from "./sync-engine.js";

export const LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH =
  ".codex/agents/long-task-implementation.toml";
export const LONG_TASK_CODEX_AGENT_PROFILE_MANAGED_MARKER =
  "# ty-context:managed:long-task-implementation-worker";

const ASSET_SEGMENTS = ["agents", "long-task-implementation.toml"] as const;

export async function syncLongTaskCodexAgentProfile(
  projectRoot: string,
  enabled: boolean,
  report: SyncReport,
): Promise<void> {
  const destination = path.join(
    projectRoot,
    LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH,
  );

  if (!enabled) {
    await removeManagedProfile(destination, report);
    return;
  }

  const source = packageAssetPath(...ASSET_SEGMENTS);
  if (!(await pathExists(source))) {
    report.skipped.push(
      `${LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH}: optional package asset unavailable`,
    );
    return;
  }
  const desired = await readText(source);
  if (!isManagedLongTaskCodexAgentProfile(desired)) {
    report.skipped.push(
      `${LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH}: optional package asset is not managed`,
    );
    return;
  }

  if (await pathExists(destination)) {
    const existing = await readText(destination);
    if (!isManagedLongTaskCodexAgentProfile(existing)) {
      report.skipped.push(
        `${LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH}: customized`,
      );
      return;
    }
  }

  if (await writeTextIfChanged(destination, desired)) {
    report.changed.push(LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH);
  } else {
    report.skipped.push(LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH);
  }
}

export async function longTaskCodexAgentProfileBootstrapPaths(
  projectRoot: string,
  enabled: boolean,
): Promise<string[]> {
  if (!enabled) return [];
  const source = packageAssetPath(...ASSET_SEGMENTS);
  const destination = path.join(
    projectRoot,
    LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH,
  );
  if (!(await pathExists(source)) || !(await pathExists(destination)))
    return [];
  const [desired, existing] = await Promise.all([
    readText(source),
    readText(destination),
  ]);
  return desired === existing && isManagedLongTaskCodexAgentProfile(desired)
    ? [LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH]
    : [];
}

export function isManagedLongTaskCodexAgentProfile(content: string): boolean {
  return content
    .replace(/\r\n/gu, "\n")
    .startsWith(`${LONG_TASK_CODEX_AGENT_PROFILE_MANAGED_MARKER}\n`);
}

async function removeManagedProfile(
  destination: string,
  report: SyncReport,
): Promise<void> {
  if (!(await pathExists(destination))) return;
  const existing = await readText(destination);
  if (!isManagedLongTaskCodexAgentProfile(existing)) {
    report.skipped.push(
      `${LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH}: customized`,
    );
    return;
  }
  await fs.rm(destination, { force: true });
  report.changed.push(LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH);
}
