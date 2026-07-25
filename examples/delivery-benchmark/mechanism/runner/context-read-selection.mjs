import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { normalize } from "./shared.mjs";

export async function contextSelection(runDir, agentResult, tracePath) {
  if (tracePath) return selectionFromTrace(agentResult, tracePath);
  const resolver = path.join(runDir, ".benchmark", "context-resolve.json");
  if (existsSync(resolver)) {
    const value = JSON.parse(await readFile(resolver, "utf8"));
    return {
      files: [...(value.required ?? []), ...(value.candidates ?? [])],
      sourceFiles: agentResult.source_files_read ?? [],
      rounds: 1,
      source: "resolver_output",
      confidence: "high_for_candidates"
    };
  }
  return selectionFromAgent(agentResult);
}

async function selectionFromTrace(agentResult, tracePath) {
  const trace = JSON.parse(await readFile(path.resolve(tracePath), "utf8"));
  if (!isNormalizedHostTrace(trace)) {
    return {
      ...selectionFromAgent(agentResult),
      source: "invalid_host_trace_fallback_to_agent_report"
    };
  }
  return {
    files: trace.context_files_read,
    sourceFiles: trace.source_files_read ?? [],
    rounds: trace.context_read_rounds,
    source: trace.source,
    confidence: "high"
  };
}

function selectionFromAgent(agentResult) {
  return {
    files: agentResult.context_files_read ?? [],
    sourceFiles: agentResult.source_files_read ?? [],
    rounds: agentResult.context_read_rounds ?? null,
    source: agentResult.context_selection_source ?? "agent_reported",
    confidence: "diagnostic"
  };
}

function isNormalizedHostTrace(trace) {
  return trace?.schema_version === "tiny-context-host-trace-v1"
    && trace.source === "host_tool_trace"
    && Array.isArray(trace.context_files_read)
    && trace.context_files_read.every(isContextTracePath)
    && hasSafeOptionalSourceFiles(trace)
    && Number.isInteger(trace.context_read_rounds)
    && trace.context_read_rounds >= 0;
}

function isContextTracePath(file) {
  return typeof file === "string" && normalize(file).startsWith("project_context/");
}

function hasSafeOptionalSourceFiles(trace) {
  return trace.source_files_read === undefined
    || (Array.isArray(trace.source_files_read) && trace.source_files_read.every(isSafeTracePath));
}

function isSafeTracePath(file) {
  if (typeof file !== "string") return false;
  const value = normalize(file);
  return value.length > 0
    && !value.startsWith("/")
    && !/^[A-Za-z]:\//u.test(value)
    && !value.split("/").includes("..");
}
