import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.join(
  root,
  ".artifacts",
  "long-task-real-capability",
  "fresh-agent-paired.json",
);
const REQUIRED_METRICS = [
  "first_detection_ms",
  "rework_count",
  "contract_compile_final_gate_ms",
  "target_collection_count",
  "token_count",
  "total_elapsed_ms",
  "authority_bytes",
  "migration_ms",
  "maintenance_minutes",
];
const report = JSON.parse(await readFile(reportPath, "utf8"));
assert(report.schema_version === "long-task-fresh-agent-paired-v1", "schema");
assert(report.purpose === "adherence-and-roi-only", "purpose");
assert(report.safety_theorem_claimed === false, "safety_theorem_boundary");
assert(report.validity_floor === true, "validity_floor");
assert(report.known_attack_rejection === true, "known_attack_rejection");
assert(report.valid_control_false_blocking_increased === false, "false_blocking");
assert(report.relative_coverage_non_degraded === true, "coverage");
assert(report.total_roi_positive === true, "roi");
assert(Array.isArray(report.pairs), "pairs");
assert([3, 5].includes(report.pairs.length), "pair_count");
if (report.initial_three_inconclusive)
  assert(report.pairs.length === 5, "inconclusive_requires_five");
const agentIds = new Set();
for (const [index, pair] of report.pairs.entries()) {
  assert(typeof pair.task_key === "string" && pair.task_key, `task_key:${index}`);
  assert(pair.control?.task_key === pair.task_key, `control_pairing:${index}`);
  assert(pair.candidate?.task_key === pair.task_key, `candidate_pairing:${index}`);
  validateRun(pair.control, `control:${index}`);
  validateRun(pair.candidate, `candidate:${index}`);
  assert(pair.control.agent_id !== pair.candidate.agent_id, `fresh_agents:${index}`);
  assert(!agentIds.has(pair.control.agent_id), `agent_reused:${index}:control`);
  agentIds.add(pair.control.agent_id);
  assert(!agentIds.has(pair.candidate.agent_id), `agent_reused:${index}:candidate`);
  agentIds.add(pair.candidate.agent_id);
}
assert(
  report.metrics?.every?.((name) => REQUIRED_METRICS.includes(name)) ?? false,
  "metrics_declared",
);
console.log(
  JSON.stringify({
    schema_version: "long-task-roi-verification-v1",
    fresh_agent_pairs: report.pairs.length,
    validity_floor: true,
    known_attack_rejection: true,
    total_roi_positive: true,
  }),
);

function validateRun(run, label) {
  assert(typeof run?.agent_id === "string" && run.agent_id, `${label}:agent_id`);
  assert(run.fresh_context === true, `${label}:fresh_context`);
  assert(run.hidden_probe_version === "real-capability-v1", `${label}:hidden_probe`);
  assert(run.completed === true, `${label}:completed`);
  for (const metric of REQUIRED_METRICS)
    assert(Number.isFinite(run.metrics?.[metric]) && run.metrics[metric] >= 0, `${label}:${metric}`);
}

function assert(condition, code) {
  if (!condition) throw new Error(`fresh_agent_roi_invalid:${code}`);
}
