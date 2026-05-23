import { runDoctor } from "../lib/doctor.js";

export async function doctor(): Promise<void> {
  const report = await runDoctor(process.cwd());
  for (const line of report.info) {
    console.log(line);
  }
  for (const warning of report.warnings) {
    console.warn(`warning: ${warning}`);
  }
  for (const error of report.errors) {
    console.error(`error: ${error}`);
  }
  if (report.errors.length > 0) {
    process.exitCode = 1;
  }
}
