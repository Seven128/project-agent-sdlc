import { runInit } from "../lib/init.js";

export async function init(args: string[]): Promise<void> {
  const adopt = args.includes("--adopt");
  const force = args.includes("--force");
  const report = await runInit(process.cwd(), { adopt, force });
  for (const line of report) {
    console.log(line);
  }
}
