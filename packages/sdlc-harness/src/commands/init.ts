import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { runInit } from "../lib/init.js";
import { normalizeHarnessFolderName, readHarnessRootConfig } from "../lib/harness-root.js";
import { writePackageHarnessRoot } from "../lib/package-json-config.js";
import { DEFAULT_HARNESS_ROOT } from "../lib/paths.js";

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

  return promptHarnessRoot(DEFAULT_HARNESS_ROOT);
}

async function promptHarnessRoot(defaultRoot: string): Promise<string> {
  if (!input.isTTY || !output.isTTY) {
    return defaultRoot;
  }
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`Harness folder name (default ${defaultRoot}; press Enter to use default): `);
    return normalizeHarnessFolderName(answer.trim() || defaultRoot);
  } finally {
    rl.close();
  }
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
