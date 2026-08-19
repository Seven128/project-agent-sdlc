import { existsSync } from "node:fs";
import path from "node:path";
import { changedPaths, observerElapsed } from "./metrics.mjs";
import { scoreDelegationRun } from "./delegation-score.mjs";
import {
  delegationGuidanceMetrics,
  delegationInputMetrics,
} from "./delegation-score-inputs.mjs";
import { scoreAuthoringRun, scoreDefaultRun } from "./score-standard.mjs";
import {
  loadExperimentSet,
  loadGold,
  loadTask,
  readJson,
  writeJson,
} from "./shared.mjs";

export { delegationGuidanceMetrics, delegationInputMetrics };

export async function scoreMechanismRun(options) {
  const runDir = path.resolve(options.runDir);
  const metadata = await readJson(
    path.join(runDir, ".benchmark", "mechanism-run.json"),
  );
  const experiments = await loadExperimentSet();
  const configuredVariant = experiments.variants?.[metadata.variant_id];
  const delegationRun =
    metadata.track === "long-task-delegation" ||
    configuredVariant?.track === "long-task-delegation";
  const task = delegationRun ? await loadTask(metadata.task_id) : metadata.task;
  const gold = await loadGold(task.id);
  const agentResultPath = path.join(
    runDir,
    ".benchmark",
    "agent-result.json",
  );
  const agentResultPresent = existsSync(agentResultPath);
  const agentResult = agentResultPresent
    ? await readJson(agentResultPath)
    : {};
  const changed = await changedPaths(runDir, metadata.initial_commit);
  const agentIdentityCorrect =
    agentResult.task_id === metadata.task_id &&
    agentResult.variant_id === metadata.variant_id;
  const elapsed = await observerElapsed(runDir);
  const context = {
    options,
    runDir,
    metadata,
    experiments,
    task,
    gold,
    agentResult,
    changed,
    agentIdentityCorrect,
    elapsed,
  };
  const metrics = delegationRun
    ? await scoreDelegationRun(context)
    : task.track_family === "long-task-authoring"
      ? await scoreAuthoringRun(context)
      : await scoreDefaultRun(context);
  const report = {
    schema_version: "tiny-context-mechanism-score-v1",
    scored_at: new Date().toISOString(),
    run: metadata,
    changed_paths: changed,
    elapsed,
    agent_result_present: agentResultPresent,
    agent_identity_correct: agentIdentityCorrect,
    agent_result: agentResult,
    metrics,
  };
  const out = path.resolve(
    options.out ?? path.join(runDir, ".benchmark", "mechanism-score.json"),
  );
  await writeJson(out, report);
  return report;
}
