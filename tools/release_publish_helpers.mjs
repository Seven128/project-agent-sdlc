import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export function resolveExecutable(command) {
  return resolveCommandInvocation(command, []).executable;
}

function resolveCommandInvocation(command, commandArgs) {
  if (command === "node") {
    return { executable: process.execPath, args: commandArgs };
  }
  if (process.platform === "win32") {
    if (command === "npm") {
      return resolveNodePackageCli("npm-cli.js", "npm.cmd", commandArgs);
    }
    if (command === "npx") {
      return resolveNodePackageCli("npx-cli.js", "npx.cmd", commandArgs);
    }
  }
  return { executable: command, args: commandArgs };
}

function resolveNodePackageCli(cliName, fallbackCommand, commandArgs) {
  const cliPath = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", cliName);
  if (existsSync(cliPath)) {
    return { executable: process.execPath, args: [cliPath, ...commandArgs] };
  }
  return { executable: fallbackCommand, args: commandArgs };
}

export function commandLogEntry(command, commandArgs) {
  return {
    argv: [command, ...commandArgs],
    executable: resolveExecutable(command),
    shell: false
  };
}

export async function runCommand(command, commandArgs, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const capture = options.capture ?? false;
  const allowFailure = options.allowFailure ?? false;
  return new Promise((resolve, reject) => {
    const invocation = resolveCommandInvocation(command, commandArgs);
    const child = spawn(invocation.executable, invocation.args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (!capture) {
        process.stdout.write(text);
      }
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (!capture) {
        process.stderr.write(text);
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const result = { code, stdout, stderr, output: `${stdout}${stderr}` };
      if (code === 0 || allowFailure) {
        resolve(result);
      } else {
        reject(new Error(`${command} ${commandArgs.join(" ")} failed with exit code ${code}: ${result.output}`));
      }
    });
  });
}

export function parsePackJson(output) {
  const parsed = parseLastJsonDocument(output);
  const candidates = Array.isArray(parsed)
    ? parsed
    : parsed?.filename
      ? [parsed]
      : parsed && typeof parsed === "object"
        ? Object.values(parsed)
        : [];
  const packs = candidates.filter(
    (candidate) => candidate && typeof candidate === "object" && candidate.filename
  );
  if (packs.length !== 1) {
    throw new Error("Could not parse one npm pack result.");
  }
  return packs[0];
}

function parseLastJsonDocument(output) {
  const text = String(output);
  const starts = [];
  let offset = 0;
  for (const line of text.split(/(?<=\n)/u)) {
    const firstContent = line.search(/\S/u);
    if (firstContent >= 0 && ["[", "{"].includes(line[firstContent])) {
      starts.push(offset + firstContent);
    }
    offset += line.length;
  }

  for (const start of starts.reverse()) {
    try {
      return JSON.parse(text.slice(start).trim());
    } catch {
      // Lifecycle scripts may emit earlier JSON records before npm's pack result.
    }
  }
  return parseJsonFromOutput(output);
}

export function parseJsonFromOutput(output) {
  const trimmed = output.trim();
  const index = Math.min(
    ...["[", "{"].map((marker) => {
      const found = trimmed.indexOf(marker);
      return found < 0 ? Number.POSITIVE_INFINITY : found;
    })
  );
  const candidate = Number.isFinite(index) ? trimmed.slice(index) : trimmed;
  return JSON.parse(candidate);
}

export function singleLine(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

export function delay(ms) {
  if (process.env.TY_CONTEXT_RELEASE_COMMAND_LOG) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}
