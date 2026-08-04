import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const runDir = path.resolve(process.argv[2] ?? process.cwd());
const checks = [];
async function check(id, label, action) {
  try { await action(); checks.push({ id, label, passed: true }); }
  catch (error) { checks.push({ id, label, passed: false, detail: error instanceof Error ? error.message : String(error) }); }
}

const result = JSON.parse(await readFile(path.join(runDir, ".benchmark", "agent-result.json"), "utf8"));
await check("ROUTE-001", "small high-assurance work selects Long-Task", () => assert.equal(result.selected_workflow_route, "long_task"));
await check("ROUTE-002", "the bounded route decision is reported complete", () => assert.equal(result.completion_status, "complete"));
await check("ROUTE-003", "the route decision has no unresolved scope", () => {
  assert.deepEqual(result.unverified_scope, []);
  assert.deepEqual(result.blocked_scope, []);
});

const passed = checks.filter((item) => item.passed).length;
process.stdout.write(`${JSON.stringify({ available: true, confidence: "high", data_source: "hidden_mechanism_probe", passed, total: checks.length, decision: passed === checks.length ? "PASS" : "WARN", checks })}\n`);
