#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";
import { compareMechanismScores, aggregateComparisons } from "./compare.mjs";
import { prepareMechanismRun } from "./prepare.mjs";
import { scoreMechanismRun } from "./score.mjs";
import { loadExperimentSet, parseArgs, writeJson } from "./shared.mjs";

export { aggregateComparisons, compareMechanismScores, prepareMechanismRun, scoreMechanismRun };

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (!options.command || options.help) return printHelp();
  if (options.command === "list") {
    console.log(JSON.stringify(await loadExperimentSet(), null, 2));
    return;
  }
  let result;
  if (options.command === "prepare") result = await prepareMechanismRun(options);
  else if (options.command === "score") result = await scoreMechanismRun(options);
  else if (options.command === "compare") result = await compareMechanismScores(options);
  else if (options.command === "aggregate") result = await aggregateComparisons(options);
  else if (options.command === "prompt") {
    const prompt = await import("node:fs/promises").then(({ readFile }) => readFile(path.join(path.resolve(options.runDir), ".benchmark", "prompt.md"), "utf8"));
    process.stdout.write(prompt); return;
  } else throw new Error(`unknown command: ${options.command}`);
  if (options.out && !["score", "compare", "aggregate"].includes(options.command)) await writeJson(path.resolve(options.out), result);
  console.log(JSON.stringify(result, null, 2));
}

function printHelp() {
  console.log(`mechanism_benchmark.mjs\n\nCommands:\n  list\n  prepare --task <id> --variant <id> --pair-id <id> --replicate <n> --model <id> --reasoning <level> --out-dir <dir> [--harness-cli <file>] [--skip-harness-init] [--force]\n  prompt --run-dir <dir>\n  score --run-dir <dir> [--trace <normalized-trace.json>] [--out <score.json>]\n  compare --baseline-score <score.json> --candidate-score <score.json> [--out <comparison.json>]\n  aggregate --score <comparison.json> [--score <comparison.json> ...] [--out <aggregate.json>]\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
