import { assertSupportedSchema, rawSchemaVersion } from "./schema-guard.js";
import {
  runSchema5Retirement,
  readRetirementJournal,
  type RetirementRunOptions,
} from "./retirement-runner.js";
import { runSync } from "./sync-engine.js";
export interface UpgradeRunReport {
  lines: string[];
  blocked: boolean;
}
export class UpgradeBlockedError extends Error {
  constructor(public readonly lines: string[]) {
    super("upgrade blocked; no success is claimed");
  }
}
export async function runUpgrade(
  repository: string,
  options: RetirementRunOptions = {},
): Promise<string[]> {
  const report = await runUpgradeReport(repository, options);
  if (report.blocked) throw new UpgradeBlockedError(report.lines);
  return report.lines;
}
export async function runUpgradeReport(
  repository: string,
  options: RetirementRunOptions = {},
): Promise<UpgradeRunReport> {
  try {
    await assertSupportedSchema(repository, "upgrade");
    if (
      (await rawSchemaVersion(repository)) === "5" &&
      !(await readRetirementJournal(repository))
    ) {
      const report = await runSync(repository);
      return {
        lines: [
          "Schema 5 already installed.",
          ...report.blocked,
          ...(report.notices ?? []),
        ],
        blocked: report.blocked.length > 0,
      };
    }
    return await runSchema5Retirement(repository, options);
  } catch (error) {
    return {
      lines: [
        String(error),
        "Upgrade stopped. Retained backups and pending migration state must be resolved before ordinary writes; sync was not continued.",
      ],
      blocked: true,
    };
  }
}
