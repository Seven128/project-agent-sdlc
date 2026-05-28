import { runDoctor } from "./doctor.js";
import { runMigrations } from "./migrations.js";
import { runSync } from "./sync-engine.js";

export async function runUpgrade(projectRoot: string): Promise<string[]> {
  const lines: string[] = [];
  const migrationReport = await runMigrations(projectRoot);
  lines.push(`migrations changed=${migrationReport.changed.length} skipped=${migrationReport.skipped.length}`);

  const syncReport = await runSync(projectRoot);
  lines.push(`sync changed=${syncReport.changed.length} skipped=${syncReport.skipped.length} blocked=${syncReport.blocked.length}`);
  for (const skipped of syncReport.skipped.filter((line) => line.includes("customized"))) {
    lines.push(`sync skipped: ${skipped}`);
  }

  const doctor = await runDoctor(projectRoot);
  lines.push(`doctor warnings=${doctor.warnings.length} errors=${doctor.errors.length}`);
  if (syncReport.blocked.length > 0 || doctor.errors.length > 0) {
    throw new Error("upgrade completed with blockers");
  }
  return lines;
}
