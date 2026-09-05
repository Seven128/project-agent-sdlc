import { readFile } from "node:fs/promises";
import { readConfig } from "./config.js";
import {
  AGENTS_BLOCK_MARKERS,
  MANAGED_BLOCK_START,
  MANAGED_BLOCK_END,
  type ManagedBlockMarkers,
} from "./managed-file.js";
import { packageAssetPath } from "./paths.js";
import { assertSupportedSchema } from "./schema-guard.js";
import { captureMutationFileState } from "./context-mutation/mutation-file-state.js";
import { assertNoUnfinishedContextMutation } from "./context-mutation/mutation-command-support.js";
import { withMaintenanceLock } from "./maintenance-lock.js";
import { writeMaintenanceText } from "./maintenance-write.js";

export interface SyncReport {
  changed: string[];
  skipped: string[];
  blocked: string[];
  notices?: string[];
}
export function emptySyncReport(): SyncReport {
  return { changed: [], skipped: [], blocked: [] };
}
export async function runSync(repository: string): Promise<SyncReport> {
  await assertSupportedSchema(repository, "sync");
  return withMaintenanceLock(repository, "sync", () =>
    syncStartupInstructions(repository),
  );
}
// Upgrade calls this while holding the same maintenance lock, after its own publication checks.
export async function syncStartupInstructions(
  repository: string,
): Promise<SyncReport> {
  await assertSupportedSchema(repository, "sync");
  await assertNoUnfinishedContextMutation(repository);
  const config = await readConfig(repository);
  const report = emptySyncReport();
  const unsupported = config.managed_files.filter(
    (file) => file.path !== "AGENTS.md" || file.strategy !== "merge-block",
  );
  if (unsupported.length) {
    report.blocked.push(
      "Unsupported managed entries require explicit upgrade/review: " +
        unsupported.map((x) => x.path).join(", "),
    );
    return report;
  }
  if (!config.managed_files.some((x) => x.path === "AGENTS.md")) {
    report.notices = [
      "Startup instructions are not managed by this configuration.",
    ];
    return report;
  }
  const {
    before,
    content: next,
    blocked,
  } = await prepareStartupInstructions(repository);
  report.blocked.push(...blocked);
  if (next !== undefined) {
    const changed = await writeMaintenanceText(
      repository,
      "AGENTS.md",
      next,
      before,
    );
    (changed ? report.changed : report.skipped).push("AGENTS.md");
  }
  return report;
}
export async function prepareStartupInstructions(repository: string) {
  const report = emptySyncReport();
  const before = await captureMutationFileState(repository, "AGENTS.md");
  const existing = before.bytes_base64
    ? Buffer.from(before.bytes_base64, "base64").toString("utf8")
    : "";
  const core = await readFile(
    packageAssetPath("agents", "AGENTS_CORE.md"),
    "utf8",
  );
  const block =
    MANAGED_BLOCK_START + "\n" + core.trim() + "\n" + MANAGED_BLOCK_END;
  const next = mergeManagedBlock({
    existing,
    block,
    markers: AGENTS_BLOCK_MARKERS,
    pathLabel: "AGENTS.md",
    insert: "append",
    report,
  });
  return { before, content: next, blocked: report.blocked };
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
