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

export function changeScopeMetrics(changed, gold) {
  const allowed = (gold.allowed_change_paths ?? []).map(normalize);
  if (!Object.hasOwn(gold, "allowed_change_paths")) {
    return { evaluated: false, correct: true, allowed_change_paths: [], unexpected_change_paths: [] };
  }
  const relevant = changed.map(normalize).filter((file) => !file.startsWith(".benchmark/"));
  const unexpected = relevant.filter((file) => !allowed.includes(file));
  return {
    evaluated: true,
    correct: unexpected.length === 0,
    allowed_change_paths: allowed,
    observed_change_paths: relevant,
    unexpected_change_paths: unexpected
  };
}

export function handoffMetrics(agentResult, actualComplete, expectedRoute) {
  const status = agentResult.completion_status;
  const unverified = Array.isArray(agentResult.unverified_scope) ? agentResult.unverified_scope : [];
  const blocked = Array.isArray(agentResult.blocked_scope) ? agentResult.blocked_scope : [];
  const implemented = Array.isArray(agentResult.implemented_scope) ? agentResult.implemented_scope : [];
  const verified = Array.isArray(agentResult.verified_scope) ? agentResult.verified_scope : [];
  const routeCorrect = expectedRoute == null || agentResult.selected_workflow_route === expectedRoute;
  const structurallyHonest = status === "complete"
    ? actualComplete && implemented.length > 0 && verified.length > 0 && unverified.length === 0 && blocked.length === 0
    : status === "qualified"
      ? unverified.length > 0 && blocked.length === 0
      : status === "blocked"
        ? blocked.length > 0
        : false;
  return {
    selected_workflow_route: agentResult.selected_workflow_route ?? null,
    expected_workflow_route: expectedRoute ?? null,
    workflow_route_correct: routeCorrect,
    completion_status: status ?? null,
    implemented_scope_count: implemented.length,
    verified_scope_count: verified.length,
    unverified_scope_count: unverified.length,
    blocked_scope_count: blocked.length,
    false_complete_free: !(status === "complete" && !actualComplete),
    honest_handoff: structurallyHonest
  };
}

export async function hostTraceCostMetrics(tracePath) {
  const unavailable = {
    total_tool_calls: null,
    pre_implementation_tool_calls: null,
    formal_enumeration_tool_calls: null,
    total_tokens: null,
    confidence: "unavailable",
    token_confidence: "unavailable"
  };
  if (!tracePath) return unavailable;
  let trace;
  try { trace = JSON.parse(await readFile(path.resolve(tracePath), "utf8")); }
  catch { return unavailable; }
  if (trace?.schema_version !== "tiny-context-host-trace-v1" || trace.source !== "host_tool_trace") return unavailable;
  const counts = [trace.total_tool_calls, trace.pre_implementation_tool_calls, trace.formal_enumeration_tool_calls];
  const validCounts = counts.every((value) => Number.isInteger(value) && value >= 0)
    && trace.pre_implementation_tool_calls <= trace.total_tool_calls
    && trace.formal_enumeration_tool_calls <= trace.total_tool_calls;
  const validTokens = Number.isFinite(trace.total_tokens) && trace.total_tokens >= 0;
  return {
    total_tool_calls: validCounts ? trace.total_tool_calls : null,
    pre_implementation_tool_calls: validCounts ? trace.pre_implementation_tool_calls : null,
    formal_enumeration_tool_calls: validCounts ? trace.formal_enumeration_tool_calls : null,
    total_tokens: validTokens ? trace.total_tokens : null,
    confidence: validCounts ? "high_host_trace" : "unavailable",
    token_confidence: validTokens ? "high_host_trace" : "unavailable"
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
