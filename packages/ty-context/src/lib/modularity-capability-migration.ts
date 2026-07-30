import { promises as fs } from "node:fs";
import path from "node:path";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { harnessConfigPath } from "./harness-root.js";
import {
  DEFAULT_MODULARITY_LINE_LIMIT,
  hasLegacyHeuristicOnlyWaiverRisk,
  isLifecycleCompleteModularityWaiverConfig,
  isLikelyGeneratedSourceContent,
} from "./modularity.js";
import type {
  Migration,
  MigrationReport,
  UpgradePlanItem,
} from "./migrations.js";
import { toPosix } from "./source-files.js";
import { parseYaml, stringifyYaml } from "./yaml.js";

type Row = Record<string, unknown>;

const MIGRATION_ID = "modularity-capability-waiver-cleanup";
const INTRODUCED_IN = "0.8.8";
const DESCRIPTION =
  "Remove scoped modularity waivers that existed only for unsupported cross-language heuristic metrics.";
const SCOPE = "<harnessRoot>/config.yaml modularity.waivers";

export const modularityCapabilityWaiverMigration: Migration = {
  id: MIGRATION_ID,
  introducedIn: INTRODUCED_IN,
  description: DESCRIPTION,
  scope: SCOPE,
  risk: "safe",
  manualMessage:
    "Remove only the waiver identified as legacy-heuristic-only; retain any waiver that still covers physical-line or supported language metrics.",
  detect: detectModularityCapabilityWaivers,
  apply: migrateModularityCapabilityWaivers,
  verify: verifyModularityCapabilityWaivers,
};

async function detectModularityCapabilityWaivers(
  projectRoot: string,
): Promise<UpgradePlanItem[]> {
  const config = await readRawConfig(projectRoot);
  if (!config) {
    return [];
  }
  const candidates = await obsoleteWaiverIndexes(projectRoot, config.value);
  return candidates.map(({ index, relativePath }) => ({
    id: MIGRATION_ID,
    introducedIn: INTRODUCED_IN,
    description: DESCRIPTION,
    scope: SCOPE,
    status: "safe_pending",
    path: `${config.relativePath}#modularity.waivers[${index}]`,
    message: `${relativePath} exceeded only metrics from the retired cross-language JS heuristic; upgrade can remove this now-inapplicable waiver without changing supported line-risk coverage.`,
  }));
}

async function migrateModularityCapabilityWaivers(
  projectRoot: string,
  _root: string,
  report: MigrationReport,
): Promise<void> {
  const config = await readRawConfig(projectRoot);
  if (!config) {
    report.skipped.push(MIGRATION_ID);
    return;
  }
  const candidates = await obsoleteWaiverIndexes(projectRoot, config.value);
  if (candidates.length === 0) {
    report.skipped.push(MIGRATION_ID);
    return;
  }

  const modularity = row(config.value.modularity);
  const waivers = Array.isArray(modularity?.waivers) ? modularity.waivers : [];
  const removed = new Set(candidates.map((candidate) => candidate.index));
  const retained = waivers.filter((_waiver, index) => !removed.has(index));
  if (retained.length > 0) {
    modularity!.waivers = retained;
  } else {
    delete modularity!.waivers;
  }
  if (
    await writeTextIfChanged(config.absolutePath, stringifyYaml(config.value))
  ) {
    report.changed.push(
      `${config.relativePath}#modularity.waivers removed=${removed.size}`,
    );
  } else {
    report.skipped.push(MIGRATION_ID);
  }
}

async function verifyModularityCapabilityWaivers(
  projectRoot: string,
): Promise<void> {
  const remaining = await detectModularityCapabilityWaivers(projectRoot);
  if (remaining.length > 0) {
    throw new Error(
      "modularity capability waiver cleanup migration verification failed",
    );
  }
}

async function obsoleteWaiverIndexes(
  projectRoot: string,
  config: Row,
): Promise<Array<{ index: number; relativePath: string }>> {
  const modularity = row(config.modularity);
  if (
    !modularity ||
    (modularity.policy ?? "scoped_waivers") !== "scoped_waivers"
  ) {
    return [];
  }
  if (
    modularity.limit !== undefined &&
    (typeof modularity.limit !== "number" ||
      !Number.isInteger(modularity.limit) ||
      modularity.limit <= 0)
  ) {
    return [];
  }
  const lineLimit =
    typeof modularity.limit === "number"
      ? modularity.limit
      : DEFAULT_MODULARITY_LINE_LIMIT;
  if (!Array.isArray(modularity.waivers)) {
    return [];
  }

  const targets = modularity.waivers.map((value) => {
    const waiver = row(value);
    return safeProjectTarget(projectRoot, waiver?.path);
  });
  const targetCounts = new Map<string, number>();
  for (const target of targets) {
    if (target) {
      const identity = targetIdentity(target.relativePath);
      targetCounts.set(identity, (targetCounts.get(identity) ?? 0) + 1);
    }
  }
  const candidates: Array<{ index: number; relativePath: string }> = [];
  for (const [index, value] of modularity.waivers.entries()) {
    if (!isLifecycleCompleteModularityWaiverConfig(value)) {
      continue;
    }
    const target = targets[index];
    if (
      !target ||
      targetCounts.get(targetIdentity(target.relativePath)) !== 1
    ) {
      continue;
    }
    let content: string;
    try {
      const stat = await fs.stat(target.absolutePath);
      if (!stat.isFile()) {
        continue;
      }
      content = await fs.readFile(target.absolutePath, "utf8");
    } catch {
      continue;
    }
    if (isLikelyGeneratedSourceContent(content)) {
      continue;
    }
    if (
      hasLegacyHeuristicOnlyWaiverRisk(content, target.relativePath, lineLimit)
    ) {
      candidates.push({ index, relativePath: target.relativePath });
    }
  }
  return candidates;
}

async function readRawConfig(projectRoot: string): Promise<
  | {
      absolutePath: string;
      relativePath: string;
      value: Row;
    }
  | undefined
> {
  const relativePath = await harnessConfigPath(projectRoot);
  const absolutePath = path.join(projectRoot, relativePath);
  if (!(await pathExists(absolutePath))) {
    return undefined;
  }
  const value = row(parseYaml(await readText(absolutePath)));
  return value
    ? { absolutePath, relativePath: toPosix(relativePath), value }
    : undefined;
}

function safeProjectTarget(
  projectRoot: string,
  value: unknown,
): { absolutePath: string; relativePath: string } | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  const absolutePath = path.resolve(projectRoot, value);
  const relativePath = toPosix(path.relative(projectRoot, absolutePath));
  if (
    relativePath === ".." ||
    relativePath.startsWith("../") ||
    path.isAbsolute(relativePath)
  ) {
    return undefined;
  }
  return { absolutePath, relativePath };
}

function row(value: unknown): Row | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : undefined;
}

function targetIdentity(relativePath: string): string {
  return process.platform === "win32"
    ? relativePath.toLowerCase()
    : relativePath;
}
