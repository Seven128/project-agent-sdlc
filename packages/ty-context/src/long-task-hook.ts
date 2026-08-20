#!/usr/bin/env node
import { readConfig } from "./lib/config.js";
import { harnessRoot } from "./lib/harness-root.js";
import { longTaskCodexAgentProfileBootstrapPaths } from "./lib/long-task-codex-agent-profile.js";
import { isProfileEnabled } from "./lib/profiles.js";
import { readActiveLongTaskBinding } from "./lib/long-task-state.js";
import { stopCheckDeliveryTask } from "./lib/long-task-status-v2.js";
import {
  LONG_TASK_IMPLEMENTATION_AGENT,
  selectedAgentType,
} from "./lib/long-task-worker-selection.js";
import { repositoryRoot } from "./lib/long-task-workspace.js";

interface HookInput {
  cwd?: string;
  hook_event_name?: string;
  last_assistant_message?: string;
  tool_name?: string;
  tool_input?: unknown;
  agent_type?: string;
  agent_id?: string;
}

const LONG_TASK_IMPLEMENTATION_BOUNDARY = [
  "This is a delegated rolling implementation worker, not the parent Long-Task Goal.",
  "Follow only the bounded packet from the parent.",
  "Do not run long-task resume, Preflight, Compile, Authority Revision, verify as formal Progress, Final Gate, Stop/close, abandon, or completion.",
  "The parent Goal owns Source, Contract, Authority, Context writeback, integration and formal acceptance.",
  "Your report is advisory and is not Progress, Evidence or acceptance.",
].join("\n");
const AGENT_SPAWN_TOOLS = new Set(["spawn_agent", "Agent"]);
const EXACT_WORKER_REQUIRED =
  "Active Tiny Context Long-Task permits delegation only to the exact custom agent long_task_implementation. The current host request does not explicitly select it. Do not substitute a generic worker; complete this packet in the parent Goal.";
const EXACT_WORKER_UNAVAILABLE =
  "Active Tiny Context Long-Task cannot use the exact custom agent long_task_implementation because its current package-managed profile is unavailable, invalid, outdated or conflicting. Do not spawn a substitute agent; complete this packet in the parent Goal.";

const input = await readStdin();
const isAgentSpawnPreToolUse =
  input.hook_event_name === "PreToolUse" &&
  AGENT_SPAWN_TOOLS.has(input.tool_name ?? "");
if (input.hook_event_name === "PreToolUse" && !isAgentSpawnPreToolUse)
  output({});
try {
  const root = await repositoryRoot(input.cwd || process.cwd());
  const active = await readActiveLongTaskBinding(root);
  if (!active) output({});
  if (isAgentSpawnPreToolUse) {
    if (selectedAgentType(input.tool_input) !== LONG_TASK_IMPLEMENTATION_AGENT)
      denyAgentSpawn(EXACT_WORKER_REQUIRED);
    const rootConfig = await readConfig(root);
    const profilePaths = await longTaskCodexAgentProfileBootstrapPaths(
      root,
      await harnessRoot(root),
      isProfileEnabled(rootConfig, "long-task"),
    );
    if (profilePaths.length === 0) denyAgentSpawn(EXACT_WORKER_UNAVAILABLE);
    output({});
  }
  if (input.hook_event_name === "SubagentStart")
    output(
      input.agent_type === LONG_TASK_IMPLEMENTATION_AGENT
        ? {
            hookSpecificOutput: {
              hookEventName: "SubagentStart",
              additionalContext: LONG_TASK_IMPLEMENTATION_BOUNDARY,
            },
          }
        : {},
    );
  if (
    input.hook_event_name === "SessionStart" ||
    input.hook_event_name === "PostCompact"
  )
    output({
      hookSpecificOutput: {
        hookEventName: input.hook_event_name,
        additionalContext: [
          "Active Single-Goal Long-Task Workflow V2",
          `Workdir: ${active.workdir}`,
          `Task: ${active.task_id}`,
          `Authority revision: ${active.authority_revision}`,
          `Resume: ty-context long-task resume ${JSON.stringify(active.workdir)}`,
        ].join("\n"),
      },
    });
  if (input.hook_event_name !== "Stop") output({});
  const result = await stopCheckDeliveryTask(
    active.workdir,
    input.last_assistant_message ?? "",
  );
  if (result.continue)
    output(result.message ? { systemMessage: result.message } : {});
  output({
    decision: "block",
    reason:
      result.message ||
      result.reason ||
      "The Live Final Gate did not accept the current candidate.",
  });
} catch (error) {
  const reason = `Tiny Context Long-Task Hook failed closed: ${message(error)}`;
  if (isAgentSpawnPreToolUse)
    denyAgentSpawn(
      `${reason} Do not spawn a substitute agent; complete the packet in the parent Goal.`,
    );
  if (input.hook_event_name === "Stop") output({ decision: "block", reason });
  output({ continue: false, stopReason: reason });
}

async function readStdin(): Promise<HookInput> {
  let value = "";
  for await (const chunk of process.stdin) value += chunk;
  return value.trim() ? (JSON.parse(value) as HookInput) : {};
}

function output(value: unknown): never {
  process.stdout.write(`${JSON.stringify(value)}\n`);
  process.exit(0);
}

function denyAgentSpawn(reason: string): never {
  output({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  });
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
