import { pathToFileURL } from "node:url";
import path from "node:path";

const runDir = path.resolve(process.argv[2] ?? ".");
const money = await import(
  pathToFileURL(path.join(runDir, "src/billing/money.mjs")).href
);
const health = await import(
  pathToFileURL(path.join(runDir, "src/health.mjs")).href
);
const findings = [];

check("money-1.005", money.roundMoney(1.005) === 1.01);
check("money-10.075", money.roundMoney(10.075) === 10.08);
check("money-stable", money.roundMoney(42.1) === 42.1);
let rejected = false;
try {
  money.roundMoney(Number.POSITIVE_INFINITY);
} catch (error) {
  rejected = error instanceof TypeError;
}
check("money-nonfinite", rejected);

const checks = ["billing", "notifications", "worker"];
check(
  "health-default",
  JSON.stringify(health.healthStatus()) ===
    JSON.stringify({ status: "ok", checks }),
);
check(
  "health-worker",
  JSON.stringify(health.healthStatus({ worker: false })) ===
    JSON.stringify({ status: "degraded", checks, failed: ["worker"] }),
);
check(
  "health-order",
  JSON.stringify(
    health.healthStatus({ worker: false, billing: false, unknown: false }),
  ) ===
    JSON.stringify({
      status: "degraded",
      checks,
      failed: ["billing", "worker"],
    }),
);

const passed = findings.filter((item) => item.passed).length;
const report = {
  decision: passed === findings.length ? "PASS" : "FAIL",
  passed,
  total: findings.length,
  checks: findings,
};
process.stdout.write(`${JSON.stringify(report)}\n`);
process.exitCode = report.decision === "PASS" ? 0 : 1;

function check(id, passed) {
  findings.push({ id, passed, detail: passed ? "ok" : "mismatch" });
}
