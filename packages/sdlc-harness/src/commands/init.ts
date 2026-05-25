import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { runInit } from "../lib/init.js";
import { normalizeHarnessFolderName, readHarnessRootConfig } from "../lib/harness-root.js";
import { writePackageHarnessRoot } from "../lib/package-json-config.js";
import { DEFAULT_HARNESS_ROOT } from "../lib/paths.js";

interface AgentHarnessOption {
  key: string;
  label: string;
  harnessFolderName?: string;
}

const AGENT_HARNESS_OPTIONS: AgentHarnessOption[] = [
  { key: "codex", label: "Codex", harnessFolderName: ".codex" },
  { key: "claude", label: "Claude Code", harnessFolderName: ".claude" },
  { key: "cursor", label: "Cursor", harnessFolderName: ".cursor" },
  { key: "cline", label: "Cline", harnessFolderName: ".cline" },
  { key: "roo", label: "Roo Code", harnessFolderName: ".roo" },
  { key: "gemini", label: "Gemini CLI", harnessFolderName: ".gemini" },
  { key: "other", label: "Other" }
];

export async function init(args: string[]): Promise<void> {
  const adopt = args.includes("--adopt");
  const force = args.includes("--force");
  const projectRoot = process.cwd();
  const configuredRoot = await resolveInitHarnessRoot(projectRoot, args);
  if (configuredRoot) {
    await writePackageHarnessRoot(projectRoot, configuredRoot);
    console.log(`configured package.json sdlcHarness.harnessFolderName=${JSON.stringify(configuredRoot)}`);
  }
  const report = await runInit(projectRoot, { adopt, force });
  for (const line of report) {
    console.log(line);
  }
}

export async function resolveInitHarnessRoot(projectRoot: string, args: string[]): Promise<string | undefined> {
  const argRoot = valueForArg(args, "--harness-folder") ?? valueForArg(args, "--harnessFolderName");
  if (argRoot) {
    return normalizeHarnessFolderName(argRoot);
  }

  const current = await readHarnessRootConfig(projectRoot);
  if (current.source !== "default") {
    return undefined;
  }

  return promptAgentHarnessRoot();
}

async function promptAgentHarnessRoot(): Promise<string> {
  if (!input.isTTY || !output.isTTY) {
    return resolveAgentHarnessFolderName("");
  }
  const rl = readline.createInterface({ input, output });
  try {
    const agent = await questionUntilValid(rl, `${formatAgentChoices()}\nTarget agent (default 1 Codex): `);
    const option = agentOptionForAnswer(agent);
    if (option?.harnessFolderName) {
      return normalizeHarnessFolderName(option.harnessFolderName);
    }
    const folder = await rl.question(`Harness folder name (default ${DEFAULT_HARNESS_ROOT}; press Enter to use default): `);
    return normalizeHarnessFolderName(folder.trim() || DEFAULT_HARNESS_ROOT);
  } finally {
    rl.close();
  }
}

async function questionUntilValid(rl: readline.Interface, query: string): Promise<string> {
  while (true) {
    const answer = await rl.question(query);
    if (agentOptionForAnswer(answer)) {
      return answer;
    }
    console.log("Unknown agent choice. Enter a number, agent name, or Other.");
  }
}

function formatAgentChoices(): string {
  const lines = ["Choose target agent:"];
  AGENT_HARNESS_OPTIONS.forEach((option, index) => {
    const folder = option.harnessFolderName ? ` -> ${option.harnessFolderName}` : "";
    lines.push(`${index + 1}) ${option.label}${folder}`);
  });
  return lines.join("\n");
}

export function resolveAgentHarnessFolderName(agentAnswer: string, customFolderAnswer = ""): string {
  const option = agentOptionForAnswer(agentAnswer);
  if (!option) {
    throw new Error("Unknown agent choice");
  }
  return normalizeHarnessFolderName(option.harnessFolderName ?? (customFolderAnswer.trim() || DEFAULT_HARNESS_ROOT));
}

function agentOptionForAnswer(answer: string): AgentHarnessOption | undefined {
  const normalized = answer.trim().toLowerCase();
  if (!normalized) {
    return AGENT_HARNESS_OPTIONS[0];
  }
  const index = Number.parseInt(normalized, 10);
  if (Number.isInteger(index) && String(index) === normalized) {
    return AGENT_HARNESS_OPTIONS[index - 1];
  }
  return AGENT_HARNESS_OPTIONS.find((option) => {
    const label = option.label.toLowerCase();
    return option.key === normalized || label === normalized || label.replace(/\s+/g, "-") === normalized;
  });
}

function valueForArg(args: string[], name: string): string | undefined {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }
  const index = args.indexOf(name);
  if (index >= 0) {
    return args[index + 1];
  }
  return undefined;
}
