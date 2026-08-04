#!/usr/bin/env node
import { readActiveLongTaskBinding } from "./lib/long-task-state.js";
import { stopCheckDeliveryTask } from "./lib/long-task-status-v2.js";
import { repositoryRoot } from "./lib/long-task-workspace.js";

interface HookInput {
  cwd?: string;
  hook_event_name?: string;
  last_assistant_message?: string;
  agent_type?: string;
  agent_id?: string;
}

const LONG_TASK_IMPLEMENTATION_AGENT = "long_task_implementation";
const LONG_TASK_IMPLEMENTATION_BOUNDARY = [
  "This is a delegated rolling implementation worker, not the parent Long-Task Goal.",
  "Follow only the bounded packet from the parent.",
  "Do not run long-task resume, Preflight, Compile, Authority Revision, verify as formal Progress, Final Gate, Stop/close, abandon, or completion.",
  "The parent Goal owns Source, Contract, Authority, Context writeback, integration and formal acceptance.",
  "Your report is advisory and is not Progress, Evidence or acceptance.",
].join("\n");

const input = await readStdin();
try {
  const root = await repositoryRoot(input.cwd || process.cwd());
  const active = await readActiveLongTaskBinding(root);
  if (!active) output({});
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
  const reason = `Long-task Live Final Gate failed closed: ${message(error)}`;
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

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
