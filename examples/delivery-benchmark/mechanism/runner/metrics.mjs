import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  MECHANISM_ROOT,
  fileBytes,
  normalize,
  ratio,
  round,
  run
} from "./shared.mjs";
import { contextSelection } from "./context-read-selection.mjs";

export async function changedPaths(runDir, initialCommit) {
  const values = new Set();
  for (const args of [
    ["diff", "--name-only", `${initialCommit}..HEAD`],
    ["diff", "--name-only"],
    ["diff", "--cached", "--name-only"],
    ["ls-files", "--others", "--exclude-standard"]
  ]) {
    const result = run("git", args, { cwd: runDir, allowFailure: true });
    for (const line of result.stdout.split(/\r?\n/u).filter(Boolean)) values.add(normalize(line));
  }
  return [...values].sort();
}

export async function runHiddenProbe(runDir, probeFile) {
  const target = path.join(MECHANISM_ROOT, "hidden", probeFile);
  const result = run(process.execPath, [target, runDir], { cwd: runDir, allowFailure: true });
  if (result.status !== 0) return failedExecution("hidden_probe", result);
  try { return JSON.parse(result.stdout); }
  catch { return failedExecution("hidden_probe_json", result); }
}

export function runVerification(runDir, commands) {
  return commands.map((command) => {
    const [program, ...args] = shellWords(command);
    const result = run(program, args, { cwd: runDir, allowFailure: true, timeout: 120_000 });
    return {
      command,
      passed: result.status === 0,
      status: result.status,
      stdout_tail: tail(result.stdout),
      stderr_tail: tail(result.stderr),
      data_source: "operator_executed"
    };
  });
}

export async function contextMetrics(runDir, gold, agentResult, tracePath) {
  const routing = await contextSelection(runDir, agentResult, tracePath);
  const selected = new Set(routing.files.map(normalize));
  const controlling = gold.controlling_context.map(normalize);
  const irrelevant = gold.irrelevant_context.map(normalize);
  const requiredSources = (gold.required_source_reads ?? []).map(normalize);
  const selectedSources = new Set((routing.sourceFiles ?? []).map(normalize));
  const recalled = controlling.filter((file) => selected.has(file));
  const irrelevantSelected = irrelevant.filter((file) => selected.has(file));
  const recalledSources = requiredSources.filter((file) => selectedSources.has(file));
  const selectedContext = [...selected].filter((file) => file.startsWith("project_context/"));
  const selectedBytes = await sumBytes(runDir, selectedContext);
  const irrelevantBytes = await sumBytes(runDir, irrelevantSelected);
  return {
    selection_source: routing.source,
    selection_confidence: routing.confidence,
    context_files_selected: selectedContext.sort(),
    context_read_rounds: routing.rounds,
    controlling_total: controlling.length,
    controlling_recalled: recalled.length,
    controlling_missing: controlling.filter((file) => !selected.has(file)),
    controlling_context_recall: round(ratio(recalled.length, controlling.length)),
    required_source_total: requiredSources.length,
    required_source_recalled: recalledSources.length,
    required_source_missing: requiredSources.filter((file) => !selectedSources.has(file)),
    selected_source_recall: requiredSources.length
      ? round(ratio(recalledSources.length, requiredSources.length))
      : null,
    source_files_read: [...selectedSources].sort(),
    irrelevant_selected: irrelevantSelected,
    selected_context_bytes: selectedBytes,
    irrelevant_context_bytes: irrelevantBytes,
    irrelevant_context_byte_ratio: round(ratio(irrelevantBytes, selectedBytes)),
    metric_kind: routing.source === "resolver_output" ? "deterministic_routing_candidates" : "reported_or_traced_reads"
  };
}

export async function contextUpdateMetrics(runDir, gold, changed) {
  const contextChanged = changed.filter((file) => file.startsWith("project_context/"));
  const required = gold.required_context_updates.map(normalize);
  const missing = required.filter((file) => !contextChanged.includes(file));
  const contentFindings = [];
  for (const [file, rule] of Object.entries(gold.required_context_terms ?? {})) {
    let content = "";
    try { content = await readFile(path.join(runDir, ...normalize(file).split("/")), "utf8"); } catch {}
    const lower = content.toLowerCase();
    const missingTerms = (rule.contains_all ?? []).filter((term) => !lower.includes(String(term).toLowerCase()));
    const missingGroups = (rule.contains_any_groups ?? []).filter((group) => !group.some((term) => lower.includes(String(term).toLowerCase())));
    const forbiddenPresent = (rule.excludes ?? []).filter((term) => lower.includes(String(term).toLowerCase()));
    contentFindings.push({
      file: normalize(file),
      missing_terms: missingTerms,
      missing_any_groups: missingGroups,
      forbidden_terms_present: forbiddenPresent,
      passed: missingTerms.length === 0 && missingGroups.length === 0 && forbiddenPresent.length === 0
    });
  }
  const contentCorrect = contentFindings.every((item) => item.passed);
  const correct = gold.expected_context_delta === "none" ? contextChanged.length === 0 : missing.length === 0 && contentCorrect;
  return {
    expected: gold.expected_context_delta,
    changed_context_files: contextChanged,
    required_context_updates: required,
    missing_required_context_updates: missing,
    content_findings: contentFindings,
    correct
  };
}

export async function observerElapsed(runDir) {
  const statePath = path.join(runDir, ".benchmark", "observer-state.json");
  if (!existsSync(statePath)) return { duration_ms: null, confidence: "unavailable" };
  const state = JSON.parse(await readFile(statePath, "utf8"));
  return {
    duration_ms: Number.isFinite(state.duration_ms) ? state.duration_ms : null,
    confidence: Number.isFinite(state.duration_ms) ? "high" : "unavailable",
    data_source: Number.isFinite(state.duration_ms) ? "observer_measured" : "unavailable"
  };
}

async function sumBytes(root, files) {
  let total = 0;
  for (const file of files) total += await fileBytes(root, file);
  return total;
}

function shellWords(command) { return command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/gu)?.map((part) => part.replace(/^(["'])|(["'])$/gu, "")) ?? []; }
function tail(value, limit = 1200) { return value.length > limit ? value.slice(-limit) : value; }
function failedExecution(id, result) { return { available: true, confidence: "high", data_source: id, passed: 0, total: 1, decision: "WARN", checks: [{ id, label: id, passed: false, detail: result.stderr || result.stdout || `exit ${result.status}` }] }; }
