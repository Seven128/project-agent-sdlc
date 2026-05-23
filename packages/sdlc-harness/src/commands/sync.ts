import { runSync } from "../lib/sync-engine.js";

export async function sync(): Promise<void> {
  const report = await runSync(process.cwd());
  console.log(`sync changed=${report.changed.length} skipped=${report.skipped.length} blocked=${report.blocked.length}`);
  for (const blocked of report.blocked) {
    console.error(`blocked: ${blocked}`);
  }
  if (report.blocked.length > 0) {
    process.exitCode = 1;
  }
}
