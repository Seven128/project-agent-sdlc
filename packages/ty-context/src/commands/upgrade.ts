import {
  createUpgradePlan,
  formatUpgradePlan,
  hasUpgradePlanWork,
  updateModeForPlan,
} from "../lib/migrations.js";
import { runUpgradeReport } from "../lib/upgrade.js";

export async function upgrade(args: string[] = []): Promise<void> {
  const options = parseArgs(args);
  if (options.help) {
    printHelp();
    return;
  }

  if (options.check) {
    const plan = await createUpgradePlan(process.cwd());
    if (options.json) {
      console.log(
        JSON.stringify({ mode: updateModeForPlan(plan), ...plan }, null, 2),
      );
    } else {
      for (const line of formatUpgradePlan(plan)) {
        console.log(line);
      }
    }
    if (hasUpgradePlanWork(plan)) {
      process.exitCode = 1;
    }
    return;
  }

  const report = await runUpgradeReport(process.cwd(), {
    sessions_stopped: options.sessions_stopped,
  });
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    if (report.blocked) {
      process.exitCode = 1;
    }
    return;
  }
  for (const line of report.lines) {
    console.log(line);
  }
  if (report.blocked) {
    process.exitCode = 1;
  }
}

function parseArgs(args: string[]): {
  check: boolean;
  json: boolean;
  help: boolean;
  sessions_stopped: boolean;
} {
  const options = {
    check: false,
    json: false,
    help: false,
    sessions_stopped: false,
  };
  for (const arg of args) {
    if (arg === "--check") {
      options.check = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--sessions-stopped") {
      options.sessions_stopped = true;
    } else {
      throw new Error(`unknown upgrade argument: ${arg}`);
    }
  }
  return options;
}

function printHelp(): void {
  console.log(`ty-context upgrade:
  upgrade              Run safe migrations, sync managed assets and doctor
  upgrade --check      Print the upgrade plan without writing files
  upgrade --check --json
                       Print the upgrade plan as JSON
  upgrade --sessions-stopped
                       Retire schema 4 or resume after stopping relevant old host sessions

Update modes:
  sync-only            No migrations are pending
  upgrade-required     Safe migrations are pending
  manual-required      Manual review or blockers are present`);
}
