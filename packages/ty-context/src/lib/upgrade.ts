import { runDoctor } from "./doctor.js";
import {
  createUpgradePlan,
  formatUpgradePlan,
  runMigrations,
} from "./migrations.js";
import { assertSupportedSchema } from "./schema-guard.js";
import { runSync } from "./sync-engine.js";

export interface UpgradeRunReport {
  lines: string[];
  blocked: boolean;
}

export class UpgradeBlockedError extends Error {
  constructor(public readonly lines: string[]) {
    super("upgrade completed with blockers");
  }
}

export async function runUpgrade(projectRoot: string): Promise<string[]> {
  const report = await runUpgradeReport(projectRoot);
  if (report.blocked) {
    throw new UpgradeBlockedError(report.lines);
  }
  return report.lines;
}

export async function runUpgradeReport(
  projectRoot: string,
): Promise<UpgradeRunReport> {
  const lines: string[] = [];
  await assertSupportedSchema(projectRoot, "upgrade");
  const plan = await createUpgradePlan(projectRoot);
  if (plan.blocked.length > 0) {
    lines.push(...formatUpgradePlan(plan));
    lines.push(
      "upgrade blocked: resolve blocked migration items before applying safe migrations or sync.",
    );
    const doctor = await runDoctor(projectRoot);
    lines.push(
      `doctor warnings=${doctor.warnings.length} errors=${doctor.errors.length}`,
    );
    return { lines, blocked: true };
  }

  const migrationReport = await runMigrations(projectRoot, plan);
  lines.push(
    `migrations changed=${migrationReport.changed.length} skipped=${migrationReport.skipped.length} manual_required=${migrationReport.manualRequired.length} blocked=${migrationReport.blocked.length}`,
  );
  if (
    migrationReport.manualRequired.length > 0 ||
    migrationReport.blocked.length > 0
  ) {
    lines.push(
      ...formatUpgradePlan({
        safe_pending: [],
        manual_required: migrationReport.manualRequired,
        blocked: migrationReport.blocked,
      }).slice(1),
    );
  }

  const syncReport = await runSync(projectRoot);
  lines.push(
    `sync changed=${syncReport.changed.length} skipped=${syncReport.skipped.length} blocked=${syncReport.blocked.length}`,
  );
  for (const skipped of syncReport.skipped.filter((line) =>
    line.includes("customized"),
  )) {
    lines.push(`sync skipped: ${skipped}`);
  }
  lines.push(...(syncReport.notices ?? []));

  const doctor = await runDoctor(projectRoot);
  lines.push(
    `doctor warnings=${doctor.warnings.length} errors=${doctor.errors.length}`,
  );
  const blocked =
    migrationReport.manualRequired.length > 0 ||
    migrationReport.blocked.length > 0 ||
    syncReport.blocked.length > 0 ||
    doctor.errors.length > 0;
  return { lines, blocked };
}
